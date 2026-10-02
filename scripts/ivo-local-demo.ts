#!/usr/bin/env bun
// ═══════════════════════════════════════════════════════════════════════════
// DEMONSTRAÇÃO LOCAL DA JORNADA IVO (R5/R6) — Supabase local descartável
// ═══════════════════════════════════════════════════════════════════════════
//
// O QUE FAZ
//   setup  Sobe um Supabase LOCAL (Docker, CLI pinado) em .ivo-demo.local/,
//          aplica a linhagem de produção do repositório (mesma seleção e
//          compensações do scripts/db-replay-proof.ts) + a migration R6, e
//          semeia DUAS organizações fictícias com respostas sintéticas.
//          A publicação protegida é feita pelo mecanismo canônico
//          (aggregate_cohort_responses chamado com o JWT do gestor, via
//          PostgREST) — nunca por INSERT direto em cohort_capsules.
//   dev    Sobe o app (bun run dev) apontando para o Supabase local, com a
//          capability ACTION_PLAN ligada SÓ como fixture local controlada.
//   env    Imprime os NOMES das variáveis do ambiente local (sem valores).
//   stop   Derruba o stack local e descarta os dados.
//
// FRONTEIRA: nenhum caminho deste arquivo aceita host remoto. O alvo é
// verificado antes de qualquer escrita: URL da API loopback (mesma regra do
// preflight) e container de banco com o nome exato do projeto local.
// Credenciais: as chaves padrão públicas do Supabase CLI local, gravadas só em
// .ivo-demo.local/ (ignorado pelo git). Nenhum dado real, nenhuma ISG.

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Glob } from "bun";
import { isLocalUrl } from "../src/lib/env/environment-contract";
import { getFibtManifest } from "../src/domain/instruments/fibt/fibt-instrument";

const ROOT = process.cwd();
const WORKDIR = join(ROOT, ".ivo-demo.local");
const PROJECT_ID = "vitalos-ivo-local";
const DB_CONTAINER = `supabase_db_${PROJECT_ID}`;
const CLI = "supabase@2.119.0";
const ENV_FILE = join(WORKDIR, "demo.env");
const USERS_FILE = join(WORKDIR, "demo-users.json");

/** Mesmas exclusões declaradas do replay (linhagem de produção). */
const STAGING_ONLY = new Set(["20260730160000_drop_response_invite_link_contract.sql"]);
const NAO_EXECUTAVEIS = new Set(["20260806210000_drop_response_invite_link_contract_production.sql"]);

// ── Fixtures fictícias (UUIDs fixos, prefixo d1/d2) ──────────────────────────
export const DEMO = {
  orgs: {
    alfa: { id: "d1000000-0000-4000-8000-000000000001", slug: "org-ficticia-alfa", name: "Organização Fictícia Alfa" },
    beta: { id: "d2000000-0000-4000-8000-000000000001", slug: "org-ficticia-beta", name: "Organização Fictícia Beta" },
  },
  waves: {
    alfa: { id: "d1000000-0000-4000-8000-0000000000a0", label: "FIB-T Alfa · 2º trimestre 2026" },
    beta: { id: "d2000000-0000-4000-8000-0000000000b0", label: "FIB-T Beta · 2º trimestre 2026" },
  },
  // Alfa: Operações 9 (publicada), Atendimento 6 (publicação pendente — ninguém
  // acionou o publicador), Logística 3 e Financeiro 2 (abaixo do limiar; dois
  // ocultos ⇒ sem supressão complementar), Comercial 0 (em coleta).
  // Beta: Produção 8 e Qualidade 3 — um único oculto ⇒ supressão complementar.
  cohorts: [
    { id: "d1000000-0000-4000-8000-0000000000c1", org: "alfa", key: "operacoes", label: "Operações", responses: 9, publish: true },
    { id: "d1000000-0000-4000-8000-0000000000c2", org: "alfa", key: "atendimento", label: "Atendimento", responses: 6, publish: false },
    { id: "d1000000-0000-4000-8000-0000000000c3", org: "alfa", key: "logistica", label: "Logística", responses: 3, publish: false },
    { id: "d1000000-0000-4000-8000-0000000000c4", org: "alfa", key: "financeiro", label: "Financeiro", responses: 2, publish: false },
    { id: "d1000000-0000-4000-8000-0000000000c5", org: "alfa", key: "comercial", label: "Comercial", responses: 0, publish: false },
    { id: "d2000000-0000-4000-8000-0000000000c1", org: "beta", key: "producao", label: "Produção", responses: 8, publish: true },
    { id: "d2000000-0000-4000-8000-0000000000c2", org: "beta", key: "qualidade", label: "Qualidade", responses: 3, publish: false },
  ],
  users: [
    { key: "alfa_admin", org: "alfa", role: "RH_ADMIN", email: "gestora.alfa@alfa.ficticia.test", name: "Gestora Alfa (fictícia)" },
    { key: "alfa_membro", org: "alfa", role: "COLABORADOR", email: "membro.alfa@alfa.ficticia.test", name: "Membro Alfa (fictício)" },
    { key: "beta_admin", org: "beta", role: "RH_ADMIN", email: "gestor.beta@beta.ficticia.test", name: "Gestor Beta (fictício)" },
  ],
} as const;

