-- Entitlement desta fatia governa somente o núcleo enterprise.
BEGIN;
CREATE OR REPLACE FUNCTION public.aggregate_cohort_responses(p_wave_id uuid,p_cohort_id uuid)
RETURNS TABLE(visible boolean,response_count integer,response_count_label text,k_min integer,item_means jsonb,factor_scores jsonb,domain_means jsonb,suppression_reason text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE org uuid;
BEGIN
  SELECT w.org_id INTO org FROM public.waves w JOIN public.profiles p ON p.org_id=w.org_id WHERE w.id=p_wave_id AND p.id=auth.uid();
  IF org IS NULL THEN RAISE EXCEPTION 'module_forbidden'; END IF;
  PERFORM 1 FROM public.organizations WHERE id=org FOR UPDATE;
  IF EXISTS(SELECT 1 FROM public.organizations WHERE id=org AND pack_id='enterprise')
    AND NOT EXISTS(SELECT 1 FROM public.org_module_entitlements WHERE org_id=org AND module='Q2' AND enabled) THEN RAISE EXCEPTION 'module_disabled'; END IF;
  IF EXISTS(SELECT 1 FROM public.organizations WHERE id=org AND pack_id='enterprise')
    AND NOT EXISTS(SELECT 1 FROM public.waves WHERE id=p_wave_id AND instrument='FIB_T') THEN RAISE EXCEPTION 'module_origin_required'; END IF;
  RETURN QUERY SELECT * FROM institutional.aggregate_cohort_responses(p_wave_id,p_cohort_id);
END $$;
REVOKE ALL ON FUNCTION public.aggregate_cohort_responses(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.aggregate_cohort_responses(uuid,uuid) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION institutional.resource_module(t text,r jsonb) RETURNS TABLE(organization uuid,module text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE w uuid; i uuid; p uuid; inst text;
BEGIN
  organization := (r->>'org_id')::uuid;
  IF t='waves' THEN
    inst:=r->>'instrument';
  ELSIF t IN ('wave_invites','wave_responses','wave_capsules','wave_cohorts','sector_links','cohort_capsules') THEN
    w:=(r->>'wave_id')::uuid;
  ELSIF t='action_items' THEN
    w:=(r->>'source_wave_id')::uuid;
  ELSIF t='action_plans' THEN
    SELECT wave_id INTO w FROM public.wave_capsules WHERE id=(r->>'source_capsule_id')::uuid AND org_id=organization;
    IF w IS NULL THEN
      SELECT source_wave_id INTO w FROM public.action_items WHERE plan_id=(r->>'id')::uuid AND org_id=organization LIMIT 1;
    END IF;
  ELSE
    i:=(r->>'item_id')::uuid;
    IF i IS NULL AND r ? 'protocol_id' THEN
      SELECT item_id INTO i FROM public.efficacy_protocols WHERE id=(r->>'protocol_id')::uuid AND org_id=organization;
    END IF;
    SELECT source_wave_id INTO w FROM public.action_items WHERE id=i AND org_id=organization;
  END IF;
  IF w IS NOT NULL THEN
    SELECT org_id,instrument INTO organization,inst FROM public.waves WHERE id=w AND (organization IS NULL OR org_id=organization);
  END IF;
  module:=CASE inst WHEN 'COPSOQ' THEN 'Q1' WHEN 'FIB_T' THEN 'Q2' WHEN 'PERMA' THEN 'LEGACY' WHEN 'VIA_T' THEN 'LEGACY' ELSE NULL END;
  RETURN NEXT;
END $$;

CREATE OR REPLACE FUNCTION institutional.module_readable(t text,r jsonb) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE target record;
BEGIN
  SELECT * INTO target FROM institutional.resource_module(t,r);
  IF EXISTS(SELECT 1 FROM public.organizations WHERE id=target.organization AND pack_id<>'enterprise') THEN RETURN true; END IF;
  IF target.module='LEGACY' THEN RETURN true; END IF;
  RETURN target.module='Q2' AND EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND org_id=target.organization)
    AND EXISTS(SELECT 1 FROM public.org_module_entitlements WHERE org_id=target.organization AND module=target.module AND enabled);
END $$;

CREATE OR REPLACE FUNCTION institutional.guard_module_operation() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE target record; before_target record; row_value jsonb;
BEGIN
  row_value:=CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  SELECT * INTO target FROM institutional.resource_module(TG_TABLE_NAME,row_value);
  IF EXISTS(SELECT 1 FROM public.organizations WHERE id=target.organization AND pack_id<>'enterprise') THEN
    IF TG_OP='DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;
  IF TG_OP='UPDATE' THEN
    IF (to_jsonb(OLD)->>'wave_id',to_jsonb(OLD)->>'source_wave_id',to_jsonb(OLD)->>'org_id',to_jsonb(OLD)->>'item_id',to_jsonb(OLD)->>'protocol_id')
      IS DISTINCT FROM (row_value->>'wave_id',row_value->>'source_wave_id',row_value->>'org_id',row_value->>'item_id',row_value->>'protocol_id') THEN
      RAISE EXCEPTION 'module_origin_immutable';
    END IF;
    SELECT * INTO before_target FROM institutional.resource_module(TG_TABLE_NAME,to_jsonb(OLD));
    IF (before_target.organization,before_target.module) IS DISTINCT FROM (target.organization,target.module) THEN
      RAISE EXCEPTION 'module_origin_immutable';
    END IF;
  END IF;
  IF target.module='LEGACY' THEN
    IF TG_OP='DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;
  -- Só planos legados sem fonte ficam fora: suas capabilities globais continuam fechadas.
  IF target.module IS NULL THEN
    IF TG_TABLE_NAME IN ('action_plans','action_items','evidence_records','action_log','efficacy_protocols','efficacy_observations','efficacy_verdicts') THEN
      RAISE EXCEPTION 'module_origin_required';
    END IF;
    RAISE EXCEPTION 'module_unsupported_instrument';
  END IF;
  -- Mesmo lock da alteração de entitlement. A ordem de commit decide a corrida.
  PERFORM 1 FROM public.organizations WHERE id=target.organization FOR UPDATE;
  IF NOT EXISTS(SELECT 1 FROM public.org_module_entitlements WHERE org_id=target.organization AND module=target.module AND enabled) THEN
    RAISE EXCEPTION 'module_disabled';
  END IF;
  IF target.module='Q1' THEN RAISE EXCEPTION 'module_method_pending'; END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
COMMENT ON FUNCTION public.aggregate_cohort_responses(uuid,uuid) IS 'enterprise_modules_v2_pack_compatibility';
NOTIFY pgrst,'reload schema';
COMMIT;
