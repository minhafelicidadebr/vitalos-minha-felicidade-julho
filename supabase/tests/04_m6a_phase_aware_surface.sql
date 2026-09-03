-- PROVA EXECUTÁVEL · M6A PHASE-AWARE SECURITY SURFACE
-- Passa tanto no replay RC completo (14 futuras presentes) quanto no estado
-- production-like (14 futuras ausentes). Presença futura nunca fica insegura.

\set ON_ERROR_STOP on

DO $m6a_proof$
DECLARE
  r          RECORD;
  papel      TEXT;
  esperado   BOOLEAN;
  efetivo    BOOLEAN;
  v_unknown  TEXT;
  v_falhas   TEXT[] := '{}';
  v_present  INTEGER;
BEGIN
  CREATE TEMP TABLE _proof_required (
    assinatura TEXT PRIMARY KEY,
    grantees TEXT[] NOT NULL
  ) ON COMMIT DROP;
  CREATE TEMP TABLE _proof_future (
    assinatura TEXT PRIMARY KEY,
    grantees TEXT[] NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO _proof_required VALUES
    ('public.submit_sector_response(text,jsonb,text)', ARRAY['anon','service_role']),
    ('public.submit_sector_response(text,jsonb)', ARRAY['anon','service_role']),
    ('public.submit_wave_response(uuid,text,jsonb)', ARRAY['anon','authenticated','service_role']),
    ('public.aggregate_cohort_responses(uuid,uuid)', ARRAY['authenticated','service_role']),
    ('public.count_cohort_participation(uuid,uuid)', ARRAY['authenticated','service_role']),
    ('public.count_wave_responses(uuid)', ARRAY['authenticated','service_role']),
    ('public.accept_pair_invite(uuid)', ARRAY['authenticated']),
    ('public.decline_pair_invite(uuid)', ARRAY['authenticated']),
    ('public.cancel_pair_invite(uuid)', ARRAY['authenticated']),
    ('public.is_invite_valid(text)', ARRAY['anon','authenticated']),
    ('public.is_invite_valid_for_wave(uuid,text)', ARRAY['anon','authenticated']),
    ('public.mark_invite_used(text)', ARRAY['service_role']),
    ('public.accept_member_invite(text,uuid)', ARRAY['service_role']),
    ('public.provision_organization_from_invite(text,uuid,text,text,text,text,text,text,text,text,text)', ARRAY['service_role']),
    ('public.enforce_profile_authority_boundary()', ARRAY[]::TEXT[]);

  INSERT INTO _proof_future VALUES
    ('public.create_action_plan(uuid,text,text,uuid,uuid,jsonb)', ARRAY['service_role']),
    ('public.set_action_item_accountability(uuid,uuid,text,date,text,numeric,numeric,text,text,text,text,text)', ARRAY['service_role']),
    ('public.activate_action_plan(uuid)', ARRAY['service_role']),
    ('public.record_action_event(uuid,text,uuid,text,text,boolean,text)', ARRAY['service_role']),
    ('public.record_evidence(uuid,text,text,text,text,date,uuid,text)', ARRAY['service_role']),
    ('public.open_devolutiva_session(uuid,uuid,uuid,text)', ARRAY['service_role']),
    ('public.cast_priority_vote(uuid,text)', ARRAY['service_role']),
    ('public.set_devolutiva_attendance(uuid,integer)', ARRAY['service_role']),
    ('public.close_devolutiva_session(uuid,text[])', ARRAY['service_role']),
    ('public.create_esg_snapshot(uuid,integer,jsonb,text,uuid)', ARRAY['service_role']),
    ('public.erase_my_assessments()', ARRAY['authenticated']),
    ('public.register_org_cycle(uuid,text,text,uuid,uuid)', ARRAY['service_role']),
    ('public.seal_victory_record(uuid,text,text,jsonb,text,uuid)', ARRAY['service_role']),
    ('public.record_item_funnel_event(text,text,integer,boolean,integer,jsonb)', ARRAY['service_role']);

  IF EXISTS (SELECT 1 FROM _proof_required WHERE to_regprocedure(assinatura) IS NULL) THEN
    v_falhas := v_falhas || 'REQUIRED_NOW ausente';
  END IF;

  SELECT string_agg(format('%s(%s)', p.proname, pg_get_function_identity_arguments(p.oid)), ', ')
    INTO v_unknown
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.prokind IN ('f','p')
     AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid=p.oid AND d.classid='pg_proc'::regclass AND d.deptype='e')
     AND p.oid NOT IN (
       SELECT to_regprocedure(assinatura) FROM _proof_required
       UNION ALL
       SELECT to_regprocedure(assinatura) FROM _proof_future WHERE to_regprocedure(assinatura) IS NOT NULL
     );
  IF v_unknown IS NOT NULL THEN
    v_falhas := v_falhas || format('função desconhecida: %s', v_unknown);
  END IF;

  FOR r IN
    SELECT assinatura, grantees FROM _proof_required
    UNION ALL
    SELECT assinatura, grantees FROM _proof_future WHERE to_regprocedure(assinatura) IS NOT NULL
  LOOP
    FOREACH papel IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
      esperado := papel = ANY(r.grantees);
      efetivo := has_function_privilege(papel, to_regprocedure(r.assinatura), 'EXECUTE');
      IF efetivo IS DISTINCT FROM esperado THEN
        v_falhas := v_falhas || format('%s: %s=%s esperado=%s', r.assinatura, papel, efetivo, esperado);
      END IF;
    END LOOP;
  END LOOP;

  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace,
      aclexplode(COALESCE(p.proacl, acldefault('f',p.proowner))) a
     WHERE n.nspname='public' AND a.grantee=0 AND a.privilege_type='EXECUTE'
       AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid=p.oid AND d.classid='pg_proc'::regclass AND d.deptype='e')
  ) THEN
    v_falhas := v_falhas || 'EXECUTE para PUBLIC';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='public' AND p.prosecdef
       AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid=p.oid AND d.classid='pg_proc'::regclass AND d.deptype='e')
       AND NOT EXISTS (SELECT 1 FROM unnest(COALESCE(p.proconfig,ARRAY[]::TEXT[])) cfg WHERE cfg ~ 'search_path\s*=')
  ) THEN
    v_falhas := v_falhas || 'SECURITY DEFINER sem search_path';
  END IF;

  IF array_length(v_falhas,1) > 0 THEN
    RAISE EXCEPTION E'FAILED M6A phase-aware:\n  - %', array_to_string(v_falhas,E'\n  - ');
  END IF;

  SELECT COUNT(*) INTO v_present FROM _proof_future WHERE to_regprocedure(assinatura) IS NOT NULL;
  RAISE NOTICE 'PROVEN: M6A_REQUIRED_NOW_COMPLETE=true';
  RAISE NOTICE 'PROVEN: M6A_UNKNOWN_FUNCTIONS=0';
  RAISE NOTICE 'PROVEN: M6A_FUTURE_PRESENT_SECURED=%/14', v_present;
  RAISE NOTICE 'PROVEN: M6A_PUBLIC_EXECUTE=0 e SECURITY_DEFINER_SEARCH_PATH=SAFE';
END
$m6a_proof$;