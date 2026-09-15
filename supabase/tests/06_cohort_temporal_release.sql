-- ═══════════════════════════════════════════════════════════════════════════
-- PROVA EXECUTÁVEL · RELEASE EM LOTE / DIFERENCIAÇÃO TEMPORAL (TASK 10.1 D1)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Fecha o vetor que 20260909221000 NÃO cobria: duas chamadas sucessivas à
-- MESMA coorte enquanto ela cruza n -> n+1 devolviam duas médias exatas ao
-- vivo, e media_{n+1}*(n+1) - media_n*n é a resposta exata do respondente
-- novo. k_min por snapshot é insuficiente — o vazamento está na DIFERENÇA.
--
-- Aqui os ataques são TENTADOS contra o banco real, como os papéis reais
-- (anon, authenticated membro, RH_ADMIN, service_role), nunca inferidos de
-- ACL nem de leitura de código.
-- ═══════════════════════════════════════════════════════════════════════════

\set ON_ERROR_STOP on

-- Fixtures isoladas deste arquivo (prefixo a0…): duas organizações para a
-- prova de tenant, uma onda cada, coortes próprias.
DO $fixtures$
DECLARE
  c_org_a  CONSTANT UUID := 'a0000000-0000-4000-8000-0000000000a1';
  c_org_b  CONSTANT UUID := 'a0000000-0000-4000-8000-0000000000b1';
  c_onda_a CONSTANT UUID := 'a0000000-0000-4000-8000-0000000000a2';
  c_onda_b CONSTANT UUID := 'a0000000-0000-4000-8000-0000000000b2';
  c_coh_a  CONSTANT UUID := 'a0000000-0000-4000-8000-0000000000a3';
  c_coh_b  CONSTANT UUID := 'a0000000-0000-4000-8000-0000000000b3';
  c_admin  CONSTANT UUID := 'a0000000-0000-4000-8000-0000000000a4';
  c_membro CONSTANT UUID := 'a0000000-0000-4000-8000-0000000000a5';
BEGIN
  INSERT INTO public.organizations (id, slug, name) VALUES
    (c_org_a, 'org-release-lote-a', 'Org Release Lote A'),
    (c_org_b, 'org-release-lote-b', 'Org Release Lote B')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.waves (id, org_id, instrument, label, status) VALUES
    (c_onda_a, c_org_a, 'FIB_T', 'Onda Release Lote A', 'collecting'),
    (c_onda_b, c_org_b, 'FIB_T', 'Onda Release Lote B', 'collecting')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.wave_cohorts (id, org_id, wave_id, key, label) VALUES
    (c_coh_a, c_org_a, c_onda_a, 'alfa', 'Alfa'),
    (c_coh_b, c_org_b, c_onda_b, 'beta', 'Beta')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.users (id, email) VALUES
    (c_admin, 'admin-release-lote@exemplo.invalid'),
    (c_membro, 'membro-release-lote@exemplo.invalid')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, org_id, role, display_name) VALUES
    (c_admin, c_org_a, 'RH_ADMIN', 'Admin Release Lote'),
    (c_membro, c_org_a, 'SST', 'Membro Release Lote')
  ON CONFLICT (id) DO NOTHING;
END
$fixtures$;

-- ═══════════════════════════════════════════════════════════════════════════
-- BLOCO 1 · PRIMEIRO RELEASE E LOTE DE +1..+4 vs +5
-- ═══════════════════════════════════════════════════════════════════════════
DO $bloco1$
DECLARE
  c_onda  CONSTANT UUID := 'a0000000-0000-4000-8000-0000000000a2';
  c_coh   CONSTANT UUID := 'a0000000-0000-4000-8000-0000000000a3';
  c_admin CONSTANT UUID := 'a0000000-0000-4000-8000-0000000000a4';
  v_row     RECORD;
  v_base    JSONB;
  v_base_n  INTEGER;
  v_delta   INTEGER;
  v_falhas  TEXT[] := '{}';
