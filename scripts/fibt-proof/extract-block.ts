#!/usr/bin/env bun
/**
 * PROD-0.6C — extrator determinístico multibloco do draft não executável.
 *
 * Contrato EXPLICIT_MULTIPLE_EXECUTABLE_BLOCKS (PROD06_NONPROD_PROOF_PLAN.md):
 * 13 blocos explícitos B001–B013, delimitados por marcadores exatos
 * `-- FIBT_PROD_B_EXEC_BLOCK_BEGIN:Bnnn` / `-- FIBT_PROD_B_EXEC_BLOCK_END:Bnnn`.
 * Substitui o contrato de par único (FIBT_PROD_B_SQL_BLOCK_* / FIBT_PROD_B_ACL_BLOCK_*)
 * usado antes da PROD-0.6B — sem fallback para ele.
 *
 * NÃO executa SQL. Apenas lê o `.sql.disabled`, valida e escreve em RUNNER_TEMP.
 *
 * A lógica de validação/extração vive em `runExtraction()`, pura (recebe o
 * texto-fonte, devolve o resultado ou lança `ExtractionError`) — testável sem
 * tocar o arquivo real. O bloco de execução no fim do arquivo é só a casca
 * CLI: lê o arquivo, chama `runExtraction`, grava em RUNNER_TEMP, imprime JSON.
 *
 * Uso: bun run scripts/fibt-proof/extract-block.ts <GROUP> <OUT_PATH>
 *   GROUP: TRANSACTION | ACL_EVIDENCE
 */

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

export const SOURCE_FILE = "docs/fibt-prod/MIGRATION_B_PRODUCTION_DRAFT.sql.disabled";

export const EXPECTED_BLOCK_COUNT = 13;
export const ALL_BLOCK_IDS = Array.from({ length: EXPECTED_BLOCK_COUNT }, (_, i) => `B${String(i + 1).padStart(3, "0")}`);
export const TRANSACTION_BLOCK_IDS = ALL_BLOCK_IDS.slice(0, 11); // B001–B011
export const ACL_EVIDENCE_BLOCK_IDS = ALL_BLOCK_IDS.slice(11); // B012–B013
const REQUIRED_FUNCTION_BLOCK_ID = "B007";
const PRECONDITION_BLOCK_IDS = ["B004", "B005", "B006"];
const DDL_BLOCK_IDS = ["B007", "B008", "B009"];
const POSTCHECK_BLOCK_ID = "B010";

// Hashes congelados do contrato canônico incorporado à main pelo merge do
// PR #38 (commit 843f467). Divergência de qualquer um deles significa que o
// draft mudou desde o congelamento — o harness aborta, não recalcula em silêncio.
export const EXPECTED_B007_SHA256 = "1ef02de2aece306e7432d2c2d9d4a51bd88457043c2f3b5f3d9f3f960fced2c4";
export const EXPECTED_TRANSACTION_SHA256 = "127979ac95d2da9ffd4d7c4f792c4d13107a76a75f810f478badf851852a9075";
export const EXPECTED_ALL_BLOCKS_SHA256 = "6ba7417cef647c6483269835095f07205b91cdbb84e3af9809aad657b2670d30";

const REQUIRED_FUNCTION_SIGNATURE = "CREATE OR REPLACE FUNCTION public.submit_sector_response(";
const FORBIDDEN_INVITE_TOKEN_INSERT = /INSERT\s+INTO\s+(?:public\.)?wave_responses[^;]*\binvite_token\b/i;
const GRANT_OR_REVOKE = /\bGRANT\b|\bREVOKE\b/i;
const LEGACY_MARKER = /FIBT_PROD_B_(?:SQL|ACL)_BLOCK_(?:BEGIN|END)/;
const MARKER_RE = /^-- FIBT_PROD_B_EXEC_BLOCK_(BEGIN|END):(B\d+)$/;

export class ExtractionError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "ExtractionError";
  }
}

function fail(code: string, msg: string): never {
  throw new ExtractionError(code, msg);
}

