-- PROD-0.6C — TARGETED_HARNESS: schema mínimo sintético, estado PRÉ-A.
--
-- Reproduz apenas o que as migrations A, H e o bloco B tocam. NÃO é o schema
-- de produção, e o relatório não pode apresentá-lo como equivalente.
--
-- Papéis e o schema `auth` são STUBS do Supabase: um PostgreSQL 17 baunilha
-- não os traz. A limitação está declarada em PROD06_EVIDENCE_SCHEMA §5.

-- ── Extensão declarada explicitamente ───────────────────────────────────────
-- PGCRYPTO_DEPENDENCY_DECLARED: gen_random_bytes() (usado abaixo no DEFAULT
-- de wave_invites.token) não é núcleo do PostgreSQL -- vem de pgcrypto,
-- diferente de gen_random_uuid(), que é built-in desde a v13. Instalada só
-- neste PostgreSQL 17 efêmero e local, via checksums do próprio pacote da
-- imagem oficial `postgres:17` -- zero rede, zero extensão remota, nenhuma
-- outra extensão introduzida, sem impacto em Supabase, staging ou produção.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Papéis-stub ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sandbox_exec') THEN CREATE ROLE sandbox_exec NOLOGIN; END IF;
END $$;

-- ── Schema `auth` e identidade-stub ─────────────────────────────────────────
-- auth.uid() e auth.role() leem GUCs que o harness define por sessão com
-- SET LOCAL. NÃO é o GoTrue: é aproximação suficiente para exercitar o gate
-- interno de H, e insuficiente para provar comportamento de autenticação.
CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id    UUID PRIMARY KEY,
  email TEXT
);

CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID
LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('vitalos_proof.uid', true), '')::UUID
$$;

CREATE OR REPLACE FUNCTION auth.role() RETURNS TEXT
LANGUAGE sql STABLE AS $$
  SELECT coalesce(nullif(current_setting('vitalos_proof.role', true), ''), 'anon')
$$;

-- ── Marcador de ambiente ────────────────────────────────────────────────────
-- Reconfirmado antes de cada cenário. Sua ausência aborta o harness.
CREATE TABLE IF NOT EXISTS public.vitalos_proof_environment (
  marker     TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO public.vitalos_proof_environment (marker)
VALUES ('nonprod') ON CONFLICT DO NOTHING;

-- ── Tabelas funcionais, estado PRÉ-A ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.organizations (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug    TEXT UNIQUE NOT NULL,
  name    TEXT NOT NULL,
  pack_id TEXT NOT NULL DEFAULT 'enterprise',
  plan    TEXT NOT NULL DEFAULT 'pilot',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id       UUID NOT NULL REFERENCES public.organizations(id),
  role         TEXT NOT NULL DEFAULT 'COLABORADOR',
  display_name TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.waves (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES public.organizations(id),
  instrument    TEXT NOT NULL,
  label         TEXT,
  status        TEXT NOT NULL DEFAULT 'draft',
  invited_count INTEGER DEFAULT 0,
  closes_at     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  sealed_at     TIMESTAMPTZ,
  seal_outcome  TEXT
);

CREATE TABLE IF NOT EXISTS public.wave_invites (
  token      TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(24), 'base64'),
  wave_id    UUID NOT NULL REFERENCES public.waves(id),
  email      TEXT,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS wave_invites_wave_id ON public.wave_invites(wave_id);

-- A coluna e a FK que a Migration B remove. É o alvo da prova.
CREATE TABLE IF NOT EXISTS public.wave_responses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wave_id      UUID NOT NULL REFERENCES public.waves(id),
  invite_token TEXT CONSTRAINT wave_responses_invite_token_fkey
                 REFERENCES public.wave_invites(token),
  answers      JSONB NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS wave_responses_wave_id ON public.wave_responses(wave_id);
ALTER TABLE public.wave_responses ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.sector_links (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID NOT NULL REFERENCES public.organizations(id),
  wave_id      UUID NOT NULL REFERENCES public.waves(id),
  token_hash   TEXT NOT NULL UNIQUE,
  sector_label TEXT NOT NULL,
  access_mode  TEXT NOT NULL DEFAULT 'shared_sector',
  status       TEXT NOT NULL DEFAULT 'active',
  expires_at   TIMESTAMPTZ NOT NULL,
  revoked_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.sector_links ENABLE ROW LEVEL SECURITY;

-- ── submit_sector_response, versão PRÉ-A ────────────────────────────────────
-- Nomeia invite_token no INSERT (gravando NULL). É esta versão que o bloco B
-- substitui por CREATE OR REPLACE.
CREATE OR REPLACE FUNCTION public.submit_sector_response(
  p_token_hash TEXT,
  p_answers    JSONB
)
RETURNS TABLE(accepted BOOLEAN, reason TEXT, response_count INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_link  public.sector_links%ROWTYPE;
  v_count INTEGER;
BEGIN
  SELECT * INTO v_link FROM public.sector_links WHERE token_hash = p_token_hash;
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'invalid_token'::TEXT, 0;
    RETURN;
  END IF;

  INSERT INTO public.wave_responses (wave_id, invite_token, answers)
  VALUES (v_link.wave_id, NULL, p_answers);

  SELECT COUNT(*) INTO v_count FROM public.wave_responses WHERE wave_id = v_link.wave_id;
  RETURN QUERY SELECT TRUE, NULL::TEXT, v_count;
END;
$$;

-- ── Privilégios-base ────────────────────────────────────────────────────────
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT INSERT ON public.wave_responses TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON public.wave_invites TO authenticated;
GRANT SELECT, UPDATE ON public.wave_invites TO anon;