BEGIN
  PERFORM set_config('request.jwt.claims',
    jsonb_build_object('sub', c_admin::TEXT, 'role', 'authenticated')::TEXT, true);

  -- 1.1 n=4 (<k_min): primeiro release INDISPONÍVEL.
  INSERT INTO public.wave_responses (wave_id, cohort_id, answers)
  SELECT c_onda, c_coh, '{"1":2}'::JSONB FROM generate_series(1, 4);

  SELECT * INTO v_row FROM public.aggregate_cohort_responses(c_onda, c_coh);
  IF v_row.visible OR v_row.response_count IS NOT NULL OR v_row.item_means IS NOT NULL THEN
    v_falhas := v_falhas || format('n=4 deveria ser indisponível, veio visible=%s count=%s means=%s',
      v_row.visible, v_row.response_count, v_row.item_means);
  END IF;
  IF EXISTS (SELECT 1 FROM public.cohort_capsules WHERE wave_id = c_onda AND cohort_id = c_coh) THEN
    v_falhas := v_falhas || 'n=4 criou snapshot publicado (não deveria)';
  END IF;

  -- 1.2 n=5 (=k_min): primeiro release PERMITIDO.
  INSERT INTO public.wave_responses (wave_id, cohort_id, answers)
  VALUES (c_onda, c_coh, '{"1":4}'::JSONB);

  SELECT * INTO v_row FROM public.aggregate_cohort_responses(c_onda, c_coh);
  IF NOT v_row.visible OR v_row.response_count IS DISTINCT FROM 5 THEN
    v_falhas := v_falhas || format('n=5 deveria publicar count=5, veio visible=%s count=%s',
      v_row.visible, v_row.response_count);
  END IF;
  IF v_row.response_count_label IS DISTINCT FROM '5' THEN
    v_falhas := v_falhas || format('response_count_label deveria ser "5", veio %L', v_row.response_count_label);
  END IF;
  v_base := v_row.item_means;
  v_base_n := v_row.response_count;
  IF v_base IS NULL THEN
    v_falhas := v_falhas || 'primeiro release não trouxe item_means';
  END IF;

  -- 1.3 +1, +2, +3, +4: o snapshot OBSERVÁVEL não muda em nada.
  FOR v_delta IN 1 .. 4 LOOP
    -- Valor deliberadamente extremo: se houvesse recálculo ao vivo, a média
    -- mudaria de forma óbvia.
    INSERT INTO public.wave_responses (wave_id, cohort_id, answers)
    VALUES (c_onda, c_coh, '{"1":99}'::JSONB);

    SELECT * INTO v_row FROM public.aggregate_cohort_responses(c_onda, c_coh);

    IF v_row.response_count IS DISTINCT FROM v_base_n THEN
      v_falhas := v_falhas || format('+%s mudou a contagem publicada de %s para %s (vazaria o delta)',
        v_delta, v_base_n, v_row.response_count);
    END IF;
    IF v_row.response_count_label IS DISTINCT FROM v_base_n::TEXT THEN
      v_falhas := v_falhas || format('+%s mudou response_count_label (vazaria o delta)', v_delta);
    END IF;
    IF v_row.item_means IS DISTINCT FROM v_base THEN
      v_falhas := v_falhas || format('+%s mudou item_means publicado — DIFERENCIAÇÃO TEMPORAL ABERTA', v_delta);
    END IF;
  END LOOP;

  -- 1.4 +5 (total de 5 contribuintes novos): novo release atômico.
  INSERT INTO public.wave_responses (wave_id, cohort_id, answers)
  VALUES (c_onda, c_coh, '{"1":99}'::JSONB);

  SELECT * INTO v_row FROM public.aggregate_cohort_responses(c_onda, c_coh);
  IF v_row.response_count IS DISTINCT FROM 10 THEN
    v_falhas := v_falhas || format('+5 deveria publicar count=10, veio %s', v_row.response_count);
  END IF;
  IF v_row.item_means IS NOT DISTINCT FROM v_base THEN
    v_falhas := v_falhas || 'com 5 contribuintes novos o release deveria avançar, mas item_means ficou igual';
  END IF;
  -- Atomicidade: contagem e médias vêm da MESMA linha publicada.
  IF NOT EXISTS (
    SELECT 1 FROM public.cohort_capsules
     WHERE wave_id = c_onda AND cohort_id = c_coh
       AND published_response_count = 10
       AND item_means = v_row.item_means
  ) THEN
    v_falhas := v_falhas || 'contagem e item_means retornados não vêm do mesmo snapshot persistido';
  END IF;

  -- 1.5 Chamadas repetidas não expõem estado não publicado.
  INSERT INTO public.wave_responses (wave_id, cohort_id, answers)
  VALUES (c_onda, c_coh, '{"1":1}'::JSONB);
  DECLARE
    v_r1 RECORD; v_r2 RECORD; v_r3 RECORD;
  BEGIN
    SELECT * INTO v_r1 FROM public.aggregate_cohort_responses(c_onda, c_coh);
    SELECT * INTO v_r2 FROM public.aggregate_cohort_responses(c_onda, c_coh);
    SELECT * INTO v_r3 FROM public.aggregate_cohort_responses(c_onda, c_coh);
    IF v_r1.response_count IS DISTINCT FROM 10
       OR v_r2.response_count IS DISTINCT FROM 10
       OR v_r3.response_count IS DISTINCT FROM 10
       OR v_r1.item_means IS DISTINCT FROM v_r2.item_means
       OR v_r2.item_means IS DISTINCT FROM v_r3.item_means THEN
      v_falhas := v_falhas || 'chamadas repetidas divergiram ou expuseram estado ao vivo';
    END IF;
  END;

  PERFORM set_config('request.jwt.claims', '', true);

  IF array_length(v_falhas, 1) > 0 THEN
    RAISE EXCEPTION E'FAILED: release em lote (primeiro release e +1..+5):\n  - %',
      array_to_string(v_falhas, E'\n  - ');
  END IF;

  RAISE NOTICE 'PROVEN: FIRST_RELEASE_BELOW_K=UNAVAILABLE · FIRST_RELEASE_AT_K=ALLOWED · DELTA_+1..+4=NO_OBSERVABLE_CHANGE · DELTA_+5=ATOMIC_RELEASE · REPEATED_CALLS=NO_LIVE_STATE';
END
$bloco1$;

-- ═══════════════════════════════════════════════════════════════════════════
-- BLOCO 2 · PROVA A — MUTAÇÃO DE RESPOSTA NÃO PRODUZ DELTA < K_MIN
-- ═══════════════════════════════════════════════════════════════════════════
--
-- service_role pode apagar/alterar wave_responses (limpeza operacional). Uma
-- regra de CONTAGEM (live - publicado) é burlável nesse cenário; a marca
-- d'água por CONJUNTO não é. Aqui as mutações são executadas de verdade.
DO $bloco2$
DECLARE
  c_onda  CONSTANT UUID := 'a0000000-0000-4000-8000-0000000000a2';
  c_coh   CONSTANT UUID := 'a0000000-0000-4000-8000-0000000000a3';
  c_admin CONSTANT UUID := 'a0000000-0000-4000-8000-0000000000a4';
  v_row    RECORD;
  v_antes_n INTEGER;
  v_antes_m JSONB;
  v_ids    UUID[];
  v_falhas TEXT[] := '{}';
BEGIN
  PERFORM set_config('request.jwt.claims',
    jsonb_build_object('sub', c_admin::TEXT, 'role', 'authenticated')::TEXT, true);
  SELECT * INTO v_row FROM public.aggregate_cohort_responses(c_onda, c_coh);
  v_antes_n := v_row.response_count;
  v_antes_m := v_row.item_means;

  -- 2.1 UPDATE de answers nas MESMAS respostas já publicadas: zero
  -- contribuintes novos -> nada pode mudar no observável.
  SELECT published_response_ids INTO v_ids
    FROM public.cohort_capsules WHERE wave_id = c_onda AND cohort_id = c_coh;
  UPDATE public.wave_responses SET answers = '{"1":42}'::JSONB
   WHERE id = ANY (v_ids);

  SELECT * INTO v_row FROM public.aggregate_cohort_responses(c_onda, c_coh);
  IF v_row.response_count IS DISTINCT FROM v_antes_n OR v_row.item_means IS DISTINCT FROM v_antes_m THEN
    v_falhas := v_falhas || 'UPDATE em respostas já publicadas mudou o observável sem contribuintes novos';
  END IF;

  -- 2.2 DELETE 2 + INSERT 2: apenas 2 contribuintes novos -> sem novo release.
  DELETE FROM public.wave_responses
   WHERE id IN (SELECT unnest(v_ids) LIMIT 2);
  INSERT INTO public.wave_responses (wave_id, cohort_id, answers)
  SELECT c_onda, c_coh, '{"1":7}'::JSONB FROM generate_series(1, 2);

  SELECT * INTO v_row FROM public.aggregate_cohort_responses(c_onda, c_coh);
  IF v_row.response_count IS DISTINCT FROM v_antes_n OR v_row.item_means IS DISTINCT FROM v_antes_m THEN
    v_falhas := v_falhas || format(
      'DELETE 2 + INSERT 2 (2 contribuintes novos) mudou o observável: count %s->%s',
      v_antes_n, v_row.response_count);
  END IF;

  -- 2.3 +5 contribuintes genuinamente novos: release avança (comportamento
  -- correto — o gate é sobre contribuintes NOVOS, não sobre contagem).
  INSERT INTO public.wave_responses (wave_id, cohort_id, answers)
  SELECT c_onda, c_coh, '{"1":8}'::JSONB FROM generate_series(1, 5);

  SELECT * INTO v_row FROM public.aggregate_cohort_responses(c_onda, c_coh);
  IF v_row.item_means IS NOT DISTINCT FROM v_antes_m THEN
    v_falhas := v_falhas || '5 contribuintes novos deveriam produzir novo release';
  END IF;

  PERFORM set_config('request.jwt.claims', '', true);

  IF array_length(v_falhas, 1) > 0 THEN
    RAISE EXCEPTION E'FAILED: PROVA A (mutação de resposta):\n  - %',
      array_to_string(v_falhas, E'\n  - ');
  END IF;

  RAISE NOTICE 'PROVEN: RESPONSE_MUTATION_CANNOT_YIELD_DELTA_LT_K=true (UPDATE in-place e DELETE+INSERT parcial não movem o observável; marca d''água por conjunto)';
