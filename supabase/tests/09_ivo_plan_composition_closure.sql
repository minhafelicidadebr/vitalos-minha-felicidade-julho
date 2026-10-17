-- ═══════════════════════════════════════════════════════════════════════════
-- PROVA EXECUTÁVEL · INCLUSÃO DE AÇÃO EM PLANO EXISTENTE E ENCERRAMENTO (IVO PI-13)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Migration sob prova: 20261016120000_ivo_plan_composition_and_closure.sql.
--
-- O que esta suíte prova no BANCO (não na aplicação):
--   1. Inclusão: rank atribuído sob trava do plano; origem FIB-T revalidada
--      (mesma organização, instrumento, leitura PUBLICADA) com versão e instante
--      de publicação DERIVADOS (o valor enviado pelo chamador é ignorado); plano
--      de outra organização ou inexistente é recusado.
--   2. Idempotência: o MESMO pedido (plan_id, add_request_id) não duplica;
--      pedidos distintos e parecidos viram duas ações.
--   3. Plano ativo só recebe ação com o §13 completo; nasce em rascunho; só há
--      draft→active e active→closed.
--   4. Encerramento: exige plano ativo, não vazio e TODAS as ações em estado
--      operacional de saída; autor e papel obrigatórios; instante definido pelo
--      banco; repetir não altera nada; closed é terminal (sem reabertura).
--   5. Plano encerrado não aceita ação, mudança de ação, evidência nem evento;
--      as linhas anteriores seguem legíveis; a avaliação de eficácia (C8) não é
--      tocada pelo encerramento e continua possível.
--   6. Superfície: gatilhos fora de public, sem EXECUTE/USAGE para papéis de API;
--      authenticated de outra organização não lê nem escreve; anon nada.
--
-- Papéis: service_role (caminho do servidor), authenticated (JWT de admin de cada
-- organização), anon. A concorrência real (duas sessões) é provada em
-- scripts/ivo-local-plan-proof.ts; aqui as travas são provadas pelas regras que
-- dependem delas (contagem de pendências no encerramento, rank).
-- Roda nos três modos do replay (as tabelas do ledger existem nos três).
-- ═══════════════════════════════════════════════════════════════════════════

\set ON_ERROR_STOP on

CREATE SCHEMA IF NOT EXISTS _proof;

-- Resultado textual: executed:<linhas> | raised:<SQLSTATE>:<mensagem>.
CREATE OR REPLACE FUNCTION _proof.pi13_attempt(p_sql TEXT) RETURNS TEXT
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  v_rows INTEGER;
BEGIN
  EXECUTE p_sql;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN 'executed:' || v_rows;
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'raised:' || SQLSTATE || ':' || SQLERRM;
END $$;

-- Lista vazia se o resultado começa com o esperado; senão uma mensagem de falha.
CREATE OR REPLACE FUNCTION _proof.pi13_expect(p_label TEXT, p_sql TEXT, p_expected TEXT) RETURNS TEXT[]
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  v_got TEXT := _proof.pi13_attempt(p_sql);
BEGIN
  IF v_got LIKE p_expected || '%' THEN
    RETURN '{}';
  END IF;
  RETURN ARRAY[format('%s: esperado %s, obtido %s', p_label, p_expected, v_got)];
END $$;

-- INSERT de ação mínima; p_extra_cols/p_extra_vals já formatados pelo chamador.
CREATE OR REPLACE FUNCTION _proof.pi13_item_sql(
  p_id UUID, p_plan UUID, p_org UUID, p_title TEXT, p_extra_cols TEXT DEFAULT '', p_extra_vals TEXT DEFAULT ''
) RETURNS TEXT LANGUAGE sql AS $$
  SELECT format(
    'INSERT INTO public.action_items (id, plan_id, org_id, lever_id, title, effort, start_week, end_week, milestone_week, weeks_budget%s) VALUES (%L, %L, %L, %L, %L, %L, 1, 13, 7, 13%s)',
    p_extra_cols, p_id, p_plan, p_org, 'fibt:pi13', p_title, 'medio', p_extra_vals);
$$;

