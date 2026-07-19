import { describe, expect, test } from "bun:test";
import { normalizeContextEnvelope, type RawContextEnvelope } from "./context-envelope";
import { resolveFlorenciaContext, type CtaResolution } from "./cta-resolution";
import { evaluatePolicyGate } from "./policy-gate";
import type { ClaimRegistry, EvidenceRegistry } from "@/engine/evidence/passport-engine";
import evidenceRegistryJson from "@/domain/evidence/evidence-registry.json";
import claimRegistryJson from "@/domain/evidence/claim-registry.json";
import { resolveSkillStatusMap } from "@/domain/florencia/skill-status-projection";

const EVIDENCE = evidenceRegistryJson as unknown as EvidenceRegistry;
const CLAIMS = (claimRegistryJson as unknown as ClaimRegistry).claims;
// Mapa REAL de produção (Truth Layer) — usado nos testes que não estão
// especificamente exercitando o filtro de Skill, para provar que o
// comportamento atual (REAL/PARCIAL passam) é preservado com dados reais.
const REAL_SKILL_STATUS = resolveSkillStatusMap();

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
      skillStatus: REAL_SKILL_STATUS,
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
      skillStatus: REAL_SKILL_STATUS,
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
      skillStatus: REAL_SKILL_STATUS,
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
      skillStatus: REAL_SKILL_STATUS,
    });
    expect(result.requiresHumanReview).toBe(true);
  });

  test("papel incompatível com o claim bloqueia (via trustGate)", () => {
    const raw: RawContextEnvelope = { ...RAW, role: "sst" };
    const context = resolve(raw, CTA);
    const result = evaluatePolicyGate(context, CLAIMS, EVIDENCE, {
      allowedPrivacyScopes: ["aggregate_only"],
      skillStatus: REAL_SKILL_STATUS,
    });
    expect(result.allowed).toBe(false);
    expect(result.deniedClaimIds).toEqual(["CLAIM-EDMONDSON1999-VOICE-001"]);
  });

  test("claim inexistente no registry é negado com motivo explícito, não lança exceção", () => {
    const cta: CtaResolution = { ...CTA, requestedClaimIds: ["CLAIM-NAO-EXISTE"] };
    const context = resolve(RAW, cta);
    const result = evaluatePolicyGate(context, CLAIMS, EVIDENCE, {
      allowedPrivacyScopes: ["aggregate_only"],
      skillStatus: REAL_SKILL_STATUS,
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

// ─── skillStatus obrigatório — fail-closed (Onda 5, corte skill status) ──────
//
// TypeScript já barra a omissão do parâmetro (skillStatus não é mais
// opcional em PolicyGateOptions) — este describe cobre o comportamento em
// RUNTIME dos casos que o tipo sozinho não prova: mapa presente mas
// incompleto, status desconhecido, e a preservação do comportamento atual
// com o mapa REAL de produção.
describe("evaluatePolicyGate — skillStatus fail-closed", () => {
  test("Skill REAL e PARCIAL permitidas — comportamento atual preservado", () => {
    const context = resolve(RAW, CTA); // candidateSkillIds: GUARDIAN (REAL) + CONTEXT-ORCHESTRATION (REAL)
    const result = evaluatePolicyGate(context, CLAIMS, EVIDENCE, {
      allowedPrivacyScopes: ["aggregate_only"],
      skillStatus: { "SKILL-EVIDENCE-CLAIM-GUARDIAN": "REAL", "SKILL-CONTEXT-ORCHESTRATION": "PARCIAL" },
    });
    expect(result.allowedSkillIds).toEqual([
      "SKILL-EVIDENCE-CLAIM-GUARDIAN",
      "SKILL-CONTEXT-ORCHESTRATION",
    ]);
  });

  test("Skill ausente do mapa é bloqueada — omissão nunca é autorização implícita", () => {
    const context = resolve(RAW, CTA);
    const result = evaluatePolicyGate(context, CLAIMS, EVIDENCE, {
      allowedPrivacyScopes: ["aggregate_only"],
      skillStatus: { "SKILL-EVIDENCE-CLAIM-GUARDIAN": "REAL" }, // CONTEXT-ORCHESTRATION nunca aparece
    });
    expect(result.allowedSkillIds).toEqual(["SKILL-EVIDENCE-CLAIM-GUARDIAN"]);
  });

  test("mapa vazio bloqueia TODAS as Skills candidatas — fail-closed, não fail-open", () => {
    const context = resolve(RAW, CTA);
    const result = evaluatePolicyGate(context, CLAIMS, EVIDENCE, {
      allowedPrivacyScopes: ["aggregate_only"],
      skillStatus: {},
    });
    expect(result.allowedSkillIds).toEqual([]);
  });

  test("status desconhecido (fora do enum REAL/PARCIAL/ROADMAP) é tratado como indisponível", () => {
    const context = resolve(RAW, CTA);
    const result = evaluatePolicyGate(context, CLAIMS, EVIDENCE, {
      allowedPrivacyScopes: ["aggregate_only"],
      // "BETA" simula corrupção de dado — nunca deve passar.
      skillStatus: { "SKILL-EVIDENCE-CLAIM-GUARDIAN": "BETA" as never, "SKILL-CONTEXT-ORCHESTRATION": "REAL" },
    });
    expect(result.allowedSkillIds).toEqual(["SKILL-CONTEXT-ORCHESTRATION"]);
  });

  test("mapa REAL de produção autoriza todas as candidateSkillIds das 5 CTAs — nenhuma regressão", () => {
    // As 15 Skills do skill-registry.json hoje são todas REAL/PARCIAL (zero
    // ROADMAP) — então com o mapa real, toda Skill candidata de toda CTA
    // continua passando, exatamente como antes deste corte.
    const context = resolve(RAW, CTA);
    const result = evaluatePolicyGate(context, CLAIMS, EVIDENCE, {
      allowedPrivacyScopes: ["aggregate_only"],
      skillStatus: REAL_SKILL_STATUS,
    });
    expect(result.allowedSkillIds).toEqual(CTA.candidateSkillIds);
  });
});