END
$bloco2$;

-- ═══════════════════════════════════════════════════════════════════════════
-- BLOCO 3 · PROVA B — TODO item_mean LIBERADO TEM >= K_MIN CONTRIBUINTES
-- ═══════════════════════════════════════════════════════════════════════════
--
-- MISSING_AS_ZERO=false e o banco NÃO exige as 32 respostas (zero CHECK sobre
-- answers; a completude só existe em TypeScript). Então um item pode ter menos
-- contribuintes que a coorte. Nenhum item nessas condições pode ser liberado.
DO $bloco3$
DECLARE
  c_org   CONSTANT UUID := 'a0000000-0000-4000-8000-0000000000a1';
  c_onda  CONSTANT UUID := 'a0000000-0000-4000-8000-0000000000a6';
  c_coh   CONSTANT UUID := 'a0000000-0000-4000-8000-0000000000a7';
  c_admin CONSTANT UUID := 'a0000000-0000-4000-8000-0000000000a4';
  v_row    RECORD;
  v_falhas TEXT[] := '{}';
BEGIN
  INSERT INTO public.waves (id, org_id, instrument, label, status)
  VALUES (c_onda, c_org, 'FIB_T', 'Onda Item Level', 'collecting') ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.wave_cohorts (id, org_id, wave_id, key, label)
  VALUES (c_coh, c_org, c_onda, 'itens', 'Itens') ON CONFLICT (id) DO NOTHING;

  -- 6 respostas com o item "1"; apenas 2 delas trazem também o item "99".
  INSERT INTO public.wave_responses (wave_id, cohort_id, answers)
  SELECT c_onda, c_coh, '{"1":3}'::JSONB FROM generate_series(1, 4);
  INSERT INTO public.wave_responses (wave_id, cohort_id, answers)
  SELECT c_onda, c_coh, '{"1":3,"99":5}'::JSONB FROM generate_series(1, 2);

  PERFORM set_config('request.jwt.claims',
    jsonb_build_object('sub', c_admin::TEXT, 'role', 'authenticated')::TEXT, true);

  SELECT * INTO v_row FROM public.aggregate_cohort_responses(c_onda, c_coh);

  IF NOT v_row.visible THEN
    v_falhas := v_falhas || format('coorte com n=6 deveria publicar, veio reason=%L', v_row.suppression_reason);
  ELSE
    IF NOT (v_row.item_means ? '1') THEN
      v_falhas := v_falhas || 'item "1" (6 contribuintes) deveria ter sido liberado';
    END IF;
    IF v_row.item_means ? '99' THEN
      v_falhas := v_falhas || 'item "99" (apenas 2 contribuintes) FOI liberado — média de menos de k_min pessoas';
    END IF;
  END IF;

  PERFORM set_config('request.jwt.claims', '', true);

  IF array_length(v_falhas, 1) > 0 THEN
    RAISE EXCEPTION E'FAILED: PROVA B (contribuintes por item):\n  - %',
      array_to_string(v_falhas, E'\n  - ');
  END IF;

  RAISE NOTICE 'PROVEN: EVERY_RELEASED_ITEM_MEAN_HAS_K_MIN_CONTRIBUTORS=true (item com 2 contribuintes suprimido; item com 6 liberado; MISSING_AS_ZERO permanece false)';
END
$bloco3$;

-- ═══════════════════════════════════════════════════════════════════════════
-- BLOCO 4 · AUTORIZAÇÃO, TENANT, TABELA FECHADA, service_role
-- ═══════════════════════════════════════════════════════════════════════════
DO $bloco4$
DECLARE
  c_onda_a CONSTANT UUID := 'a0000000-0000-4000-8000-0000000000a2';
  c_coh_a  CONSTANT UUID := 'a0000000-0000-4000-8000-0000000000a3';
  c_admin  CONSTANT UUID := 'a0000000-0000-4000-8000-0000000000a4';
  c_membro CONSTANT UUID := 'a0000000-0000-4000-8000-0000000000a5';
  c_onda_b CONSTANT UUID := 'a0000000-0000-4000-8000-0000000000b2';
  c_coh_b  CONSTANT UUID := 'a0000000-0000-4000-8000-0000000000b3';
  v_row    RECORD;
  v_out    TEXT;
  v_pub_n  INTEGER;
  v_falhas TEXT[] := '{}';
