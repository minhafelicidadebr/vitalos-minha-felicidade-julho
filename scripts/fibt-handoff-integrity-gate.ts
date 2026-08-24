#!/usr/bin/env bun
// FIBT — Handoff Integrity Gate.
//
// Prova barata e local de que o repositório está no estado descrito em
// docs/fibt/FIBT_CLAUDE_ACCOUNT_HANDOFF_2026-08-07.md, para que uma nova
// conta Claude Code possa confiar no handoff sem reauditar o histórico.
//
// Zero acesso a produção. Zero acesso ao Lovable. Só leitura local e os
// testes-alvo já existentes no repositório.

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = join(import.meta.dir, "..");

const EXPECTED = {
  head: "10b5fefb53b75e6d5b2281c52b9d16c44dd0a1f8",
  files3A:
    "supabase/migrations/20260806205000_rewrite_submit_sector_response_without_invite_link.sql",
  fileContract:
    "supabase/migrations/20260806210000_drop_response_invite_link_contract_production.sql",
  fileStagingB: "supabase/migrations/20260730160000_drop_response_invite_link_contract.sql",
  sha3A: "0e561ce1f7221fa4cbf4b696d585a9ace84d47e127b8403bb187598f19e2a805",
  shaContract: "c06ef41b875238e3d9b9dd54dd49d18ff1f1fe2353820ec1605351e9212b11c3",
  bundlePath:
    "C:\\Users\\FIB2030\\Documents\\VitalOS-private-hml-deploy\\ops\\FIBT_D2B_3A_CONTRACT_PRODUCTION_BUNDLE.sql",
  shaBundle: "9c740dfca54f253de30fd21ef61d917b72dc45236cc22f17773d0339e36f035a",
  stagingBAnchor1: "AFETADAS_ESPERADAS CONSTANT INTEGER := 16",
  stagingBAnchor2: "a0000000-0000-0000-0000-000000000001",
};

const CRITICAL_FILES = [
  EXPECTED.files3A,
  EXPECTED.fileContract,
  EXPECTED.fileStagingB,
  "src/lib/fibt/fibt-sector-response-contract.test.ts",
  "src/lib/fibt/fibt-production-contract.test.ts",
  "supabase/migrations.manifest.json",
  "src/domain/instruments/fibt/fibt-instrument.v1.json",
  "src/engine/fibt/fibt-engine.ts",
];

const sha256 = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");
// O manifesto de migrations normaliza CRLF→LF para manter o hash estável
// entre Windows e Linux. O handoff precisa usar a mesma identidade textual;
// hash bruto do arquivo fazia o gate reprovar corretamente versionado em
// worktrees Windows sem qualquer mudança semântica no SQL.
const sha256NormalizedText = (path: string) =>
  createHash("sha256")
    .update(readFileSync(path, "utf8").replace(/\r\n/g, "\n"), "utf8")
    .digest("hex");

const out: Record<string, unknown> = {};
const problems: string[] = [];

// ── 1. Arquivos críticos existem ────────────────────────────────────────
const missing = CRITICAL_FILES.filter((f) => !existsSync(join(ROOT, f)));
out.critical_files_present = missing.length === 0;
if (missing.length > 0) problems.push(`arquivos ausentes: ${missing.join(", ")}`);

// ── 2/3. SHA-256 da 3A e do CONTRACT ────────────────────────────────────
let sha3A: string | null = null;
let shaContract: string | null = null;
try {
  sha3A = sha256NormalizedText(join(ROOT, EXPECTED.files3A));
  out.sha3A_match = sha3A === EXPECTED.sha3A;
  if (!out.sha3A_match)
    problems.push(`SHA da 3A divergiu: esperado ${EXPECTED.sha3A}, observado ${sha3A}`);
} catch {
  out.sha3A_match = false;
  problems.push("não foi possível ler a migration 3A");
}
try {
  shaContract = sha256NormalizedText(join(ROOT, EXPECTED.fileContract));
  out.shaContract_match = shaContract === EXPECTED.shaContract;
  if (!out.shaContract_match)
    problems.push(
      `SHA do CONTRACT divergiu: esperado ${EXPECTED.shaContract}, observado ${shaContract}`,
    );
} catch {
  out.shaContract_match = false;
  problems.push("não foi possível ler o CONTRACT produtivo");
}

// ── 4/5. Bundle privado (se acessível nesta máquina) ────────────────────
if (existsSync(EXPECTED.bundlePath)) {
  const shaBundle = sha256(EXPECTED.bundlePath);
  out.bundle_check = shaBundle === EXPECTED.shaBundle ? "PASS" : "FAIL";
  if (shaBundle !== EXPECTED.shaBundle) {
    problems.push(`SHA do bundle divergiu: esperado ${EXPECTED.shaBundle}, observado ${shaBundle}`);
  }
} else {
  out.bundle_check = "SKIPPED";
  out.bundle_check_reason =
    "bundle privado não acessível nesta máquina/sessão — não é falha de integridade do repositório";
}