function sha256(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

export interface BlockInfo {
  id: string;
  startLine: number;
  endLine: number;
  lineCount: number;
  sourceSha256: string;
  extractedSha256: string;
}

export interface ExtractionResult {
  sourceSha256: string;
  observedBlockCount: number;
  observedBlockIds: string[];
  blocks: BlockInfo[];
  transactionSql: string;
  aclEvidenceSql: string;
  allBlocksSql: string;
  aggregateTransactionSha256: string;
  aggregateAclEvidenceSha256: string;
  aggregateAllBlocksSha256: string;
  b007FunctionSha256: string;
  b012Sha256: string;
  b013Sha256: string;
  e18: {
    functionBodyPresent: boolean;
    exactlyOneCreateOrReplace: boolean;
    hashMatchesCanonical: boolean;
    noInviteTokenResidual: boolean;
    noGrantOrRevoke: boolean;
    result: "PASS";
  };
  invariants: Record<string, boolean>;
  rejectedLines: number;
  correspondenceProven: true;
}

/**
 * Valida e extrai o draft multibloco inteiro. Pura: recebe o texto-fonte
 * (working tree, pode ter CRLF) e devolve o resultado, ou lança
 * `ExtractionError` na primeira violação do contrato. Não faz I/O.
 */
export function runExtraction(rawSource: string): ExtractionResult {
  // --- normaliza CRLF -> LF ---------------------------------------------------
  // core.autocrlf=true torna o working tree Windows divergente do blob Git; o
  // runner Linux vê o blob (LF). Hashes sempre sobre o conteúdo normalizado.
  const raw = rawSource.replace(/\r\n/g, "\n");
  const sourceSha256 = sha256(raw);
  const lines = raw.split("\n");

  // --- nenhuma linha do arquivo inteiro pode estar descomentada -------------
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]!;
    if (l === "" || l.trim() === "") continue;
    if (l === "--") continue;
    if (l.startsWith("-- ")) continue;
    fail("UNCOMMENTED_SOURCE_LINE", `linha ${i + 1} do arquivo-fonte não está comentada: ${JSON.stringify(l.slice(0, 60))}`);
  }

  // --- rejeitar qualquer resquício do contrato legado de par único ----------
  for (let i = 0; i < lines.length; i++) {
    if (LEGACY_MARKER.test(lines[i]!)) {
      fail("LEGACY_MARKER_PRESENT", `marcador do contrato de par único encontrado na linha ${i + 1} — contrato atual é EXPLICIT_MULTIPLE_EXECUTABLE_BLOCKS (13 blocos), sem fallback`);
    }
  }

  // --- localizar todos os marcadores multibloco -----------------------------
  interface Marker { kind: "BEGIN" | "END"; id: string; line: number }
  const markers: Marker[] = [];
  lines.forEach((l, i) => {
    const m = MARKER_RE.exec(l);
    if (m) markers.push({ kind: m[1] as "BEGIN" | "END", id: m[2]!, line: i });
  });

  const beginsById = new Map<string, number[]>();
  const endsById = new Map<string, number[]>();
  for (const m of markers) {
    const map = m.kind === "BEGIN" ? beginsById : endsById;
    map.set(m.id, [...(map.get(m.id) ?? []), m.line]);
  }

  const observedIds = Array.from(new Set(markers.map((m) => m.id))).sort();
  if (observedIds.length !== EXPECTED_BLOCK_COUNT) {
    fail("BLOCK_COUNT", `esperado ${EXPECTED_BLOCK_COUNT} blocos, encontrados ${observedIds.length}: [${observedIds.join(", ")}]`);
  }
  for (const id of observedIds) {
    if (!ALL_BLOCK_IDS.includes(id)) fail("UNEXPECTED_BLOCK_ID", `ID de bloco fora do contrato B001–B013: ${id}`);
  }
  for (const id of ALL_BLOCK_IDS) {
    if (!beginsById.has(id)) fail("MISSING_BEGIN", `marcador inicial ausente para ${id}`);
    if (!endsById.has(id)) fail("MISSING_END", `marcador final ausente para ${id}`);
    if (beginsById.get(id)!.length > 1) fail("DUPLICATE_BEGIN", `marcador inicial duplicado para ${id}`);
    if (endsById.get(id)!.length > 1) fail("DUPLICATE_END", `marcador final duplicado para ${id}`);
  }

  // --- sequência B001..B013, sem lacuna, sem aninhamento, sem bloco vazio ---
  interface BlockSpan { id: string; begin: number; end: number }
  const spans: BlockSpan[] = ALL_BLOCK_IDS.map((id) => {
    const begin = beginsById.get(id)![0]!;
    const end = endsById.get(id)![0]!;
    if (end <= begin) fail("INVERTED_ORDER", `marcador final de ${id} não é posterior ao inicial`);
    if (end - begin === 1) fail("EMPTY_BLOCK", `bloco ${id} está vazio`);
    return { id, begin, end };
  });
  for (let i = 1; i < spans.length; i++) {
    if (spans[i]!.begin <= spans[i - 1]!.end) {
      fail("NESTED_OR_OUT_OF_ORDER", `${spans[i]!.id} começa antes do fim de ${spans[i - 1]!.id} — aninhamento ou ordem invertida`);
    }
  }

  // --- extrair e stripar cada bloco, com prova de correspondência byte a byte
  type Origin = "blank" | "bare" | "prefixed";
  interface ExtractedBlock extends BlockInfo { strippedLines: string[] }

  let totalRejected = 0;
  function extractBlock(span: BlockSpan): ExtractedBlock {
    const rawLines = lines.slice(span.begin + 1, span.end);
    const strippedLines: string[] = [];
    const origins: Origin[] = [];

    for (let i = 0; i < rawLines.length; i++) {
      const l = rawLines[i]!;
      if (l === "") {
        strippedLines.push("");
        origins.push("blank");
      } else if (l === "--") {
        strippedLines.push("");
        origins.push("bare");
      } else if (l.startsWith("-- ")) {
        strippedLines.push(l.slice(3));
        origins.push("prefixed");
      } else {
        totalRejected++;
        fail("MALFORMED_LINE", `${span.id} linha ${span.begin + 2 + i} em formato inesperado: ${JSON.stringify(l.slice(0, 60))}`);
      }
    }

    // Prova de correspondência: reconstrói o bloco original a partir da saída
    // + origem de cada linha e compara byte a byte. Distingue linha em branco
    // de "--" solto (mesma saída vazia, origem diferente) para que a prova
    // não seja ambígua.
    const roundTrip = strippedLines
      .map((l, i) => (origins[i] === "blank" ? "" : origins[i] === "bare" ? "--" : `-- ${l}`))
      .join("\n");
    if (roundTrip !== rawLines.join("\n")) {
      fail("CORRESPONDENCE_FAILED", `bloco ${span.id} extraído não corresponde byte a byte ao documentado`);
    }

    return {
      id: span.id,
      startLine: span.begin + 2,
      endLine: span.end,
      lineCount: rawLines.length,
      strippedLines,
      sourceSha256: sha256(rawLines.join("\n")),
      extractedSha256: sha256(strippedLines.join("\n") + "\n"),
    };
  }

  const extracted = new Map(spans.map((span) => [span.id, extractBlock(span)]));

  function concatGroup(ids: string[]): string {
    return ids.map((id) => extracted.get(id)!.strippedLines.join("\n") + "\n").join("");
  }

  const transactionSql = concatGroup(TRANSACTION_BLOCK_IDS);
  const aclEvidenceSql = concatGroup(ACL_EVIDENCE_BLOCK_IDS);
  const allBlocksSql = concatGroup(ALL_BLOCK_IDS);

  const aggregateTransactionSha256 = sha256(transactionSql);
  const aggregateAclEvidenceSha256 = sha256(aclEvidenceSql);
  const aggregateAllBlocksSha256 = sha256(allBlocksSql);
  const b012Sha256 = extracted.get("B012")!.extractedSha256;
  const b013Sha256 = extracted.get("B013")!.extractedSha256;
  const b007 = extracted.get(REQUIRED_FUNCTION_BLOCK_ID)!;
  const b007Sql = b007.strippedLines.join("\n");

  // --- E18 — REQUIRED_FUNCTION_BODY_PRESENT ---------------------------------
  // B007 precede B008 (DROP CONSTRAINT/COLUMN) por construção: a checagem de
  // sequência acima já rejeita qualquer arquivo em que B007 apareça depois.
  const functionBodyPresent = b007Sql.includes(REQUIRED_FUNCTION_SIGNATURE);
  if (!functionBodyPresent) {
    fail("E18_FUNCTION_BODY_MISSING", `${REQUIRED_FUNCTION_BLOCK_ID} não contém "${REQUIRED_FUNCTION_SIGNATURE}"`);
  }
  const createOrReplaceCount = (b007Sql.match(/CREATE OR REPLACE FUNCTION/g) ?? []).length;
  if (createOrReplaceCount !== 1) {
    fail("E18_NOT_EXACTLY_ONE", `esperado exatamente um CREATE OR REPLACE em ${REQUIRED_FUNCTION_BLOCK_ID}, encontrado ${createOrReplaceCount}`);
  }
  if (FORBIDDEN_INVITE_TOKEN_INSERT.test(b007Sql)) {
    fail("E18_INVITE_TOKEN_RESIDUAL", `${REQUIRED_FUNCTION_BLOCK_ID} ainda insere wave_responses.invite_token`);
  }
  if (GRANT_OR_REVOKE.test(b007Sql)) {
    fail("E18_GRANT_OR_REVOKE_PRESENT", `${REQUIRED_FUNCTION_BLOCK_ID} contém GRANT ou REVOKE — a trilha ACL é separada por decisão de SPEC §H`);
  }

  // --- invariantes estáticos sobre a transação B001–B011 --------------------
  const nonEmptyTxnLines = transactionSql.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  const firstStatementIsBegin = nonEmptyTxnLines[0] === "BEGIN;";
  const lastStatementIsCommit = nonEmptyTxnLines.at(-1) === "COMMIT;";
  const beginCount = nonEmptyTxnLines.filter((l) => l === "BEGIN;").length;
  const commitCount = nonEmptyTxnLines.filter((l) => l === "COMMIT;").length;
  const noRollback = !/\bROLLBACK\b/i.test(transactionSql);
  const preconditionsEnd = Math.max(...PRECONDITION_BLOCK_IDS.map((id) => spans.find((s) => s.id === id)!.end));
  const firstDdlBegin = Math.min(...DDL_BLOCK_IDS.map((id) => spans.find((s) => s.id === id)!.begin));
  const lastDdlEnd = Math.max(...DDL_BLOCK_IDS.map((id) => spans.find((s) => s.id === id)!.end));
  const postcheckBegin = spans.find((s) => s.id === POSTCHECK_BLOCK_ID)!.begin;
  const b008Sql = extracted.get("B008")!.strippedLines.join("\n");
  const dropConstraintIdx = b008Sql.indexOf("DROP CONSTRAINT");
  const dropColumnIdx = b008Sql.indexOf("DROP COLUMN");

  const invariants: Record<string, boolean> = {
    first_statement_is_begin: firstStatementIsBegin,
    last_statement_is_commit: lastStatementIsCommit,
    exactly_one_begin: beginCount === 1,
    exactly_one_commit: commitCount === 1,
    no_intermediate_commit: commitCount === 1 && lastStatementIsCommit,
    no_rollback: noRollback,
    set_local_inside_transaction: TRANSACTION_BLOCK_IDS.includes("B002"),
    preconditions_before_first_ddl: preconditionsEnd < firstDdlBegin,
    b007_before_drop_constraint: spans.find((s) => s.id === "B007")!.end < spans.find((s) => s.id === "B008")!.begin,
    drop_constraint_before_drop_column: dropConstraintIdx !== -1 && dropColumnIdx !== -1 && dropConstraintIdx < dropColumnIdx,
    postchecks_after_ddl: postcheckBegin > lastDdlEnd,
    acl_evidence_outside_transaction: !ACL_EVIDENCE_BLOCK_IDS.some((id) => TRANSACTION_BLOCK_IDS.includes(id)),
    no_executable_fragment_omitted: functionBodyPresent && createOrReplaceCount === 1,
  };

  for (const [name, ok] of Object.entries(invariants)) {
    if (!ok) fail("INVARIANT_FAILED", `invariante transacional falhou: ${name}`);
  }

  // --- divergência de qualquer conteúdo em relação ao congelado ---------------
  // Verificado por último, depois de toda checagem estrutural/de conteúdo:
  // um defeito estrutural é mais informativo que "também não bate o hash".
  if (b007.extractedSha256 !== EXPECTED_B007_SHA256) {
    fail("E18_HASH_DIVERGENT", `hash de ${REQUIRED_FUNCTION_BLOCK_ID} (${b007.extractedSha256}) diverge do congelado (${EXPECTED_B007_SHA256})`);
  }
  if (aggregateTransactionSha256 !== EXPECTED_TRANSACTION_SHA256) {
    fail("TRANSACTION_HASH_DIVERGENT", `hash da transação B001–B011 (${aggregateTransactionSha256}) diverge do congelado (${EXPECTED_TRANSACTION_SHA256})`);
  }
  if (aggregateAllBlocksSha256 !== EXPECTED_ALL_BLOCKS_SHA256) {
    fail("AGGREGATE_HASH_DIVERGENT", `hash agregado B001–B013 (${aggregateAllBlocksSha256}) diverge do congelado (${EXPECTED_ALL_BLOCKS_SHA256})`);
  }

  return {
    sourceSha256,
    observedBlockCount: observedIds.length,
    observedBlockIds: observedIds,
    blocks: spans.map((s) => {
      const b = extracted.get(s.id)!;
      return { id: b.id, startLine: b.startLine, endLine: b.endLine, lineCount: b.lineCount, sourceSha256: b.sourceSha256, extractedSha256: b.extractedSha256 };
    }),
    transactionSql,
    aclEvidenceSql,
    allBlocksSql,
    aggregateTransactionSha256,
    aggregateAclEvidenceSha256,
    aggregateAllBlocksSha256,
    b007FunctionSha256: b007.extractedSha256,
    b012Sha256,
    b013Sha256,
    e18: {
      functionBodyPresent,
      exactlyOneCreateOrReplace: createOrReplaceCount === 1,
      hashMatchesCanonical: b007.extractedSha256 === EXPECTED_B007_SHA256,
      noInviteTokenResidual: !FORBIDDEN_INVITE_TOKEN_INSERT.test(b007Sql),
      noGrantOrRevoke: !GRANT_OR_REVOKE.test(b007Sql),
      result: "PASS",
    },
    invariants,
    rejectedLines: totalRejected,
    correspondenceProven: true,
  };
}

