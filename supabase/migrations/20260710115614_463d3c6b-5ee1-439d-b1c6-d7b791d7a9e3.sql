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

REVOKE ALL ON public.leads FROM PUBLIC, authenticated, anon;

GRANT ALL ON public.leads TO service_role;

CREATE INDEX IF NOT EXISTS leads_created_at ON public.leads(created_at DESC);

CREATE INDEX IF NOT EXISTS leads_utm_source ON public.leads(utm_source);