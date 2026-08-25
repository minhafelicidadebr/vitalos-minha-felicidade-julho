-- 1) Privilege escalation: impedir auto-promoção via UPDATE em profiles
DROP POLICY IF EXISTS profile_own ON public.profiles;

CREATE POLICY profile_own_select ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY profile_own_update ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- service_role / postgres (server-side admin) podem alterar papel e organizacao.
  IF current_setting('request.jwt.claims', true) IS NULL
     OR coalesce(current_setting('request.jwt.claim.role', true),
                 (current_setting('request.jwt.claims', true)::jsonb ->> 'role')) = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'role changes are not allowed from client updates';
  END IF;
  IF NEW.org_id IS DISTINCT FROM OLD.org_id THEN
    RAISE EXCEPTION 'org_id changes are not allowed from client updates';
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'id changes are not allowed';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_prevent_privilege_escalation ON public.profiles;
CREATE TRIGGER profiles_prevent_privilege_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- 2) SECURITY DEFINER expostas na API sem necessidade: revogar de anon/authenticated
REVOKE ALL ON FUNCTION public.accept_member_invite(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.provision_organization_from_invite(text, uuid, text, text, text, text, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.submit_sector_response(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.count_wave_responses(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.count_cohort_participation(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_invite_valid(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_invite_valid_for_wave(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_invite_used(text) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.prevent_profile_privilege_escalation() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.accept_member_invite(text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.provision_organization_from_invite(text, uuid, text, text, text, text, text, text, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.submit_sector_response(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.count_wave_responses(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.count_cohort_participation(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_invite_valid(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_invite_valid_for_wave(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_invite_used(text) TO service_role;