// ============================================================================
// Casca CLI — só roda quando o arquivo é executado diretamente, nunca em
// import (evita I/O ao carregar o módulo em testes).
// ============================================================================
if (import.meta.main) {
  const group = (process.argv[2] ?? "").toUpperCase();
  const outPath = process.argv[3];

  function die(code: string, msg: string): never {
    console.error(`EXTRACTION_ABORTED (${code}): ${msg}`);
    process.exit(1);
  }

  if (group !== "TRANSACTION" && group !== "ACL_EVIDENCE") die("GROUP", "GROUP deve ser TRANSACTION ou ACL_EVIDENCE");
  if (!outPath) die("OUT_PATH", "OUT_PATH obrigatório");

  const runnerTemp = process.env.RUNNER_TEMP;
  if (!runnerTemp) die("RUNNER_TEMP", "RUNNER_TEMP não definido — sem fallback");
  if (!outPath!.startsWith(runnerTemp)) die("RUNNER_TEMP", `OUT_PATH fora de RUNNER_TEMP: ${outPath}`);

  let result: ExtractionResult;
  try {
    result = runExtraction(readFileSync(SOURCE_FILE, "utf8"));
  } catch (e) {
    if (e instanceof ExtractionError) die(e.code, e.message);
    throw e;
  }

  const sqlToWrite = group === "TRANSACTION" ? result.transactionSql : result.aclEvidenceSql;
  writeFileSync(outPath!, sqlToWrite, "utf8");

  console.log(
    JSON.stringify(
      {
        source_file: SOURCE_FILE,
        group,
        source_sha256: result.sourceSha256,
        expected_block_count: EXPECTED_BLOCK_COUNT,
        observed_block_count: result.observedBlockCount,
        block_ids_expected: ALL_BLOCK_IDS,
        block_ids_observed: result.observedBlockIds,
        blocks: result.blocks.map((b) => ({
          id: b.id,
          start_line: b.startLine,
          end_line: b.endLine,
          line_count: b.lineCount,
          source_sha256: b.sourceSha256,
          extracted_sha256: b.extractedSha256,
        })),
        aggregate_transaction_sha256: result.aggregateTransactionSha256,
        aggregate_acl_evidence_sha256: result.aggregateAclEvidenceSha256,
        aggregate_all_blocks_sha256: result.aggregateAllBlocksSha256,
        b007_function_sha256: result.b007FunctionSha256,
        b012_sha256: result.b012Sha256,
        b013_sha256: result.b013Sha256,
        e18: {
          function_body_present: result.e18.functionBodyPresent,
          exactly_one_create_or_replace: result.e18.exactlyOneCreateOrReplace,
          hash_matches_canonical: result.e18.hashMatchesCanonical,
          no_invite_token_residual: result.e18.noInviteTokenResidual,
          no_grant_or_revoke: result.e18.noGrantOrRevoke,
          result: result.e18.result,
        },
        invariants: result.invariants,
        rejected_lines: result.rejectedLines,
        correspondence_proven: result.correspondenceProven,
        out_path: outPath,
      },
      null,
      2,
    ),
  );
}
