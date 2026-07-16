import { describe, expect, test } from "bun:test";
import {
  buildResponseTemplate,
  type FlorenciaResponseTemplateInput,
} from "./response-templates";
import type { ResolvedFlorenciaContext, CtaResolution } from "./cta-resolution";
import type { PolicyGateResult } from "./policy-gate";

function makeContext(overrides: Partial<ResolvedFlorenciaContext> = {}): ResolvedFlorenciaContext {
  return {
    ctaId: "CTA-PREPARE-CONVERSATION",
    segment: "enterprise",
    role: "lider",
    route: "/voz-segura",
    section: "preparar-conversa",
    tags: ["seguranca", "lideranca"],
    entityRefs: ["mechanism:MECH-VOICE-001", "study:EDMONDSON-1999"],
    rejectedEntityRefs: [],
    privacyScope: "aggregate_only",
    productStatus: "DEMO",
    intent: "prepare_conversation",
    label: "Preparar uma conversa segura",
    icon: "message-circle",
    suggestedQuestions: ["Como abrir a conversa sem soar artificial?"],
    requestedClaimIds: ["CLAIM-EDMONDSON1999-VOICE-002"],
    candidateSkillIds: ["SKILL-CONVERSATION-FACILITATOR"],
    mode: "transformar",
    profile: "LEADERSHIP_FACILITATOR",
    ...overrides,
  };
}

function makeCta(overrides: Partial<CtaResolution> = {}): CtaResolution {
  return {
    ctaId: "CTA-PREPARE-CONVERSATION",
    intent: "prepare_conversation",
    label: "Preparar uma conversa segura",
    icon: "message-circle",
    suggestedQuestions: ["Como abrir a conversa sem soar artificial?"],
    requestedClaimIds: ["CLAIM-EDMONDSON1999-VOICE-002"],
    allowedEntityRefPrefixes: ["mechanism", "study"],
    candidateSkillIds: ["SKILL-CONVERSATION-FACILITATOR"],
    ...overrides,
  };
}

function makePolicyGate(overrides: Partial<PolicyGateResult> = {}): PolicyGateResult {
  return {
    allowed: true,
    allowedClaimIds: ["CLAIM-EDMONDSON1999-VOICE-002"],
    deniedClaimIds: [],
    allowedSkillIds: ["SKILL-CONVERSATION-FACILITATOR"],
    restrictions: [],
    requiresHumanReview: false,
    reason: null,
    ...overrides,
  };
}

function makeInput(
  overrides: Partial<{
    context: Partial<ResolvedFlorenciaContext>;
    cta: Partial<CtaResolution>;
    policyGate: Partial<PolicyGateResult>;
  }> = {},
): FlorenciaResponseTemplateInput {
  return {
    context: makeContext(overrides.context),
    cta: makeCta(overrides.cta),
    policyGate: makePolicyGate(overrides.policyGate),
  };
}

describe("buildResponseTemplate — cenário permitido", () => {
  test("contexto válido Empresa × Liderança × Voz Segura produz resposta completa", () => {
    const result = buildResponseTemplate(makeInput());
    expect(result.status).toBe("allowed");
    if (result.status !== "allowed") throw new Error("esperado allowed");
    expect(result.templateId).toBe("prepare-safe-conversation-v1");
    expect(result.title).toBe("Preparar uma conversa segura");
    expect(result.guidance.length).toBe(5);
    expect(result.limitations.length).toBe(6);
    expect(result.nextActionLabel).toBe("Revisar o roteiro da conversa");
    expect(result.usedClaimIds).toEqual(["CLAIM-EDMONDSON1999-VOICE-002"]);
  });
});

