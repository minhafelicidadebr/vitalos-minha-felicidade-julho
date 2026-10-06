-- IVO C8 — protocolo de eficácia, observações e pareceres (persistência)
--
-- ═══════════════════════════════════════════════════════════════════════════
-- ESTADO: PREPARADA PARA REVISÃO. Desenvolvida e testada SOMENTE em banco
-- local descartável (scripts/db-replay-proof.ts + supabase/tests/08). Nenhuma
-- aplicação remota foi feita nem está autorizada por este arquivo.
-- ═══════════════════════════════════════════════════════════════════════════
--
-- O QUE É (aditivo; nenhuma coluna ou objeto existente é removido/alterado,
-- exceto uma UNIQUE redundante (id, org_id) em action_items para FK composta)
--
--   efficacy_protocols    — protocolo por ação. RASCUNHO é editável (incompleto é
--                           permitido); REGISTRADO é imutável; revisar = nova linha
--                           (revision + 1, supersedes_id). Nenhum papel de API apaga.
--   efficacy_observations — medida posterior (append-only), dentro da janela.
--   efficacy_verdicts     — parecer do revisor (append-only). Parecer CONCLUSIVO só
--                           existe com governança D9 aprovada registrada no próprio
--                           parecer; sem ela só cabe "inconclusiva".
--
-- GARANTIAS NO BANCO (não só na aplicação)
--   · nenhum valor de leitura publicada é persistido: para origem
--     'leitura_publicada' o baseline e a observação guardam só a REFERÊNCIA
--     (coorte, ciclo, versões) — CHECK recusa chave extra, inclusive 'value';
--   · integridade entre organizações por FK composta (item_id, org_id);
--   · protocolo registrado é imutável; observações e pareceres são append-only
--     (UPDATE bloqueado por gatilho; DELETE direto não é concedido a nenhum papel de API —
--     a exclusão em cascata de ação/organização, porém, segue possível por FK);
--   · todos os CHECKs terminam em IS TRUE (lição R6-C1: CHECK que avalia NULL passa);
--   · revisor do parecer ≠ autor do protocolo e = papel revisor do protocolo;
--   · leitura por RLS (membros da própria organização); ESCRITA somente por
--     service_role, depois da validação de sessão/papel no servidor.
--
-- POR QUE NÃO HÁ FUNÇÃO NOVA EM public: a M6A (20260901120000) aborta diante de
-- função desconhecida em public. As funções de gatilho vivem no schema ivo_c8
-- (SECURITY INVOKER, sem EXECUTE para papéis de API).
--
-- DEPENDÊNCIA: somente a TABELA public.action_items (existe no estado produtivo
-- observado, onde as RPCs do ledger ainda não foram promovidas — aqui elas não
-- importam). Se action_items não existir, a migration não faz nada (NOTICE).
-- Ordem: 20260705100000 → 20261002120000 (R6) → esta. Idempotente.
BEGIN;
DO $c8$
BEGIN
  IF to_regclass('public.action_items') IS NULL THEN
    RAISE NOTICE 'IVO C8: tabela action_items ausente — migration não aplica nada';
    RETURN;
  END IF;

  -- FK composta (item_id, org_id) exige UNIQUE (id, org_id) no alvo.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.action_items'::regclass AND conname = 'action_items_id_org_key'
  ) THEN
    ALTER TABLE public.action_items ADD CONSTRAINT action_items_id_org_key UNIQUE (id, org_id);
  END IF;

  EXECUTE $ddl$
    CREATE SCHEMA IF NOT EXISTS ivo_c8;
    REVOKE ALL ON SCHEMA ivo_c8 FROM PUBLIC;

    -- ───────────────────────── protocolos ─────────────────────────
    CREATE TABLE IF NOT EXISTS public.efficacy_protocols (
      id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id                UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
      item_id               UUID NOT NULL,
      revision              INTEGER NOT NULL CHECK (revision >= 1),
      status                TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'registered')),
      supersedes_id         UUID,
      objective             TEXT,
      indicator_label       TEXT,
      indicator_kind        TEXT CHECK (indicator_kind IN ('execucao', 'resultado')),
      indicator_origin      TEXT CHECK (indicator_origin IN ('leitura_publicada', 'medida_da_organizacao')),
      unit                  TEXT,
      direction             TEXT CHECK (direction IN ('aumentar', 'diminuir')),
      baseline_observed_on  DATE,
      baseline_population   TEXT,
      baseline_source       TEXT,
      baseline_value        NUMERIC,
      baseline_ref          JSONB,
      target_kind           TEXT CHECK (target_kind IN ('numerico', 'qualitativo')),
      target_value          NUMERIC,
      target_criterion      TEXT,
      meaningful_difference NUMERIC,
      window_start          DATE,
      window_end            DATE,
      source                TEXT,
      comparison_rule       JSONB,
      responsible_role      TEXT,
      reviewer_role         TEXT,
      limitations           TEXT[] NOT NULL DEFAULT '{}',
      created_by            UUID NOT NULL REFERENCES auth.users(id),
      created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      registered_at         TIMESTAMPTZ,
      UNIQUE (id, org_id),
      UNIQUE (item_id, revision),
      FOREIGN KEY (item_id, org_id) REFERENCES public.action_items (id, org_id) ON DELETE CASCADE
    );
    CREATE UNIQUE INDEX IF NOT EXISTS efficacy_protocols_one_draft_per_item
      ON public.efficacy_protocols (item_id) WHERE status = 'draft';

    -- ───────────────────────── observações ─────────────────────────
    CREATE TABLE IF NOT EXISTS public.efficacy_observations (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
      protocol_id UUID NOT NULL,
      observed_on DATE NOT NULL,
      value       NUMERIC,
      ref         JSONB,
      note        TEXT NOT NULL DEFAULT '',
      recorded_by UUID NOT NULL REFERENCES auth.users(id),
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (id, org_id),
      FOREIGN KEY (protocol_id, org_id) REFERENCES public.efficacy_protocols (id, org_id) ON DELETE CASCADE
    );

    -- ───────────────────────── pareceres ─────────────────────────
    CREATE TABLE IF NOT EXISTS public.efficacy_verdicts (
      id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id               UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
      protocol_id          UUID NOT NULL,
      observation_id       UUID,
      verdict              TEXT NOT NULL CHECK (verdict IN ('meta_atingida', 'meta_nao_atingida', 'inconclusiva')),
      claim_scope          TEXT NOT NULL CHECK (claim_scope IN ('execucao', 'resultado')),
      evidence_grade       TEXT NOT NULL CHECK (evidence_grade IN ('descritiva', 'pre_pos', 'comparacao_referencia', 'desenho_causal')),
      observed_change      TEXT NOT NULL CHECK (observed_change IN ('melhorou', 'piorou', 'sem_mudanca', 'nao_comparavel')),
      target_reached       BOOLEAN,
      attribution_status   TEXT NOT NULL DEFAULT 'nao_avaliada' CHECK (attribution_status IN ('nao_avaliada', 'nao_sustentada', 'sustentada_por_desenho')),
      attribution_design   TEXT,
      reason               TEXT NOT NULL DEFAULT '',
      limitations          TEXT[] NOT NULL DEFAULT '{}',
      reviewer_user_id     UUID NOT NULL REFERENCES auth.users(id),
      reviewer_role        TEXT NOT NULL,
      governance_decision  TEXT NOT NULL,
      governance_state     TEXT NOT NULL,
      governance_source    TEXT NOT NULL CHECK (governance_source IN ('registro_canonico', 'teste_sintetico')),
      created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (id, org_id),
      FOREIGN KEY (protocol_id, org_id) REFERENCES public.efficacy_protocols (id, org_id) ON DELETE CASCADE,
      FOREIGN KEY (observation_id, org_id) REFERENCES public.efficacy_observations (id, org_id) ON DELETE CASCADE
    );

    -- ───────────────────────── CHECKs (sempre recriados; todos IS TRUE) ─────────────────────────
    ALTER TABLE public.efficacy_protocols DROP CONSTRAINT IF EXISTS efficacy_protocols_no_published_value;
    ALTER TABLE public.efficacy_protocols ADD CONSTRAINT efficacy_protocols_no_published_value CHECK (
      (
        (indicator_origin IS DISTINCT FROM 'leitura_publicada' OR baseline_value IS NULL)
        AND (indicator_origin IS DISTINCT FROM 'medida_da_organizacao' OR baseline_ref IS NULL)
      ) IS TRUE
    );
    ALTER TABLE public.efficacy_protocols DROP CONSTRAINT IF EXISTS efficacy_protocols_ref_shape;
    ALTER TABLE public.efficacy_protocols ADD CONSTRAINT efficacy_protocols_ref_shape CHECK (
      (
        baseline_ref IS NULL
        OR (
          jsonb_typeof(baseline_ref) = 'object'
          AND (baseline_ref - 'cohortKey' - 'cycleKey' - 'instrumentVersion' - 'calculationVersion' - 'publicationState') = '{}'::jsonb
          AND baseline_ref ?& ARRAY['cohortKey', 'cycleKey', 'instrumentVersion', 'calculationVersion', 'publicationState']
        )
      ) IS TRUE
    );
    ALTER TABLE public.efficacy_protocols DROP CONSTRAINT IF EXISTS efficacy_protocols_rule_shape;
    ALTER TABLE public.efficacy_protocols ADD CONSTRAINT efficacy_protocols_rule_shape CHECK (
      (
        comparison_rule IS NULL
        OR (
          jsonb_typeof(comparison_rule) = 'object'
          AND (comparison_rule - 'sameCohort' - 'sameInstrumentVersion' - 'sameCalculationVersion' - 'requirePublished') = '{}'::jsonb
          AND jsonb_typeof(comparison_rule -> 'sameCohort') = 'boolean'
          AND jsonb_typeof(comparison_rule -> 'sameInstrumentVersion') = 'boolean'
          AND jsonb_typeof(comparison_rule -> 'sameCalculationVersion') = 'boolean'
          AND comparison_rule -> 'requirePublished' = 'true'::jsonb
        )
      ) IS TRUE
    );
    ALTER TABLE public.efficacy_protocols DROP CONSTRAINT IF EXISTS efficacy_protocols_difference_nonneg;
    ALTER TABLE public.efficacy_protocols ADD CONSTRAINT efficacy_protocols_difference_nonneg CHECK (
      (meaningful_difference IS NULL OR meaningful_difference >= 0) IS TRUE
    );
    ALTER TABLE public.efficacy_protocols DROP CONSTRAINT IF EXISTS efficacy_protocols_registered_complete;
    ALTER TABLE public.efficacy_protocols ADD CONSTRAINT efficacy_protocols_registered_complete CHECK (
      status = 'draft' OR (
        objective IS NOT NULL AND char_length(btrim(objective)) >= 10
        AND indicator_label IS NOT NULL AND char_length(btrim(indicator_label)) >= 3
        AND indicator_kind IS NOT NULL
        AND indicator_origin IS NOT NULL
        AND unit IS NOT NULL AND char_length(btrim(unit)) >= 1
        AND source IS NOT NULL AND char_length(btrim(source)) >= 3
        AND window_start IS NOT NULL AND window_end IS NOT NULL AND window_start < window_end
        AND comparison_rule IS NOT NULL
        AND responsible_role IS NOT NULL AND char_length(btrim(responsible_role)) >= 2
        AND reviewer_role IS NOT NULL AND char_length(btrim(reviewer_role)) >= 2
        AND lower(btrim(responsible_role)) <> lower(btrim(reviewer_role))
        AND (
          indicator_kind <> 'resultado' OR (
            direction IS NOT NULL
            AND target_kind IS NOT NULL
            AND baseline_observed_on IS NOT NULL AND baseline_observed_on <= window_start
            AND baseline_population IS NOT NULL AND char_length(btrim(baseline_population)) >= 3
            AND baseline_source IS NOT NULL AND char_length(btrim(baseline_source)) >= 3
          )
        )
        AND (target_kind IS NULL OR target_kind <> 'numerico' OR target_value IS NOT NULL)
        AND (target_kind IS NULL OR target_kind <> 'qualitativo' OR (target_criterion IS NOT NULL AND char_length(btrim(target_criterion)) >= 10))
        AND (indicator_origin <> 'leitura_publicada' OR (
          indicator_kind = 'resultado'
          AND baseline_ref IS NOT NULL
          AND comparison_rule -> 'sameCohort' = 'true'::jsonb
          AND comparison_rule -> 'sameInstrumentVersion' = 'true'::jsonb
          AND comparison_rule -> 'sameCalculationVersion' = 'true'::jsonb
        ))
        AND (indicator_origin <> 'medida_da_organizacao' OR indicator_kind <> 'resultado' OR baseline_value IS NOT NULL)
      ) IS TRUE
    );

    ALTER TABLE public.efficacy_observations DROP CONSTRAINT IF EXISTS efficacy_observations_one_source;
    ALTER TABLE public.efficacy_observations ADD CONSTRAINT efficacy_observations_one_source CHECK (
      (num_nonnulls(value, ref) = 1) IS TRUE
    );
    ALTER TABLE public.efficacy_observations DROP CONSTRAINT IF EXISTS efficacy_observations_ref_shape;
    ALTER TABLE public.efficacy_observations ADD CONSTRAINT efficacy_observations_ref_shape CHECK (
      (
        ref IS NULL
        OR (
          jsonb_typeof(ref) = 'object'
          AND (ref - 'cohortKey' - 'cycleKey' - 'instrumentVersion' - 'calculationVersion' - 'publicationState') = '{}'::jsonb
          AND ref ?& ARRAY['cohortKey', 'cycleKey', 'instrumentVersion', 'calculationVersion', 'publicationState']
        )
      ) IS TRUE
    );

    ALTER TABLE public.efficacy_verdicts DROP CONSTRAINT IF EXISTS efficacy_verdicts_conclusive_needs_governance;
    ALTER TABLE public.efficacy_verdicts ADD CONSTRAINT efficacy_verdicts_conclusive_needs_governance CHECK (
      (
        verdict = 'inconclusiva'
        OR (
          governance_state IN ('aprovado_para_piloto', 'validado_para_uso_definido')
          AND observation_id IS NOT NULL
        )
      ) IS TRUE
    );
    ALTER TABLE public.efficacy_verdicts DROP CONSTRAINT IF EXISTS efficacy_verdicts_inconclusive_needs_reason;
    ALTER TABLE public.efficacy_verdicts ADD CONSTRAINT efficacy_verdicts_inconclusive_needs_reason CHECK (
      (verdict <> 'inconclusiva' OR char_length(btrim(reason)) >= 10) IS TRUE
    );
    ALTER TABLE public.efficacy_verdicts DROP CONSTRAINT IF EXISTS efficacy_verdicts_target_coherent;
    ALTER TABLE public.efficacy_verdicts ADD CONSTRAINT efficacy_verdicts_target_coherent CHECK (
      (
        (verdict <> 'meta_atingida' OR target_reached IS TRUE)
        AND (verdict <> 'meta_nao_atingida' OR target_reached IS FALSE)
      ) IS TRUE
    );
    ALTER TABLE public.efficacy_verdicts DROP CONSTRAINT IF EXISTS efficacy_verdicts_attribution_needs_design;
    ALTER TABLE public.efficacy_verdicts ADD CONSTRAINT efficacy_verdicts_attribution_needs_design CHECK (
      (
        attribution_status <> 'sustentada_por_desenho'
        OR (attribution_design IS NOT NULL AND char_length(btrim(attribution_design)) >= 10 AND evidence_grade = 'desenho_causal')
      ) IS TRUE
    );
    ALTER TABLE public.efficacy_verdicts DROP CONSTRAINT IF EXISTS efficacy_verdicts_execution_is_descriptive;
    ALTER TABLE public.efficacy_verdicts ADD CONSTRAINT efficacy_verdicts_execution_is_descriptive CHECK (
      (claim_scope <> 'execucao' OR evidence_grade = 'descritiva') IS TRUE
    );

    -- ───────────────────────── gatilhos (schema ivo_c8) ─────────────────────────
    CREATE OR REPLACE FUNCTION ivo_c8.guard_protocol() RETURNS trigger LANGUAGE plpgsql AS $fn$
    DECLARE
      v_prev public.efficacy_protocols%ROWTYPE;
    BEGIN
      IF TG_OP = 'INSERT' THEN
        IF NEW.status <> 'draft' THEN
          RAISE EXCEPTION 'efficacy_protocol_insert_must_be_draft' USING ERRCODE = '23514';
        END IF;
        IF NEW.revision = 1 THEN
          IF NEW.supersedes_id IS NOT NULL THEN
            RAISE EXCEPTION 'efficacy_protocol_revision_chain_invalid' USING ERRCODE = '23514';
          END IF;
        ELSE
          SELECT * INTO v_prev FROM public.efficacy_protocols
           WHERE item_id = NEW.item_id AND org_id = NEW.org_id AND revision = NEW.revision - 1;
          IF NOT FOUND OR v_prev.status <> 'registered' OR NEW.supersedes_id IS DISTINCT FROM v_prev.id THEN
            RAISE EXCEPTION 'efficacy_protocol_revision_chain_invalid' USING ERRCODE = '23514';
          END IF;
        END IF;
        RETURN NEW;
      END IF;
      -- UPDATE
      IF OLD.status = 'registered' THEN
        RAISE EXCEPTION 'efficacy_protocol_registered_is_immutable' USING ERRCODE = '42501';
      END IF;
      IF NEW.id <> OLD.id OR NEW.org_id <> OLD.org_id OR NEW.item_id <> OLD.item_id
         OR NEW.revision <> OLD.revision OR NEW.created_by <> OLD.created_by
         OR NEW.supersedes_id IS DISTINCT FROM OLD.supersedes_id THEN
        RAISE EXCEPTION 'efficacy_protocol_identity_immutable' USING ERRCODE = '42501';
      END IF;
      NEW.updated_at := NOW();
      IF NEW.status = 'registered' THEN
        NEW.registered_at := NOW();
      END IF;
      RETURN NEW;
    END
    $fn$;

    CREATE OR REPLACE FUNCTION ivo_c8.guard_observation() RETURNS trigger LANGUAGE plpgsql AS $fn$
    DECLARE
      v_p public.efficacy_protocols%ROWTYPE;
    BEGIN
      IF TG_OP <> 'INSERT' THEN
        RAISE EXCEPTION 'efficacy_observation_append_only' USING ERRCODE = '42501';
      END IF;
      SELECT * INTO v_p FROM public.efficacy_protocols WHERE id = NEW.protocol_id AND org_id = NEW.org_id;
      IF NOT FOUND OR v_p.status <> 'registered' THEN
        RAISE EXCEPTION 'efficacy_observation_needs_registered_protocol' USING ERRCODE = '23514';
      END IF;
      IF EXISTS (SELECT 1 FROM public.efficacy_protocols n WHERE n.item_id = v_p.item_id AND n.revision > v_p.revision) THEN
        RAISE EXCEPTION 'efficacy_observation_protocol_superseded' USING ERRCODE = '23514';
      END IF;
      IF NEW.observed_on < v_p.window_start OR NEW.observed_on > v_p.window_end THEN
        RAISE EXCEPTION 'efficacy_observation_outside_window' USING ERRCODE = '23514';
      END IF;
      IF v_p.indicator_origin = 'leitura_publicada' AND (NEW.value IS NOT NULL OR NEW.ref IS NULL) THEN
        RAISE EXCEPTION 'efficacy_observation_published_reading_is_reference_only' USING ERRCODE = '23514';
      END IF;
      IF v_p.indicator_origin = 'medida_da_organizacao' AND (NEW.ref IS NOT NULL OR NEW.value IS NULL) THEN
        RAISE EXCEPTION 'efficacy_observation_organization_measure_needs_value' USING ERRCODE = '23514';
      END IF;
      RETURN NEW;
    END
    $fn$;

    CREATE OR REPLACE FUNCTION ivo_c8.guard_verdict() RETURNS trigger LANGUAGE plpgsql AS $fn$
    DECLARE
      v_p public.efficacy_protocols%ROWTYPE;
      v_obs_protocol UUID;
    BEGIN
      IF TG_OP <> 'INSERT' THEN
        RAISE EXCEPTION 'efficacy_verdict_append_only' USING ERRCODE = '42501';
      END IF;
      SELECT * INTO v_p FROM public.efficacy_protocols WHERE id = NEW.protocol_id AND org_id = NEW.org_id;
      IF NOT FOUND OR v_p.status <> 'registered' THEN
        RAISE EXCEPTION 'efficacy_verdict_needs_registered_protocol' USING ERRCODE = '23514';
      END IF;
      IF EXISTS (SELECT 1 FROM public.efficacy_protocols n WHERE n.item_id = v_p.item_id AND n.revision > v_p.revision) THEN
        RAISE EXCEPTION 'efficacy_verdict_protocol_superseded' USING ERRCODE = '23514';
      END IF;
      IF NEW.claim_scope <> v_p.indicator_kind THEN
        RAISE EXCEPTION 'efficacy_verdict_scope_mismatch' USING ERRCODE = '23514';
      END IF;
      IF lower(btrim(NEW.reviewer_role)) <> lower(btrim(v_p.reviewer_role)) THEN
        RAISE EXCEPTION 'efficacy_verdict_reviewer_role_mismatch' USING ERRCODE = '42501';
      END IF;
      IF NEW.reviewer_user_id = v_p.created_by THEN
        RAISE EXCEPTION 'efficacy_verdict_reviewer_must_be_independent' USING ERRCODE = '42501';
      END IF;
      IF NEW.observation_id IS NOT NULL THEN
        SELECT protocol_id INTO v_obs_protocol FROM public.efficacy_observations
         WHERE id = NEW.observation_id AND org_id = NEW.org_id;
        IF v_obs_protocol IS DISTINCT FROM NEW.protocol_id THEN
          RAISE EXCEPTION 'efficacy_verdict_observation_mismatch' USING ERRCODE = '23514';
        END IF;
      END IF;
      RETURN NEW;
    END
    $fn$;

    DROP TRIGGER IF EXISTS efficacy_protocols_guard ON public.efficacy_protocols;
    CREATE TRIGGER efficacy_protocols_guard BEFORE INSERT OR UPDATE ON public.efficacy_protocols
      FOR EACH ROW EXECUTE FUNCTION ivo_c8.guard_protocol();
    DROP TRIGGER IF EXISTS efficacy_observations_guard ON public.efficacy_observations;
    CREATE TRIGGER efficacy_observations_guard BEFORE INSERT OR UPDATE ON public.efficacy_observations
      FOR EACH ROW EXECUTE FUNCTION ivo_c8.guard_observation();
    DROP TRIGGER IF EXISTS efficacy_verdicts_guard ON public.efficacy_verdicts;
    CREATE TRIGGER efficacy_verdicts_guard BEFORE INSERT OR UPDATE ON public.efficacy_verdicts
      FOR EACH ROW EXECUTE FUNCTION ivo_c8.guard_verdict();

    -- ───────────────────────── RLS e permissões ─────────────────────────
    ALTER TABLE public.efficacy_protocols ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.efficacy_observations ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.efficacy_verdicts ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS efficacy_protocols_org_read ON public.efficacy_protocols;
    CREATE POLICY efficacy_protocols_org_read ON public.efficacy_protocols FOR SELECT
      USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));
    DROP POLICY IF EXISTS efficacy_observations_org_read ON public.efficacy_observations;
    CREATE POLICY efficacy_observations_org_read ON public.efficacy_observations FOR SELECT
      USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));
    DROP POLICY IF EXISTS efficacy_verdicts_org_read ON public.efficacy_verdicts;
    CREATE POLICY efficacy_verdicts_org_read ON public.efficacy_verdicts FOR SELECT
      USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

    -- service_role recebe ALL por privilégio padrão do Supabase: revogar antes de conceder só o necessário.
    REVOKE ALL ON public.efficacy_protocols, public.efficacy_observations, public.efficacy_verdicts FROM PUBLIC, anon, authenticated, service_role;
    GRANT SELECT ON public.efficacy_protocols, public.efficacy_observations, public.efficacy_verdicts TO authenticated;
    GRANT SELECT, INSERT, UPDATE ON public.efficacy_protocols TO service_role;
    GRANT SELECT, INSERT ON public.efficacy_observations, public.efficacy_verdicts TO service_role;
  $ddl$;
END
$c8$;
COMMIT;
