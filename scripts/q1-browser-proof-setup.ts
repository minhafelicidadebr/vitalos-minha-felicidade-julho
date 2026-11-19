// Explicit setup for the isolated Q1 browser fixture. No reset or remote target.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Glob } from "bun";
import { requireQ1BrowserProofLocalTarget } from "../src/lib/env/q1-browser-proof-local-target";

const root = ".q1-browser-proof.local";
const configFile = join(root, "supabase", "config.toml");
const project = "vitalos-q1-browser-proof";
const container = "supabase_db_" + project;
const api = "http://127.0.0.1:57721";
const cli = ["bunx", "supabase@2.119.0"];
const [operation, resumeFlag, ...extra] = process.argv.slice(2);
const resume = resumeFlag?.startsWith("--resume-from=") ? resumeFlag.slice(14) : undefined;
if (operation !== "--prepare-disposable" || extra.length || (resumeFlag && !resume))
  throw new Error("A preparação exige --prepare-disposable.");

async function run(args: string[], input?: string) {
  const child = Bun.spawn(args, {
    stdin: input === undefined ? "ignore" : new Blob([input]),
    stdout: "pipe",
    stderr: "pipe",
    windowsHide: true,
  });
  const [code, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);
  return { code, stdout: stdout.trim(), stderr: stderr.trim() };
}

async function sql(query: string) {
  const result = await run(
    [
      "docker",
      "exec",
      "-i",
      container,
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-XqAt",
      "-v",
      "ON_ERROR_STOP=1",
      ...(/^\s*BEGIN\s*;/im.test(query) ? [] : ["--single-transaction"]),
      "-f",
      "-",
    ],
    query,
  );
  if (result.code) throw new Error("SQL na fixture Q1 falhou: " + result.stderr.slice(0, 500));
  return result.stdout;
}

const config = readFileSync("scripts/ivo-local-demo/config.toml", "utf8")
  .replace('project_id = "vitalos-ivo-local"', 'project_id = "' + project + '"')
  .replaceAll("5542", "5772")
  .replaceAll("localhost:8080", "localhost:8093");
if (!existsSync(configFile)) {
  mkdirSync(join(root, "supabase"), { recursive: true });
  writeFileSync(configFile, config, { flag: "wx" });
} else if (readFileSync(configFile, "utf8") !== config) {
  throw new Error("Configuração do stack de prova divergiu. Revise o alvo antes de continuar.");
}

const start = await run([
  ...cli,
  "start",
  "--workdir",
  root,
  "-x",
  "realtime,storage-api,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor",
]);
if (start.code)
  throw new Error(
    "O projeto descartável Q1 não iniciou: " + start.stderr.split("\n").slice(-4).join(" "),
  );
const status = await run([...cli, "status", "-o", "env", "--workdir", root]);
const values = Object.fromEntries(
  status.stdout.split(/\r?\n/).flatMap((line) => {
    const match = /^([A-Z_]+)="?(.*?)"?$/.exec(line);
    return match ? [[match[1], match[2]]] : [];
  }),
);
const ports = await run(["docker", "port", container, "5432/tcp"]);
if (status.code || ports.code || !values.SERVICE_ROLE_KEY)
  throw new Error("Alvo descartável Q1 não confirmado. Nenhum SQL de setup foi executado.");
const projectId = /^project_id\s*=\s*"([^"]+)"/m.exec(readFileSync(configFile, "utf8"))?.[1];
requireQ1BrowserProofLocalTarget(values.API_URL, values.DB_URL, container, ports.stdout, projectId);

const schema = await sql(
  "SELECT CASE WHEN to_regclass('institutional.q1_technical_review_events') IS NOT NULL THEN 'ready' WHEN to_regclass('public.organizations') IS NULL THEN 'empty' ELSE 'partial' END;",
);
if (resume && schema !== "partial")
  throw new Error("A retomada exige instalação parcial na fixture dedicada.");
if (schema === "empty" || (schema === "partial" && resume)) {
  const ignored = new Set([
    "20260730160000_drop_response_invite_link_contract.sql",
    "20260806210000_drop_response_invite_link_contract_production.sql",
  ]);
  const migrations = [...new Glob("*.sql").scanSync({ cwd: "supabase/migrations" })]
    .sort()
    .filter((name) => !ignored.has(name));
  const startIndex = resume ? migrations.indexOf(resume) : 0;
  if (startIndex < 0) throw new Error("Migration de retomada fora da linhagem local.");
  for (const name of migrations.slice(startIndex)) {
    const compensation = join("supabase", "local", "lineage", name);
    try {
      if (existsSync(compensation)) await sql(readFileSync(compensation, "utf8"));
      await sql(readFileSync(join("supabase", "migrations", name), "utf8"));
    } catch (error) {
      throw new Error(name + ": " + (error instanceof Error ? error.message : "falha"));
    }
  }
  console.log(
    "Linhagem instalada na fixture isolada: " +
      (migrations.length - startIndex) +
      " migrations nesta execução.",
  );
} else if (schema !== "ready") {
  throw new Error("A fixture tem instalação parcial. Nenhuma migration foi reaplicada.");
}

const { createClient } = await import("@supabase/supabase-js");
const admin = createClient(api, values.SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const accounts = [
  "platform@institutional.test",
  "colaborador.alfa@institutional.test",
  "sst.alfa@institutional.test",
  "beta@institutional.test",
];
for (const email of accounts) {
  const { error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error && !/already|registered/i.test(error.message))
    throw new Error("Falhou a criação de uma identidade fictícia.");
}

await sql(`BEGIN;
INSERT INTO public.organizations(name,slug,pack_id,plan) VALUES
  ('Empresa Fictícia Alfa','institutional-alfa','enterprise','pilot'),
  ('Empresa Fictícia Beta','institutional-beta','enterprise','pilot')
ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.profiles (id,org_id,role,display_name)
  SELECT u.id,o.id,f.role,f.name FROM (VALUES
    ('colaborador.alfa@institutional.test','institutional-alfa','COLABORADOR','Representante Alfa'),
    ('sst.alfa@institutional.test','institutional-alfa','SST_PROFISSIONAL','SST Alfa'),
    ('beta@institutional.test','institutional-beta','RH_ADMIN','RH Beta')
  ) AS f(email,slug,role,name) JOIN auth.users u USING(email) JOIN public.organizations o USING(slug)
ON CONFLICT (id) DO NOTHING;
DO $fixture$
DECLARE platform_actor uuid;
BEGIN
  SELECT id INTO STRICT platform_actor FROM auth.users WHERE email='platform@institutional.test';
  SET LOCAL ROLE service_role;
  INSERT INTO public.org_module_changes(actor_id,request_id,org_id,module,enabled,expected_revision)
    SELECT platform_actor,gen_random_uuid(),o.id,'Q1',true,coalesce(e.revision,0)
    FROM public.organizations o
    LEFT JOIN public.org_module_entitlements e ON e.org_id=o.id AND e.module='Q1'
    WHERE o.slug IN ('institutional-alfa','institutional-beta') AND NOT coalesce(e.enabled,false);
END $fixture$;
COMMIT;
NOTIFY pgrst, 'reload schema';`);
console.log("Fixture Q1 preparada. Logins devem ser feitos pelo correio local no navegador.");
