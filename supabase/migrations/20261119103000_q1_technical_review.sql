BEGIN;
CREATE TABLE institutional.q1_technical_review_events (
  org_id uuid NOT NULL REFERENCES public.organizations(id),
  cycle_key text NOT NULL CHECK (cycle_key ~ '^(20[0-9]{2}|2100)-T[1-4]$'),
  sequence integer NOT NULL CHECK (sequence > 0),
  actor_id uuid NOT NULL REFERENCES auth.users(id),
  reviewer_id uuid REFERENCES auth.users(id),
  preparation_revision integer,
  kind text NOT NULL CHECK (kind IN ('assign','submit','respond')),
  decision text CHECK (decision IN ('changes_requested','review_recorded')),
  rationale text CHECK (char_length(rationale) BETWEEN 10 AND 1500),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id,cycle_key,sequence),
  FOREIGN KEY (org_id,cycle_key,preparation_revision)
    REFERENCES institutional.q1_preparation_events(org_id,cycle_key,revision)
);
ALTER TABLE institutional.q1_technical_review_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON institutional.q1_technical_review_events FROM PUBLIC, anon, authenticated, service_role;

-- The server verifies platform authority for assign and institutional identity
-- for the other commands. The company lock is shared with preparation writes.
CREATE FUNCTION public.q1_technical_review(
  p_org uuid, p_cycle text, p_actor uuid, p_command jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE
  operation text := p_command->>'kind';
  assigned uuid;
  assignment_sequence integer;
  recipient uuid;
  actor_role text;
  current_revision integer;
  sequence_no integer;
  submitted institutional.q1_technical_review_events%ROWTYPE;
  decision_value text;
  rationale_value text;
  snapshot jsonb;
  feedback jsonb;
  module_enabled boolean;
BEGIN
  IF p_cycle IS NULL OR p_cycle !~ '^(20[0-9]{2}|2100)-T[1-4]$' OR operation IS NULL
     OR operation NOT IN ('inspect','assign','submit','respond','read')
    THEN RETURN jsonb_build_object('status','invalid'); END IF;
  PERFORM 1 FROM public.organizations WHERE id=p_org AND pack_id='enterprise' FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('status','forbidden'); END IF;
  SELECT EXISTS (SELECT 1 FROM public.org_module_entitlements
    WHERE org_id=p_org AND module='Q1' AND enabled) INTO module_enabled;
  IF NOT module_enabled AND operation NOT IN ('inspect','assign')
    THEN RETURN jsonb_build_object('status','forbidden'); END IF;

  SELECT reviewer_id, sequence INTO assigned, assignment_sequence FROM institutional.q1_technical_review_events
    WHERE org_id=p_org AND cycle_key=p_cycle AND kind='assign' ORDER BY sequence DESC LIMIT 1;
  SELECT coalesce(max(sequence),0) INTO sequence_no FROM institutional.q1_technical_review_events
    WHERE org_id=p_org AND cycle_key=p_cycle;
  SELECT coalesce(max(e.revision),0) INTO current_revision FROM institutional.q1_preparation_events e
    WHERE e.org_id=p_org AND e.cycle_key=p_cycle;

  IF operation='inspect' THEN
    RETURN jsonb_build_object('status','ready','reviewerId',assigned,'sequence',sequence_no,
      'preparationRevision',current_revision);
  END IF;
  IF operation='assign' THEN
    IF (p_command->>'base')::integer IS DISTINCT FROM sequence_no
      THEN RETURN jsonb_build_object('status','conflict'); END IF;
    recipient := (p_command->>'reviewerId')::uuid;
    IF recipient IS NOT NULL THEN
      IF NOT module_enabled THEN RETURN jsonb_build_object('status','forbidden'); END IF;
      PERFORM 1 FROM public.profiles WHERE id=recipient AND org_id=p_org
        AND role='SST_PROFISSIONAL' FOR SHARE;
      IF NOT FOUND THEN RETURN jsonb_build_object('status','forbidden'); END IF;
    END IF;
    IF recipient IS DISTINCT FROM assigned THEN
      INSERT INTO institutional.q1_technical_review_events
        (org_id,cycle_key,sequence,actor_id,reviewer_id,kind)
        VALUES (p_org,p_cycle,sequence_no+1,p_actor,recipient,'assign');
    END IF;
    RETURN jsonb_build_object('status','ready','reviewerId',recipient);
  END IF;

  SELECT role INTO actor_role FROM public.profiles WHERE id=p_actor AND org_id=p_org FOR SHARE;
  IF NOT FOUND THEN RETURN jsonb_build_object('status','forbidden'); END IF;
  IF operation='submit' OR (operation='read' AND p_actor IS DISTINCT FROM assigned) THEN
    IF actor_role <> 'RH_ADMIN' THEN
      PERFORM 1 FROM institutional.q1_preparation_delegates
        WHERE org_id=p_org AND user_id=p_actor FOR SHARE;
      IF NOT FOUND THEN RETURN jsonb_build_object('status','forbidden'); END IF;
    END IF;
  ELSIF actor_role <> 'SST_PROFISSIONAL' OR p_actor IS DISTINCT FROM assigned THEN
    RETURN jsonb_build_object('status','forbidden');
  END IF;
  IF operation='read' THEN
    SELECT * INTO submitted FROM institutional.q1_technical_review_events e
      WHERE e.org_id=p_org AND e.cycle_key=p_cycle AND e.preparation_revision=current_revision
        AND kind='submit' AND e.sequence>assignment_sequence ORDER BY sequence DESC LIMIT 1;
    -- A completed response remains visible to the preparer. A newly assigned
    -- reviewer may only read a snapshot forwarded after that assignment.
    IF p_actor IS DISTINCT FROM assigned OR submitted.reviewer_id=assigned THEN
      SELECT jsonb_build_object('decision',decision,'rationale',rationale,'recordedAt',recorded_at)
        INTO feedback FROM institutional.q1_technical_review_events e
        WHERE e.org_id=p_org AND e.cycle_key=p_cycle AND e.preparation_revision=current_revision
          AND kind='respond' ORDER BY sequence DESC LIMIT 1;
      IF p_actor=assigned THEN
        SELECT jsonb_agg(jsonb_build_object('id',request_id,'command',command) ORDER BY e.revision)
          INTO snapshot FROM institutional.q1_preparation_events e
          WHERE e.org_id=p_org AND e.cycle_key=p_cycle AND e.revision<=current_revision;
      END IF;
    END IF;
    RETURN jsonb_build_object('status','ready','reviewerId',assigned,'sequence',sequence_no,
      'preparationRevision',current_revision,'snapshot',snapshot,'feedback',feedback,
      'canSubmit',p_actor IS DISTINCT FROM assigned AND feedback IS NULL,
      'submitted',coalesce(assigned IS NOT NULL AND submitted.reviewer_id=assigned,false));
  END IF;
  IF current_revision=0 OR (p_command->>'preparationRevision')::integer IS DISTINCT FROM current_revision
    THEN RETURN jsonb_build_object('status','stale'); END IF;

  SELECT * INTO submitted FROM institutional.q1_technical_review_events e
    WHERE e.org_id=p_org AND e.cycle_key=p_cycle AND e.preparation_revision=current_revision
      AND kind='submit' AND e.sequence>assignment_sequence ORDER BY sequence DESC LIMIT 1;
  IF EXISTS (SELECT 1 FROM institutional.q1_technical_review_events e
    WHERE e.org_id=p_org AND e.cycle_key=p_cycle AND e.preparation_revision=current_revision
      AND kind='respond') THEN RETURN jsonb_build_object('status','conflict'); END IF;

  IF operation='submit' THEN
    recipient := (p_command->>'reviewerId')::uuid;
    IF assigned IS NULL OR recipient IS DISTINCT FROM assigned OR p_actor=assigned
      THEN RETURN jsonb_build_object('status','forbidden'); END IF;
    PERFORM 1 FROM public.profiles WHERE id=assigned AND org_id=p_org
      AND role='SST_PROFISSIONAL' FOR SHARE;
    IF NOT FOUND THEN RETURN jsonb_build_object('status','forbidden'); END IF;
    IF submitted.reviewer_id=assigned THEN RETURN jsonb_build_object('status','conflict'); END IF;
  ELSE
    IF submitted.reviewer_id IS DISTINCT FROM p_actor OR submitted.actor_id=p_actor
      THEN RETURN jsonb_build_object('status','forbidden'); END IF;
    recipient := p_actor;
    decision_value := p_command->>'decision';
    rationale_value := btrim(p_command->>'rationale');
    IF decision_value IS NULL OR decision_value NOT IN ('changes_requested','review_recorded')
      OR rationale_value IS NULL OR char_length(rationale_value) NOT BETWEEN 10 AND 1500
      THEN RETURN jsonb_build_object('status','invalid'); END IF;
  END IF;
  INSERT INTO institutional.q1_technical_review_events
    (org_id,cycle_key,sequence,actor_id,reviewer_id,preparation_revision,kind,decision,rationale)
    VALUES (p_org,p_cycle,sequence_no+1,p_actor,recipient,current_revision,operation,decision_value,rationale_value);
  RETURN jsonb_build_object('status','ready','preparationRevision',current_revision);
END $$;
REVOKE ALL ON FUNCTION public.q1_technical_review(uuid,text,uuid,jsonb)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.q1_technical_review(uuid,text,uuid,jsonb) TO service_role;
COMMIT;
