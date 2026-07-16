import { describe, expect, test } from "bun:test";
import { normalizeContextEnvelope, type RawContextEnvelope } from "./context-envelope";
import { resolveFlorenciaContext, type CtaResolution } from "./cta-resolution";

const RAW: RawContextEnvelope = {
  cta_id: "CTA-EXPLAIN-MECHANISM",
  segment: "enterprise",
  role: "lider",
  route: "/voz-segura",
  section: "evidencia-passaporte",
  entity_refs: ["mechanism:MECH-VOICE-001", "study:EDMONDSON-1999"],
  privacy_scope: "aggregate_only",
  product_status: "DEMO",
};

const CTA: CtaResolution = {
  ctaId: "CTA-EXPLAIN-MECHANISM",
  intent: "explain_mechanism",
  label: "Explique por que isso importa",
  icon: "lightbulb",
  suggestedQuestions: ["Por que isso importa?"],
  requestedClaimIds: ["CLAIM-EDMONDSON1999-VOICE-001"],
  allowedEntityRefPrefixes: ["mechanism", "study"],
  candidateSkillIds: ["SKILL-EVIDENCE-CLAIM-GUARDIAN"],
};

describe("resolveFlorenciaContext", () => {
  test("monta o contexto resolvido com mode/profile derivados", () => {
    const outcome = resolveFlorenciaContext(normalizeContextEnvelope(RAW), CTA);
    expect(outcome.ok).toBe(true);
    expect(outcome.context?.mode).toBe("educar");
    expect(outcome.context?.profile).toBe("LEADERSHIP_FACILITATOR");
    expect(outcome.context?.entityRefs).toEqual(["mechanism:MECH-VOICE-001", "study:EDMONDSON-1999"]);
    expect(outcome.context?.rejectedEntityRefs).toEqual([]);
  });

  test("cta_id divergente entre envelope e resolução recusa", () => {
    const outcome = resolveFlorenciaContext(normalizeContextEnvelope(RAW), {
      ...CTA,
      ctaId: "CTA-OUTRA-COISA",
    });
    expect(outcome.ok).toBe(false);
    expect(outcome.context).toBeNull();
    expect(outcome.error).toContain("não bate");
  });

  test("entity_ref fora da allowlist da CTA é rejeitado, não descartado silenciosamente", () => {
    const raw: RawContextEnvelope = { ...RAW, entity_refs: ["mechanism:MECH-VOICE-001", "claim:CLAIM-X"] };
    const outcome = resolveFlorenciaContext(normalizeContextEnvelope(raw), CTA);
    expect(outcome.ok).toBe(true);
    expect(outcome.context?.entityRefs).toEqual(["mechanism:MECH-VOICE-001"]);
    expect(outcome.context?.rejectedEntityRefs).toEqual(["claim:CLAIM-X"]);
  });

  test("se NENHUM entity_ref sobrevive à allowlist (e algum foi declarado), recusa por inteiro", () => {
    const raw: RawContextEnvelope = { ...RAW, entity_refs: ["claim:CLAIM-X", "cycle:2026-q3"] };
    const outcome = resolveFlorenciaContext(normalizeContextEnvelope(raw), CTA);
    expect(outcome.ok).toBe(false);
    expect(outcome.error).toContain("allowlist");
  });

  test("role/segment desconhecidos resolvem profile null, sem lançar exceção", () => {
    const raw: RawContextEnvelope = { ...RAW, role: "estagiario" };
    const outcome = resolveFlorenciaContext(normalizeContextEnvelope(raw), CTA);
    expect(outcome.ok).toBe(true);
    expect(outcome.context?.profile).toBeNull();
  });
});
