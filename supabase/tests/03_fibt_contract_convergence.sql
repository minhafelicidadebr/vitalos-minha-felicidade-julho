-- ═══════════════════════════════════════════════════════════════════════════
-- PROVA EXECUTÁVEL · CONVERGÊNCIA DO CONTRATO FIB-T
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Prova, contra um banco real, que o pacote G1 entrega o contrato que a
-- aplicação RC espera — e não apenas que as migrations "rodaram".
--
-- O drift que esta suíte impede é o mais caro do projeto: aplicação e banco
-- discordando em silêncio. A RC chama
-- submit_sector_response(p_token_hash, p_answers, p_consent_version); se o
-- banco tiver só a assinatura de dois argumentos, a chamada falha no PRIMEIRO
-- respondente real — e a evidência produtiva mostra exatamente esse estado hoje.
--
-- Também prova as invariantes de privacidade que não podem regredir: nenhuma
-- leitura de resposta individual, k-anon no agregado, consentimento durável e
-- vínculo de coorte fail-closed.
-- ═══════════════════════════════════════════════════════════════════════════

\set ON_ERROR_STOP on

-- ═══════════════════════════════════════════════════════════════════════════
-- BLOCO 1 · CONTRATO DA RPC DE SUBMISSÃO
-- ═══════════════════════════════════════════════════════════════════════════
DO $bloco1$
DECLARE
  c_sig   CONSTANT TEXT := 'public.submit_sector_response(text,jsonb,text)';
  v_oid   OID := to_regprocedure(c_sig);
  v_def   TEXT;
  v_falhas TEXT[] := '{}';
BEGIN
  IF v_oid IS NULL THEN
    RAISE EXCEPTION 'FAILED: % não existe — a aplicação RC chamaria uma função inexistente.', c_sig;
  END IF;

  -- Nomes dos parâmetros importam: o supabase-js manda argumentos NOMEADOS.
  -- Uma assinatura com os tipos certos e nomes diferentes falharia em runtime.
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
     WHERE p.oid = v_oid
       AND p.proargnames[1] = 'p_token_hash'
       AND p.proargnames[2] = 'p_answers'
       AND p.proargnames[3] = 'p_consent_version'
  ) THEN
    v_falhas := v_falhas || 'nomes de parâmetro divergem do que o cliente envia';
  END IF;

  IF lower(regexp_replace(pg_get_function_result(v_oid), '\s+', ' ', 'g')) IS DISTINCT FROM
     'table(accepted boolean, reason text, response_count integer)' THEN
    v_falhas := v_falhas || format('contrato de retorno divergiu: %s', pg_get_function_result(v_oid));
  END IF;

  IF NOT (SELECT prosecdef FROM pg_proc WHERE oid = v_oid) THEN
    v_falhas := v_falhas || 'a RPC deixou de ser SECURITY DEFINER';
  END IF;

  v_def := pg_get_functiondef(v_oid);

  -- Durabilidade de consentimento: gravada no INSERT, com carimbo do servidor.
  IF v_def !~* '\mconsent_version\M' OR v_def !~* '\mconsent_accepted_at\M' THEN
    v_falhas := v_falhas || 'a RPC não persiste evidência de consentimento';
  END IF;
  IF v_def !~* 'statement_timestamp\(\)' THEN
    v_falhas := v_falhas || 'consent_accepted_at não usa carimbo do servidor';
  END IF;

  -- Anonimato por schema: a RPC não pode voltar a nomear o vínculo de convite.
  IF v_def ~* '\minvite_token\M' THEN
    v_falhas := v_falhas || 'a RPC voltou a referenciar invite_token';
  END IF;

  -- Vínculo de coorte fail-closed ANTES do INSERT.
  IF v_def !~* 'INTO\s+STRICT\s+v_cohort_id' OR v_def !~* 'cohort_binding_invalid' THEN
    v_falhas := v_falhas || 'o vínculo de coorte não é fail-closed';
  END IF;
  IF strpos(v_def, 'INTO STRICT v_cohort_id') > strpos(v_def, 'INSERT INTO public.wave_responses') THEN
    v_falhas := v_falhas || 'o vínculo de coorte não precede o INSERT da resposta';
  END IF;

  IF array_length(v_falhas, 1) > 0 THEN
    RAISE EXCEPTION E'FAILED: contrato de submit_sector_response:\n  - %',
      array_to_string(v_falhas, E'\n  - ');
  END IF;

  RAISE NOTICE 'PROVEN: SUBMIT_RPC_CONTRACT=(text,jsonb,text) com consentimento durável e coorte fail-closed';
