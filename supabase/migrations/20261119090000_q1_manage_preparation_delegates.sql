BEGIN;
CREATE TABLE institutional.q1_delegate_history (
  org_id uuid NOT NULL REFERENCES public.organizations(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  revision integer NOT NULL CHECK (revision > 0),
  actor_id uuid NOT NULL REFERENCES auth.users(id),
  enabled boolean NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id,user_id,revision)
);
ALTER TABLE institutional.q1_delegate_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON institutional.q1_delegate_history FROM PUBLIC, anon, authenticated, service_role;

-- The server verifies platform authority before invoking this service-only RPC.
CREATE FUNCTION public.q1_manage_preparation_delegate(
  p_org uuid, p_user uuid, p_actor uuid, p_enabled boolean DEFAULT NULL, p_base integer DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE
  company text;
  revision integer;
  delegated boolean;
  module_enabled boolean;
BEGIN
  SELECT name INTO company FROM public.organizations
    WHERE id=p_org AND pack_id='enterprise' FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('status','forbidden'); END IF;
  PERFORM 1 FROM public.profiles WHERE id=p_user AND org_id=p_org FOR SHARE;
  IF NOT FOUND THEN RETURN jsonb_build_object('status','forbidden'); END IF;
  SELECT EXISTS (SELECT 1 FROM public.org_module_entitlements
    WHERE org_id=p_org AND module='Q1' AND enabled) INTO module_enabled;
  SELECT coalesce(max(h.revision),0) INTO revision FROM institutional.q1_delegate_history h
    WHERE h.org_id=p_org AND h.user_id=p_user;
  SELECT EXISTS (SELECT 1 FROM institutional.q1_preparation_delegates
    WHERE org_id=p_org AND user_id=p_user) INTO delegated;
  IF p_enabled IS NOT NULL THEN
    IF p_base IS NULL OR p_base < 0 OR p_base < revision-1 OR p_base > revision
       OR (p_base <> revision AND p_enabled <> delegated)
      THEN RETURN jsonb_build_object('status','conflict'); END IF;
    IF p_enabled AND NOT module_enabled THEN RETURN jsonb_build_object('status','forbidden'); END IF;
    IF p_enabled <> delegated THEN
      IF p_enabled THEN
        INSERT INTO institutional.q1_preparation_delegates(org_id,user_id,granted_by)
          VALUES (p_org,p_user,p_actor);
      ELSE
        DELETE FROM institutional.q1_preparation_delegates WHERE org_id=p_org AND user_id=p_user;
      END IF;
      revision := revision + 1;
      INSERT INTO institutional.q1_delegate_history(org_id,user_id,revision,actor_id,enabled)
        VALUES (p_org,p_user,revision,p_actor,p_enabled);
      delegated := p_enabled;
    END IF;
  END IF;
  RETURN jsonb_build_object('status','ready','company',company,'revision',revision,
    'delegated',delegated,'moduleEnabled',module_enabled);
END $$;
REVOKE ALL ON FUNCTION public.q1_manage_preparation_delegate(uuid,uuid,uuid,boolean,integer)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.q1_manage_preparation_delegate(uuid,uuid,uuid,boolean,integer)
  TO service_role;
COMMIT;
