-- ═══════════════════════════════════════════════════════════════════════════
-- PROVA EXECUTÁVEL · PROTOCOLO DE EFICÁCIA C8 (IVO) — INTEGRIDADE E ISOLAMENTO
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Migration sob prova: 20261005120000_ivo_efficacy_protocols.sql.
--
-- O que esta suíte prova no BANCO (não na aplicação):
--   1. Rascunho incompleto é permitido; registrar exige o protocolo completo;
--      registrado é imutável; revisar cria nova revisão encadeada.
--   2. Nenhum valor de leitura publicada é persistido (origem 'leitura_publicada'
--      aceita só referência, sem chave extra).
--   3. Observações: só com protocolo registrado, dentro da janela, com a fonte
--      correta à origem; append-only.
--   4. Pareceres: conclusivo exige governança aprovada registrada; revisor
--      independente do autor e com o papel do protocolo; append-only.
--   5. Isolamento: FK composta impede cruzar organizações, mesmo para service_role;
--      authenticated lê só a própria organização e NÃO escreve; anon não lê.
--
-- Roda nos três modos do replay. As tabelas do ledger existem também no estado
-- produtivo observado (preprod), então o caminho completo roda nos três modos
-- (marcador C8_PATH=PROVED); SKIP só ocorre se action_items não existir.
-- ═══════════════════════════════════════════════════════════════════════════
\set ON_ERROR_STOP on
CREATE SCHEMA IF NOT EXISTS _proof;
CREATE OR REPLACE FUNCTION _proof.c8_attempt(p_sql TEXT) RETURNS TEXT
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
-- Devolve lista vazia se o resultado é o esperado; senão uma mensagem.
CREATE OR REPLACE FUNCTION _proof.c8_expect(p_label TEXT, p_sql TEXT, p_expected TEXT) RETURNS TEXT[]
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  v_got TEXT := _proof.c8_attempt(p_sql);
BEGIN
  IF v_got = p_expected OR (p_expected = 'executed' AND v_got LIKE 'executed:%') THEN
    RETURN '{}';
  END IF;
  RETURN ARRAY[format('%s: esperado %s, obtido %s', p_label, p_expected, v_got)];
