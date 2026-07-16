import { describe, expect, test } from "bun:test";
import { normalizeContextEnvelope, type RawContextEnvelope } from "./context-envelope";
import { resolveFlorenciaContext, type CtaResolution } from "./cta-resolution";
import { validateRawContextEnvelope, validateResolvedContext } from "./context-validator";

const RAW: RawContextEnvelope = {
  cta_id: "CTA-EXPLAIN-MECHANISM",
  segment: "enterprise",
  role: "lider",
  route: "/voz-segura",
  section: "evidencia-passaporte",
  tags: ["seguranca"],
  entity_refs: ["mechanism:MECH-VOICE-001"],
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

describe("validateRawContextEnvelope — camada 1 (forma estrutural)", () => {
  test("envelope real passa", () => {
    expect(validateRawContextEnvelope(RAW).valid).toBe(true);
  });

  test("cta_id fora do padrão CTA-XXX bloqueia", () => {
    const result = validateRawContextEnvelope({ ...RAW, cta_id: "explain_mechanism" });
    expect(result.valid).toBe(false);
  });

  test("segment com valor antigo 'condo' (não 'condominium') bloqueia", () => {
    const result = validateRawContextEnvelope({ ...RAW, segment: "condo" as never });
    expect(result.valid).toBe(false);
  });

  test("segment 'condominium' (vocabulário oficial) passa", () => {
    const result = validateRawContextEnvelope({ ...RAW, segment: "condominium" as never, role: "sindico" });
    expect(result.valid).toBe(true);
  });

  test("section fora de kebab-case bloqueia", () => {
    const result = validateRawContextEnvelope({ ...RAW, section: "Evidencia_Passaporte" });
    expect(result.valid).toBe(false);
  });

  test("campo extra fora do contrato bloqueia (additionalProperties fechado)", () => {
    const withExtra = { ...RAW, mode: "educar" } as RawContextEnvelope;
    const result = validateRawContextEnvelope(withExtra);
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("mode");
  });

  test("privacy_scope 'self_private' é estruturalmente válido (bloqueio semântico é do Policy Gate, não daqui)", () => {
    const result = validateRawContextEnvelope({ ...RAW, privacy_scope: "self_private" });
    expect(result.valid).toBe(true);
  });
});

describe("validateResolvedContext — camada 2 (coerência pós-resolução)", () => {
  test("contexto resolvido corretamente passa", () => {
    const outcome = resolveFlorenciaContext(normalizeContextEnvelope(RAW), CTA);
    expect(validateResolvedContext(outcome.context!).valid).toBe(true);
  });

  test("mode adulterado depois da resolução é recusado", () => {
    const outcome = resolveFlorenciaContext(normalizeContextEnvelope(RAW), CTA);
    const tampered = { ...outcome.context!, mode: "evoluir" as never };
    const result = validateResolvedContext(tampered);
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("mode diverge");
  });

  test("profile adulterado depois da resolução é recusado", () => {
    const outcome = resolveFlorenciaContext(normalizeContextEnvelope(RAW), CTA);
    const tampered = { ...outcome.context!, profile: "EXECUTIVE_SPONSOR" as never };
    const result = validateResolvedContext(tampered);
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("profile diverge");
  });

  test("suggestedQuestions vazio bloqueia", () => {
    const outcome = resolveFlorenciaContext(normalizeContextEnvelope(RAW), { ...CTA, suggestedQuestions: [] });
    const result = validateResolvedContext(outcome.context!);
    expect(result.valid).toBe(false);
  });
});
