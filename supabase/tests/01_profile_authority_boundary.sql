-- ═══════════════════════════════════════════════════════════════════════════
-- PROVA EXECUTÁVEL · FRONTEIRA DE AUTORIDADE DE profiles
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Achado que esta suíte fecha: `Users can grant themselves administrative
-- privileges`. A policy `profile_own` era FOR ALL com condição de LINHA
-- (id = auth.uid()) e nenhuma restrição de COLUNA, e o papel `authenticated`
-- tinha GRANT de tabela para INSERT/UPDATE/DELETE. Como quase toda outra
-- policy do sistema deriva autoridade de `profiles.role` e tenant de
-- `profiles.org_id`, quem escreve nessas duas colunas escreve a própria
-- autorização e o próprio tenant.
--
-- POR QUE EM SQL, NO BANCO: revisão de texto de migration já falhou nesta
-- base — um REVOKE por coluna foi neutralizado por um GRANT de tabela e
-- ninguém viu. Privilégio efetivo é a interação de ACL de tabela, ACL de
-- coluna, RLS e trigger. Só o banco resolve essa interação, então é o banco
-- que responde. Cada teste abaixo TENTA O ATAQUE de verdade, como
-- `authenticated`, com JWT de sessão, e falha a execução se o ataque passar.
--
-- CONTROLES POSITIVOS: a suíte também prova que os fluxos legítimos continuam
-- funcionando. Um hardening que quebra o onboarding não é hardening, é
-- indisponibilidade — e "tudo bloqueado" passaria em qualquer teste que só
-- verificasse bloqueio.
-- ═══════════════════════════════════════════════════════════════════════════

\set ON_ERROR_STOP on

-- ── Utilitário de tentativa ─────────────────────────────────────────────────
-- SECURITY INVOKER de propósito: roda com os privilégios de quem chama, então
-- ao ser chamada sob `SET ROLE authenticated` ela exercita exatamente o que um
-- cliente autenticado consegue fazer via PostgREST. Classifica o desfecho em
-- 'raised:<SQLSTATE>' ou 'executed:<linhas>' — a distinção importa porque uma
-- policy ausente não gera erro, ela simplesmente não enxerga a linha (0 linha
-- afetada), e um teste que só esperasse exceção passaria por sorte.
CREATE SCHEMA IF NOT EXISTS _proof;

CREATE OR REPLACE FUNCTION _proof.attempt(p_sql TEXT) RETURNS TEXT
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  v_rows INTEGER;
BEGIN
  EXECUTE p_sql;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN 'executed:' || v_rows;
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'raised:' || SQLSTATE;
END $$;

GRANT USAGE ON SCHEMA _proof TO anon, authenticated, authenticator, service_role;
GRANT EXECUTE ON FUNCTION _proof.attempt(TEXT) TO anon, authenticated, authenticator, service_role;

-- Um ataque está BLOQUEADO se levantou erro OU não afetou nenhuma linha.
CREATE OR REPLACE FUNCTION _proof.blocked(p_outcome TEXT) RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE AS $$
  SELECT p_outcome LIKE 'raised:%' OR p_outcome = 'executed:0'
$$;