BEGIN
  SELECT published_response_count INTO v_pub_n
    FROM public.cohort_capsules WHERE wave_id = c_onda_a AND cohort_id = c_coh_a;

  -- 4.1 anon não executa a RPC.
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
  EXECUTE 'SET LOCAL ROLE anon';
  v_out := _proof.attempt(format(
    'SELECT * FROM public.aggregate_cohort_responses(%L, %L)', c_onda_a, c_coh_a));
  IF v_out <> 'raised:42501' THEN
    v_falhas := v_falhas || format('anon deveria receber 42501 na RPC, veio %s', v_out);
  END IF;
  -- 4.2 anon não lê a tabela de persistência.
  v_out := _proof.attempt('SELECT * FROM public.cohort_capsules');
  IF NOT _proof.blocked(v_out) THEN
    v_falhas := v_falhas || format('anon leu cohort_capsules (%s)', v_out);
  END IF;
  EXECUTE 'RESET ROLE';

  -- 4.3 authenticated (membro comum e RH_ADMIN) não lê a tabela direto —
  -- se lesse, combinaria contagens publicadas de várias coortes fora do gate.
  FOREACH v_out IN ARRAY ARRAY[c_membro::TEXT, c_admin::TEXT] LOOP
    PERFORM set_config('request.jwt.claims',
      jsonb_build_object('sub', v_out, 'role', 'authenticated')::TEXT, true);
    EXECUTE 'SET LOCAL ROLE authenticated';
    DECLARE v_t TEXT;
    BEGIN
      v_t := _proof.attempt('SELECT * FROM public.cohort_capsules');
      IF NOT _proof.blocked(v_t) THEN
        v_falhas := v_falhas || format('authenticated %s leu cohort_capsules (%s)', v_out, v_t);
      END IF;
      v_t := _proof.attempt(format(
        'UPDATE public.cohort_capsules SET published_response_count = 1 WHERE wave_id = %L', c_onda_a));
      IF NOT _proof.blocked(v_t) THEN
        v_falhas := v_falhas || format('authenticated %s escreveu em cohort_capsules (%s)', v_out, v_t);
      END IF;
    END;
    EXECUTE 'RESET ROLE';
  END LOOP;

  -- 4.4 RH_ADMIN não contorna o lote: mesmo com poder administrativo, o que
  -- ele obtém é o snapshot publicado, não o estado ao vivo.
  INSERT INTO public.wave_responses (wave_id, cohort_id, answers)
  VALUES (c_onda_a, c_coh_a, '{"1":77}'::JSONB);
  PERFORM set_config('request.jwt.claims',
    jsonb_build_object('sub', c_admin::TEXT, 'role', 'authenticated')::TEXT, true);
  SELECT * INTO v_row FROM public.aggregate_cohort_responses(c_onda_a, c_coh_a);
  IF v_row.response_count IS DISTINCT FROM v_pub_n THEN
    v_falhas := v_falhas || format('RH_ADMIN contornou o lote: count publicado %s -> %s', v_pub_n, v_row.response_count);
  END IF;

  -- 4.5 Membro comum da org também recebe apenas o publicado.
  PERFORM set_config('request.jwt.claims',
    jsonb_build_object('sub', c_membro::TEXT, 'role', 'authenticated')::TEXT, true);
  SELECT * INTO v_row FROM public.aggregate_cohort_responses(c_onda_a, c_coh_a);
  IF v_row.response_count IS DISTINCT FROM v_pub_n THEN
    v_falhas := v_falhas || 'membro comum contornou o lote';
  END IF;

  -- 4.6 Cross-tenant: admin da org A não vê a coorte da org B.
  SELECT * INTO v_row FROM public.aggregate_cohort_responses(c_onda_b, c_coh_b);
  IF v_row.visible OR v_row.suppression_reason IS DISTINCT FROM 'not_authorized' THEN
    v_falhas := v_falhas || format('cross-tenant não bloqueado: visible=%s reason=%L',
      v_row.visible, v_row.suppression_reason);
  END IF;

  -- 4.7 service_role puro: comportamento EXPLÍCITO. Sem identidade
  -- organizacional (auth.uid() NULL) a RPC devolve not_authorized — o caminho
  -- de service role da aplicação NÃO usa esta função (capsule-aggregator lê
  -- wave_responses direto), então isso não é indisponibilidade.
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
  SELECT * INTO v_row FROM public.aggregate_cohort_responses(c_onda_a, c_coh_a);
  IF v_row.visible OR v_row.suppression_reason IS DISTINCT FROM 'not_authorized' THEN
    v_falhas := v_falhas || format('service_role puro deveria receber not_authorized, veio visible=%s reason=%L',
      v_row.visible, v_row.suppression_reason);
  END IF;

  PERFORM set_config('request.jwt.claims', '', true);

  IF array_length(v_falhas, 1) > 0 THEN
    RAISE EXCEPTION E'FAILED: autorização/tenant/persistência:\n  - %',
      array_to_string(v_falhas, E'\n  - ');
  END IF;

  RAISE NOTICE 'PROVEN: ANON_RPC=DENIED · PERSISTENCE_TABLE_CLIENT_ACCESS=DENIED(read+write) · RH_ADMIN_BYPASS=BLOCKED · MEMBER_BYPASS=BLOCKED · CROSS_TENANT=BLOCKED · SERVICE_ROLE=EXPLICIT(not_authorized)';
END
$bloco4$;

-- ═══════════════════════════════════════════════════════════════════════════
-- BLOCO 5 · CONCORRÊNCIA — SEM RELEASE PARCIAL NEM DUPLICADO
-- ═══════════════════════════════════════════════════════════════════════════
DO $bloco5$
DECLARE
  c_onda  CONSTANT UUID := 'a0000000-0000-4000-8000-0000000000a2';
  c_coh   CONSTANT UUID := 'a0000000-0000-4000-8000-0000000000a3';
  c_admin CONSTANT UUID := 'a0000000-0000-4000-8000-0000000000a4';
  v_linhas INTEGER;
  v_out    TEXT;
  v_falhas TEXT[] := '{}';
BEGIN
  PERFORM set_config('request.jwt.claims',
    jsonb_build_object('sub', c_admin::TEXT, 'role', 'authenticated')::TEXT, true);

  -- Invocações repetidas jamais criam um segundo snapshot para o segmento.
  PERFORM public.aggregate_cohort_responses(c_onda, c_coh);
  PERFORM public.aggregate_cohort_responses(c_onda, c_coh);
  PERFORM public.aggregate_cohort_responses(c_onda, c_coh);

  SELECT COUNT(*) INTO v_linhas FROM public.cohort_capsules
   WHERE wave_id = c_onda AND cohort_id = c_coh;
  IF v_linhas <> 1 THEN
    v_falhas := v_falhas || format('esperado exatamente 1 snapshot por segmento, encontrados %s', v_linhas);
  END IF;

  -- O índice único é a rede de segurança da corrida: uma segunda linha para o
  -- mesmo segmento tem de ser RECUSADA pelo banco, não apenas evitada pela
  -- lógica. Tentado de verdade.
  v_out := _proof.attempt(format(
    'INSERT INTO public.cohort_capsules (org_id, wave_id, cohort_id, published_response_count, published_response_ids, item_means) '
    || 'SELECT org_id, wave_id, cohort_id, published_response_count, published_response_ids, item_means '
    || 'FROM public.cohort_capsules WHERE wave_id = %L AND cohort_id = %L', c_onda, c_coh));
  IF v_out <> 'raised:23505' THEN
    v_falhas := v_falhas || format('duplicata de snapshot deveria violar unicidade (23505), veio %s', v_out);
  END IF;

  -- Mesma prova para o bucket sem coorte (índice parcial próprio).
  INSERT INTO public.cohort_capsules
    (org_id, wave_id, cohort_id, published_response_count, published_response_ids, item_means)
  VALUES ((SELECT org_id FROM public.waves WHERE id = c_onda), c_onda, NULL, 5, '{}'::UUID[], '{}'::JSONB);
  v_out := _proof.attempt(format(
    'INSERT INTO public.cohort_capsules (org_id, wave_id, cohort_id, published_response_count, published_response_ids, item_means) '
    || 'VALUES ((SELECT org_id FROM public.waves WHERE id = %L), %L, NULL, 6, ''{}''::UUID[], ''{}''::JSONB)',
    c_onda, c_onda));
  IF v_out <> 'raised:23505' THEN
    v_falhas := v_falhas || format('duplicata do bucket sem coorte deveria violar unicidade, veio %s', v_out);
  END IF;
  DELETE FROM public.cohort_capsules WHERE wave_id = c_onda AND cohort_id IS NULL;

  PERFORM set_config('request.jwt.claims', '', true);

  IF array_length(v_falhas, 1) > 0 THEN
    RAISE EXCEPTION E'FAILED: concorrência de publicação:\n  - %',
      array_to_string(v_falhas, E'\n  - ');
  END IF;

  RAISE NOTICE 'PROVEN: CONCURRENT_PUBLICATION_SAFE=true (lock consultivo por segmento + índices únicos parciais recusam duplicata; invocações repetidas não criam release parcial)';
