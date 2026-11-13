-- Correção aditiva: leitura de identidade somente dentro do trigger privado, sem GRANT em auth.users.
BEGIN;
CREATE OR REPLACE FUNCTION institutional.guard_first_admin_invite() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_pack TEXT; v_email TEXT; v_verified TIMESTAMPTZ; v_profile public.profiles%ROWTYPE;
BEGIN
  -- O owner lê auth.users sem conceder acesso dessa tabela a service_role.
  -- A função não é RPC pública; cliente não tem ACL nem schema/EXECUTE.
  IF current_setting('role', true) IN ('anon','authenticated','authenticator') THEN
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

COMMIT;
