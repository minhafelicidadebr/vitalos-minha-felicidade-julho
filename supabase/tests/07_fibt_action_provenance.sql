-- ═══════════════════════════════════════════════════════════════════════════
-- PROVA EXECUTÁVEL · PROVENIÊNCIA FIB-T NAS AÇÕES E ISOLAMENTO DO LEDGER (IVO R6)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Migration sob prova: 20261002120000_fibt_action_provenance.sql.
--
-- O que esta suíte prova no BANCO (não na aplicação):
--   1. A RPC recusa proveniência entre organizações, de coorte não publicada,
--      incompleta ou com lift IVO — e a recusa não deixa plano órfão.
--   2. Versão do instrumento e instante de publicação são DERIVADOS do banco.
--   3. Mesmo escrita DIRETA por service_role não consegue associar a ação a
--      uma onda/coorte de outra organização (FK composta) nem meia-proveniência.
--   4. Evidência separa execução de aprendizagem; "eficácia" não é registrável.
--   5. Como `authenticated` de OUTRA organização: zero linhas lidas, nenhuma
--      escrita direta, nenhuma RPC do ledger invocável.
--   6. Como `authenticated` da organização dona: lê as próprias ações.
--
-- Papéis representativos: service_role (caminho do servidor), authenticated
-- com JWT de admin de cada organização, anon. Nada roda só como superusuário
-- além das fixtures e da limpeza.
--
-- Roda nos três modos do replay. No `preprod` o módulo Action Plan não existe
-- (funções ausentes): os blocos de RPC registram SKIP explícito e os blocos de
-- constraint/RLS continuam valendo, porque as tabelas existem lá.
-- ═══════════════════════════════════════════════════════════════════════════