GRANT USAGE ON SCHEMA _proof TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION _proof.pi13_attempt(TEXT), _proof.pi13_expect(TEXT, TEXT, TEXT),
  _proof.pi13_item_sql(UUID, UUID, UUID, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- LIMPEZA + FIXTURES · duas organizações fictícias, uma onda FIB-T cada.
-- A limpeza inicial torna a suíte reexecutável; a final devolve o banco limpo.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION _proof.pi13_cleanup() RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM public.cohort_capsules WHERE org_id IN ('a9000000-0000-4000-8000-0000000000a1', 'a9000000-0000-4000-8000-0000000000b1');
  DELETE FROM public.action_plans WHERE org_id IN ('a9000000-0000-4000-8000-0000000000a1', 'a9000000-0000-4000-8000-0000000000b1');
  DELETE FROM public.wave_cohorts WHERE org_id IN ('a9000000-0000-4000-8000-0000000000a1', 'a9000000-0000-4000-8000-0000000000b1');
  DELETE FROM public.waves WHERE org_id IN ('a9000000-0000-4000-8000-0000000000a1', 'a9000000-0000-4000-8000-0000000000b1');
  DELETE FROM public.profiles WHERE org_id IN ('a9000000-0000-4000-8000-0000000000a1', 'a9000000-0000-4000-8000-0000000000b1');
  DELETE FROM public.organizations WHERE id IN ('a9000000-0000-4000-8000-0000000000a1', 'a9000000-0000-4000-8000-0000000000b1');
  DELETE FROM auth.users WHERE id IN ('a9000000-0000-4000-8000-0000000000a9', 'a9000000-0000-4000-8000-0000000000b9');
END $$;

DO $fixtures$
BEGIN
  IF to_regclass('public.action_plans') IS NULL OR to_regnamespace('ivo_ledger') IS NULL THEN
    RAISE NOTICE 'PROVEN: PI13_PATH=SKIP (ledger ou schema ivo_ledger ausente neste banco)';
    RETURN;
  END IF;
  PERFORM _proof.pi13_cleanup();

  INSERT INTO public.organizations (id, slug, name) VALUES
    ('a9000000-0000-4000-8000-0000000000a1', 'org-ficticia-pi13-a', 'Org Fictícia PI13 A'),
    ('a9000000-0000-4000-8000-0000000000b1', 'org-ficticia-pi13-b', 'Org Fictícia PI13 B');
  INSERT INTO auth.users (id, email) VALUES
    ('a9000000-0000-4000-8000-0000000000a9', 'admin-pi13-a@exemplo.invalid'),
    ('a9000000-0000-4000-8000-0000000000b9', 'admin-pi13-b@exemplo.invalid');
  INSERT INTO public.profiles (id, org_id, role, display_name) VALUES
    ('a9000000-0000-4000-8000-0000000000a9', 'a9000000-0000-4000-8000-0000000000a1', 'RH_ADMIN', 'Admin PI13 A'),
    ('a9000000-0000-4000-8000-0000000000b9', 'a9000000-0000-4000-8000-0000000000b1', 'RH_ADMIN', 'Admin PI13 B');
  INSERT INTO public.waves (id, org_id, instrument, instrument_version, label, status) VALUES
    ('a9000000-0000-4000-8000-0000000000a2', 'a9000000-0000-4000-8000-0000000000a1', 'FIB_T', '1.0.0', 'Onda PI13 A', 'collecting'),
    ('a9000000-0000-4000-8000-0000000000b2', 'a9000000-0000-4000-8000-0000000000b1', 'FIB_T', '1.0.0', 'Onda PI13 B', 'collecting');
  INSERT INTO public.wave_cohorts (id, org_id, wave_id, key, label) VALUES
    ('a9000000-0000-4000-8000-0000000000a3', 'a9000000-0000-4000-8000-0000000000a1', 'a9000000-0000-4000-8000-0000000000a2', 'pi13-a1', 'Setor A1'),
    ('a9000000-0000-4000-8000-0000000000a4', 'a9000000-0000-4000-8000-0000000000a1', 'a9000000-0000-4000-8000-0000000000a2', 'pi13-a2', 'Setor A2'),
    ('a9000000-0000-4000-8000-0000000000b3', 'a9000000-0000-4000-8000-0000000000b1', 'a9000000-0000-4000-8000-0000000000b2', 'pi13-b1', 'Setor B1');
  INSERT INTO public.cohort_capsules
    (org_id, wave_id, cohort_id, published_response_count, published_response_ids, item_means, published_at)
  VALUES
    ('a9000000-0000-4000-8000-0000000000a1', 'a9000000-0000-4000-8000-0000000000a2',
     'a9000000-0000-4000-8000-0000000000a3', 7, '{}', '{"1": 2.5}', '2026-06-20T12:00:00Z'),
    ('a9000000-0000-4000-8000-0000000000b1', 'a9000000-0000-4000-8000-0000000000b2',
     'a9000000-0000-4000-8000-0000000000b3', 8, '{}', '{"1": 3.0}', '2026-06-21T12:00:00Z'),
    -- A2: linha de baseline (marca d'água, nada publicado) — não pode embasar ação.
    ('a9000000-0000-4000-8000-0000000000a1', 'a9000000-0000-4000-8000-0000000000a2',
     'a9000000-0000-4000-8000-0000000000a4', NULL, '{}', NULL, NULL);
  INSERT INTO public.action_plans (id, org_id, cycle_key, season_name, created_by) VALUES
    ('a9000000-0000-4000-8000-0000000000c1', 'a9000000-0000-4000-8000-0000000000a1', 'pi13-p1', 'Plano principal', 'a9000000-0000-4000-8000-0000000000a9'),
    ('a9000000-0000-4000-8000-0000000000c2', 'a9000000-0000-4000-8000-0000000000a1', 'pi13-p2', 'Plano rascunho', 'a9000000-0000-4000-8000-0000000000a9'),
    ('a9000000-0000-4000-8000-0000000000c3', 'a9000000-0000-4000-8000-0000000000a1', 'pi13-p3', 'Plano vazio', 'a9000000-0000-4000-8000-0000000000a9'),
    ('a9000000-0000-4000-8000-0000000000c4', 'a9000000-0000-4000-8000-0000000000b1', 'pi13-p4', 'Plano da outra organização', 'a9000000-0000-4000-8000-0000000000b9');
END
$fixtures$;

-- ═══════════════════════════════════════════════════════════════════════════
-- BLOCO 1 · inclusão em plano em rascunho (service_role)
-- ═══════════════════════════════════════════════════════════════════════════
DO $bloco1$
DECLARE
  c_a    CONSTANT UUID := 'a9000000-0000-4000-8000-0000000000a1';
  c_b    CONSTANT UUID := 'a9000000-0000-4000-8000-0000000000b1';
  c_wa   CONSTANT UUID := 'a9000000-0000-4000-8000-0000000000a2';
  c_wb   CONSTANT UUID := 'a9000000-0000-4000-8000-0000000000b2';
  c_a1   CONSTANT UUID := 'a9000000-0000-4000-8000-0000000000a3';
  c_a2   CONSTANT UUID := 'a9000000-0000-4000-8000-0000000000a4';
  c_b1   CONSTANT UUID := 'a9000000-0000-4000-8000-0000000000b3';
  c_ua   CONSTANT UUID := 'a9000000-0000-4000-8000-0000000000a9';
  c_p1   CONSTANT UUID := 'a9000000-0000-4000-8000-0000000000c1';
  c_p4   CONSTANT UUID := 'a9000000-0000-4000-8000-0000000000c4';
  c_r1   CONSTANT UUID := 'a9000000-0000-4000-8000-0000000000e1';
  c_r2   CONSTANT UUID := 'a9000000-0000-4000-8000-0000000000e2';
  v_cols TEXT := ', source_lens_id, source_wave_id, source_cohort_id, source_factor_id, source_instrument_version, source_published_at';
  v_row  RECORD;
  v_n    INTEGER;
  v_f    TEXT[] := '{}';
BEGIN
  IF to_regnamespace('ivo_ledger') IS NULL OR to_regclass('public.action_plans') IS NULL THEN RETURN; END IF;
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
  EXECUTE 'SET LOCAL ROLE service_role';

  -- 1.1 origem válida; versão e instante enviados pelo chamador são IGNORADOS.
  v_f := v_f || _proof.pi13_expect('inclusão com origem publicada', _proof.pi13_item_sql(
    'a9000000-0000-4000-8000-0000000000d1', c_p1, c_a, 'Ação 1',
    v_cols, format(', %L, %L, %L, %L, %L, %L', 'fibt', c_wa, c_a1, 'bem_estar', '9.9.9', '2000-01-01T00:00:00Z')), 'executed:1');
  SELECT rank, source_instrument_version AS v, source_published_at AS p INTO v_row
    FROM public.action_items WHERE id = 'a9000000-0000-4000-8000-0000000000d1';
  IF v_row.rank IS DISTINCT FROM 1 THEN v_f := v_f || format('rank da primeira ação: %s (esperado 1)', v_row.rank); END IF;
  IF v_row.v IS DISTINCT FROM '1.0.0' THEN v_f := v_f || format('versão não derivada do banco: %s', v_row.v); END IF;
  IF v_row.p IS DISTINCT FROM '2026-06-20T12:00:00Z'::TIMESTAMPTZ THEN v_f := v_f || format('publicação não derivada do banco: %s', v_row.p); END IF;

  -- 1.2 duas ações parecidas (mesma origem) coexistem; rank segue max+1.
  v_f := v_f || _proof.pi13_expect('segunda ação de mesma origem', _proof.pi13_item_sql(
    'a9000000-0000-4000-8000-0000000000d2', c_p1, c_a, 'Ação 1',
    v_cols, format(', %L, %L, %L, %L, %L, %L', 'fibt', c_wa, c_a1, 'bem_estar', '1.0.0', '2026-06-20T12:00:00Z')), 'executed:1');
  IF (SELECT rank FROM public.action_items WHERE id = 'a9000000-0000-4000-8000-0000000000d2') IS DISTINCT FROM 2 THEN
    v_f := v_f || 'rank da segunda ação não é 2';
  END IF;

  -- 1.3 origem de outra organização / coorte alheia / não publicada.
  v_f := v_f || _proof.pi13_expect('origem de outra organização', _proof.pi13_item_sql(
    'a9000000-0000-4000-8000-0000000000d9', c_p1, c_a, 'Cruzada',
    v_cols, format(', %L, %L, %L, %L, %L, %L', 'fibt', c_wb, c_b1, 'bem_estar', '1.0.0', '2026-06-21T12:00:00Z')), 'raised:23503:ivo_plan_origin_denied');
  v_f := v_f || _proof.pi13_expect('coorte de outra onda', _proof.pi13_item_sql(
    'a9000000-0000-4000-8000-0000000000d9', c_p1, c_a, 'Cruzada',
    v_cols, format(', %L, %L, %L, %L, %L, %L', 'fibt', c_wa, c_b1, 'bem_estar', '1.0.0', '2026-06-21T12:00:00Z')), 'raised:23503:ivo_plan_origin_denied');
  v_f := v_f || _proof.pi13_expect('coorte sem leitura publicada', _proof.pi13_item_sql(
    'a9000000-0000-4000-8000-0000000000d9', c_p1, c_a, 'Protegida',
    v_cols, format(', %L, %L, %L, %L, %L, %L', 'fibt', c_wa, c_a2, 'bem_estar', '1.0.0', '2026-06-20T12:00:00Z')), 'raised:23514:ivo_plan_source_not_published');

  -- 1.4 plano de outra organização / inexistente.
  v_f := v_f || _proof.pi13_expect('ação da org A em plano da org B', _proof.pi13_item_sql(
    'a9000000-0000-4000-8000-0000000000d9', c_p4, c_a, 'Alheia'), 'raised:23503:ivo_plan_not_found');
  v_f := v_f || _proof.pi13_expect('ação da org B em plano da org A', _proof.pi13_item_sql(
    'a9000000-0000-4000-8000-0000000000d9', c_p1, c_b, 'Alheia'), 'raised:23503:ivo_plan_not_found');
  v_f := v_f || _proof.pi13_expect('plano inexistente', _proof.pi13_item_sql(
    'a9000000-0000-4000-8000-0000000000d9', 'a9000000-0000-4000-8000-0000000000ff', c_a, 'Sem plano'), 'raised:23503:ivo_plan_not_found');

  -- 1.5 idempotência: mesmo pedido não duplica; pedidos distintos viram duas ações.
  v_f := v_f || _proof.pi13_expect('primeiro pedido', _proof.pi13_item_sql(
    'a9000000-0000-4000-8000-0000000000d3', c_p1, c_a, 'Ação repetível',
    v_cols || ', add_request_id, added_by, added_by_role',
    format(', %L, %L, %L, %L, %L, %L, %L, %L, %L', 'fibt', c_wa, c_a1, 'bem_estar', '1.0.0', '2026-06-20T12:00:00Z', c_r1, c_ua, 'RH_ADMIN')), 'executed:1');
  v_f := v_f || _proof.pi13_expect('repetição do mesmo pedido', _proof.pi13_item_sql(
    'a9000000-0000-4000-8000-0000000000da', c_p1, c_a, 'Ação repetível',
    v_cols || ', add_request_id, added_by, added_by_role',
    format(', %L, %L, %L, %L, %L, %L, %L, %L, %L', 'fibt', c_wa, c_a1, 'bem_estar', '1.0.0', '2026-06-20T12:00:00Z', c_r1, c_ua, 'RH_ADMIN')), 'raised:23505');
  v_f := v_f || _proof.pi13_expect('pedido distinto e parecido', _proof.pi13_item_sql(
    'a9000000-0000-4000-8000-0000000000d4', c_p1, c_a, 'Ação repetível',
    v_cols || ', add_request_id, added_by, added_by_role',
    format(', %L, %L, %L, %L, %L, %L, %L, %L, %L', 'fibt', c_wa, c_a1, 'bem_estar', '1.0.0', '2026-06-20T12:00:00Z', c_r2, c_ua, 'RH_ADMIN')), 'executed:1');
  SELECT COUNT(*) INTO v_n FROM public.action_items WHERE plan_id = c_p1;
  IF v_n <> 4 THEN v_f := v_f || format('plano com %s ações (esperado 4: 2 + pedido repetido 1x + pedido distinto)', v_n); END IF;

  -- 1.6 auditoria de inclusão: tudo ou nada; imutável.
  v_f := v_f || _proof.pi13_expect('auditoria de inclusão incompleta', _proof.pi13_item_sql(
    'a9000000-0000-4000-8000-0000000000d9', c_p1, c_a, 'Incompleta', ', add_request_id', format(', %L', 'a9000000-0000-4000-8000-0000000000e9')), 'raised:23514');
  v_f := v_f || _proof.pi13_expect('alterar chave de idempotência', format(
    $q$UPDATE public.action_items SET add_request_id = %L WHERE id = 'a9000000-0000-4000-8000-0000000000d3'$q$, 'a9000000-0000-4000-8000-0000000000e8'),
    'raised:42501:ivo_plan_item_audit_immutable');

  EXECUTE 'RESET ROLE';
  PERFORM set_config('request.jwt.claims', '', true);
  IF array_length(v_f, 1) > 0 THEN
    RAISE EXCEPTION E'FAILED: inclusão em plano em rascunho:\n  - %', array_to_string(v_f, E'\n  - ');
  END IF;
  RAISE NOTICE 'PROVEN: PI13_ADD_RANK=PASS · PI13_ORIGIN_DERIVED=PASS · PI13_ORIGIN_CROSS_TENANT=DENIED · PI13_ORIGIN_UNPUBLISHED=DENIED · PI13_FOREIGN_PLAN=DENIED · PI13_IDEMPOTENT_REQUEST=PASS · PI13_DISTINCT_SIMILAR=BOTH_KEPT';
END
$bloco1$;

-- ═══════════════════════════════════════════════════════════════════════════
-- BLOCO 2 · plano ativo: §13 na inclusão; transições do plano
-- ═══════════════════════════════════════════════════════════════════════════
DO $bloco2$
DECLARE
  c_a    CONSTANT UUID := 'a9000000-0000-4000-8000-0000000000a1';
  c_ua   CONSTANT UUID := 'a9000000-0000-4000-8000-0000000000a9';
  c_p1   CONSTANT UUID := 'a9000000-0000-4000-8000-0000000000c1';
  c_p2   CONSTANT UUID := 'a9000000-0000-4000-8000-0000000000c2';
  c_p3   CONSTANT UUID := 'a9000000-0000-4000-8000-0000000000c3';
  v_f    TEXT[] := '{}';
  v_full TEXT;
BEGIN
  IF to_regnamespace('ivo_ledger') IS NULL OR to_regclass('public.action_plans') IS NULL THEN RETURN; END IF;
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
  EXECUTE 'SET LOCAL ROLE service_role';

  -- §13 completo nas quatro ações existentes (como set_action_item_accountability faria).
  UPDATE public.action_items SET owner_user_id = c_ua, owner_role_label = 'Gestão de pessoas', due_on = '2026-12-15',
         metric_label = 'Encontros realizados', metric_baseline = 0, metric_target = 4, metric_unit = 'encontros'
   WHERE plan_id = c_p1;
  v_f := v_f || _proof.pi13_expect('ativar plano', format(
    $q$UPDATE public.action_plans SET status = 'active', activated_at = NOW() WHERE id = %L$q$, c_p1), 'executed:1');

  -- 2.1 plano ativo recusa ação sem accountability (nenhuma, ou parcial).
  v_f := v_f || _proof.pi13_expect('ativo sem accountability', _proof.pi13_item_sql(
    'a9000000-0000-4000-8000-0000000000d5', c_p1, c_a, 'Sem dono'), 'raised:23514:ivo_plan_active_needs_accountability');
  v_f := v_f || _proof.pi13_expect('ativo só com responsável', _proof.pi13_item_sql(
    'a9000000-0000-4000-8000-0000000000d5', c_p1, c_a, 'Só dono', ', owner_user_id, owner_role_label', format(', %L, %L', c_ua, 'Gestão')),
    'raised:23514:ivo_plan_active_needs_accountability');
  -- 2.2 com o §13 completo entra, no fim da fila.
  v_full := ', owner_user_id, owner_role_label, due_on, metric_label, metric_baseline, metric_target, metric_unit, add_request_id, added_by, added_by_role';
  v_f := v_f || _proof.pi13_expect('ativo com §13 completo', _proof.pi13_item_sql(
    'a9000000-0000-4000-8000-0000000000d5', c_p1, c_a, 'Ação no plano ativo', v_full,
    format(', %L, %L, %L, %L, %L, %L, %L, %L, %L, %L', c_ua, 'Gestão de pessoas', '2026-12-20', 'Oficinas', 0, 2, 'oficinas',
      'a9000000-0000-4000-8000-0000000000e3', c_ua, 'RH_ADMIN')), 'executed:1');
  IF (SELECT rank FROM public.action_items WHERE id = 'a9000000-0000-4000-8000-0000000000d5') IS DISTINCT FROM 5 THEN
    v_f := v_f || 'rank da ação no plano ativo não é 5';
  END IF;

  -- 2.3 transições do plano.
  v_f := v_f || _proof.pi13_expect('rascunho→encerrado', format(
    $q$UPDATE public.action_plans SET status = 'closed', closed_by = %L, closed_by_role = 'RH_ADMIN' WHERE id = %L$q$, c_ua, c_p2),
    'raised:55000:ivo_plan_close_requires_active');
  v_f := v_f || _proof.pi13_expect('plano nasce direto ativo', format(
    $q$INSERT INTO public.action_plans (org_id, cycle_key, season_name, created_by, status) VALUES (%L, 'pi13-direto', 'x', %L, 'active')$q$, c_a, c_ua),
    'raised:23514:ivo_plan_insert_must_be_draft');
  v_f := v_f || _proof.pi13_expect('ativo→rascunho', format(
    $q$UPDATE public.action_plans SET status = 'draft' WHERE id = %L$q$, c_p1), 'raised:55000:ivo_plan_status_transition_invalid');
  -- 2.4 plano ativo e vazio não encerra.
  v_f := v_f || _proof.pi13_expect('ativar plano vazio', format(
    $q$UPDATE public.action_plans SET status = 'active', activated_at = NOW() WHERE id = %L$q$, c_p3), 'executed:1');
  v_f := v_f || _proof.pi13_expect('encerrar plano vazio', format(
    $q$UPDATE public.action_plans SET status = 'closed', closed_by = %L, closed_by_role = 'RH_ADMIN' WHERE id = %L$q$, c_ua, c_p3),
    'raised:55000:ivo_plan_close_empty');

  EXECUTE 'RESET ROLE';
  PERFORM set_config('request.jwt.claims', '', true);
  IF array_length(v_f, 1) > 0 THEN
    RAISE EXCEPTION E'FAILED: plano ativo e transições:\n  - %', array_to_string(v_f, E'\n  - ');
  END IF;
  RAISE NOTICE 'PROVEN: PI13_ACTIVE_NEEDS_ACCOUNTABILITY=ENFORCED · PI13_PLAN_NASCE_RASCUNHO=PASS · PI13_TRANSITIONS=ONLY_DRAFT_ACTIVE_CLOSED · PI13_CLOSE_EMPTY=DENIED';
END
$bloco2$;

-- ═══════════════════════════════════════════════════════════════════════════
-- BLOCO 3 · encerramento: pendências, autor, repetição, terminalidade, C8 intacto
-- ═══════════════════════════════════════════════════════════════════════════
DO $bloco3$
DECLARE
  c_a    CONSTANT UUID := 'a9000000-0000-4000-8000-0000000000a1';
  c_ua   CONSTANT UUID := 'a9000000-0000-4000-8000-0000000000a9';
  c_p1   CONSTANT UUID := 'a9000000-0000-4000-8000-0000000000c1';
  c_i1   CONSTANT UUID := 'a9000000-0000-4000-8000-0000000000d1';
  c_i2   CONSTANT UUID := 'a9000000-0000-4000-8000-0000000000d2';
  v_c8   BOOLEAN := to_regclass('public.efficacy_protocols') IS NOT NULL;
  v_f    TEXT[] := '{}';
  v_plan RECORD;
  v_md5_antes  TEXT;
  v_md5_depois TEXT;
  v_closed_at  TIMESTAMPTZ;
  v_close TEXT := format($q$UPDATE public.action_plans SET status = 'closed', closed_by = %L, closed_by_role = 'RH_ADMIN' WHERE id = %L$q$, c_ua, c_p1);
BEGIN
  IF to_regnamespace('ivo_ledger') IS NULL OR to_regclass('public.action_plans') IS NULL THEN RETURN; END IF;
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
  EXECUTE 'SET LOCAL ROLE service_role';

  -- Protocolo C8 (rascunho) numa das ações, ANTES do encerramento.
  IF v_c8 THEN
    EXECUTE format($q$INSERT INTO public.efficacy_protocols (id, org_id, item_id, revision, created_by, objective)
      VALUES ('a9000000-0000-4000-8000-0000000000f1', %L, %L, 1, %L, 'Objetivo sintético PI-13')$q$, c_a, c_i1, c_ua);
    SELECT md5(string_agg(row_to_json(p)::TEXT, '|' ORDER BY p.id)) INTO v_md5_antes FROM public.efficacy_protocols p WHERE org_id = c_a;
  END IF;

  -- 3.1 cinco ações planejadas: encerramento recusado; plano continua ativo e intacto.
  v_f := v_f || _proof.pi13_expect('encerrar com pendências', v_close, 'raised:55000:ivo_plan_close_pending');
  SELECT status, closed_at, closed_by INTO v_plan FROM public.action_plans WHERE id = c_p1;
  IF v_plan.status <> 'active' OR v_plan.closed_at IS NOT NULL OR v_plan.closed_by IS NOT NULL THEN
    v_f := v_f || 'encerramento recusado deixou rastro no plano';
  END IF;
  -- 3.2 autor e papel são obrigatórios.
  UPDATE public.action_items SET status = 'concluida' WHERE plan_id = c_p1 AND id <> 'a9000000-0000-4000-8000-0000000000d5';
  UPDATE public.action_items SET status = 'em_vigilancia' WHERE id = c_i2;
  UPDATE public.action_items SET status = 'interrompida' WHERE id = 'a9000000-0000-4000-8000-0000000000d4';
  v_f := v_f || _proof.pi13_expect('encerrar com 1 ação ainda planejada', v_close, 'raised:55000:ivo_plan_close_pending');
  UPDATE public.action_items SET status = 'em_execucao' WHERE id = 'a9000000-0000-4000-8000-0000000000d5';
  v_f := v_f || _proof.pi13_expect('encerrar com 1 ação em execução', v_close, 'raised:55000:ivo_plan_close_pending');
  UPDATE public.action_items SET status = 'concluida' WHERE id = 'a9000000-0000-4000-8000-0000000000d5';
  v_f := v_f || _proof.pi13_expect('encerrar sem autor', format(
    $q$UPDATE public.action_plans SET status = 'closed' WHERE id = %L$q$, c_p1), 'raised:23514:ivo_plan_close_needs_actor');
  v_f := v_f || _proof.pi13_expect('encerrar sem papel', format(
    $q$UPDATE public.action_plans SET status = 'closed', closed_by = %L WHERE id = %L$q$, c_ua, c_p1), 'raised:23514:ivo_plan_close_needs_actor');

  -- 3.3 todas em estado de saída (concluída, em vigilância, interrompida): encerra.
  -- O instante enviado pelo chamador é ignorado: quem define é o banco.
  v_f := v_f || _proof.pi13_expect('encerrar plano completo', format(
    $q$UPDATE public.action_plans SET status = 'closed', closed_at = '2000-01-01T00:00:00Z', closed_by = %L, closed_by_role = 'RH_ADMIN' WHERE id = %L AND status = 'active'$q$, c_ua, c_p1),
    'executed:1');
  SELECT status, closed_at, closed_by, closed_by_role INTO v_plan FROM public.action_plans WHERE id = c_p1;
  v_closed_at := v_plan.closed_at;
  IF v_plan.status <> 'closed' OR v_plan.closed_by IS DISTINCT FROM c_ua OR v_plan.closed_by_role IS DISTINCT FROM 'RH_ADMIN' THEN
    v_f := v_f || 'auditoria do encerramento incompleta';
  END IF;
  IF v_closed_at IS NULL OR v_closed_at < NOW() - INTERVAL '1 hour' THEN
    v_f := v_f || format('closed_at não foi definido pelo banco (%s)', v_closed_at);
  END IF;

  -- 3.4 repetir o encerramento (UPDATE condicional) não grava nada.
  v_f := v_f || _proof.pi13_expect('repetir encerramento (condicional)', format(
    $q$UPDATE public.action_plans SET status = 'closed', closed_by = %L, closed_by_role = 'RH_ADMIN' WHERE id = %L AND status = 'active'$q$, c_ua, c_p1),
    'executed:0');
  IF (SELECT closed_at FROM public.action_plans WHERE id = c_p1) IS DISTINCT FROM v_closed_at THEN
    v_f := v_f || 'repetir o encerramento alterou closed_at';
  END IF;

  -- 3.5 closed é terminal: sem reabrir, sem reescrever, sem adulterar a auditoria.
  v_f := v_f || _proof.pi13_expect('repetir sem condição', v_close, 'raised:55000:ivo_plan_closed_is_immutable');
  v_f := v_f || _proof.pi13_expect('reabrir', format(
    $q$UPDATE public.action_plans SET status = 'active' WHERE id = %L$q$, c_p1), 'raised:55000:ivo_plan_closed_is_immutable');
  v_f := v_f || _proof.pi13_expect('adulterar closed_by', format(
    $q$UPDATE public.action_plans SET closed_by = NULL WHERE id = %L$q$, c_p1), 'raised:55000:ivo_plan_closed_is_immutable');

  -- 3.6 C8: o encerramento não tocou protocolos; a avaliação segue possível.
  IF v_c8 THEN
    SELECT md5(string_agg(row_to_json(p)::TEXT, '|' ORDER BY p.id)) INTO v_md5_depois FROM public.efficacy_protocols p WHERE org_id = c_a;
    IF v_md5_antes IS DISTINCT FROM v_md5_depois THEN v_f := v_f || 'o encerramento alterou protocolos C8'; END IF;
    v_f := v_f || _proof.pi13_expect('novo rascunho C8 em plano encerrado', format(
      $q$INSERT INTO public.efficacy_protocols (org_id, item_id, revision, created_by) VALUES (%L, %L, 1, %L)$q$, c_a, c_i2, c_ua), 'executed:1');
    v_f := v_f || _proof.pi13_expect('editar rascunho C8 em plano encerrado', format(
      $q$UPDATE public.efficacy_protocols SET objective = 'Avaliação segue possível' WHERE id = 'a9000000-0000-4000-8000-0000000000f1'$q$), 'executed:1');
  END IF;

  EXECUTE 'RESET ROLE';
  PERFORM set_config('request.jwt.claims', '', true);
  IF array_length(v_f, 1) > 0 THEN
    RAISE EXCEPTION E'FAILED: encerramento:\n  - %', array_to_string(v_f, E'\n  - ');
  END IF;
  RAISE NOTICE 'PROVEN: PI13_CLOSE_PENDING=DENIED · PI13_CLOSE_NEEDS_ACTOR=ENFORCED · PI13_CLOSE_AUDIT=BANCO_DEFINE_INSTANTE · PI13_CLOSE_REPEAT=NO_WRITE · PI13_CLOSED_TERMINAL=NO_REOPEN · PI13_C8_UNTOUCHED=%', CASE WHEN v_c8 THEN 'CHECKSUM_IGUAL_E_AVALIACAO_SEGUE' ELSE 'SKIP(sem C8)' END;
END
$bloco3$;

-- ═══════════════════════════════════════════════════════════════════════════
-- BLOCO 4 · plano encerrado: nada novo, nada alterado; histórico legível
-- ═══════════════════════════════════════════════════════════════════════════
DO $bloco4$
DECLARE
  c_a    CONSTANT UUID := 'a9000000-0000-4000-8000-0000000000a1';
  c_ua   CONSTANT UUID := 'a9000000-0000-4000-8000-0000000000a9';
  c_p1   CONSTANT UUID := 'a9000000-0000-4000-8000-0000000000c1';
  c_i1   CONSTANT UUID := 'a9000000-0000-4000-8000-0000000000d1';
  v_f    TEXT[] := '{}';
  v_n    INTEGER;
  v_full TEXT := ', owner_user_id, owner_role_label, due_on, metric_label, metric_baseline, metric_target, metric_unit';
BEGIN
  IF to_regnamespace('ivo_ledger') IS NULL OR to_regclass('public.action_plans') IS NULL THEN RETURN; END IF;
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
  EXECUTE 'SET LOCAL ROLE service_role';

  v_f := v_f || _proof.pi13_expect('ação nova em plano encerrado', _proof.pi13_item_sql(
    'a9000000-0000-4000-8000-0000000000d6', c_p1, c_a, 'Tarde demais', v_full,
    format(', %L, %L, %L, %L, %L, %L, %L', c_ua, 'Gestão', '2026-12-20', 'x', 0, 1, 'u')), 'raised:55000:ivo_plan_closed');
  v_f := v_f || _proof.pi13_expect('editar ação de plano encerrado', format(
    $q$UPDATE public.action_items SET title = 'Reescrita' WHERE id = %L$q$, c_i1), 'raised:55000:ivo_plan_closed');
  v_f := v_f || _proof.pi13_expect('mudar estado de ação de plano encerrado', format(
    $q$UPDATE public.action_items SET status = 'em_execucao' WHERE id = %L$q$, c_i1), 'raised:55000:ivo_plan_closed');
  v_f := v_f || _proof.pi13_expect('evidência em plano encerrado', format(
    $q$INSERT INTO public.evidence_records (org_id, item_id, lever_id, evidence_kind, content_ref, occurred_on, recorded_by) VALUES (%L, %L, 'fibt:pi13', 'texto', 'tarde', '2026-08-01', %L)$q$, c_a, c_i1, c_ua),
    'raised:55000:ivo_plan_closed');
  v_f := v_f || _proof.pi13_expect('evento de ledger em plano encerrado', format(
    $q$INSERT INTO public.action_log (item_id, org_id, event_kind, actor_user_id, actor_role_label, note) VALUES (%L, %L, 'note', %L, 'RH_ADMIN', 'tarde')$q$, c_i1, c_a, c_ua),
    'raised:55000:ivo_plan_closed');

  -- Histórico intacto e legível.
  SELECT COUNT(*) INTO v_n FROM public.action_items WHERE plan_id = c_p1;
  IF v_n <> 5 THEN v_f := v_f || format('plano encerrado com %s ações (esperado 5)', v_n); END IF;
  IF (SELECT title FROM public.action_items WHERE id = c_i1) <> 'Ação 1' THEN v_f := v_f || 'título da ação foi reescrito'; END IF;

  EXECUTE 'RESET ROLE';
  PERFORM set_config('request.jwt.claims', '', true);
  IF array_length(v_f, 1) > 0 THEN
    RAISE EXCEPTION E'FAILED: plano encerrado:\n  - %', array_to_string(v_f, E'\n  - ');
  END IF;
  RAISE NOTICE 'PROVEN: PI13_CLOSED_NO_NEW_ACTION=DENIED · PI13_CLOSED_NO_EDIT=DENIED · PI13_CLOSED_NO_STATE_CHANGE=DENIED · PI13_CLOSED_NO_EVIDENCE=DENIED · PI13_CLOSED_NO_LOG=DENIED · PI13_CLOSED_HISTORY=READABLE';
END
$bloco4$;

-- ═══════════════════════════════════════════════════════════════════════════
-- BLOCO 5 · superfície, RLS e papéis de API
-- ═══════════════════════════════════════════════════════════════════════════
DO $bloco5$
DECLARE
  c_a    CONSTANT UUID := 'a9000000-0000-4000-8000-0000000000a1';
  c_ua   CONSTANT UUID := 'a9000000-0000-4000-8000-0000000000a9';
  c_ub   CONSTANT UUID := 'a9000000-0000-4000-8000-0000000000b9';
  c_p1   CONSTANT UUID := 'a9000000-0000-4000-8000-0000000000c1';
  v_f    TEXT[] := '{}';
  v_n    INTEGER;
  v_fn   TEXT;
BEGIN
  IF to_regnamespace('ivo_ledger') IS NULL OR to_regclass('public.action_plans') IS NULL THEN RETURN; END IF;

  -- 5.1 estrutura: gatilhos, constraints, índice; nenhuma função nova em public.
  SELECT COUNT(*) INTO v_n FROM pg_trigger
   WHERE NOT tgisinternal AND tgname IN (
     'ivo_ledger_item_insert_guard', 'ivo_ledger_item_update_guard', 'ivo_ledger_plan_insert_guard',
     'ivo_ledger_plan_update_guard', 'ivo_ledger_evidence_insert_guard', 'ivo_ledger_log_insert_guard');
  IF v_n <> 6 THEN v_f := v_f || format('gatilhos presentes: %s (esperado 6)', v_n); END IF;
  SELECT COUNT(*) INTO v_n FROM pg_constraint WHERE conname IN ('action_plans_closure_audit_ck', 'action_items_add_audit_ck');
  IF v_n <> 2 THEN v_f := v_f || format('constraints de auditoria: %s (esperado 2)', v_n); END IF;
  IF to_regclass('public.action_items_add_request_uidx') IS NULL THEN v_f := v_f || 'índice de idempotência ausente'; END IF;
  SELECT COUNT(*) INTO v_n FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND (p.proname LIKE 'guard\_%' ESCAPE '\' OR p.proname LIKE '%ivo\_plan%' ESCAPE '\' OR p.proname LIKE '%ivo\_ledger%' ESCAPE '\');
  IF v_n <> 0 THEN v_f := v_f || format('%s função(ões) nova(s) em public', v_n); END IF;

  -- 5.2 gatilhos não são superfície de API.
  FOR v_fn IN SELECT unnest(ARRAY['guard_item_insert', 'guard_item_update', 'guard_plan_insert', 'guard_plan_update', 'guard_child_insert']) LOOP
    IF has_function_privilege('anon', format('ivo_ledger.%I()', v_fn), 'EXECUTE')
       OR has_function_privilege('authenticated', format('ivo_ledger.%I()', v_fn), 'EXECUTE') THEN
      v_f := v_f || format('ivo_ledger.%s executável por papel de API', v_fn);
    END IF;
  END LOOP;
  IF has_schema_privilege('anon', 'ivo_ledger', 'USAGE') OR has_schema_privilege('authenticated', 'ivo_ledger', 'USAGE') THEN
    v_f := v_f || 'schema ivo_ledger com USAGE para papel de API';
  END IF;

  -- 5.3 authenticated de OUTRA organização: nada lê, nada escreve.
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', c_ub::TEXT, 'role', 'authenticated')::TEXT, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT COUNT(*) INTO v_n FROM public.action_plans WHERE org_id = c_a;
  IF v_n <> 0 THEN v_f := v_f || format('org B leu %s plano(s) da org A', v_n); END IF;
  SELECT COUNT(*) INTO v_n FROM public.action_items WHERE org_id = c_a;
  IF v_n <> 0 THEN v_f := v_f || format('org B leu %s ação(ões) da org A', v_n); END IF;
  v_f := v_f || _proof.pi13_expect('org B encerra plano da org A', format(
    $q$UPDATE public.action_plans SET status = 'closed' WHERE id = %L$q$, c_p1), 'raised:42501');
  v_f := v_f || _proof.pi13_expect('org B insere ação no plano da org A', _proof.pi13_item_sql(
    'a9000000-0000-4000-8000-0000000000d7', c_p1, c_a, 'Invasora'), 'raised:42501');
  EXECUTE 'RESET ROLE';

  -- 5.4 authenticated da organização dona: lê o plano encerrado com a auditoria; não escreve.
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', c_ua::TEXT, 'role', 'authenticated')::TEXT, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT COUNT(*) INTO v_n FROM public.action_plans WHERE id = c_p1 AND status = 'closed' AND closed_by_role = 'RH_ADMIN' AND closed_at IS NOT NULL;
  IF v_n <> 1 THEN v_f := v_f || 'org A não lê o próprio plano encerrado com a auditoria'; END IF;
  v_f := v_f || _proof.pi13_expect('authenticated escreve direto no plano', format(
    $q$UPDATE public.action_plans SET season_name = 'x' WHERE id = %L$q$, c_p1), 'raised:42501');
  EXECUTE 'RESET ROLE';

  -- 5.5 anon: nada.
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
  EXECUTE 'SET LOCAL ROLE anon';
  v_f := v_f || _proof.pi13_expect('anon lê planos', 'SELECT COUNT(*) FROM public.action_plans', 'raised:42501');
  EXECUTE 'RESET ROLE';
  PERFORM set_config('request.jwt.claims', '', true);

  IF array_length(v_f, 1) > 0 THEN
    RAISE EXCEPTION E'FAILED: superfície e isolamento do PI-13:\n  - %', array_to_string(v_f, E'\n  - ');
  END IF;
  RAISE NOTICE 'PROVEN: PI13_NO_PUBLIC_FUNCTION=PASS · PI13_TRIGGERS_NOT_API_SURFACE=PASS · PI13_ISOLATION=PASS · PI13_AUTHENTICATED_READ_ONLY=PASS · PI13_ANON=DENIED';
END
$bloco5$;

-- ═══════════════════════════════════════════════════════════════════════════
-- LIMPEZA FINAL · o banco volta ao que era (fixtures desta suíte removidas)
-- ═══════════════════════════════════════════════════════════════════════════
DO $limpeza$
BEGIN
  IF to_regnamespace('ivo_ledger') IS NULL OR to_regclass('public.action_plans') IS NULL THEN RETURN; END IF;
  PERFORM _proof.pi13_cleanup();
  RAISE NOTICE 'PROVEN: PI13_PATH=PROVED';
END
$limpeza$;
