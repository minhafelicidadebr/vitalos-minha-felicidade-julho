-- MACRO 2 / WAVE 2.1 -- evidência durável de consentimento no sector-link
--
-- Contrato mínimo:
--   * consent_version: versão curta do texto apresentado/aceito;
--   * consent_accepted_at: horário do banco no boundary atômico;
--   * wave_id já existente: contexto da coleta.
--
-- As duas colunas pertencem à resposta ANÔNIMA. Não há token, hash, usuário,
-- e-mail ou FK para convite. Respostas antigas e o fluxo por convite permanecem
-- com ambos os campos NULL. Somente a nova assinatura de submit_sector_response
-- persiste ambos; a assinatura antiga vira um wrapper fail-closed.

BEGIN;

-- ---------------------------------------------------------------------------
-- 0. Preconditions: partir exatamente do contrato encerrado na Macro 1
-- ---------------------------------------------------------------------------

DO $preflight$
DECLARE
  v_old_oid OID := to_regprocedure('public.submit_sector_response(text,jsonb)');
BEGIN
  IF to_regclass('public.wave_responses') IS NULL THEN
    RAISE EXCEPTION 'ABORTADO: public.wave_responses não existe.';
  END IF;
  IF to_regclass('public.wave_invites') IS NULL THEN
    RAISE EXCEPTION 'ABORTADO: public.wave_invites não existe.';
  END IF;
  IF to_regclass('public.sector_links') IS NULL THEN
    RAISE EXCEPTION 'ABORTADO: public.sector_links não existe.';
  END IF;
  IF v_old_oid IS NULL THEN
    RAISE EXCEPTION 'ABORTADO: submit_sector_response(text,jsonb) não existe.';
  END IF;
  IF to_regprocedure('public.submit_sector_response(text,jsonb,text)') IS NOT NULL THEN
    RAISE EXCEPTION 'ABORTADO: assinatura com consentimento já existe; investigar drift.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'wave_responses'
       AND column_name IN ('consent_version', 'consent_accepted_at')
  ) THEN
    RAISE EXCEPTION 'ABORTADO: coluna de consentimento já existe; investigar aplicação parcial.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'wave_responses'
       AND column_name = 'invite_token'
  ) THEN
    RAISE EXCEPTION 'ABORTADO: wave_responses.invite_token reapareceu; contrato da Macro 1 violado.';
  END IF;
  IF EXISTS (
    SELECT 1
      FROM pg_constraint c
     WHERE c.conrelid = 'public.wave_responses'::regclass
       AND c.contype = 'f'
       AND c.confrelid = 'public.wave_invites'::regclass
  ) THEN
    RAISE EXCEPTION 'ABORTADO: wave_responses voltou a referenciar wave_invites.';
  END IF;

  PERFORM set_config(
    'fibt.consent_function_owner',
    (SELECT pg_get_userbyid(proowner) FROM pg_proc WHERE oid = v_old_oid),
    true
  );
END
$preflight$;

-- ---------------------------------------------------------------------------
-- 1. Persistência aditiva; dados existentes são preservados sem backfill
-- ---------------------------------------------------------------------------

ALTER TABLE public.wave_responses
  ADD COLUMN consent_version TEXT,
  ADD COLUMN consent_accepted_at TIMESTAMPTZ;

ALTER TABLE public.wave_responses
  ADD CONSTRAINT wave_responses_consent_evidence_pair_chk CHECK (
    (consent_version IS NULL AND consent_accepted_at IS NULL)
    OR (
      consent_version IS NOT NULL
      AND consent_accepted_at IS NOT NULL
      AND consent_version = BTRIM(consent_version)
      AND CHAR_LENGTH(consent_version) BETWEEN 1 AND 20
    )
  );

COMMENT ON COLUMN public.wave_responses.consent_version IS
  'Versão do texto de consentimento aceito no fluxo anônimo por setor. NULL para legado/outros fluxos; nunca contém identidade.';

COMMENT ON COLUMN public.wave_responses.consent_accepted_at IS
  'Horário do banco em que consentimento e resposta anônima foram aceitos atomicamente. Não é timestamp fornecido pelo cliente.';

-- ---------------------------------------------------------------------------
-- 2. Assinatura antiga: compatibilidade fail-closed, sem escrita
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.submit_sector_response(
  p_token_hash TEXT,
  p_answers    JSONB
)
RETURNS TABLE(accepted BOOLEAN, reason TEXT, response_count INTEGER)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $function$
  SELECT FALSE, 'invalid_consent_version'::TEXT, 0::INTEGER;
$function$;

COMMENT ON FUNCTION public.submit_sector_response(TEXT, JSONB) IS
  'Assinatura legada fail-closed: não persiste resposta sem versão de consentimento.';

-- ---------------------------------------------------------------------------
-- 3. Nova assinatura: validação + resposta + evidência na mesma transação
-- ---------------------------------------------------------------------------

