// Executa apenas no alvo institucional descartável, com rollback integral.
import { readFileSync } from "node:fs";
import { institutionalEnv, institutionalSql } from "./institutional-local";

const args = process.argv.slice(2);
const rehearse = args.length === 1 && args[0] === "--rehearse-upgrade";
if (args.length && !rehearse)
  throw new Error("Use sem argumentos ou apenas com --rehearse-upgrade.");

function upgradeSql() {
  return [
    "20261118173000_q1_preparation_delegates.sql",
    "20261119090000_q1_manage_preparation_delegates.sql",
    "20261119103000_q1_technical_review.sql",
  ]
    .map((name) => {
      const sql = readFileSync("supabase/migrations/" + name, "utf8");
      const body = /^\s*BEGIN;\s*([\s\S]*?)\s*COMMIT;\s*$/.exec(sql)?.[1];
      if (
        !body ||
        /^\s*(BEGIN|COMMIT|END|ROLLBACK|ABORT|START TRANSACTION|PREPARE TRANSACTION)\s*;/im.test(
          body,
        )
      )
        throw new Error("A migration não pode ser ensaiada na transação: " + name);
      return body;
    })
    .join("\n");
}

await institutionalEnv();
const installed = await institutionalSql(`
  SELECT CASE
    WHEN to_regclass('institutional.q1_preparation_events') IS NULL THEN 'no_preparation'
    WHEN to_regclass('institutional.q1_preparation_delegates') IS NULL
     AND to_regclass('institutional.q1_delegate_history') IS NULL
     AND to_regclass('institutional.q1_technical_review_events') IS NULL THEN 'baseline'
    WHEN to_regprocedure('public.q1_manage_preparation_delegate(uuid,uuid,uuid,boolean,integer)') IS NOT NULL
     AND to_regprocedure('public.q1_technical_review(uuid,text,uuid,jsonb)') IS NOT NULL THEN 'installed'
    ELSE 'partial'
  END
`);
if (rehearse && installed !== "baseline")
  throw new Error(
    "O ensaio de upgrade exige a base de preparação sem as migrations de delegação ou revisão.",
  );
if (!rehearse && installed !== "installed")
  throw new Error(
    "Aplique antes as migrations autorizadas de delegação e revisão no banco descartável.",
  );