-- ── Fixtures sintéticas ─────────────────────────────────────────────────────
-- Nenhum dado real de colaborador, nenhuma resposta, nenhum token real.
INSERT INTO auth.users (id, email) VALUES
  ('11111111-1111-4111-8111-111111111111', 'vitima@exemplo.invalid'),
  ('44444444-4444-4444-8444-444444444444', 'outro@exemplo.invalid'),
  ('55555555-5555-4555-8555-555555555555', 'semperfil@exemplo.invalid')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.organizations (id, slug, name) VALUES
  ('22222222-2222-4222-8222-222222222222', 'org-propria', 'Org Própria'),
  ('33333333-3333-4333-8333-333333333333', 'org-alheia', 'Org Alheia')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, org_id, role, display_name) VALUES
  ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', 'COLABORADOR', 'Vítima'),
  ('44444444-4444-4444-8444-444444444444', '33333333-3333-4333-8333-333333333333', 'RH_ADMIN', 'Alheio')
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- BLOCO 1 · ESCALAÇÃO DE PAPEL E REBIND DE TENANT PELO PRÓPRIO USUÁRIO
-- ═══════════════════════════════════════════════════════════════════════════
DO $bloco1$
DECLARE
  c_vitima  CONSTANT UUID := '11111111-1111-4111-8111-111111111111';
  c_alheia  CONSTANT UUID := '33333333-3333-4333-8333-333333333333';
  v_out     TEXT;
  v_role    TEXT;
  v_org     UUID;
  v_existe  BOOLEAN;
  v_falhas  TEXT[] := '{}';

  PROCEDURE_NOTE TEXT := 'cada tentativa roda como authenticated, com o JWT da própria vítima';
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', c_vitima::TEXT, 'role', 'authenticated')::TEXT,
    true
  );
  EXECUTE 'SET LOCAL ROLE authenticated';

  -- Sanidade: o JWT precisa estar valendo, senão a suíte inteira testaria nada.
  IF auth.uid() IS DISTINCT FROM c_vitima THEN
    RAISE EXCEPTION 'FAILED: fixture inválida — auth.uid() não reflete o JWT da sessão (%).', PROCEDURE_NOTE;
  END IF;
  IF current_user <> 'authenticated' THEN
    RAISE EXCEPTION 'FAILED: fixture inválida — o teste não está rodando como authenticated.';
  END IF;

  -- 1.1 UPDATE parcial de role (o ataque exato do scan)
  v_out := _proof.attempt(format(
    'UPDATE public.profiles SET role = %L WHERE id = %L', 'RH_ADMIN', c_vitima));
  IF NOT _proof.blocked(v_out) THEN
    v_falhas := v_falhas || format('NORMAL_USER_CHANGE_ROLE_RH_ADMIN não bloqueado (%s)', v_out);
  END IF;

  v_out := _proof.attempt(format(
    'UPDATE public.profiles SET role = %L WHERE id = %L', 'DIRETOR', c_vitima));
  IF NOT _proof.blocked(v_out) THEN
    v_falhas := v_falhas || format('NORMAL_USER_CHANGE_ROLE_DIRETOR não bloqueado (%s)', v_out);
  END IF;

  v_out := _proof.attempt(format(
    'UPDATE public.profiles SET role = %L WHERE id = %L', 'SST', c_vitima));
  IF NOT _proof.blocked(v_out) THEN
    v_falhas := v_falhas || format('NORMAL_USER_CHANGE_ROLE_SST não bloqueado (%s)', v_out);
  END IF;

  -- 1.2 Rebind de tenant
  v_out := _proof.attempt(format(
    'UPDATE public.profiles SET org_id = %L WHERE id = %L', c_alheia, c_vitima));
  IF NOT _proof.blocked(v_out) THEN
    v_falhas := v_falhas || format('NORMAL_USER_CHANGE_ORG_ID não bloqueado (%s)', v_out);
  END IF;

  -- 1.3 UPDATE de linha inteira — o desvio clássico de quem revoga só a coluna
  -- "óbvia": reescrever todas as colunas de uma vez, inclusive as legítimas.
  v_out := _proof.attempt(format(
    'UPDATE public.profiles SET id = %L, org_id = %L, role = %L, display_name = %L WHERE id = %L',
    c_vitima, c_alheia, 'RH_ADMIN', 'Vítima', c_vitima));
  IF NOT _proof.blocked(v_out) THEN
    v_falhas := v_falhas || format('FULL_ROW_UPDATE_BYPASS não bloqueado (%s)', v_out);
  END IF;

  -- 1.4 UPSERT — caminho que o supabase-js expõe como `.upsert()` e que passa
  -- por INSERT ... ON CONFLICT DO UPDATE, uma porta diferente das anteriores.
  v_out := _proof.attempt(format(
    'INSERT INTO public.profiles (id, org_id, role, display_name) VALUES (%L, %L, %L, %L) '
    || 'ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, org_id = EXCLUDED.org_id',
    c_vitima, c_alheia, 'RH_ADMIN', 'Vítima'));
  IF NOT _proof.blocked(v_out) THEN
    v_falhas := v_falhas || format('UPSERT_BYPASS não bloqueado (%s)', v_out);
  END IF;

  -- 1.5 DELETE + INSERT — o caminho que as correções anteriores deixaram
  -- aberto. As duas migrations de 2026-07-03 revogaram UPDATE e esqueceram
  -- que a policy FOR ALL também cobre INSERT e DELETE, e que o GRANT da
  -- migration base nunca foi retirado dessas duas operações. Apagar a própria
  -- linha e reinseri-la com role='RH_ADMIN' satisfazia id = auth.uid() nas
  -- duas etapas.
  v_out := _proof.attempt(format('DELETE FROM public.profiles WHERE id = %L', c_vitima));
  IF NOT _proof.blocked(v_out) THEN
    v_falhas := v_falhas || format('DELETE_OWN_PROFILE não bloqueado (%s)', v_out);
  END IF;

  v_out := _proof.attempt(format(
    'INSERT INTO public.profiles (id, org_id, role, display_name) VALUES (%L, %L, %L, %L)',
    c_vitima, c_alheia, 'RH_ADMIN', 'Reinserida'));
  IF NOT _proof.blocked(v_out) THEN
    v_falhas := v_falhas || format('INSERT_BYPASS não bloqueado (%s)', v_out);
  END IF;

  -- 1.6 Criar perfil para OUTRO usuário (fabricar membro de tenant alheio)
  v_out := _proof.attempt(format(
    'INSERT INTO public.profiles (id, org_id, role, display_name) VALUES (%L, %L, %L, %L)',
    '55555555-5555-4555-8555-555555555555', c_alheia, 'DIRETOR', 'Fabricado'));
  IF NOT _proof.blocked(v_out) THEN
    v_falhas := v_falhas || format('INSERT_FOREIGN_PROFILE não bloqueado (%s)', v_out);
  END IF;

  -- 1.7 Controle positivo: display_name continua editável pelo dono. Sem
  -- este teste, revogar tudo passaria como sucesso.
  v_out := _proof.attempt(format(
    'UPDATE public.profiles SET display_name = %L WHERE id = %L', 'Nome Novo', c_vitima));
  IF v_out <> 'executed:1' THEN
    v_falhas := v_falhas || format('display_name deixou de ser editável pelo dono (%s)', v_out);
  END IF;

  EXECUTE 'RESET ROLE';

  -- ── Invariante final, lida com privilégio: o que importa não é o desfecho
  -- de cada tentativa, é o estado do banco depois de todas elas.
  SELECT role, org_id, TRUE INTO v_role, v_org, v_existe
    FROM public.profiles WHERE id = c_vitima;

  IF NOT COALESCE(v_existe, FALSE) THEN
    v_falhas := v_falhas || 'a linha da vítima desapareceu (DELETE passou)';
  END IF;
  IF v_role IS DISTINCT FROM 'COLABORADOR' THEN
    v_falhas := v_falhas || format('role da vítima mudou para %L', v_role);
  END IF;
  IF v_org IS DISTINCT FROM '22222222-2222-4222-8222-222222222222'::UUID THEN
    v_falhas := v_falhas || format('org_id da vítima mudou para %L', v_org);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
     WHERE id = c_vitima AND display_name = 'Nome Novo'
  ) THEN
    v_falhas := v_falhas || 'a edição legítima de display_name não persistiu';
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = '55555555-5555-4555-8555-555555555555') THEN
    v_falhas := v_falhas || 'perfil fabricado para terceiro persistiu';
  END IF;

  IF array_length(v_falhas, 1) > 0 THEN
    RAISE EXCEPTION E'FAILED: fronteira de autoridade de profiles violada:\n  - %',
      array_to_string(v_falhas, E'\n  - ');
  END IF;

  RAISE NOTICE 'PROVEN: PROFILE_SELF_ROLE_ESCALATION=BLOCKED (RH_ADMIN, DIRETOR, SST)';
  RAISE NOTICE 'PROVEN: PROFILE_SELF_ORG_REBIND=BLOCKED';
  RAISE NOTICE 'PROVEN: FULL_ROW_UPDATE_BYPASS=BLOCKED · PARTIAL_UPDATE_BYPASS=BLOCKED';
  RAISE NOTICE 'PROVEN: UPSERT_BYPASS=BLOCKED · INSERT_BYPASS=BLOCKED · DELETE_BYPASS=BLOCKED';
  RAISE NOTICE 'PROVEN: INSERT_FOREIGN_PROFILE=BLOCKED';
  RAISE NOTICE 'PROVEN: display_name self-edit=PASS (hardening não virou indisponibilidade)';