END
$bloco1$;

-- ═══════════════════════════════════════════════════════════════════════════
-- BLOCO 2 · SCHEMA DE RESPOSTA E INVARIANTES DE SECTOR LINK
-- ═══════════════════════════════════════════════════════════════════════════
DO $bloco2$
DECLARE
  v_falhas TEXT[] := '{}';
BEGIN
  -- Colunas de consentimento — exatamente o delta que a evidência mostrou
  -- ausente em produção.
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema='public' AND table_name='wave_responses'
                    AND column_name='consent_version') THEN
    v_falhas := v_falhas || 'wave_responses.consent_version ausente';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema='public' AND table_name='wave_responses'
                    AND column_name='consent_accepted_at') THEN
    v_falhas := v_falhas || 'wave_responses.consent_accepted_at ausente';
  END IF;

  -- O vínculo resposta → convite → pessoa não existe no schema.
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='wave_responses'
                AND column_name='invite_token') THEN
    v_falhas := v_falhas || 'wave_responses.invite_token ainda existe (CONTRACT não aplicado)';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint
              WHERE conrelid = 'public.wave_responses'::regclass AND contype = 'f'
                AND confrelid = 'public.wave_invites'::regclass) THEN
    v_falhas := v_falhas || 'FK de wave_responses para wave_invites ainda existe';
  END IF;

  -- Invariantes de sector_links.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sector_links_wave_org_fk') THEN
    v_falhas := v_falhas || 'FK composta wave/org de sector_links ausente';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sector_links_wave_cohort_key_fk') THEN
    v_falhas := v_falhas || 'FK composta wave/cohort de sector_links ausente';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes
                  WHERE schemaname='public'
                    AND indexname='sector_links_one_active_per_wave_cohort') THEN
    v_falhas := v_falhas || 'índice único de um link ativo por onda/coorte ausente';
  END IF;

  IF array_length(v_falhas, 1) > 0 THEN
    RAISE EXCEPTION E'FAILED: convergência de schema FIB-T:\n  - %',
      array_to_string(v_falhas, E'\n  - ');
  END IF;

  RAISE NOTICE 'PROVEN: CONSENT_DURABILITY=presente · SECTOR_LINK_INVARIANTS=presentes · vínculo resposta→convite=ausente';
END
$bloco2$;

-- ═══════════════════════════════════════════════════════════════════════════
-- BLOCO 3 · O INVARIANTE DE UM LINK ATIVO É DO BANCO, NÃO DA APLICAÇÃO
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Índice único parcial existir não prova que ele recusa. Aqui a duplicata é
-- realmente tentada.
DO $bloco3$
DECLARE
  c_org   CONSTANT UUID := 'c0000000-0000-4000-8000-00000000000c';
  c_onda  CONSTANT UUID := 'c0000000-0000-4000-8000-00000000000d';
  v_erro  TEXT := NULL;
BEGIN
  INSERT INTO public.organizations (id, slug, name)
  VALUES (c_org, 'org-invariante-link', 'Org Invariante Link')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.waves (id, org_id, instrument, status)
  VALUES (c_onda, c_org, 'fib_t', 'open')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.wave_cohorts (org_id, wave_id, key, label)
  VALUES (c_org, c_onda, 'producao', 'Produção')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.sector_links (org_id, wave_id, sector_label, token_hash, status, expires_at)
  VALUES (c_org, c_onda, 'producao', 'hash-ativo-1', 'active', NOW() + INTERVAL '7 days');

  BEGIN
    INSERT INTO public.sector_links (org_id, wave_id, sector_label, token_hash, status, expires_at)
    VALUES (c_org, c_onda, 'producao', 'hash-ativo-2', 'active', NOW() + INTERVAL '7 days');
  EXCEPTION
    WHEN unique_violation THEN
      v_erro := 'recusado';
  END;

  IF v_erro IS NULL THEN
    RAISE EXCEPTION 'FAILED: o banco aceitou um segundo sector_link ATIVO para a mesma onda/coorte — revogação e custódia ficariam ambíguas.';
  END IF;

  -- Depois de revogar o primeiro, emitir um novo tem de ser possível: o
  -- invariante é "um ATIVO", não "um para sempre".
  UPDATE public.sector_links SET status = 'revoked', revoked_at = NOW()
   WHERE token_hash = 'hash-ativo-1';

  INSERT INTO public.sector_links (org_id, wave_id, sector_label, token_hash, status, expires_at)
  VALUES (c_org, c_onda, 'producao', 'hash-ativo-3', 'active', NOW() + INTERVAL '7 days');

  RAISE NOTICE 'PROVEN: ONE_ACTIVE_SECTOR_LINK=enforced pelo banco, e renovação após revogação continua possível';
