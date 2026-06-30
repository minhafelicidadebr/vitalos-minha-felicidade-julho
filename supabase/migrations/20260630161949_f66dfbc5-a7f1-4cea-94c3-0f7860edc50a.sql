
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
  pack_id TEXT NOT NULL DEFAULT 'enterprise',
  plan TEXT NOT NULL DEFAULT 'pilot',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  role TEXT NOT NULL DEFAULT 'COLABORADOR',
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

CREATE TABLE IF NOT EXISTS public.waves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  instrument TEXT NOT NULL, label TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  invited_count INTEGER DEFAULT 0,
  closes_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW(),
  sealed_at TIMESTAMPTZ, seal_outcome TEXT
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.waves TO authenticated;
GRANT ALL ON public.waves TO service_role;

CREATE TABLE IF NOT EXISTS public.wave_invites (
  token TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(24), 'base64'),
  wave_id UUID NOT NULL REFERENCES public.waves(id),
  used_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE ON public.wave_invites TO authenticated;
GRANT SELECT, UPDATE ON public.wave_invites TO anon;
GRANT ALL ON public.wave_invites TO service_role;
CREATE INDEX IF NOT EXISTS wave_invites_wave_id ON public.wave_invites(wave_id);

CREATE TABLE IF NOT EXISTS public.wave_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wave_id UUID NOT NULL REFERENCES public.waves(id),
  invite_token TEXT REFERENCES public.wave_invites(token),
  answers JSONB NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);
GRANT INSERT ON public.wave_responses TO authenticated, anon;
GRANT ALL ON public.wave_responses TO service_role;
CREATE INDEX IF NOT EXISTS wave_responses_wave_id ON public.wave_responses(wave_id);

CREATE TABLE IF NOT EXISTS public.wave_capsules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wave_id UUID NOT NULL REFERENCES public.waves(id),
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  instrument TEXT NOT NULL, participant_count INTEGER NOT NULL,
  aggregated_at TIMESTAMPTZ DEFAULT NOW(),
  closed_on TEXT, cohort_id TEXT,
  dimensions JSONB NOT NULL, outcomes JSONB, suppressed_dims TEXT[]
);
GRANT SELECT ON public.wave_capsules TO authenticated;
GRANT ALL ON public.wave_capsules TO service_role;
CREATE INDEX IF NOT EXISTS wave_capsules_org_id ON public.wave_capsules(org_id);
CREATE INDEX IF NOT EXISTS wave_capsules_wave_id ON public.wave_capsules(wave_id);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wave_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wave_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wave_capsules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_own" ON public.organizations FOR SELECT USING (id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "profile_own" ON public.profiles FOR ALL USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "waves_org" ON public.waves FOR SELECT USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "waves_admin_write" ON public.waves FOR ALL USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid() AND role IN ('RH_ADMIN','DIRETOR','SST')));
CREATE POLICY "response_submit" ON public.wave_responses FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.wave_invites WHERE token = wave_responses.invite_token AND used_at IS NULL));
CREATE POLICY "capsule_org" ON public.wave_capsules FOR SELECT USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE OR REPLACE FUNCTION public.count_wave_responses(p_wave_id UUID)
RETURNS INTEGER LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*)::INTEGER FROM public.wave_responses WHERE wave_id = p_wave_id;
$$;

CREATE OR REPLACE FUNCTION public.is_invite_valid(p_token TEXT)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.wave_invites WHERE token = p_token AND used_at IS NULL);
$$;
