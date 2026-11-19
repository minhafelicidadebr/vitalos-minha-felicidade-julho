-- ═══════════════════════════════════════════════════════════════════════════
-- Q2 · B2.1 · regra do ator fora do schema public (19/11/2026)
-- ═══════════════════════════════════════════════════════════════════════════
-- Correção da B2 (20261119120000), achada pelo replay clean: a M6A aborta com
-- função nova em public fora de REQUIRED_NOW + FUTURE_OPTIONAL. O padrão do
-- repositório (PI-13) é não criar função nova em public. Esta migration:
--   · recria a regra em ivo_ledger.ledger_actor_denial (schema sem USAGE para
--     papéis de API), com o MESMO corpo;
--   · recria as três RPCs do ledger chamando ivo_ledger.ledger_actor_denial
--     (assinaturas e EXECUTE só service_role inalterados);
--   · remove public.ledger_actor_denial.
-- Aditiva sobre a B2; a B2 aplicada não é reescrita.
CREATE SCHEMA IF NOT EXISTS ivo_ledger;
REVOKE ALL ON SCHEMA ivo_ledger FROM PUBLIC, anon, authenticated;

-- ─── 2 · Regra única do ator ────────────────────────────────────────────────
-- Devolve NULL quando permitido, ou o motivo da recusa. Função interna INVOKER:
-- só é chamada de dentro das RPCs SECURITY DEFINER abaixo (roda com o privilégio
-- delas); nenhum papel de API tem EXECUTE e ela não amplia a superfície definer.
CREATE OR REPLACE FUNCTION ivo_ledger.ledger_actor_denial(
  p_item_id    UUID,
  p_actor      UUID,
  p_actor_role TEXT,
  p_operation  TEXT   -- 'status_change' | 'event' | 'execution_evidence' | 'learning_evidence'
)
RETURNS TEXT
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_item_org   UUID;
  v_owner      UUID;
  v_plan       TEXT;
  v_actor_org  UUID;
  v_actor_role TEXT;
BEGIN
  SELECT ai.org_id, ai.owner_user_id, ap.status INTO v_item_org, v_owner, v_plan
  FROM public.action_items ai JOIN public.action_plans ap ON ap.id = ai.plan_id
  WHERE ai.id = p_item_id;
  IF v_item_org IS NULL THEN RETURN 'item_not_found'; END IF;

  SELECT org_id, role INTO v_actor_org, v_actor_role FROM public.profiles WHERE id = p_actor;
  IF v_actor_org IS NULL OR v_actor_org <> v_item_org THEN RETURN 'actor_not_in_org'; END IF;
  -- O rótulo gravado no log tem de ser o papel real (nunca texto do chamador).
  IF p_actor_role IS DISTINCT FROM v_actor_role THEN RETURN 'actor_role_mismatch'; END IF;

  IF v_actor_role IN ('RH_ADMIN', 'DGP_RH', 'DIRETOR', 'SESMT_SAUDE', 'SINDICO') THEN RETURN NULL; END IF;

  IF v_actor_role = 'LIDER_EQUIPE' THEN
    IF p_operation NOT IN ('status_change', 'execution_evidence') THEN RETURN 'authority_reserved_to_admin'; END IF;
    -- Ação alheia responde como inexistente (não revela que existe).
    IF v_owner IS DISTINCT FROM p_actor THEN RETURN 'item_not_found'; END IF;
    IF v_plan <> 'active' THEN RETURN 'plan_not_active'; END IF;
    RETURN NULL;
  END IF;

  RETURN 'authority_reserved_to_admin';
END;
$$;

REVOKE ALL ON FUNCTION ivo_ledger.ledger_actor_denial(UUID, UUID, TEXT, TEXT) FROM PUBLIC, authenticated, anon, service_role;