END
$bloco1$;

-- ═══════════════════════════════════════════════════════════════════════════
-- BLOCO 2 · FRONTEIRA DE TENANT E CAMINHO DIRETO DO POSTGREST
-- ═══════════════════════════════════════════════════════════════════════════
DO $bloco2$
DECLARE
  c_vitima CONSTANT UUID := '11111111-1111-4111-8111-111111111111';
  c_alheio CONSTANT UUID := '44444444-4444-4444-8444-444444444444';
  v_out    TEXT;
  v_visiveis INTEGER;
  v_falhas TEXT[] := '{}';
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', c_vitima::TEXT, 'role', 'authenticated')::TEXT,
    true
  );

  -- 2.1 Caminho REAL do PostgREST: a conexão entra como `authenticator` e faz
  -- SET ROLE para o papel da requisição. Se algum privilégio vazasse por essa
  -- cadeia, o ataque não precisaria de nada além de um login normal.
  EXECUTE 'SET LOCAL ROLE authenticator';
  IF has_table_privilege('authenticator', 'public.profiles', 'UPDATE')
     OR has_table_privilege('authenticator', 'public.profiles', 'INSERT')
     OR has_table_privilege('authenticator', 'public.profiles', 'DELETE') THEN
    v_falhas := v_falhas || 'authenticator tem privilégio de escrita direto em profiles';
  END IF;

  EXECUTE 'SET LOCAL ROLE authenticated';
  v_out := _proof.attempt(format(
    'UPDATE public.profiles SET role = %L WHERE id = %L', 'RH_ADMIN', c_vitima));
  IF NOT _proof.blocked(v_out) THEN
    v_falhas := v_falhas || format('DIRECT_POSTGREST_BYPASS não bloqueado (%s)', v_out);
  END IF;

  -- 2.2 Tenant: a vítima não escreve nem enxerga o perfil de outra org.
  v_out := _proof.attempt(format(
    'UPDATE public.profiles SET role = %L WHERE id = %L', 'COLABORADOR', c_alheio));
  IF NOT _proof.blocked(v_out) THEN
    v_falhas := v_falhas || format('escrita cross-tenant em profiles não bloqueada (%s)', v_out);
  END IF;

  v_out := _proof.attempt(format('DELETE FROM public.profiles WHERE id = %L', c_alheio));
  IF NOT _proof.blocked(v_out) THEN
    v_falhas := v_falhas || format('DELETE cross-tenant em profiles não bloqueado (%s)', v_out);
  END IF;

  SELECT COUNT(*) INTO v_visiveis FROM public.profiles;
  IF v_visiveis <> 1 THEN
    v_falhas := v_falhas || format(
      'leitura de profiles não está restrita à própria linha (%s linha(s) visível(is))', v_visiveis);
  END IF;

  -- 2.3 Criar organização direto pelo cliente seria criar tenant sem convite.
  v_out := _proof.attempt(
    'INSERT INTO public.organizations (slug, name) VALUES (''pirata'', ''Pirata'')');
  IF NOT _proof.blocked(v_out) THEN
    v_falhas := v_falhas || format('criação de organização pelo cliente não bloqueada (%s)', v_out);
  END IF;

  v_out := _proof.attempt(format(
    'UPDATE public.organizations SET name = %L WHERE id = %L',
    'Renomeada', '22222222-2222-4222-8222-222222222222'));
  IF NOT _proof.blocked(v_out) THEN
    v_falhas := v_falhas || format('alteração de organização pelo cliente não bloqueada (%s)', v_out);
  END IF;

  EXECUTE 'RESET ROLE';

  -- 2.4 anon não toca profiles de forma alguma — nem para ler.
  --
  -- A leitura passa por _proof.attempt de propósito: depois do hardening, anon
  -- não tem nem SELECT, então um `SELECT COUNT(*)` direto aqui levantaria
  -- `permission denied` e abortaria a suíte em vez de registrar o resultado. O
  -- desfecho esperado é justamente a recusa.
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
  EXECUTE 'SET LOCAL ROLE anon';

  IF has_table_privilege('anon', 'public.profiles', 'SELECT') THEN
    v_falhas := v_falhas || 'anon ainda tem privilégio de SELECT em profiles';
  END IF;

  v_out := _proof.attempt('SELECT id, org_id, role FROM public.profiles');
  IF NOT _proof.blocked(v_out) THEN
    v_falhas := v_falhas || format('anon conseguiu ler profiles (%s)', v_out);
  END IF;

  v_out := _proof.attempt(
    'INSERT INTO public.profiles (id, org_id, role) VALUES '
    || '(''55555555-5555-4555-8555-555555555555'', ''33333333-3333-4333-8333-333333333333'', ''RH_ADMIN'')');
  IF NOT _proof.blocked(v_out) THEN
    v_falhas := v_falhas || format('anon conseguiu inserir perfil (%s)', v_out);
  END IF;
  EXECUTE 'RESET ROLE';

  IF array_length(v_falhas, 1) > 0 THEN
    RAISE EXCEPTION E'FAILED: fronteira de tenant violada:\n  - %',
      array_to_string(v_falhas, E'\n  - ');
  END IF;

  RAISE NOTICE 'PROVEN: DIRECT_POSTGREST_BYPASS=BLOCKED (authenticator sem privilégio próprio)';
  RAISE NOTICE 'PROVEN: TENANT_BOUNDARY=PASS (sem escrita, sem DELETE e sem leitura cross-tenant)';
  RAISE NOTICE 'PROVEN: ORG_SELF_PROVISIONING_BY_CLIENT=BLOCKED';
  RAISE NOTICE 'PROVEN: ANON_PROFILE_ACCESS=NONE';
