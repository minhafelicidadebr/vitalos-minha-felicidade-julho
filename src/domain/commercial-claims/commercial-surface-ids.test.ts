// Paridade entre o inventário de surface IDs (fonte para o código consumidor,
// evita string solta/typo) e os allowed_surface_ids realmente declarados no
// registry — nenhum ID pode existir só de um lado.

import { describe, expect, test } from "bun:test";
import { COMMERCIAL_SURFACE_IDS } from "./commercial-surface-ids";
import { getCommercialClaimsRegistry } from "./commercial-claims-registry";

describe("commercial-surface-ids — paridade com o registry", () => {
  const registry = getCommercialClaimsRegistry();
  const registrySurfaceIds = new Set(
    registry.claims.flatMap((c) => c.allowed_surface_ids),
  );
  const inventoryIds = Object.values(COMMERCIAL_SURFACE_IDS);

  test("todo ID do inventário está autorizado por pelo menos um claim do registry", () => {
    const orphanIds = inventoryIds.filter((id) => !registrySurfaceIds.has(id));
    expect(orphanIds).toEqual([]);
  });

  test("inventário não tem IDs duplicados", () => {
    expect(new Set(inventoryIds).size).toBe(inventoryIds.length);
  });
});
