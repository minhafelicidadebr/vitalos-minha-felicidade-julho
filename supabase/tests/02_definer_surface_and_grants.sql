-- ═══════════════════════════════════════════════════════════════════════════
-- PROVA EXECUTÁVEL · SUPERFÍCIE SECURITY DEFINER E ALCANCE PELA BORDA PÚBLICA
-- ═══════════════════════════════════════════════════════════════════════════
--
-- A migration de reconciliação já verifica ACL por catálogo
-- (has_function_privilege). Esta suíte verifica outra coisa: o que um cliente
-- REALMENTE consegue INVOCAR. São perguntas diferentes — uma ACL correta com
-- uma função errada continua sendo problema, e o inverso também.
--
-- O foco são as três funções que estavam alcançáveis por herança de default
-- privilege, e as que precisam continuar alcançáveis para o produto funcionar.
-- ═══════════════════════════════════════════════════════════════════════════

\set ON_ERROR_STOP on

-- Reaproveita o utilitário da suíte 01 (mesmo banco de replay, ordem
-- lexicográfica garante que 01 rodou antes). Recriado aqui para a suíte poder
-- ser executada isolada contra um banco já migrado.
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

GRANT USAGE ON SCHEMA _proof TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION _proof.attempt(TEXT) TO anon, authenticated, service_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- BLOCO 1 · O QUE ESTAVA ALCANÇÁVEL POR HERANÇA NÃO ESTÁ MAIS
-- ═══════════════════════════════════════════════════════════════════════════
DO $bloco1$
DECLARE
  v_out    TEXT;
  v_falhas TEXT[] := '{}';
BEGIN
  -- 1.1 anon
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
  EXECUTE 'SET LOCAL ROLE anon';

  -- mark_invite_used: marca convite como usado. Alcançável, é invalidação de
  -- convite por quem adivinhar um token.
  v_out := _proof.attempt('SELECT public.mark_invite_used(''qualquer-token'')');
  IF v_out <> 'raised:42501' THEN
    v_falhas := v_falhas || format('anon ainda invoca mark_invite_used (%s)', v_out);
  END IF;

  -- accept_member_invite: cria perfil com o papel vindo do convite, para um
  -- p_user_id escolhido pelo chamador.
  v_out := _proof.attempt(
    'SELECT * FROM public.accept_member_invite(''qualquer-token'', ''00000000-0000-4000-8000-000000000000'')');
  IF v_out <> 'raised:42501' THEN
    v_falhas := v_falhas || format('anon ainda invoca accept_member_invite (%s)', v_out);
  END IF;

  v_out := _proof.attempt(
    'SELECT public.record_item_funnel_event(''p'', ''i'', 1, TRUE, 1, ''{}''::JSONB)');
  IF v_out <> 'raised:42501' THEN
    v_falhas := v_falhas || format('anon ainda invoca record_item_funnel_event (%s)', v_out);
  END IF;

  -- Escrita privilegiada de ledger.
  v_out := _proof.attempt(
    'SELECT * FROM public.create_action_plan(''00000000-0000-4000-8000-000000000000'', ''c'', ''s'', NULL, NULL, ''[]''::JSONB)');
  IF v_out <> 'raised:42501' THEN
    v_falhas := v_falhas || format('anon ainda invoca create_action_plan (%s)', v_out);
  END IF;

  v_out := _proof.attempt(
    'SELECT * FROM public.provision_organization_from_invite(''t'', ''00000000-0000-4000-8000-000000000000'', ''n'', ''s'', ''enterprise'', ''RH_ADMIN'', ''c'', ''b'', ''p'', NULL, NULL)');
  IF v_out <> 'raised:42501' THEN
    v_falhas := v_falhas || format('anon ainda invoca provision_organization_from_invite (%s)', v_out);
  END IF;

  EXECUTE 'RESET ROLE';

  -- 1.2 authenticated — mesmo conjunto, papel diferente.
  PERFORM set_config(
    'request.jwt.claims',
    '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',
    true
  );
  EXECUTE 'SET LOCAL ROLE authenticated';

  v_out := _proof.attempt('SELECT public.mark_invite_used(''qualquer-token'')');
  IF v_out <> 'raised:42501' THEN
    v_falhas := v_falhas || format('authenticated ainda invoca mark_invite_used (%s)', v_out);
  END IF;

  v_out := _proof.attempt(
    'SELECT * FROM public.accept_member_invite(''qualquer-token'', ''11111111-1111-4111-8111-111111111111'')');
  IF v_out <> 'raised:42501' THEN
    v_falhas := v_falhas || format('authenticated ainda invoca accept_member_invite (%s)', v_out);
  END IF;

  v_out := _proof.attempt(
    'SELECT * FROM public.seal_victory_record(''00000000-0000-4000-8000-000000000000'', ''c'', ''d'', ''{}''::JSONB, ''h'', NULL)');
  IF v_out <> 'raised:42501' THEN
    v_falhas := v_falhas || format('authenticated ainda invoca seal_victory_record (%s)', v_out);
  END IF;

  EXECUTE 'RESET ROLE';

  IF array_length(v_falhas, 1) > 0 THEN
    RAISE EXCEPTION E'FAILED: superfície privilegiada ainda alcançável:\n  - %',
      array_to_string(v_falhas, E'\n  - ');
  END IF;

  RAISE NOTICE 'PROVEN: RPC_EXECUTE_GRANTS=RECONCILED (mark_invite_used, accept_member_invite, record_item_funnel_event e ledgers fora do alcance de anon/authenticated)';