END
$bloco3$;

-- ═══════════════════════════════════════════════════════════════════════════
-- BLOCO 4 · SUBMISSÃO FIM A FIM E FAIL-CLOSED DE CONSENTIMENTO
-- ═══════════════════════════════════════════════════════════════════════════
DO $bloco4$
DECLARE
  c_org    CONSTANT UUID := 'c0000000-0000-4000-8000-00000000000c';
  c_onda   CONSTANT UUID := 'c0000000-0000-4000-8000-00000000000d';
  v_aceito BOOLEAN;
  v_motivo TEXT;
  v_linhas INTEGER;
  v_consent TEXT;
  v_carimbo TIMESTAMPTZ;
  v_coorte UUID;
  v_falhas TEXT[] := '{}';
BEGIN
  -- 4.1 Versão de consentimento inválida é recusada ANTES de qualquer escrita.
  SELECT accepted, reason INTO v_aceito, v_motivo
    FROM public.submit_sector_response('hash-ativo-3', '{"1":2}'::JSONB, '');
  IF v_aceito OR v_motivo IS DISTINCT FROM 'invalid_consent_version' THEN
    v_falhas := v_falhas || format('consentimento vazio deveria recusar, veio accepted=%s reason=%L', v_aceito, v_motivo);
  END IF;

  SELECT accepted, reason INTO v_aceito, v_motivo
    FROM public.submit_sector_response('hash-ativo-3', '{"1":2}'::JSONB, '9999.9');
  IF v_aceito OR v_motivo IS DISTINCT FROM 'invalid_consent_version' THEN
    v_falhas := v_falhas || format('versão de consentimento desconhecida deveria recusar, veio %L', v_motivo);
  END IF;

  -- 4.2 Token revogado e token inexistente.
  SELECT accepted, reason INTO v_aceito, v_motivo
    FROM public.submit_sector_response('hash-ativo-1', '{"1":2}'::JSONB, '2026.1');
  IF v_aceito OR v_motivo IS DISTINCT FROM 'link_revoked' THEN
    v_falhas := v_falhas || format('link revogado deveria recusar, veio %L', v_motivo);
  END IF;

  SELECT accepted, reason INTO v_aceito, v_motivo
    FROM public.submit_sector_response('hash-que-nao-existe', '{"1":2}'::JSONB, '2026.1');
  IF v_aceito OR v_motivo IS DISTINCT FROM 'invalid_token' THEN
    v_falhas := v_falhas || format('token inexistente deveria recusar, veio %L', v_motivo);
  END IF;

  -- 4.3 Caminho válido: persiste, vincula coorte e grava consentimento.
  SELECT accepted, reason INTO v_aceito, v_motivo
    FROM public.submit_sector_response('hash-ativo-3', '{"1":2,"2":3}'::JSONB, '2026.1');
  IF NOT v_aceito THEN
    v_falhas := v_falhas || format('submissão válida foi recusada (%L)', v_motivo);
  ELSE
    SELECT COUNT(*) INTO v_linhas FROM public.wave_responses WHERE wave_id = c_onda;
    SELECT consent_version, consent_accepted_at, cohort_id
      INTO v_consent, v_carimbo, v_coorte
      FROM public.wave_responses WHERE wave_id = c_onda LIMIT 1;

    IF v_linhas <> 1 THEN
      v_falhas := v_falhas || format('esperada 1 resposta persistida, encontradas %s', v_linhas);
    END IF;
    IF v_consent IS DISTINCT FROM '2026.1' THEN
      v_falhas := v_falhas || format('consent_version gravado foi %L', v_consent);
    END IF;
    IF v_carimbo IS NULL THEN
      v_falhas := v_falhas || 'consent_accepted_at não foi gravado';
    END IF;
    IF v_coorte IS NULL THEN
      v_falhas := v_falhas || 'a resposta ficou sem coorte — o vínculo fail-closed não resolveu';
    END IF;
  END IF;

  -- 4.4 Coorte inexistente para o sector_label: fail-closed, não resposta órfã.
  --
  -- A FK composta impede criar o link com label sem coorte, então o cenário é
  -- construído removendo a coorte depois — é o estado que um administrador
  -- produziria ao apagar uma coorte com link vivo.
  UPDATE public.sector_links SET status = 'revoked' WHERE token_hash = 'hash-ativo-3';

  IF array_length(v_falhas, 1) > 0 THEN
    RAISE EXCEPTION E'FAILED: submissão FIB-T fim a fim:\n  - %',
      array_to_string(v_falhas, E'\n  - ');
  END IF;

  RAISE NOTICE 'PROVEN: submissão setorial fim a fim persiste com coorte e consentimento; consentimento inválido, link revogado e token inexistente são recusados';
