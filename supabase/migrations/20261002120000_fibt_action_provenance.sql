-- IVO R6 — proveniência FIB-T nas ações e separação execução × aprendizagem
--
-- ═══════════════════════════════════════════════════════════════════════════
-- ESTADO: PREPARADA PARA REVISÃO. Desenvolvida e testada SOMENTE em banco
-- local descartável (scripts/db-replay-proof.ts + supabase/tests/07). Nenhuma
-- aplicação remota foi feita nem está autorizada por este arquivo.
-- ═══════════════════════════════════════════════════════════════════════════
--
-- O QUE MUDA (aditivo; nenhuma coluna existente é alterada ou removida)
--
-- 1. action_items ganha a ORIGEM da ação: lente, onda, coorte, fator, versão do
--    instrumento e instante da publicação que embasou a prioridade. São
--    REFERÊNCIAS — nenhum valor agregado, contagem ou resposta é copiado.
--    Tudo nulo = ação sem origem de lente (fluxo /plano-acao inalterado).
--    Tudo presente = origem FIB-T. Meio-termo é recusado por CHECK.
--
-- 2. A origem NÃO pode cruzar organizações, e isso é garantido pelo banco, não
--    só pela aplicação: FK composta (source_wave_id, org_id) → waves(id, org_id)
--    e (source_cohort_id, source_wave_id) → wave_cohorts(id, wave_id). Como
--    wave_cohorts já tem FK (wave_id, org_id) → waves(id, org_id), a coorte
--    citada pertence necessariamente à MESMA organização da ação — inclusive
--    para escrita direta por service_role.
--
-- 3. Ação de origem FIB-T não carrega expected_ivo_lift (conflito C6): o lift é
--    estimativa do motor de prioridades legado, não um resultado do instrumento.
--    CHECK fixa em 0.
--
-- 4. evidence_records passa a aceitar evidence_kind = 'aprendizagem' e expõe
--    evidence_scope (gerada): 'execucao' | 'aprendizagem'. NÃO existe escopo de
--    EFICÁCIA: concluir uma ação ou anexar um documento não comprova melhora de
--    indicador nem causalidade. Critério de eficácia é gate metodológico (C8).
--
-- 5. create_action_plan é substituída na MESMA assinatura (CREATE OR REPLACE):
--    a M6A (20260901120000) aborta diante de função nova em public. Só é
--    substituída onde já existe — no estado produtivo observado o módulo Action
--    Plan não está promovido (supabase/local/20_...), e esta migration não o
--    promove. A nova versão valida a proveniência ANTES de qualquer escrita:
--      · onda e coorte da MESMA organização do plano, instrumento FIB_T;
--      · leitura PUBLICADA da coorte (cohort_capsules.item_means não nulo);
--      · versão do instrumento e instante de publicação DERIVADOS do banco,
--        nunca aceitos do chamador;
--      · expected_ivo_lift = 0.
--
-- Idempotente: reaplicar não muda nada (ADD COLUMN IF NOT EXISTS, constraints
-- guardadas por pg_constraint, CHECK de evidence_kind recriado igual).

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Proveniência em action_items
-- ---------------------------------------------------------------------------

ALTER TABLE public.action_items
  ADD COLUMN IF NOT EXISTS source_lens_id            TEXT,
  ADD COLUMN IF NOT EXISTS source_wave_id            UUID,
  ADD COLUMN IF NOT EXISTS source_cohort_id          UUID,
  ADD COLUMN IF NOT EXISTS source_factor_id          TEXT,
  ADD COLUMN IF NOT EXISTS source_instrument_version TEXT,
  ADD COLUMN IF NOT EXISTS source_published_at       TIMESTAMPTZ;

DO $constraints$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'action_items_source_complete_ck') THEN
    ALTER TABLE public.action_items ADD CONSTRAINT action_items_source_complete_ck CHECK (
      (source_lens_id IS NULL AND source_wave_id IS NULL AND source_cohort_id IS NULL
        AND source_factor_id IS NULL AND source_instrument_version IS NULL
        AND source_published_at IS NULL)
      OR
      (source_lens_id = 'fibt' AND source_wave_id IS NOT NULL AND source_cohort_id IS NOT NULL
        AND source_factor_id ~ '^[a-z][a-z_]{0,39}$' AND source_instrument_version IS NOT NULL
        AND source_published_at IS NOT NULL)
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'action_items_source_no_ivo_lift_ck') THEN
    ALTER TABLE public.action_items ADD CONSTRAINT action_items_source_no_ivo_lift_ck
      CHECK (source_lens_id IS NULL OR expected_ivo_lift = 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'action_items_source_wave_org_fk') THEN
    ALTER TABLE public.action_items ADD CONSTRAINT action_items_source_wave_org_fk
      FOREIGN KEY (source_wave_id, org_id) REFERENCES public.waves(id, org_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'action_items_source_cohort_wave_fk') THEN
    ALTER TABLE public.action_items ADD CONSTRAINT action_items_source_cohort_wave_fk
      FOREIGN KEY (source_cohort_id, source_wave_id) REFERENCES public.wave_cohorts(id, wave_id);
  END IF;
