BEGIN;
CREATE TABLE institutional.q1_preparation_delegates (
  org_id uuid NOT NULL REFERENCES public.organizations(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  granted_by uuid NOT NULL REFERENCES auth.users(id),
  granted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, user_id)
);
ALTER TABLE institutional.q1_preparation_delegates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON institutional.q1_preparation_delegates FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.q1_preparation_journal(
  p_org uuid, p_actor uuid, p_cycle text, p_base integer DEFAULT NULL,
  p_request uuid DEFAULT NULL, p_command jsonb DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE
  company text;
  latest integer;
  previous institutional.q1_preparation_events%ROWTYPE;
  events jsonb;
BEGIN
  IF p_cycle IS NULL OR p_cycle !~ '^(20[0-9]{2}|2100)-T[1-4]$'
    OR NOT ((p_request IS NULL AND p_base IS NULL AND p_command IS NULL)
      OR (p_request IS NOT NULL AND p_base IS NOT NULL AND p_base >= 0 AND p_command IS NOT NULL))
    THEN RETURN jsonb_build_object('status','invalid'); END IF;
  IF p_request IS NULL THEN
    SELECT name INTO company FROM public.organizations WHERE id=p_org AND pack_id='enterprise' FOR SHARE;
  ELSE
    SELECT name INTO company FROM public.organizations WHERE id=p_org AND pack_id='enterprise' FOR UPDATE;
  END IF;
  IF company IS NULL THEN RETURN jsonb_build_object('status','forbidden'); END IF;
  PERFORM 1 FROM public.profiles WHERE id=p_actor AND org_id=p_org AND (role='RH_ADMIN' OR EXISTS (
    SELECT 1 FROM institutional.q1_preparation_delegates d
    WHERE d.org_id=p_org AND d.user_id=p_actor FOR SHARE
  )) FOR SHARE;
  IF NOT FOUND OR NOT EXISTS (SELECT 1 FROM public.org_module_entitlements
    WHERE org_id=p_org AND module='Q1' AND enabled) THEN
    RETURN jsonb_build_object('status','forbidden');
  END IF;
  IF p_request IS NOT NULL THEN
    SELECT * INTO previous FROM institutional.q1_preparation_events
      WHERE org_id=p_org AND cycle_key=p_cycle AND request_id=p_request;
    IF FOUND THEN
      IF previous.actor_id<>p_actor OR previous.revision<>p_base+1 OR previous.command<>p_command
        THEN RETURN jsonb_build_object('status','conflict'); END IF;
    ELSE
      SELECT coalesce(max(revision),0) INTO latest FROM institutional.q1_preparation_events
        WHERE org_id=p_org AND cycle_key=p_cycle;
      IF latest<>p_base THEN RETURN jsonb_build_object('status','conflict'); END IF;
      INSERT INTO institutional.q1_preparation_events(org_id,cycle_key,revision,request_id,actor_id,command)
        VALUES (p_org,p_cycle,latest+1,p_request,p_actor,p_command);
    END IF;
  END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',request_id,'command',command)
    ORDER BY revision),'[]'::jsonb) INTO events FROM institutional.q1_preparation_events
    WHERE org_id=p_org AND cycle_key=p_cycle;
  RETURN jsonb_build_object('status','ready','organization',company,'events',events);
END $$;
COMMIT;
