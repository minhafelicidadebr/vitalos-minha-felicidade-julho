import { describe, expect, test } from "bun:test";
import { normalizeContextEnvelope, type RawContextEnvelope } from "./context-envelope";

const RAW: RawContextEnvelope = {
  cta_id: "CTA-EXPLAIN-MECHANISM",
  segment: "enterprise",
  role: "lider",
  route: "/voz-segura",
  section: "evidencia-passaporte",
  tags: ["seguranca", "lideranca"],
  entity_refs: ["mechanism:MECH-VOICE-001"],
  privacy_scope: "aggregate_only",
  product_status: "DEMO",
};

describe("normalizeContextEnvelope", () => {
  test("traduz snake_case para camelCase 1:1", () => {
    const normalized = normalizeContextEnvelope(RAW);
    expect(normalized).toEqual({
      ctaId: "CTA-EXPLAIN-MECHANISM",
      segment: "enterprise",
      role: "lider",
      route: "/voz-segura",
      section: "evidencia-passaporte",
      tags: ["seguranca", "lideranca"],
      entityRefs: ["mechanism:MECH-VOICE-001"],
      privacyScope: "aggregate_only",
      productStatus: "DEMO",
    });
  });

  test("tags/entity_refs ausentes viram array vazio, nunca undefined", () => {
    const { tags, entity_refs, ...rest } = RAW;
    const normalized = normalizeContextEnvelope(rest as RawContextEnvelope);
    expect(normalized.tags).toEqual([]);
    expect(normalized.entityRefs).toEqual([]);
  });
});