// ── Utilitários ──────────────────────────────────────────────────────────────

async function run(cmd: string[], input?: string): Promise<{ code: number; out: string; err: string }> {
  const proc = Bun.spawn(cmd, { stdin: input === undefined ? "ignore" : "pipe", stdout: "pipe", stderr: "pipe" });
  if (input !== undefined && proc.stdin) {
    proc.stdin.write(input);
    await proc.stdin.end();
  }
  const [out, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  return { code: await proc.exited, out, err };
}

function fail(message: string): never {
  console.error(`\n❌ ${message}`);
  process.exit(1);
}

async function psql(sql: string, singleTransaction = true): Promise<{ code: number; out: string; err: string }> {
  const ownTx = /^\s*BEGIN\s*;/im.test(sql);
  return run(
    [
      "docker", "exec", "-i", DB_CONTAINER, "psql", "-U", "postgres", "-d", "postgres",
      "-v", "ON_ERROR_STOP=1", "-q", "-X", "-tA",
      ...(singleTransaction && !ownTx ? ["--single-transaction"] : []),
      "-f", "-",
    ],
    sql,
  );
}

async function scalar(sql: string): Promise<string> {
  const r = await psql(sql, false);
  if (r.code !== 0) fail(`consulta falhou: ${r.err.trim().split("\n").slice(0, 3).join(" | ")}`);
  return r.out.trim();
}

interface LocalStack {
  apiUrl: string;
  anonKey: string;
  serviceKey: string;
}

async function stackStatus(): Promise<LocalStack | null> {
  const r = await run(["bunx", CLI, "status", "-o", "env", "--workdir", WORKDIR]);
  if (r.code !== 0) return null;
  const vars = Object.fromEntries(
    r.out
      .split(/\r?\n/)
      .map((line) => /^([A-Z_]+)="?(.*?)"?$/.exec(line.trim()))
      .filter((m): m is RegExpExecArray => !!m)
      .map((m) => [m[1]!, m[2]!]),
  );
  const apiUrl = vars.API_URL;
  const anonKey = vars.ANON_KEY;
  const serviceKey = vars.SERVICE_ROLE_KEY;
  if (!apiUrl || !anonKey || !serviceKey) return null;
  return { apiUrl, anonKey, serviceKey };
}

/** Verifica que o alvo é o stack LOCAL desta demo antes de qualquer escrita. */
async function assertLocalTarget(stack: LocalStack): Promise<void> {
  if (!isLocalUrl(stack.apiUrl)) fail(`API do stack não é loopback (${stack.apiUrl}). Abortado antes de escrever.`);
  const names = await run(["docker", "ps", "--filter", `name=^/${DB_CONTAINER}$`, "--format", "{{.Names}}"]);
  if (names.out.trim() !== DB_CONTAINER) fail(`container ${DB_CONTAINER} não está rodando. Abortado antes de escrever.`);
  // Conexão por socket local do próprio container (inet_server_port é NULL aqui).
  const db = await scalar(
    "SELECT current_database() || '|' || (to_regclass('auth.users') IS NOT NULL)::TEXT || '|' || COALESCE(inet_server_port()::TEXT, 'socket');",
  );
  if (db !== "postgres|true|socket") fail(`banco inesperado no container (${db}).`);
}

// ── Linhagem ─────────────────────────────────────────────────────────────────

function lineage(): string[] {
  const dir = join(ROOT, "supabase", "migrations");
  return [...new Glob("*.sql").scanSync({ cwd: dir })].sort().filter((n) => !STAGING_ONLY.has(n) && !NAO_EXECUTAVEIS.has(n));
}

async function applyLineage(): Promise<void> {
  const applied = await scalar(
    "SELECT (to_regclass('public.action_items') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='action_items' AND column_name='source_lens_id'))::TEXT;",
  );
  if (applied === "true") {
    console.log("  ok   linhagem já aplicada neste stack local (nada reaplicado)");
    return;
  }
  const names = lineage();
  for (const name of names) {
    const compensation = join(ROOT, "supabase", "local", "lineage", name);
    if (existsSync(compensation)) {
      const c = await psql(readFileSync(compensation, "utf8"));
      if (c.code !== 0) fail(`compensação de linhagem ${name}: ${c.err.trim().split("\n").slice(0, 4).join(" | ")}`);
    }
    const r = await psql(readFileSync(join(ROOT, "supabase", "migrations", name), "utf8"));
    if (r.code !== 0) fail(`migration ${name}: ${r.err.trim().split("\n").slice(0, 6).join(" | ")}`);
  }
  console.log(`  ok   linhagem de produção aplicada (${names.length} migrations; exclusões declaradas: ${[...STAGING_ONLY, ...NAO_EXECUTAVEIS].length})`);
}

// ── Semeadura sintética ─────────────────────────────────────────────────────

/** Respostas determinísticas 0–4 por item (sem nenhum dado real). */
function syntheticAnswers(seed: number): Record<string, number> {
  const items = getFibtManifest().items;
  let x = seed * 2654435761;
  return Object.fromEntries(
    items.map((item) => {
      x = (x * 1103515245 + 12345) >>> 0;
      return [item.id, (x >>> 16) % 5];
    }),
  );
}

async function gotrue(stack: LocalStack, path: string, body: unknown): Promise<Response> {
  return fetch(`${stack.apiUrl}/auth/v1${path}`, {
    method: "POST",
    headers: {
      apikey: stack.serviceKey,
      Authorization: `Bearer ${stack.serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function demoPassword(key: string): string {
  return `demo-local-${key}-2026`;
}

async function ensureUsers(stack: LocalStack): Promise<Record<string, string>> {
  const ids: Record<string, string> = {};
  for (const user of DEMO.users) {
    const existing = await scalar(`SELECT id::TEXT FROM auth.users WHERE email = '${user.email}';`);
    if (existing) {
      ids[user.key] = existing;
      continue;
    }
    const res = await gotrue(stack, "/admin/users", {
      email: user.email,
      password: demoPassword(user.key),
      email_confirm: true,
    });
    if (!res.ok) fail(`criação do usuário fictício ${user.key} falhou (HTTP ${res.status})`);
    ids[user.key] = String(((await res.json()) as { id: string }).id);
  }
  return ids;
}

function seedSql(userIds: Record<string, string>): string {
  const orgRows = Object.values(DEMO.orgs)
    .map((o) => `('${o.id}', '${o.slug}', '${o.name}')`)
    .join(",\n    ");
  const profileRows = DEMO.users
    .map((u) => `('${userIds[u.key]}', '${DEMO.orgs[u.org].id}', '${u.role}', '${u.name}')`)
    .join(",\n    ");
  const waveRows = (["alfa", "beta"] as const)
    .map(
      (k) =>
        `('${DEMO.waves[k].id}', '${DEMO.orgs[k].id}', 'FIB_T', '1.0.0', '${DEMO.waves[k].label}', 'collecting', '2026-04-10T12:00:00Z')`,
    )
    .join(",\n    ");
  const cohortRows = DEMO.cohorts
    .map((c) => `('${c.id}', '${DEMO.orgs[c.org].id}', '${DEMO.waves[c.org].id}', '${c.key}', '${c.label}')`)
    .join(",\n    ");
  let seed = 1;
  const responseRows: string[] = [];
  for (const c of DEMO.cohorts) {
    for (let i = 0; i < c.responses; i++) {
      responseRows.push(
        `('${DEMO.waves[c.org].id}', '${c.id}', 'FIB_T', '1.0.0', '${JSON.stringify(syntheticAnswers(seed++))}'::JSONB, '2026.1', '2026-05-${String(10 + (i % 18)).padStart(2, "0")}T12:00:00Z')`,
      );
    }
  }
  return `BEGIN;
INSERT INTO public.organizations (id, slug, name) VALUES
    ${orgRows}
ON CONFLICT (id) DO NOTHING;
UPDATE public.organizations SET pack_id = 'enterprise'
 WHERE id IN ('${DEMO.orgs.alfa.id}', '${DEMO.orgs.beta.id}')
   AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='organizations' AND column_name='pack_id');
INSERT INTO public.profiles (id, org_id, role, display_name) VALUES
    ${profileRows}
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.waves (id, org_id, instrument, instrument_version, label, status, created_at) VALUES
    ${waveRows}
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.wave_cohorts (id, org_id, wave_id, key, label) VALUES
    ${cohortRows}
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.wave_responses (wave_id, cohort_id, instrument, instrument_version, answers, consent_version, consent_accepted_at) VALUES
    ${responseRows.join(",\n    ")};
COMMIT;`;
}

async function signIn(stack: LocalStack, email: string, password: string): Promise<string> {
  const res = await fetch(`${stack.apiUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: stack.anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) fail(`login local de ${email} falhou (HTTP ${res.status})`);
  return String(((await res.json()) as { access_token: string }).access_token);
}

/** Publicação pelo mecanismo canônico: a RPC, com a identidade do gestor. */
async function publishCanonically(stack: LocalStack): Promise<string[]> {
  const report: string[] = [];
  for (const org of ["alfa", "beta"] as const) {
    const admin = DEMO.users.find((u) => u.org === org && u.role === "RH_ADMIN")!;
    const token = await signIn(stack, admin.email, demoPassword(admin.key));
    for (const cohort of DEMO.cohorts.filter((c) => c.org === org && c.publish)) {
      const res = await fetch(`${stack.apiUrl}/rest/v1/rpc/aggregate_cohort_responses`, {
        method: "POST",
        headers: { apikey: stack.anonKey, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ p_wave_id: DEMO.waves[org].id, p_cohort_id: cohort.id }),
      });
      const rows = (await res.json()) as Array<{ visible: boolean; suppression_reason: string | null }>;
      const row = Array.isArray(rows) ? rows[0] : undefined;
      report.push(`${cohort.label}: ${row?.visible ? "publicada" : `retida (${row?.suppression_reason ?? `HTTP ${res.status}`})`}`);
    }
  }
  return report;
}

function writeEnv(stack: LocalStack): void {
  const lines = [
    "# Gerado por scripts/ivo-local-demo.ts — Supabase LOCAL descartável. Não versionar.",
    "VITALOS_RUNTIME_ENV=local",
    "VITALOS_DB_TARGET=local",
    `SUPABASE_URL=${stack.apiUrl}`,
    `VITE_SUPABASE_URL=${stack.apiUrl}`,
    `SUPABASE_PUBLISHABLE_KEY=${stack.anonKey}`,
    `VITE_SUPABASE_PUBLISHABLE_KEY=${stack.anonKey}`,
    `SUPABASE_SERVICE_ROLE_KEY=${stack.serviceKey}`,
    "VITE_FIBT_PILOT_ENABLED=true",
    "VITALOS_LOCAL_FIXTURE_CAPABILITIES=ACTION_PLAN",
    "VITE_APP_URL=http://localhost:8080",
  ];
  writeFileSync(ENV_FILE, `${lines.join("\n")}\n`);
  writeFileSync(
    USERS_FILE,
    JSON.stringify(
      DEMO.users.map((u) => ({ key: u.key, org: DEMO.orgs[u.org].name, role: u.role, email: u.email, password: demoPassword(u.key) })),
      null,
      2,
    ),
  );
}

export function readDemoEnv(): Record<string, string> {
  if (!existsSync(ENV_FILE)) fail("ambiente local ausente. Rode: bun run demo:ivo:setup");
  return Object.fromEntries(
    readFileSync(ENV_FILE, "utf8")
      .split(/\r?\n/)
      .filter((l) => /^[A-Z_]+=/.test(l))
      .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
  );
}

// ── Comandos ─────────────────────────────────────────────────────────────────

async function setup(): Promise<void> {
  console.log("\nDEMONSTRAÇÃO LOCAL IVO — setup (alvo: Supabase local descartável)\n");
  const docker = await run(["docker", "version", "--format", "{{.Server.Version}}"]);
  if (docker.code !== 0) fail("Docker não está disponível. Inicie o Docker Desktop.");

  mkdirSync(join(WORKDIR, "supabase"), { recursive: true });
  copyFileSync(join(ROOT, "scripts", "ivo-local-demo", "config.toml"), join(WORKDIR, "supabase", "config.toml"));

  let stack = await stackStatus();
  if (!stack) {
    const started = await run([
      "bunx", CLI, "start", "--workdir", WORKDIR,
      "-x", "realtime,storage-api,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor",
    ]);
    if (started.code !== 0) fail(`supabase start falhou: ${started.err.trim().split("\n").slice(-5).join(" | ")}`);
    stack = await stackStatus();
  }
  if (!stack) fail("não foi possível ler o status do stack local.");
  await assertLocalTarget(stack);
  console.log(`  ok   stack local verificado (${stack.apiUrl}, container ${DB_CONTAINER})`);

  await applyLineage();

  const seeded = await scalar(`SELECT COUNT(*)::TEXT FROM public.organizations WHERE id = '${DEMO.orgs.alfa.id}';`);
  const userIds = await ensureUsers(stack);
  if (seeded === "0") {
    const r = await psql(seedSql(userIds));
    if (r.code !== 0) fail(`semeadura falhou: ${r.err.trim().split("\n").slice(0, 6).join(" | ")}`);
    console.log(`  ok   2 organizações fictícias, ${DEMO.users.length} usuários, ${DEMO.cohorts.reduce((s, c) => s + c.responses, 0)} respostas sintéticas`);
    for (const line of await publishCanonically(stack)) console.log(`  ok   publicação canônica — ${line}`);
  } else {
    console.log("  ok   fixtures já semeadas (nada reescrito)");
  }

  writeEnv(stack);
  console.log(`\n  ambiente local gravado em .ivo-demo.local/ (ignorado pelo git)`);
  console.log("  próximo passo: bun run demo:ivo:dev  →  http://localhost:8080/entrar");
  console.log(`  e-mails de acesso (link mágico) chegam no Mailpit local: http://127.0.0.1:55424\n`);
}

async function dev(): Promise<void> {
  const env = readDemoEnv();
  for (const [k, v] of Object.entries(env)) {
    if (k.startsWith("SUPABASE_") || k.startsWith("VITE_SUPABASE_")) {
      if (!isLocalUrl(env.SUPABASE_URL ?? "") || !isLocalUrl(env.VITE_SUPABASE_URL ?? "")) fail("ambiente local aponta para fora da máquina.");
    }
    void v;
  }
  console.log("Subindo o app contra o Supabase LOCAL (Ctrl+C para parar)…");
  const proc = Bun.spawn(["bun", "run", "dev"], { env: { ...process.env, ...env }, stdout: "inherit", stderr: "inherit", stdin: "inherit" });
  process.exit(await proc.exited);
}

async function stop(): Promise<void> {
  const r = await run(["bunx", CLI, "stop", "--workdir", WORKDIR, "--no-backup"]);
  console.log(r.code === 0 ? "Stack local parado e dados descartados." : r.err.trim());
}

function printEnvNames(): void {
  const env = readDemoEnv();
  console.log(Object.keys(env).join("\n"));
}

if (import.meta.main) {
  const command = process.argv[2] ?? "setup";
  if (command === "setup") await setup();
  else if (command === "dev") await dev();
  else if (command === "stop") await stop();
  else if (command === "env") printEnvNames();
  else fail(`comando desconhecido: ${command}. Use setup | dev | stop | env.`);
}
