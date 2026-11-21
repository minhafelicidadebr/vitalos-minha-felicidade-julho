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
//   upgrade Atualiza um stack local JÁ EXISTENTE (schema da R6) aplicando a migration
//          do protocolo de eficácia C8 — só nesse banco local descartável.
//   dev    Sobe o app (bun run dev) apontando para o Supabase local, com a
//          capability ACTION_PLAN ligada SÓ como fixture local controlada e,
//          por padrão, a governança D9 de TESTE SINTÉTICO (parecer conclusivo
//          identificado como teste; desligue com VITALOS_IVO_TEST_GOVERNANCE=off).
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

const ROOT = process.cwd();
const WORKDIR = join(ROOT, ".ivo-demo.local");
const PROJECT_ID = "vitalos-ivo-local";
const DB_CONTAINER = `supabase_db_${PROJECT_ID}`;
const CLI = "supabase@2.119.0";
const ENV_FILE = join(WORKDIR, "demo.env");
const USERS_FILE = join(WORKDIR, "demo-users.json");
const MANIFEST_FILE = join(WORKDIR, "demo-manifest.json");

/** Mesmas exclusões declaradas do replay (linhagem de produção). */
const STAGING_ONLY = new Set(["20260730160000_drop_response_invite_link_contract.sql"]);
const NAO_EXECUTAVEIS = new Set(["20260806210000_drop_response_invite_link_contract_production.sql"]);

// ── Usuários de teste da demonstração local ─────────────────────────────────
// Organizações, onda, setores e respostas vêm de scripts/ivo-provision-fictitious-orgs.ts
// (mesmos mecanismos do produto usados no runbook de staging); IDs gerados ficam em
// .ivo-demo.local/demo-manifest.json.
export const DEMO = {
  orgs: {
    alfa: { name: "Organização Fictícia Alfa" },
    beta: { name: "Organização Fictícia Beta" },
  },
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

function demoPassword(key: string): string {
  return `demo-local-${key}-2026`;
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

  // Fixtures pelo MESMO provisionamento que o runbook usa em staging
  // (mecanismos do produto: convite de organização, convite de membro,
  // onda setorial, links, respostas pela captura, publicação com JWT do admin).
  writeEnv(stack);
  for (const [k, v] of Object.entries(readDemoEnv())) process.env[k] = v;
  const { provisionFictitiousIvoOrgs, LOCAL_FIXTURE_EMAILS } = await import("./ivo-provision-fictitious-orgs");
  const passwords = Object.fromEntries(DEMO.users.map((u) => [u.email, demoPassword(u.key)]));
  const manifest = await provisionFictitiousIvoOrgs({
    target: "local",
    apiUrl: stack.apiUrl,
    publishableKey: stack.anonKey,
    emails: LOCAL_FIXTURE_EMAILS,
    passwords,
    log: (line) => console.log(line.replace(/^ {2}ok {3}/, "  ok   ")),
  });
  writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2));
  console.log(`\n  ambiente local gravado em .ivo-demo.local/ (ignorado pelo git)`);
  console.log("  próximo passo: bun run demo:ivo:dev  →  http://localhost:8080/entrar");
  console.log(`  e-mails de acesso (link mágico) chegam no Mailpit local: http://127.0.0.1:55424\n`);
}

const C8_MIGRATION = "20261005120000_ivo_efficacy_protocols.sql";
const PI13_MIGRATION = "20261016120000_ivo_plan_composition_and_closure.sql";
/**
 * Atualização a partir do schema local anterior: aplica, em ordem, as migrations que ainda
 * faltam (C8 e PI-13). Ambas são idempotentes; a checagem de presença só evita ruído.
 */
async function upgrade(): Promise<void> {
  console.log("\nDEMONSTRAÇÃO LOCAL IVO — upgrade (alvo: Supabase local descartável)\n");
  const stack = await stackStatus();
  if (!stack) fail("stack local não está rodando. Rode: bun run demo:ivo:setup");
  await assertLocalTarget(stack);
  const steps: Array<{ name: string; presentSql: string; label: string }> = [
    { name: C8_MIGRATION, presentSql: "SELECT (to_regclass('public.efficacy_protocols') IS NOT NULL)::TEXT;", label: "protocolos de eficácia (C8)" },
    {
      name: PI13_MIGRATION,
      presentSql: "SELECT (to_regnamespace('ivo_ledger') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='action_plans' AND column_name='closed_at'))::TEXT;",
      label: "inclusão de ação e encerramento de plano (PI-13)",
    },
  ];
  for (const step of steps) {
    if ((await scalar(step.presentSql)) === "true") {
      console.log(`  ok   ${step.label} já presente neste stack local (nada reaplicado)`);
      continue;
    }
    const r = await psql(readFileSync(join(ROOT, "supabase", "migrations", step.name), "utf8"));
    if (r.code !== 0) fail(`migration ${step.name}: ${r.err.trim().split("\n").slice(0, 6).join(" | ")}`);
    console.log(`  ok   migration ${step.name} aplicada sobre o schema local anterior`);
  }
}
async function dev(): Promise<void> {
  const env = readDemoEnv();
  // Governança D9 de TESTE: só vale em runtime local descartável (checado no servidor).
  const d9 = process.env.VITALOS_IVO_TEST_GOVERNANCE ?? "D9_APROVADO_SINTETICO";
  if (d9 !== "off") env.VITALOS_IVO_TEST_GOVERNANCE = d9;
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
  else if (command === "upgrade") await upgrade();
  else if (command === "dev") await dev();
  else if (command === "stop") await stop();
  else if (command === "env") printEnvNames();
  else fail(`comando desconhecido: ${command}. Use setup | upgrade | dev | stop | env.`);
}
