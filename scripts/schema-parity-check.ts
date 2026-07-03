#!/usr/bin/env bun
// Runner standalone da paridade de schema (P0-02). Uso:
//   bun run parity        → imprime o relatório e sai 0 (OK) ou 1 (drift)
//
// Roda também dentro de `bun test src` (parity-check.test.ts) como gate de build.
// Este runner existe para inspeção humana rápida e para o `bun run gate`.

import { runParity } from "../src/lib/schema-parity/parity-io";
import { formatParityReport } from "../src/lib/schema-parity/parity-core";

const report = runParity();
console.log(formatParityReport(report));

if (!report.ok) {
  console.error("\n❌ Paridade de schema falhou — veja acima.");
  process.exit(1);
}
console.log("✅ Repo coerente: toda dependência de schema do código está versionada.");
process.exit(0);