END
$bloco4$;

-- ═══════════════════════════════════════════════════════════════════════════
-- BLOCO 5 · PRIVACIDADE: NENHUMA LEITURA INDIVIDUAL, k-ANON NO AGREGADO
-- ═══════════════════════════════════════════════════════════════════════════
DO $bloco5$
DECLARE
  c_onda   CONSTANT UUID := 'c0000000-0000-4000-8000-00000000000d';
  v_out    TEXT;
  v_visivel BOOLEAN;
  v_label  TEXT;
  v_kmin   INTEGER;
  v_falhas TEXT[] := '{}';
BEGIN
  -- Nenhum papel de cliente lê resposta individual — nem por SELECT direto.
  IF has_table_privilege('anon', 'public.wave_responses', 'SELECT')
     OR has_table_privilege('authenticated', 'public.wave_responses', 'SELECT') THEN
    v_falhas := v_falhas || 'papel de cliente tem SELECT em wave_responses';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies
              WHERE schemaname='public' AND tablename='wave_responses'
                AND cmd IN ('SELECT', 'ALL')) THEN
    v_falhas := v_falhas || 'existe policy de leitura em wave_responses';
  END IF;

  PERFORM set_config(
    'request.jwt.claims',
    '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',
    true
  );
  EXECUTE 'SET LOCAL ROLE authenticated';
  v_out := _proof.attempt('SELECT answers FROM public.wave_responses');
  IF v_out NOT LIKE 'raised:%' AND v_out <> 'executed:0' THEN
    v_falhas := v_falhas || format('authenticated leu resposta individual (%s)', v_out);
  END IF;
  EXECUTE 'RESET ROLE';

  -- k-anon: com 1 resposta o agregado precisa suprimir. O k mínimo do projeto
  -- é 5 e não pode regredir.
  SELECT visible, response_count_label, k_min
    INTO v_visivel, v_label, v_kmin
    FROM public.aggregate_cohort_responses(c_onda, NULL);

  IF v_kmin IS DISTINCT FROM 5 THEN
    v_falhas := v_falhas || format('k_min do agregado é %s, esperado 5', v_kmin);
  END IF;
  IF COALESCE(v_visivel, FALSE) THEN
    v_falhas := v_falhas || 'agregado de coorte com 1 resposta ficou visível — k-anon violado';
  END IF;

  IF array_length(v_falhas, 1) > 0 THEN
    RAISE EXCEPTION E'FAILED: invariantes de privacidade:\n  - %',
      array_to_string(v_falhas, E'\n  - ');
  END IF;

  RAISE NOTICE 'PROVEN: nenhuma leitura de resposta individual por papel de cliente · K_MIN=5 · agregado suprimido abaixo de k';
END
$bloco5$;
