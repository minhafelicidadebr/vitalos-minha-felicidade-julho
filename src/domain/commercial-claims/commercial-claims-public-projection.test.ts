// Paridade da projeção pública (fechamento H2.1B §3) — mesmo padrão de
// copsoq-instrument-manifest.test.ts / schema-parity-check: o JSON
// commitado precisa bater EXATAMENTE com o que resolver cada binding contra
// o registry completo produziria agora. Se alguém editar um binding ou o
// registry mudar sem rodar o script de geração, este teste quebra o gate —
// é aqui, em tempo de teste/CI (Node, não navegador), que expiração e
// autorização são verificadas antes de qualquer publicação.

import { describe, expect, test } from "bun:test";
import Ajv from "ajv";
import projectionJson from "./commercial-claims-public-projection.json";
import projectionSchema from "./commercial-claims-public-projection.schema.json";
import { resolveCommercialClaim } from "./commercial-claims-resolver";
import { PUBLIC_COMMERCIAL_BINDINGS } from "./commercial-claims-public-bindings";
import { getCommercialClaimsRegistry } from "./commercial-claims-registry";

describe("commercial-claims-public-projection — schema", () => {
  test("a projeção commitada valida contra o próprio schema", () => {
    const ajv = new Ajv({ allErrors: true, strict: false });
    const validate = ajv.compile(projectionSchema);
    const valid = validate(projectionJson);
    expect(validate.errors ?? []).toEqual([]);
    expect(valid).toBe(true);
  });
});

describe("commercial-claims-public-projection — paridade com o registry + bindings", () => {
  test("toda entrada da projeção commitada é IDÊNTICA ao que o resolver completo produz agora", () => {
    const expected = Object.values(PUBLIC_COMMERCIAL_BINDINGS).map((binding) => {
      const resolved = resolveCommercialClaim(binding);
      return {
        claimId: resolved.claimId,
        variant: resolved.variant,
        surfaceId: resolved.surfaceId,
        text: resolved.text,
      };
    });
    expect(projectionJson.entries).toEqual(expected);
  });

  test("nenhum binding foi esquecido: a projeção tem exatamente 1 entrada por binding público", () => {
    expect(projectionJson.entries.length).toBe(Object.keys(PUBLIC_COMMERCIAL_BINDINGS).length);
  });

  test("registry_version registrado na projeção bate com o registry real", () => {
    const registry = getCommercialClaimsRegistry();
    expect(projectionJson.generated_from_registry_version).toBe(registry.registry_version);
  });
});

describe("commercial-claims-public-projection — nunca contém metadados internos (fechamento §3)", () => {
  test("nenhuma entrada tem limitations, source_refs, owner_role ou datas", () => {
    for (const entry of projectionJson.entries) {
      const keys = Object.keys(entry).sort();
      expect(keys).toEqual(["claimId", "surfaceId", "text", "variant"]);
    }
  });

  test("claim sem consumidor (CLAIM-COM-REGULATORY-SCOPE-001) não aparece na projeção", () => {
    const claimIds = projectionJson.entries.map((e) => e.claimId);
    expect(claimIds).not.toContain("CLAIM-COM-REGULATORY-SCOPE-001");
  });

  test("nenhum texto de limitation do registry vaza para a projeção", () => {
    const registry = getCommercialClaimsRegistry();
    const allLimitations = registry.claims.flatMap((c) => c.limitations);
    const projectionText = projectionJson.entries.map((e) => e.text).join(" ");
    for (const limitation of allLimitations) {
      expect(projectionText).not.toContain(limitation);
    }
  });
});
