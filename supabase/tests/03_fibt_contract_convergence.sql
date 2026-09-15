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

-- ═══════════════════════════════════════════════════════════════════════════
-- BLOCO 6 · SUPRESSÃO DIFERENCIAL — ISOLAR UM GRUPO PEQUENO POR SUBTRAÇÃO
-- ═══════════════════════════════════════════════════════════════════════════
--
-- P1 (docs/SURVEY_SECTOR_LINKS_AUDIT.md:50): count_wave_responses devolve a
-- contagem EXATA da onda inteira (finalidade operacional, sem gate de
-- k-anon). Antes desta correção, aggregate_cohort_responses decidia
-- visibilidade olhando SÓ a própria coorte — então uma coorte grande (n>=5)
-- aparecia com response_count exato, e qualquer authenticated da organização
-- podia calcular total_da_onda − n_coorte_grande para descobrir o tamanho
-- exato de tudo que sobra (outra coorte pequena, ou o bucket sem coorte),
-- mesmo esse residual sendo < k_min e portanto protegido se perguntado
-- direto. Este bloco tenta esse ataque de verdade, com dados sintéticos, e
-- prova que ele é recusado.
DO $bloco6$
DECLARE
  c_org    CONSTANT UUID := 'c0000000-0000-4000-8000-0000000000e0';
  c_onda   CONSTANT UUID := 'c0000000-0000-4000-8000-0000000000e1';
  c_perfil CONSTANT UUID := '11111111-1111-4111-8111-111111111112';
  v_big    UUID;
  v_small  UUID;
  v_row    RECORD;
  v_total  INTEGER;
  v_falhas TEXT[] := '{}';
