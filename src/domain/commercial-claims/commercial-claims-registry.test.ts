// Gate de integridade do Commercial Claims Registry (H2.1B MVP) — mesmo
// espírito do copsoq-instrument-manifest.test.ts: o registry real precisa
// validar contra o próprio schema, e cada caminho de rejeição do loader
// precisa disparar de verdade contra um fixture propositalmente quebrado
// (nunca só contra o registry real, que por definição já é válido).

import { describe, expect, test } from "bun:test";
import Ajv from "ajv";
import registryJson from "./commercial-claims-registry.json";
import registrySchema from "./commercial-claims-registry.schema.json";
import {
  findCommercialClaim,
  getCommercialClaimsRegistry,
  isClaimExpired,
  validateCommercialClaimsRegistry,
} from "./commercial-claims-registry";
import type { CommercialClaimEntry } from "./commercial-claim-types";

const registry = getCommercialClaimsRegistry();

/** Claim válido mínimo — cada teste de rejeição parte disto e quebra UM campo. */
function validClaimFixture(overrides: Partial<CommercialClaimEntry> = {}): CommercialClaimEntry {
  return {
    claim_id: "CLAIM-COM-FIXTURE-001",
    category: "instrument_identity",
    status: "approved",
    variants: { default: "Texto de teste com conteúdo suficiente." },
    source_refs: ["FIXTURE-SOURCE"],
    limitations: ["Limitação de teste."],
    allowed_surface_ids: ["marketing.test.fixture-surface"],
    owner_role: "scientific-governance",
    reviewed_at: "2026-07-23",
    review_due_at: "2027-01-23",
    ...overrides,
  };
}

function registryFixture(claims: CommercialClaimEntry[]) {
  return {
    $schema: "./commercial-claims-registry.schema.json",
    schema_version: "1.0.0",
    registry_version: "1.0.0",
    frozen: true,
    claims,
  };
}

describe("commercial-claims-registry — carga válida (registry real)", () => {
  test("o registry real valida contra o próprio schema (Ajv)", () => {
    const ajv = new Ajv({ allErrors: true, strict: false });
    const validate = ajv.compile(registrySchema);
    const valid = validate(registryJson);
    expect(validate.errors ?? []).toEqual([]);
    expect(valid).toBe(true);
  });

  test("registry conserva os 8 claims do MVP e acrescenta 2 autorizações da apresentação", () => {
    expect(registry.claims.length).toBe(12);
    expect(registry.frozen).toBe(true);
  });

  test("findCommercialClaim resolve um claim real por id", () => {
    const claim = findCommercialClaim("CLAIM-COM-INSTRUMENT-LABEL-001");
    expect(claim).toBeDefined();
    expect(claim!.category).toBe("instrument_identity");
  });

  test("determinismo: duas chamadas devolvem a mesma referência (singleton congelado)", () => {
    expect(getCommercialClaimsRegistry()).toBe(getCommercialClaimsRegistry());
  });
});

describe("commercial-claims-registry — deep-freeze", () => {
  test("registry, claims e variants são Object.isFrozen", () => {
    expect(Object.isFrozen(registry)).toBe(true);
    expect(Object.isFrozen(registry.claims)).toBe(true);
    expect(Object.isFrozen(registry.claims[0])).toBe(true);
    expect(Object.isFrozen(registry.claims[0]!.variants)).toBe(true);
  });

  test("mutação em runtime lança (nunca falha silenciosamente)", () => {
    expect(() => {
      (registry.claims[0] as unknown as { status: string }).status = "retired";
    }).toThrow();
  });
});

describe("commercial-claims-registry — rejeições do loader (fixtures quebrados)", () => {
  test("schema inválido: campo obrigatório ausente", () => {
    const broken = { schema_version: "1.0.0", registry_version: "1.0.0", frozen: true, claims: [] };
    // claims: [] passa o "type array" mas falha minItems: 1.
    expect(() => validateCommercialClaimsRegistry(broken)).toThrow(/schema inválido/);
  });

  test("ID duplicado entre dois claims", () => {
    const a = validClaimFixture();
    const b = validClaimFixture({ allowed_surface_ids: ["marketing.test.other-surface"] });
    expect(() => validateCommercialClaimsRegistry(registryFixture([a, b]))).toThrow(
      /claim_id duplicado/,
    );
  });

  test("surface ID duplicado dentro da MESMA entrada (pego pelo schema uniqueItems)", () => {
    const broken = validClaimFixture({
      allowed_surface_ids: ["marketing.test.fixture-surface", "marketing.test.fixture-surface"],
    });
    expect(() => validateCommercialClaimsRegistry(registryFixture([broken]))).toThrow(
      /allowed_surface_ids/,
    );
  });

  test("variante vazia (objeto sem nenhuma chave) falha no schema", () => {
    const broken = validClaimFixture({ variants: {} });
    expect(() => validateCommercialClaimsRegistry(registryFixture([broken]))).toThrow(
      /schema inválido/,
    );
  });

  test("fonte ausente (source_refs vazio) falha no schema", () => {
    const broken = validClaimFixture({ source_refs: [] });
    expect(() => validateCommercialClaimsRegistry(registryFixture([broken]))).toThrow(
      /schema inválido/,
    );
  });

  test("owner_role ausente (string vazia) falha no schema", () => {
    const broken = validClaimFixture({ owner_role: "" });
    expect(() => validateCommercialClaimsRegistry(registryFixture([broken]))).toThrow(
      /schema inválido/,
    );
  });

  test("data inválida (reviewed_at fora do formato ISO) falha no schema", () => {
    const broken = validClaimFixture({ reviewed_at: "23/07/2026" });
    expect(() => validateCommercialClaimsRegistry(registryFixture([broken]))).toThrow(
      /schema inválido/,
    );
  });

  test("review_due_at anterior a reviewed_at", () => {
    const broken = validClaimFixture({ reviewed_at: "2026-07-23", review_due_at: "2026-01-01" });
    expect(() => validateCommercialClaimsRegistry(registryFixture([broken]))).toThrow(
      /review_due_at .* é anterior a reviewed_at/,
    );
  });

  test("status inválido (fora do enum) falha no schema", () => {
    const broken = validClaimFixture({ status: "published" as CommercialClaimEntry["status"] });
    expect(() => validateCommercialClaimsRegistry(registryFixture([broken]))).toThrow(
      /schema inválido/,
    );
  });

  test("category fora da taxonomia fechada falha no schema", () => {
    const broken = validClaimFixture({
      category: "marketing_generic" as CommercialClaimEntry["category"],
    });
    expect(() => validateCommercialClaimsRegistry(registryFixture([broken]))).toThrow(
      /schema inválido/,
    );
  });
});

describe("commercial-claims-registry — expiração (isClaimExpired)", () => {
  test("claim com review_due_at no passado está vencido", () => {
    const claim = validClaimFixture({ review_due_at: "2020-01-01" });
    expect(isClaimExpired(claim, new Date("2026-07-23"))).toBe(true);
  });

  test("claim com review_due_at no futuro não está vencido", () => {
    const claim = validClaimFixture({ review_due_at: "2099-01-01" });
    expect(isClaimExpired(claim, new Date("2026-07-23"))).toBe(false);
  });

  test("gate: nenhum claim approved do registry real está vencido hoje", () => {
    const today = new Date();
    const expired = registry.claims.filter(
      (c) => c.status === "approved" && isClaimExpired(c, today),
    );
    expect(expired.map((c) => c.claim_id)).toEqual([]);
  });
});
