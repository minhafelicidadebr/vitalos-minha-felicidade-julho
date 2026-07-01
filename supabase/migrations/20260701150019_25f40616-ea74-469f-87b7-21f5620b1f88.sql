CREATE TABLE IF NOT EXISTS public.org_invites (
  token          TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(24), 'base64url'),
  created_by     UUID REFERENCES auth.users(id),
  email          TEXT,
  used_at        TIMESTAMPTZ,
  used_by_org_id UUID REFERENCES public.organizations(id),
  expires_at     TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

GRANT ALL ON public.org_invites TO service_role;

CREATE INDEX IF NOT EXISTS org_invites_created_by ON public.org_invites(created_by);

ALTER TABLE public.org_invites ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.org_invites ADD COLUMN IF NOT EXISTS used_by_org_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.org_invites ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days');

ALTER TABLE public.org_invites ENABLE ROW LEVEL SECURITY;