END
$bloco2$;

-- ═══════════════════════════════════════════════════════════════════════════
-- BLOCO 3 · CAMINHOS LEGÍTIMOS CONTINUAM FUNCIONANDO
-- ═══════════════════════════════════════════════════════════════════════════
--
-- O hardening não pode fechar o onboarding nem a aceitação de convite. Essas
-- duas RPCs são SECURITY DEFINER e rodam como owner — é isso que as autoriza a
-- escrever `role` e `org_id`, e é isso que a camada de trigger precisa
-- distinguir de uma escrita vinda do cliente.
DO $bloco3$
DECLARE
  c_novo    CONSTANT UUID := '66666666-6666-4666-8666-666666666666';
  c_membro  CONSTANT UUID := '77777777-7777-4777-8777-777777777777';
  v_org     UUID;
  v_role    TEXT;
  v_erro    TEXT;
  v_falhas  TEXT[] := '{}';
BEGIN
  INSERT INTO auth.users (id, email) VALUES
    (c_novo, 'novoadmin@exemplo.invalid'),
    (c_membro, 'novomembro@exemplo.invalid')
  ON CONFLICT (id) DO NOTHING;

  -- 3.1 Provisionamento de organização a partir de convite da plataforma.
  INSERT INTO public.org_invites (token, plan, expires_at)
  VALUES ('proof-org-invite-token', 'pilot', NOW() + INTERVAL '1 day')
  ON CONFLICT (token) DO NOTHING;

  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);

  SELECT org_id, error INTO v_org, v_erro
    FROM public.provision_organization_from_invite(
      'proof-org-invite-token', c_novo, 'Org Provisionada', 'org-provisionada',
      'enterprise', 'RH_ADMIN', '00000000000000', '11-50', '+550000000000', NULL, NULL);

  IF v_erro IS NOT NULL OR v_org IS NULL THEN
    v_falhas := v_falhas || format('VALID_ONBOARDING falhou (error=%s)', COALESCE(v_erro, 'sem org'));
  ELSE
    SELECT role INTO v_role FROM public.profiles WHERE id = c_novo;
    IF v_role IS DISTINCT FROM 'RH_ADMIN' THEN
      v_falhas := v_falhas || format(
        'ADMIN_AUTHORIZED_ASSIGNMENT falhou: papel gravado foi %L', v_role);
    END IF;
  END IF;

  -- 3.2 Aceitação de convite de membro: role e org vêm da linha do convite.
  IF v_org IS NOT NULL THEN
    INSERT INTO public.member_invites (token, org_id, email, role, created_by)
    VALUES ('proof-member-invite-token', v_org, 'novomembro@exemplo.invalid', 'SST', c_novo)
    ON CONFLICT (token) DO NOTHING;

    SELECT role, error INTO v_role, v_erro
      FROM public.accept_member_invite('proof-member-invite-token', c_membro);

    IF v_erro IS NOT NULL THEN
      v_falhas := v_falhas || format('VALID_INVITE_FLOW falhou (error=%s)', v_erro);
    ELSIF v_role IS DISTINCT FROM 'SST' THEN
      v_falhas := v_falhas || format('convite de membro gravou papel %L em vez de SST', v_role);
    END IF;
  END IF;

  -- 3.3 service_role continua podendo corrigir papel — é o único caminho
  -- administrativo real que existe hoje (não há RPC de promoção no app).
  BEGIN
    EXECUTE 'SET LOCAL ROLE service_role';
    UPDATE public.profiles SET role = 'DIRETOR' WHERE id = c_membro;
    EXECUTE 'RESET ROLE';
  EXCEPTION
    WHEN OTHERS THEN
      EXECUTE 'RESET ROLE';
      v_falhas := v_falhas || format('service_role perdeu a escrita administrativa (%s)', SQLERRM);
  END;

  SELECT role INTO v_role FROM public.profiles WHERE id = c_membro;
  IF v_role IS DISTINCT FROM 'DIRETOR' THEN
    v_falhas := v_falhas || format(
      'atribuição administrativa por service_role não persistiu (role=%L)', v_role);
  END IF;

  IF array_length(v_falhas, 1) > 0 THEN
    RAISE EXCEPTION E'FAILED: caminho legítimo quebrado pelo hardening:\n  - %',
      array_to_string(v_falhas, E'\n  - ');
  END IF;

  RAISE NOTICE 'PROVEN: VALID_ONBOARDING=PASS · VALID_INVITE_FLOW=PASS';
  RAISE NOTICE 'PROVEN: ADMIN_AUTHORIZED_ASSIGNMENT=PASS (definer e service_role preservados)';
