#!/usr/bin/env bun
// Runner CLI do manifesto de migrations (Q1.1 — GATE 2). Motor em
// src/lib/schema-parity/migration-manifest.ts; gate de teste no .test.ts
// vizinho. Mesma separação de scripts/schema-parity-check.ts.
//
// Uso:
//   bun run manifest          → verifica (exit 1 se divergir)
//   bun run manifest:write    → regrava o manifesto (após migration nova)

import { writeFileSync, existsSync } from "node:fs";
import {
  buildManifest,
  readStoredManifest,
  diffManifests,
  describeDrift,
  manifestPath,
} from "../src/lib/schema-parity/migration-manifest";

const path = manifestPath();
const current = buildManifest();

if (process.argv.includes("--write")) {
  writeFileSync(path, `${JSON.stringify(current, null, 2)}\n`, "utf8");
  console.log(
    `✅ Manifesto gravado: ${current.migrationCount} migrations, rollup ${current.rollupSha256.slice(0, 12)}…`,
  );
  process.exit(0);
}

if (!existsSync(path)) {
  console.error("❌ Manifesto ausente. Rode: bun run manifest:write");
  process.exit(1);
}

const drift = diffManifests(readStoredManifest(path), current);

if (drift.length === 0) {
  console.log(
    `✅ Migrations íntegras: ${current.migrationCount} arquivos, rollup ${current.rollupSha256.slice(0, 12)}…`,
  );
  process.exit(0);
}

console.error("❌ Divergência entre o manifesto e os arquivos de migration:\n");
console.error(describeDrift(drift));
console.error(
  "\nSe a mudança é intencional (migration nova), rode:\n  bun run manifest:write\n" +
    "Se NÃO é intencional, uma migration já aplicada foi editada — investigue antes de seguir.",
);
process.exit(1);
