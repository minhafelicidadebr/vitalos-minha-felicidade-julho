-- FIB-T / sector-link cohort binding hardening
--
-- Scope: replace only public.submit_sector_response(text,jsonb,text).
-- The public signature, owner, ACL, SECURITY DEFINER, search_path, consent
-- evidence and existing validation semantics are preserved. The only runtime
-- changes are:
--   * link organization must match wave organization;
--   * the cohort binding must resolve to exactly one row before INSERT.
--
-- The safe public reason is intentionally generic. The server already maps a
-- rejected RPC outcome to its existing unknown-wave response, so no frontend
-- contract or data-existence signal is added.

BEGIN;

-- ---------------------------------------------------------------------------
-- 0. Capture the current function custody and reject schema drift
-- ---------------------------------------------------------------------------

DO $preflight$
DECLARE
  v_oid        OID := to_regprocedure('public.submit_sector_response(text,jsonb,text)');
  v_legacy_oid OID := to_regprocedure('public.submit_sector_response(text,jsonb)');
  v_def        TEXT;
BEGIN
  IF v_oid IS NULL THEN
    RAISE EXCEPTION 'ABORTED: public.submit_sector_response(text,jsonb,text) does not exist.';
  END IF;
  IF v_legacy_oid IS NULL THEN
    RAISE EXCEPTION 'ABORTED: legacy fail-closed submit_sector_response(text,jsonb) does not exist.';
  END IF;

  IF to_regclass('public.sector_links') IS NULL
     OR to_regclass('public.waves') IS NULL
     OR to_regclass('public.wave_cohorts') IS NULL
     OR to_regclass('public.wave_responses') IS NULL THEN
    RAISE EXCEPTION 'ABORTED: required sector-link tables are missing.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'sector_links'
       AND column_name IN ('org_id', 'wave_id', 'sector_label', 'status', 'expires_at')
     GROUP BY table_schema, table_name
    HAVING COUNT(*) = 5
  ) THEN
    RAISE EXCEPTION 'ABORTED: public.sector_links contract drifted.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'wave_cohorts'
       AND column_name IN ('id', 'org_id', 'wave_id', 'key')
     GROUP BY table_schema, table_name
    HAVING COUNT(*) = 4
  ) THEN
    RAISE EXCEPTION 'ABORTED: public.wave_cohorts contract drifted.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'wave_responses'
       AND column_name IN (
         'wave_id', 'cohort_id', 'instrument', 'instrument_version', 'answers',
         'consent_version', 'consent_accepted_at'
       )
     GROUP BY table_schema, table_name
    HAVING COUNT(*) = 7
  ) THEN
    RAISE EXCEPTION 'ABORTED: public.wave_responses contract drifted.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
     WHERE p.oid = v_oid
       AND p.pronargs = 3
       AND p.proargtypes[0] = 'text'::regtype::OID
       AND p.proargtypes[1] = 'jsonb'::regtype::OID
       AND p.proargtypes[2] = 'text'::regtype::OID
       AND p.proargnames[1] = 'p_token_hash'
       AND p.proargnames[2] = 'p_answers'
       AND p.proargnames[3] = 'p_consent_version'
       AND p.prosecdef
  ) THEN
    RAISE EXCEPTION 'ABORTED: canonical RPC signature or SECURITY DEFINER drifted.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p, unnest(p.proconfig) AS cfg
     WHERE p.oid = v_oid AND cfg ~ 'search_path\s*=\s*"?public"?'
  ) THEN
    RAISE EXCEPTION 'ABORTED: canonical RPC search_path is not fixed to public.';
  END IF;
  IF lower(regexp_replace(pg_get_function_result(v_oid), '\s+', ' ', 'g')) IS DISTINCT FROM
     'table(accepted boolean, reason text, response_count integer)' THEN
    RAISE EXCEPTION 'ABORTED: canonical RPC return contract drifted.';
  END IF;

  SELECT pg_get_functiondef(v_oid) INTO v_def;
  IF v_def !~* '\mconsent_version\M'
     OR v_def !~* '\mconsent_accepted_at\M'
     OR v_def !~* 'statement_timestamp\(\)'
     OR v_def ~* '\minvite_token\M' THEN
    RAISE EXCEPTION 'ABORTED: consent or anonymous-response contract drifted.';
  END IF;

  PERFORM set_config(
    'fibt.cohort_binding_owner_before',
    (SELECT pg_get_userbyid(proowner) FROM pg_proc WHERE oid = v_oid),
    true
  );
  PERFORM set_config(
    'fibt.cohort_binding_acl_before',
    COALESCE((SELECT proacl::TEXT FROM pg_proc WHERE oid = v_oid), ''),
    true
  );
  PERFORM set_config(
    'fibt.cohort_binding_legacy_hash_before',
    md5(pg_get_functiondef(v_legacy_oid)),
    true
  );