END
$constraints$;

CREATE INDEX IF NOT EXISTS action_items_source_wave_idx
  ON public.action_items (source_wave_id) WHERE source_wave_id IS NOT NULL;

COMMENT ON COLUMN public.action_items.source_lens_id IS
  'Lente de origem da ação (hoje só ''fibt''). NULL = ação sem origem de lente. Referência, nunca valor.';
COMMENT ON COLUMN public.action_items.source_published_at IS
  'Instante da publicação protegida (cohort_capsules.published_at) que embasou a prioridade. Derivado no banco.';

-- ---------------------------------------------------------------------------
-- 2. Evidência: execução × aprendizagem (eficácia NÃO é registrável)
-- ---------------------------------------------------------------------------

ALTER TABLE public.evidence_records DROP CONSTRAINT IF EXISTS evidence_records_evidence_kind_check;
ALTER TABLE public.evidence_records ADD CONSTRAINT evidence_records_evidence_kind_check
  CHECK (evidence_kind IN ('texto', 'foto', 'checklist', 'metrica', 'aprendizagem'));

ALTER TABLE public.evidence_records
  ADD COLUMN IF NOT EXISTS evidence_scope TEXT
  GENERATED ALWAYS AS (
    CASE WHEN evidence_kind = 'aprendizagem' THEN 'aprendizagem' ELSE 'execucao' END
  ) STORED;

COMMENT ON COLUMN public.evidence_records.evidence_scope IS
  'execucao = a ação aconteceu; aprendizagem = o que a equipe aprendeu. Nenhum dos dois comprova eficácia (melhora de indicador) nem causalidade.';

-- ---------------------------------------------------------------------------
-- 3. create_action_plan — mesma assinatura, proveniência validada antes da escrita
-- ---------------------------------------------------------------------------

DO $replace$
BEGIN
  IF to_regprocedure('public.create_action_plan(uuid,text,text,uuid,uuid,jsonb)') IS NULL THEN
    RAISE NOTICE 'create_action_plan ausente neste ambiente (módulo Action Plan não promovido): só colunas e constraints foram aplicadas.';
    RETURN;
  END IF;

  EXECUTE $ddl$
