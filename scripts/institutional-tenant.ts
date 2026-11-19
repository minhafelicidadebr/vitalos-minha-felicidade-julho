// Harness de personas Q2 no stack institucional LOCAL — reprodutível e idempotente.
//
//   bun --no-env-file run scripts/institutional-tenant.ts provision --tenant gama --stack-root <checkout> [--port 8092]
//   bun --no-env-file run scripts/institutional-tenant.ts readback --stack-root <checkout>
//
// provision: empresa fictícia `institutional-<tenant>` pelo fluxo real do produto —
// plataforma → primeiro RH → Q2 por CAS → onda FIB-T/setor/link → 5 respostas
// sintéticas → publicação protegida pelo RH → convite LIDER_EQUIPE aceito.
// Cada passo confere o estado antes de escrever; rodar de novo não duplica nada.
// Requer o app deste checkout em --port (scripts/institutional-app-port.ts).
// readback: resumo `READ ONLY` por tenant, sem e-mails nem tokens.
// Nunca toca Alfa/Beta, nunca inicia, reinicia ou reseta o stack.
import { createClient } from "@supabase/supabase-js";
import { randomBytes, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { toJSONAsync, fromCrossJSON } from "seroval";
import { parseTenantCommand, sanitizeLine, syntheticEmails, tenantSlug } from "./institutional-tenant-guards";
import { requireInstitutionalLocalTarget } from "../src/lib/env/institutional-local-target";

const argv = process.argv.slice(2);
const command = parseTenantCommand(argv); // recusa antes de qualquer I/O
const here = process.cwd();
const stackFlag = argv.indexOf("--stack-root");
const stackRoot = resolve(stackFlag >= 0 ? argv[stackFlag + 1]! : here);
if (!existsSync(join(stackRoot, ".institutional-admin.local", "supabase", "config.toml"))) {
  throw new Error("--stack-root não contém .institutional-admin.local; nada foi feito.");
}
process.chdir(stackRoot); // o launcher deriva a raiz de process.cwd()
const local = await import(join(stackRoot, "scripts/institutional-local.ts"));
const env: Record<string, string> = await local.institutionalEnv();
process.chdir(here);
requireInstitutionalLocalTarget(env.SUPABASE_URL, env.INSTITUTIONAL_DB_URL, "supabase_db_vitalos-institutional-first-admin");
Object.assign(process.env, env);

const log = (line: string) => console.log(sanitizeLine(line));
const step = (name: string, state: "criado" | "existente" | "ok", pass = true) => {
  log(`${pass ? "PASS" : "FAIL"} ${name} · ${state}`);
  if (!pass) throw new Error("Interrompido: " + name);
};

if (command.kind === "readback") {
  const sql = `BEGIN READ ONLY;
SELECT o.slug,
  (SELECT count(*) FROM public.profiles p WHERE p.org_id=o.id AND p.role='RH_ADMIN') AS rh,
  (SELECT count(*) FROM public.profiles p WHERE p.org_id=o.id AND p.role='LIDER_EQUIPE') AS lideres,
  (SELECT count(*) FROM public.profiles p WHERE p.org_id=o.id AND p.role='COLABORADOR') AS colaboradores,
  coalesce((SELECT m.enabled::text FROM public.org_module_entitlements m WHERE m.org_id=o.id AND m.module='Q2'),'ausente') AS q2,
  (SELECT count(*) FROM public.action_plans ap WHERE ap.org_id=o.id) AS planos,
  (SELECT count(*) FROM public.action_items ai WHERE ai.org_id=o.id) AS acoes,
  (SELECT count(*) FROM public.action_items ai JOIN public.profiles p ON p.id=ai.owner_user_id WHERE ai.org_id=o.id AND p.role='LIDER_EQUIPE') AS acoes_de_lideranca
FROM public.organizations o WHERE o.slug LIKE 'institutional-%' ORDER BY o.slug;
COMMIT;`;
  log("slug | rh | lideres | colaboradores | q2 | planos | acoes | acoes_de_lideranca");
  for (const row of (await local.institutionalSql(sql)).split(/\r?\n/).filter(Boolean)) log(row);
  process.exit(0);
}

const { tenant, origin } = command;
const slug = tenantSlug(tenant);
const emails = syntheticEmails(tenant);
const PASSWORD = "Synthetic-local-only-2026!"; // senha sintética do launcher (institutional-local.ts setup)
const WAVE_LABEL = "Prova local liderança Q2";

const modules = new Map<string, string>();
async function http(file: string, name: string, data: unknown): Promise<any> {
  if (!modules.has(file)) {
    const r = await fetch(`${origin}/src/lib/api/${file}.functions.ts`, { signal: AbortSignal.timeout(30000) });
    if (!r.ok) throw new Error(`App local indisponível em ${origin}; suba scripts/institutional-app-port.ts.`);
    modules.set(file, await r.text());
  }
  const id = new RegExp(`export const ${name} = [^\\n]+createClientRpc\\("([^"]+)"`).exec(modules.get(file)!)?.[1];
  if (!id) throw new Error("Server function não localizada: " + name);
  const r = await fetch(`${origin}/_serverFn/${id}`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json", "x-tsr-serverFn": "true", origin },
    body: JSON.stringify(await toJSONAsync({ data })),
    signal: AbortSignal.timeout(30000),
  });
  const json = await r.json();
  const value: any = r.headers.has("x-tss-serialized") ? fromCrossJSON(json, {}) : json;
  if (!r.ok || value instanceof Error || value?.error) throw new Error("Chamada recusada: " + name);
  return value?.result ?? value;
}
async function login(email: string) {
  const client = createClient(env.SUPABASE_URL!, env.SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error || !data.session) throw new Error("Login sintético falhou.");
  return { accessToken: data.session.access_token, userId: data.user!.id };
}
const admin = createClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
async function roleCount(orgId: string, role: string): Promise<number> {
  const { count, error } = await admin.from("profiles").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("role", role);
  if (error) throw new Error("Leitura de perfis falhou.");
  return count ?? 0;
}