END
$preflight$;

-- ---------------------------------------------------------------------------
-- 1. Canonical RPC with strict cohort resolution before persistence
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.submit_sector_response(
  p_token_hash      TEXT,
  p_answers         JSONB,
  p_consent_version TEXT
)
RETURNS TABLE(accepted BOOLEAN, reason TEXT, response_count INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
  v_link               public.sector_links%ROWTYPE;
  v_wave_status        TEXT;
  v_instrument         TEXT;
  v_instrument_version TEXT;
  v_cohort_id          UUID;
  v_count              INTEGER;
BEGIN
  IF p_consent_version IS NULL
     OR BTRIM(p_consent_version) = ''
     OR CHAR_LENGTH(BTRIM(p_consent_version)) > 20
     OR BTRIM(p_consent_version) <> '2026.1' THEN
    RETURN QUERY SELECT FALSE, 'invalid_consent_version'::TEXT, 0;
    RETURN;
  END IF;

  SELECT * INTO v_link
    FROM public.sector_links
   WHERE token_hash = p_token_hash;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'invalid_token'::TEXT, 0;
    RETURN;
  END IF;

  IF v_link.status <> 'active' THEN
    RETURN QUERY SELECT FALSE, 'link_revoked'::TEXT, 0;
    RETURN;
  END IF;

  IF v_link.expires_at <= NOW() THEN
    RETURN QUERY SELECT FALSE, 'link_expired'::TEXT, 0;
    RETURN;
  END IF;

  SELECT status, instrument, instrument_version
    INTO v_wave_status, v_instrument, v_instrument_version
    FROM public.waves
   WHERE id = v_link.wave_id
     AND org_id = v_link.org_id;

  IF v_wave_status IS NULL OR v_wave_status IN ('sealed', 'cancelled', 'archived') THEN
    RETURN QUERY SELECT FALSE, 'wave_not_open'::TEXT, 0;
    RETURN;
  END IF;

  BEGIN
    SELECT c.id INTO STRICT v_cohort_id
      FROM public.wave_cohorts c
     WHERE c.wave_id = v_link.wave_id
       AND c.org_id = v_link.org_id
       AND c.key = v_link.sector_label;
  EXCEPTION
    WHEN NO_DATA_FOUND OR TOO_MANY_ROWS THEN
      RETURN QUERY SELECT FALSE, 'cohort_binding_invalid'::TEXT, 0;
      RETURN;
  END;

  INSERT INTO public.wave_responses (
    wave_id,
    cohort_id,
    instrument,
    instrument_version,
    answers,
    consent_version,
    consent_accepted_at
  ) VALUES (
    v_link.wave_id,
    v_cohort_id,
    v_instrument,
    v_instrument_version,
    p_answers,
    BTRIM(p_consent_version),
    statement_timestamp()
  );

  SELECT COUNT(*) INTO v_count
    FROM public.wave_responses
   WHERE wave_id = v_link.wave_id;

  RETURN QUERY SELECT TRUE, NULL::TEXT, v_count;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 2. Postconditions: custody, public contract and fail-closed ordering
-- ---------------------------------------------------------------------------

DO $postflight$
DECLARE
  v_oid          OID := to_regprocedure('public.submit_sector_response(text,jsonb,text)');
  v_legacy_oid   OID := to_regprocedure('public.submit_sector_response(text,jsonb)');
  v_def          TEXT;
  v_owner_after  TEXT;
  v_acl_after    TEXT;
BEGIN
  IF v_oid IS NULL OR v_legacy_oid IS NULL THEN
    RAISE EXCEPTION 'FAILED: canonical or legacy RPC disappeared.';
  END IF;

  SELECT pg_get_functiondef(v_oid), pg_get_userbyid(proowner), COALESCE(proacl::TEXT, '')
    INTO v_def, v_owner_after, v_acl_after
    FROM pg_proc WHERE oid = v_oid;

  IF v_owner_after IS DISTINCT FROM current_setting('fibt.cohort_binding_owner_before', true) THEN
    RAISE EXCEPTION 'FAILED: canonical RPC owner changed.';
  END IF;
  IF v_acl_after IS DISTINCT FROM current_setting('fibt.cohort_binding_acl_before', true) THEN
    RAISE EXCEPTION 'FAILED: canonical RPC ACL changed.';
  END IF;
  IF md5(pg_get_functiondef(v_legacy_oid)) IS DISTINCT FROM
     current_setting('fibt.cohort_binding_legacy_hash_before', true) THEN
    RAISE EXCEPTION 'FAILED: legacy fail-closed RPC changed.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
     WHERE p.oid = v_oid
       AND p.pronargs = 3
       AND p.proargtypes[0] = 'text'::regtype::OID
       AND p.proargtypes[1] = 'jsonb'::regtype::OID
       AND p.proargtypes[2] = 'text'::regtype::OID
       AND p.proargnames[1] = 'p_token_hash'
       AND p.proargnames[2] = 'p_answers'
       AND p.proargnames[3] = 'p_consent_version'
       AND p.prosecdef
  ) THEN
    RAISE EXCEPTION 'FAILED: canonical RPC signature or SECURITY DEFINER changed.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p, unnest(p.proconfig) AS cfg
     WHERE p.oid = v_oid AND cfg ~ 'search_path\s*=\s*"?public"?'
  ) THEN
    RAISE EXCEPTION 'FAILED: canonical RPC search_path changed.';
  END IF;
  IF lower(regexp_replace(pg_get_function_result(v_oid), '\s+', ' ', 'g')) IS DISTINCT FROM
     'table(accepted boolean, reason text, response_count integer)' THEN
    RAISE EXCEPTION 'FAILED: canonical RPC return contract changed.';
  END IF;

  IF v_def !~* 'INTO\s+STRICT\s+v_cohort_id'
     OR v_def !~* 'NO_DATA_FOUND\s+OR\s+TOO_MANY_ROWS'
     OR v_def !~* 'cohort_binding_invalid' THEN
    RAISE EXCEPTION 'FAILED: strict cohort binding is incomplete.';
  END IF;
  IF strpos(v_def, 'INTO STRICT v_cohort_id') = 0
     OR strpos(v_def, 'INSERT INTO public.wave_responses') = 0
     OR strpos(v_def, 'INTO STRICT v_cohort_id') > strpos(v_def, 'INSERT INTO public.wave_responses') THEN
    RAISE EXCEPTION 'FAILED: cohort binding does not precede response INSERT.';
  END IF;
  IF v_def !~* 'cohort_id[\s\S]*v_cohort_id'
     OR v_def !~* '\mconsent_version\M'
     OR v_def !~* '\mconsent_accepted_at\M'
     OR v_def !~* 'statement_timestamp\(\)'
     OR v_def ~* '\minvite_token\M' THEN
    RAISE EXCEPTION 'FAILED: persistence or anonymity contract changed.';
  END IF;

  RAISE NOTICE 'Sector response cohort binding is fail-closed; signature, custody and consent contract preserved.';
END
$postflight$;

COMMIT;