const result = await institutionalSql(`BEGIN;
${rehearse ? upgradeSql() : ""}
DO $proof$
DECLARE
  alfa uuid; beta uuid; representative uuid; reviewer uuid; other_user uuid; platform_actor uuid;
  cycle text := '2098-T3';
  notice jsonb := '{"kind":"notice","template":"Q1-PRE-1","contact":"Plantão fictício","returnChannel":"Mural fictício"}';
  submission jsonb;
  response jsonb := '{"kind":"respond","preparationRevision":1,"decision":"changes_requested","rationale":"Conferir a cobertura fictícia com a equipe."}';
  result jsonb;
BEGIN
  SELECT id INTO STRICT alfa FROM public.organizations WHERE slug='institutional-alfa' AND pack_id='enterprise';
  SELECT id INTO STRICT beta FROM public.organizations WHERE slug='institutional-beta' AND pack_id='enterprise';
  SELECT p.id INTO STRICT reviewer FROM public.profiles p JOIN auth.users u ON u.id=p.id
    WHERE p.org_id=alfa AND p.role='RH_ADMIN' AND u.email='alfa@institutional.test';
  SELECT p.id INTO STRICT other_user FROM public.profiles p JOIN auth.users u ON u.id=p.id
    WHERE p.org_id=beta AND p.role='RH_ADMIN' AND u.email='beta@institutional.test';
  SELECT p.id INTO representative FROM public.profiles p JOIN auth.users u ON u.id=p.id
    WHERE p.org_id=alfa AND p.role='COLABORADOR' AND u.email LIKE '%@institutional.test'
    ORDER BY p.id LIMIT 1;
  SELECT id INTO STRICT platform_actor FROM auth.users WHERE email='platform@institutional.test';
  IF representative IS NULL THEN RAISE EXCEPTION 'q1_proof_requires_fictitious_alfa_member'; END IF;
  IF EXISTS (SELECT 1 FROM institutional.q1_preparation_events WHERE org_id=alfa AND cycle_key=cycle)
    OR EXISTS (SELECT 1 FROM institutional.q1_technical_review_events WHERE org_id=alfa AND cycle_key=cycle)
    OR EXISTS (SELECT 1 FROM institutional.q1_preparation_delegates WHERE org_id=alfa AND user_id=representative)
    OR EXISTS (SELECT 1 FROM institutional.q1_delegate_history WHERE org_id=alfa AND user_id=representative)
    THEN RAISE EXCEPTION 'q1_proof_requires_unused_fixture'; END IF;
  IF has_function_privilege('authenticated','public.q1_technical_review(uuid,text,uuid,jsonb)','EXECUTE')
    OR has_function_privilege('anon','public.q1_manage_preparation_delegate(uuid,uuid,uuid,boolean,integer)','EXECUTE')
    OR has_table_privilege('service_role','institutional.q1_technical_review_events','SELECT, INSERT, UPDATE, DELETE')
    THEN RAISE EXCEPTION 'q1_proof_privilege_boundary'; END IF;

  -- This identity is a reviewer only for the duration of the rolled-back transaction.
  UPDATE public.profiles SET role='SST_PROFISSIONAL' WHERE id=reviewer AND org_id=alfa;
  SET LOCAL ROLE service_role;
  INSERT INTO public.org_module_changes(actor_id,request_id,org_id,module,enabled,expected_revision)
    SELECT platform_actor,gen_random_uuid(),org_id,'Q1',true,revision
    FROM public.org_module_entitlements WHERE org_id IN (alfa,beta) AND module='Q1' AND NOT enabled;
  IF public.q1_preparation_journal(alfa,representative,cycle)->>'status' IS DISTINCT FROM 'forbidden' THEN RAISE EXCEPTION 'q1_proof_delegation'; END IF;
  IF public.q1_manage_preparation_delegate(alfa,other_user,platform_actor,true,0)->>'status' IS DISTINCT FROM 'forbidden' THEN RAISE EXCEPTION 'q1_proof_delegation'; END IF;
  IF public.q1_manage_preparation_delegate(alfa,representative,platform_actor,true,0)->>'status' IS DISTINCT FROM 'ready' THEN RAISE EXCEPTION 'q1_proof_delegation'; END IF;
  IF public.q1_manage_preparation_delegate(alfa,representative,platform_actor,true,0)->>'revision' IS DISTINCT FROM '1' THEN RAISE EXCEPTION 'q1_proof_delegation'; END IF;
  IF jsonb_array_length(public.q1_preparation_journal(alfa,representative,cycle,0,gen_random_uuid(),notice)->'events') IS DISTINCT FROM 1 THEN RAISE EXCEPTION 'q1_proof_prepare'; END IF;

  submission := jsonb_build_object('kind','submit','reviewerId',reviewer,'preparationRevision',1);
  IF public.q1_technical_review(alfa,cycle,platform_actor,jsonb_build_object('kind','assign','base',0,'reviewerId',reviewer))->>'status' IS DISTINCT FROM 'ready' THEN RAISE EXCEPTION 'q1_proof_forward'; END IF;
  IF public.q1_technical_review(alfa,cycle,reviewer,'{"kind":"read"}')->'snapshot' IS DISTINCT FROM 'null'::jsonb THEN RAISE EXCEPTION 'q1_proof_forward'; END IF;
  IF public.q1_technical_review(alfa,cycle,representative,submission)->>'status' IS DISTINCT FROM 'ready' THEN RAISE EXCEPTION 'q1_proof_forward'; END IF;
  result := public.q1_technical_review(alfa,cycle,reviewer,'{"kind":"read"}');
  IF jsonb_array_length(result->'snapshot') IS DISTINCT FROM 1
    OR public.q1_technical_review(alfa,cycle,other_user,'{"kind":"read"}')->>'status' IS DISTINCT FROM 'forbidden'
    OR public.q1_technical_review(beta,cycle,reviewer,'{"kind":"read"}')->>'status' IS DISTINCT FROM 'forbidden'
    THEN RAISE EXCEPTION 'q1_proof_snapshot_boundary'; END IF;

  IF public.q1_technical_review(alfa,cycle,platform_actor,'{"kind":"assign","base":2,"reviewerId":null}')->>'status' IS DISTINCT FROM 'ready' THEN RAISE EXCEPTION 'q1_proof_assignment_reactivation'; END IF;
  IF public.q1_technical_review(alfa,cycle,reviewer,'{"kind":"read"}')->>'status' IS DISTINCT FROM 'forbidden' THEN RAISE EXCEPTION 'q1_proof_assignment_reactivation'; END IF;
  IF public.q1_technical_review(alfa,cycle,platform_actor,jsonb_build_object('kind','assign','base',3,'reviewerId',reviewer))->>'status' IS DISTINCT FROM 'ready' THEN RAISE EXCEPTION 'q1_proof_assignment_reactivation'; END IF;
  IF public.q1_technical_review(alfa,cycle,reviewer,'{"kind":"read"}')->'snapshot' IS DISTINCT FROM 'null'::jsonb THEN RAISE EXCEPTION 'q1_proof_assignment_reactivation'; END IF;
  IF public.q1_technical_review(alfa,cycle,reviewer,response)->>'status' IS DISTINCT FROM 'forbidden' THEN RAISE EXCEPTION 'q1_proof_assignment_reactivation'; END IF;

  IF public.q1_technical_review(alfa,cycle,representative,submission)->>'status' IS DISTINCT FROM 'ready' THEN RAISE EXCEPTION 'q1_proof_response'; END IF;
  IF public.q1_technical_review(alfa,cycle,reviewer,response)->>'status' IS DISTINCT FROM 'ready' THEN RAISE EXCEPTION 'q1_proof_response'; END IF;
  IF public.q1_technical_review(alfa,cycle,reviewer,response)->>'status' IS DISTINCT FROM 'conflict' THEN RAISE EXCEPTION 'q1_proof_response'; END IF;
  IF public.q1_technical_review(alfa,cycle,representative,'{"kind":"read"}')->'feedback'->>'decision'
       IS DISTINCT FROM 'changes_requested' THEN RAISE EXCEPTION 'q1_proof_response'; END IF;
  IF jsonb_array_length(public.q1_preparation_journal(alfa,representative,cycle,1,gen_random_uuid(),notice)->'events') IS DISTINCT FROM 2 THEN RAISE EXCEPTION 'q1_proof_revision_or_revocation'; END IF;
  IF public.q1_technical_review(alfa,cycle,reviewer,response)->>'status' IS DISTINCT FROM 'stale' THEN RAISE EXCEPTION 'q1_proof_revision_or_revocation'; END IF;
  IF public.q1_manage_preparation_delegate(alfa,representative,platform_actor,false,1)->>'status' IS DISTINCT FROM 'ready' THEN RAISE EXCEPTION 'q1_proof_revision_or_revocation'; END IF;
  IF public.q1_preparation_journal(alfa,representative,cycle)->>'status' IS DISTINCT FROM 'forbidden' THEN RAISE EXCEPTION 'q1_proof_revision_or_revocation'; END IF;
  RESET ROLE;
  IF (SELECT count(*) FROM institutional.q1_technical_review_events
      WHERE org_id=alfa AND cycle_key=cycle AND kind='respond'
        AND preparation_revision=1 AND actor_id=reviewer AND decision='changes_requested') <> 1
    THEN RAISE EXCEPTION 'q1_proof_response_history'; END IF;
END $proof$;
SELECT 'PASS';
ROLLBACK;`);
if (result !== "PASS") throw new Error("Prova transacional do Q1 incompleta.");
console.log("PASS · delegação, revisão por versão, isolamento e revogação · transação revertida.");
