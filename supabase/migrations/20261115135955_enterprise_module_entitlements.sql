-- Habilitação comercial não aprova método, publicação ou privacidade.
-- Nenhum backfill: ausência significa desabilitado.
BEGIN;
CREATE TABLE public.org_module_entitlements (
  org_id uuid NOT NULL REFERENCES public.organizations(id),
  module text NOT NULL CHECK (module IN ('Q1','Q2')),
  enabled boolean NOT NULL,
  revision integer NOT NULL CHECK (revision > 0),
  updated_by uuid NOT NULL REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id,module)
);
CREATE TABLE public.org_module_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES auth.users(id),
  request_id uuid NOT NULL,
  org_id uuid NOT NULL REFERENCES public.organizations(id),
  module text NOT NULL CHECK (module IN ('Q1','Q2')),
  enabled boolean NOT NULL,
  expected_revision integer NOT NULL CHECK (expected_revision >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(actor_id,request_id)
);
ALTER TABLE public.org_module_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_module_changes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.org_module_entitlements,public.org_module_changes FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.org_module_entitlements TO authenticated,service_role;
GRANT SELECT,INSERT ON public.org_module_changes TO service_role;
CREATE POLICY module_own ON public.org_module_entitlements FOR SELECT TO authenticated
  USING (org_id IN (SELECT org_id FROM public.profiles WHERE id=auth.uid()));

CREATE FUNCTION institutional.change_module() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE current_revision integer;
BEGIN
  IF current_setting('role',true) <> 'service_role' THEN RAISE EXCEPTION 'module_forbidden'; END IF;
  PERFORM 1 FROM public.organizations WHERE id=NEW.org_id AND pack_id='enterprise' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'module_organization_unavailable'; END IF;
  SELECT revision INTO current_revision FROM public.org_module_entitlements WHERE org_id=NEW.org_id AND module=NEW.module;
  IF coalesce(current_revision,0) <> NEW.expected_revision THEN RAISE EXCEPTION 'module_revision_conflict'; END IF;
  INSERT INTO public.org_module_entitlements(org_id,module,enabled,revision,updated_by)
    VALUES(NEW.org_id,NEW.module,NEW.enabled,coalesce(current_revision,0)+1,NEW.actor_id)
    ON CONFLICT(org_id,module) DO UPDATE SET enabled=EXCLUDED.enabled,revision=EXCLUDED.revision,updated_by=EXCLUDED.updated_by,updated_at=now();
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION institutional.change_module() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER change_module BEFORE INSERT ON public.org_module_changes FOR EACH ROW EXECUTE FUNCTION institutional.change_module();

-- A origem é persistida. Não há parâmetro "lente" controlado pelo cliente.
CREATE FUNCTION institutional.resource_module(t text,r jsonb) RETURNS TABLE(organization uuid,module text)
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
  module:=CASE inst WHEN 'COPSOQ' THEN 'Q1' WHEN 'FIB_T' THEN 'Q2' ELSE NULL END;
  RETURN NEXT;
END $$;
REVOKE ALL ON FUNCTION institutional.resource_module(text,jsonb) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION institutional.module_readable(t text,r jsonb) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE target record;
BEGIN
  SELECT * INTO target FROM institutional.resource_module(t,r);
  IF EXISTS(SELECT 1 FROM public.organizations WHERE id=target.organization AND pack_id<>'enterprise') THEN RETURN true; END IF;
  RETURN target.module='Q2' AND EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND org_id=target.organization)
    AND EXISTS(SELECT 1 FROM public.org_module_entitlements WHERE org_id=target.organization AND module=target.module AND enabled);
END $$;
REVOKE ALL ON FUNCTION institutional.module_readable(text,jsonb) FROM PUBLIC;
GRANT USAGE ON SCHEMA institutional TO authenticated;
GRANT EXECUTE ON FUNCTION institutional.module_readable(text,jsonb) TO authenticated;

CREATE FUNCTION institutional.guard_module_operation() RETURNS trigger
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
REVOKE ALL ON FUNCTION institutional.guard_module_operation() FROM PUBLIC,anon,authenticated,service_role;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['waves','wave_invites','wave_responses','wave_capsules','wave_cohorts','sector_links','cohort_capsules','action_items','evidence_records','action_log','efficacy_protocols','efficacy_observations','efficacy_verdicts'] LOOP
    EXECUTE format('CREATE TRIGGER module_operation BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION institutional.guard_module_operation()',t);
    EXECUTE format('CREATE POLICY module_restrict_read ON public.%I AS RESTRICTIVE FOR SELECT TO authenticated USING (institutional.module_readable(%L,to_jsonb(%I)))',t,t,t);
  END LOOP;
END $$;
-- create_action_plan insere plano e itens na MESMA transação. Só no final
-- existe fonte persistida; não se confia num rótulo fornecido pelo chamador.
CREATE CONSTRAINT TRIGGER module_plan_operation AFTER INSERT OR UPDATE OR DELETE ON public.action_plans
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION institutional.guard_module_operation();
CREATE POLICY module_restrict_read ON public.action_plans AS RESTRICTIVE FOR SELECT TO authenticated
  USING (institutional.module_readable('action_plans',to_jsonb(action_plans)));
-- A RPC canônica é SECURITY DEFINER e pode devolver publicação preexistente.
-- A policy de SELECT não a protege. Mantém-se a implementação de privacidade
-- privada e acrescenta-se a decisão atual no mesmo lock das mutações.
ALTER FUNCTION public.aggregate_cohort_responses(uuid,uuid) SET SCHEMA institutional;
REVOKE ALL ON FUNCTION institutional.aggregate_cohort_responses(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.aggregate_cohort_responses(p_wave_id uuid,p_cohort_id uuid)
RETURNS TABLE(visible boolean,response_count integer,response_count_label text,k_min integer,item_means jsonb,factor_scores jsonb,domain_means jsonb,suppression_reason text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE org uuid;
BEGIN
  SELECT w.org_id INTO org FROM public.waves w JOIN public.profiles p ON p.org_id=w.org_id WHERE w.id=p_wave_id AND p.id=auth.uid();
  IF org IS NULL THEN RAISE EXCEPTION 'module_forbidden'; END IF;
  PERFORM 1 FROM public.organizations WHERE id=org FOR UPDATE;
  IF NOT EXISTS(SELECT 1 FROM public.org_module_entitlements WHERE org_id=org AND module='Q2' AND enabled) THEN RAISE EXCEPTION 'module_disabled'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.waves WHERE id=p_wave_id AND instrument='FIB_T') THEN RAISE EXCEPTION 'module_origin_required'; END IF;
  RETURN QUERY SELECT * FROM institutional.aggregate_cohort_responses(p_wave_id,p_cohort_id);
END $$;
REVOKE ALL ON FUNCTION public.aggregate_cohort_responses(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.aggregate_cohort_responses(uuid,uuid) TO authenticated,service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
