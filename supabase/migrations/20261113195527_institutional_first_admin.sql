-- Extensão restrita do perfil único empresarial. Sem RPC pública nova.
-- service_role ignora RLS: a autoridade da plataforma é validada no servidor;
-- triggers garantem integridade, concorrência e aceite atômico no banco.
BEGIN;
CREATE SCHEMA IF NOT EXISTS institutional;
REVOKE ALL ON SCHEMA institutional FROM PUBLIC, anon, authenticated;

CREATE TABLE public.first_admin_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  recipient_email TEXT NOT NULL CHECK (recipient_email = lower(btrim(recipient_email)) AND length(recipient_email) BETWEEN 3 AND 254),
  role TEXT NOT NULL DEFAULT 'RH_ADMIN' CHECK (role = 'RH_ADMIN'),
  token_hash TEXT NOT NULL UNIQUE CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  request_id UUID NOT NULL,
  issued_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_by UUID REFERENCES auth.users(id),
  accepted_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id),
  revoked_at TIMESTAMPTZ,
  UNIQUE (issued_by, request_id),
  CHECK (expires_at > created_at AND expires_at <= created_at + interval '30 days'),
  CHECK ((accepted_by IS NULL) = (accepted_at IS NULL)),
  CHECK ((revoked_by IS NULL) = (revoked_at IS NULL)),
  CHECK (accepted_at IS NULL OR revoked_at IS NULL)
);
CREATE UNIQUE INDEX first_admin_one_pending ON public.first_admin_invites(org_id)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;
ALTER TABLE public.first_admin_invites ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.first_admin_invites FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.first_admin_invites TO service_role;
REVOKE DELETE, TRUNCATE ON public.first_admin_invites FROM service_role;

CREATE FUNCTION institutional.guard_first_admin_invite() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
DECLARE v_pack TEXT; v_email TEXT; v_verified TIMESTAMPTZ; v_profile public.profiles%ROWTYPE;
BEGIN
  IF current_user::text IN ('anon','authenticated','authenticator') THEN
    RAISE EXCEPTION 'first_admin_forbidden' USING ERRCODE = '42501';
  END IF;
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'first_admin_immutable'; END IF;
  -- Organização é o lock comum de emissão, aceite e revogação.
  SELECT pack_id INTO v_pack FROM public.organizations WHERE id = NEW.org_id FOR UPDATE;
  IF NOT FOUND OR v_pack IS DISTINCT FROM 'enterprise' THEN RAISE EXCEPTION 'first_admin_organization_unavailable'; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.accepted_by IS NOT NULL OR NEW.accepted_at IS NOT NULL OR NEW.revoked_by IS NOT NULL OR NEW.revoked_at IS NOT NULL THEN
      RAISE EXCEPTION 'first_admin_immutable';
    END IF;
    IF EXISTS (SELECT 1 FROM public.profiles WHERE org_id = NEW.org_id AND role = 'RH_ADMIN') THEN
      RAISE EXCEPTION 'first_admin_admin_exists';
    END IF;
    RETURN NEW;
  END IF;
  IF (to_jsonb(NEW) - ARRAY['accepted_by','accepted_at','revoked_by','revoked_at']) IS DISTINCT FROM
     (to_jsonb(OLD) - ARRAY['accepted_by','accepted_at','revoked_by','revoked_at']) THEN
    RAISE EXCEPTION 'first_admin_immutable';
  END IF;
  IF OLD.accepted_at IS NOT NULL THEN
    IF NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'first_admin_immutable'; END IF;
    RETURN OLD;
  END IF;
  IF OLD.revoked_at IS NOT NULL THEN
    IF NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'first_admin_revoked'; END IF;
    RETURN OLD;
  END IF;
  IF NEW.revoked_by IS NOT NULL THEN
    IF NEW.accepted_by IS NOT NULL THEN RAISE EXCEPTION 'first_admin_immutable'; END IF;
    NEW.revoked_at := now();
    RETURN NEW;
  END IF;
  IF NEW.accepted_by IS NULL OR NEW.accepted_at IS NOT NULL OR NEW.revoked_at IS NOT NULL THEN
    RAISE EXCEPTION 'first_admin_immutable';
  END IF;
  IF OLD.expires_at <= now() THEN RAISE EXCEPTION 'first_admin_expired'; END IF;
  -- Serializa convites para a mesma identidade, inclusive entre empresas.
  SELECT lower(email), email_confirmed_at INTO v_email, v_verified
    FROM auth.users WHERE id = NEW.accepted_by FOR UPDATE;
  IF v_email IS DISTINCT FROM OLD.recipient_email THEN RAISE EXCEPTION 'first_admin_identity_mismatch'; END IF;
  IF v_verified IS NULL THEN RAISE EXCEPTION 'first_admin_unverified_identity'; END IF;
  SELECT * INTO v_profile FROM public.profiles WHERE id = NEW.accepted_by;
  IF FOUND AND (v_profile.org_id IS DISTINCT FROM OLD.org_id OR v_profile.role IS DISTINCT FROM OLD.role) THEN
    RAISE EXCEPTION 'first_admin_profile_conflict';
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE org_id = OLD.org_id AND role = 'RH_ADMIN' AND id <> NEW.accepted_by) THEN
    RAISE EXCEPTION 'first_admin_admin_exists';
  END IF;
  IF v_profile.id IS NULL THEN
    INSERT INTO public.profiles(id, org_id, role, display_name)
      VALUES(NEW.accepted_by, OLD.org_id, OLD.role, split_part(v_email,'@',1));
  END IF;
  NEW.accepted_at := now();
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION institutional.guard_first_admin_invite() FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA institutional TO service_role;
GRANT EXECUTE ON FUNCTION institutional.guard_first_admin_invite() TO service_role;
CREATE TRIGGER first_admin_integrity BEFORE INSERT OR UPDATE OR DELETE ON public.first_admin_invites
  FOR EACH ROW EXECUTE FUNCTION institutional.guard_first_admin_invite();
COMMIT;