describe("buildResponseTemplate — os 10 cenários de bloqueio", () => {
  test("1. CTA diferente (intent != prepare_conversation) → unsupported_intent", () => {
    const result = buildResponseTemplate(
      makeInput({ context: { intent: "explain_mechanism" }, cta: { intent: "explain_mechanism" } }),
    );
    expect(result.status).toBe("blocked");
    if (result.status !== "blocked") throw new Error("esperado blocked");
    expect(result.reasonCode).toBe("unsupported_intent");
  });

  test("2. rota diferente de /voz-segura → route_not_allowed", () => {
    const result = buildResponseTemplate(makeInput({ context: { route: "/academia" } }));
    expect(result.status).toBe("blocked");
    if (result.status !== "blocked") throw new Error("esperado blocked");
    expect(result.reasonCode).toBe("route_not_allowed");
  });

  test("3. segmento diferente de enterprise → segment_not_allowed", () => {
    const result = buildResponseTemplate(makeInput({ context: { segment: "school" } }));
    expect(result.status).toBe("blocked");
    if (result.status !== "blocked") throw new Error("esperado blocked");
    expect(result.reasonCode).toBe("segment_not_allowed");
  });

  test("4. perfil não autorizado → profile_not_allowed", () => {
    const result = buildResponseTemplate(makeInput({ context: { profile: "INDIVIDUAL_LEARNER" } }));
    expect(result.status).toBe("blocked");
    if (result.status !== "blocked") throw new Error("esperado blocked");
    expect(result.reasonCode).toBe("profile_not_allowed");
  });

  test("5. contexto fora de aggregate_only → privacy_scope_not_aggregate", () => {
    const result = buildResponseTemplate(makeInput({ context: { privacyScope: "self_private" } }));
    expect(result.status).toBe("blocked");
    if (result.status !== "blocked") throw new Error("esperado blocked");
    expect(result.reasonCode).toBe("privacy_scope_not_aggregate");
  });

  test("6. contrato incompleto (sem suggestedQuestions) → incomplete_contract", () => {
    const result = buildResponseTemplate(makeInput({ context: { suggestedQuestions: [] } }));
    expect(result.status).toBe("blocked");
    if (result.status !== "blocked") throw new Error("esperado blocked");
    expect(result.reasonCode).toBe("incomplete_contract");
  });

  test("6b. contrato incompleto (CTA sem requestedClaimIds) → incomplete_contract", () => {
    const result = buildResponseTemplate(makeInput({ cta: { requestedClaimIds: [] } }));
    expect(result.status).toBe("blocked");
    if (result.status !== "blocked") throw new Error("esperado blocked");
    expect(result.reasonCode).toBe("incomplete_contract");
  });

  test("7. entityRef obrigatória ausente → required_entity_missing", () => {
    const result = buildResponseTemplate(
      makeInput({ context: { entityRefs: ["study:EDMONDSON-1999"] } }),
    );
    expect(result.status).toBe("blocked");
    if (result.status !== "blocked") throw new Error("esperado blocked");
    expect(result.reasonCode).toBe("required_entity_missing");
  });

  test("8. entityRef fora da allowlist semântica → k_anonymity_not_satisfied", () => {
    const result = buildResponseTemplate(
      makeInput({
        context: {
          entityRefs: ["mechanism:MECH-VOICE-001", "study:EDMONDSON-1999", "respondent:anon-42"],
        },
      }),
    );
    expect(result.status).toBe("blocked");
    if (result.status !== "blocked") throw new Error("esperado blocked");
    expect(result.reasonCode).toBe("k_anonymity_not_satisfied");
  });

  test("9. Policy Gate negado → policy_gate_denied", () => {
    const result = buildResponseTemplate(makeInput({ policyGate: { allowed: false } }));
    expect(result.status).toBe("blocked");
    if (result.status !== "blocked") throw new Error("esperado blocked");
    expect(result.reasonCode).toBe("policy_gate_denied");
  });

  test("10. claim obrigatória não autorizada pelo Policy Gate → claim_not_allowed", () => {
    const result = buildResponseTemplate(
      makeInput({ policyGate: { allowed: true, allowedClaimIds: [] } }),
    );
    expect(result.status).toBe("blocked");
    if (result.status !== "blocked") throw new Error("esperado blocked");
    expect(result.reasonCode).toBe("claim_not_allowed");
  });
});

describe("buildResponseTemplate — safeMessage", () => {
  test("nunca revela reasonCode, política interna ou sugestão de contorno", () => {
    const result = buildResponseTemplate(makeInput({ policyGate: { allowed: false } }));
    if (result.status !== "blocked") throw new Error("esperado blocked");
    expect(result.safeMessage).not.toContain("policy");
    expect(result.safeMessage).not.toContain("claim");
    expect(result.safeMessage).not.toMatch(/tente|contorne|use outro/i);
    expect(result.usedClaimIds).toEqual([]);
  });
});

