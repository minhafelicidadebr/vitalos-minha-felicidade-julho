-- IVO PI-13 — incluir ação em plano existente e encerrar plano operacionalmente
--
-- ═══════════════════════════════════════════════════════════════════════════
-- ESTADO: PREPARADA PARA REVISÃO. Desenvolvida e testada SOMENTE em banco
-- local descartável (scripts/db-replay-proof.ts + supabase/tests/09). Nenhuma
-- aplicação remota foi feita nem está autorizada por este arquivo.
-- ═══════════════════════════════════════════════════════════════════════════
--
-- O QUE É (aditivo; nenhuma migration anterior foi reescrita)
--
--   1. Auditoria de encerramento em action_plans: closed_at, closed_by,
--      closed_by_role (mesmo padrão de created_by/activated_at). Um plano está
--      'closed' se e somente se as três existem (CHECK … IS TRUE, NOT VALID para
--      não reprovar linha legada; vale para toda gravação nova).
--   2. Auditoria de inclusão em action_items: add_request_id (chave de
--      idempotência enviada pelo servidor), added_by, added_by_role. Nulas nas
--      ações criadas junto com o plano; as três presentes nas incluídas depois.
--      Índice único parcial (plan_id, add_request_id): repetir o MESMO pedido não
--      duplica; dois pedidos distintos, ainda que parecidos, são duas ações.
--   3. Gatilhos no schema ivo_ledger (SECURITY INVOKER, sem EXECUTE nem USAGE
--      para papéis de API) que fazem do BANCO a autoridade das regras:
--        · ação só entra em plano da MESMA organização e nunca em plano closed;
--        · em plano 'active' a ação já nasce com o §13 completo (responsável,
--          prazo e indicador): plano ativo nunca contém ação sem accountability;
--        · origem FIB-T de ação nova é revalidada no banco (mesma organização,
--          instrumento FIB_T, leitura PUBLICADA) e versão/instante de publicação
--          são DERIVADOS aqui, nunca aceitos do chamador;
--        · rank da ação nova é max+1 sob trava da linha do plano;
--        · transições de plano: draft→active (RPC existente) e active→closed.
--          closed é terminal: nenhuma reabertura, nenhuma alteração posterior;
--        · active→closed exige plano não vazio e TODAS as ações em estado
--          operacional de saída (concluida, em_vigilancia, interrompida) —
--          avaliado sob a trava do plano, depois de qualquer inclusão em curso;
--        · plano closed não aceita nova ação, mudança de ação, evidência nem
--          evento de ledger.
--   4. Concorrência: inclusão, mudança de estado de ação e encerramento
--      serializam pela linha de action_plans (FOR NO KEY UPDATE na inclusão e no
--      UPDATE do plano; FOR SHARE na mudança de ação, evidência e evento). Uma
--      inclusão concorrente com o encerramento ou vence (e o encerramento passa a
--      ver a ação pendente) ou perde (e vê o plano closed). Não há leitura-
--      verificação-escrita sem trava.
--
-- O QUE NÃO É
--   · Não cria função em public (a M6A aborta função desconhecida em public) e
--     não concede EXECUTE nem DELETE a ninguém. A escrita continua sendo de
--     service_role, no servidor, DEPOIS de validar sessão e papel.
--   · Encerrar plano NÃO avalia eficácia, NÃO altera o IVO, NÃO aprova método e
--     NÃO toca protocolos, observações nem pareceres C8 (tabelas separadas; o
--     encerramento não escreve nelas e a avaliação segue possível depois).
--   · Não implementa PI-14 (resolução de outro ciclo): a coerência entre o ciclo
--     do plano e o da onda de origem é checada no servidor, que conhece o ciclo
--     canônico; o banco garante organização, instrumento e publicação.
--
-- DEPENDÊNCIAS: tabelas do ledger e da FIB-T (action_plans, action_items,
-- evidence_records, action_log, waves, wave_cohorts) e as colunas de proveniência
-- do R6 (source_*). Faltando qualquer uma, a migration não aplica nada (NOTICE).
-- As RPCs do ledger NÃO importam. cohort_capsules é lida só em tempo de execução
-- pelo gatilho de inclusão (plpgsql resolve a tabela na chamada): se faltar, a
-- inclusão com origem FIB-T falha fechada em vez de aceitar origem não verificada.
-- Ordem: 20260705100000 → 20261002120000 (R6) → 20261005120000 (C8) → esta.
-- Idempotente: reaplicar não muda nada.
BEGIN;
DO $pi13$
BEGIN
  IF to_regclass('public.action_plans') IS NULL
     OR to_regclass('public.action_items') IS NULL
     OR to_regclass('public.evidence_records') IS NULL
     OR to_regclass('public.action_log') IS NULL
     OR to_regclass('public.waves') IS NULL
     OR to_regclass('public.wave_cohorts') IS NULL THEN
    RAISE NOTICE 'IVO PI-13: tabela do ledger ou da FIB-T ausente — migration não aplica nada';
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'action_items' AND column_name = 'source_lens_id'
  ) THEN
    RAISE NOTICE 'IVO PI-13: proveniência R6 ausente em action_items — aplique 20261002120000 antes; migration não aplica nada';
    RETURN;
  END IF;

  EXECUTE $ddl$
    CREATE SCHEMA IF NOT EXISTS ivo_ledger;
    REVOKE ALL ON SCHEMA ivo_ledger FROM PUBLIC;
    COMMENT ON SCHEMA ivo_ledger IS
      'Gatilhos do Ledger de Transformação (IVO PI-13). Sem EXECUTE/USAGE para papéis de API; não é superfície pública.';

    -- ───────────────────────── auditoria de encerramento ─────────────────────────
    ALTER TABLE public.action_plans
      ADD COLUMN IF NOT EXISTS closed_at      TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS closed_by      UUID REFERENCES auth.users(id),
      ADD COLUMN IF NOT EXISTS closed_by_role TEXT;

    ALTER TABLE public.action_plans DROP CONSTRAINT IF EXISTS action_plans_closure_audit_ck;
    ALTER TABLE public.action_plans ADD CONSTRAINT action_plans_closure_audit_ck CHECK (
      (
        num_nonnulls(closed_at, closed_by, closed_by_role) IN (0, 3)
        AND ((status = 'closed') = (num_nonnulls(closed_at, closed_by, closed_by_role) = 3))
      ) IS TRUE
    ) NOT VALID;

    COMMENT ON COLUMN public.action_plans.closed_at IS
      'Instante do encerramento OPERACIONAL (definido pelo banco). Não indica eficácia, melhora do IVO nem aprovação de método.';

    -- ───────────────────────── auditoria de inclusão ─────────────────────────
    ALTER TABLE public.action_items
      ADD COLUMN IF NOT EXISTS add_request_id UUID,
      ADD COLUMN IF NOT EXISTS added_by       UUID REFERENCES auth.users(id),
      ADD COLUMN IF NOT EXISTS added_by_role  TEXT;

    ALTER TABLE public.action_items DROP CONSTRAINT IF EXISTS action_items_add_audit_ck;
    ALTER TABLE public.action_items ADD CONSTRAINT action_items_add_audit_ck CHECK (
      (num_nonnulls(add_request_id, added_by, added_by_role) IN (0, 3)) IS TRUE
    );

    CREATE UNIQUE INDEX IF NOT EXISTS action_items_add_request_uidx
      ON public.action_items (plan_id, add_request_id) WHERE add_request_id IS NOT NULL;

    COMMENT ON COLUMN public.action_items.add_request_id IS
      'Chave de idempotência da inclusão posterior à criação do plano. Nula nas ações criadas com o plano.';

    -- ───────────────────────── gatilhos (schema ivo_ledger) ─────────────────────────

    -- Inclusão de ação: trava o plano, recusa plano alheio/encerrado, exige §13 em
    -- plano ativo, revalida e deriva a origem, atribui o rank.
    CREATE OR REPLACE FUNCTION ivo_ledger.guard_item_insert() RETURNS trigger LANGUAGE plpgsql AS $fn$
    DECLARE
      v_plan_org    UUID;
      v_plan_status TEXT;
      v_version     TEXT;
      v_published   TIMESTAMPTZ;
    BEGIN
      SELECT org_id, status INTO v_plan_org, v_plan_status
        FROM public.action_plans WHERE id = NEW.plan_id FOR NO KEY UPDATE;
      IF NOT FOUND OR v_plan_org IS DISTINCT FROM NEW.org_id THEN
        RAISE EXCEPTION 'ivo_plan_not_found' USING ERRCODE = '23503';
      END IF;
      IF v_plan_status = 'closed' THEN
        RAISE EXCEPTION 'ivo_plan_closed' USING ERRCODE = '55000';
      END IF;
      IF v_plan_status = 'active' AND (
           NEW.owner_user_id IS NULL OR NEW.due_on IS NULL OR NEW.metric_label IS NULL
           OR NEW.metric_baseline IS NULL OR NEW.metric_target IS NULL) THEN
        RAISE EXCEPTION 'ivo_plan_active_needs_accountability' USING ERRCODE = '23514';
      END IF;

      IF NEW.source_lens_id IS NOT NULL AND NEW.source_wave_id IS NOT NULL AND NEW.source_cohort_id IS NOT NULL THEN
        SELECT w.instrument_version INTO v_version
          FROM public.waves w
          JOIN public.wave_cohorts c ON c.wave_id = w.id AND c.org_id = w.org_id
         WHERE w.id = NEW.source_wave_id AND c.id = NEW.source_cohort_id
           AND w.org_id = NEW.org_id AND w.instrument = 'FIB_T';
        IF NOT FOUND THEN
          RAISE EXCEPTION 'ivo_plan_origin_denied' USING ERRCODE = '23503';
        END IF;
        SELECT cc.published_at INTO v_published
          FROM public.cohort_capsules cc
         WHERE cc.wave_id = NEW.source_wave_id AND cc.cohort_id = NEW.source_cohort_id
           AND cc.item_means IS NOT NULL AND cc.published_at IS NOT NULL;
        IF NOT FOUND THEN
          RAISE EXCEPTION 'ivo_plan_source_not_published' USING ERRCODE = '23514';
        END IF;
        NEW.source_instrument_version := v_version;
        NEW.source_published_at := v_published;
      END IF;

      IF NEW.rank IS NULL THEN
        SELECT COALESCE(MAX(rank), 0) + 1 INTO NEW.rank FROM public.action_items WHERE plan_id = NEW.plan_id;
      END IF;
      RETURN NEW;
    END
    $fn$;

    -- Alteração de ação: plano encerrado é imutável; identidade e auditoria de
    -- inclusão não mudam. FOR SHARE conflita com o UPDATE do plano (encerramento).
    CREATE OR REPLACE FUNCTION ivo_ledger.guard_item_update() RETURNS trigger LANGUAGE plpgsql AS $fn$
    DECLARE
      v_plan_status TEXT;
    BEGIN
      IF NEW.plan_id IS DISTINCT FROM OLD.plan_id OR NEW.org_id IS DISTINCT FROM OLD.org_id THEN
        RAISE EXCEPTION 'ivo_plan_item_identity_immutable' USING ERRCODE = '42501';
      END IF;
      IF NEW.add_request_id IS DISTINCT FROM OLD.add_request_id
         OR NEW.added_by IS DISTINCT FROM OLD.added_by
         OR NEW.added_by_role IS DISTINCT FROM OLD.added_by_role THEN
        RAISE EXCEPTION 'ivo_plan_item_audit_immutable' USING ERRCODE = '42501';
      END IF;
      SELECT status INTO v_plan_status FROM public.action_plans WHERE id = OLD.plan_id FOR SHARE;
      IF v_plan_status = 'closed' THEN
        RAISE EXCEPTION 'ivo_plan_closed' USING ERRCODE = '55000';
      END IF;
      RETURN NEW;
    END
    $fn$;

    -- Plano: nasce em rascunho; só draft→active e active→closed; closed é terminal.
    CREATE OR REPLACE FUNCTION ivo_ledger.guard_plan_insert() RETURNS trigger LANGUAGE plpgsql AS $fn$
    BEGIN
      IF NEW.status <> 'draft' THEN
        RAISE EXCEPTION 'ivo_plan_insert_must_be_draft' USING ERRCODE = '23514';
      END IF;
      RETURN NEW;
    END
    $fn$;

    CREATE OR REPLACE FUNCTION ivo_ledger.guard_plan_update() RETURNS trigger LANGUAGE plpgsql AS $fn$
    DECLARE
      v_total   INTEGER;
      v_pending INTEGER;
    BEGIN
      IF OLD.status = 'closed' THEN
        RAISE EXCEPTION 'ivo_plan_closed_is_immutable' USING ERRCODE = '55000';
      END IF;
      IF NEW.id IS DISTINCT FROM OLD.id OR NEW.org_id IS DISTINCT FROM OLD.org_id THEN
        RAISE EXCEPTION 'ivo_plan_identity_immutable' USING ERRCODE = '42501';
      END IF;

      IF NEW.status IS DISTINCT FROM OLD.status THEN
        IF OLD.status = 'draft' AND NEW.status = 'active' THEN
          NULL; -- transição existente (RPC activate_action_plan)
        ELSIF OLD.status = 'active' AND NEW.status = 'closed' THEN
          IF NEW.closed_by IS NULL OR NEW.closed_by_role IS NULL OR btrim(NEW.closed_by_role) = '' THEN
            RAISE EXCEPTION 'ivo_plan_close_needs_actor' USING ERRCODE = '23514';
          END IF;
          -- A trava da linha do plano já está nesta transação: inclusões em curso
          -- terminaram (ou esperam), e a contagem abaixo as enxerga.
          SELECT COUNT(*), COUNT(*) FILTER (WHERE status NOT IN ('concluida', 'em_vigilancia', 'interrompida'))
            INTO v_total, v_pending
            FROM public.action_items WHERE plan_id = OLD.id;
          IF v_total = 0 THEN
            RAISE EXCEPTION 'ivo_plan_close_empty' USING ERRCODE = '55000';
          END IF;
          IF v_pending > 0 THEN
            RAISE EXCEPTION 'ivo_plan_close_pending' USING ERRCODE = '55000', DETAIL = v_pending::TEXT;
          END IF;
          NEW.closed_at := NOW();
        ELSIF OLD.status = 'draft' AND NEW.status = 'closed' THEN
          RAISE EXCEPTION 'ivo_plan_close_requires_active' USING ERRCODE = '55000';
        ELSE
          RAISE EXCEPTION 'ivo_plan_status_transition_invalid' USING ERRCODE = '55000';
        END IF;
      ELSIF NEW.closed_at IS DISTINCT FROM OLD.closed_at
         OR NEW.closed_by IS DISTINCT FROM OLD.closed_by
         OR NEW.closed_by_role IS DISTINCT FROM OLD.closed_by_role THEN
        RAISE EXCEPTION 'ivo_plan_closure_audit_immutable' USING ERRCODE = '42501';
      END IF;
      RETURN NEW;
    END
    $fn$;

    -- Evidência e evento de ledger: nada novo sob plano encerrado.
    CREATE OR REPLACE FUNCTION ivo_ledger.guard_child_insert() RETURNS trigger LANGUAGE plpgsql AS $fn$
    DECLARE
      v_plan_status TEXT;
    BEGIN
      SELECT p.status INTO v_plan_status
        FROM public.action_items i
        JOIN public.action_plans p ON p.id = i.plan_id
       WHERE i.id = NEW.item_id
         FOR SHARE OF p;
      IF v_plan_status = 'closed' THEN
        RAISE EXCEPTION 'ivo_plan_closed' USING ERRCODE = '55000';
      END IF;
      RETURN NEW;
    END
    $fn$;

    REVOKE ALL ON SCHEMA ivo_ledger FROM anon, authenticated;
    REVOKE ALL ON FUNCTION ivo_ledger.guard_item_insert() FROM PUBLIC, anon, authenticated;
    REVOKE ALL ON FUNCTION ivo_ledger.guard_item_update() FROM PUBLIC, anon, authenticated;
    REVOKE ALL ON FUNCTION ivo_ledger.guard_plan_insert() FROM PUBLIC, anon, authenticated;
    REVOKE ALL ON FUNCTION ivo_ledger.guard_plan_update() FROM PUBLIC, anon, authenticated;
    REVOKE ALL ON FUNCTION ivo_ledger.guard_child_insert() FROM PUBLIC, anon, authenticated;

    DROP TRIGGER IF EXISTS ivo_ledger_item_insert_guard ON public.action_items;
    CREATE TRIGGER ivo_ledger_item_insert_guard BEFORE INSERT ON public.action_items
      FOR EACH ROW EXECUTE FUNCTION ivo_ledger.guard_item_insert();
    DROP TRIGGER IF EXISTS ivo_ledger_item_update_guard ON public.action_items;
    CREATE TRIGGER ivo_ledger_item_update_guard BEFORE UPDATE ON public.action_items
      FOR EACH ROW EXECUTE FUNCTION ivo_ledger.guard_item_update();
    DROP TRIGGER IF EXISTS ivo_ledger_plan_insert_guard ON public.action_plans;
    CREATE TRIGGER ivo_ledger_plan_insert_guard BEFORE INSERT ON public.action_plans
      FOR EACH ROW EXECUTE FUNCTION ivo_ledger.guard_plan_insert();
    DROP TRIGGER IF EXISTS ivo_ledger_plan_update_guard ON public.action_plans;
    CREATE TRIGGER ivo_ledger_plan_update_guard BEFORE UPDATE ON public.action_plans
      FOR EACH ROW EXECUTE FUNCTION ivo_ledger.guard_plan_update();
    DROP TRIGGER IF EXISTS ivo_ledger_evidence_insert_guard ON public.evidence_records;
    CREATE TRIGGER ivo_ledger_evidence_insert_guard BEFORE INSERT ON public.evidence_records
      FOR EACH ROW EXECUTE FUNCTION ivo_ledger.guard_child_insert();
    DROP TRIGGER IF EXISTS ivo_ledger_log_insert_guard ON public.action_log;
    CREATE TRIGGER ivo_ledger_log_insert_guard BEFORE INSERT ON public.action_log
      FOR EACH ROW EXECUTE FUNCTION ivo_ledger.guard_child_insert();
  $ddl$;
END
$pi13$;
COMMIT;
