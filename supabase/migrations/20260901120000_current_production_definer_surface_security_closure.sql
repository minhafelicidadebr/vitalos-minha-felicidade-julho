-- G1-v2 / M6A — fechamento de segurança da superfície da fase produtiva atual
--
-- O M6 histórico (20260828121000) inventariou a união do baseline produtivo
-- com 14 funções de módulos RC ainda não materializados em produção. Ele fica
-- preservado byte-for-byte como custódia histórica e fora do pacote G1-v2.
--
-- Esta migration separa explicitamente:
--   REQUIRED_NOW    — 15 funções que devem existir depois de M1-M5;
--   FUTURE_OPTIONAL — 14 funções de sete módulos ainda não promovidos.
--
-- Ausência em REQUIRED_NOW aborta. Ausência em FUTURE_OPTIONAL é permitida;
-- se uma função futura existir, sua ACL é reconciliada exatamente como seria
-- na fase futura. Qualquer função da aplicação fora da união aborta.
--
-- Segurança não é opcional por fase: nenhuma função presente fica com EXECUTE
-- de PUBLIC, toda SECURITY DEFINER presente tem search_path fixo e cada papel
-- cliente recebe exatamente a allowlist declarada.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Identidade em accept_member_invite (mesmo fechamento do M6 histórico)
-- ---------------------------------------------------------------------------

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

  SELECT * INTO v_invite
    FROM public.member_invites
   WHERE token = p_invite_token
   FOR UPDATE;

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

  INSERT INTO public.profiles (id, org_id, role, display_name)
  VALUES (p_user_id, v_invite.org_id, v_invite.role, split_part(v_user_email, '@', 1));

  UPDATE public.member_invites
     SET used_at = NOW(), used_by_user_id = p_user_id
   WHERE token = p_invite_token;

  RETURN QUERY SELECT v_invite.org_id, v_invite.role, NULL::TEXT;
END;
$$;

COMMENT ON FUNCTION public.accept_member_invite(TEXT, UUID) IS
  'Aceita convite de membro. p_user_id deve ser auth.uid(), exceto no caminho deliberado de service_role. EXECUTE apenas para service_role.';

-- ---------------------------------------------------------------------------
-- 2. Registros de fase e reconciliação determinística
-- ---------------------------------------------------------------------------

DO $m6a$
DECLARE
  PAPEIS_DE_CLIENTE CONSTANT TEXT[] := ARRAY['anon', 'authenticated', 'service_role'];
  r                  RECORD;
  g                  TEXT;
  papel              TEXT;
  esperado           BOOLEAN;
  efetivo             BOOLEAN;
  v_required_missing TEXT;
  v_unknown          TEXT;
  v_public           TEXT;
  v_sem_search_path  TEXT;
  v_acl_failures     TEXT[] := '{}';
