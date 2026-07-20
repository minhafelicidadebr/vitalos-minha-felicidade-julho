#!/usr/bin/env bun
// Regenera a parte DERIVADA do manifesto canônico do COPSOQ
// (src/domain/survey/copsoq-instrument-manifest.json) a partir da bateria
// REALMENTE servida pelo runtime (getWaveSurvey — a mesma superfície que o
// respondente recebe). Deriva: item_count, dimension_count, exposure/outcome
// counts, dimensions (id + kind + item_ids), reversed_items e item_hashes
// (sha-256 hex do texto NFC). Campos curados (licença, claims, fontes,
// scoring, versão, status) são PRESERVADOS — mudá-los é descongelamento
// formal, nunca efeito colateral deste script.
//
// Uso: bun run scripts/sync-copsoq-manifest.ts
// Paridade imposta no gate: copsoq-instrument-manifest.test.ts — se a
// bateria servida mudar sem regenerar (e revisar!) o manifesto, o gate quebra.
// Mesmo padrão de sync-skill-status-projection.ts (Onda 5).

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { getWaveSurvey } from "../src/mocks/survey-mock";

const ROOT = resolve(import.meta.dir, "..");
const MANIFEST_PATH = resolve(ROOT, "src/domain/survey/copsoq-instrument-manifest.json");

const survey = getWaveSurvey("enterprise", "COPSOQ");
if (!survey) {
  console.error("✗ bateria enterprise:COPSOQ não encontrada em getWaveSurvey — abortando.");
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf-8")) as Record<string, unknown> & {
  outcome_dimension_ids: string[];
};

const outcomeIds = new Set(manifest.outcome_dimension_ids);

function sha256Nfc(text: string): string {
  return createHash("sha256").update(text.normalize("NFC"), "utf8").digest("hex");
}

// Dimensões na ordem de primeira aparição dos itens (ordem servida).
const dimensionOrder: string[] = [];
const itemsByDimension = new Map<string, string[]>();
const itemHashes: Record<string, string> = {};
const reversedItems: string[] = [];

for (const item of survey.items) {
  if (!itemsByDimension.has(item.pillarId)) {
    dimensionOrder.push(item.pillarId);
    itemsByDimension.set(item.pillarId, []);
  }
  itemsByDimension.get(item.pillarId)!.push(item.id);
  itemHashes[item.id] = sha256Nfc(item.text);
  if (item.reverse === true) reversedItems.push(item.id);
}

const dimensions = dimensionOrder.map((id) => ({
  id,
  kind: outcomeIds.has(id) ? ("outcome" as const) : ("exposure" as const),
  item_ids: itemsByDimension.get(id)!,
}));

const exposureCount = dimensions.filter((d) => d.kind === "exposure").length;
const outcomeCount = dimensions.filter((d) => d.kind === "outcome").length;

const next = {
  ...manifest,
  item_count: survey.items.length,
  dimension_count: dimensions.length,
  exposure_dimension_count: exposureCount,
  outcome_dimension_count: outcomeCount,
  dimensions,
  reversed_items: reversedItems,
  item_hashes: itemHashes,
};

const serialized = JSON.stringify(next, null, 2) + "\n";
const current = readFileSync(MANIFEST_PATH, "utf-8");

if (current !== serialized) {
  writeFileSync(MANIFEST_PATH, serialized, "utf-8");
  console.log(
    `sincronizado: ${MANIFEST_PATH} (${survey.items.length} itens, ` +
      `${exposureCount} dimensões de exposição + ${outcomeCount} desfechos, ` +
      `${reversedItems.length} itens reversos)`,
  );
} else {
  console.log("✅ manifesto já sincronizado com a bateria servida");
}
