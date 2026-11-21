// Instalação vazia da fatia em DB isolado, sem reset de qualquer stack.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  institutionalEnv,
  institutionalContainer,
  institutionalWorkdir,
} from "./institutional-local";
import { requireInstitutionalLocalTarget } from "../src/lib/env/institutional-local-target";
const env = await institutionalEnv();
requireInstitutionalLocalTarget(env.SUPABASE_URL, env.INSTITUTIONAL_DB_URL, institutionalContainer);
const database = `module_clean_${Date.now()}`;
if (!/^module_clean_[0-9]+$/.test(database)) throw new Error("Nome de DB inválido.");
async function run(args: string[], input?: string) {
  const child = Bun.spawn(["docker", "exec", "-i", institutionalContainer, ...args], {
    stdin: input ? new Blob([input]) : "ignore",
    stdout: "pipe",
    stderr: "pipe",
  });
  const [code, out, error] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);
  if (code) throw new Error("Prova de schema local: " + error.slice(0, 800));
  return out.trim();
}
await run(["createdb", "-U", "postgres", database]);
const schema = await run([
  "pg_dump",
  "-U",
  "postgres",
  "-d",
  "postgres",
  "--schema-only",
  "--no-owner",
  "--no-privileges",
  "--no-publications",
  "--no-subscriptions",
]);
await run(
  ["psql", "-U", "postgres", "-d", database, "-v", "ON_ERROR_STOP=1", "-q", "-f", "-"],
  schema,
);
const sql = (text: string) =>
  run(
    [
      "psql",
      "-U",
      "postgres",
      "-d",
      database,
      "-v",
      "ON_ERROR_STOP=1",
      "-q",
      "-X",
      "-tA",
      "-f",
      "-",
    ],
    text,
  );
if ((await sql("SELECT current_database()")) !== database)
  throw new Error("DB isolado não identificado.");
// Retira somente a fatia nova da CÓPIA VAZIA, restaurando sua base anterior.
await sql(`DROP FUNCTION public.aggregate_cohort_responses(uuid,uuid);
ALTER FUNCTION institutional.aggregate_cohort_responses(uuid,uuid) SET SCHEMA public;
DROP FUNCTION institutional.guard_module_operation() CASCADE;
DROP FUNCTION institutional.module_readable(text,jsonb) CASCADE;
DROP FUNCTION institutional.resource_module(text,jsonb);
DROP TABLE public.org_module_changes,public.org_module_entitlements CASCADE;
DROP FUNCTION institutional.change_module();`);
await sql(
  readFileSync("supabase/migrations/20261115135955_enterprise_module_entitlements.sql", "utf8"),
);
await sql(
  readFileSync(
    "supabase/migrations/20261115142320_enterprise_module_pack_compatibility.sql",
    "utf8",
  ),
);
const compatibility = await sql(`BEGIN;
GRANT SELECT,INSERT ON public.waves TO service_role;
INSERT INTO public.organizations(id,name,slug,pack_id) VALUES ('11111111-1111-4111-8111-111111111111','Fixture de compatibilidade','module-clean-compatibility','enterprise');
SET LOCAL ROLE service_role;
INSERT INTO public.waves(org_id,instrument,label) VALUES ('11111111-1111-4111-8111-111111111111','PERMA','Contrato anterior preservado');
DO $$ BEGIN
  BEGIN
    INSERT INTO public.waves(org_id,instrument) VALUES ('11111111-1111-4111-8111-111111111111','FIB_T');
    RAISE EXCEPTION 'expected_module_denial';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'module_disabled' THEN RAISE; END IF;
  END;
END $$;
SELECT count(*)=1 FROM public.waves WHERE org_id='11111111-1111-4111-8111-111111111111' AND instrument='PERMA';
ROLLBACK;`);
if (compatibility !== "t") throw new Error("Compatibilidade das outras lentes divergiu.");
const checks = await sql(
  `SELECT json_build_object('emptyOrganizations',(SELECT count(*)=0 FROM public.organizations),'emptyModules',(SELECT count(*)=0 FROM public.org_module_entitlements),'tenantCannotWrite',NOT has_table_privilege('authenticated','public.org_module_entitlements','UPDATE'),'privatePublisher',NOT has_function_privilege('authenticated','institutional.aggregate_cohort_responses(uuid,uuid)','EXECUTE'))::text`,
);
const result = JSON.parse(checks);
result.otherLensesPreservedAndMissingModuleDenied = compatibility === "t";
if (!Object.values(result).every(Boolean))
  throw new Error("Contrato da instalação vazia divergiu.");
writeFileSync(
  join(institutionalWorkdir, "module-schema-proof.json"),
  JSON.stringify(
    {
      recordedAt: new Date().toISOString(),
      database,
      scope:
        "Instalação vazia da fatia sobre schema sintético copiado; não é replay integral da linhagem.",
      result,
    },
    null,
    2,
  ),
);
console.log("PASS instalação vazia da fatia e grants privados; DB separado: " + database);
