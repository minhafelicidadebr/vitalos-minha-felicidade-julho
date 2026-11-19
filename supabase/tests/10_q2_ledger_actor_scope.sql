-- ═══════════════════════════════════════════════════════════════════════════
-- PROVA EXECUTÁVEL · ESCOPO DO ATOR NO LEDGER E VISIBILIDADE DE TÍTULO (Q2 B2)
-- ═══════════════════════════════════════════════════════════════════════════
-- Migration sob prova: 20261119120000_q2_ledger_actor_scope_and_title_visibility.sql.
-- Roda numa transação e termina em ROLLBACK: nenhuma linha persiste.
--   1. Responsável: admin ou LIDER_EQUIPE da mesma org; colaborador e outra org → owner_not_eligible.
--   2. Evento: ator de outra org, papel declarado divergente → recusados; admin aceito.
--   3. Liderança: própria ação em plano ativo → estado e execução aceitos; aprendizagem,
--      evento não-estado, ação alheia e plano não ativo → recusados.
--   4. title_visible_at: nova linha recebe o instante; superfície de EXECUTE intacta.
-- ═══════════════════════════════════════════════════════════════════════════
\set ON_ERROR_STOP on
BEGIN;

CREATE TEMP TABLE proof(name TEXT, pass BOOLEAN) ON COMMIT DROP;

DO $$
DECLARE
  o_a UUID := gen_random_uuid(); o_b UUID := gen_random_uuid();
  rh UUID := gen_random_uuid(); lider UUID := gen_random_uuid(); colab UUID := gen_random_uuid(); rh_b UUID := gen_random_uuid();
  p_draft UUID := gen_random_uuid(); p_active UUID := gen_random_uuid();
  i_draft UUID := gen_random_uuid(); i_own UUID := gen_random_uuid(); i_other UUID := gen_random_uuid();
  r RECORD;