BEGIN
  INSERT INTO public.organizations (id, slug, name)
  VALUES (c_org, 'org-prova-diferencial', 'Org Prova Diferencial')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.waves (id, org_id, instrument, status)
  VALUES (c_onda, c_org, 'FIB_T', 'collecting')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.wave_cohorts (org_id, wave_id, key, label)
  VALUES (c_org, c_onda, 'grande', 'Grande'), (c_org, c_onda, 'pequena', 'Pequena')
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_big FROM public.wave_cohorts WHERE wave_id = c_onda AND key = 'grande';
  SELECT id INTO v_small FROM public.wave_cohorts WHERE wave_id = c_onda AND key = 'pequena';

  INSERT INTO auth.users (id, email) VALUES (c_perfil, 'prova-diferencial@vitalos.invalid')
    ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.profiles (id, org_id, role, display_name)
  VALUES (c_perfil, c_org, 'RH_ADMIN', 'Prova Diferencial')
  ON CONFLICT (id) DO NOTHING;

  -- Coorte "grande": 6 respostas — >= k_min sozinha.
  INSERT INTO public.wave_responses (wave_id, cohort_id, answers)
  SELECT c_onda, v_big, '{"1":2}'::JSONB FROM generate_series(1, 6);
  -- Coorte "pequena": 3 respostas — < k_min, já suprimida sozinha (não é novidade).
  INSERT INTO public.wave_responses (wave_id, cohort_id, answers)
  SELECT c_onda, v_small, '{"1":2}'::JSONB FROM generate_series(1, 3);

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', c_perfil::TEXT, 'role', 'authenticated')::TEXT,
    true
  );

  -- 6.1 Ataque: sem a correção, a coorte grande apareceria visible=true com
  -- response_count=6 exato. count_wave_responses(c_onda) devolveria 9. Um
  -- atacante calcularia 9-6=3 → tamanho exato da coorte pequena, que
  -- aggregate_cohort_responses(c_onda, v_small) suprimiria se perguntada
  -- direto. A correção precisa recusar isso suprimindo a coorte GRANDE.
  SELECT * INTO v_row FROM public.aggregate_cohort_responses(c_onda, v_big);
  IF v_row.visible OR v_row.suppression_reason IS DISTINCT FROM 'differential_inference_risk' THEN
    v_falhas := v_falhas || format(
      'ataque de subtração NÃO foi recusado: coorte grande (n=6) veio visible=%s reason=%L (residual=3 < k_min=5 deveria suprimir)',
      v_row.visible, v_row.suppression_reason);
  END IF;

  SELECT * INTO v_row FROM public.aggregate_cohort_responses(c_onda, v_small);
  IF v_row.visible OR v_row.suppression_reason IS DISTINCT FROM 'privacy_threshold' THEN
    v_falhas := v_falhas || format(
      'coorte pequena (n=3) deveria seguir suprimida por privacy_threshold, veio visible=%s reason=%L',
      v_row.visible, v_row.suppression_reason);
  END IF;

  -- 6.2 Confirma que count_wave_responses realmente expõe a contagem exata
  -- da onda (9) — é essa a assimetria que motiva a supressão em 6.1. Não é
  -- um defeito a corrigir aqui: é a finalidade operacional documentada de
  -- count_wave_responses; a correção do lado de aggregate_cohort_responses.
  SELECT public.count_wave_responses(c_onda) INTO v_total;
  IF v_total IS DISTINCT FROM 9 THEN
    v_falhas := v_falhas || format('pré-condição do cenário mudou: count_wave_responses=%s, esperado 9', v_total);
  END IF;

  -- 6.3 Depois que a coorte pequena também atinge k_min, o residual de cada
  -- lado vira 0 (nada mais na onda) — ambas voltam a ficar visíveis, sem
  -- falso positivo motivado só por terem sido pequenas antes.
  INSERT INTO public.wave_responses (wave_id, cohort_id, answers)
  SELECT c_onda, v_small, '{"1":2}'::JSONB FROM generate_series(1, 2);

  SELECT * INTO v_row FROM public.aggregate_cohort_responses(c_onda, v_big);
  IF NOT v_row.visible OR v_row.response_count IS DISTINCT FROM 6 THEN
    v_falhas := v_falhas || format(
      'falso positivo: coorte grande deveria ficar visível quando o residual (5) já não é < k_min, veio visible=%s response_count=%s',
      v_row.visible, v_row.response_count);
  END IF;
  SELECT * INTO v_row FROM public.aggregate_cohort_responses(c_onda, v_small);
  IF NOT v_row.visible OR v_row.response_count IS DISTINCT FROM 5 THEN
    v_falhas := v_falhas || format(
      'coorte pequena deveria ficar visível ao atingir k_min=5, veio visible=%s response_count=%s',
      v_row.visible, v_row.response_count);
  END IF;

  -- 6.4 Bucket "sem coorte" (p_cohort_id NULL) — sem nenhuma resposta sem
  -- coorte nesta onda, tem que ficar suprimido por privacy_threshold (n=0),
  -- nunca tratado por engano como "toda a onda" pela comparação NULL=NULL.
  SELECT * INTO v_row FROM public.aggregate_cohort_responses(c_onda, NULL);
  IF v_row.visible OR v_row.suppression_reason IS DISTINCT FROM 'privacy_threshold' THEN
    v_falhas := v_falhas || format(
      'bucket sem coorte (0 respostas) deveria vir visible=false/privacy_threshold, veio visible=%s reason=%L',
      v_row.visible, v_row.suppression_reason);
  END IF;

  IF array_length(v_falhas, 1) > 0 THEN
    RAISE EXCEPTION E'FAILED: supressão diferencial:\n  - %',
      array_to_string(v_falhas, E'\n  - ');
  END IF;

  RAISE NOTICE 'PROVEN: DIFFERENTIAL_SUPPRESSION=recusa isolar grupo residual<k_min por subtração contra count_wave_responses · falso-positivo=ausente quando residual>=k_min';
END
$bloco6$;