END
$bloco5$;

-- ═══════════════════════════════════════════════════════════════════════════
-- BLOCO 6 · PROVA C — COMPOSIÇÃO ENTRE SNAPSHOTS OBSERVÁVEIS
-- ═══════════════════════════════════════════════════════════════════════════
--
-- O atacante observa simultaneamente: contagem exata AO VIVO da onda
-- (count_wave_responses), contagem exata AO VIVO da coorte
-- (count_cohort_participation, para RH_ADMIN/DIRETOR), o snapshot publicado
-- de cada coorte e o agregado de nível ONDA (wave_capsules). Nenhuma
-- combinação pode isolar grupo < k_min.
DO $bloco6$
DECLARE
  c_org   CONSTANT UUID := 'a0000000-0000-4000-8000-0000000000a1';
  c_onda  CONSTANT UUID := 'a0000000-0000-4000-8000-0000000000a8';
  c_c1    CONSTANT UUID := 'a0000000-0000-4000-8000-0000000000a9';
  c_c2    CONSTANT UUID := 'a0000000-0000-4000-8000-0000000000aa';
  c_admin CONSTANT UUID := 'a0000000-0000-4000-8000-0000000000a4';
  v_r1_antes RECORD; v_r1_depois RECORD;
  v_r2_antes RECORD; v_r2_depois RECORD;
  v_live_antes INTEGER; v_live_depois INTEGER;
  v_coorte_live_antes INTEGER; v_coorte_live_depois INTEGER;
  v_falhas TEXT[] := '{}';
BEGIN
  INSERT INTO public.waves (id, org_id, instrument, label, status)
  VALUES (c_onda, c_org, 'FIB_T', 'Onda Composicao', 'collecting') ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.wave_cohorts (id, org_id, wave_id, key, label) VALUES
    (c_c1, c_org, c_onda, 'c1', 'C1'), (c_c2, c_org, c_onda, 'c2', 'C2')
  ON CONFLICT (id) DO NOTHING;

  -- Duas coortes de 6 (nenhuma oculta -> §E não suprime; ambas publicam).
  INSERT INTO public.wave_responses (wave_id, cohort_id, answers)
  SELECT c_onda, c_c1, '{"1":2}'::JSONB FROM generate_series(1, 6);
  INSERT INTO public.wave_responses (wave_id, cohort_id, answers)
  SELECT c_onda, c_c2, '{"1":4}'::JSONB FROM generate_series(1, 6);

  PERFORM set_config('request.jwt.claims',
    jsonb_build_object('sub', c_admin::TEXT, 'role', 'authenticated')::TEXT, true);

  SELECT * INTO v_r1_antes FROM public.aggregate_cohort_responses(c_onda, c_c1);
  SELECT * INTO v_r2_antes FROM public.aggregate_cohort_responses(c_onda, c_c2);
  SELECT public.count_wave_responses(c_onda) INTO v_live_antes;
  SELECT public.count_cohort_participation(c_onda, c_c1) INTO v_coorte_live_antes;

  IF NOT v_r1_antes.visible OR NOT v_r2_antes.visible THEN
    v_falhas := v_falhas || 'pré-condição: ambas as coortes de n=6 deveriam publicar';
  END IF;

  -- UM respondente novo entra na coorte 1.
  INSERT INTO public.wave_responses (wave_id, cohort_id, answers)
  VALUES (c_onda, c_c1, '{"1":99}'::JSONB);

  SELECT * INTO v_r1_depois FROM public.aggregate_cohort_responses(c_onda, c_c1);
  SELECT * INTO v_r2_depois FROM public.aggregate_cohort_responses(c_onda, c_c2);
  SELECT public.count_wave_responses(c_onda) INTO v_live_depois;
  SELECT public.count_cohort_participation(c_onda, c_c1) INTO v_coorte_live_depois;

  -- O agregado observável das DUAS coortes tem de permanecer idêntico: é isso
  -- que impede o atacante de isolar o respondente novo por qualquer
  -- combinação (coorte1 antes/depois, coorte2, total da onda).
  IF v_r1_depois.response_count IS DISTINCT FROM v_r1_antes.response_count
     OR v_r1_depois.item_means IS DISTINCT FROM v_r1_antes.item_means THEN
    v_falhas := v_falhas || 'o snapshot da coorte 1 mudou com 1 respondente novo — composição vazaria';
  END IF;
  IF v_r2_depois.response_count IS DISTINCT FROM v_r2_antes.response_count
     OR v_r2_depois.item_means IS DISTINCT FROM v_r2_antes.item_means THEN
    v_falhas := v_falhas || 'o snapshot da coorte 2 mudou sem contribuintes novos';
  END IF;

  -- As contagens AO VIVO mudam (são de finalidade operacional, sem gate de
  -- k-anon por desenho documentado). Isso é aceitável PORQUE nenhuma média
  -- observável se move: contagem sem média não revela resposta de ninguém.
  IF v_live_depois IS NOT DISTINCT FROM v_live_antes THEN
    v_falhas := v_falhas || 'pré-condição: count_wave_responses deveria refletir a nova resposta ao vivo';
  END IF;
  IF v_coorte_live_depois IS NOT DISTINCT FROM v_coorte_live_antes THEN
    v_falhas := v_falhas || 'pré-condição: count_cohort_participation deveria refletir a nova resposta ao vivo';
  END IF;

  -- A soma dos snapshots publicados NÃO reconstrói o total ao vivo: portanto
  -- total_ao_vivo - soma(publicados) não isola o respondente novo com média
  -- alguma associada.
  IF (v_r1_depois.response_count + v_r2_depois.response_count) = v_live_depois THEN
    v_falhas := v_falhas || 'soma dos publicados igualou o total ao vivo — o delta não publicado ficou determinável junto com médias';
  END IF;

  PERFORM set_config('request.jwt.claims', '', true);

  IF array_length(v_falhas, 1) > 0 THEN
    RAISE EXCEPTION E'FAILED: PROVA C (composição entre snapshots):\n  - %',
      array_to_string(v_falhas, E'\n  - ');
  END IF;

  RAISE NOTICE 'PROVEN: CROSS_SNAPSHOT_COMPOSITION_SAFE=true (coorte antes/depois + outra coorte + total ao vivo + contagem de coorte ao vivo não isolam o respondente novo: nenhuma média observável se move com delta<k_min)';