CREATE FUNCTION public.submit_sector_response(
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

-- A assinatura nova deve ter o mesmo owner da função canônica anterior.
DO $owner$
DECLARE
  v_owner TEXT := current_setting('fibt.consent_function_owner', true);
BEGIN
  IF v_owner IS NULL OR v_owner = '' THEN
    RAISE EXCEPTION 'FALHA: owner original não foi capturado.';
  END IF;
  EXECUTE format(
    'ALTER FUNCTION public.submit_sector_response(TEXT, JSONB, TEXT) OWNER TO %I',
    v_owner
  );
END
$owner$;

REVOKE ALL ON FUNCTION public.submit_sector_response(TEXT, JSONB) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_sector_response(TEXT, JSONB) TO anon, service_role;

REVOKE ALL ON FUNCTION public.submit_sector_response(TEXT, JSONB, TEXT) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_sector_response(TEXT, JSONB, TEXT) TO anon, service_role;

COMMENT ON FUNCTION public.submit_sector_response(TEXT, JSONB, TEXT) IS
  'Submete resposta anônima por sector-link e persiste versão/horário do consentimento sem vínculo com convite ou identidade.';

-- ---------------------------------------------------------------------------
-- 4. Postflight fail-closed do contrato de privacidade e execução
-- ---------------------------------------------------------------------------

DO $postflight$
DECLARE
  v_old_oid    OID := to_regprocedure('public.submit_sector_response(text,jsonb)');
  v_new_oid    OID := to_regprocedure('public.submit_sector_response(text,jsonb,text)');
  v_old_def    TEXT;
  v_new_def    TEXT;
  v_new_owner  TEXT;
  v_old_owner  TEXT := current_setting('fibt.consent_function_owner', true);
BEGIN
  IF v_old_oid IS NULL OR v_new_oid IS NULL THEN
    RAISE EXCEPTION 'FALHA: uma das assinaturas de submit_sector_response está ausente.';
  END IF;

  SELECT pg_get_functiondef(v_old_oid) INTO v_old_def;
  SELECT pg_get_functiondef(v_new_oid), pg_get_userbyid(proowner)
    INTO v_new_def, v_new_owner
    FROM pg_proc WHERE oid = v_new_oid;

  IF v_old_def ~* 'INSERT\s+INTO' OR v_old_def ~* 'wave_responses' THEN
    RAISE EXCEPTION 'FALHA: assinatura sem consentimento ainda possui caminho de escrita.';
  END IF;
  IF v_new_def !~* 'consent_version' OR v_new_def !~* 'consent_accepted_at' THEN
    RAISE EXCEPTION 'FALHA: assinatura nova não persiste evidência completa.';
  END IF;
  IF v_new_def ~* '\minvite_token\M' THEN
    RAISE EXCEPTION 'FALHA: assinatura nova reintroduziu invite_token.';
  END IF;
  IF v_new_owner IS DISTINCT FROM v_old_owner THEN
    RAISE EXCEPTION 'FALHA: owner da assinatura nova diverge da função original.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
     WHERE p.oid = v_new_oid
       AND p.prosecdef
       AND p.pronargs = 3
       AND p.proargtypes[0] = 'text'::regtype::OID
       AND p.proargtypes[1] = 'jsonb'::regtype::OID
       AND p.proargtypes[2] = 'text'::regtype::OID
       AND p.proargnames[1] = 'p_token_hash'
       AND p.proargnames[2] = 'p_answers'
       AND p.proargnames[3] = 'p_consent_version'
  ) THEN
    RAISE EXCEPTION 'FALHA: assinatura, argumentos ou SECURITY DEFINER divergiram.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p, unnest(p.proconfig) AS cfg
     WHERE p.oid = v_new_oid
       AND cfg ~ 'search_path\s*=\s*"?public"?'
  ) THEN
    RAISE EXCEPTION 'FALHA: search_path da assinatura nova não está fixado em public.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'wave_responses'
       AND column_name IN ('invite_token', 'email', 'user_id', 'profile_id')
  ) THEN
    RAISE EXCEPTION 'FALHA: wave_responses contém coluna de identidade/convite proibida.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
     WHERE c.conrelid = 'public.wave_responses'::regclass
       AND c.contype = 'f'
       AND c.confrelid = 'public.wave_invites'::regclass
  ) THEN
    RAISE EXCEPTION 'FALHA: wave_responses referencia wave_invites.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.wave_responses'::regclass
       AND conname = 'wave_responses_consent_evidence_pair_chk'
       AND convalidated
  ) THEN
    RAISE EXCEPTION 'FALHA: constraint pareada de consentimento ausente/não validada.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_class
     WHERE oid = 'public.wave_responses'::regclass AND relrowsecurity
  ) THEN
    RAISE EXCEPTION 'FALHA: RLS de wave_responses não está habilitada.';
  END IF;
  IF has_table_privilege('anon', 'public.wave_responses', 'SELECT')
     OR has_table_privilege('authenticated', 'public.wave_responses', 'SELECT') THEN
    RAISE EXCEPTION 'FALHA: papel cliente possui SELECT de resposta individual.';
  END IF;
  IF has_function_privilege('authenticated', v_new_oid, 'EXECUTE')
     OR NOT has_function_privilege('anon', v_new_oid, 'EXECUTE')
     OR NOT has_function_privilege('service_role', v_new_oid, 'EXECUTE') THEN
    RAISE EXCEPTION 'FALHA: ACL da assinatura nova diverge do contrato.';
  END IF;

  RAISE NOTICE 'Wave 2.1 concluída: consentimento durável e atômico, sem identidade, convite ou exposição individual.';
END
$postflight$;

COMMIT;