BEGIN
  CREATE TEMP TABLE _m6a_required_now (
    assinatura TEXT PRIMARY KEY,
    grantees   TEXT[] NOT NULL,
    motivo     TEXT NOT NULL
  ) ON COMMIT DROP;

  CREATE TEMP TABLE _m6a_future_optional (
    assinatura TEXT PRIMARY KEY,
    grantees   TEXT[] NOT NULL,
    modulo     TEXT NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO _m6a_required_now (assinatura, grantees, motivo) VALUES
    ('public.submit_sector_response(text,jsonb,text)',
      ARRAY['anon', 'service_role'], 'G1 M2/M3 — coleta setorial anônima'),
    ('public.submit_sector_response(text,jsonb)',
      ARRAY['anon', 'service_role'], 'G1 M2 — wrapper legado fail-closed'),
    ('public.submit_wave_response(uuid,text,jsonb)',
      ARRAY['anon', 'authenticated', 'service_role'], 'fluxo COPSOQ legado'),
    ('public.aggregate_cohort_responses(uuid,uuid)',
      ARRAY['authenticated', 'service_role'], 'agregado k-anon por tenant'),
    ('public.count_cohort_participation(uuid,uuid)',
      ARRAY['authenticated', 'service_role'], 'contagem operacional por tenant'),
    ('public.count_wave_responses(uuid)',
      ARRAY['authenticated', 'service_role'], 'contagem de onda'),
    ('public.accept_pair_invite(uuid)',
      ARRAY['authenticated'], 'ação do próprio usuário'),
    ('public.decline_pair_invite(uuid)',
      ARRAY['authenticated'], 'ação do próprio usuário'),
    ('public.cancel_pair_invite(uuid)',
      ARRAY['authenticated'], 'ação do próprio usuário'),
    ('public.is_invite_valid(text)',
      ARRAY['anon', 'authenticated'], 'validação booleana de convite legado'),
    ('public.is_invite_valid_for_wave(uuid,text)',
      ARRAY['anon', 'authenticated'], 'validação booleana por onda'),
    ('public.mark_invite_used(text)',
      ARRAY['service_role'], 'escrita privilegiada de convite'),
    ('public.accept_member_invite(text,uuid)',
      ARRAY['service_role'], 'criação de perfil pelo servidor'),
    ('public.provision_organization_from_invite(text,uuid,text,text,text,text,text,text,text,text,text)',
      ARRAY['service_role'], 'provisionamento de organização pelo servidor'),
    ('public.enforce_profile_authority_boundary()',
      ARRAY[]::TEXT[], 'G1 M5 — função SECURITY INVOKER de trigger');

  INSERT INTO _m6a_future_optional (assinatura, grantees, modulo) VALUES
    ('public.create_action_plan(uuid,text,text,uuid,uuid,jsonb)',
      ARRAY['service_role'], 'Action Plan'),
    ('public.set_action_item_accountability(uuid,uuid,text,date,text,numeric,numeric,text,text,text,text,text)',
      ARRAY['service_role'], 'Action Plan'),
    ('public.activate_action_plan(uuid)',
      ARRAY['service_role'], 'Action Plan'),
    ('public.record_action_event(uuid,text,uuid,text,text,boolean,text)',
      ARRAY['service_role'], 'Action Plan'),
    ('public.record_evidence(uuid,text,text,text,text,date,uuid,text)',
      ARRAY['service_role'], 'Action Plan'),
    ('public.open_devolutiva_session(uuid,uuid,uuid,text)',
      ARRAY['service_role'], 'Devolutiva'),
    ('public.cast_priority_vote(uuid,text)',
      ARRAY['service_role'], 'Devolutiva'),
    ('public.set_devolutiva_attendance(uuid,integer)',
      ARRAY['service_role'], 'Devolutiva'),
    ('public.close_devolutiva_session(uuid,text[])',
      ARRAY['service_role'], 'Devolutiva'),
    ('public.create_esg_snapshot(uuid,integer,jsonb,text,uuid)',
      ARRAY['service_role'], 'ESG'),
    ('public.erase_my_assessments()',
      ARRAY['authenticated'], 'Personal Assessments / Espelho'),
    ('public.register_org_cycle(uuid,text,text,uuid,uuid)',
      ARRAY['service_role'], 'Organization Cycle'),
    ('public.seal_victory_record(uuid,text,text,jsonb,text,uuid)',
      ARRAY['service_role'], 'Victory Records'),
    ('public.record_item_funnel_event(text,text,integer,boolean,integer,jsonb)',
      ARRAY['service_role'], 'Survey Telemetry');

  -- REQUIRED_NOW é fail-closed: o pacote anterior deve materializar todos.
  SELECT string_agg(assinatura, E'\n  - ' ORDER BY assinatura)
    INTO v_required_missing
    FROM _m6a_required_now
   WHERE to_regprocedure(assinatura) IS NULL;

  IF v_required_missing IS NOT NULL THEN
    RAISE EXCEPTION E'ABORTADO M6A: função(ões) REQUIRED_NOW ausente(s):\n  - %',
      v_required_missing;
  END IF;

  -- Completeness guard phase-aware: somente a união literal é reconhecida.
  SELECT string_agg(
           format('%s(%s)', p.proname, pg_get_function_identity_arguments(p.oid)),
           E'\n  - ' ORDER BY p.proname, pg_get_function_identity_arguments(p.oid))
    INTO v_unknown
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.prokind IN ('f', 'p')
     AND NOT EXISTS (
       SELECT 1 FROM pg_depend d
        WHERE d.objid = p.oid
          AND d.classid = 'pg_proc'::regclass
          AND d.deptype = 'e'
     )
     AND p.oid NOT IN (
       SELECT to_regprocedure(assinatura) FROM _m6a_required_now
       UNION ALL
       SELECT to_regprocedure(assinatura)
         FROM _m6a_future_optional
        WHERE to_regprocedure(assinatura) IS NOT NULL
     );

  IF v_unknown IS NOT NULL THEN
    RAISE EXCEPTION E'ABORTADO M6A: função(ões) public fora de REQUIRED_NOW + FUTURE_OPTIONAL:\n  - %',
      v_unknown;
  END IF;

  -- Parte de zero para todos os papéis alcançáveis e reconcede a allowlist.
  FOR r IN
    SELECT assinatura, grantees, 'REQUIRED_NOW'::TEXT AS fase
      FROM _m6a_required_now
    UNION ALL
    SELECT assinatura, grantees, 'FUTURE_OPTIONAL'::TEXT AS fase
      FROM _m6a_future_optional
     WHERE to_regprocedure(assinatura) IS NOT NULL
    ORDER BY assinatura
  LOOP
    EXECUTE format(
      'REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated, service_role',
      r.assinatura
    );
    FOREACH g IN ARRAY r.grantees LOOP
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO %I', r.assinatura, g);
    END LOOP;
  END LOOP;

  -- Nenhuma função da aplicação pode conservar EXECUTE de PUBLIC.
  SELECT string_agg(
           format('%s(%s)', p.proname, pg_get_function_identity_arguments(p.oid)),
           ', ' ORDER BY p.proname)
    INTO v_public
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace,
         aclexplode(COALESCE(p.proacl, ACLDEFAULT('f', p.proowner))) AS a
   WHERE n.nspname = 'public'
     AND p.prokind IN ('f', 'p')
     AND a.grantee = 0
     AND a.privilege_type = 'EXECUTE'
     AND NOT EXISTS (
       SELECT 1 FROM pg_depend d
        WHERE d.objid = p.oid
          AND d.classid = 'pg_proc'::regclass
          AND d.deptype = 'e'
     );

  IF v_public IS NOT NULL THEN
    RAISE EXCEPTION 'FALHA M6A: EXECUTE para PUBLIC em %.', v_public;
  END IF;

  -- Política explícita: M6A não inventa search_path para função desconhecida;
  -- qualquer SECURITY DEFINER presente sem fixação aborta a transação inteira.
  SELECT string_agg(
           format('%s(%s)', p.proname, pg_get_function_identity_arguments(p.oid)),
           ', ' ORDER BY p.proname)
    INTO v_sem_search_path
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.prosecdef
     AND NOT EXISTS (
       SELECT 1 FROM pg_depend d
        WHERE d.objid = p.oid
          AND d.classid = 'pg_proc'::regclass
          AND d.deptype = 'e'
     )
     AND NOT EXISTS (
       SELECT 1
         FROM unnest(COALESCE(p.proconfig, ARRAY[]::TEXT[])) AS cfg
        WHERE cfg ~ 'search_path\s*='
     );

  IF v_sem_search_path IS NOT NULL THEN
    RAISE EXCEPTION 'FALHA M6A: SECURITY DEFINER sem search_path fixo: %.',
      v_sem_search_path;
  END IF;

  -- Compara privilégio efetivo de cada papel com a allowlist, inclusive para
  -- toda FUTURE_OPTIONAL que já esteja materializada neste ambiente.
  FOR r IN
    SELECT assinatura, grantees, 'REQUIRED_NOW'::TEXT AS fase
      FROM _m6a_required_now
    UNION ALL
    SELECT assinatura, grantees, 'FUTURE_OPTIONAL'::TEXT AS fase
      FROM _m6a_future_optional
     WHERE to_regprocedure(assinatura) IS NOT NULL
    ORDER BY assinatura
  LOOP
    FOREACH papel IN ARRAY PAPEIS_DE_CLIENTE LOOP
      esperado := papel = ANY (r.grantees);
      efetivo := has_function_privilege(papel, to_regprocedure(r.assinatura), 'EXECUTE');
      IF efetivo IS DISTINCT FROM esperado THEN
        v_acl_failures := v_acl_failures || format(
          '%s [%s]: %s EXECUTE=%s, esperado=%s',
          r.assinatura, r.fase, papel, efetivo, esperado
        );
      END IF;
    END LOOP;
  END LOOP;

  IF array_length(v_acl_failures, 1) > 0 THEN
    RAISE EXCEPTION E'FALHA M6A: ACL divergiu da allowlist:\n  - %',
      array_to_string(v_acl_failures, E'\n  - ');
  END IF;

  -- Invariantes nomeados de maior risco.
  IF has_function_privilege('anon', 'public.mark_invite_used(text)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.mark_invite_used(text)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.accept_member_invite(text,uuid)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.accept_member_invite(text,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FALHA M6A: função service-only alcançável por papel de cliente.';
  END IF;

  IF NOT has_function_privilege(
       'anon', 'public.submit_sector_response(text,jsonb,text)', 'EXECUTE')
     OR NOT has_function_privilege(
       'service_role', 'public.accept_member_invite(text,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FALHA M6A: caminho legítimo obrigatório perdeu EXECUTE.';
  END IF;

  IF (SELECT prosecdef FROM pg_proc
       WHERE oid = to_regprocedure('public.enforce_profile_authority_boundary()')) THEN
    RAISE EXCEPTION 'FALHA M6A: enforce_profile_authority_boundary deve ser SECURITY INVOKER.';
  END IF;

  IF pg_get_functiondef(to_regprocedure('public.accept_member_invite(text,uuid)'))
       !~* 'v_caller\s*<>\s*p_user_id'
     OR pg_get_functiondef(to_regprocedure('public.accept_member_invite(text,uuid)'))
       !~* 'auth\.role\(\)\s*=\s*''service_role''' THEN
    RAISE EXCEPTION 'FALHA M6A: portão de identidade de accept_member_invite ausente.';
  END IF;

  RAISE NOTICE 'PROVEN M6A: REQUIRED_NOW completo (% funções).',
    (SELECT COUNT(*) FROM _m6a_required_now);
  RAISE NOTICE 'PROVEN M6A: FUTURE_OPTIONAL presente e reconciliada (% de % funções).',
    (SELECT COUNT(*) FROM _m6a_future_optional
      WHERE to_regprocedure(assinatura) IS NOT NULL),
    (SELECT COUNT(*) FROM _m6a_future_optional);
  RAISE NOTICE 'PROVEN M6A: UNKNOWN=0, PUBLIC=0, search_path seguro e allowlist exata.';
END
$m6a$;

COMMIT;