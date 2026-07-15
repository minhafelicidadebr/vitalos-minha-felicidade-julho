#!/usr/bin/env bun
// Sincroniza os contratos de runtime da FlorêncIA a partir da fonte canônica
// em docs/ai/florencia-skills/schemas/ (biblioteca de governança versionada,
// NÃO importada pelo bundle). A cópia de runtime vive em
// src/domain/florencia/contracts/ — é o que src/engine/florencia realmente
// valida contra (indiretamente, via context-validator.ts hand-rolled em TS).
//
// Uso: bun run scripts/sync-florencia-contracts.ts
// Roda também dentro de bun test src (florencia-contract-parity.test.ts) —
// divergência entre canônico e sincronizado quebra o gate.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");

const CONTRACTS = [
  {
    canonical: resolve(ROOT, "docs/ai/florencia-skills/schemas/context-envelope.schema.json"),
    runtime: resolve(ROOT, "src/domain/florencia/contracts/context-envelope.schema.json"),
  },
];

let changed = 0;
for (const { canonical, runtime } of CONTRACTS) {
  const source = readFileSync(canonical, "utf-8");
  let current: string | null = null;
  try {
    current = readFileSync(runtime, "utf-8");
  } catch {
    // arquivo de runtime ainda não existe — será criado
  }
  if (current !== source) {
    writeFileSync(runtime, source, "utf-8");
    changed++;
    console.log(`sincronizado: ${runtime}`);
  }
}

console.log(changed === 0 ? "✅ contratos já sincronizados" : `✅ ${changed} contrato(s) sincronizado(s)`);