END
$bloco3$;

-- ═══════════════════════════════════════════════════════════════════════════
-- BLOCO 4 · AS TRÊS CAMADAS EXISTEM DE FATO (sobrevivência a drift)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Os blocos anteriores provam o COMPORTAMENTO. Este prova a ESTRUTURA: que o
-- bloqueio não depende de uma única camada. O incidente que originou esta onda
-- foi exatamente uma camada só (RLS de linha) sendo tratada como suficiente.
DO $bloco4$
DECLARE
  v_falhas TEXT[] := '{}';
BEGIN
  -- Camada 1 — ACL
  IF has_column_privilege('authenticated', 'public.profiles', 'role', 'UPDATE') THEN
    v_falhas := v_falhas || 'ACL: authenticated ainda pode UPDATE profiles.role';
  END IF;
  IF has_column_privilege('authenticated', 'public.profiles', 'org_id', 'UPDATE') THEN
    v_falhas := v_falhas || 'ACL: authenticated ainda pode UPDATE profiles.org_id';
  END IF;
  IF has_table_privilege('authenticated', 'public.profiles', 'INSERT') THEN
    v_falhas := v_falhas || 'ACL: authenticated ainda tem INSERT em profiles';
  END IF;
  IF has_table_privilege('authenticated', 'public.profiles', 'DELETE') THEN
    v_falhas := v_falhas || 'ACL: authenticated ainda tem DELETE em profiles';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.profiles', 'display_name', 'UPDATE') THEN
    v_falhas := v_falhas || 'ACL: authenticated perdeu UPDATE de display_name (excesso de revogação)';
  END IF;
  IF NOT has_table_privilege('authenticated', 'public.profiles', 'SELECT') THEN
    v_falhas := v_falhas || 'ACL: authenticated perdeu SELECT em profiles (sessão quebraria)';
  END IF;

  -- Camada 2 — RLS sem policy FOR ALL
  IF EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'profiles' AND cmd = 'ALL'
  ) THEN
    v_falhas := v_falhas || 'RLS: sobrou policy FOR ALL em profiles';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'profiles' AND cmd IN ('INSERT', 'DELETE')
  ) THEN
    v_falhas := v_falhas || 'RLS: existe policy de INSERT/DELETE em profiles';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'profiles' AND cmd = 'SELECT'
  ) THEN
    v_falhas := v_falhas || 'RLS: falta policy de SELECT em profiles';
  END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.profiles'::REGCLASS) THEN
    v_falhas := v_falhas || 'RLS: row level security desabilitada em profiles';
  END IF;

  -- Camada 3 — trigger de invariante
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
     WHERE tgrelid = 'public.profiles'::REGCLASS
       AND NOT tgisinternal
       AND tgname = 'profiles_authority_boundary'
  ) THEN
    v_falhas := v_falhas || 'TRIGGER: profiles_authority_boundary ausente';
  END IF;

  IF array_length(v_falhas, 1) > 0 THEN
    RAISE EXCEPTION E'FAILED: defesa em profundidade incompleta:\n  - %',
      array_to_string(v_falhas, E'\n  - ');
  END IF;

  RAISE NOTICE 'PROVEN: AUTHORIZATION_IMPLEMENTATION=3 camadas (ACL + RLS por comando + trigger)';
