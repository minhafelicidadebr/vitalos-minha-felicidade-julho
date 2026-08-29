-- SUPERFÍCIE SECURITY DEFINER · RECONCILIAÇÃO DE EXECUTE
--
-- ═══════════════════════════════════════════════════════════════════════════
-- O PROBLEMA: PRIVILÉGIO POR HERANÇA ACIDENTAL
-- ═══════════════════════════════════════════════════════════════════════════
--
-- A conta Supabase deste projeto tem DEFAULT PRIVILEGES que concedem EXECUTE em
-- função nova para anon, authenticated e service_role. Toda função nasce, então,
-- executável pela borda pública — e continua assim a menos que alguém revogue.
--
-- As migrations deste repositório revogaram, mas de forma desigual:
--
--   · a maioria fez `REVOKE EXECUTE ... FROM PUBLIC, authenticated, anon` — o
--     padrão correto, que anula o default;
--   · algumas fizeram apenas `REVOKE ... FROM PUBLIC`. E aí está a armadilha:
--     revogar de PUBLIC NÃO remove a concessão explícita que o default
--     privilege deu a anon e a authenticated. As duas entradas de ACL
--     coexistem, exatamente como aconteceu com o GRANT de tabela versus o
--     REVOKE de coluna em profiles (20260703170000).
--
-- Consequência concreta desse segundo grupo:
--
--   · `mark_invite_used(text)` — intenção declarada na própria migration: só
--     service_role. ACL real: anon e authenticated também. É uma função que
--     MARCA CONVITE COMO USADO. Alcançável pela borda pública, vira
--     invalidação de convite por quem adivinhar ou interceptar um token.
--   · `accept_member_invite(text,uuid)` — revogada de PUBLIC e de
--     authenticated, nunca de anon. Cria perfil com o papel vindo do convite,
--     para um `p_user_id` ESCOLHIDO PELO CHAMADOR.
--   · `count_wave_responses(uuid)` — o oposto: a aplicação a chama por
--     service_role, mas nenhuma migration concedeu EXECUTE a service_role. Ela
--     funciona hoje por causa do default privilege. Isto é, o funcionamento do
--     produto depende de um privilégio que ninguém declarou — e que qualquer
--     endurecimento futuro de defaults quebraria em produção, sem aviso.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- A SOLUÇÃO: REGISTRO DECLARADO, APLICADO E COM CHECAGEM DE COMPLETUDE
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Em vez de mais um lote de REVOKE pontual, esta migration declara a ACL
-- PRETENDIDA de cada função da aplicação e a IMPÕE: revoga de todos os papéis
-- de cliente e reconcede exatamente o conjunto declarado. Fica idempotente por
-- construção — reaplicar converge para o mesmo estado.
--
-- E, o que importa mais para o futuro: uma checagem de COMPLETUDE. Se existir
-- em `public` uma função da aplicação que não esteja declarada aqui, a migration
-- ABORTA. Uma função nova criada por assistente de migration não pode nascer com
-- privilégio herdado e passar despercebida — ou ela é declarada, ou o gate
-- fecha. É a diferença entre "revogamos o que vimos" e "nada existe fora do
-- inventário".
--
-- Funções de extensão (pgcrypto: crypt, gen_random_bytes, pgp_*) ficam fora por
-- pg_depend deptype='e'. Elas não são superfície da aplicação e mexer na ACL
-- delas quebraria a extensão.
--
-- OBJETIVO É MENOR PRIVILÉGIO, NÃO ZERO AVISOS. RPC anônima de pesquisa
-- CONTINUA anônima: `submit_sector_response` e `submit_wave_response` precisam
-- de anon, porque o respondente nunca tem sessão — o token é a credencial. O que
-- muda é que elas passam a ser públicas POR CONTRATO DECLARADO, e não por
-- herança de default privilege.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. IDENTIDADE EM accept_member_invite
-- ---------------------------------------------------------------------------
--
-- Mesmo defeito que 20260726120000 corrigiu na irmã
-- (provision_organization_from_invite): `p_user_id` vinha do chamador e nunca
-- era comparado com auth.uid(). Quem alcançasse a função escolhia PARA QUEM o
-- perfil era criado.
--
-- Corpo idêntico ao de 20260714120000 em tudo o mais — trava de linha, ordem de
-- validação, ausência deliberada de bloco de exceção no INSERT. A única adição é
-- o portão de identidade.
--
-- BYPASS DE service_role, deliberado e necessário: o app chama esta RPC pelo
-- client de service role (member-invite.server.ts) DEPOIS de resolver a
-- identidade da sessão em member-invite.functions.ts. Nesse caminho auth.uid() é
-- NULL por construção. A detecção usa auth.role() (claim do JWT) e NÃO
-- current_user, pela mesma razão registrada em 20260726120000: current_user não
-- prova a origem da requisição.

