// Prova de upgrade aditivo e contrato PostgreSQL no stack institucional descartável.
// Por padrão só a transação de prova é executada, com ROLLBACK explícito.
import { readFileSync } from "node:fs";
import { institutionalEnv, institutionalSql } from "./institutional-local";
const migration = "supabase/migrations/20261118163000_q1_preparation.sql";
await institutionalEnv(); // verifica config, projeto, API, DB e container antes de escrever
if (process.argv.includes("--install")) {
  const exists = await institutionalSql(
    "SELECT to_regclass('institutional.q1_preparation_events') IS NOT NULL",
  );
  if (exists === "f") {
    await institutionalSql(readFileSync(migration, "utf8"));
    await institutionalSql("NOTIFY pgrst, 'reload schema'");
    console.log("Upgrade Q1 aplicado ao stack institucional descartável.");
  } else if (exists !== "t") throw new Error("Instalação local indeterminada.");
}
const result = await institutionalSql(`BEGIN;
DO $proof$
DECLARE a uuid; b uuid; rh uuid; other_rh uuid; platform_actor uuid; req uuid:=gen_random_uuid();
  c text:='2098-T1'; j jsonb; cmd jsonb:='{"kind":"notice","template":"Q1-PRE-1","contact":"Plantão da equipe","returnChannel":"Mural coletivo"}';
BEGIN
  SELECT id INTO STRICT a FROM public.organizations WHERE slug='institutional-alfa' AND pack_id='enterprise';
  SELECT id INTO STRICT b FROM public.organizations WHERE slug='institutional-beta' AND pack_id='enterprise';
  SELECT p.id INTO STRICT rh FROM public.profiles p JOIN auth.users u ON u.id=p.id WHERE p.org_id=a AND p.role='RH_ADMIN' AND u.email='alfa@institutional.test';
  SELECT p.id INTO STRICT other_rh FROM public.profiles p JOIN auth.users u ON u.id=p.id WHERE p.org_id=b AND p.role='RH_ADMIN' AND u.email='beta@institutional.test';
  SELECT id INTO STRICT platform_actor FROM auth.users WHERE email='platform@institutional.test';
  SET LOCAL ROLE service_role;
  INSERT INTO public.org_module_changes(actor_id,request_id,org_id,module,enabled,expected_revision)
    SELECT platform_actor,gen_random_uuid(),org_id,'Q1',true,revision FROM public.org_module_entitlements WHERE org_id IN (a,b) AND module='Q1';
  IF public.q1_preparation_journal(a,rh,c)->'events' IS DISTINCT FROM '[]'::jsonb
     OR public.q1_preparation_journal(b,other_rh,c)->'events' IS DISTINCT FROM '[]'::jsonb THEN RAISE EXCEPTION 'fixture_not_empty'; END IF;
  j:=public.q1_preparation_journal(a,rh,c,0,req,cmd);
  IF jsonb_array_length(j->'events') IS DISTINCT FROM 1 THEN RAISE EXCEPTION 'append_failed'; END IF;
  IF public.q1_preparation_journal(a,rh,c,0,req,cmd) IS DISTINCT FROM j THEN RAISE EXCEPTION 'retry_failed'; END IF;
  IF public.q1_preparation_journal(a,rh,c,0,req,cmd||'{"contact":"Outro canal"}')->>'status' IS DISTINCT FROM 'conflict'
    OR public.q1_preparation_journal(a,rh,c,0,gen_random_uuid(),cmd)->>'status' IS DISTINCT FROM 'conflict' THEN RAISE EXCEPTION 'revision_failed'; END IF;
  IF public.q1_preparation_journal(a,other_rh,c)->>'status' IS DISTINCT FROM 'forbidden'
    OR public.q1_preparation_journal(b,other_rh,c)->'events' IS DISTINCT FROM '[]'::jsonb
    OR public.q1_preparation_journal(a,rh,'2098-T2')->'events' IS DISTINCT FROM '[]'::jsonb THEN RAISE EXCEPTION 'scope_failed'; END IF;
  INSERT INTO public.org_module_changes(actor_id,request_id,org_id,module,enabled,expected_revision)
    SELECT platform_actor,gen_random_uuid(),a,'Q1',false,revision FROM public.org_module_entitlements WHERE org_id=a AND module='Q1';
  IF public.q1_preparation_journal(a,rh,c)->>'status' IS DISTINCT FROM 'forbidden'
    OR public.q1_preparation_journal(a,rh,c,0,req,cmd)->>'status' IS DISTINCT FROM 'forbidden' THEN RAISE EXCEPTION 'revoked_failed'; END IF;
END $proof$;
SELECT 'PASS';
ROLLBACK;`);
if (result !== "PASS") throw new Error("Prova local incompleta.");
console.log(
  "PASS PostgreSQL · gravação, retry, conflito, isolamento com as duas empresas habilitadas e revogação · fixtures revertidas.",
);
