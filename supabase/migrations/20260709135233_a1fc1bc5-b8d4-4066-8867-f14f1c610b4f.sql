-- ═══════════════════════════════════════════════════════════════════════════
-- OPS EVENTS — telemetria operacional mínima (P1-04, Plano Mestre EV-13)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- PROBLEMA: zero telemetria formal — uma falha de persistência em produção
-- só aparecia como console.warn no log da função (achável, mas ninguém olha
-- log sem saber que algo quebrou). "Falha silenciosa não seria descoberta;
-- pré-requisito de piloto" (EV-13).
--
-- DESENHO: tabela INSERT-only alimentada SÓ pelo servidor (service role,
-- nunca cliente — diferente de item_funnel_events, que é telemetria de
-- instrumento; esta é telemetria de OPERAÇÃO). O emissor TypeScript é
-- fire-and-forget e nunca lança: telemetria jamais derruba o fluxo que
-- observa.
--
-- PRIVACIDADE: um evento NUNCA carrega resposta, token (nem hash), e-mail
-- ou qualquer conteúdo — só o nome do evento, org/onda (UUIDs), motivo
-- curto e contexto mínimo. Não é dado de pesquisa (k-anon não se aplica);
-- ainda assim, o princípio é gravar o MÍNIMO que torna a falha visível.

CREATE TABLE IF NOT EXISTS public.ops_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event       TEXT NOT NULL,          -- nome canônico (whitelist no emissor TS)
  org_id      UUID,                   -- nullable: eventos anônimos não têm org resolvida
  wave_id     UUID,
  reason      TEXT,                   -- motivo curto de recusa/falha, quando houver
  context     JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ops_events ENABLE ROW LEVEL SECURITY;
-- Zero policies: só service role escreve e lê (leitor admin é org-scoped na
-- camada TS via requireOrgAdmin).

-- Lição do S5: o REVOKE explícito é obrigatório nesta conta (default
-- privileges concedem ALL em tabela nova).
REVOKE ALL ON public.ops_events FROM PUBLIC, authenticated, anon;
GRANT ALL ON public.ops_events TO service_role;

CREATE INDEX IF NOT EXISTS ops_events_org_occurred ON public.ops_events(org_id, occurred_at DESC);