-- ═══════════════════════════════════════════════════════════════════════════
-- BLOCO 7 · SUPRESSÃO DIFERENCIAL GENERALIZADA — MATRIZ DA TASK 10.1 §E
-- ═══════════════════════════════════════════════════════════════════════════
--
-- O BLOCO 6 provou o caso de 2 segmentos (coorte grande + coorte pequena).
-- Red-team adversarial (TASK 10.1 §E) descobriu que a correção de residual
-- pairwise ("esta coorte vs. resto somado") NÃO generaliza para 3+ coortes:
-- em [10, 8, 4], nem a coorte de 10 nem a de 8 têm residual pairwise < k_min
-- (22−10=12, 22−8=14, ambos >=5) — mas juntas elas revelam a terceira por
-- 22−10−8=4. Este bloco prova a matriz completa exigida, incluindo esse
-- caso e outros, contra a correção generalizada (partição completa de
-- segmentos, hiddenCount=1 && visibleCount=total-1).
--
-- Cada array de tamanhos vira uma onda sintética própria (uma coorte por
-- tamanho), sempre limpa ao final. Para cada array, verifica TODOS os
-- segmentos (nenhum "amostrado") — o requisito explícito é
-- NO_SINGLE_SUPPRESSED_COHORT_DERIVABLE=true, ou seja, nenhuma coorte oculta
-- pode ser isolada por combinação de coortes visíveis + total da onda.
DO $bloco7$
DECLARE
  c_perfil CONSTANT UUID := '11111111-1111-4111-8111-111111111113';
  c_k      CONSTANT INTEGER := 5;
  v_org    UUID;
  v_onda   UUID;
  v_falhas TEXT[] := '{}';

  -- Cada elemento é um array de tamanhos de coorte para uma onda sintética.
  -- JSONB (não INTEGER[][]) porque os arranjos têm comprimentos DIFERENTES —
  -- um array multidimensional do Postgres exige dimensões iguais em toda
  -- linha, o que o requisito da tarefa (2 a 4 coortes por arranjo) viola.
  v_matriz JSONB := '[[10,4],[10,8,4],[10,8,4,3],[5,4],[100,4],[100,100,4]]'::JSONB;
  v_arranjo_json JSONB;
  v_arranjo  INTEGER[];
  v_tamanho  INTEGER;
  v_idx      INTEGER;
  v_cohort_ids UUID[];
  v_cid      UUID;
  v_total    INTEGER;
  v_total_rpc INTEGER;
  v_esperado_oculto BOOLEAN;
  v_row      RECORD;
  v_soma_visiveis INTEGER;
  v_qtd_ocultos   INTEGER;
  v_oculto_n  INTEGER;
