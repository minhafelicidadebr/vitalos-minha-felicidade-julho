#!/usr/bin/env bun
/**
 * PROD-0.6C — guardrails anti-produção da prova não produtiva.
 *
 * Roda ANTES de qualquer conexão. Aborta o job se detectar credencial,
 * alvo remoto, ou input de disparo divergente. Sem fallback: ausência de
 * variável obrigatória aborta, nunca aciona valor padrão.
 *
 * NÃO imprime valores — apenas o NOME da variável ofensora.
 *
 * Uso: bun run scripts/fibt-proof/guardrails.ts
 */

const EXPECTED = {
  proof_target: "LOCAL_PG17_ONLY",
  acknowledgement: "I_CONFIRM_NONPROD_EPHEMERAL_PG17",
} as const;

const PRODUCTION_REF = "shlmzzchddohaytfakol";
const PRODUCTION_PREFIX = "shlm";

/** Variáveis que NÃO podem existir no job — a presença de qualquer uma aborta. */
const FORBIDDEN_NAMES = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "DATABASE_URL",
  "POSTGRES_URL",
  "LOVABLE_TOKEN",
  "LOVABLE_API_KEY",
  "VITALOS_STAGING_PROJECT_REF",
  "ACTIONS_ID_TOKEN_REQUEST_TOKEN",
  "ACTIONS_ID_TOKEN_REQUEST_URL",
];

/** Padrões que não podem aparecer em NENHUM valor de variável de ambiente. */
const FORBIDDEN_PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: "project_ref produtivo", re: new RegExp(PRODUCTION_REF, "i") },
  { name: "prefixo produtivo", re: new RegExp(`\\b${PRODUCTION_PREFIX}[a-z0-9]{8,}`, "i") },
  { name: "domínio Supabase", re: /\.supabase\.(co|in|net)/i },
  { name: "JWT", re: /\beyJ[A-Za-z0-9_-]{10,}/ },
  { name: "chave sb_secret", re: /\bsb_secret_[A-Za-z0-9_-]{8,}/ },
  { name: "chave sb_publishable", re: /\bsb_publishable_[A-Za-z0-9_-]{8,}/ },
  { name: "token sbp_", re: /\bsbp_[A-Za-z0-9]{8,}/ },
];

const failures: string[] = [];
const checks: string[] = [];

function fail(msg: string) {
  failures.push(msg);
}
function ok(msg: string) {
  checks.push(msg);
}

// --- 1. Inputs obrigatórios, sem fallback ----------------------------------
for (const [key, expected] of Object.entries(EXPECTED)) {
  const actual = process.env[`INPUT_${key.toUpperCase()}`];
  if (actual === undefined || actual === "") {
    fail(`input obrigatório ausente: ${key}`);
  } else if (actual !== expected) {
    fail(`input ${key} divergente do valor único permitido`);
  } else {
    ok(`input ${key} = ${expected}`);
  }
}

const sourceCommit = process.env.INPUT_SOURCE_COMMIT;
const checkoutSha = process.env.GITHUB_SHA;
if (!sourceCommit) {
  fail("input obrigatório ausente: source_commit");
} else if (!/^[0-9a-f]{40}$/.test(sourceCommit)) {
  fail("source_commit não é SHA integral de 40 hex");
} else if (!checkoutSha) {
  fail("GITHUB_SHA ausente — não é possível comparar com source_commit");
} else if (sourceCommit !== checkoutSha) {
  fail("source_commit não corresponde ao checkout");
} else {
  ok(`source_commit corresponde ao checkout (${sourceCommit.slice(0, 7)})`);
}

// --- 2. Variáveis proibidas por nome ---------------------------------------
for (const name of FORBIDDEN_NAMES) {
  if (process.env[name] !== undefined && process.env[name] !== "") {
    fail(`variável proibida presente: ${name}`);
  }
}
ok(`nenhuma das ${FORBIDDEN_NAMES.length} variáveis proibidas está presente`);

// --- 3. Padrões proibidos em qualquer valor --------------------------------
for (const [name, value] of Object.entries(process.env)) {
  if (typeof value !== "string" || value === "") continue;
  for (const { name: label, re } of FORBIDDEN_PATTERNS) {
    if (re.test(value)) fail(`padrão proibido (${label}) no valor de ${name}`);
  }
}
ok("nenhum padrão de credencial ou identificador remoto nos valores de ambiente");

// --- 4. Alvo obrigatoriamente local ----------------------------------------
const host = process.env.PGHOST;
if (!host) {
  fail("PGHOST ausente — sem fallback para alvo padrão");
} else if (host !== "127.0.0.1" && host !== "localhost") {
  fail("PGHOST não é 127.0.0.1 nem localhost");
} else {
  ok(`PGHOST = ${host}`);
}

// --- 5. Sem OIDC -----------------------------------------------------------
if (process.env.ACTIONS_ID_TOKEN_REQUEST_URL) fail("token OIDC disponível ao job");
else ok("nenhum token OIDC disponível");

// --- Resultado -------------------------------------------------------------
console.log("=== GUARDRAILS ANTI-PRODUÇÃO ===");
for (const c of checks) console.log(`  OK    ${c}`);
for (const f of failures) console.log(`  ABORT ${f}`);

if (failures.length > 0) {
  console.error(`\nGUARDRAIL_ABORT: ${failures.length} violação(ões). O harness NÃO será inicializado.`);
  process.exit(1);
}
console.log("\nGUARDRAILS_PASSED — alvo local, sem credencial, inputs conferidos.");