-- ─── 3 · set_action_item_accountability: responsável elegível ───────────────
CREATE OR REPLACE FUNCTION public.set_action_item_accountability(
  p_item_id         UUID,
  p_owner_user_id   UUID,
  p_owner_role_label TEXT,
  p_due_on          DATE,
  p_metric_label    TEXT,
  p_metric_baseline NUMERIC,
  p_metric_target   NUMERIC,
  p_metric_unit     TEXT,
  p_cmo_context     TEXT,
  p_cmo_mechanism   TEXT,
  p_cmo_outcome     TEXT,
  p_control_tier    TEXT
)
RETURNS TABLE(accepted BOOLEAN, reason TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_plan_status TEXT;
  v_item_org    UUID;
BEGIN
  SELECT ap.status, ai.org_id INTO v_plan_status, v_item_org
  FROM public.action_items ai JOIN public.action_plans ap ON ap.id = ai.plan_id
  WHERE ai.id = p_item_id
  FOR UPDATE OF ai;

  IF v_plan_status IS NULL THEN
    RETURN QUERY SELECT FALSE, 'item_not_found'::TEXT;
    RETURN;
  END IF;
  IF v_plan_status <> 'draft' THEN
    RETURN QUERY SELECT FALSE, 'plan_not_editable'::TEXT;
    RETURN;
  END IF;
  -- S6 revisto: responsável = administrador ou LIDER_EQUIPE da MESMA organização.
  IF p_owner_user_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = p_owner_user_id AND p.org_id = v_item_org
      AND p.role IN ('RH_ADMIN', 'DGP_RH', 'DIRETOR', 'SESMT_SAUDE', 'SINDICO', 'LIDER_EQUIPE')
  ) THEN
    RETURN QUERY SELECT FALSE, 'owner_not_eligible'::TEXT;
    RETURN;
  END IF;

  UPDATE public.action_items SET
    owner_user_id    = p_owner_user_id,
    owner_role_label = p_owner_role_label,
    due_on           = p_due_on,
    metric_label     = p_metric_label,
    metric_baseline  = p_metric_baseline,
    metric_target    = p_metric_target,
    metric_unit      = p_metric_unit,
    cmo_context      = p_cmo_context,
    cmo_mechanism    = p_cmo_mechanism,
    cmo_outcome      = p_cmo_outcome,
    control_tier     = COALESCE(p_control_tier, control_tier),
    updated_at       = NOW()
  WHERE id = p_item_id;

  RETURN QUERY SELECT TRUE, NULL::TEXT;
END;
$$;

