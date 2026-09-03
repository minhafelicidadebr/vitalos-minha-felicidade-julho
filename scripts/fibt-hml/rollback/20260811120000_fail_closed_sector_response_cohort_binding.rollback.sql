-- LOCAL ROLLBACK ARTIFACT -- DO NOT APPLY WITHOUT SEPARATE AUTHORIZATION.
--
-- Restores exactly the three-argument RPC body from
-- 20260807120000_sector_response_consent_durability.sql. This intentionally
-- restores the former nullable cohort behavior and therefore reopens the
-- defect fixed by the forward migration. It never changes response data.

BEGIN;

DO $preflight$
DECLARE
  v_oid OID := to_regprocedure('public.submit_sector_response(text,jsonb,text)');
  v_def TEXT;
BEGIN
  IF v_oid IS NULL THEN
    RAISE EXCEPTION 'ABORTED: canonical sector response RPC is missing.';
  END IF;

  SELECT pg_get_functiondef(v_oid) INTO v_def;
  IF v_def !~* 'INTO\s+STRICT\s+v_cohort_id'
     OR v_def !~* 'cohort_binding_invalid' THEN
    RAISE EXCEPTION 'ABORTED: installed RPC is not the expected cohort-binding hardening.';
  END IF;

  PERFORM set_config(
    'fibt.cohort_binding_rollback_owner',
    (SELECT pg_get_userbyid(proowner) FROM pg_proc WHERE oid = v_oid),
    true
  );
  PERFORM set_config(
    'fibt.cohort_binding_rollback_acl',
    COALESCE((SELECT proacl::TEXT FROM pg_proc WHERE oid = v_oid), ''),
    true
  );
END
$preflight$;

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
   WHERE id = v_link.wave_id;

  IF v_wave_status IS NULL OR v_wave_status IN ('sealed', 'cancelled', 'archived') THEN
    RETURN QUERY SELECT FALSE, 'wave_not_open'::TEXT, 0;
    RETURN;
  END IF;

  SELECT c.id INTO v_cohort_id
    FROM public.wave_cohorts c
   WHERE c.wave_id = v_link.wave_id
     AND c.key = v_link.sector_label;

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

DO $postflight$
DECLARE
  v_oid         OID := to_regprocedure('public.submit_sector_response(text,jsonb,text)');
  v_def         TEXT;
  v_owner_after TEXT;
  v_acl_after   TEXT;
BEGIN
  IF v_oid IS NULL THEN
    RAISE EXCEPTION 'FAILED: canonical sector response RPC disappeared.';
  END IF;

  SELECT pg_get_functiondef(v_oid), pg_get_userbyid(proowner), COALESCE(proacl::TEXT, '')
    INTO v_def, v_owner_after, v_acl_after
    FROM pg_proc WHERE oid = v_oid;

  IF v_owner_after IS DISTINCT FROM current_setting('fibt.cohort_binding_rollback_owner', true) THEN
    RAISE EXCEPTION 'FAILED: canonical RPC owner changed during rollback.';
  END IF;
  IF v_acl_after IS DISTINCT FROM current_setting('fibt.cohort_binding_rollback_acl', true) THEN
    RAISE EXCEPTION 'FAILED: canonical RPC ACL changed during rollback.';
  END IF;
  IF v_def ~* 'INTO\s+STRICT\s+v_cohort_id'
     OR v_def ~* 'cohort_binding_invalid'
     OR v_def !~* '\mconsent_version\M'
     OR v_def !~* '\mconsent_accepted_at\M'
     OR v_def !~* 'statement_timestamp\(\)' THEN
    RAISE EXCEPTION 'FAILED: prior consent-durability definition was not restored.';
  END IF;

  RAISE NOTICE 'Prior sector response RPC definition restored; no response data changed.';
END
$postflight$;

COMMIT;