describe("buildResponseTemplate — classificação derivada, nunca hardcoded", () => {
  test("REAL no contexto propaga REAL na resposta", () => {
    const result = buildResponseTemplate(makeInput({ context: { productStatus: "REAL" } }));
    if (result.status !== "allowed") throw new Error("esperado allowed");
    expect(result.classification).toBe("REAL");
  });

  test("PARCIAL no contexto propaga PARCIAL na resposta", () => {
    const result = buildResponseTemplate(makeInput({ context: { productStatus: "PARCIAL" } }));
    if (result.status !== "allowed") throw new Error("esperado allowed");
    expect(result.classification).toBe("PARCIAL");
  });

  test("DEMO no contexto propaga DEMO na resposta", () => {
    const result = buildResponseTemplate(makeInput({ context: { productStatus: "DEMO" } }));
    if (result.status !== "allowed") throw new Error("esperado allowed");
    expect(result.classification).toBe("DEMO");
  });

  test("ROADMAP (ou qualquer valor fora de REAL/PARCIAL/DEMO) cai no fallback seguro DEMO — nunca eleva", () => {
    const result = buildResponseTemplate(makeInput({ context: { productStatus: "ROADMAP" } }));
    if (result.status !== "allowed") throw new Error("esperado allowed");
    expect(result.classification).toBe("DEMO");
  });
});

describe("buildResponseTemplate — determinismo e integridade", () => {
  test("duas execuções com a mesma entrada produzem resultado estruturalmente idêntico", () => {
    const input = makeInput();
    const first = buildResponseTemplate(input);
    const second = buildResponseTemplate(input);
    expect(first).toEqual(second);
  });

  test("não muta os objetos de entrada", () => {
    const input = makeInput();
    const snapshotBefore = JSON.stringify(input);
    buildResponseTemplate(input);
    expect(JSON.stringify(input)).toBe(snapshotBefore);
  });

  test("usedClaimIds é sempre subconjunto de policyGate.allowedClaimIds", () => {
    const result = buildResponseTemplate(makeInput());
    if (result.status !== "allowed") throw new Error("esperado allowed");
    const gate = makePolicyGate();
    for (const id of result.usedClaimIds) {
      expect(gate.allowedClaimIds).toContain(id);
    }
  });
});

describe("buildResponseTemplate — conteúdo governado, não texto livre", () => {
  test("não contém conteúdo individual (nome, resposta ou identificação de pessoa)", () => {
    const result = buildResponseTemplate(makeInput());
    if (result.status !== "allowed") throw new Error("esperado allowed");
    const allText = [result.summary, ...result.guidance, ...result.limitations].join(" ");
    expect(allText).not.toMatch(/\b(nome completo|CPF|e-mail pessoal|respondente [A-Z0-9]+)\b/i);
  });

  test("não promete resultado emocional absoluto ('sem medo', 'garante')", () => {
    const result = buildResponseTemplate(makeInput());
    if (result.status !== "allowed") throw new Error("esperado allowed");
    const allText = [result.summary, ...result.guidance].join(" ");
    expect(allText).not.toMatch(/sem medo|garante(m)?\s/i);
  });

  test("não recomenda ação clínica nem promessa jurídica na orientação (guidance)", () => {
    const result = buildResponseTemplate(makeInput());
    if (result.status !== "allowed") throw new Error("esperado allowed");
    const guidanceText = result.guidance.join(" ");
    expect(guidanceText).not.toMatch(/diagnostic|terapia|processo judicial|blindagem jurídica/i);
  });

  test("limitations declara explicitamente os encaminhamentos e limites obrigatórios", () => {
    const result = buildResponseTemplate(makeInput());
    if (result.status !== "allowed") throw new Error("esperado allowed");
    const limitationsText = result.limitations.join(" ");
    expect(limitationsText).toMatch(/RH, SST, ouvidoria/i);
    expect(limitationsText).toMatch(/correlacional/i);
    expect(limitationsText).toMatch(/desempenho, promoção, punição/i);
    expect(limitationsText).toMatch(/diagnóstico clínico, jurídico ou individual/i);
    expect(limitationsText).toMatch(/quem respondeu a uma pesquisa/i);
  });

  test("não simula persistência — nextActionLabel nunca é 'Registrar esta conversa como rodada'", () => {
    const result = buildResponseTemplate(makeInput());
    if (result.status !== "allowed") throw new Error("esperado allowed");
    expect(result.nextActionLabel).not.toBe("Registrar esta conversa como rodada");
    expect(result.nextActionLabel).not.toMatch(/registrar/i);
  });
});
