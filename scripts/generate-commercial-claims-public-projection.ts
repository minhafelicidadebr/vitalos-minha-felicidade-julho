#!/usr/bin/env bun
// Gera src/domain/commercial-claims/commercial-claims-public-projection.json
// a partir do registry COMPLETO — a única etapa deste sistema que consulta
// data (via isClaimExpired dentro de resolveCommercialClaim) e, portanto, a
// única etapa que pode rejeitar um claim vencido. Roda em Node/Bun, nunca
// no navegador.
//
// Contrato: LÊ o registry e os bindings; NUNCA edita allowed_surface_ids,
// status, fontes ou datas do registry (§3 do fechamento H2.1B). A saída
// contém só {claimId, variant, surfaceId, text} — nenhuma limitation,
// source_ref, owner_role ou data chega à projeção pública.
//
// Uso: bun run scripts/generate-commercial-claims-public-projection.ts
// Paridade imposta no gate: commercial-claims-public-projection.test.ts —
// se um binding mudar ou uma claim vencer sem regenerar, o gate quebra.
// Mesmo padrão de sync-copsoq-manifest.ts.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { getCommercialClaimsRegistry } from "../src/domain/commercial-claims/commercial-claims-registry";
import { resolveCommercialClaim } from "../src/domain/commercial-claims/commercial-claims-resolver";
import { PUBLIC_COMMERCIAL_BINDINGS } from "../src/domain/commercial-claims/commercial-claims-public-bindings";

const ROOT = resolve(import.meta.dir, "..");
const PROJECTION_PATH = resolve(
  ROOT,
  "src/domain/commercial-claims/commercial-claims-public-projection.json",
);

const registry = getCommercialClaimsRegistry();

const entries = Object.entries(PUBLIC_COMMERCIAL_BINDINGS).map(([key, binding]) => {
  try {
    const resolved = resolveCommercialClaim(binding);
    return {
      claimId: resolved.claimId,
      variant: resolved.variant,
      surfaceId: resolved.surfaceId,
      text: resolved.text,
    };
  } catch (err) {
    console.error(
      `✗ binding "${key}" (${binding.claimId}/${binding.variant}/${binding.surfaceId}) falhou ao resolver: ${(err as Error).message}`,
    );
    process.exit(1);
  }
});

const next = {
  schema_version: "1.0.0",
  generated_from_registry_version: registry.registry_version,
  entries,
};

const serialized = JSON.stringify(next, null, 2) + "\n";
const current = (() => {
  try {
    return readFileSync(PROJECTION_PATH, "utf-8");
  } catch {
    return null;
  }
})();

if (current !== serialized) {
  writeFileSync(PROJECTION_PATH, serialized, "utf-8");
  console.log(`sincronizado: ${PROJECTION_PATH} (${entries.length} entradas)`);
} else {
  console.log("✅ projeção pública já sincronizada com o registry e os bindings");
}