END
$bloco6$;

-- ═══════════════════════════════════════════════════════════════════════════
-- BLOCO 7 · PROVA D — ATAQUE DE BOOTSTRAP DA MIGRATION
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Sequência adversarial exigida:
--   · atacante observou o agregado EXATO ao vivo em n=9 antes da migration;
--   · chega 1 resposta -> n=10;
--   · o mecanismo de release em lote é ativado (baseline registrado);
--   · n=10 NÃO pode se tornar observável (senão o atacante deriva 1 pessoa);
--   · +1..+4 sobre o baseline continuam sem release;
--   · em +5 o próximo delta observável contém >= 5 contribuintes novos.
-- Vale para CONTAGEM e para item_means.
DO $bloco7$
DECLARE
  c_org   CONSTANT UUID := 'a0000000-0000-4000-8000-0000000000a1';
  c_onda  CONSTANT UUID := 'a0000000-0000-4000-8000-0000000000ab';
  c_coh   CONSTANT UUID := 'a0000000-0000-4000-8000-0000000000ac';
  c_admin CONSTANT UUID := 'a0000000-0000-4000-8000-0000000000a4';
  c_k     CONSTANT INTEGER := 5;
  v_row      RECORD;
  v_ids_base UUID[];
  v_hist_n   INTEGER;
  v_delta    INTEGER;
  v_novos_no_item INTEGER;
  v_falhas   TEXT[] := '{}';
BEGIN
  INSERT INTO public.waves (id, org_id, instrument, label, status)
  VALUES (c_onda, c_org, 'FIB_T', 'Onda Bootstrap', 'collecting') ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.wave_cohorts (id, org_id, wave_id, key, label)
  VALUES (c_coh, c_org, c_onda, 'boot', 'Boot') ON CONFLICT (id) DO NOTHING;

  -- ── Mundo PRÉ-migration: 9 respostas cujo agregado exato o atacante viu ──
  INSERT INTO public.wave_responses (wave_id, cohort_id, answers)
  SELECT c_onda, c_coh, '{"1":2}'::JSONB FROM generate_series(1, 9);
  SELECT COUNT(*) INTO v_hist_n FROM public.wave_responses
   WHERE wave_id = c_onda AND cohort_id = c_coh;
  IF v_hist_n <> 9 THEN
    v_falhas := v_falhas || format('pré-condição: esperadas 9 respostas históricas, há %s', v_hist_n);
  END IF;

  -- ── Chega 1 resposta: n=10 ───────────────────────────────────────────────
  INSERT INTO public.wave_responses (wave_id, cohort_id, answers)
  VALUES (c_onda, c_coh, '{"1":99}'::JSONB);

  -- ── Ativação do mecanismo: MESMA forma de INSERT do bootstrap da migration
  -- 20260909222000 (baseline com published_response_count e item_means NULL).
  -- A migration real semeia 0 linhas no replay (banco sem respostas quando ela
  -- roda), então o cenário é reproduzido aqui com a mesma semântica; o
  -- postflight da migration já falha se algum baseline sair publicado.
  INSERT INTO public.cohort_capsules
    (org_id, wave_id, cohort_id, published_response_count, published_response_ids, item_means, published_at)
  SELECT w.org_id, s.wave_id, s.cohort_id, NULL::INTEGER, s.ids, NULL::JSONB, NULL::TIMESTAMPTZ
    FROM (
      SELECT r.wave_id, r.cohort_id, COUNT(*) AS n, array_agg(r.id) AS ids
        FROM public.wave_responses r
       WHERE r.wave_id = c_onda
       GROUP BY r.wave_id, r.cohort_id
      HAVING COUNT(*) >= c_k
    ) s
    JOIN public.waves w ON w.id = s.wave_id
   WHERE NOT EXISTS (
     SELECT 1 FROM public.cohort_capsules c
      WHERE c.wave_id = s.wave_id
        AND ((s.cohort_id IS NULL AND c.cohort_id IS NULL) OR c.cohort_id = s.cohort_id));

  SELECT published_response_ids INTO v_ids_base
    FROM public.cohort_capsules WHERE wave_id = c_onda AND cohort_id = c_coh;
  IF array_length(v_ids_base, 1) IS DISTINCT FROM 10 THEN
    v_falhas := v_falhas || format('baseline deveria registrar as 10 respostas, registrou %s',
      array_length(v_ids_base, 1));
  END IF;
  IF EXISTS (SELECT 1 FROM public.cohort_capsules
              WHERE wave_id = c_onda AND cohort_id = c_coh AND item_means IS NOT NULL) THEN
    v_falhas := v_falhas || 'o baseline saiu PUBLICADO — bootstrap reabriria a diferenciação';
  END IF;

  PERFORM set_config('request.jwt.claims',
    jsonb_build_object('sub', c_admin::TEXT, 'role', 'authenticated')::TEXT, true);

  -- 7.1 n=10 NÃO se tornou observável.
  SELECT * INTO v_row FROM public.aggregate_cohort_responses(c_onda, c_coh);
  IF v_row.visible OR v_row.response_count IS NOT NULL OR v_row.item_means IS NOT NULL THEN
    v_falhas := v_falhas || format(
      'BOOTSTRAP EXPÔS n=10: visible=%s count=%s means=%s — atacante com observação histórica n=9 derivaria 1 respondente',
      v_row.visible, v_row.response_count, v_row.item_means);
  END IF;
  IF v_row.suppression_reason IS DISTINCT FROM 'awaiting_batched_release' THEN
    v_falhas := v_falhas || format('esperado awaiting_batched_release, veio %L', v_row.suppression_reason);
  END IF;

  -- 7.2 +1..+4 sobre o baseline: nada se torna observável.
  FOR v_delta IN 1 .. 4 LOOP
    INSERT INTO public.wave_responses (wave_id, cohort_id, answers)
    VALUES (c_onda, c_coh, '{"1":99}'::JSONB);
    SELECT * INTO v_row FROM public.aggregate_cohort_responses(c_onda, c_coh);
    IF v_row.visible OR v_row.response_count IS NOT NULL OR v_row.item_means IS NOT NULL THEN
      v_falhas := v_falhas || format('baseline +%s tornou-se observável (delta < k_min)', v_delta);
    END IF;
  END LOOP;

  -- 7.3 +5 sobre o baseline: primeira publicação observável.
  INSERT INTO public.wave_responses (wave_id, cohort_id, answers)
  VALUES (c_onda, c_coh, '{"1":99}'::JSONB);
  SELECT * INTO v_row FROM public.aggregate_cohort_responses(c_onda, c_coh);
  IF NOT v_row.visible THEN
    v_falhas := v_falhas || format('baseline +5 deveria publicar, veio reason=%L', v_row.suppression_reason);
  ELSE
    -- CONTAGEM: o primeiro valor observável é 15, e o delta contra a
    -- observação histórica (9) envolve 6 pessoas — nunca menos de k_min.
    IF v_row.response_count IS DISTINCT FROM 15 THEN
      v_falhas := v_falhas || format('primeira publicação deveria ter count=15, veio %s', v_row.response_count);
    END IF;
    IF (v_row.response_count - v_hist_n) < c_k THEN
      v_falhas := v_falhas || format(
        'delta contra a observação histórica é %s (< k_min=%s)', v_row.response_count - v_hist_n, c_k);
    END IF;
    -- item_means: o item liberado tem de ter >= k_min contribuintes NOVOS
    -- em relação ao baseline. Verificado contra os dados, não pelo reason.
    SELECT COUNT(*) INTO v_novos_no_item
      FROM public.wave_responses r
      CROSS JOIN LATERAL jsonb_each_text(r.answers) AS kv(key, value)
     WHERE r.wave_id = c_onda AND r.cohort_id = c_coh
       AND kv.key = '1'
       AND r.id <> ALL (v_ids_base);
    IF v_novos_no_item < c_k THEN
      v_falhas := v_falhas || format(
        'item "1" foi liberado com apenas %s contribuintes novos sobre o baseline', v_novos_no_item);
    END IF;
    IF NOT (v_row.item_means ? '1') THEN
      v_falhas := v_falhas || 'item "1" deveria estar liberado após 5 contribuintes novos';
    END IF;
  END IF;

  PERFORM set_config('request.jwt.claims', '', true);

  IF array_length(v_falhas, 1) > 0 THEN
    RAISE EXCEPTION E'FAILED: PROVA D (bootstrap da migration):\n  - %',
      array_to_string(v_falhas, E'\n  - ');
  END IF;

  RAISE NOTICE 'PROVEN: MIGRATION_BOOTSTRAP_PRIVACY=PASS (baseline registrado sem publicar; n=10 não exposto contra observação histórica n=9; +1..+4 sem release; +5 publica com >= k_min contribuintes novos em contagem E por item)';