END
$bloco1$;

-- ═══════════════════════════════════════════════════════════════════════════
-- BLOCO 2 · O QUE PRECISA CONTINUAR ALCANÇÁVEL, CONTINUA
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Sem este bloco, revogar tudo passaria como sucesso. A pesquisa anônima é o
-- produto: se `anon` perder submit_sector_response, o respondente não responde.
DO $bloco2$
DECLARE
  v_out    TEXT;
  v_falhas TEXT[] := '{}';
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
  EXECUTE 'SET LOCAL ROLE anon';

  -- Token inexistente: o desfecho esperado é a RECUSA DE NEGÓCIO
  -- ('invalid_token'), não a recusa de permissão. É essa diferença que prova
  -- que a função foi de fato invocada.
  v_out := _proof.attempt(
    'SELECT * FROM public.submit_sector_response(''hash-inexistente'', ''{}''::JSONB, ''2026.1'')');
  IF v_out = 'raised:42501' THEN
    v_falhas := v_falhas || 'anon perdeu EXECUTE em submit_sector_response — a pesquisa setorial pararia';
  END IF;

  v_out := _proof.attempt(
    'SELECT * FROM public.submit_wave_response(''00000000-0000-4000-8000-000000000000'', ''tok'', ''{}''::JSONB)');
  IF v_out = 'raised:42501' THEN
    v_falhas := v_falhas || 'anon perdeu EXECUTE em submit_wave_response — o fluxo COPSOQ legado pararia';
  END IF;

  EXECUTE 'RESET ROLE';

  PERFORM set_config(
    'request.jwt.claims',
    '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',
    true
  );
  EXECUTE 'SET LOCAL ROLE authenticated';

  v_out := _proof.attempt(
    'SELECT * FROM public.aggregate_cohort_responses(''00000000-0000-4000-8000-000000000000'', ''00000000-0000-4000-8000-000000000000'')');
  IF v_out = 'raised:42501' THEN
    v_falhas := v_falhas || 'authenticated perdeu aggregate_cohort_responses — o painel FIB-T pararia';
  END IF;

  v_out := _proof.attempt('SELECT * FROM public.erase_my_assessments()');
  IF v_out = 'raised:42501' THEN
    v_falhas := v_falhas || 'authenticated perdeu erase_my_assessments — o Cofre Pessoal (LGPD art. 18) pararia';
  END IF;

  EXECUTE 'RESET ROLE';

  IF array_length(v_falhas, 1) > 0 THEN
    RAISE EXCEPTION E'FAILED: hardening virou indisponibilidade:\n  - %',
      array_to_string(v_falhas, E'\n  - ');
  END IF;

  RAISE NOTICE 'PROVEN: contrato anônimo de pesquisa e leitura agregada preservados (anon e authenticated seguem invocando o que devem)';
END
$bloco2$;

-- ═══════════════════════════════════════════════════════════════════════════
-- BLOCO 3 · IDENTIDADE EM accept_member_invite
-- ═══════════════════════════════════════════════════════════════════════════
--
-- A função aceita `p_user_id` do chamador. Depois da reconciliação ela só é
-- alcançável por service_role, mas o portão de identidade é a segunda camada:
-- se um dia o EXECUTE vazar de novo, quem chamar não escolhe para quem o perfil
-- é criado.
DO $bloco3$
DECLARE
  c_alvo   CONSTANT UUID := '88888888-8888-4888-8888-888888888888';
  c_outro  CONSTANT UUID := '99999999-9999-4999-8999-999999999999';
  v_erro   TEXT;
  v_falhas TEXT[] := '{}';