CREATE OR REPLACE FUNCTION public.accept_member_invite(
  p_invite_token TEXT,
  p_user_id      UUID
)
RETURNS TABLE(org_id UUID, role TEXT, error TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_invite     public.member_invites%ROWTYPE;
  v_user_email TEXT;
  v_existing   public.profiles%ROWTYPE;
  v_caller     UUID := auth.uid();
  v_is_service BOOLEAN := (auth.role() = 'service_role');
BEGIN
  -- Portão de identidade: fora do caminho de service_role, o perfil só pode ser
  -- criado para o próprio usuário autenticado.
  IF NOT v_is_service THEN
    IF v_caller IS NULL THEN
      RETURN QUERY SELECT NULL::UUID, NULL::TEXT, 'unauthenticated'::TEXT;
      RETURN;
    END IF;
    IF v_caller <> p_user_id THEN
      RETURN QUERY SELECT NULL::UUID, NULL::TEXT, 'identity_mismatch'::TEXT;
      RETURN;
    END IF;
  END IF;

  -- Trava a linha do convite: uma segunda aceitação concorrente com o MESMO
  -- token espera aqui até esta transação terminar.
  SELECT * INTO v_invite FROM public.member_invites WHERE token = p_invite_token FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, 'invalid_token'::TEXT;
    RETURN;
  END IF;

  IF v_invite.used_at IS NOT NULL THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, 'already_used'::TEXT;
    RETURN;
  END IF;

  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < NOW() THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, 'expired'::TEXT;
    RETURN;
  END IF;

  SELECT email INTO v_user_email FROM auth.users WHERE id = p_user_id;
  IF v_user_email IS NULL OR lower(v_user_email) <> lower(v_invite.email) THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, 'email_mismatch'::TEXT;
    RETURN;
  END IF;

  SELECT * INTO v_existing FROM public.profiles WHERE id = p_user_id;
  IF FOUND THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, 'already_has_profile'::TEXT;
    RETURN;
  END IF;

  -- SEM bloco de exceção aqui de propósito: se este INSERT falhar, a exceção
  -- deve propagar e abortar a transação inteira.
  INSERT INTO public.profiles (id, org_id, role, display_name)
  VALUES (p_user_id, v_invite.org_id, v_invite.role, split_part(v_user_email, '@', 1));

  UPDATE public.member_invites
  SET used_at = NOW(), used_by_user_id = p_user_id
  WHERE token = p_invite_token;

  RETURN QUERY SELECT v_invite.org_id, v_invite.role, NULL::TEXT;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. REGISTRO DE EXECUTE PRETENDIDO
-- ---------------------------------------------------------------------------

DO $reconciliacao$
DECLARE
  PAPEIS_DE_CLIENTE CONSTANT TEXT[] := ARRAY['anon', 'authenticated', 'service_role'];
  r            RECORD;
  g            TEXT;
  v_faltando   TEXT;
  v_ausentes   TEXT;
BEGIN
  CREATE TEMP TABLE _execute_pretendido (
    assinatura TEXT PRIMARY KEY,
    grantees   TEXT[] NOT NULL,
    motivo     TEXT   NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO _execute_pretendido (assinatura, grantees, motivo) VALUES
    -- ── Pesquisa anônima: o respondente NUNCA tem sessão. O token é a
    --    credencial, validada dentro da própria função. anon é contrato.
    ('public.submit_sector_response(text,jsonb,text)',
      ARRAY['anon', 'service_role'],
      'INTENDED_ANON — link setorial; app chama por service_role, responsavel anonimo por anon'),
    ('public.submit_sector_response(text,jsonb)',
      ARRAY['anon', 'service_role'],
      'INTENDED_ANON — contrato legado fail-closed mantido durante a transicao'),
    ('public.submit_wave_response(uuid,text,jsonb)',
      ARRAY['anon', 'authenticated', 'service_role'],
      'INTENDED_ANON — convite COPSOQ legado; db-adapter usa cliente publishable'),
    ('public.record_item_funnel_event(text,text,integer,boolean,integer,jsonb)',
      ARRAY['service_role'],
      'SERVICE_ONLY — unico call site e survey-telemetry.server.ts por admin; anon/authenticated eram heranca de default privilege'),

    -- ── Leitura agregada com escopo por auth.uid() e k-anon no banco.
    ('public.aggregate_cohort_responses(uuid,uuid)',
      ARRAY['authenticated', 'service_role'],
      'INTENDED_AUTHENTICATED — escopo de tenant por auth.uid() + k-anon; scripts de prova usam service_role'),
    ('public.count_cohort_participation(uuid,uuid)',
      ARRAY['authenticated', 'service_role'],
      'INTENDED_AUTHENTICATED — contagem operacional, escopo por auth.uid()'),
    ('public.count_wave_responses(uuid)',
      ARRAY['authenticated', 'service_role'],
      'INTENDED_AUTHENTICATED + SERVICE — service_role era heranca de default privilege embora seja o chamador real'),

    -- ── Ações do próprio usuário, identidade por auth.uid().
    ('public.erase_my_assessments()',
      ARRAY['authenticated'],
      'INTENDED_AUTHENTICATED — Cofre Pessoal (LGPD art. 18), apaga so o proprio dado'),
    ('public.accept_pair_invite(uuid)',
      ARRAY['authenticated'],
      'INTENDED_AUTHENTICATED — aperto de mao entre as duas partes'),
    ('public.decline_pair_invite(uuid)',
      ARRAY['authenticated'],
      'INTENDED_AUTHENTICATED — recusa pela parte convidada'),
    ('public.cancel_pair_invite(uuid)',
      ARRAY['authenticated'],
      'INTENDED_AUTHENTICATED — cancelamento por quem convidou'),

    -- ── Validação de convite legado: booleano, sem autoridade de escrita.
    --    Mantidas no estado atual de propósito; ver P2 no runbook (nenhum call
    --    site vivo encontrado, mas revogar aqui trocaria risco pequeno por
    --    possibilidade de quebrar o fluxo legado do respondente).
    ('public.is_invite_valid(text)',
      ARRAY['anon', 'authenticated'],
      'INTENDED_ANON — validacao booleana do fluxo de convite legado'),
    ('public.is_invite_valid_for_wave(uuid,text)',
      ARRAY['anon', 'authenticated'],
      'INTENDED_ANON — validacao booleana com vinculo token->onda'),

    -- ── Escrita privilegiada: só o servidor, depois de autorizar na aplicação.
    ('public.mark_invite_used(text)',
      ARRAY['service_role'],
      'SERVICE_ONLY — marca convite como usado; anon/authenticated eram heranca de default privilege'),
    ('public.accept_member_invite(text,uuid)',
      ARRAY['service_role'],
      'SERVICE_ONLY — cria perfil com papel do convite; anon era heranca de default privilege'),
    ('public.provision_organization_from_invite(text,uuid,text,text,text,text,text,text,text,text,text)',
      ARRAY['service_role'],
      'SERVICE_ONLY — cria organizacao e perfil admin'),
    ('public.create_action_plan(uuid,text,text,uuid,uuid,jsonb)',
      ARRAY['service_role'], 'SERVICE_ONLY — ledger de plano de acao'),
    ('public.set_action_item_accountability(uuid,uuid,text,date,text,numeric,numeric,text,text,text,text,text)',
      ARRAY['service_role'], 'SERVICE_ONLY — accountability NR-1 §13'),
    ('public.activate_action_plan(uuid)',
      ARRAY['service_role'], 'SERVICE_ONLY — ativacao do plano'),
    ('public.record_action_event(uuid,text,uuid,text,text,boolean,text)',
      ARRAY['service_role'], 'SERVICE_ONLY — evento de acao'),
    ('public.record_evidence(uuid,text,text,text,text,date,uuid,text)',
      ARRAY['service_role'], 'SERVICE_ONLY — registro de evidencia'),
    ('public.open_devolutiva_session(uuid,uuid,uuid,text)',
      ARRAY['service_role'], 'SERVICE_ONLY — cerimonia de devolutiva'),
    ('public.cast_priority_vote(uuid,text)',
      ARRAY['service_role'], 'SERVICE_ONLY — voto de prioridade, so contagem'),
    ('public.set_devolutiva_attendance(uuid,integer)',
      ARRAY['service_role'], 'SERVICE_ONLY — presenca na cerimonia'),
    ('public.close_devolutiva_session(uuid,text[])',
      ARRAY['service_role'], 'SERVICE_ONLY — fechamento com quorum'),
    ('public.create_esg_snapshot(uuid,integer,jsonb,text,uuid)',
      ARRAY['service_role'], 'SERVICE_ONLY — snapshot ESG selado'),
    ('public.register_org_cycle(uuid,text,text,uuid,uuid)',
      ARRAY['service_role'], 'SERVICE_ONLY — registro de ciclo'),
    ('public.seal_victory_record(uuid,text,text,jsonb,text,uuid)',
      ARRAY['service_role'], 'SERVICE_ONLY — Ata selada'),

    -- ── Função de trigger: não existe chamador legítimo direto.
    ('public.enforce_profile_authority_boundary()',
      ARRAY[]::TEXT[],
      'SECURITY_DEFINER_NOT_REQUIRED — funcao de trigger, SECURITY INVOKER de proposito; nenhum EXECUTE direto');

  -- ── 2.1 Toda assinatura declarada precisa existir ─────────────────────────
  -- Assinatura declarada que não resolve significa que o schema derivou e o
  -- registro está descrevendo um banco que não é este.
  SELECT string_agg(assinatura, E'\n  - ' ORDER BY assinatura) INTO v_ausentes
    FROM _execute_pretendido
   WHERE to_regprocedure(assinatura) IS NULL;

  IF v_ausentes IS NOT NULL THEN
    RAISE EXCEPTION E'ABORTADO: assinatura(s) declarada(s) inexistente(s):\n  - %', v_ausentes;
  END IF;

  -- ── 2.2 COMPLETUDE: nada da aplicação fora do inventário ─────────────────
  SELECT string_agg(
           format('%s(%s)', p.proname, pg_get_function_identity_arguments(p.oid)),
           E'\n  - ' ORDER BY p.proname)
    INTO v_faltando
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.prokind IN ('f', 'p')
     -- Funções pertencentes a extensão (pgcrypto) não são superfície da
     -- aplicação: mexer na ACL delas quebraria a extensão.
     AND NOT EXISTS (
       SELECT 1 FROM pg_depend d
        WHERE d.objid = p.oid AND d.classid = 'pg_proc'::regclass AND d.deptype = 'e'
     )
     AND p.oid NOT IN (SELECT to_regprocedure(assinatura) FROM _execute_pretendido);

  IF v_faltando IS NOT NULL THEN
    RAISE EXCEPTION E'ABORTADO: funcao(oes) da aplicacao em public fora do inventario de EXECUTE. Declare a intencao antes de aplicar — funcao nao declarada nasce com privilegio herdado dos default privileges da conta:\n  - %',
      v_faltando;
  END IF;

  -- ── 2.3 Imposição ─────────────────────────────────────────────────────────
  FOR r IN SELECT * FROM _execute_pretendido ORDER BY assinatura LOOP
    -- Revoga de TODOS os papéis de cliente e de PUBLIC antes de reconceder. É
    -- a ordem que evita a armadilha desta base: revogar de PUBLIC deixando
    -- intacta a concessão explícita que o default privilege criou.
    EXECUTE format(
      'REVOKE ALL ON FUNCTION %s FROM PUBLIC, %s',
      r.assinatura, array_to_string(PAPEIS_DE_CLIENTE, ', '));

    FOREACH g IN ARRAY r.grantees LOOP
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO %I', r.assinatura, g);
    END LOOP;
  END LOOP;

  RAISE NOTICE 'EXECUTE reconciliado em % funcao(oes) da aplicacao.',
    (SELECT COUNT(*) FROM _execute_pretendido);
END
$reconciliacao$;

COMMENT ON FUNCTION public.accept_member_invite(TEXT, UUID) IS
  'Aceita convite de membro. O perfil so pode ser criado para o proprio usuario autenticado (p_user_id = auth.uid()); auth.role() = service_role e bypass deliberado, porque o app resolve a identidade da sessao em servidor antes de chamar. Papel e organizacao vem SEMPRE da linha do convite, nunca do chamador. EXECUTE apenas para service_role.';

COMMENT ON FUNCTION public.mark_invite_used(TEXT) IS
  'Marca convite de onda como usado. EXECUTE apenas para service_role: alcancavel pela borda publica, seria invalidacao de convite por quem adivinhasse um token.';

-- ---------------------------------------------------------------------------
-- 3. POSTCONDITIONS
-- ---------------------------------------------------------------------------

DO $postflight$
DECLARE
  v_falhas TEXT[] := '{}';
  v_secdef_sem_search_path TEXT;
BEGIN
  -- 3.1 Os achados nomeados no cabeçalho estão fechados.
  IF has_function_privilege('anon', 'public.mark_invite_used(text)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.mark_invite_used(text)', 'EXECUTE') THEN
    v_falhas := v_falhas || 'mark_invite_used ainda alcançável por papel de cliente';
  END IF;
  IF has_function_privilege('anon', 'public.accept_member_invite(text,uuid)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.accept_member_invite(text,uuid)', 'EXECUTE') THEN
    v_falhas := v_falhas || 'accept_member_invite ainda alcançável por papel de cliente';
  END IF;
  IF has_function_privilege('anon', 'public.record_item_funnel_event(text,text,integer,boolean,integer,jsonb)', 'EXECUTE') THEN
    v_falhas := v_falhas || 'record_item_funnel_event ainda alcançável por anon';
  END IF;

  -- 3.2 O que precisa continuar funcionando, funciona.
  IF NOT has_function_privilege('service_role', 'public.count_wave_responses(uuid)', 'EXECUTE') THEN
    v_falhas := v_falhas || 'service_role não pode executar count_wave_responses (chamador real da aplicação)';
  END IF;
  IF NOT has_function_privilege('anon', 'public.submit_sector_response(text,jsonb,text)', 'EXECUTE') THEN
    v_falhas := v_falhas || 'anon perdeu submit_sector_response — a pesquisa setorial pararia';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.submit_sector_response(text,jsonb,text)', 'EXECUTE') THEN
    v_falhas := v_falhas || 'service_role perdeu submit_sector_response — o servidor pararia';
  END IF;
  IF NOT has_function_privilege('anon', 'public.submit_wave_response(uuid,text,jsonb)', 'EXECUTE') THEN
    v_falhas := v_falhas || 'anon perdeu submit_wave_response — o fluxo COPSOQ legado pararia';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.aggregate_cohort_responses(uuid,uuid)', 'EXECUTE') THEN
    v_falhas := v_falhas || 'authenticated perdeu aggregate_cohort_responses — o painel FIB-T pararia';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.provision_organization_from_invite(text,uuid,text,text,text,text,text,text,text,text,text)', 'EXECUTE') THEN
    v_falhas := v_falhas || 'service_role perdeu provision_organization_from_invite — o onboarding pararia';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.accept_member_invite(text,uuid)', 'EXECUTE') THEN
    v_falhas := v_falhas || 'service_role perdeu accept_member_invite — o convite de membro pararia';
  END IF;

  -- 3.3 Nenhuma função SECURITY DEFINER da aplicação sem search_path fixo.
  --
  -- SECURITY DEFINER sem search_path é sequestrável: quem controla o
  -- search_path da sessão faz a função resolver um objeto homônimo próprio e
  -- executá-lo com os privilégios do owner.
  SELECT string_agg(p.proname, ', ' ORDER BY p.proname) INTO v_secdef_sem_search_path
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

  IF v_secdef_sem_search_path IS NOT NULL THEN
    v_falhas := v_falhas || format('SECURITY DEFINER sem search_path fixo: %s', v_secdef_sem_search_path);
  END IF;

  -- 3.4 Nenhuma função da aplicação com EXECUTE para PUBLIC.
  IF EXISTS (
    SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace,
           aclexplode(COALESCE(p.proacl, ACLDEFAULT('f', p.proowner))) AS a
     WHERE n.nspname = 'public'
       AND a.grantee = 0  -- 0 = PUBLIC
       AND NOT EXISTS (
         SELECT 1 FROM pg_depend d
          WHERE d.objid = p.oid AND d.classid = 'pg_proc'::regclass AND d.deptype = 'e'
       )
  ) THEN
    v_falhas := v_falhas || 'existe função da aplicação com EXECUTE para PUBLIC';
  END IF;

  IF array_length(v_falhas, 1) > 0 THEN
    RAISE EXCEPTION E'FALHA: reconciliacao de EXECUTE incompleta:\n  - %',
      array_to_string(v_falhas, E'\n  - ');
  END IF;

  RAISE NOTICE 'PROVEN: superficie SECURITY DEFINER inventariada; EXECUTE reconciliado; nenhum PUBLIC; search_path fixo em todas.';
END
$postflight$;

COMMIT;
