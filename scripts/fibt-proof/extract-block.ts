#!/usr/bin/env bun
/**
 * PROD-0.6C — extrator determinístico do bloco SQL do draft não executável.
 *
 * Implementa as quinze regras do contrato de extração (PROD06_NONPROD_PROOF_PLAN §D).
 * NÃO executa SQL. Apenas lê o `.sql.disabled`, valida e escreve em RUNNER_TEMP.
 *
 * Uso: bun run scripts/fibt-proof/extract-block.ts <BLOCK_NAME> <OUT_PATH>
 *   BLOCK_NAME: SQL | ACL
 */

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const SOURCE = "docs/fibt-prod/MIGRATION_B_PRODUCTION_DRAFT.sql.disabled";

const MARKERS = {
  SQL: { begin: "FIBT_PROD_B_SQL_BLOCK_BEGIN", end: "FIBT_PROD_B_SQL_BLOCK_END" },
  ACL: { begin: "FIBT_PROD_B_ACL_BLOCK_BEGIN", end: "FIBT_PROD_B_ACL_BLOCK_END" },
} as const;

function die(rule: number, msg: string): never {
  console.error(`EXTRACTION_ABORTED (regra ${rule}): ${msg}`);
  process.exit(1);
}

function sha256(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

const blockName = (process.argv[2] ?? "").toUpperCase();
const outPath = process.argv[3];
if (blockName !== "SQL" && blockName !== "ACL") die(0, "BLOCK_NAME deve ser SQL ou ACL");
if (!outPath) die(0, "OUT_PATH obrigatório");

const marker = MARKERS[blockName as keyof typeof MARKERS];

// --- Regra 11: SHA-256 do arquivo-fonte inteiro -----------------------------
// Normaliza CRLF -> LF: em checkout Windows o working tree diverge do blob.
const raw = readFileSync(SOURCE, "utf8").replace(/\r\n/g, "\n");
const sourceSha = sha256(raw);
const lines = raw.split("\n");

// --- Regra 8: nenhum conteúdo não comentado no arquivo-fonte ----------------
// Formatos aceitos no arquivo inteiro: "-- " + conteúdo, exatamente "--", vazio.
for (let i = 0; i < lines.length; i++) {
  const l = lines[i]!;
  if (l === "" || l.trim() === "") continue;
  if (l === "--") continue;
  if (l.startsWith("-- ")) continue;
  die(8, `linha ${i + 1} do arquivo-fonte não está comentada: ${JSON.stringify(l.slice(0, 60))}`);
}

// --- Regras 1-4: marcadores únicos, um par, na ordem correta ----------------
const beginIdx: number[] = [];
const endIdx: number[] = [];
lines.forEach((l, i) => {
  if (l.includes(marker.begin)) beginIdx.push(i);
  if (l.includes(marker.end)) endIdx.push(i);
});

// A menção nos comentários explicativos usa os dois nomes na mesma linha;
// só contam como marcador as linhas que são EXATAMENTE "-- <MARCADOR>".
const isMarkerLine = (i: number, name: string) => lines[i]!.trim() === `-- ${name}`;
const begins = beginIdx.filter((i) => isMarkerLine(i, marker.begin));
const ends = endIdx.filter((i) => isMarkerLine(i, marker.end));

if (begins.length === 0) die(2, `marcador inicial ${marker.begin} ausente`);
if (begins.length > 1) die(2, `marcador inicial ${marker.begin} duplicado (${begins.length}x)`);
if (ends.length === 0) die(3, `marcador final ${marker.end} ausente`);
if (ends.length > 1) die(3, `marcador final ${marker.end} duplicado (${ends.length}x)`);
if (ends[0]! <= begins[0]!) die(4, "marcador final não é posterior ao inicial");

// --- Regra 5: somente linhas ESTRITAMENTE entre os marcadores ---------------
const block = lines.slice(begins[0]! + 1, ends[0]!);
const blockSha = sha256(block.join("\n"));

// --- Regras 6-7: remover exatamente um prefixo; rejeitar formato inesperado --
// `origin` guarda a forma original de cada linha, para que a prova de
// correspondência (regra 14) seja byte-exata e não aproximada: uma linha em
// branco e uma linha "--" produzem a mesma saída vazia, mas NÃO são a mesma
// entrada. Sem isso, a reconstrução seria ambígua e a prova, vazia.
type Origin = "blank" | "bare" | "prefixed";
const out: string[] = [];
const origin: Origin[] = [];
let rejected = 0;
for (let i = 0; i < block.length; i++) {
  const l = block[i]!;
  if (l === "") {
    out.push("");
    origin.push("blank");
  } else if (l === "--") {
    out.push("");
    origin.push("bare");
  } else if (l.startsWith("-- ")) {
    out.push(l.slice(3));
    origin.push("prefixed");
  } else {
    rejected++;
    die(7, `linha ${begins[0]! + 2 + i} em formato inesperado: ${JSON.stringify(l.slice(0, 60))}`);
  }
}

const sql = out.join("\n") + "\n";
const executedSha = sha256(sql);

// --- Regras 9-10: escrever SOMENTE em RUNNER_TEMP ---------------------------
const runnerTemp = process.env.RUNNER_TEMP;
if (!runnerTemp) die(9, "RUNNER_TEMP não definido — sem fallback");
if (!outPath.startsWith(runnerTemp)) die(9, `OUT_PATH fora de RUNNER_TEMP: ${outPath}`);
writeFileSync(outPath, sql, "utf8");

// --- Regras 12-14: hashes e prova de correspondência ------------------------
// Reconstrói o bloco original a partir da saída + origem de cada linha e
// compara byte a byte. Se bater, o SQL executado é EXATAMENTE o documentado.
const roundTrip = out
  .map((l, i) => (origin[i] === "blank" ? "" : origin[i] === "bare" ? "--" : `-- ${l}`))
  .join("\n");
const correspondence = roundTrip === block.join("\n");

console.log(
  JSON.stringify(
    {
      source_file: SOURCE,
      block_name: blockName,
      marker_begin: marker.begin,
      marker_end: marker.end,
      marker_begin_count: begins.length,
      marker_end_count: ends.length,
      source_sha256: sourceSha,
      extracted_block_sha256: blockSha,
      executed_sql_sha256: executedSha,
      line_count_total: lines.length,
      line_count_stripped: out.length,
      rejected_lines: rejected,
      correspondence_proven: correspondence,
      out_path: outPath,
    },
    null,
    2,
  ),
);

if (!correspondence) die(14, "bloco extraído não corresponde integralmente ao documentado");