CREATE OR REPLACE FUNCTION public.create_action_plan(
  p_org_id            UUID,
  p_cycle_key         TEXT,
  p_season_name       TEXT,
  p_source_capsule_id UUID,
  p_created_by        UUID,
  p_items             JSONB
)
RETURNS TABLE(accepted BOOLEAN, reason TEXT, plan_id UUID)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_plan_id UUID;
  v_item    JSONB;
  v_lens    TEXT;
  v_wave    UUID;
  v_cohort  UUID;
  v_version TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM public.action_plans WHERE org_id = p_org_id AND cycle_key = p_cycle_key) THEN
    RETURN QUERY SELECT FALSE, 'cycle_already_planned'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Validação de proveniência ANTES de qualquer escrita: uma recusa nunca
  -- deixa cabeçalho de plano órfão.
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_lens := NULLIF(v_item ->> 'source_lens_id', '');
    IF v_lens IS NULL THEN
      IF NULLIF(v_item ->> 'source_wave_id', '') IS NOT NULL
         OR NULLIF(v_item ->> 'source_cohort_id', '') IS NOT NULL
         OR NULLIF(v_item ->> 'source_factor_id', '') IS NOT NULL THEN
        RETURN QUERY SELECT FALSE, 'provenance_incomplete'::TEXT, NULL::UUID;
        RETURN;
      END IF;
      CONTINUE;
    END IF;

    IF v_lens <> 'fibt' THEN
      RETURN QUERY SELECT FALSE, 'provenance_unknown_lens'::TEXT, NULL::UUID;
      RETURN;
    END IF;
    IF COALESCE((v_item ->> 'expected_ivo_lift')::NUMERIC, 0) <> 0 THEN
      RETURN QUERY SELECT FALSE, 'provenance_forbids_ivo_lift'::TEXT, NULL::UUID;
      RETURN;
    END IF;
    IF NULLIF(v_item ->> 'source_wave_id', '') IS NULL
       OR NULLIF(v_item ->> 'source_cohort_id', '') IS NULL
       OR COALESCE(v_item ->> 'source_factor_id', '') !~ '^[a-z][a-z_]{0,39}$' THEN
      RETURN QUERY SELECT FALSE, 'provenance_incomplete'::TEXT, NULL::UUID;
      RETURN;
    END IF;

    v_wave := (v_item ->> 'source_wave_id')::UUID;
    v_cohort := (v_item ->> 'source_cohort_id')::UUID;

    -- Onda e coorte da MESMA organização do plano, instrumento FIB_T. Uma única
    -- recusa para "não existe", "é de outra organização" e "não é FIB-T": a
    -- resposta nunca confirma a existência de um id alheio.
    SELECT w.instrument_version INTO v_version
      FROM public.waves w
      JOIN public.wave_cohorts c ON c.wave_id = w.id AND c.org_id = w.org_id
     WHERE w.id = v_wave AND c.id = v_cohort
       AND w.org_id = p_org_id AND w.instrument = 'FIB_T';
    IF NOT FOUND THEN
      RETURN QUERY SELECT FALSE, 'provenance_cross_tenant_denied'::TEXT, NULL::UUID;
      RETURN;
    END IF;
    IF v_version IS NULL THEN
      RETURN QUERY SELECT FALSE, 'provenance_version_unknown'::TEXT, NULL::UUID;
      RETURN;
    END IF;

    -- Só leitura PUBLICADA embasa prioridade. Coorte protegida (abaixo de
    -- k_min, supressão complementar, lote pendente) não pode ser citada.
    IF NOT EXISTS (
      SELECT 1 FROM public.cohort_capsules cc
       WHERE cc.wave_id = v_wave AND cc.cohort_id = v_cohort
         AND cc.item_means IS NOT NULL AND cc.published_at IS NOT NULL
    ) THEN
      RETURN QUERY SELECT FALSE, 'source_not_published'::TEXT, NULL::UUID;
      RETURN;
    END IF;
  END LOOP;

  INSERT INTO public.action_plans (org_id, cycle_key, season_name, source_capsule_id, created_by)
  VALUES (p_org_id, p_cycle_key, p_season_name, p_source_capsule_id, p_created_by)
  RETURNING id INTO v_plan_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_lens := NULLIF(v_item ->> 'source_lens_id', '');
    v_wave := CASE WHEN v_lens IS NULL THEN NULL ELSE (v_item ->> 'source_wave_id')::UUID END;
    v_cohort := CASE WHEN v_lens IS NULL THEN NULL ELSE (v_item ->> 'source_cohort_id')::UUID END;

    INSERT INTO public.action_items (
      plan_id, org_id, rank, lever_id, title, description,
      effort, expected_ivo_lift, is_quick_win,
      amb_id, amb_name, amb_emoji, lens_id, lens_label, lens_color, esg_codes,
      start_week, end_week, milestone_week, weeks_budget, control_tier,
      source_lens_id, source_wave_id, source_cohort_id, source_factor_id,
      source_instrument_version, source_published_at
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
      v_item ->> 'control_tier',
      v_lens,
      v_wave,
      v_cohort,
      CASE WHEN v_lens IS NULL THEN NULL ELSE v_item ->> 'source_factor_id' END,
      (SELECT w.instrument_version FROM public.waves w WHERE w.id = v_wave),
      (SELECT cc.published_at FROM public.cohort_capsules cc
        WHERE cc.wave_id = v_wave AND cc.cohort_id = v_cohort AND cc.item_means IS NOT NULL)
    );
  END LOOP;

  RETURN QUERY SELECT TRUE, NULL::TEXT, v_plan_id;
END;
$fn$
$ddl$;

  -- CREATE OR REPLACE preserva a ACL existente; reemitida mesmo assim para que a
  -- allowlist da M6A (service_role apenas) valha por construção.
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.create_action_plan(UUID, TEXT, TEXT, UUID, UUID, JSONB) FROM PUBLIC, authenticated, anon';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.create_action_plan(UUID, TEXT, TEXT, UUID, UUID, JSONB) TO service_role';
END
$replace$;

COMMIT;