\set ON_ERROR_STOP on

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
-- FIXTURES · duas organizações fictícias, uma onda FIB-T cada. Nenhum dado real.
-- ═══════════════════════════════════════════════════════════════════════════
DO $fixtures$
BEGIN
  INSERT INTO public.organizations (id, slug, name) VALUES
    ('a7000000-0000-4000-8000-0000000000a1', 'org-ficticia-r6-a', 'Org Fictícia R6 A'),
    ('a7000000-0000-4000-8000-0000000000b1', 'org-ficticia-r6-b', 'Org Fictícia R6 B')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.users (id, email) VALUES
    ('a7000000-0000-4000-8000-0000000000a9', 'admin-r6-a@exemplo.invalid'),
    ('a7000000-0000-4000-8000-0000000000b9', 'admin-r6-b@exemplo.invalid')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, org_id, role, display_name) VALUES
    ('a7000000-0000-4000-8000-0000000000a9', 'a7000000-0000-4000-8000-0000000000a1', 'RH_ADMIN', 'Admin R6 A'),
    ('a7000000-0000-4000-8000-0000000000b9', 'a7000000-0000-4000-8000-0000000000b1', 'RH_ADMIN', 'Admin R6 B')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.waves (id, org_id, instrument, instrument_version, label, status) VALUES
    ('a7000000-0000-4000-8000-0000000000a2', 'a7000000-0000-4000-8000-0000000000a1', 'FIB_T', '1.0.0', 'Onda R6 A', 'collecting'),
    ('a7000000-0000-4000-8000-0000000000b2', 'a7000000-0000-4000-8000-0000000000b1', 'FIB_T', '1.0.0', 'Onda R6 B', 'collecting')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.wave_cohorts (id, org_id, wave_id, key, label) VALUES
    -- A1 publicada, A2 sem publicação (protegida), B1 publicada (outro tenant)
    ('a7000000-0000-4000-8000-0000000000a3', 'a7000000-0000-4000-8000-0000000000a1', 'a7000000-0000-4000-8000-0000000000a2', 'r6-a1', 'Setor A1'),
    ('a7000000-0000-4000-8000-0000000000a4', 'a7000000-0000-4000-8000-0000000000a1', 'a7000000-0000-4000-8000-0000000000a2', 'r6-a2', 'Setor A2'),
    ('a7000000-0000-4000-8000-0000000000b3', 'a7000000-0000-4000-8000-0000000000b1', 'a7000000-0000-4000-8000-0000000000b2', 'r6-b1', 'Setor B1')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.cohort_capsules
    (org_id, wave_id, cohort_id, published_response_count, published_response_ids, item_means, published_at)
  VALUES
    ('a7000000-0000-4000-8000-0000000000a1', 'a7000000-0000-4000-8000-0000000000a2',
     'a7000000-0000-4000-8000-0000000000a3', 7, '{}', '{"1": 2.5}', '2026-06-20T12:00:00Z'),
    ('a7000000-0000-4000-8000-0000000000b1', 'a7000000-0000-4000-8000-0000000000b2',
     'a7000000-0000-4000-8000-0000000000b3', 8, '{}', '{"1": 3.0}', '2026-06-21T12:00:00Z'),
    -- A2: linha de BASELINE (marca d'água, nada publicado) — não pode embasar ação.
    ('a7000000-0000-4000-8000-0000000000a1', 'a7000000-0000-4000-8000-0000000000a2',
     'a7000000-0000-4000-8000-0000000000a4', NULL, '{}', NULL, NULL);
END
$fixtures$;

-- ═══════════════════════════════════════════════════════════════════════════
-- BLOCO 1 · RPC create_action_plan como service_role (caminho do servidor)
-- ═══════════════════════════════════════════════════════════════════════════
DO $bloco1$
DECLARE
  c_org_a   CONSTANT UUID := 'a7000000-0000-4000-8000-0000000000a1';
  c_org_b   CONSTANT UUID := 'a7000000-0000-4000-8000-0000000000b1';
  c_wave_a  CONSTANT UUID := 'a7000000-0000-4000-8000-0000000000a2';
  c_wave_b  CONSTANT UUID := 'a7000000-0000-4000-8000-0000000000b2';
  c_a1      CONSTANT UUID := 'a7000000-0000-4000-8000-0000000000a3';
  c_a2      CONSTANT UUID := 'a7000000-0000-4000-8000-0000000000a4';
  c_b1      CONSTANT UUID := 'a7000000-0000-4000-8000-0000000000b3';
  c_admin_a CONSTANT UUID := 'a7000000-0000-4000-8000-0000000000a9';
  v_ok      BOOLEAN;
  v_reason  TEXT;
  v_plan    UUID;
  v_item    UUID;
  v_ev_exec UUID;
  v_ev_aprd UUID;
  v_row     RECORD;
  v_out     TEXT;
  v_falhas  TEXT[] := '{}';

  -- Item FIB-T mínimo; a proveniência varia por caso.
  FUNCTION_ITEM CONSTANT TEXT := '{"rank":1,"lever_id":"fibt:r6-a1:bem_estar","title":"Rodas de conversa","effort":"medio","start_week":1,"end_week":13,"milestone_week":7,"weeks_budget":13,"source_lens_id":"fibt","source_factor_id":"bem_estar"}';
BEGIN
  IF to_regprocedure('public.create_action_plan(uuid,text,text,uuid,uuid,jsonb)') IS NULL THEN
    RAISE NOTICE 'PROVEN: R6_RPC_PATH=SKIP (módulo Action Plan ausente neste modo — estado produtivo observado; constraints/RLS seguem provadas nos blocos 2-3)';
    RETURN;
  END IF;

  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
  EXECUTE 'SET LOCAL ROLE service_role';

  -- 1.1 Cross-tenant: org A citando onda/coorte da org B.
  SELECT accepted, reason INTO v_ok, v_reason FROM public.create_action_plan(
    c_org_a, '2026-T2', 'Prova R6', NULL, c_admin_a,
    jsonb_build_array(FUNCTION_ITEM::JSONB || jsonb_build_object('source_wave_id', c_wave_b, 'source_cohort_id', c_b1)));
  IF v_ok OR v_reason IS DISTINCT FROM 'provenance_cross_tenant_denied' THEN
    v_falhas := v_falhas || format('cross-tenant aceito ou motivo errado (%s/%s)', v_ok, v_reason);
  END IF;

  -- 1.2 Par incoerente: onda da própria org com coorte de outra.
  SELECT accepted, reason INTO v_ok, v_reason FROM public.create_action_plan(
    c_org_a, '2026-T2', 'Prova R6', NULL, c_admin_a,
    jsonb_build_array(FUNCTION_ITEM::JSONB || jsonb_build_object('source_wave_id', c_wave_a, 'source_cohort_id', c_b1)));
  IF v_ok OR v_reason IS DISTINCT FROM 'provenance_cross_tenant_denied' THEN
    v_falhas := v_falhas || format('par onda/coorte incoerente aceito (%s/%s)', v_ok, v_reason);
  END IF;

  -- 1.3 Coorte sem leitura publicada (baseline) — protegida não embasa ação.
  SELECT accepted, reason INTO v_ok, v_reason FROM public.create_action_plan(
    c_org_a, '2026-T2', 'Prova R6', NULL, c_admin_a,
    jsonb_build_array(FUNCTION_ITEM::JSONB || jsonb_build_object('source_wave_id', c_wave_a, 'source_cohort_id', c_a2)));
  IF v_ok OR v_reason IS DISTINCT FROM 'source_not_published' THEN
    v_falhas := v_falhas || format('coorte não publicada aceita (%s/%s)', v_ok, v_reason);
  END IF;

  -- 1.4 Lift IVO declarado em ação FIB-T (C6).
  SELECT accepted, reason INTO v_ok, v_reason FROM public.create_action_plan(
    c_org_a, '2026-T2', 'Prova R6', NULL, c_admin_a,
    jsonb_build_array(FUNCTION_ITEM::JSONB || jsonb_build_object(
      'source_wave_id', c_wave_a, 'source_cohort_id', c_a1, 'expected_ivo_lift', 3)));
  IF v_ok OR v_reason IS DISTINCT FROM 'provenance_forbids_ivo_lift' THEN
    v_falhas := v_falhas || format('lift IVO aceito em ação FIB-T (%s/%s)', v_ok, v_reason);
  END IF;

  -- 1.5 Meia-proveniência.
  SELECT accepted, reason INTO v_ok, v_reason FROM public.create_action_plan(
    c_org_a, '2026-T2', 'Prova R6', NULL, c_admin_a,
    jsonb_build_array(FUNCTION_ITEM::JSONB || jsonb_build_object('source_wave_id', c_wave_a)));
  IF v_ok OR v_reason IS DISTINCT FROM 'provenance_incomplete' THEN
    v_falhas := v_falhas || format('meia-proveniência aceita (%s/%s)', v_ok, v_reason);
  END IF;

  -- Nenhuma recusa deixou plano órfão.
  IF EXISTS (SELECT 1 FROM public.action_plans WHERE org_id = c_org_a) THEN
    v_falhas := v_falhas || 'uma recusa deixou cabeçalho de plano gravado';
  END IF;

  -- 1.6 Caminho legítimo: leitura publicada da própria organização. A versão
  -- enviada pelo chamador é IGNORADA — o banco deriva da onda.
  SELECT accepted, reason, plan_id INTO v_ok, v_reason, v_plan FROM public.create_action_plan(
    c_org_a, '2026-T2', 'Prova R6', NULL, c_admin_a,
    jsonb_build_array(FUNCTION_ITEM::JSONB || jsonb_build_object(
      'source_wave_id', c_wave_a, 'source_cohort_id', c_a1, 'source_instrument_version', '9.9.9')));
  IF NOT v_ok THEN
    v_falhas := v_falhas || format('caminho legítimo recusado (%s)', v_reason);
  ELSE
    SELECT * INTO v_row FROM public.action_items WHERE plan_id = v_plan;
    v_item := v_row.id;
    IF v_row.source_instrument_version IS DISTINCT FROM '1.0.0' THEN
      v_falhas := v_falhas || format('versão não derivada do banco (%s)', v_row.source_instrument_version);
    END IF;
    IF v_row.source_published_at IS DISTINCT FROM '2026-06-20T12:00:00Z'::TIMESTAMPTZ THEN
      v_falhas := v_falhas || format('instante de publicação não derivado (%s)', v_row.source_published_at);
    END IF;
    IF v_row.expected_ivo_lift <> 0 OR v_row.source_lens_id <> 'fibt' OR v_row.source_factor_id <> 'bem_estar'
       OR v_row.source_wave_id <> c_wave_a OR v_row.source_cohort_id <> c_a1 OR v_row.org_id <> c_org_a THEN
      v_falhas := v_falhas || 'proveniência gravada divergente do pedido';
    END IF;
  END IF;

  -- 1.7 Compatibilidade: item SEM origem de lente continua aceito (fluxo /plano-acao).
  SELECT accepted, reason INTO v_ok, v_reason FROM public.create_action_plan(
    c_org_a, 'fundacao-segura-r6', 'Prova R6 legado', NULL, c_admin_a,
    '[{"rank":1,"lever_id":"lever-legado","title":"Ação legada","effort":"baixo","expected_ivo_lift":2.5,"start_week":1,"end_week":4,"milestone_week":2,"weeks_budget":4}]'::JSONB);
  IF NOT v_ok THEN
    v_falhas := v_falhas || format('item legado sem origem foi recusado (%s)', v_reason);
  END IF;

  -- 1.8 Evidência: execução × aprendizagem; eficácia não existe como tipo.
  IF v_item IS NOT NULL THEN
    SELECT evidence_id INTO v_ev_exec FROM public.record_evidence(
      v_item, 'texto', 'Ata da 1ª roda de conversa', 'direct', NULL, '2026-07-10', c_admin_a, 'RH_ADMIN');
    SELECT evidence_id INTO v_ev_aprd FROM public.record_evidence(
      v_item, 'aprendizagem', 'Horário após o turno teve mais adesão', 'direct', NULL, '2026-07-20', c_admin_a, 'RH_ADMIN');
    IF (SELECT evidence_scope FROM public.evidence_records WHERE id = v_ev_exec) IS DISTINCT FROM 'execucao' THEN
      v_falhas := v_falhas || 'evidência de execução sem escopo execucao';
    END IF;
    IF (SELECT evidence_scope FROM public.evidence_records WHERE id = v_ev_aprd) IS DISTINCT FROM 'aprendizagem' THEN
      v_falhas := v_falhas || 'aprendizagem sem escopo aprendizagem';
    END IF;
    v_out := _proof.attempt(format(
      'SELECT * FROM public.record_evidence(%L, %L, %L, %L, NULL, %L, %L, %L)',
      v_item, 'eficacia', 'Indicador melhorou', 'direct', '2026-08-01', c_admin_a, 'RH_ADMIN'));
    IF v_out <> 'raised:23514' THEN
      v_falhas := v_falhas || format('"eficácia" foi aceita como tipo de evidência (%s)', v_out);
    END IF;
  END IF;

  EXECUTE 'RESET ROLE';
  PERFORM set_config('request.jwt.claims', '', true);

  IF array_length(v_falhas, 1) > 0 THEN
    RAISE EXCEPTION E'FAILED: proveniência FIB-T via RPC:\n  - %', array_to_string(v_falhas, E'\n  - ');
  END IF;

  RAISE NOTICE 'PROVEN: R6_CROSS_TENANT=DENIED · R6_INCOHERENT_PAIR=DENIED · R6_UNPUBLISHED_SOURCE=DENIED · R6_IVO_LIFT=DENIED · R6_PARTIAL=DENIED · R6_NO_ORPHAN_PLAN=PASS · R6_DERIVED_VERSION_AND_PUBLISHED_AT=PASS · R6_LEGACY_ITEM=PASS · R6_EVIDENCE_SCOPE=PASS · R6_EFFICACY_KIND=REJECTED (como service_role)';
END
$bloco1$;

-- ═══════════════════════════════════════════════════════════════════════════
-- BLOCO 2 · Constraints valem até para escrita DIRETA de service_role
-- ═══════════════════════════════════════════════════════════════════════════
DO $bloco2$
DECLARE
  c_org_a   CONSTANT UUID := 'a7000000-0000-4000-8000-0000000000a1';
  c_wave_a  CONSTANT UUID := 'a7000000-0000-4000-8000-0000000000a2';
  c_wave_b  CONSTANT UUID := 'a7000000-0000-4000-8000-0000000000b2';
  c_a1      CONSTANT UUID := 'a7000000-0000-4000-8000-0000000000a3';
  c_b1      CONSTANT UUID := 'a7000000-0000-4000-8000-0000000000b3';
  c_admin_a CONSTANT UUID := 'a7000000-0000-4000-8000-0000000000a9';
  c_plano   CONSTANT UUID := 'a7000000-0000-4000-8000-0000000000a5';
  v_cols    TEXT := 'plan_id, org_id, rank, lever_id, title, effort, start_week, end_week, milestone_week, weeks_budget';
  v_base    TEXT;
  v_out     TEXT;
  v_falhas  TEXT[] := '{}';
BEGIN
  INSERT INTO public.action_plans (id, org_id, cycle_key, season_name, created_by)
  VALUES (c_plano, c_org_a, 'r6-direto', 'Prova R6 direta', c_admin_a)
  ON CONFLICT (id) DO NOTHING;

  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
  EXECUTE 'SET LOCAL ROLE service_role';

  v_base := format('%L, %L, 1, %L, %L, %L, 1, 13, 7, 13', c_plano, c_org_a, 'lever-direto', 'Direta', 'baixo');

  -- 2.1 Onda de outra organização: FK composta (source_wave_id, org_id).
  v_out := _proof.attempt(format(
    'INSERT INTO public.action_items (%s, source_lens_id, source_wave_id, source_cohort_id, source_factor_id, source_instrument_version, source_published_at) VALUES (%s, %L, %L, %L, %L, %L, %L)',
    v_cols, v_base, 'fibt', c_wave_b, c_b1, 'bem_estar', '1.0.0', '2026-06-21T12:00:00Z'));
  IF v_out <> 'raised:23503' THEN
    v_falhas := v_falhas || format('service_role gravou ação com onda de outra org (%s)', v_out);
  END IF;

  -- 2.2 Coorte de outra onda: FK (source_cohort_id, source_wave_id).
  v_out := _proof.attempt(format(
    'INSERT INTO public.action_items (%s, source_lens_id, source_wave_id, source_cohort_id, source_factor_id, source_instrument_version, source_published_at) VALUES (%s, %L, %L, %L, %L, %L, %L)',
    v_cols, v_base, 'fibt', c_wave_a, c_b1, 'bem_estar', '1.0.0', '2026-06-21T12:00:00Z'));
  IF v_out <> 'raised:23503' THEN
    v_falhas := v_falhas || format('service_role gravou coorte alheia na própria onda (%s)', v_out);
  END IF;

  -- 2.3 Meia-proveniência.
  v_out := _proof.attempt(format(
    'INSERT INTO public.action_items (%s, source_lens_id, source_wave_id) VALUES (%s, %L, %L)',
    v_cols, v_base, 'fibt', c_wave_a));
  IF v_out <> 'raised:23514' THEN
    v_falhas := v_falhas || format('meia-proveniência gravada diretamente (%s)', v_out);
  END IF;

  -- 2.4 Lift IVO em ação de origem FIB-T.
  v_out := _proof.attempt(format(
    'INSERT INTO public.action_items (%s, expected_ivo_lift, source_lens_id, source_wave_id, source_cohort_id, source_factor_id, source_instrument_version, source_published_at) VALUES (%s, 4, %L, %L, %L, %L, %L, %L)',
    v_cols, v_base, 'fibt', c_wave_a, c_a1, 'bem_estar', '1.0.0', '2026-06-20T12:00:00Z'));
  IF v_out <> 'raised:23514' THEN
    v_falhas := v_falhas || format('lift IVO gravado diretamente em ação FIB-T (%s)', v_out);
  END IF;

  -- 2.5 Lente desconhecida.
  v_out := _proof.attempt(format(
    'INSERT INTO public.action_items (%s, source_lens_id, source_wave_id, source_cohort_id, source_factor_id, source_instrument_version, source_published_at) VALUES (%s, %L, %L, %L, %L, %L, %L)',
    v_cols, v_base, 'copsoq', c_wave_a, c_a1, 'bem_estar', '1.0.0', '2026-06-20T12:00:00Z'));
  IF v_out <> 'raised:23514' THEN
    v_falhas := v_falhas || format('lente desconhecida gravada (%s)', v_out);
  END IF;

  EXECUTE 'RESET ROLE';
  PERFORM set_config('request.jwt.claims', '', true);

  -- 2.6 Nenhuma coluna do ledger é capaz de carregar resposta ou agregado:
  -- a proveniência é só referência.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name IN ('action_items', 'evidence_records', 'action_log')
       AND (column_name ~ '(answer|item_mean|response_count|response_id|score)' )
  ) THEN
    v_falhas := v_falhas || 'há coluna no ledger capaz de carregar resposta/agregado';
  END IF;

  IF array_length(v_falhas, 1) > 0 THEN
    RAISE EXCEPTION E'FAILED: constraints de proveniência:\n  - %', array_to_string(v_falhas, E'\n  - ');
  END IF;

  RAISE NOTICE 'PROVEN: R6_FK_CROSS_ORG_WAVE=BLOCKED · R6_FK_FOREIGN_COHORT=BLOCKED · R6_PARTIAL_DIRECT=BLOCKED · R6_LIFT_DIRECT=BLOCKED · R6_UNKNOWN_LENS=BLOCKED · R6_NO_VALUE_COLUMNS=PASS (escrita direta como service_role)';
