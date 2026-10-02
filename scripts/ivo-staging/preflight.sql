-- ═══════════════════════════════════════════════════════════════════════════
-- PREFLIGHT / POSTFLIGHT IVO R5/R6 — SOMENTE LEITURA
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Uso: rodar no SQL Editor do projeto de STAGING (ou psql com conexão do
-- operador) ANTES e DEPOIS de aplicar as migrations do runbook
-- docs/vitalos/staging-rollout.md. A transação é READ ONLY: qualquer escrita
-- acidental aborta. Não lê nenhuma resposta, só catálogo e contagens.
--
-- Saída: uma linha por verificação — check | estado | detalhe.
-- Estados: PASS, MISSING (precisa ser aplicado), FAIL (bloqueia o rollout).

BEGIN TRANSACTION READ ONLY;

WITH
fn(sig) AS (VALUES
  ('public.provision_organization_from_invite(text,uuid,text,text,text,text,text,text,text,text,text)'),
  ('public.accept_member_invite(text,uuid)'),
  ('public.submit_sector_response(text,jsonb,text)'),
  ('public.aggregate_cohort_responses(uuid,uuid)'),
  ('public.create_action_plan(uuid,text,text,uuid,uuid,jsonb)'),
  ('public.set_action_item_accountability(uuid,uuid,text,date,text,numeric,numeric,text,text,text,text,text)'),
  ('public.activate_action_plan(uuid)'),
  ('public.record_action_event(uuid,text,uuid,text,text,boolean,text)'),
  ('public.record_evidence(uuid,text,text,text,text,date,uuid,text)')
),
tb(name) AS (VALUES
  ('organizations'), ('profiles'), ('org_invites'), ('member_invites'), ('waves'),
  ('wave_cohorts'), ('wave_responses'), ('sector_links'), ('cohort_capsules'), ('wave_capsules'),
  ('ops_events'), ('action_plans'), ('action_items'), ('evidence_records'), ('action_log')
),
checks AS (
  -- 1. Tabelas
  SELECT 'table ' || name AS check_name,
         CASE WHEN to_regclass('public.' || name) IS NOT NULL THEN 'PASS'
              WHEN name IN ('action_plans','action_items','evidence_records','action_log') THEN 'MISSING'
              ELSE 'FAIL' END AS state,
         CASE WHEN name IN ('action_plans','action_items','evidence_records','action_log')
              THEN 'ledger: 20260705100000' ELSE 'pré-requisito existente' END AS detail
    FROM tb
  UNION ALL
  -- 2. Funções
  SELECT 'function ' || sig,
         CASE WHEN to_regprocedure(sig) IS NOT NULL THEN 'PASS'
              WHEN sig LIKE 'public.create_action_plan%' OR sig LIKE 'public.set_action_item%'
                OR sig LIKE 'public.activate_action_plan%' OR sig LIKE 'public.record_%' THEN 'MISSING'
              ELSE 'FAIL' END,
         CASE WHEN sig LIKE 'public.create_action_plan%' OR sig LIKE 'public.set_action_item%'
                OR sig LIKE 'public.activate_action_plan%' OR sig LIKE 'public.record_%'
              THEN 'ledger: 20260705100000' ELSE 'pré-requisito existente' END
    FROM fn
  UNION ALL
  -- 3. Colunas que o fluxo IVO lê
  SELECT 'column waves.instrument_version',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='waves' AND column_name='instrument_version') THEN 'PASS' ELSE 'FAIL' END,
         'leitor FIB-T compara com o manifesto'
  UNION ALL
  SELECT 'column wave_responses.consent_version',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='wave_responses' AND column_name='consent_version') THEN 'PASS' ELSE 'FAIL' END,
         'captura setorial com consentimento'
  UNION ALL
  SELECT 'R6 columns action_items.source_*',
         CASE WHEN to_regclass('public.action_items') IS NULL THEN 'MISSING'
              WHEN (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='action_items'
                    AND column_name IN ('source_lens_id','source_wave_id','source_cohort_id','source_factor_id','source_instrument_version','source_published_at')) = 6
              THEN 'PASS' ELSE 'MISSING' END,
         'R6: 20261002120000'
  UNION ALL
  SELECT 'R6 column evidence_records.evidence_scope',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='evidence_records' AND column_name='evidence_scope') THEN 'PASS' ELSE 'MISSING' END,
         'R6: 20261002120000'
  UNION ALL
  -- 4. CHECKs corrigidos (R6-C1): só a versão com num_nonnulls + IS TRUE serve
  SELECT 'R6 check ' || c.name,
         CASE WHEN con.oid IS NULL THEN 'MISSING'
              WHEN pg_get_constraintdef(con.oid) LIKE '%num_nonnulls%' AND pg_get_constraintdef(con.oid) LIKE '%IS TRUE%' THEN 'PASS'
              ELSE 'FAIL' END,
         CASE WHEN con.oid IS NOT NULL AND pg_get_constraintdef(con.oid) NOT LIKE '%IS TRUE%'
              THEN 'versão defeituosa (aceita NULL) — reaplicar 20261002120000' ELSE 'R6: 20261002120000' END
    FROM (VALUES ('action_items_source_complete_ck'), ('action_items_source_no_ivo_lift_ck')) c(name)
    LEFT JOIN pg_constraint con ON con.conname = c.name
  UNION ALL
  SELECT 'R6 fk ' || c.name,
         CASE WHEN EXISTS (SELECT 1 FROM pg_constraint WHERE conname = c.name AND contype = 'f') THEN 'PASS' ELSE 'MISSING' END,
         'origem não cruza organizações'
    FROM (VALUES ('action_items_source_wave_org_fk'), ('action_items_source_cohort_wave_fk')) c(name)
  UNION ALL
  -- 5. Corpo da RPC: R6 aplicada DEPOIS do ledger (nunca o contrário)
  SELECT 'R6 create_action_plan validates provenance',
         CASE WHEN to_regprocedure('public.create_action_plan(uuid,text,text,uuid,uuid,jsonb)') IS NULL THEN 'MISSING'
              WHEN (SELECT prosrc FROM pg_proc WHERE oid = to_regprocedure('public.create_action_plan(uuid,text,text,uuid,uuid,jsonb)'))
                   LIKE '%provenance_cross_tenant_denied%' THEN 'PASS'
              ELSE 'MISSING' END,
         'versão sem validação = ledger reaplicado depois de R6 → reaplicar 20261002120000'
  UNION ALL
  -- 6. ACL: ledger só service_role; leitura publicada por authenticated
  SELECT 'acl ' || sig,
         CASE WHEN to_regprocedure(sig) IS NULL THEN 'MISSING'
              WHEN has_function_privilege('service_role', sig, 'EXECUTE')
                AND NOT has_function_privilege('authenticated', sig, 'EXECUTE')
                AND NOT has_function_privilege('anon', sig, 'EXECUTE') THEN 'PASS'
              ELSE 'FAIL' END,
         'EXECUTE só service_role'
    FROM fn WHERE sig LIKE 'public.create_action_plan%' OR sig LIKE 'public.set_action_item%'
       OR sig LIKE 'public.activate_action_plan%' OR sig LIKE 'public.record_%'
  UNION ALL
  SELECT 'acl aggregate_cohort_responses',
         CASE WHEN to_regprocedure('public.aggregate_cohort_responses(uuid,uuid)') IS NULL THEN 'FAIL'
              WHEN has_function_privilege('authenticated', 'public.aggregate_cohort_responses(uuid,uuid)', 'EXECUTE')
                AND NOT has_function_privilege('anon', 'public.aggregate_cohort_responses(uuid,uuid)', 'EXECUTE') THEN 'PASS'
              ELSE 'FAIL' END,
         'publicação canônica com JWT do membro'
  UNION ALL
  SELECT 'acl table ' || t,
         CASE WHEN to_regclass('public.' || t) IS NULL THEN 'MISSING'
              WHEN has_table_privilege('authenticated', 'public.' || t, 'SELECT')
                AND NOT has_table_privilege('authenticated', 'public.' || t, 'INSERT')
                AND NOT has_table_privilege('authenticated', 'public.' || t, 'UPDATE')
                AND NOT has_table_privilege('authenticated', 'public.' || t, 'DELETE')
                AND NOT has_table_privilege('anon', 'public.' || t, 'SELECT') THEN 'PASS'
              ELSE 'FAIL' END,
         'authenticated só lê (RLS por organização); anon nada'
    FROM (VALUES ('action_plans'), ('action_items'), ('evidence_records'), ('action_log')) x(t)
  UNION ALL
  SELECT 'acl table cohort_capsules',
         CASE WHEN to_regclass('public.cohort_capsules') IS NULL THEN 'FAIL'
              WHEN NOT has_table_privilege('authenticated', 'public.cohort_capsules', 'SELECT')
                AND NOT has_table_privilege('anon', 'public.cohort_capsules', 'SELECT') THEN 'PASS'
              ELSE 'FAIL' END,
         'snapshot publicado inacessível a papel de cliente'
  UNION ALL
  SELECT 'rls enabled ' || t,
         CASE WHEN to_regclass('public.' || t) IS NULL THEN 'MISSING'
              WHEN (SELECT relrowsecurity FROM pg_class WHERE oid = to_regclass('public.' || t)) THEN 'PASS'
              ELSE 'FAIL' END,
         ''
    FROM (VALUES ('action_plans'), ('action_items'), ('evidence_records'), ('action_log')) x(t)
  UNION ALL
  -- 7. Fixtures fictícias (antes do provisionamento: MISSING é o esperado)
  SELECT 'fixture org ' || s,
         CASE WHEN EXISTS (SELECT 1 FROM public.organizations WHERE slug = s) THEN 'PASS' ELSE 'MISSING' END,
         'scripts/ivo-provision-fictitious-orgs.ts'
    FROM (VALUES ('org-ficticia-alfa'), ('org-ficticia-beta')) f(s)
)
SELECT check_name, state, detail FROM checks ORDER BY
  CASE state WHEN 'FAIL' THEN 0 WHEN 'MISSING' THEN 1 ELSE 2 END, check_name;

-- IDs das organizações fictícias, para VITALOS_IVO_AUTHORIZED_ORG_IDS.
SELECT slug, id FROM public.organizations WHERE slug IN ('org-ficticia-alfa', 'org-ficticia-beta') ORDER BY slug;

ROLLBACK;
