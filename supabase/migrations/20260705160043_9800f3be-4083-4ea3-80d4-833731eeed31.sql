
-- 1) Lock down SECURITY DEFINER functions: revoke from PUBLIC, grant narrowly
REVOKE EXECUTE ON FUNCTION public.is_invite_valid(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_invite_valid_for_wave(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mark_invite_used(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.count_wave_responses(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.submit_wave_response(uuid, text, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.provision_organization_from_invite(text, uuid, text, text, text, text, text, text, text, text, text) FROM PUBLIC;

-- Anonymous invite flow (respond via token): needs is_invite_valid_for_wave + submit_wave_response
GRANT EXECUTE ON FUNCTION public.is_invite_valid(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_invite_valid_for_wave(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_wave_response(uuid, text, jsonb) TO anon, authenticated;

-- Authenticated-only: provisioning org from invite runs after sign-in; counts for org members
GRANT EXECUTE ON FUNCTION public.provision_organization_from_invite(text, uuid, text, text, text, text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_wave_responses(uuid) TO authenticated;

-- mark_invite_used: only via server-side (service role / other definer fns)
GRANT EXECUTE ON FUNCTION public.mark_invite_used(text) TO service_role;

-- 2) org_invites: add explicit admin-only SELECT policy (RLS was locked with no policies)
CREATE POLICY "org_invites_admin_read" ON public.org_invites
  FOR SELECT TO authenticated
  USING (
    used_by_org_id IN (
      SELECT profiles.org_id FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = ANY (ARRAY['RH_ADMIN'::text, 'DIRETOR'::text])
    )
  );
COMMENT ON TABLE public.org_invites IS
  'Invite tokens. Direct access denied by default; token validation and consumption go through SECURITY DEFINER function provision_organization_from_invite. Admins of the target org may read via org_invites_admin_read.';

-- 3) wave_invites: explicit admin-scoped SELECT policy for org admins
CREATE POLICY "wave_invites_admin_read" ON public.wave_invites
  FOR SELECT TO authenticated
  USING (
    wave_id IN (
      SELECT w.id FROM public.waves w
      JOIN public.profiles p ON p.org_id = w.org_id
      WHERE p.id = auth.uid()
        AND p.role = ANY (ARRAY['RH_ADMIN'::text, 'DIRETOR'::text, 'SST'::text])
    )
  );
COMMENT ON TABLE public.wave_invites IS
  'Wave invite tokens. Token validation and consumption go through SECURITY DEFINER functions (is_invite_valid_for_wave, submit_wave_response). Org admins may list invites for their org via wave_invites_admin_read.';

-- 4) wave_responses: make fail-closed SELECT intent explicit and harden writes
COMMENT ON TABLE public.wave_responses IS
  'Raw individual responses. Deliberately NO SELECT policy: no client role can read individual answers. Aggregation happens server-side into wave_capsules (k-anon >= 5). Inserts only via SECURITY DEFINER submit_wave_response.';

-- Lock down direct table-level DML so all writes must go through submit_wave_response
REVOKE INSERT, UPDATE, DELETE ON public.wave_responses FROM anon, authenticated;
-- Drop the permissive direct-INSERT policy; SECURITY DEFINER function is the sole write path
DROP POLICY IF EXISTS "response_submit" ON public.wave_responses;

-- 5) wave_invites: also revoke direct DML from client roles (managed via definer fns / admins)
REVOKE INSERT, UPDATE, DELETE ON public.wave_invites FROM anon, authenticated;
GRANT ALL ON public.wave_invites TO service_role;
GRANT ALL ON public.wave_responses TO service_role;