END
$bloco7$;

-- ═══════════════════════════════════════════════════════════════════════════
-- BLOCO 8 · PROVA C COMPLETA — COMPOSIÇÃO COM RELÓGIOS DE RELEASE DISTINTOS
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Cenário exigido: uma coorte recebe MENOS de k_min novas respostas enquanto
-- OUTRA cruza o limiar de publicação, e o estado de nível ONDA também muda.
-- O atacante observa as versões antiga e nova por caminhos autenticados
-- legítimos. Nenhuma combinação algébrica pode derivar subgrupo < k_min, nem
-- em contagem nem em médias.
DO $bloco8$
DECLARE
  c_org   CONSTANT UUID := 'a0000000-0000-4000-8000-0000000000a1';
  c_onda  CONSTANT UUID := 'a0000000-0000-4000-8000-0000000000ad';
  c_c1    CONSTANT UUID := 'a0000000-0000-4000-8000-0000000000ae';
  c_c2    CONSTANT UUID := 'a0000000-0000-4000-8000-0000000000af';
  c_admin CONSTANT UUID := 'a0000000-0000-4000-8000-0000000000a4';
  c_k     CONSTANT INTEGER := 5;
  v_c1_a RECORD; v_c1_b RECORD;
  v_c2_a RECORD; v_c2_b RECORD;
  v_onda_a INTEGER; v_onda_b INTEGER;
  v_caps_a INTEGER; v_caps_b INTEGER;
  v_falhas TEXT[] := '{}';