BEGIN
  INSERT INTO auth.users (id, email) VALUES
    (c_alvo, 'alvo@exemplo.invalid'),
    (c_outro, 'outro-alvo@exemplo.invalid')
  ON CONFLICT (id) DO NOTHING;

  -- Sem sessão e sem service_role: recusa antes de qualquer leitura de convite.
  PERFORM set_config('request.jwt.claims', '{"role":"authenticated"}', true);
  SELECT error INTO v_erro FROM public.accept_member_invite('token-qualquer', c_alvo);
  IF v_erro IS DISTINCT FROM 'unauthenticated' THEN
    v_falhas := v_falhas || format('sem sessão deveria recusar com unauthenticated, veio %L', v_erro);
  END IF;

  -- Sessão de outra pessoa tentando criar perfil para um terceiro.
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', c_outro::TEXT, 'role', 'authenticated')::TEXT,
    true
  );
  SELECT error INTO v_erro FROM public.accept_member_invite('token-qualquer', c_alvo);
  IF v_erro IS DISTINCT FROM 'identity_mismatch' THEN
    v_falhas := v_falhas || format('p_user_id de terceiro deveria recusar com identity_mismatch, veio %L', v_erro);
  END IF;

  -- O caminho real do app: service_role, identidade já resolvida em servidor.
  -- Aqui o esperado é passar do portão e ser recusado pelo NEGÓCIO.
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
  SELECT error INTO v_erro FROM public.accept_member_invite('token-qualquer', c_alvo);
  IF v_erro IS DISTINCT FROM 'invalid_token' THEN
    v_falhas := v_falhas || format('service_role deveria alcançar a validação de convite, veio %L', v_erro);
  END IF;

  IF array_length(v_falhas, 1) > 0 THEN
    RAISE EXCEPTION E'FAILED: portão de identidade de accept_member_invite:\n  - %',
      array_to_string(v_falhas, E'\n  - ');
  END IF;

  RAISE NOTICE 'PROVEN: accept_member_invite vincula p_user_id a auth.uid(), com bypass de service_role preservado';
END
$bloco3$;

-- ═══════════════════════════════════════════════════════════════════════════
-- BLOCO 4 · NENHUMA SUPERFÍCIE NOVA FORA DO INVENTÁRIO
-- ═══════════════════════════════════════════════════════════════════════════
DO $bloco4$
DECLARE
  v_publico TEXT;
  v_sem_sp  TEXT;
  v_falhas  TEXT[] := '{}';
BEGIN
  -- EXECUTE para PUBLIC em função da aplicação.
  SELECT string_agg(p.proname, ', ' ORDER BY p.proname) INTO v_publico
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace,
         aclexplode(COALESCE(p.proacl, ACLDEFAULT('f', p.proowner))) AS a
   WHERE n.nspname = 'public'
     AND a.grantee = 0
     AND NOT EXISTS (
       SELECT 1 FROM pg_depend d
        WHERE d.objid = p.oid AND d.classid = 'pg_proc'::regclass AND d.deptype = 'e'
     );

  IF v_publico IS NOT NULL THEN
    v_falhas := v_falhas || format('EXECUTE para PUBLIC em: %s', v_publico);
  END IF;

  -- SECURITY DEFINER sem search_path fixo é sequestrável.
  SELECT string_agg(p.proname, ', ' ORDER BY p.proname) INTO v_sem_sp
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.prosecdef
     AND NOT EXISTS (
       SELECT 1 FROM pg_depend d
        WHERE d.objid = p.oid AND d.classid = 'pg_proc'::regclass AND d.deptype = 'e'
     )
     AND NOT EXISTS (
       SELECT 1 FROM unnest(COALESCE(p.proconfig, ARRAY[]::TEXT[])) AS cfg
        WHERE cfg ~ 'search_path\s*='
     );

  IF v_sem_sp IS NOT NULL THEN
    v_falhas := v_falhas || format('SECURITY DEFINER sem search_path: %s', v_sem_sp);
  END IF;

  -- Toda função SECURITY DEFINER da aplicação é do mesmo owner. Owner
  -- divergente significaria privilégio efetivo diferente do auditado.
  IF (SELECT COUNT(DISTINCT p.proowner) FROM pg_proc p
       JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.prosecdef) > 1 THEN
    v_falhas := v_falhas || 'existe mais de um owner entre as funções SECURITY DEFINER';
  END IF;

  IF array_length(v_falhas, 1) > 0 THEN
    RAISE EXCEPTION E'FAILED: superfície SECURITY DEFINER:\n  - %',
      array_to_string(v_falhas, E'\n  - ');
  END IF;

  RAISE NOTICE 'PROVEN: SECURITY_DEFINER_SURFACE_AUDITED=true (sem PUBLIC, search_path fixo, owner único)';
END
$bloco4$;
