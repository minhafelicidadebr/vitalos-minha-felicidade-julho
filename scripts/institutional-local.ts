// Harness exclusivo desta entrega. Nunca usa .ivo-demo.local nem banco remoto.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Glob } from "bun";
import { requireInstitutionalLocalTarget } from "../src/lib/env/institutional-local-target";

const root = process.cwd();
export const institutionalWorkdir = join(root, ".institutional-admin.local");
export const institutionalContainer = "supabase_db_vitalos-institutional-first-admin";
const cli = "supabase@2.119.0";
async function run(args: string[], input?: string) {
  const process = Bun.spawn(args, { cwd: root, stdin: input === undefined ? "ignore" : new Blob([input]), stdout: "pipe", stderr: "pipe" });
  const [code, out, err] = await Promise.all([process.exited, new Response(process.stdout).text(), new Response(process.stderr).text()]);
  return { code, out, err };
}
export async function institutionalSql(sql: string) {
  const result = await run(["docker", "exec", "-i", institutionalContainer, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-q", "-X", "-tA", ...(/^\s*BEGIN\s*;/im.test(sql) ? [] : ["--single-transaction"]), "-f", "-"], sql);
  if (result.code) throw new Error("SQL local falhou: " + result.err.slice(0, 800));
  return result.out.trim();
}
export async function institutionalEnv(): Promise<Record<string, string>> {
  const result = await run(["bunx", cli, "status", "-o", "env", "--workdir", institutionalWorkdir]);
  if (result.code) throw new Error("Stack institucional indisponível.");
  const parsed = Object.fromEntries(result.out.split(/\r?\n/).map((line) => /^([A-Z_]+)="?(.*?)"?$/.exec(line)).filter(Boolean).map((match) => [match![1], match![2]]));
  if (parsed.API_URL !== "http://127.0.0.1:57621" || parsed.DB_URL?.includes(":57622/") !== true || !parsed.ANON_KEY || !parsed.SERVICE_ROLE_KEY) throw new Error("Alvo local não corresponde ao stack exclusivo; abortado.");
  const names = await run(["docker", "ps", "--filter", `name=^/${institutionalContainer}$`, "--format", "{{.Names}}"]);
  if (names.out.trim() !== institutionalContainer) throw new Error("Container exclusivo não identificado.");
  requireInstitutionalLocalTarget(parsed.API_URL, parsed.DB_URL, names.out.trim());
  const config = readFileSync(join(institutionalWorkdir, "supabase/config.toml"), "utf8");
  if (!config.includes('project_id = "vitalos-institutional-first-admin"')) throw new Error("Identidade do stack divergiu.");
  return {
    VITALOS_RUNTIME_ENV: "local", VITALOS_DB_TARGET: "local", SUPABASE_URL: parsed.API_URL,
    VITE_SUPABASE_URL: parsed.API_URL, SUPABASE_PUBLISHABLE_KEY: parsed.ANON_KEY,
    VITE_SUPABASE_PUBLISHABLE_KEY: parsed.ANON_KEY, SUPABASE_SERVICE_ROLE_KEY: parsed.SERVICE_ROLE_KEY,
    VITE_APP_URL: "http://localhost:8091", PLATFORM_ADMIN_EMAILS: "platform@institutional.test",
    INSTITUTIONAL_DB_URL: parsed.DB_URL!,
    VITE_FIBT_PILOT_ENABLED: "true",
  };
}
async function setup() {
  mkdirSync(join(institutionalWorkdir, "supabase"), { recursive: true });
  const configPath = join(institutionalWorkdir, "supabase/config.toml");
  if (!existsSync(configPath)) {
    const config = readFileSync(join(root, "scripts/ivo-local-demo/config.toml"), "utf8")
      .replace('project_id = "vitalos-ivo-local"', 'project_id = "vitalos-institutional-first-admin"')
      .replaceAll("5542", "5762").replace("localhost:8080", "localhost:8091");
    writeFileSync(configPath, config);
  }
  const started = await run(["bunx", cli, "start", "--workdir", institutionalWorkdir, "-x", "realtime,storage-api,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor"]);
  if (started.code) {
    const diagnostic = started.out.split(/\r?\n/).filter((line) => /error|failed|bind|denied/i.test(line)).join("\n").replace(/eyJ[A-Za-z0-9_.-]+/g, "[redacted]");
    throw new Error("Falha ao iniciar stack dedicado: " + diagnostic.slice(-1800) + "\n" + started.err.slice(-300));
  }
  const env = await institutionalEnv(); // verificação ANTES de qualquer SQL/fixture
  console.log("Alvo validado: http://127.0.0.1:57621 · DB 57622 · " + institutionalContainer);
  if ((await institutionalSql("SELECT (to_regclass('public.first_admin_invites') IS NOT NULL)::text")) !== "true") {
    const skip = new Set(["20260730160000_drop_response_invite_link_contract.sql", "20260806210000_drop_response_invite_link_contract_production.sql"]);
    const names = [...new Glob("*.sql").scanSync({ cwd: join(root, "supabase/migrations") })].sort().filter((name) => !skip.has(name));
    for (const name of names) {
      const compensation = join(root, "supabase/local/lineage", name);
      if (existsSync(compensation)) await institutionalSql(readFileSync(compensation, "utf8"));
      try { await institutionalSql(readFileSync(join(root, "supabase/migrations", name), "utf8")); }
      catch (error) { throw new Error(`Migration ${name}: ${(error as Error).message}`); }
    }
    console.log(`Linhagem aplicada: ${names.length}; duas exclusões históricas iguais ao harness IVO.`);
  }
  // Upgrade explícito da versão inicial já instalada neste stack descartável.
  if ((await institutionalSql("SELECT prosecdef::text FROM pg_proc WHERE oid=to_regprocedure('institutional.guard_first_admin_invite()')")) === "false") {
    await institutionalSql(readFileSync(join(root, "supabase/migrations/20261113202253_institutional_first_admin_private_identity.sql"), "utf8"));
    console.log("Migration aditiva de identidade privada aplicada no stack exclusivo.");
  }
  if ((await institutionalSql("SELECT (to_regclass('public.org_module_entitlements') IS NOT NULL)::text")) !== "true") {
    await institutionalSql(readFileSync(join(root, "supabase/migrations/20261115135955_enterprise_module_entitlements.sql"), "utf8"));
    console.log("Habilitação Q1/Q2 aplicada exclusivamente no stack descartável; sem backfill.");
  }
  if ((await institutionalSql("SELECT coalesce(obj_description('public.aggregate_cohort_responses(uuid,uuid)'::regprocedure,'pg_proc'),'')")) !== "enterprise_modules_v2_pack_compatibility") {
    await institutionalSql(readFileSync(join(root, "supabase/migrations/20261115142320_enterprise_module_pack_compatibility.sql"), "utf8"));
    console.log("Compatibilidade dos packs aplicada somente no stack descartável.");
  }
  for (const [name, slug] of [["Empresa Fictícia Alfa", "institutional-alfa"], ["Empresa Fictícia Beta", "institutional-beta"]]) {
    await institutionalSql(`INSERT INTO public.organizations(name,slug,pack_id,plan) VALUES ('${name}','${slug}','enterprise','pilot') ON CONFLICT (slug) DO NOTHING;`);
  }
  // Somente contas fictícias locais. Nenhuma sessão é gerada administrativamente.
  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  for (const email of ["platform@institutional.test", "alfa@institutional.test", "beta@institutional.test", "wrong@institutional.test"]) {
    const { error } = await admin.auth.admin.createUser({ email, password: "Synthetic-local-only-2026!", email_confirm: true });
    if (error && !/already|registered/i.test(error.message)) throw new Error("Criação de identidade sintética falhou.");
  }
  console.log("Empresas e identidades sintéticas preparadas; nenhum perfil institucional criado por fixture.");
}
async function dev() {
  const env = await institutionalEnv();
  // Ausência é o perfil canônico default; string vazia significa perfil inválido.
  // Não herda flags de staging/HML, nem deixa o Bun recarregar arquivos .env.
  const childEnv = Object.fromEntries(Object.entries({ ...process.env, ...env }).filter(([key]) => !/^(VITALOS_IVO_|FIBT_HML_|VITE_FIBT_HML_|STAGING_)/.test(key))) as Record<string,string>;
  const preflight = Bun.spawn(["bun", "--no-env-file", "run", "scripts/environment-preflight.ts", "--runtime=local", "--db=local"], { env: childEnv, stdout: "inherit", stderr: "inherit" });
  if (await preflight.exited) throw new Error("Preflight local recusou o harness.");
  const child = Bun.spawn(["node", join(root, "node_modules/vite/bin/vite.js"), "--host", "127.0.0.1", "--port", "8091"], {
    env: childEnv, stdout: "inherit", stderr: "inherit",
  });
  process.exit(await child.exited);
}
if (import.meta.main) {
  const command = process.argv[2];
  if (command === "setup") await setup();
  else if (command === "dev") await dev();
  else throw new Error("Use setup ou dev. Nenhum reset é oferecido.");
}
