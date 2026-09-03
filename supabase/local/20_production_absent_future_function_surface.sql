-- Fixture SOMENTE LOCAL: reproduz a superfície observada em produção.
-- As tabelas RC podem existir no replay por ordenação histórica, mas estas 14
-- funções não existem no baseline produtivo e não pertencem ao pacote G1-v2.

DROP FUNCTION IF EXISTS public.create_action_plan(UUID, TEXT, TEXT, UUID, UUID, JSONB);
DROP FUNCTION IF EXISTS public.set_action_item_accountability(UUID, UUID, TEXT, DATE, TEXT, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.activate_action_plan(UUID);
DROP FUNCTION IF EXISTS public.record_action_event(UUID, TEXT, UUID, TEXT, TEXT, BOOLEAN, TEXT);
DROP FUNCTION IF EXISTS public.record_evidence(UUID, TEXT, TEXT, TEXT, TEXT, DATE, UUID, TEXT);
DROP FUNCTION IF EXISTS public.open_devolutiva_session(UUID, UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS public.cast_priority_vote(UUID, TEXT);
DROP FUNCTION IF EXISTS public.set_devolutiva_attendance(UUID, INTEGER);
DROP FUNCTION IF EXISTS public.close_devolutiva_session(UUID, TEXT[]);
DROP FUNCTION IF EXISTS public.create_esg_snapshot(UUID, INTEGER, JSONB, TEXT, UUID);
DROP FUNCTION IF EXISTS public.erase_my_assessments();
DROP FUNCTION IF EXISTS public.register_org_cycle(UUID, TEXT, TEXT, UUID, UUID);
DROP FUNCTION IF EXISTS public.seal_victory_record(UUID, TEXT, TEXT, JSONB, TEXT, UUID);
DROP FUNCTION IF EXISTS public.record_item_funnel_event(TEXT, TEXT, INTEGER, BOOLEAN, INTEGER, JSONB);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='public' AND p.proname IN (
       'create_action_plan','set_action_item_accountability','activate_action_plan',
       'record_action_event','record_evidence','open_devolutiva_session',
       'cast_priority_vote','set_devolutiva_attendance','close_devolutiva_session',
       'create_esg_snapshot','erase_my_assessments','register_org_cycle',
       'seal_victory_record','record_item_funnel_event')
  ) THEN
    RAISE EXCEPTION 'fixture inválida: função futura permaneceu no baseline local';
  END IF;
  RAISE NOTICE 'PROVEN: superfície production-like sem as 14 funções futuras.';
END $$;