BEGIN
  INSERT INTO public.waves (id, org_id, instrument, label, status)
  VALUES (c_onda, c_org, 'FIB_T', 'Onda Composicao Async', 'collecting') ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.wave_cohorts (id, org_id, wave_id, key, label) VALUES
    (c_c1, c_org, c_onda, 'ac1', 'AC1'), (c_c2, c_org, c_onda, 'ac2', 'AC2')
  ON CONFLICT (id) DO NOTHING;

  -- Estado inicial: ambas publicáveis (6 e 6), nenhuma oculta.
  INSERT INTO public.wave_responses (wave_id, cohort_id, answers)
  SELECT c_onda, c_c1, '{"1":2}'::JSONB FROM generate_series(1, 6);
  INSERT INTO public.wave_responses (wave_id, cohort_id, answers)
  SELECT c_onda, c_c2, '{"1":4}'::JSONB FROM generate_series(1, 6);

  PERFORM set_config('request.jwt.claims',
    jsonb_build_object('sub', c_admin::TEXT, 'role', 'authenticated')::TEXT, true);

  -- Observação ANTIGA (t0), por caminho autenticado legítimo.
  SELECT * INTO v_c1_a FROM public.aggregate_cohort_responses(c_onda, c_c1);
  SELECT * INTO v_c2_a FROM public.aggregate_cohort_responses(c_onda, c_c2);
  SELECT public.count_wave_responses(c_onda) INTO v_onda_a;
  SELECT COUNT(*) INTO v_caps_a FROM public.cohort_capsules WHERE wave_id = c_onda;

  IF NOT v_c1_a.visible OR NOT v_c2_a.visible THEN
    v_falhas := v_falhas || 'pré-condição: ambas as coortes deveriam estar publicadas em t0';
  END IF;

  -- RELÓGIOS DISTINTOS: c1 recebe 3 (< k_min, NÃO publica) enquanto c2
  -- recebe 5 (cruza o limiar, PUBLICA). O nível ONDA muda em 8.
  INSERT INTO public.wave_responses (wave_id, cohort_id, answers)
  SELECT c_onda, c_c1, '{"1":50}'::JSONB FROM generate_series(1, 3);
  INSERT INTO public.wave_responses (wave_id, cohort_id, answers)
  SELECT c_onda, c_c2, '{"1":60}'::JSONB FROM generate_series(1, 5);

  -- Observação NOVA (t1).
  SELECT * INTO v_c1_b FROM public.aggregate_cohort_responses(c_onda, c_c1);
  SELECT * INTO v_c2_b FROM public.aggregate_cohort_responses(c_onda, c_c2);
  SELECT public.count_wave_responses(c_onda) INTO v_onda_b;
  SELECT COUNT(*) INTO v_caps_b FROM public.cohort_capsules WHERE wave_id = c_onda;

  -- (1) c1 recebeu < k_min: seu observável NÃO pode ter mudado, nem contagem
  -- nem médias. É a asserção central da composição.
  IF v_c1_b.response_count IS DISTINCT FROM v_c1_a.response_count THEN
    v_falhas := v_falhas || format('c1 (+3 < k_min) mudou a contagem observável de %s para %s',
      v_c1_a.response_count, v_c1_b.response_count);
  END IF;
  IF v_c1_b.item_means IS DISTINCT FROM v_c1_a.item_means THEN
    v_falhas := v_falhas || 'c1 (+3 < k_min) mudou item_means observável — composição vazaria 3 pessoas';
  END IF;

  -- (2) c2 cruzou o limiar: publicou legitimamente, e o avanço envolve >= k_min.
  IF v_c2_b.response_count IS NOT DISTINCT FROM v_c2_a.response_count THEN
    v_falhas := v_falhas || 'c2 (+5) deveria ter publicado novo snapshot';
  ELSIF (v_c2_b.response_count - v_c2_a.response_count) < c_k THEN
    v_falhas := v_falhas || format('o avanço de c2 foi de %s pessoas (< k_min)',
      v_c2_b.response_count - v_c2_a.response_count);
  END IF;

  -- (3) O nível ONDA mudou (ao vivo), como é do contrato operacional.
  IF (v_onda_b - v_onda_a) <> 8 THEN
    v_falhas := v_falhas || format('pré-condição: total da onda deveria subir 8, subiu %s', v_onda_b - v_onda_a);
  END IF;

  -- (4) COMBINAÇÃO ALGÉBRICA: o atacante tem
  --     total_onda(t1) - total_onda(t0) = 8
  --     c2_publicado(t1) - c2_publicado(t0) = 5
  --     c1_publicado(t1) - c1_publicado(t0) = 0
  -- Subtrair tudo dá 8 - 5 - 0 = 3, que é a QUANTIDADE de novas respostas de
  -- c1. Isso é METADADO DE CONTAGEM — já disponível sem gate por desenho
  -- (count_wave_responses/count_cohort_participation são explicitamente
  -- operacionais). O que NÃO pode acontecer é obter a MÉDIA/soma desse grupo
  -- de 3: para isso seria preciso que alguma média observável de c1 tivesse
  -- se movido, e (1) prova que não se moveu. Asserção explícita:
  IF v_c1_b.item_means IS DISTINCT FROM v_c1_a.item_means THEN
    v_falhas := v_falhas || 'a média de c1 se moveu: a subtração de contagens viraria soma de 3 respostas';
  END IF;

  -- (5) Nenhum snapshot extra foi criado (uma linha por segmento).
  IF v_caps_b <> v_caps_a THEN
    v_falhas := v_falhas || format('número de snapshots mudou de %s para %s', v_caps_a, v_caps_b);
  END IF;

  -- (6) Ordem de publicação invertida não muda o resultado: reconsultar c1
  -- depois de c2 continua devolvendo o mesmo observável de c1.
  DECLARE v_c1_c RECORD;
  BEGIN
    SELECT * INTO v_c1_c FROM public.aggregate_cohort_responses(c_onda, c_c1);
    IF v_c1_c.response_count IS DISTINCT FROM v_c1_a.response_count
       OR v_c1_c.item_means IS DISTINCT FROM v_c1_a.item_means THEN
      v_falhas := v_falhas || 'a ordem das chamadas alterou o observável de c1';
    END IF;
  END;

  PERFORM set_config('request.jwt.claims', '', true);

  IF array_length(v_falhas, 1) > 0 THEN
    RAISE EXCEPTION E'FAILED: PROVA C completa (composição assíncrona):\n  - %',
      array_to_string(v_falhas, E'\n  - ');
  END IF;

  RAISE NOTICE 'PROVEN: CROSS_SNAPSHOT_COMPOSITION=PASS · NO_COMPOSED_DELTA_LT_K_DERIVABLE=true (c1 +3 congelada, c2 +5 publicada, onda +8 ao vivo, ordem indiferente: subtração devolve no máximo CONTAGEM operacional, nunca média/soma de grupo < k_min)';
END
$bloco8$;

-- ── Limpeza das fixtures deste arquivo ──────────────────────────────────────
DELETE FROM public.cohort_capsules WHERE wave_id IN (
  'a0000000-0000-4000-8000-0000000000ab', 'a0000000-0000-4000-8000-0000000000ad');
DELETE FROM public.wave_responses WHERE wave_id IN (
  'a0000000-0000-4000-8000-0000000000ab', 'a0000000-0000-4000-8000-0000000000ad');
DELETE FROM public.wave_cohorts WHERE wave_id IN (
  'a0000000-0000-4000-8000-0000000000ab', 'a0000000-0000-4000-8000-0000000000ad');
DELETE FROM public.waves WHERE id IN (
  'a0000000-0000-4000-8000-0000000000ab', 'a0000000-0000-4000-8000-0000000000ad');

DELETE FROM public.cohort_capsules WHERE wave_id IN (
  'a0000000-0000-4000-8000-0000000000a2', 'a0000000-0000-4000-8000-0000000000b2',
  'a0000000-0000-4000-8000-0000000000a6', 'a0000000-0000-4000-8000-0000000000a8');
DELETE FROM public.wave_responses WHERE wave_id IN (
  'a0000000-0000-4000-8000-0000000000a2', 'a0000000-0000-4000-8000-0000000000b2',
  'a0000000-0000-4000-8000-0000000000a6', 'a0000000-0000-4000-8000-0000000000a8');
DELETE FROM public.wave_cohorts WHERE wave_id IN (
  'a0000000-0000-4000-8000-0000000000a2', 'a0000000-0000-4000-8000-0000000000b2',
  'a0000000-0000-4000-8000-0000000000a6', 'a0000000-0000-4000-8000-0000000000a8');
DELETE FROM public.waves WHERE id IN (
  'a0000000-0000-4000-8000-0000000000a2', 'a0000000-0000-4000-8000-0000000000b2',
  'a0000000-0000-4000-8000-0000000000a6', 'a0000000-0000-4000-8000-0000000000a8');
DELETE FROM public.profiles WHERE id IN (
  'a0000000-0000-4000-8000-0000000000a4', 'a0000000-0000-4000-8000-0000000000a5');
DELETE FROM public.organizations WHERE id IN (
  'a0000000-0000-4000-8000-0000000000a1', 'a0000000-0000-4000-8000-0000000000b1');