// 1. Empresa fictícia (plano enterprise, como a fixture Alfa/Beta do module-proof).
let orgId: string;
{
  const found = await admin.from("organizations").select("id").eq("slug", slug).maybeSingle();
  if (found.data) { orgId = found.data.id; step(`empresa ${slug}`, "existente"); }
  else {
    const created = await admin.from("organizations").insert({ name: `Empresa Fictícia ${tenant[0]!.toUpperCase()}${tenant.slice(1)}`, slug, pack_id: "enterprise", plan: "enterprise" }).select("id").single();
    step(`empresa ${slug}`, "criado", !created.error && !!created.data);
    orgId = created.data!.id;
  }
}

// 2. Identidades sintéticas.
for (const email of [emails.rh, emails.leader]) {
  const { error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  step(`identidade ${email.split("@")[0]}`, error ? "existente" : "criado", !error || /already|registered/i.test(error.message));
}

// 3. Primeiro RH pela plataforma.
const platform = await login("platform@institutional.test");
const rh = await login(emails.rh);
if ((await roleCount(orgId, "RH_ADMIN")) > 0) step("primeiro RH", "existente");
else {
  const { issueFirstAdmin, acceptFirstAdmin } = await import("../src/lib/identity/first-admin.server");
  const invite = { accessToken: platform.accessToken, organizationId: orgId, email: emails.rh, requestId: randomUUID(), token: randomBytes(32).toString("hex") };
  step("convite de primeiro RH", "criado", (await issueFirstAdmin(invite)).ok);
  step("aceite do primeiro RH", "criado", (await acceptFirstAdmin({ accessToken: rh.accessToken, token: invite.token }, true)).ok);
}

// 4. Q2 pela plataforma (CAS por revisão), só neste tenant.
{
  const inventory = await http("module-access", "listPlatformModulesFn", { accessToken: platform.accessToken });
  const q2 = inventory.organizations.find((o: any) => o.id === orgId)?.modules.find((m: any) => m.module === "Q2");
  if (q2?.enabled) step("Q2 habilitado", "existente");
  else {
    const changed = await http("module-access", "changeModuleFn", { accessToken: platform.accessToken, organizationId: orgId, module: "Q2", enabled: true, expectedRevision: q2?.revision ?? 0, requestId: randomUUID() });
    step("Q2 habilitado", "criado", changed.ok);
  }
}

// 5. Onda FIB-T e setor.
let waveId: string;
{
  const found = await admin.from("waves").select("id").eq("org_id", orgId).eq("label", WAVE_LABEL).maybeSingle();
  if (found.data) { waveId = found.data.id; step("onda FIB-T", "existente"); }
  else {
    const wave = await http("wave-admin", "adminCreateWave", { accessToken: rh.accessToken, instrument: "FIB_T", inviteCount: 5, linkModel: "SECTOR", label: WAVE_LABEL });
    step("onda FIB-T", "criado", wave.ok);
    waveId = wave.waveId;
  }
  const cohort = await admin.from("wave_cohorts").select("id").eq("wave_id", waveId).ilike("key", "equipe").maybeSingle(); // o servidor normaliza a chave (EQUIPE)
  if (cohort.data) step("setor equipe", "existente");
  else step("setor equipe", "criado", (await http("sector-operations", "adminCreateWaveSector", { accessToken: rh.accessToken, waveId, key: "equipe", label: `Equipe ${tenant} sintética` })).created);
}

// 6. Publicação protegida: o RH abre o centro de controle (mesmo caminho do servidor).
async function publishAndCountAvailable(): Promise<number> {
  const { loadFibtManagerControlCenterAsAdmin } = await import("../src/lib/fibt/fibt-manager-control-center.server");
  const { advanceCohortPublication } = await import("../src/lib/fibt/fibt-cohort-publication.server");
  await loadFibtManagerControlCenterAsAdmin(orgId, waveId, { environment: "application", hmlAttested: false, publisherAccessToken: rh.accessToken }, { advancePublication: advanceCohortPublication });
  const reading = await http("ivo-q2-reading", "loadIvoQ2Reading", { accessToken: rh.accessToken, waveId });
  return reading.ok && reading.state === "ready" ? reading.view.sectors.filter((s: any) => s.group === "available").length : 0;
}
if ((await publishAndCountAvailable()) > 0) step("setor publicado (n≥5)", "existente");
else {
  const link = await http("sector-operations", "adminIssueWaveSectorLink", { accessToken: rh.accessToken, waveId, cohortKey: "equipe", expiresInDays: 7 });
  step("link de setor", "criado", link.created && !!link.token);
  const { getFibtManifest } = await import("../src/domain/instruments/fibt/fibt-instrument");
  const answers = getFibtManifest().items.map((i) => ({ itemId: i.id, value: 3 }));
  for (let i = 1; i <= 5; i++) step(`resposta sintética ${i}`, "criado", (await http("sector-link", "submitSectorLinkResponse", { token: link.token, answers, consentVersion: "2026.1" })).accepted);
  step("setor publicado (n≥5)", "criado", (await publishAndCountAvailable()) > 0);
}

// 7. Liderança convidada pelo RH e aceita pela própria identidade.
if ((await roleCount(orgId, "LIDER_EQUIPE")) > 0) step("liderança", "existente");
else {
  const leader = await login(emails.leader);
  const invite = await http("member-invite", "createMemberInviteLink", { accessToken: rh.accessToken, email: emails.leader, role: "LIDER_EQUIPE" });
  step("convite LIDER_EQUIPE", "criado", invite.ok);
  const accepted = await http("member-invite", "submitMemberInviteAcceptance", { accessToken: leader.accessToken, token: invite.token });
  step("aceite da liderança", "criado", accepted.ok && accepted.orgId === orgId && accepted.role === "LIDER_EQUIPE");
}
log(`${slug} pronto. Plano e designação ficam com o RH no navegador (/ivo-integral/acoes).`);
