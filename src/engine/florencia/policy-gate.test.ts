import { describe, expect, test } from "bun:test";
import { normalizeContextEnvelope, type RawContextEnvelope } from "./context-envelope";
import { resolveFlorenciaContext, type CtaResolution } from "./cta-resolution";
import { evaluatePolicyGate } from "./policy-gate";
import type { ClaimRegistry, EvidenceRegistry } from "@/engine/evidence/passport-engine";
import evidenceRegistryJson from "@/domain/evidence/evidence-registry.json";
import claimRegistryJson from "@/domain/evidence/claim-registry.json";

const EVIDENCE = evidenceRegistryJson as unknown as EvidenceRegistry;
const CLAIMS = (claimRegistryJson as unknown as ClaimRegistry).claims;

const RAW: RawContextEnvelope = {
  cta_id: "CTA-EXPLAIN-MECHANISM",
  segment: "enterprise",
  role: "lider",
  route: "/voz-segura",
  section: "evidencia-passaporte",
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
  candidateSkillIds: ["SKILL-EVIDENCE-CLAIM-GUARDIAN", "SKILL-CONTEXT-ORCHESTRATION"],
};

function resolve(raw: RawContextEnvelope, cta: CtaResolution) {
  const outcome = resolveFlorenciaContext(normalizeContextEnvelope(raw), cta);
  if (!outcome.ok) throw new Error(outcome.error ?? "resolução falhou");
  return outcome.context!;
}

describe("evaluatePolicyGate", () => {
  test("contexto compatível com claim real → allowed, claim concedido", () => {
    const context = resolve(RAW, CTA);
    const result = evaluatePolicyGate(context, CLAIMS, EVIDENCE, {
      allowedPrivacyScopes: ["aggregate_only"],
    });
    expect(result.allowed).toBe(true);
    expect(result.allowedClaimIds).toEqual(["CLAIM-EDMONDSON1999-VOICE-001"]);
    expect(result.deniedClaimIds).toEqual([]);
  });

  test("privacy_scope fora da allowlist da rota bloqueia tudo, sem processar claims", () => {
    const raw: RawContextEnvelope = { ...RAW, privacy_scope: "tenant_authorized" };
    const context = resolve(raw, CTA);
    const result = evaluatePolicyGate(context, CLAIMS, EVIDENCE, {
      allowedPrivacyScopes: ["aggregate_only"],
    });
    expect(result.allowed).toBe(false);
    expect(result.allowedClaimIds).toEqual([]);
    expect(result.deniedClaimIds).toEqual(["CLAIM-EDMONDSON1999-VOICE-001"]);
    expect(result.reason).toContain("privacy_scope");
  });

  test("claim C2 (LDR-007) concedido — C2 não exige ressalva obrigatória (só C3/V2 exigem)", () => {
    const raw: RawContextEnvelope = { ...RAW, section: "missao-equipe" };
    const cta: CtaResolution = {
      ...CTA,
      ctaId: "CTA-CREATE-TEAM-MISSION",
      intent: "create_team_mission",
      requestedClaimIds: ["CLAIM-LDR007-VOICE-001"],
    };
    const context = resolve({ ...raw, cta_id: "CTA-CREATE-TEAM-MISSION" }, cta);
    const result = evaluatePolicyGate(context, CLAIMS, EVIDENCE, {
      allowedPrivacyScopes: ["aggregate_only"],
    });
    expect(result.allowed).toBe(true);
    expect(result.allowedClaimIds).toEqual(["CLAIM-LDR007-VOICE-001"]);
    expect(result.requiresHumanReview).toBe(false);
  });

  test("intent organize_evidence sempre exige revisão humana", () => {
    const raw: RawContextEnvelope = { ...RAW, cta_id: "CTA-ORGANIZE-EVIDENCE", section: "organizar-esg" };
    const cta: CtaResolution = {
      ...CTA,
      ctaId: "CTA-ORGANIZE-EVIDENCE",
      intent: "organize_evidence",
      requestedClaimIds: ["CLAIM-EDMONDSON1999-VOICE-003"],
    };
    const context = resolve(raw, cta);
    const result = evaluatePolicyGate(context, CLAIMS, EVIDENCE, {
      allowedPrivacyScopes: ["aggregate_only"],
    });
    expect(result.requiresHumanReview).toBe(true);
  });

  test("papel incompatível com o claim bloqueia (via trustGate)", () => {
    const raw: RawContextEnvelope = { ...RAW, role: "sst" };
    const context = resolve(raw, CTA);
    const result = evaluatePolicyGate(context, CLAIMS, EVIDENCE, {
      allowedPrivacyScopes: ["aggregate_only"],
    });
    expect(result.allowed).toBe(false);
    expect(result.deniedClaimIds).toEqual(["CLAIM-EDMONDSON1999-VOICE-001"]);
  });

  test("claim inexistente no registry é negado com motivo explícito, não lança exceção", () => {
    const cta: CtaResolution = { ...CTA, requestedClaimIds: ["CLAIM-NAO-EXISTE"] };
    const context = resolve(RAW, cta);
    const result = evaluatePolicyGate(context, CLAIMS, EVIDENCE, {
      allowedPrivacyScopes: ["aggregate_only"],
    });
    expect(result.allowed).toBe(false);
    expect(result.deniedClaimIds).toEqual(["CLAIM-NAO-EXISTE"]);
  });

  test("skillStatus filtra Skills ROADMAP fora do allowedSkillIds", () => {
    const context = resolve(RAW, CTA);
    const result = evaluatePolicyGate(context, CLAIMS, EVIDENCE, {
      allowedPrivacyScopes: ["aggregate_only"],
      skillStatus: { "SKILL-EVIDENCE-CLAIM-GUARDIAN": "REAL", "SKILL-CONTEXT-ORCHESTRATION": "ROADMAP" },
    });
    expect(result.allowedSkillIds).toEqual(["SKILL-EVIDENCE-CLAIM-GUARDIAN"]);
  });
});