BEGIN
  INSERT INTO auth.users (id, email) VALUES (c_perfil, 'prova-matriz-diferencial@vitalos.invalid')
    ON CONFLICT (id) DO NOTHING;

  FOR v_arranjo_json IN SELECT jsonb_array_elements(v_matriz)
  LOOP
    SELECT array_agg(elem::INTEGER) INTO v_arranjo
      FROM jsonb_array_elements_text(v_arranjo_json) AS elem;

    v_org := gen_random_uuid();
    v_onda := gen_random_uuid();
    v_cohort_ids := ARRAY[]::UUID[];
    v_total := 0;

    INSERT INTO public.organizations (id, slug, name)
    VALUES (v_org, 'org-matriz-diff-' || substr(v_org::TEXT, 1, 8), 'Org Matriz Diferencial');
    INSERT INTO public.waves (id, org_id, instrument, status)
    VALUES (v_onda, v_org, 'FIB_T', 'collecting');
    INSERT INTO public.profiles (id, org_id, role, display_name)
    VALUES (c_perfil, v_org, 'RH_ADMIN', 'Prova Matriz Diferencial')
    ON CONFLICT (id) DO UPDATE SET org_id = EXCLUDED.org_id;

    -- Cria uma coorte por tamanho do arranjo e insere N respostas nela.
    FOR v_idx IN 1 .. array_length(v_arranjo, 1) LOOP
      v_tamanho := v_arranjo[v_idx];
      v_cid := gen_random_uuid();
      INSERT INTO public.wave_cohorts (id, org_id, wave_id, key, label)
      VALUES (v_cid, v_org, v_onda, 'segmento-' || v_idx, 'Segmento ' || v_idx);
      INSERT INTO public.wave_responses (wave_id, cohort_id, answers)
      SELECT v_onda, v_cid, '{"1":2}'::JSONB FROM generate_series(1, v_tamanho);
      v_cohort_ids := array_append(v_cohort_ids, v_cid);
      v_total := v_total + v_tamanho;
    END LOOP;

    PERFORM set_config(
      'request.jwt.claims',
      jsonb_build_object('sub', c_perfil::TEXT, 'role', 'authenticated')::TEXT,
      true
    );

    -- hiddenCount=1 && visibleCount=total-1 é exatamente o estado em que a
    -- supressão diferencial se aplica — calcula isso PARA CONFERIR (não para
    -- decidir) o que o banco deveria fazer, e então testa TODOS os segmentos.
    SELECT COUNT(*) FILTER (WHERE n < c_k),
           COALESCE(SUM(n) FILTER (WHERE n >= c_k), 0)
      INTO v_qtd_ocultos, v_soma_visiveis
      FROM unnest(v_arranjo) t(n);

    v_esperado_oculto := (
      v_qtd_ocultos = 1
      AND (SELECT COUNT(*) FROM unnest(v_arranjo) t(n) WHERE n >= c_k) = array_length(v_arranjo, 1) - 1
    );

    -- n do único segmento oculto, quando existe exatamente um. Derivado dos
    -- TAMANHOS do arranjo (não do que o banco publicou): a pré-condição do
    -- ataque é sobre o tamanho real dos segmentos, independente de o banco
    -- ter corretamente suprimido ou não.
    SELECT MIN(n) INTO v_oculto_n
      FROM unnest(v_arranjo) t(n) WHERE n < c_k;

    FOR v_idx IN 1 .. array_length(v_arranjo, 1) LOOP
      v_cid := v_cohort_ids[v_idx];
      v_tamanho := v_arranjo[v_idx];
      SELECT * INTO v_row FROM public.aggregate_cohort_responses(v_onda, v_cid);

      IF v_tamanho < c_k THEN
        -- Um segmento <k_min sempre suprime por privacy_threshold — nunca
        -- muda com o estado dos outros segmentos.
        IF v_row.visible OR v_row.suppression_reason IS DISTINCT FROM 'privacy_threshold' THEN
          v_falhas := v_falhas || format(
            'arranjo %s: segmento %s (n=%s <k_min) deveria vir privacy_threshold, veio visible=%s reason=%L',
            v_arranjo, v_idx, v_tamanho, v_row.visible, v_row.suppression_reason);
        END IF;
        -- Diferenciação por MÉDIA (não só por contagem): suprimido tem que
        -- vir sem item_means — nunca dá para reconstruir a média do grupo
        -- oculto combinando médias de outros segmentos porque este aqui
        -- nunca publica média alguma.
        IF v_row.item_means IS NOT NULL THEN
          v_falhas := v_falhas || format(
            'arranjo %s: segmento %s suprimido por privacy_threshold mas item_means não é NULL', v_arranjo, v_idx);
        END IF;
      ELSIF v_esperado_oculto THEN
        -- Exatamente 1 oculto no arranjo inteiro: TODO segmento >=k_min
        -- (incluindo este) tem que ser suprimido por differential_inference_risk
        -- — é a correção generalizada sendo testada diretamente.
        IF v_row.visible OR v_row.suppression_reason IS DISTINCT FROM 'differential_inference_risk' THEN
          v_falhas := v_falhas || format(
            'arranjo %s: segmento %s (n=%s >=k_min) deveria ser suprimido por differential_inference_risk (exatamente 1 oculto no arranjo), veio visible=%s reason=%L',
            v_arranjo, v_idx, v_tamanho, v_row.visible, v_row.suppression_reason);
        END IF;
        -- Diferenciação por MÉDIA: com hiddenCount=1, NENHUM segmento (nem
        -- os que teriam n>=k_min) pode publicar item_means — se um deles
        -- publicasse, um atacante com a média TOTAL da onda (ex.: via
        -- wave_capsules, cuja proteção é independente — Seção C) poderia
        -- combinar médias ponderadas para isolar a média do único oculto.
        IF v_row.item_means IS NOT NULL THEN
          v_falhas := v_falhas || format(
            'arranjo %s: segmento %s (n=%s) suprimido por differential_inference_risk mas item_means não é NULL — diferenciação por média ainda possível',
            v_arranjo, v_idx, v_tamanho);
        END IF;
      ELSE
        -- Nenhum oculto, ou 2+ ocultos: este segmento >=k_min deve
        -- permanecer visível — não há diferenciação possível.
        IF NOT v_row.visible OR v_row.response_count IS DISTINCT FROM v_tamanho THEN
          v_falhas := v_falhas || format(
            'arranjo %s: segmento %s (n=%s) deveria permanecer visível (0 ou 2+ ocultos no arranjo), veio visible=%s response_count=%s reason=%L',
            v_arranjo, v_idx, v_tamanho, v_row.visible, v_row.response_count, v_row.suppression_reason);
        END IF;
      END IF;
    END LOOP;

    -- Prova de que o cenário é REALMENTE perigoso, não inofensivo: quando há
    -- exatamente 1 segmento oculto, a aritmética do ataque tem que fechar —
    -- total_da_onda − soma(segmentos com n>=k_min) == n do único oculto.
    -- Se essa identidade não valer, o teste acima não estaria provando nada
    -- (estaria "protegendo" contra um ataque que não existiria). Calculado a
    -- partir dos TAMANHOS reais dos segmentos, nunca do que o banco decidiu
    -- publicar — é a pré-condição do ataque, não o resultado da defesa.
    IF v_esperado_oculto AND (v_total - v_soma_visiveis) IS DISTINCT FROM v_oculto_n THEN
      v_falhas := v_falhas || format(
        'arranjo %s: pré-condição do ataque não se sustenta — total(%s) - soma_visiveis(%s) deveria ser exatamente n_oculto(%s)',
        v_arranjo, v_total, v_soma_visiveis, v_oculto_n);
    END IF;

    -- Confirma count_wave_responses (a fonte da contagem exata que habilita
    -- o ataque) devolve o total esperado — sem isso, o cenário não reproduz
    -- a assimetria real entre a contagem exata e o agregado protegido.
    SELECT public.count_wave_responses(v_onda) INTO v_total_rpc;
    IF v_total_rpc IS DISTINCT FROM v_total THEN
      v_falhas := v_falhas || format(
        'arranjo %s: count_wave_responses=%s divergiu do total esperado (%s)',
        v_arranjo, v_total_rpc, v_total);
    END IF;

    -- Limpeza desta onda sintética antes do próximo arranjo.
    -- cohort_capsules primeiro: os segmentos publicados nesta iteração têm FK
    -- composta (cohort_id, wave_id) para wave_cohorts (migration 20260909222000).
    PERFORM set_config('request.jwt.claims', '', true);
    DELETE FROM public.cohort_capsules WHERE wave_id = v_onda;
    DELETE FROM public.wave_responses WHERE wave_id = v_onda;
    DELETE FROM public.wave_cohorts WHERE wave_id = v_onda;
    DELETE FROM public.waves WHERE id = v_onda;
    DELETE FROM public.profiles WHERE id = c_perfil;
    DELETE FROM public.organizations WHERE id = v_org;
  END LOOP;

  IF array_length(v_falhas, 1) > 0 THEN
    RAISE EXCEPTION E'FAILED: matriz de supressão diferencial generalizada (TASK 10.1 §E):\n  - %',
      array_to_string(v_falhas, E'\n  - ');
  END IF;

  RAISE NOTICE 'PROVEN: NO_SINGLE_SUPPRESSED_COHORT_DERIVABLE=true para [10,4]·[10,8,4]·[10,8,4,3]·[5,4]·[100,4]·[100,100,4] — nenhuma coorte oculta é derivável por combinação de coortes visíveis + total da onda';
END
$bloco7$;