END
$bloco4$;

-- ═══════════════════════════════════════════════════════════════════════════
-- BLOCO 5 · A TERCEIRA CAMADA SEGURA SOZINHA
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Simula o drift que já aconteceu nesta base: alguém (ou um assistente de
-- migration) reconcede GRANT de tabela e alguém recria a policy permissiva.
-- Com as camadas 1 e 2 desfeitas, o trigger precisa continuar recusando.
-- Se este bloco falhar, o hardening é reversível por um único comando.
DO $bloco5$
DECLARE
  c_vitima CONSTANT UUID := '11111111-1111-4111-8111-111111111111';
  v_out    TEXT;
  v_role   TEXT;
  v_falhas TEXT[] := '{}';
BEGIN
  GRANT INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
  CREATE POLICY profiles_drift_simulation ON public.profiles
    FOR ALL TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', c_vitima::TEXT, 'role', 'authenticated')::TEXT,
    true
  );
  EXECUTE 'SET LOCAL ROLE authenticated';

  v_out := _proof.attempt(format(
    'UPDATE public.profiles SET role = %L WHERE id = %L', 'RH_ADMIN', c_vitima));
  IF NOT _proof.blocked(v_out) THEN
    v_falhas := v_falhas || format('com drift de ACL e RLS, a escalação passou (%s)', v_out);
  END IF;

  v_out := _proof.attempt(format(
    'UPDATE public.profiles SET org_id = %L WHERE id = %L',
    '33333333-3333-4333-8333-333333333333', c_vitima));
  IF NOT _proof.blocked(v_out) THEN
    v_falhas := v_falhas || format('com drift, o rebind de tenant passou (%s)', v_out);
  END IF;

  v_out := _proof.attempt(format('DELETE FROM public.profiles WHERE id = %L', c_vitima));
  IF NOT _proof.blocked(v_out) THEN
    v_falhas := v_falhas || format('com drift, o DELETE do próprio perfil passou (%s)', v_out);
  END IF;

  -- Ainda sob drift, a edição legítima precisa continuar passando.
  v_out := _proof.attempt(format(
    'UPDATE public.profiles SET display_name = %L WHERE id = %L', 'Sob Drift', c_vitima));
  IF v_out <> 'executed:1' THEN
    v_falhas := v_falhas || format('o trigger bloqueou edição legítima de display_name (%s)', v_out);
  END IF;

  EXECUTE 'RESET ROLE';

  SELECT role INTO v_role FROM public.profiles WHERE id = c_vitima;
  IF v_role IS DISTINCT FROM 'COLABORADOR' THEN
    v_falhas := v_falhas || format('sob drift, role virou %L', v_role);
  END IF;

  -- Restaura o estado endurecido antes de encerrar a suíte.
  DROP POLICY profiles_drift_simulation ON public.profiles;
  REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM authenticated;
  GRANT UPDATE (display_name) ON public.profiles TO authenticated;

  IF array_length(v_falhas, 1) > 0 THEN
    RAISE EXCEPTION E'FAILED: o hardening depende de uma única camada:\n  - %',
      array_to_string(v_falhas, E'\n  - ');
  END IF;

  RAISE NOTICE 'PROVEN: DRIFT_SURVIVAL=PASS (trigger sozinho recusa escalação, rebind e DELETE)';
END
$bloco5$;