BEGIN
  -- Gatilhos de origem/módulo (institutional.guard_module_operation e afins) ficam
  -- desligados nesta transação: são outra camada, provada nas próprias suítes. Esta
  -- prova isola a lógica DENTRO das RPCs (corpo plpgsql e DEFAULT da coluna).
  SET LOCAL session_replication_role = replica;
  INSERT INTO public.organizations(id, name, slug, pack_id, plan) VALUES
    (o_a, 'Prova B2 A', 'proof-b2-a-' || o_a, 'enterprise', 'enterprise'),
    (o_b, 'Prova B2 B', 'proof-b2-b-' || o_b, 'enterprise', 'enterprise');
  INSERT INTO auth.users(id, email) VALUES (rh, rh || '@proof.test'), (lider, lider || '@proof.test'), (colab, colab || '@proof.test'), (rh_b, rh_b || '@proof.test');
  INSERT INTO public.profiles(id, org_id, role) VALUES (rh, o_a, 'RH_ADMIN'), (lider, o_a, 'LIDER_EQUIPE'), (colab, o_a, 'COLABORADOR'), (rh_b, o_b, 'RH_ADMIN')
    ON CONFLICT (id) DO UPDATE SET org_id = EXCLUDED.org_id, role = EXCLUDED.role;

  INSERT INTO public.action_plans(id, org_id, cycle_key, season_name, status, created_by) VALUES
    (p_draft, o_a, '2099-T1', 'T1', 'draft', rh), (p_active, o_a, '2099-T2', 'T2', 'draft', rh);
  INSERT INTO public.action_items(id, plan_id, org_id, rank, lever_id, title, description, effort, owner_user_id, owner_role_label, due_on, metric_label, metric_baseline, metric_target, start_week, end_week, milestone_week, weeks_budget)
  VALUES
    (i_draft, p_draft, o_a, 1, 'x', 'Rascunho', '', 'medio', NULL, NULL, NULL, NULL, NULL, NULL, 1, 13, 7, 13),
    (i_own,   p_active, o_a, 1, 'x', 'Própria', '', 'medio', lider, 'Liderança', '2099-06-01', 'm', 0, 1, 1, 13, 7, 13),
    (i_other, p_active, o_a, 2, 'x', 'Alheia',  '', 'medio', rh, 'RH', '2099-06-01', 'm', 0, 1, 1, 13, 7, 13);
  UPDATE public.action_plans SET status = 'active', activated_at = NOW() WHERE id = p_active;

  -- 1 · responsável elegível
  SELECT * INTO r FROM public.set_action_item_accountability(i_draft, lider, 'L', '2099-06-01', 'm', 0, 1, NULL, NULL, NULL, NULL, NULL);
  INSERT INTO proof VALUES ('responsável liderança da mesma org aceito', r.accepted);
  SELECT * INTO r FROM public.set_action_item_accountability(i_draft, colab, 'C', '2099-06-01', 'm', 0, 1, NULL, NULL, NULL, NULL, NULL);
  INSERT INTO proof VALUES ('responsável colaborador recusado', NOT r.accepted AND r.reason = 'owner_not_eligible');
  SELECT * INTO r FROM public.set_action_item_accountability(i_draft, rh_b, 'B', '2099-06-01', 'm', 0, 1, NULL, NULL, NULL, NULL, NULL);
  INSERT INTO proof VALUES ('responsável de outra org recusado', NOT r.accepted AND r.reason = 'owner_not_eligible');

  -- 2 · ator verificado
  SELECT * INTO r FROM public.record_action_event(i_other, 'note', rh_b, 'RH_ADMIN', NULL, NULL, 'x');
  INSERT INTO proof VALUES ('ator de outra org recusado', NOT r.accepted AND r.reason = 'actor_not_in_org');
  SELECT * INTO r FROM public.record_action_event(i_other, 'note', colab, 'RH_ADMIN', NULL, NULL, 'x');
  INSERT INTO proof VALUES ('papel declarado divergente recusado', NOT r.accepted AND r.reason = 'actor_role_mismatch');
  SELECT * INTO r FROM public.record_action_event(i_other, 'note', colab, 'COLABORADOR', NULL, NULL, 'x');
  INSERT INTO proof VALUES ('colaborador não escreve no ledger', NOT r.accepted AND r.reason = 'authority_reserved_to_admin');
  SELECT * INTO r FROM public.record_action_event(i_other, 'status_change', rh, 'RH_ADMIN', 'em_execucao', NULL, NULL);
  INSERT INTO proof VALUES ('admin muda estado', r.accepted);

  -- 3 · escopo da liderança
  SELECT * INTO r FROM public.record_action_event(i_own, 'status_change', lider, 'LIDER_EQUIPE', 'em_execucao', NULL, NULL);
  INSERT INTO proof VALUES ('liderança muda estado da própria ação', r.accepted);
  SELECT * INTO r FROM public.record_evidence(i_own, 'texto', 'ata', 'direct', NULL, '2099-01-01', lider, 'LIDER_EQUIPE');
  INSERT INTO proof VALUES ('liderança registra execução na própria ação', r.accepted);
  SELECT * INTO r FROM public.record_evidence(i_own, 'aprendizagem', 'x', 'direct', NULL, '2099-01-01', lider, 'LIDER_EQUIPE');
  INSERT INTO proof VALUES ('liderança não registra aprendizagem', NOT r.accepted AND r.reason = 'authority_reserved_to_admin');
  SELECT * INTO r FROM public.record_action_event(i_own, 'note', lider, 'LIDER_EQUIPE', NULL, NULL, 'x');
  INSERT INTO proof VALUES ('liderança não grava nota', NOT r.accepted AND r.reason = 'authority_reserved_to_admin');
  SELECT * INTO r FROM public.record_evidence(i_other, 'texto', 'x', 'direct', NULL, '2099-01-01', lider, 'LIDER_EQUIPE');
  INSERT INTO proof VALUES ('ação alheia responde como inexistente', NOT r.accepted AND r.reason = 'item_not_found');
  SELECT * INTO r FROM public.record_evidence(i_draft, 'texto', 'x', 'direct', NULL, '2099-01-01', lider, 'LIDER_EQUIPE');
  INSERT INTO proof VALUES ('liderança em plano não ativo recusada', NOT r.accepted AND r.reason = 'plan_not_active');

  -- 4 · title_visible_at e superfície
  INSERT INTO proof SELECT 'nova linha recebe title_visible_at', title_visible_at IS NOT NULL FROM public.action_items WHERE id = i_own;
  INSERT INTO proof VALUES ('helper sem EXECUTE para papéis de API',
    NOT has_function_privilege('authenticated', 'public.ledger_actor_denial(uuid,uuid,text,text)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.ledger_actor_denial(uuid,uuid,text,text)', 'EXECUTE'));
  INSERT INTO proof VALUES ('RPCs só service_role',
    has_function_privilege('service_role', 'public.record_evidence(uuid,text,text,text,text,date,uuid,text)', 'EXECUTE')
    AND NOT has_function_privilege('authenticated', 'public.record_evidence(uuid,text,text,text,text,date,uuid,text)', 'EXECUTE'));
END;
$$;

SELECT (CASE WHEN pass THEN 'PASS ' ELSE 'FAIL ' END) || name FROM proof;
SELECT 'TOTAL ' || count(*) FILTER (WHERE pass) || '/' || count(*) FROM proof;
-- Qualquer FAIL aborta a suíte (ON_ERROR_STOP): nunca uma falha silenciosa no replay.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM proof WHERE NOT pass) OR (SELECT count(*) FROM proof) <> 16 THEN
    RAISE EXCEPTION 'Prova Q2 B2 falhou.';
  END IF;
END $$;
ROLLBACK;
