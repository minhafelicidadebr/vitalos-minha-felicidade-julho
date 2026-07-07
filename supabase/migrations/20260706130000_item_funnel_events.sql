-- ═══════════════════════════════════════════════════════════════════════════
-- LUPA DA ESCUTA — telemetria k-anon do funil de resposta por item (I-M7,
-- Mensurar Vivo). Mede a qualidade do INSTRUMENTO — onde as pessoas param,
-- quanto tempo cada item consome — nunca vigia a pessoa.
-- ═══════════════════════════════════════════════════════════════════════════
--
-- SEM TOKEN, SEM IDENTIDADE, SEM org_id — por design (§E1 do blueprint,
-- "Dois Trilhos"): esta telemetria pertence ao Trilho A (voz coletiva, zero
-- identidade por arquitetura), e é deliberadamente CROSS-TENANT — o objetivo
-- é a governança editorial do instrumento (encurtar/reescrever um item
-- confuso) para TODAS as organizações, não um relatório por cliente. Nenhuma
-- linha desta tabela pode ser ligada a uma pessoa, um convite ou uma
-- organização específica.
--
-- item_timings é um snapshot {itemId: ms desde o início da sessão até a
-- primeira resposta daquele item} — só itens respondidos aparecem. O engine
-- puro (survey-telemetry-engine.ts) computa mediana de tempo incremental e
-- taxa de resposta por item a partir disso, sempre com corte k-anonimato ≥ 5
-- ANTES de qualquer leitura (nunca um corte de agregação menor é exposto).
--
-- INSERT-ONLY, sem SELECT para anon/authenticated: a leitura agregada
-- (k-anon aplicado no engine) passa só por service_role, via
-- survey-telemetry.server.ts. Mesma disciplina de wave_responses (P0-06/
-- P0-07): toda escrita passa pela RPC, nunca por INSERT direto na tabela —
-- validação de forma/sanidade em SQL, validação de domínio (itens/escala)
-- já aconteceu em TypeScript antes de chamar esta RPC.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.item_funnel_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id      TEXT NOT NULL,
  instrument   TEXT NOT NULL,
  total_items  INTEGER NOT NULL,
  completed    BOOLEAN NOT NULL,
  elapsed_ms   INTEGER NOT NULL,
  item_timings JSONB NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS item_funnel_events_lookup_idx
  ON public.item_funnel_events (pack_id, instrument, created_at DESC);

ALTER TABLE public.item_funnel_events ENABLE ROW LEVEL SECURITY;

-- Nenhuma policy de SELECT/INSERT direta — toda leitura via service_role,
-- toda escrita via a RPC abaixo (SECURITY DEFINER).
REVOKE ALL ON public.item_funnel_events FROM authenticated, anon;
GRANT ALL ON public.item_funnel_events TO service_role;

-- ─── RPC · Registrar um snapshot de sessão (INSERT-only, anônima) ───────────

CREATE OR REPLACE FUNCTION public.record_item_funnel_event(
  p_pack_id      TEXT,
  p_instrument   TEXT,
  p_total_items  INTEGER,
  p_completed    BOOLEAN,
  p_elapsed_ms   INTEGER,
  p_item_timings JSONB
)
RETURNS TABLE(accepted BOOLEAN, reason TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_pack_id IS NULL OR btrim(p_pack_id) = '' THEN
    RETURN QUERY SELECT FALSE, 'invalid_request'::TEXT;
    RETURN;
  END IF;

  IF p_instrument IS NULL OR btrim(p_instrument) = '' THEN
    RETURN QUERY SELECT FALSE, 'invalid_request'::TEXT;
    RETURN;
  END IF;

  IF p_total_items IS NULL OR p_total_items <= 0 OR p_total_items > 200 THEN
    RETURN QUERY SELECT FALSE, 'invalid_request'::TEXT;
    RETURN;
  END IF;

  IF p_completed IS NULL THEN
    RETURN QUERY SELECT FALSE, 'invalid_request'::TEXT;
    RETURN;
  END IF;

  -- Teto de sanidade de 1h — descarta outliers de aba deixada aberta em segundo plano.
  IF p_elapsed_ms IS NULL OR p_elapsed_ms < 0 OR p_elapsed_ms > 3600000 THEN
    RETURN QUERY SELECT FALSE, 'invalid_request'::TEXT;
    RETURN;
  END IF;

  IF p_item_timings IS NULL OR jsonb_typeof(p_item_timings) <> 'object' THEN
    RETURN QUERY SELECT FALSE, 'invalid_request'::TEXT;
    RETURN;
  END IF;

  INSERT INTO public.item_funnel_events (pack_id, instrument, total_items, completed, elapsed_ms, item_timings)
  VALUES (p_pack_id, p_instrument, p_total_items, p_completed, p_elapsed_ms, p_item_timings);

  RETURN QUERY SELECT TRUE, NULL::TEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_item_funnel_event(TEXT, TEXT, INTEGER, BOOLEAN, INTEGER, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_item_funnel_event(TEXT, TEXT, INTEGER, BOOLEAN, INTEGER, JSONB) TO anon, authenticated;