-- ─── 4 · record_action_event: ator verificado ───────────────────────────────
CREATE OR REPLACE FUNCTION public.record_action_event(
  p_item_id          UUID,
  p_event_kind       TEXT,
  p_actor_user_id    UUID,
  p_actor_role_label TEXT,
  p_to_status        TEXT,
  p_maintained       BOOLEAN,
  p_note             TEXT
)
RETURNS TABLE(accepted BOOLEAN, reason TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_current_status TEXT;
  v_org_id         UUID;
  v_denial         TEXT;
BEGIN
  SELECT status, org_id INTO v_current_status, v_org_id
  FROM public.action_items WHERE id = p_item_id FOR UPDATE;

  IF v_current_status IS NULL THEN
    RETURN QUERY SELECT FALSE, 'item_not_found'::TEXT;
    RETURN;
  END IF;

  v_denial := ivo_ledger.ledger_actor_denial(p_item_id, p_actor_user_id, p_actor_role_label,
    CASE WHEN p_event_kind = 'status_change' THEN 'status_change' ELSE 'event' END);
  IF v_denial IS NOT NULL THEN
    RETURN QUERY SELECT FALSE, v_denial;
    RETURN;
  END IF;

  IF p_event_kind = 'status_change' THEN
    IF p_to_status IS NULL THEN
      RETURN QUERY SELECT FALSE, 'invalid_request'::TEXT;
      RETURN;
    END IF;
    IF NOT (
      (v_current_status = 'planejada'     AND p_to_status IN ('em_execucao', 'interrompida')) OR
      (v_current_status = 'em_execucao'   AND p_to_status IN ('concluida', 'interrompida')) OR
      (v_current_status = 'concluida'     AND p_to_status = 'em_vigilancia') OR
      (v_current_status = 'em_vigilancia' AND p_to_status = 'em_execucao') OR
      (v_current_status = 'interrompida'  AND p_to_status = 'planejada')
    ) THEN
      RETURN QUERY SELECT FALSE, 'invalid_transition'::TEXT;
      RETURN;
    END IF;
    UPDATE public.action_items SET status = p_to_status, updated_at = NOW() WHERE id = p_item_id;
  ELSIF p_event_kind = 'maintenance_check' THEN
    IF p_maintained IS NULL THEN
      RETURN QUERY SELECT FALSE, 'invalid_request'::TEXT;
      RETURN;
    END IF;
  ELSIF p_event_kind NOT IN ('checkin', 'note') THEN
    RETURN QUERY SELECT FALSE, 'invalid_request'::TEXT;
    RETURN;
  END IF;

  INSERT INTO public.action_log (item_id, org_id, event_kind, actor_user_id, actor_role_label, to_status, maintained, note)
  VALUES (p_item_id, v_org_id, p_event_kind, p_actor_user_id, p_actor_role_label, p_to_status, p_maintained, p_note);

  RETURN QUERY SELECT TRUE, NULL::TEXT;
END;
$$;

-- ─── 5 · record_evidence: ator verificado ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.record_evidence(
  p_item_id          UUID,
  p_evidence_kind    TEXT,
  p_content_ref      TEXT,
  p_source_kind      TEXT,
  p_consent_ref      TEXT,
  p_occurred_on      DATE,
  p_recorded_by      UUID,
  p_actor_role_label TEXT
)
RETURNS TABLE(accepted BOOLEAN, reason TEXT, evidence_id UUID)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org_id      UUID;
  v_lever_id    TEXT;
  v_evidence_id UUID;
  v_denial      TEXT;
BEGIN
  SELECT org_id, lever_id INTO v_org_id, v_lever_id FROM public.action_items WHERE id = p_item_id;
  IF v_org_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'item_not_found'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  v_denial := ivo_ledger.ledger_actor_denial(p_item_id, p_recorded_by, p_actor_role_label,
    CASE WHEN p_evidence_kind = 'aprendizagem' THEN 'learning_evidence' ELSE 'execution_evidence' END);
  IF v_denial IS NOT NULL THEN
    RETURN QUERY SELECT FALSE, v_denial, NULL::UUID;
    RETURN;
  END IF;

  INSERT INTO public.evidence_records (org_id, item_id, lever_id, evidence_kind, content_ref, source_kind, consent_ref, occurred_on, recorded_by)
  VALUES (v_org_id, p_item_id, v_lever_id, p_evidence_kind, p_content_ref, COALESCE(p_source_kind, 'direct'), p_consent_ref, p_occurred_on, p_recorded_by)
  RETURNING id INTO v_evidence_id;

  INSERT INTO public.action_log (item_id, org_id, event_kind, actor_user_id, actor_role_label, evidence_id)
  VALUES (p_item_id, v_org_id, 'evidence_recorded', p_recorded_by, p_actor_role_label, v_evidence_id);

  RETURN QUERY SELECT TRUE, NULL::TEXT, v_evidence_id;
END;
$$;

-- ─── 6 · Superfície de EXECUTE inalterada: só service_role ──────────────────
REVOKE EXECUTE ON FUNCTION public.set_action_item_accountability(UUID, UUID, TEXT, DATE, TEXT, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.record_action_event(UUID, TEXT, UUID, TEXT, TEXT, BOOLEAN, TEXT) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.record_evidence(UUID, TEXT, TEXT, TEXT, TEXT, DATE, UUID, TEXT) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.set_action_item_accountability(UUID, UUID, TEXT, DATE, TEXT, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_action_event(UUID, TEXT, UUID, TEXT, TEXT, BOOLEAN, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_evidence(UUID, TEXT, TEXT, TEXT, TEXT, DATE, UUID, TEXT) TO service_role;

REVOKE ALL ON FUNCTION ivo_ledger.ledger_actor_denial(UUID, UUID, TEXT, TEXT) FROM PUBLIC, authenticated, anon, service_role;
DROP FUNCTION IF EXISTS public.ledger_actor_denial(UUID, UUID, TEXT, TEXT);

-- ─── Conferência pós-migration ─────────────────────────────────────────────
DO $$
BEGIN
  IF to_regprocedure('public.ledger_actor_denial(uuid,uuid,text,text)') IS NOT NULL
     OR to_regprocedure('ivo_ledger.ledger_actor_denial(uuid,uuid,text,text)') IS NULL
     OR has_function_privilege('authenticated', 'ivo_ledger.ledger_actor_denial(uuid,uuid,text,text)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.record_action_event(uuid,text,uuid,text,text,boolean,text)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.record_evidence(uuid,text,text,text,text,date,uuid,text)', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'public.record_action_event(uuid,text,uuid,text,text,boolean,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Superfície do ledger divergente após a B2.1.';
  END IF;
END;
$$;