// ── 6. CONTRACT continua sem CASCADE ────────────────────────────────────
if (shaContract) {
  const contractSql = readFileSync(join(ROOT, EXPECTED.fileContract), "utf8");
  const exec = contractSql
    .split("\n")
    .filter((l) => !/^\s*--/.test(l))
    .join("\n")
    .replace(/'(?:[^']|'')*'/g, "''");
  out.contract_no_cascade = !/\bCASCADE\b/i.test(exec);
  if (!out.contract_no_cascade) problems.push("CONTRACT contém CASCADE executável");
}

// ── 7. 3A vem antes do CONTRACT (por nome de arquivo = por timestamp) ──
out.order_3a_before_contract = EXPECTED.files3A < EXPECTED.fileContract;
if (!out.order_3a_before_contract)
  problems.push("3A não ordena antes do CONTRACT pelo nome do arquivo");

// ── 8. Nenhuma referência NOVA e inesperada a invite_token em runtime ──
const RUNTIME_FILES = [
  "src/lib/cloud/db-adapter.ts",
  "src/lib/survey/response-capture.server.ts",
  "src/lib/survey/sector-link.server.ts",
  "src/lib/api/survey.functions.ts",
  "src/lib/api/fibt-cohort.functions.ts",
  "src/routes/convite.$token.tsx",
];
const referenciaColuna = /(?<!p_)\binvite_token\b/;
const runtimeOffenders: string[] = [];
for (const f of RUNTIME_FILES) {
  const p = join(ROOT, f);
  if (!existsSync(p)) continue;
  const semComentario = readFileSync(p, "utf8")
    .split("\n")
    .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
    .join("\n");
  if (referenciaColuna.test(semComentario)) runtimeOffenders.push(f);
}
out.runtime_invite_link_references = runtimeOffenders.length;
if (runtimeOffenders.length > 0)
  problems.push(`referência inesperada a invite_token em: ${runtimeOffenders.join(", ")}`);

// ── 9. Migration B de staging permanece distinta e intocada ────────────
const stagingBPath = join(ROOT, EXPECTED.fileStagingB);
if (existsSync(stagingBPath)) {
  const stagingSql = readFileSync(stagingBPath, "utf8");
  out.staging_migration_b_intact =
    stagingSql.includes(EXPECTED.stagingBAnchor1) && stagingSql.includes(EXPECTED.stagingBAnchor2);
  if (!out.staging_migration_b_intact)
    problems.push("Migration B de staging perdeu seus valores fixos — pode ter sido editada");
} else {
  out.staging_migration_b_intact = false;
  problems.push("Migration B de staging não encontrada");
}

// ── 10. Manifest integrity + testes-alvo ────────────────────────────────
function run(cmd: string[]) {
  const r = spawnSync(cmd[0]!, cmd.slice(1), { cwd: ROOT, encoding: "utf8", shell: true });
  return { status: r.status, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

const testTargets = [
  "src/lib/fibt/fibt-sector-response-contract.test.ts",
  "src/lib/fibt/fibt-production-contract.test.ts",
  "src/lib/schema-parity/migration-manifest.test.ts",
];
const testRun = run(["bun", "test", ...testTargets]);
const testOut = testRun.stdout + testRun.stderr;
const passMatch = testOut.match(/(\d+)\s+pass/);
const failMatch = testOut.match(/(\d+)\s+fail/);
out.manifest_ok = !/\(fail\).*manifesto/i.test(testOut);
out.targeted_tests = `${passMatch?.[1] ?? "?"} pass / ${failMatch?.[1] ?? "?"} fail`;
if (testRun.status !== 0) problems.push(`testes-alvo falharam: ${out.targeted_tests}`);

const tscRun = run(["bunx", "tsc", "--noEmit"]);
out.tsc = tscRun.status === 0 ? "exit 0" : `exit ${tscRun.status} — ${tscRun.stdout.slice(0, 500)}`;
if (tscRun.status !== 0) problems.push("tsc não está limpo");

// ── Veredito ─────────────────────────────────────────────────────────────
out.critical_hashes_match = out.sha3A_match === true && out.shaContract_match === true;
out.repository_match = out.critical_files_present === true && out.order_3a_before_contract === true;

const gatePass =
  out.critical_files_present === true &&
  out.sha3A_match === true &&
  out.shaContract_match === true &&
  out.bundle_check !== "FAIL" &&
  out.contract_no_cascade === true &&
  out.order_3a_before_contract === true &&
  out.runtime_invite_link_references === 0 &&
  out.staging_migration_b_intact === true &&
  out.manifest_ok === true &&
  testRun.status === 0 &&
  tscRun.status === 0;

console.log(
  JSON.stringify(
    {
      HANDOFF_INTEGRITY_GATE: gatePass ? "PASS" : "FAIL",
      REPOSITORY_MATCH: out.repository_match,
      CRITICAL_HASHES_MATCH: out.critical_hashes_match,
      MANIFEST_OK: out.manifest_ok,
      TARGETED_TESTS: out.targeted_tests,
      TSC: out.tsc,
      BUNDLE_CHECK: out.bundle_check,
      details: out,
      problems,
    },
    null,
    2,
  ),
);

process.exit(gatePass ? 0 : 1);
