-- ═══════════════════════════════════════════════════════════════════════════
-- LEADS — captura real de leads comerciais (P1-05, S7 Porta de Entrada)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- PROBLEMA: o modal "Receber apresentação executiva" (LandingModal.tsx)
-- existia desde antes, honestamente rotulado "demonstração visual — nenhum
-- dado é enviado ou armazenado". Zero captura de leads real (EV-14/P1-05).
--
-- DESENHO: tabela simples, sem RPC — diferente de wave_responses/
-- sector_links (que precisam de trava de concorrência sobre um convite de
-- uso único), aqui não há recurso compartilhado disputado: cada submissão é
-- independente. O servidor (TanStack Start server function, nunca o
-- cliente) grava via service role, mesmo padrão de wave_capsules upsert
-- direto. Zero policy de SELECT — só o painel admin (founder) lê, via
-- service role, gated pela mesma allowlist de /plataforma.
--
-- PRIVACIDADE: dado de contato B2B fornecido voluntariamente pelo próprio
-- lead para ser contatado — não é dado de pesquisa (k-anon não se aplica
-- aqui, é o oposto: a pessoa QUER ser identificada para receber contato).
-- Consentimento explícito + versão são campos obrigatórios (nunca uma
-- submissão sem os dois).

CREATE TABLE IF NOT EXISTS public.leads (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  company          TEXT NOT NULL,
  role             TEXT,
  email            TEXT NOT NULL,
  whatsapp         TEXT,
  interest         TEXT NOT NULL,
  source_page      TEXT NOT NULL,
  utm_source       TEXT,
  utm_medium       TEXT,
  utm_campaign     TEXT,
  utm_term         TEXT,
  utm_content      TEXT,
  consent          BOOLEAN NOT NULL,
  consent_version  TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
-- Zero policies: nenhum cliente lê ou escreve direto — só service role
-- (server function pública faz o INSERT; painel admin faz o SELECT).

-- Lição do S5/S6.75/S6.8 (ALTER DEFAULT PRIVILEGES desta conta concede ALL
-- em tabela nova): o REVOKE explícito é obrigatório, nunca opcional.
REVOKE ALL ON public.leads FROM PUBLIC, authenticated, anon;
GRANT ALL ON public.leads TO service_role;

CREATE INDEX IF NOT EXISTS leads_created_at ON public.leads(created_at DESC);
CREATE INDEX IF NOT EXISTS leads_utm_source ON public.leads(utm_source);

-- ── Verificação pós-aplicação (colar no Lovable depois de aplicar) ───────────
-- SELECT has_table_privilege('anon', 'public.leads', 'SELECT');           -- false
-- SELECT has_table_privilege('authenticated', 'public.leads', 'INSERT');  -- false