END
$bloco2$;

-- ═══════════════════════════════════════════════════════════════════════════
-- BLOCO 3 · RLS e superfície como `authenticated` de cada organização e `anon`
-- ═══════════════════════════════════════════════════════════════════════════
DO $bloco3$
DECLARE
  c_org_a   CONSTANT UUID := 'a7000000-0000-4000-8000-0000000000a1';
  c_admin_a CONSTANT UUID := 'a7000000-0000-4000-8000-0000000000a9';
  c_admin_b CONSTANT UUID := 'a7000000-0000-4000-8000-0000000000b9';
  c_wave_a  CONSTANT UUID := 'a7000000-0000-4000-8000-0000000000a2';
  c_a1      CONSTANT UUID := 'a7000000-0000-4000-8000-0000000000a3';
  v_rpc     BOOLEAN := to_regprocedure('public.create_action_plan(uuid,text,text,uuid,uuid,jsonb)') IS NOT NULL;
  v_item    UUID;
  v_n       INTEGER;
  v_out     TEXT;
  v_falhas  TEXT[] := '{}';
BEGIN
  SELECT id INTO v_item FROM public.action_items WHERE org_id = c_org_a ORDER BY created_at LIMIT 1;

  -- 3.1 Admin da organização B (outra organização).
  PERFORM set_config('request.jwt.claims',
    jsonb_build_object('sub', c_admin_b::TEXT, 'role', 'authenticated')::TEXT, true);
  EXECUTE 'SET LOCAL ROLE authenticated';

  SELECT COUNT(*) INTO v_n FROM public.action_items WHERE org_id = c_org_a;
  IF v_n <> 0 THEN v_falhas := v_falhas || format('org B leu %s ação(ões) da org A', v_n); END IF;
  SELECT COUNT(*) INTO v_n FROM public.action_plans WHERE org_id = c_org_a;
  IF v_n <> 0 THEN v_falhas := v_falhas || format('org B leu %s plano(s) da org A', v_n); END IF;
  SELECT COUNT(*) INTO v_n FROM public.evidence_records WHERE org_id = c_org_a;
  IF v_n <> 0 THEN v_falhas := v_falhas || format('org B leu %s evidência(s) da org A', v_n); END IF;
  SELECT COUNT(*) INTO v_n FROM public.action_log WHERE org_id = c_org_a;
  IF v_n <> 0 THEN v_falhas := v_falhas || format('org B leu %s evento(s) da org A', v_n); END IF;

  v_out := _proof.attempt(format('UPDATE public.action_items SET title = %L WHERE org_id = %L', 'INVADIDA', c_org_a));
  IF v_out NOT IN ('raised:42501', 'executed:0') THEN
    v_falhas := v_falhas || format('org B alterou ação da org A (%s)', v_out);
  END IF;
  v_out := _proof.attempt(format('DELETE FROM public.evidence_records WHERE org_id = %L', c_org_a));
  IF v_out NOT IN ('raised:42501', 'executed:0') THEN
    v_falhas := v_falhas || format('org B apagou evidência da org A (%s)', v_out);
  END IF;
  v_out := _proof.attempt(format(
    'INSERT INTO public.action_items (plan_id, org_id, rank, lever_id, title, effort, start_week, end_week, milestone_week, weeks_budget) SELECT plan_id, org_id, 9, %L, %L, %L, 1, 1, 1, 1 FROM public.action_items LIMIT 1',
    'x', 'x', 'baixo'));
  IF v_out NOT IN ('raised:42501', 'executed:0') THEN
    v_falhas := v_falhas || format('authenticated escreveu direto em action_items (%s)', v_out);
  END IF;
  v_out := _proof.attempt('SELECT COUNT(*) FROM public.cohort_capsules');
  IF v_out <> 'raised:42501' THEN
    v_falhas := v_falhas || format('authenticated lê cohort_capsules diretamente (%s)', v_out);
  END IF;

  IF v_rpc THEN
    v_out := _proof.attempt(format(
      'SELECT * FROM public.create_action_plan(%L, %L, %L, NULL, %L, %L::JSONB)',
      c_org_a, '2026-T4', 'ataque', c_admin_b,
      jsonb_build_array(jsonb_build_object('rank', 1, 'lever_id', 'x', 'title', 'x', 'effort', 'baixo',
        'start_week', 1, 'end_week', 1, 'milestone_week', 1, 'weeks_budget', 1,
        'source_lens_id', 'fibt', 'source_wave_id', c_wave_a, 'source_cohort_id', c_a1,
        'source_factor_id', 'bem_estar'))));
    IF v_out <> 'raised:42501' THEN
      v_falhas := v_falhas || format('authenticated invoca create_action_plan (%s)', v_out);
    END IF;
    IF v_item IS NOT NULL THEN
      v_out := _proof.attempt(format(
        'SELECT * FROM public.record_evidence(%L, %L, %L, %L, NULL, %L, %L, %L)',
        v_item, 'texto', 'forjada', 'direct', '2026-08-01', c_admin_b, 'RH_ADMIN'));
      IF v_out <> 'raised:42501' THEN
        v_falhas := v_falhas || format('authenticated invoca record_evidence (%s)', v_out);
      END IF;
      v_out := _proof.attempt(format(
        'SELECT * FROM public.record_action_event(%L, %L, %L, %L, %L, NULL, NULL)',
        v_item, 'status_change', c_admin_b, 'RH_ADMIN', 'em_execucao'));
      IF v_out <> 'raised:42501' THEN
        v_falhas := v_falhas || format('authenticated invoca record_action_event (%s)', v_out);
      END IF;
    END IF;
  END IF;

  EXECUTE 'RESET ROLE';

  -- 3.2 anon: nada.
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
  EXECUTE 'SET LOCAL ROLE anon';
  v_out := _proof.attempt('SELECT COUNT(*) FROM public.action_items');
  IF v_out <> 'raised:42501' THEN
    v_falhas := v_falhas || format('anon lê action_items (%s)', v_out);
  END IF;
  EXECUTE 'RESET ROLE';

  -- 3.3 Admin da organização A: lê as próprias ações (a proteção não virou
  -- indisponibilidade). Só faz sentido onde a RPC criou ações (bloco 1) ou o
  -- bloco 2 deixou o cabeçalho direto.
  PERFORM set_config('request.jwt.claims',
    jsonb_build_object('sub', c_admin_a::TEXT, 'role', 'authenticated')::TEXT, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT COUNT(*) INTO v_n FROM public.action_plans WHERE org_id = c_org_a;
  IF v_n < 1 THEN v_falhas := v_falhas || 'org A não lê os próprios planos'; END IF;
  IF v_rpc THEN
    SELECT COUNT(*) INTO v_n FROM public.action_items
     WHERE org_id = c_org_a AND source_lens_id = 'fibt' AND source_cohort_id = c_a1;
    IF v_n <> 1 THEN v_falhas := v_falhas || format('org A lê %s ação(ões) FIB-T (esperado 1)', v_n); END IF;
    SELECT COUNT(*) INTO v_n FROM public.evidence_records WHERE org_id = c_org_a;
    IF v_n <> 2 THEN v_falhas := v_falhas || format('org A lê %s evidência(s) (esperado 2)', v_n); END IF;
  END IF;
  EXECUTE 'RESET ROLE';
  PERFORM set_config('request.jwt.claims', '', true);

  IF array_length(v_falhas, 1) > 0 THEN
    RAISE EXCEPTION E'FAILED: isolamento do ledger:\n  - %', array_to_string(v_falhas, E'\n  - ');
  END IF;

  RAISE NOTICE 'PROVEN: R6_TENANT_READ=ISOLATED · R6_FOREIGN_WRITE=BLOCKED · R6_DIRECT_WRITE=BLOCKED · R6_CAPSULE_DIRECT_READ=BLOCKED · R6_LEDGER_RPC_AS_CLIENT=BLOCKED · R6_ANON=BLOCKED · R6_OWNER_READ=PASS (authenticated de duas orgs + anon)';
END
$bloco3$;

-- ═══════════════════════════════════════════════════════════════════════════
-- BLOCO 4 · CHECK de completude não pode avaliar para NULL (achado R6-C1)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- PostgreSQL ACEITA linha cujo CHECK avalia para NULL. Com `source_lens_id`
-- ou `source_factor_id` nulos e as demais referências preenchidas, a
-- disjunção `(tudo nulo) OR (lente = 'fibt' AND fator ~ ...)` vira
-- `FALSE OR NULL = NULL` e a meia-proveniência passa. E com lente nula a
-- regra de lift (`lente IS NULL OR lift = 0`) é TRUE para qualquer lift.
-- Este bloco tenta exatamente isso, por INSERT e por UPDATE, como
-- service_role (a proteção tem de ser do banco, não da aplicação), e exige
-- a constraint nomeada na recusa e nenhuma alteração parcial.
CREATE OR REPLACE FUNCTION _proof.violation(p_sql TEXT) RETURNS TEXT
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  v_rows INTEGER;
  v_constraint TEXT;
BEGIN
  EXECUTE p_sql;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN 'executed:' || v_rows;
EXCEPTION
  WHEN check_violation THEN
    GET STACKED DIAGNOSTICS v_constraint = CONSTRAINT_NAME;
    RETURN 'violated:' || v_constraint;
  WHEN OTHERS THEN
    RETURN 'raised:' || SQLSTATE;
END $$;
GRANT EXECUTE ON FUNCTION _proof.violation(TEXT) TO service_role;

DO $bloco4$
DECLARE
  c_org_a   CONSTANT UUID := 'a7000000-0000-4000-8000-0000000000a1';
  c_wave_a  CONSTANT UUID := 'a7000000-0000-4000-8000-0000000000a2';
  c_a1      CONSTANT UUID := 'a7000000-0000-4000-8000-0000000000a3';
  c_admin_a CONSTANT UUID := 'a7000000-0000-4000-8000-0000000000a9';
  c_plano   CONSTANT UUID := 'a7000000-0000-4000-8000-0000000000a6';
  c_valido  CONSTANT UUID := 'a7000000-0000-4000-8000-0000000000a7';
  c_legado  CONSTANT UUID := 'a7000000-0000-4000-8000-0000000000a8';
  v_cols    TEXT := 'plan_id, org_id, rank, lever_id, title, effort, start_week, end_week, milestone_week, weeks_budget';
  v_src     TEXT := 'source_lens_id, source_wave_id, source_cohort_id, source_factor_id, source_instrument_version, source_published_at';
  v_base    TEXT;
  v_out     TEXT;
  v_antes   TEXT;
  v_depois  TEXT;
  v_falhas  TEXT[] := '{}';
  c_completo CONSTANT TEXT[] := ARRAY['violated:action_items_source_complete_ck'];
  c_lift_ou_completo CONSTANT TEXT[] := ARRAY['violated:action_items_source_complete_ck', 'violated:action_items_source_no_ivo_lift_ck'];
BEGIN
  INSERT INTO public.action_plans (id, org_id, cycle_key, season_name, created_by)
  VALUES (c_plano, c_org_a, 'r6-check-null', 'Prova R6 CHECK NULL', c_admin_a)
  ON CONFLICT (id) DO NOTHING;

  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
  EXECUTE 'SET LOCAL ROLE service_role';

  v_base := format('%L, %L, 1, %L, %L, %L, 1, 13, 7, 13', c_plano, c_org_a, 'lever-check', 'Check', 'baixo');

  -- 4.1 INSERT com só source_lens_id nulo.
  v_out := _proof.violation(format('INSERT INTO public.action_items (%s, %s) VALUES (%s, NULL, %L, %L, %L, %L, %L)',
    v_cols, v_src, v_base, c_wave_a, c_a1, 'bem_estar', '1.0.0', '2026-06-20T12:00:00Z'));
  IF NOT v_out = ANY (c_completo) THEN
    v_falhas := v_falhas || format('INSERT com lente nula e demais referências aceito (%s)', v_out);
  END IF;

  -- 4.2 INSERT com só source_factor_id nulo.
  v_out := _proof.violation(format('INSERT INTO public.action_items (%s, %s) VALUES (%s, %L, %L, %L, NULL, %L, %L)',
    v_cols, v_src, v_base, 'fibt', c_wave_a, c_a1, '1.0.0', '2026-06-20T12:00:00Z'));
  IF NOT v_out = ANY (c_completo) THEN
    v_falhas := v_falhas || format('INSERT com fator nulo e demais referências aceito (%s)', v_out);
  END IF;

  -- 4.3 Lente nula, demais referências presentes, lift positivo.
  v_out := _proof.violation(format('INSERT INTO public.action_items (%s, expected_ivo_lift, %s) VALUES (%s, 5, NULL, %L, %L, %L, %L, %L)',
    v_cols, v_src, v_base, c_wave_a, c_a1, 'bem_estar', '1.0.0', '2026-06-20T12:00:00Z'));
  IF NOT v_out = ANY (c_lift_ou_completo) THEN
    v_falhas := v_falhas || format('lente nula com referências e lift 5 aceita (%s)', v_out);
  END IF;

  -- 4.4 Controle: proveniência FIB-T completa e válida.
  v_out := _proof.violation(format('INSERT INTO public.action_items (id, %s, %s) VALUES (%L, %s, %L, %L, %L, %L, %L, %L)',
    v_cols, v_src, c_valido, v_base, 'fibt', c_wave_a, c_a1, 'bem_estar', '1.0.0', '2026-06-20T12:00:00Z'));
  IF v_out <> 'executed:1' THEN
    v_falhas := v_falhas || format('proveniência FIB-T completa recusada (%s)', v_out);
  END IF;

  -- 4.5 Controle: ação legada, todas as referências nulas, lift livre.
  v_out := _proof.violation(format('INSERT INTO public.action_items (id, %s, expected_ivo_lift) VALUES (%L, %s, 2.5)',
    v_cols, c_legado, v_base));
  IF v_out <> 'executed:1' THEN
    v_falhas := v_falhas || format('ação legada sem origem recusada (%s)', v_out);
  END IF;

  SELECT row_to_json(i)::TEXT INTO v_antes FROM public.action_items i WHERE id = c_valido;

  -- 4.6 UPDATE: apagar só a lente de uma ação FIB-T válida.
  v_out := _proof.violation(format('UPDATE public.action_items SET source_lens_id = NULL WHERE id = %L', c_valido));
  IF NOT v_out = ANY (c_completo) THEN
    v_falhas := v_falhas || format('UPDATE lente→NULL aceito (%s)', v_out);
  END IF;

  -- 4.7 UPDATE: apagar só o fator.
  v_out := _proof.violation(format('UPDATE public.action_items SET source_factor_id = NULL WHERE id = %L', c_valido));
  IF NOT v_out = ANY (c_completo) THEN
    v_falhas := v_falhas || format('UPDATE fator→NULL aceito (%s)', v_out);
  END IF;

  -- 4.8 UPDATE: lente→NULL e lift positivo ao mesmo tempo.
  v_out := _proof.violation(format('UPDATE public.action_items SET source_lens_id = NULL, expected_ivo_lift = 7 WHERE id = %L', c_valido));
  IF NOT v_out = ANY (c_lift_ou_completo) THEN
    v_falhas := v_falhas || format('UPDATE lente→NULL com lift 7 aceito (%s)', v_out);
  END IF;

  -- 4.9 UPDATE: dar referências a uma ação legada sem dar lente.
  v_out := _proof.violation(format('UPDATE public.action_items SET source_wave_id = %L, source_cohort_id = %L, source_factor_id = %L, source_instrument_version = %L, source_published_at = %L WHERE id = %L',
    c_wave_a, c_a1, 'bem_estar', '1.0.0', '2026-06-20T12:00:00Z', c_legado));
  IF NOT v_out = ANY (c_lift_ou_completo) THEN
    v_falhas := v_falhas || format('UPDATE de ação legada para meia-proveniência aceito (%s)', v_out);
  END IF;

  SELECT row_to_json(i)::TEXT INTO v_depois FROM public.action_items i WHERE id = c_valido;
  IF v_antes IS DISTINCT FROM v_depois THEN
    v_falhas := v_falhas || 'uma recusa deixou alteração parcial na ação FIB-T válida'::TEXT;
  END IF;
  IF (SELECT source_wave_id FROM public.action_items WHERE id = c_legado) IS NOT NULL THEN
    v_falhas := v_falhas || 'uma recusa deixou alteração parcial na ação legada'::TEXT;
  END IF;

  EXECUTE 'RESET ROLE';
  PERFORM set_config('request.jwt.claims', '', true);

  -- 4.10 Nenhuma linha meia-proveniente sobreviveu no banco de prova.
  -- Contagem de referências presentes: válido é 0 (legado) ou 6 com lente 'fibt'.
  IF EXISTS (
    SELECT 1 FROM public.action_items
     WHERE num_nonnulls(source_lens_id, source_wave_id, source_cohort_id, source_factor_id,
                        source_instrument_version, source_published_at) NOT IN (0, 6)
        OR (num_nonnulls(source_lens_id) = 1 AND source_lens_id <> 'fibt')
  ) THEN
    v_falhas := v_falhas || 'existe ação com proveniência parcial gravada'::TEXT;
  END IF;

  IF array_length(v_falhas, 1) > 0 THEN
    RAISE EXCEPTION E'FAILED: CHECK de completude da proveniência:\n  - %', array_to_string(v_falhas, E'\n  - ');
  END IF;

  RAISE NOTICE 'PROVEN: R6_CHECK_NULL_LENS=BLOCKED · R6_CHECK_NULL_FACTOR=BLOCKED · R6_NULL_LENS_WITH_LIFT=BLOCKED · R6_UPDATE_TO_PARTIAL=BLOCKED · R6_LEGACY_TO_PARTIAL=BLOCKED · R6_NO_PARTIAL_WRITE=PASS · R6_VALID_CONTROLS=PASS (INSERT e UPDATE como service_role)';
END
$bloco4$;

-- ═══════════════════════════════════════════════════════════════════════════
-- LIMPEZA · o banco de prova volta ao estado anterior à suíte
-- ═══════════════════════════════════════════════════════════════════════════
DO $limpeza$
BEGIN
  DELETE FROM public.action_log WHERE org_id IN ('a7000000-0000-4000-8000-0000000000a1', 'a7000000-0000-4000-8000-0000000000b1');
  DELETE FROM public.evidence_records WHERE org_id IN ('a7000000-0000-4000-8000-0000000000a1', 'a7000000-0000-4000-8000-0000000000b1');
  DELETE FROM public.action_items WHERE org_id IN ('a7000000-0000-4000-8000-0000000000a1', 'a7000000-0000-4000-8000-0000000000b1');
  DELETE FROM public.action_plans WHERE org_id IN ('a7000000-0000-4000-8000-0000000000a1', 'a7000000-0000-4000-8000-0000000000b1');
  DELETE FROM public.cohort_capsules WHERE org_id IN ('a7000000-0000-4000-8000-0000000000a1', 'a7000000-0000-4000-8000-0000000000b1');
  DELETE FROM public.wave_cohorts WHERE org_id IN ('a7000000-0000-4000-8000-0000000000a1', 'a7000000-0000-4000-8000-0000000000b1');
  DELETE FROM public.waves WHERE org_id IN ('a7000000-0000-4000-8000-0000000000a1', 'a7000000-0000-4000-8000-0000000000b1');
  DELETE FROM public.profiles WHERE id IN ('a7000000-0000-4000-8000-0000000000a9', 'a7000000-0000-4000-8000-0000000000b9');
  DELETE FROM auth.users WHERE id IN ('a7000000-0000-4000-8000-0000000000a9', 'a7000000-0000-4000-8000-0000000000b9');
  DELETE FROM public.organizations WHERE id IN ('a7000000-0000-4000-8000-0000000000a1', 'a7000000-0000-4000-8000-0000000000b1');
END
$limpeza$;