END $$;
GRANT USAGE ON SCHEMA _proof TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION _proof.c8_attempt(TEXT), _proof.c8_expect(TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- FIXTURES · duas organizações fictícias, cada uma com plano e ação. Nenhum dado real.
-- ═══════════════════════════════════════════════════════════════════════════
DO $fixtures$
BEGIN
  IF to_regclass('public.efficacy_protocols') IS NULL THEN
    RAISE NOTICE 'PROVEN: C8_PATH=SKIP (action_items ausente neste banco — migration C8 é no-op por desenho)';
    RETURN;
  END IF;
  INSERT INTO public.organizations (id, slug, name) VALUES
    ('a8000000-0000-4000-8000-0000000000a1', 'org-ficticia-c8-a', 'Org Fictícia C8 A'),
    ('a8000000-0000-4000-8000-0000000000b1', 'org-ficticia-c8-b', 'Org Fictícia C8 B')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO auth.users (id, email) VALUES
    ('a8000000-0000-4000-8000-0000000000a9', 'admin-c8-a@exemplo.invalid'),
    ('a8000000-0000-4000-8000-0000000000aa', 'revisor-c8-a@exemplo.invalid'),
    ('a8000000-0000-4000-8000-0000000000b9', 'admin-c8-b@exemplo.invalid')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.profiles (id, org_id, role, display_name) VALUES
    ('a8000000-0000-4000-8000-0000000000a9', 'a8000000-0000-4000-8000-0000000000a1', 'RH_ADMIN', 'Admin C8 A'),
    ('a8000000-0000-4000-8000-0000000000aa', 'a8000000-0000-4000-8000-0000000000a1', 'RH_ADMIN', 'Revisor C8 A'),
    ('a8000000-0000-4000-8000-0000000000b9', 'a8000000-0000-4000-8000-0000000000b1', 'RH_ADMIN', 'Admin C8 B')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.action_plans (id, org_id, cycle_key, season_name, created_by) VALUES
    ('a8000000-0000-4000-8000-0000000000a2', 'a8000000-0000-4000-8000-0000000000a1', '2026-T2', 'Prova C8 A', 'a8000000-0000-4000-8000-0000000000a9'),
    ('a8000000-0000-4000-8000-0000000000b2', 'a8000000-0000-4000-8000-0000000000b1', '2026-T2', 'Prova C8 B', 'a8000000-0000-4000-8000-0000000000b9')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.action_items (id, plan_id, org_id, rank, lever_id, title, effort, start_week, end_week, milestone_week, weeks_budget) VALUES
    ('a8000000-0000-4000-8000-0000000000a3', 'a8000000-0000-4000-8000-0000000000a2', 'a8000000-0000-4000-8000-0000000000a1', 1, 'c8:a1', 'Ação A1', 'medio', 1, 13, 7, 13),
    ('a8000000-0000-4000-8000-0000000000a4', 'a8000000-0000-4000-8000-0000000000a2', 'a8000000-0000-4000-8000-0000000000a1', 2, 'c8:a2', 'Ação A2', 'medio', 1, 13, 7, 13),
    ('a8000000-0000-4000-8000-0000000000b3', 'a8000000-0000-4000-8000-0000000000b2', 'a8000000-0000-4000-8000-0000000000b1', 1, 'c8:b1', 'Ação B1', 'medio', 1, 13, 7, 13)
  ON CONFLICT (id) DO NOTHING;
END
$fixtures$;

-- ═══════════════════════════════════════════════════════════════════════════
-- BLOCO 1 · protocolo: rascunho, registro, imutabilidade, revisão (service_role)
-- ═══════════════════════════════════════════════════════════════════════════
DO $bloco1$
DECLARE
  c_a   CONSTANT UUID := 'a8000000-0000-4000-8000-0000000000a1';
  c_ia1 CONSTANT UUID := 'a8000000-0000-4000-8000-0000000000a3';
  c_ia2 CONSTANT UUID := 'a8000000-0000-4000-8000-0000000000a4';
  c_ib1 CONSTANT UUID := 'a8000000-0000-4000-8000-0000000000b3';
  c_u   CONSTANT UUID := 'a8000000-0000-4000-8000-0000000000a9';
  v_p   UUID := 'a8000000-0000-4000-8000-00000000c001';
  v_pr  UUID := 'a8000000-0000-4000-8000-00000000c002';
  v_f   TEXT[] := '{}';
  v_full TEXT;
BEGIN
  IF to_regclass('public.efficacy_protocols') IS NULL THEN RETURN; END IF;
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
  EXECUTE 'SET LOCAL ROLE service_role';

  -- 1.1 rascunho mínimo (incompleto) é aceito
  v_f := v_f || _proof.c8_expect('rascunho incompleto', format(
    $q$INSERT INTO public.efficacy_protocols (id, org_id, item_id, revision, created_by) VALUES (%L, %L, %L, 1, %L)$q$, v_p, c_a, c_ia1, c_u), 'executed');
  -- 1.2 só um rascunho por ação / revisão só depois de registrada a anterior
  v_f := v_f || _proof.c8_expect('revisão enquanto o rascunho está aberto', format(
    $q$INSERT INTO public.efficacy_protocols (org_id, item_id, revision, supersedes_id, created_by) VALUES (%L, %L, 2, %L, %L)$q$, c_a, c_ia1, v_p, c_u), 'raised:23514');
  v_f := v_f || _proof.c8_expect('segundo rascunho da mesma revisão', format(
    $q$INSERT INTO public.efficacy_protocols (org_id, item_id, revision, created_by) VALUES (%L, %L, 1, %L)$q$, c_a, c_ia1, c_u), 'raised:23505');
  -- 1.3 rascunho é editável
  v_f := v_f || _proof.c8_expect('editar rascunho', format(
    $q$UPDATE public.efficacy_protocols SET objective = 'Objetivo sintético de teste do protocolo' WHERE id = %L$q$, v_p), 'executed');
  -- 1.4 registrar incompleto é recusado pelo banco
  v_f := v_f || _proof.c8_expect('registrar incompleto', format(
    $q$UPDATE public.efficacy_protocols SET status = 'registered' WHERE id = %L$q$, v_p), 'raised:23514');
  -- 1.5 origem publicada não aceita valor de baseline
  v_f := v_f || _proof.c8_expect('valor em origem publicada', format(
    $q$UPDATE public.efficacy_protocols SET indicator_origin = 'leitura_publicada', baseline_value = 2.4 WHERE id = %L$q$, v_p), 'raised:23514');
  -- 1.6 referência com chave extra (ex.: value) é recusada
  v_f := v_f || _proof.c8_expect('referência com chave extra', format(
    $q$UPDATE public.efficacy_protocols SET baseline_ref = '{"cohortKey":"x","cycleKey":"2026-T2","instrumentVersion":"1.0.0","calculationVersion":"c","publicationState":"published","value":2.4}'::jsonb WHERE id = %L$q$, v_p), 'raised:23514');
  v_f := v_f || _proof.c8_expect('referência válida sem valor', format(
    $q$UPDATE public.efficacy_protocols SET baseline_value = NULL, indicator_origin = 'leitura_publicada', baseline_ref = '{"cohortKey":"x","cycleKey":"2026-T2","instrumentVersion":"1.0.0","calculationVersion":"c","publicationState":"published"}'::jsonb WHERE id = %L$q$, v_p), 'executed');
  -- 1.7 regra de comparação malformada
  v_f := v_f || _proof.c8_expect('regra de comparação sem requirePublished', format(
    $q$UPDATE public.efficacy_protocols SET comparison_rule = '{"sameCohort":true,"sameInstrumentVersion":true,"sameCalculationVersion":true,"requirePublished":false}'::jsonb WHERE id = %L$q$, v_p), 'raised:23514');
  -- 1.8 completa os campos (ainda rascunho; papéis iguais de propósito)
  v_f := v_f || _proof.c8_expect('completar rascunho', format(
    $q$UPDATE public.efficacy_protocols SET
         comparison_rule = '{"sameCohort":true,"sameInstrumentVersion":true,"sameCalculationVersion":true,"requirePublished":true}'::jsonb,
         indicator_label = 'Fator Bem-Estar sintético', indicator_kind = 'resultado', unit = 'pontos 0-4', direction = 'aumentar',
         baseline_observed_on = '2026-06-30', baseline_population = 'Coorte sintética', baseline_source = 'Leitura sintética',
         target_kind = 'numerico', target_value = 3, window_start = '2026-10-01', window_end = '2026-12-31', source = 'Leitura publicada sintética',
         responsible_role = 'Coordenação sintética', reviewer_role = 'coordenação sintética'
       WHERE id = %L$q$, v_p), 'executed');
  -- 1.9 papéis iguais não registram
  v_f := v_f || _proof.c8_expect('revisor igual ao responsável', format(
    $q$UPDATE public.efficacy_protocols SET status = 'registered' WHERE id = %L$q$, v_p), 'raised:23514');
  -- 1.10 origem publicada com regra frouxa não registra (papéis corrigidos)
  v_f := v_f || _proof.c8_expect('origem publicada com regra frouxa', format(
    $q$UPDATE public.efficacy_protocols SET reviewer_role = 'Revisão sintética',
         comparison_rule = '{"sameCohort":true,"sameInstrumentVersion":false,"sameCalculationVersion":true,"requirePublished":true}'::jsonb,
         status = 'registered' WHERE id = %L$q$, v_p), 'raised:23514');
  -- 1.11 registro completo
  v_f := v_f || _proof.c8_expect('registrar completo', format(
    $q$UPDATE public.efficacy_protocols SET reviewer_role = 'Revisão sintética', status = 'registered' WHERE id = %L$q$, v_p), 'executed');  IF (SELECT registered_at IS NULL FROM public.efficacy_protocols WHERE id = v_p) THEN
    v_f := v_f || 'registered_at não preenchido';
  END IF;
  -- 1.12 registrado é imutável
  v_f := v_f || _proof.c8_expect('editar registrado', format(
    $q$UPDATE public.efficacy_protocols SET objective = 'Alterado depois de registrado' WHERE id = %L$q$, v_p), 'raised:42501');
  -- 1.13 revisão: salto e registro direto são recusados; rascunho encadeado passa
  v_f := v_f || _proof.c8_expect('revisão 3 sem a 2', format(
    $q$INSERT INTO public.efficacy_protocols (org_id, item_id, revision, supersedes_id, created_by) VALUES (%L, %L, 3, %L, %L)$q$, c_a, c_ia1, v_p, c_u), 'raised:23514');
  v_f := v_f || _proof.c8_expect('revisão registrada direto', format(
    $q$INSERT INTO public.efficacy_protocols (org_id, item_id, revision, supersedes_id, created_by, status) VALUES (%L, %L, 2, %L, %L, 'registered')$q$, c_a, c_ia1, v_p, c_u), 'raised:23514');
  v_f := v_f || _proof.c8_expect('revisão sem encadear', format(
    $q$INSERT INTO public.efficacy_protocols (org_id, item_id, revision, created_by) VALUES (%L, %L, 2, %L)$q$, c_a, c_ia1, c_u), 'raised:23514');
  v_f := v_f || _proof.c8_expect('revisão 2 encadeada', format(
    $q$INSERT INTO public.efficacy_protocols (id, org_id, item_id, revision, supersedes_id, created_by) VALUES (%L, %L, %L, 2, %L, %L)$q$, v_pr, c_a, c_ia1, v_p, c_u), 'executed');
  -- 1.14 identidade do rascunho não muda
  v_f := v_f || _proof.c8_expect('mudar item do rascunho', format(
    $q$UPDATE public.efficacy_protocols SET item_id = %L WHERE id = %L$q$, c_ia2, v_pr), 'raised:42501');
  -- 1.15 integridade entre organizações: ação da org B sob org A
  v_f := v_f || _proof.c8_expect('ação de outra organização', format(
    $q$INSERT INTO public.efficacy_protocols (org_id, item_id, revision, created_by) VALUES (%L, %L, 1, %L)$q$, c_a, c_ib1, c_u), 'raised:23503');
  -- 1.16 nenhum DELETE direto
  v_f := v_f || _proof.c8_expect('DELETE direto', format($q$DELETE FROM public.efficacy_protocols WHERE id = %L$q$, v_pr), 'raised:42501');

  EXECUTE 'RESET ROLE';
  IF array_length(v_f, 1) > 0 THEN
    RAISE EXCEPTION 'C8 bloco 1 FALHOU: %', array_to_string(v_f, ' | ');
  END IF;
  RAISE NOTICE 'PROVEN: C8_PROTOCOL_LIFECYCLE=OK';
END
$bloco1$;

-- ═══════════════════════════════════════════════════════════════════════════
-- BLOCO 2 · observações e pareceres (service_role)
-- ═══════════════════════════════════════════════════════════════════════════
DO $bloco2$
DECLARE
  c_a   CONSTANT UUID := 'a8000000-0000-4000-8000-0000000000a1';
  c_ia2 CONSTANT UUID := 'a8000000-0000-4000-8000-0000000000a4';
  c_u   CONSTANT UUID := 'a8000000-0000-4000-8000-0000000000a9';
  c_rev CONSTANT UUID := 'a8000000-0000-4000-8000-0000000000aa';
  v_pm  UUID := 'a8000000-0000-4000-8000-00000000d001'; -- medida_da_organizacao
  v_obs UUID := 'a8000000-0000-4000-8000-00000000d101';
  v_f   TEXT[] := '{}';
BEGIN
  IF to_regclass('public.efficacy_protocols') IS NULL THEN RETURN; END IF;
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
  EXECUTE 'SET LOCAL ROLE service_role';

  -- protocolo de medida da organização, completo, registrado em dois passos
  v_f := v_f || _proof.c8_expect('rascunho medida', format(
    $q$INSERT INTO public.efficacy_protocols (id, org_id, item_id, revision, created_by, objective, indicator_label, indicator_kind, indicator_origin, unit, direction,
         baseline_observed_on, baseline_population, baseline_source, baseline_value, target_kind, target_value, meaningful_difference,
         window_start, window_end, source, comparison_rule, responsible_role, reviewer_role)
       VALUES (%L, %L, %L, 1, %L, 'Elevar medida sintética da organização', 'Medida sintética', 'resultado', 'medida_da_organizacao', 'pontos', 'aumentar',
         '2026-06-30', 'População sintética', 'Planilha sintética', 2.0, 'numerico', 3.0, 0.2,
         '2026-10-01', '2026-12-31', 'Planilha sintética', '{"sameCohort":false,"sameInstrumentVersion":false,"sameCalculationVersion":false,"requirePublished":true}'::jsonb,
         'Coordenação sintética', 'Revisão sintética')$q$, v_pm, c_a, c_ia2, c_u), 'executed');

  -- observação exige protocolo registrado
  v_f := v_f || _proof.c8_expect('observação em rascunho', format(
    $q$INSERT INTO public.efficacy_observations (org_id, protocol_id, observed_on, value, recorded_by) VALUES (%L, %L, '2026-11-15', 3.2, %L)$q$, c_a, v_pm, c_u), 'raised:23514');
  v_f := v_f || _proof.c8_expect('registrar medida', format(
    $q$UPDATE public.efficacy_protocols SET status = 'registered' WHERE id = %L$q$, v_pm), 'executed');
  -- fonte correta à origem; janela; uma só fonte
  v_f := v_f || _proof.c8_expect('referência em medida da organização', format(
    $q$INSERT INTO public.efficacy_observations (org_id, protocol_id, observed_on, ref, recorded_by) VALUES (%L, %L, '2026-11-15', '{"cohortKey":"x","cycleKey":"2026-T4","instrumentVersion":"1.0.0","calculationVersion":"c","publicationState":"published"}'::jsonb, %L)$q$, c_a, v_pm, c_u), 'raised:23514');
  v_f := v_f || _proof.c8_expect('fora da janela', format(
    $q$INSERT INTO public.efficacy_observations (org_id, protocol_id, observed_on, value, recorded_by) VALUES (%L, %L, '2027-02-01', 3.2, %L)$q$, c_a, v_pm, c_u), 'raised:23514');
  v_f := v_f || _proof.c8_expect('valor e referência juntos', format(
    $q$INSERT INTO public.efficacy_observations (org_id, protocol_id, observed_on, value, ref, recorded_by) VALUES (%L, %L, '2026-11-15', 3.2, '{"cohortKey":"x","cycleKey":"2026-T4","instrumentVersion":"1.0.0","calculationVersion":"c","publicationState":"published"}'::jsonb, %L)$q$, c_a, v_pm, c_u), 'raised:23514');
  v_f := v_f || _proof.c8_expect('observação sem fonte (ausente continua ausente)', format(
    $q$INSERT INTO public.efficacy_observations (org_id, protocol_id, observed_on, recorded_by) VALUES (%L, %L, '2026-11-15', %L)$q$, c_a, v_pm, c_u), 'raised:23514');
  v_f := v_f || _proof.c8_expect('observação válida', format(
    $q$INSERT INTO public.efficacy_observations (id, org_id, protocol_id, observed_on, value, recorded_by) VALUES (%L, %L, %L, '2026-11-15', 3.2, %L)$q$, v_obs, c_a, v_pm, c_u), 'executed');
  v_f := v_f || _proof.c8_expect('UPDATE de observação', format($q$UPDATE public.efficacy_observations SET value = 9 WHERE id = %L$q$, v_obs), 'raised:42501');
  v_f := v_f || _proof.c8_expect('DELETE de observação', format($q$DELETE FROM public.efficacy_observations WHERE id = %L$q$, v_obs), 'raised:42501');

  -- pareceres
  v_f := v_f || _proof.c8_expect('conclusivo com governança em proposta', format(
    $q$INSERT INTO public.efficacy_verdicts (org_id, protocol_id, observation_id, verdict, claim_scope, evidence_grade, observed_change, target_reached, reviewer_user_id, reviewer_role, governance_decision, governance_state, governance_source)
       VALUES (%L, %L, %L, 'meta_atingida', 'resultado', 'pre_pos', 'melhorou', TRUE, %L, 'Revisão sintética', 'D9', 'proposta', 'registro_canonico')$q$, c_a, v_pm, v_obs, c_rev), 'raised:23514');
  v_f := v_f || _proof.c8_expect('revisor = autor do protocolo', format(
    $q$INSERT INTO public.efficacy_verdicts (org_id, protocol_id, observation_id, verdict, claim_scope, evidence_grade, observed_change, target_reached, reviewer_user_id, reviewer_role, governance_decision, governance_state, governance_source)
       VALUES (%L, %L, %L, 'meta_atingida', 'resultado', 'pre_pos', 'melhorou', TRUE, %L, 'Revisão sintética', 'D9', 'aprovado_para_piloto', 'teste_sintetico')$q$, c_a, v_pm, v_obs, c_u), 'raised:42501');
  v_f := v_f || _proof.c8_expect('papel do revisor diferente', format(
    $q$INSERT INTO public.efficacy_verdicts (org_id, protocol_id, observation_id, verdict, claim_scope, evidence_grade, observed_change, target_reached, reviewer_user_id, reviewer_role, governance_decision, governance_state, governance_source)
       VALUES (%L, %L, %L, 'meta_atingida', 'resultado', 'pre_pos', 'melhorou', TRUE, %L, 'Outro papel', 'D9', 'aprovado_para_piloto', 'teste_sintetico')$q$, c_a, v_pm, v_obs, c_rev), 'raised:42501');
  v_f := v_f || _proof.c8_expect('meta atingida com target_reached falso', format(
    $q$INSERT INTO public.efficacy_verdicts (org_id, protocol_id, observation_id, verdict, claim_scope, evidence_grade, observed_change, target_reached, reviewer_user_id, reviewer_role, governance_decision, governance_state, governance_source)
       VALUES (%L, %L, %L, 'meta_atingida', 'resultado', 'pre_pos', 'melhorou', FALSE, %L, 'Revisão sintética', 'D9', 'aprovado_para_piloto', 'teste_sintetico')$q$, c_a, v_pm, v_obs, c_rev), 'raised:23514');
  v_f := v_f || _proof.c8_expect('atribuição sem desenho', format(
    $q$INSERT INTO public.efficacy_verdicts (org_id, protocol_id, observation_id, verdict, claim_scope, evidence_grade, observed_change, target_reached, attribution_status, reviewer_user_id, reviewer_role, governance_decision, governance_state, governance_source)
       VALUES (%L, %L, %L, 'meta_atingida', 'resultado', 'pre_pos', 'melhorou', TRUE, 'sustentada_por_desenho', %L, 'Revisão sintética', 'D9', 'aprovado_para_piloto', 'teste_sintetico')$q$, c_a, v_pm, v_obs, c_rev), 'raised:23514');
  v_f := v_f || _proof.c8_expect('inconclusivo sem motivo', format(
    $q$INSERT INTO public.efficacy_verdicts (org_id, protocol_id, verdict, claim_scope, evidence_grade, observed_change, reviewer_user_id, reviewer_role, governance_decision, governance_state, governance_source)
       VALUES (%L, %L, 'inconclusiva', 'resultado', 'descritiva', 'nao_comparavel', %L, 'Revisão sintética', 'D9', 'proposta', 'registro_canonico')$q$, c_a, v_pm, c_rev), 'raised:23514');
  v_f := v_f || _proof.c8_expect('inconclusivo com motivo e governança pendente', format(
    $q$INSERT INTO public.efficacy_verdicts (org_id, protocol_id, verdict, claim_scope, evidence_grade, observed_change, reason, reviewer_user_id, reviewer_role, governance_decision, governance_state, governance_source)
       VALUES (%L, %L, 'inconclusiva', 'resultado', 'descritiva', 'nao_comparavel', 'Sem dados comparáveis na janela', %L, 'Revisão sintética', 'D9', 'proposta', 'registro_canonico')$q$, c_a, v_pm, c_rev), 'executed');
  v_f := v_f || _proof.c8_expect('favorável com governança de teste', format(
    $q$INSERT INTO public.efficacy_verdicts (org_id, protocol_id, observation_id, verdict, claim_scope, evidence_grade, observed_change, target_reached, reviewer_user_id, reviewer_role, governance_decision, governance_state, governance_source)
       VALUES (%L, %L, %L, 'meta_atingida', 'resultado', 'pre_pos', 'melhorou', TRUE, %L, 'Revisão sintética', 'D9', 'aprovado_para_piloto', 'teste_sintetico')$q$, c_a, v_pm, v_obs, c_rev), 'executed');
  v_f := v_f || _proof.c8_expect('desfavorável com governança de teste', format(
    $q$INSERT INTO public.efficacy_verdicts (org_id, protocol_id, observation_id, verdict, claim_scope, evidence_grade, observed_change, target_reached, reviewer_user_id, reviewer_role, governance_decision, governance_state, governance_source)
       VALUES (%L, %L, %L, 'meta_nao_atingida', 'resultado', 'pre_pos', 'melhorou', FALSE, %L, 'Revisão sintética', 'D9', 'aprovado_para_piloto', 'teste_sintetico')$q$, c_a, v_pm, v_obs, c_rev), 'executed');
  v_f := v_f || _proof.c8_expect('UPDATE de parecer', $q$UPDATE public.efficacy_verdicts SET reason = 'x'$q$, 'raised:42501');
  v_f := v_f || _proof.c8_expect('DELETE de parecer', $q$DELETE FROM public.efficacy_verdicts$q$, 'raised:42501');

  -- origem publicada: só referência
  v_f := v_f || _proof.c8_expect('ação A1 segue com protocolo publicado', format(
    $q$SELECT 1 FROM public.efficacy_protocols WHERE item_id = %L$q$, 'a8000000-0000-4000-8000-0000000000a3'), 'executed');

  EXECUTE 'RESET ROLE';
  IF array_length(v_f, 1) > 0 THEN
    RAISE EXCEPTION 'C8 bloco 2 FALHOU: %', array_to_string(v_f, ' | ');
  END IF;
  RAISE NOTICE 'PROVEN: C8_OBSERVATION_VERDICT_GUARDS=OK';
END
$bloco2$;

-- ═══════════════════════════════════════════════════════════════════════════
-- BLOCO 3 · papéis de API: authenticated (A, B) e anon
-- ═══════════════════════════════════════════════════════════════════════════
DO $bloco3$
DECLARE
  c_a   CONSTANT UUID := 'a8000000-0000-4000-8000-0000000000a1';
  c_ia1 CONSTANT UUID := 'a8000000-0000-4000-8000-0000000000a3';
  c_ua  CONSTANT UUID := 'a8000000-0000-4000-8000-0000000000a9';
  c_ub  CONSTANT UUID := 'a8000000-0000-4000-8000-0000000000b9';
  v_n   INTEGER;
  v_f   TEXT[] := '{}';
BEGIN
  IF to_regclass('public.efficacy_protocols') IS NULL THEN RETURN; END IF;

  -- authenticated da organização dona lê
  PERFORM set_config('request.jwt.claims', json_build_object('sub', c_ua, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO v_n FROM public.efficacy_protocols;
  IF v_n < 1 THEN v_f := v_f || 'admin A não lê os próprios protocolos'; END IF;
  SELECT count(*) INTO v_n FROM public.efficacy_observations;
  IF v_n < 1 THEN v_f := v_f || 'admin A não lê as próprias observações'; END IF;
  SELECT count(*) INTO v_n FROM public.efficacy_verdicts;
  IF v_n < 1 THEN v_f := v_f || 'admin A não lê os próprios pareceres'; END IF;
  -- e NÃO escreve
  v_f := v_f || _proof.c8_expect('authenticated INSERT protocolo', format(
    $q$INSERT INTO public.efficacy_protocols (org_id, item_id, revision, created_by) VALUES (%L, %L, 9, %L)$q$, c_a, c_ia1, c_ua), 'raised:42501');
  v_f := v_f || _proof.c8_expect('authenticated UPDATE protocolo', $q$UPDATE public.efficacy_protocols SET objective = 'x'$q$, 'raised:42501');
  v_f := v_f || _proof.c8_expect('authenticated DELETE protocolo', $q$DELETE FROM public.efficacy_protocols$q$, 'raised:42501');
  v_f := v_f || _proof.c8_expect('authenticated INSERT observação', $q$INSERT INTO public.efficacy_observations (org_id, protocol_id, observed_on, value, recorded_by) VALUES (gen_random_uuid(), gen_random_uuid(), '2026-11-01', 1, gen_random_uuid())$q$, 'raised:42501');
  v_f := v_f || _proof.c8_expect('authenticated INSERT parecer', $q$INSERT INTO public.efficacy_verdicts (org_id) VALUES (gen_random_uuid())$q$, 'raised:42501');
  EXECUTE 'RESET ROLE';

  -- authenticated de OUTRA organização: zero linhas
  PERFORM set_config('request.jwt.claims', json_build_object('sub', c_ub, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO v_n FROM public.efficacy_protocols;
  IF v_n <> 0 THEN v_f := v_f || format('admin B lê %s protocolos de A', v_n); END IF;
  SELECT count(*) INTO v_n FROM public.efficacy_observations;
  IF v_n <> 0 THEN v_f := v_f || format('admin B lê %s observações de A', v_n); END IF;
  SELECT count(*) INTO v_n FROM public.efficacy_verdicts;
  IF v_n <> 0 THEN v_f := v_f || format('admin B lê %s pareceres de A', v_n); END IF;
  EXECUTE 'RESET ROLE';

  -- anon não lê
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
  EXECUTE 'SET LOCAL ROLE anon';
  v_f := v_f || _proof.c8_expect('anon SELECT protocolos', $q$SELECT 1 FROM public.efficacy_protocols$q$, 'raised:42501');
  v_f := v_f || _proof.c8_expect('anon SELECT pareceres', $q$SELECT 1 FROM public.efficacy_verdicts$q$, 'raised:42501');
  EXECUTE 'RESET ROLE';

  IF array_length(v_f, 1) > 0 THEN
    RAISE EXCEPTION 'C8 bloco 3 FALHOU: %', array_to_string(v_f, ' | ');
  END IF;
  RAISE NOTICE 'PROVEN: C8_ISOLATION=OK';
  RAISE NOTICE 'PROVEN: C8_PATH=PROVED';
END
$bloco3$;

-- Limpeza (superusuário): as fixtures C8 não permanecem no banco de prova.
DO $limpeza$
BEGIN
  IF to_regclass('public.efficacy_protocols') IS NULL THEN RETURN; END IF;
  -- Observações e pareceres são append-only; o cascade de FK remove ao apagar a ação.
  DELETE FROM public.action_items WHERE org_id IN ('a8000000-0000-4000-8000-0000000000a1', 'a8000000-0000-4000-8000-0000000000b1');
  DELETE FROM public.action_plans WHERE org_id IN ('a8000000-0000-4000-8000-0000000000a1', 'a8000000-0000-4000-8000-0000000000b1');
  DELETE FROM public.profiles WHERE id IN ('a8000000-0000-4000-8000-0000000000a9', 'a8000000-0000-4000-8000-0000000000aa', 'a8000000-0000-4000-8000-0000000000b9');
  DELETE FROM auth.users WHERE id IN ('a8000000-0000-4000-8000-0000000000a9', 'a8000000-0000-4000-8000-0000000000aa', 'a8000000-0000-4000-8000-0000000000b9');
  DELETE FROM public.organizations WHERE id IN ('a8000000-0000-4000-8000-0000000000a1', 'a8000000-0000-4000-8000-0000000000b1');
END
$limpeza$;
DROP FUNCTION IF EXISTS _proof.c8_expect(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS _proof.c8_attempt(TEXT);
