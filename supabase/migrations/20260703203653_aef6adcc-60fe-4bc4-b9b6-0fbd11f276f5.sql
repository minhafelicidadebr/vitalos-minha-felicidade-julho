ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS cnpj TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS team_size_band TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS segment TEXT;
ALTER TABLE public.org_invites ADD COLUMN IF NOT EXISTS plan TEXT;
ALTER TABLE public.wave_invites ADD COLUMN IF NOT EXISTS emailed_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.is_invite_valid_for_wave(p_wave_id UUID, p_token TEXT)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.wave_invites
    WHERE token = p_token AND wave_id = p_wave_id AND used_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.mark_invite_used(p_token TEXT)
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.wave_invites SET used_at = NOW() WHERE token = p_token AND used_at IS NULL;
$$;

REVOKE UPDATE (role, org_id) ON public.profiles FROM authenticated;

CREATE OR REPLACE FUNCTION public.provision_organization_from_invite(
  p_invite_token   TEXT,
  p_user_id        UUID,
  p_org_name       TEXT,
  p_org_slug       TEXT,
  p_pack_id        TEXT,
  p_role           TEXT,
  p_cnpj           TEXT,
  p_team_size_band TEXT,
  p_phone          TEXT,
  p_address        TEXT DEFAULT NULL,
  p_segment        TEXT DEFAULT NULL
)
RETURNS TABLE(org_id UUID, profile_id UUID, plan TEXT, error TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_invite     public.org_invites%ROWTYPE;
  v_user_email TEXT;
  v_org_id     UUID;
BEGIN
  SELECT * INTO v_invite FROM public.org_invites WHERE token = p_invite_token FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::UUID, NULL::UUID, NULL::TEXT, 'invalid_token'::TEXT;
    RETURN;
  END IF;
  IF v_invite.used_at IS NOT NULL THEN
    RETURN QUERY SELECT NULL::UUID, NULL::UUID, NULL::TEXT, 'already_used'::TEXT;
    RETURN;
  END IF;
  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < NOW() THEN
    RETURN QUERY SELECT NULL::UUID, NULL::UUID, NULL::TEXT, 'expired'::TEXT;
    RETURN;
  END IF;
  IF v_invite.email IS NOT NULL THEN
    SELECT email INTO v_user_email FROM auth.users WHERE id = p_user_id;
    IF v_user_email IS NULL OR lower(v_user_email) <> lower(v_invite.email) THEN
      RETURN QUERY SELECT NULL::UUID, NULL::UUID, NULL::TEXT, 'email_mismatch'::TEXT;
      RETURN;
    END IF;
  END IF;
  BEGIN
    INSERT INTO public.organizations (slug, name, pack_id, plan, cnpj, team_size_band, phone, address, segment)
    VALUES (
      p_org_slug, p_org_name, p_pack_id, COALESCE(v_invite.plan, 'pilot'),
      p_cnpj, p_team_size_band, p_phone, p_address, p_segment
    )
    RETURNING id INTO v_org_id;
  EXCEPTION
    WHEN unique_violation THEN
      RETURN QUERY SELECT NULL::UUID, NULL::UUID, NULL::TEXT, 'slug_taken'::TEXT;
      RETURN;
  END;
  INSERT INTO public.profiles (id, org_id, role, display_name)
  VALUES (p_user_id, v_org_id, p_role, p_org_name);
  UPDATE public.org_invites SET used_at = NOW(), used_by_org_id = v_org_id WHERE token = p_invite_token;
  RETURN QUERY SELECT v_org_id, p_user_id, COALESCE(v_invite.plan, 'pilot'), NULL::TEXT;
END;
$$;

DROP POLICY IF EXISTS "response_submit" ON public.wave_responses;
CREATE POLICY "response_submit" ON public.wave_responses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.wave_invites
      WHERE token = wave_responses.invite_token
        AND wave_id = wave_responses.wave_id
        AND used_at IS NULL
    )
  );

CREATE OR REPLACE FUNCTION public.submit_wave_response(
  p_wave_id      UUID,
  p_invite_token TEXT,
  p_answers      JSONB
)
RETURNS TABLE(accepted BOOLEAN, reason TEXT, response_count INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_invite      public.wave_invites%ROWTYPE;
  v_wave_status TEXT;
  v_count       INTEGER;
BEGIN
  SELECT * INTO v_invite FROM public.wave_invites WHERE token = p_invite_token FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'invalid_token'::TEXT, 0;
    RETURN;
  END IF;
  IF v_invite.used_at IS NOT NULL THEN
    RETURN QUERY SELECT FALSE, 'already_used'::TEXT, 0;
    RETURN;
  END IF;
  IF v_invite.wave_id <> p_wave_id THEN
    RETURN QUERY SELECT FALSE, 'invalid_token'::TEXT, 0;
    RETURN;
  END IF;
  SELECT status INTO v_wave_status FROM public.waves WHERE id = p_wave_id;
  IF v_wave_status IS NULL OR v_wave_status IN ('sealed', 'cancelled', 'archived') THEN
    RETURN QUERY SELECT FALSE, 'wave_not_open'::TEXT, 0;
    RETURN;
  END IF;
  INSERT INTO public.wave_responses (wave_id, invite_token, answers)
  VALUES (p_wave_id, p_invite_token, p_answers);
  UPDATE public.wave_invites SET used_at = NOW() WHERE token = p_invite_token;
  SELECT COUNT(*) INTO v_count FROM public.wave_responses WHERE wave_id = p_wave_id;
  RETURN QUERY SELECT TRUE, NULL::TEXT, v_count;
END;
$$;

DO $$
BEGIN
  ALTER TABLE public.wave_capsules ADD CONSTRAINT wave_capsules_wave_id_unique UNIQUE (wave_id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;