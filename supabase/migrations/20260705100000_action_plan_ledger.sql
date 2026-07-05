-- ═══════════════════════════════════════════════════════════════════════════
-- LEDGER DE TRANSFORMAÇÃO — persistência real do Plano Vivo (Sprint S6)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- CONTEXTO: plan-enrichment-engine.ts e action-log-engine.ts já são motores
-- puros, testados, computando o medidor §13 (dono+prazo+métrica por ação,
-- Guia MTE 2026) e a máquina de status por FOLD de eventos. Faltava só onde
-- guardar isso entre sessões — hoje tudo é mock em /plano-acao.
--
-- O §13 VIRA CONSTRAINT: `activate_action_plan` só transiciona o plano para
-- 'active' quando TODA ação tem owner_user_id + due_on + as 3 colunas de
-- métrica preenchidas. Um plano não consegue ser ativado incompleto — o
-- critério de aceite do S6 passa a ser garantido pelo banco, não afirmado
-- pela UI.
--
-- GUARDA ESTRUTURAL (risco central do S6, verbatim: "nunca transformar risco
-- organizacional em problema individual de resiliência"): control_tier só
-- aceita os 4 tiers da hierarquia NR-01. Não existe tier de resiliência
-- individual — o plano não consegue individualizar o risco por construção,
-- mesma guarda que já existe no engine puro (plan-enrichment-engine.ts).
--
-- STATUS É FOLD, NUNCA OPINIÃO: action_items.status é uma coluna materializada
-- por conveniência de consulta, mas SÓ é escrita dentro da mesma transação
-- que insere o evento em action_log — nenhum outro caminho a toca (todo
-- INSERT/UPDATE direto é revogado de authenticated/anon abaixo). A fonte da
-- verdade continua sendo o ledger; a coluna é sempre a sua projeção corrente.
--
-- MODELO DE IDENTIDADE: este projeto não tem tabela de "memberships" separada
-- — a membership de alguém é a própria linha de `profiles` (org_id + role).
-- Por isso "owner_membership_id"/"actor_membership_id" do blueprint
-- (docs/PLANO_ARCO_DA_PROVA_1.0.md §G) viram owner_user_id/actor_user_id
-- (UUID → auth.users), com o papel exibido guardado à parte (role_label) —
-- é a implementação concreta do conceito abstrato do blueprint.
--
-- SEGURANÇA DAS RPCs (achado desta sessão, não específico de nenhum P0
-- anterior): nenhuma migration deste repositório revoga EXECUTE das funções
-- que cria — por padrão do Postgres, toda função nova é executável por
-- PUBLIC. Para submit_wave_response isso é seguro (a segurança está no
-- próprio token, não em quem chama). Para as RPCs abaixo — que recebem
-- org_id como parâmetro e fariam escrita privilegiada em nome de QUALQUER
-- org se um cliente as chamasse direto — isso seria uma classe P0-04 nova.
-- Por isso: REVOKE EXECUTE ... FROM PUBLIC, authenticated, anon seguido de
-- GRANT ... TO service_role em todas as 5 funções — só alcançáveis via
-- action-plan.server.ts, depois de requireOrgAdmin(accessToken) resolver a
-- org real do chamador (nunca de payload do cliente).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.action_plans (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cycle_key         TEXT NOT NULL,
  season_name       TEXT NOT NULL,
  source_capsule_id UUID REFERENCES public.wave_capsules(id),
  status            TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed')),
  created_by        UUID NOT NULL REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at      TIMESTAMPTZ,
  UNIQUE (org_id, cycle_key)
);

-- NOTA DE DESENHO: um plano, uma vez criado, é um artefato CONGELADO — a
-- fila de prioridades pode se reordenar ao longo da temporada (nova cápsula
-- selada muda os pilares mais baixos), mas isso NUNCA deve reescrever
-- silenciosamente um plano já comprometido (dono/prazo já combinados com
-- alguém). Por isso a ação guarda um SNAPSHOT completo do agendamento
-- (esforço, semanas, embaixadoria, lente, ESG) tirado no momento da criação
-- — não recalculado a cada leitura — além dos campos §13 preenchidos depois.
-- Nota: o blueprint (docs/PLANO_ARCO_DA_PROVA_1.0.md §G) lista "driver_id"
-- como coluna própria de action_items/evidence_records, pensando numa futura
-- ponte com o crosswalk NR-1. O action-plan-engine ATUAL (Confirmado no
-- código) não expõe um driverId por ação — só lever_id, que já identifica a
-- intervenção de forma única. Em vez de inventar um valor, evidence_records
-- deriva lever_id do próprio item (ver record_evidence) — sem coluna
-- duplicada nem dado fictício. A ponte com driver/crosswalk fica para quando
-- o Cofre de Ciclos (S6.75) alimentar action-plan-engine com prioridade real.
CREATE TABLE IF NOT EXISTS public.action_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id           UUID NOT NULL REFERENCES public.action_plans(id) ON DELETE CASCADE,
  org_id            UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  rank              INTEGER NOT NULL,
  lever_id          TEXT NOT NULL,
  title             TEXT NOT NULL,
  description       TEXT NOT NULL DEFAULT '',
  effort            TEXT NOT NULL CHECK (effort IN ('baixo', 'medio', 'alto')),
  expected_ivo_lift NUMERIC NOT NULL DEFAULT 0,
  is_quick_win      BOOLEAN NOT NULL DEFAULT FALSE,
  amb_id            TEXT,
  amb_name          TEXT,
  amb_emoji         TEXT,
  lens_id           TEXT,
  lens_label        TEXT,
  lens_color        TEXT,
  esg_codes         TEXT[] NOT NULL DEFAULT '{}',
  start_week        INTEGER NOT NULL,
  end_week          INTEGER NOT NULL,
  milestone_week    INTEGER NOT NULL,
  weeks_budget      INTEGER NOT NULL,
  control_tier      TEXT CHECK (control_tier IS NULL OR control_tier IN ('eliminacao', 'organizacao', 'administrativa', 'monitoramento')),
  owner_user_id     UUID REFERENCES auth.users(id),
  owner_role_label  TEXT,
  due_on            DATE,
  metric_label      TEXT,
  metric_baseline   NUMERIC,
  metric_target     NUMERIC,
  metric_unit       TEXT,
  cmo_context       TEXT,
  cmo_mechanism     TEXT,
  cmo_outcome       TEXT,
  status            TEXT NOT NULL DEFAULT 'planejada' CHECK (status IN ('planejada', 'em_execucao', 'concluida', 'em_vigilancia', 'interrompida')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.evidence_records (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  item_id       UUID NOT NULL REFERENCES public.action_items(id) ON DELETE CASCADE,
  lever_id      TEXT NOT NULL, -- denormalizado do item no momento do INSERT (ver record_evidence)
  evidence_kind TEXT NOT NULL CHECK (evidence_kind IN ('texto', 'foto', 'checklist', 'metrica')),
  content_ref   TEXT NOT NULL,
  source_kind   TEXT NOT NULL DEFAULT 'direct' CHECK (source_kind IN ('direct', 'practice_record_ref')),
  consent_ref   TEXT,
  occurred_on   DATE NOT NULL,
  recorded_by   UUID NOT NULL REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.action_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id          UUID NOT NULL REFERENCES public.action_items(id) ON DELETE CASCADE,
  org_id           UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_kind       TEXT NOT NULL CHECK (event_kind IN ('status_change', 'checkin', 'note', 'maintenance_check', 'evidence_recorded')),
  actor_user_id    UUID NOT NULL REFERENCES auth.users(id),
  actor_role_label TEXT NOT NULL,
  to_status        TEXT CHECK (to_status IS NULL OR to_status IN ('planejada', 'em_execucao', 'concluida', 'em_vigilancia', 'interrompida')),
  maintained       BOOLEAN,
  evidence_id      UUID REFERENCES public.evidence_records(id),
  note             TEXT,
  occurred_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS action_items_plan_idx ON public.action_items (plan_id);
CREATE INDEX IF NOT EXISTS action_log_item_idx ON public.action_log (item_id);
CREATE INDEX IF NOT EXISTS evidence_records_item_idx ON public.evidence_records (item_id);

-- ─── RLS: leitura para qualquer membro da org; ESCRITA SÓ VIA RPC ───────────

ALTER TABLE public.action_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "action_plans_org_read" ON public.action_plans;
CREATE POLICY "action_plans_org_read" ON public.action_plans FOR SELECT
  USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "action_items_org_read" ON public.action_items;
CREATE POLICY "action_items_org_read" ON public.action_items FOR SELECT
  USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "action_log_org_read" ON public.action_log;
CREATE POLICY "action_log_org_read" ON public.action_log FOR SELECT
  USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "evidence_records_org_read" ON public.evidence_records;
CREATE POLICY "evidence_records_org_read" ON public.evidence_records FOR SELECT
  USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- Nenhuma policy de INSERT/UPDATE/DELETE: toda escrita passa pelas RPCs
-- SECURITY DEFINER abaixo, que rodam com privilégio próprio independente de
-- GRANT de tabela — e cujo EXECUTE é restrito a service_role (ver rodapé).
REVOKE ALL ON public.action_plans FROM authenticated, anon;
REVOKE ALL ON public.action_items FROM authenticated, anon;
REVOKE ALL ON public.action_log FROM authenticated, anon;
REVOKE ALL ON public.evidence_records FROM authenticated, anon;
GRANT SELECT ON public.action_plans TO authenticated;
GRANT SELECT ON public.action_items TO authenticated;
GRANT SELECT ON public.action_log TO authenticated;
GRANT SELECT ON public.evidence_records TO authenticated;
GRANT ALL ON public.action_plans TO service_role;
GRANT ALL ON public.action_items TO service_role;
GRANT ALL ON public.action_log TO service_role;
GRANT ALL ON public.evidence_records TO service_role;

-- ─── RPC 1 · Criar o plano (header + ações) ──────────────────────────────────

CREATE OR REPLACE FUNCTION public.create_action_plan(
  p_org_id            UUID,
  p_cycle_key         TEXT,
  p_season_name       TEXT,
  p_source_capsule_id UUID,
  p_created_by        UUID,
  p_items             JSONB
)
RETURNS TABLE(accepted BOOLEAN, reason TEXT, plan_id UUID)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_plan_id UUID;
  v_item    JSONB;
BEGIN
  IF EXISTS (SELECT 1 FROM public.action_plans WHERE org_id = p_org_id AND cycle_key = p_cycle_key) THEN
    RETURN QUERY SELECT FALSE, 'cycle_already_planned'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  INSERT INTO public.action_plans (org_id, cycle_key, season_name, source_capsule_id, created_by)
  VALUES (p_org_id, p_cycle_key, p_season_name, p_source_capsule_id, p_created_by)
  RETURNING id INTO v_plan_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO public.action_items (
      plan_id, org_id, rank, lever_id, title, description,
      effort, expected_ivo_lift, is_quick_win,
      amb_id, amb_name, amb_emoji, lens_id, lens_label, lens_color, esg_codes,
      start_week, end_week, milestone_week, weeks_budget, control_tier
    ) VALUES (
      v_plan_id, p_org_id,
      (v_item ->> 'rank')::INTEGER,
      v_item ->> 'lever_id',
      v_item ->> 'title',
      COALESCE(v_item ->> 'description', ''),
      v_item ->> 'effort',
      COALESCE((v_item ->> 'expected_ivo_lift')::NUMERIC, 0),
      COALESCE((v_item ->> 'is_quick_win')::BOOLEAN, FALSE),
      v_item ->> 'amb_id', v_item ->> 'amb_name', v_item ->> 'amb_emoji',
      v_item ->> 'lens_id', v_item ->> 'lens_label', v_item ->> 'lens_color',
      COALESCE((SELECT array_agg(x) FROM jsonb_array_elements_text(v_item -> 'esg_codes') x), '{}'),
      (v_item ->> 'start_week')::INTEGER,
      (v_item ->> 'end_week')::INTEGER,
      (v_item ->> 'milestone_week')::INTEGER,
      (v_item ->> 'weeks_budget')::INTEGER,
      v_item ->> 'control_tier'
    );
  END LOOP;

  RETURN QUERY SELECT TRUE, NULL::TEXT, v_plan_id;
END;
$$;

-- ─── RPC 2 · Definir accountability §13 de uma ação (só em plano draft) ─────

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
BEGIN
  SELECT ap.status INTO v_plan_status
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

-- ─── RPC 3 · Ativar o plano — o §13 como constraint de verdade ──────────────

CREATE OR REPLACE FUNCTION public.activate_action_plan(p_plan_id UUID)
RETURNS TABLE(accepted BOOLEAN, reason TEXT, incomplete_count INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_status     TEXT;
  v_incomplete INTEGER;
BEGIN
  SELECT status INTO v_status FROM public.action_plans WHERE id = p_plan_id FOR UPDATE;

  IF v_status IS NULL THEN
    RETURN QUERY SELECT FALSE, 'plan_not_found'::TEXT, 0;
    RETURN;
  END IF;
  IF v_status <> 'draft' THEN
    RETURN QUERY SELECT FALSE, 'plan_not_draft'::TEXT, 0;
    RETURN;
  END IF;

  SELECT COUNT(*) INTO v_incomplete FROM public.action_items
  WHERE plan_id = p_plan_id
    AND (owner_user_id IS NULL OR due_on IS NULL OR metric_label IS NULL
         OR metric_baseline IS NULL OR metric_target IS NULL);

  IF v_incomplete > 0 THEN
    RETURN QUERY SELECT FALSE, 'incomplete_section_13'::TEXT, v_incomplete;
    RETURN;
  END IF;

  UPDATE public.action_plans SET status = 'active', activated_at = NOW() WHERE id = p_plan_id;
  RETURN QUERY SELECT TRUE, NULL::TEXT, 0;
END;
$$;

-- ─── RPC 4 · Registrar evento no ledger — status/checkin/nota/vigia ─────────
-- Espelha exatamente VALID_TRANSITIONS de action-log-engine.ts (defesa em
-- profundidade: o engine puro já recusa a transição inválida no cliente;
-- esta RPC recusa de novo no banco, mesma disciplina de submit_wave_response).

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
BEGIN
  SELECT status, org_id INTO v_current_status, v_org_id
  FROM public.action_items WHERE id = p_item_id FOR UPDATE;

  IF v_current_status IS NULL THEN
    RETURN QUERY SELECT FALSE, 'item_not_found'::TEXT;
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

-- ─── RPC 5 · Registrar evidência (evidence_records + evento espelho) ────────

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
BEGIN
  SELECT org_id, lever_id INTO v_org_id, v_lever_id FROM public.action_items WHERE id = p_item_id;
  IF v_org_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'item_not_found'::TEXT, NULL::UUID;
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

-- ─── Trava de EXECUTE — só service_role chama estas 5 RPCs ──────────────────

REVOKE EXECUTE ON FUNCTION public.create_action_plan(UUID, TEXT, TEXT, UUID, UUID, JSONB) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.set_action_item_accountability(UUID, UUID, TEXT, DATE, TEXT, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.activate_action_plan(UUID) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.record_action_event(UUID, TEXT, UUID, TEXT, TEXT, BOOLEAN, TEXT) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.record_evidence(UUID, TEXT, TEXT, TEXT, TEXT, DATE, UUID, TEXT) FROM PUBLIC, authenticated, anon;

GRANT EXECUTE ON FUNCTION public.create_action_plan(UUID, TEXT, TEXT, UUID, UUID, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_action_item_accountability(UUID, UUID, TEXT, DATE, TEXT, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.activate_action_plan(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_action_event(UUID, TEXT, UUID, TEXT, TEXT, BOOLEAN, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_evidence(UUID, TEXT, TEXT, TEXT, TEXT, DATE, UUID, TEXT) TO service_role;
