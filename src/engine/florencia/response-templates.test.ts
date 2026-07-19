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

// ─── suggest-observation-v1 (momento Evoluir) ────────────────────────────────

function makeObservationInput(
  overrides: Partial<{
    context: Partial<ResolvedFlorenciaContext>;
    cta: Partial<CtaResolution>;
    policyGate: Partial<PolicyGateResult>;
  }> = {},
): FlorenciaResponseTemplateInput {
  return {
    context: makeContext({
      ctaId: "CTA-SUGGEST-OBSERVATION",
      section: "observar-evoluir",
      intent: "suggest_observation",
      label: "O que devemos observar?",
      icon: "eye",
      entityRefs: ["mechanism:MECH-VOICE-001", "study:LDR-007"],
      suggestedQuestions: ["Quais são os sinais de que está funcionando?"],
      requestedClaimIds: ["CLAIM-LDR007-VOICE-002"],
      candidateSkillIds: ["SKILL-EVOLVE-MONITOR"],
      mode: "evoluir",
      ...overrides.context,
    }),
    cta: makeCta({
      ctaId: "CTA-SUGGEST-OBSERVATION",
      intent: "suggest_observation",
      label: "O que devemos observar?",
      icon: "eye",
      suggestedQuestions: ["Quais são os sinais de que está funcionando?"],
      requestedClaimIds: ["CLAIM-LDR007-VOICE-002"],
      candidateSkillIds: ["SKILL-EVOLVE-MONITOR"],
      ...overrides.cta,
    }),
    policyGate: makePolicyGate({
      allowedClaimIds: ["CLAIM-LDR007-VOICE-002"],
      allowedSkillIds: ["SKILL-EVOLVE-MONITOR"],
      ...overrides.policyGate,
    }),
  };
}

describe("buildResponseTemplate — suggest-observation-v1 (Evoluir)", () => {
  test("contexto válido produz o template de observação com o claim LDR-007", () => {
    const result = buildResponseTemplate(makeObservationInput());
    expect(result.status).toBe("allowed");
    if (result.status !== "allowed") throw new Error("esperado allowed");
    expect(result.templateId).toBe("suggest-observation-v1");
    expect(result.title).toBe("O que devemos observar?");
    expect(result.usedClaimIds).toEqual(["CLAIM-LDR007-VOICE-002"]);
    expect(result.classification).toBe("DEMO");
  });

  test("guidance é processo, nunca promessa: não afirma efeito garantido nem métrica de saúde", () => {
    const result = buildResponseTemplate(makeObservationInput());
    if (result.status !== "allowed") throw new Error("esperado allowed");
    const guidanceText = result.guidance.join(" ");
    expect(guidanceText).not.toMatch(/garante(m)?\s|assegura|comprova/i);
    expect(guidanceText).not.toMatch(/adoecimento|saúde mental|bem-estar médio/i);
    expect(guidanceText).toMatch(/indicadores de processo/i);
  });

  test("limitations carrega o limite do claim (adesão/contexto) e nega o prohibited_claim registrado", () => {
    const result = buildResponseTemplate(makeObservationInput());
    if (result.status !== "allowed") throw new Error("esperado allowed");
    const limitationsText = result.limitations.join(" ");
    // Derivado do safe_claim/caveat de CLAIM-LDR007-VOICE-002 — nunca mais forte.
    expect(limitationsText).toMatch(/depende de adesão e contexto de implementação/i);
    // Proteção contra o prohibited_claim "ausência de adesão prova que a prática não funciona".
    expect(limitationsText).toMatch(/Ausência de adesão não prova/i);
    expect(limitationsText).toMatch(/desempenho, promoção, punição/i);
  });

  test("claim errado para este intent bloqueia com claim_not_allowed (nunca herda o claim da conversa)", () => {
    const result = buildResponseTemplate(
      makeObservationInput({
        cta: { requestedClaimIds: ["CLAIM-EDMONDSON1999-VOICE-002"] },
        policyGate: { allowedClaimIds: ["CLAIM-EDMONDSON1999-VOICE-002"] },
      }),
    );
    expect(result.status).toBe("blocked");
    if (result.status !== "blocked") throw new Error("esperado blocked");
    expect(result.reasonCode).toBe("claim_not_allowed");
  });

  test("intent sem template na tabela continua bloqueando com unsupported_intent (explain_mechanism é passaporte, não drawer)", () => {
    const result = buildResponseTemplate(
      makeObservationInput({
        context: { intent: "explain_mechanism" },
        cta: { intent: "explain_mechanism" },
      }),
    );
    expect(result.status).toBe("blocked");
    if (result.status !== "blocked") throw new Error("esperado blocked");
    expect(result.reasonCode).toBe("unsupported_intent");
  });

  test("intent do contexto divergente do intent da CTA bloqueia (sem template cruzado)", () => {
    const result = buildResponseTemplate(
      makeObservationInput({ cta: { intent: "prepare_conversation" } }),
    );
    expect(result.status).toBe("blocked");
    if (result.status !== "blocked") throw new Error("esperado blocked");
    expect(result.reasonCode).toBe("unsupported_intent");
  });
});

// ─── create-team-mission-v1 e organize-evidence-v1 (5 CTAs completas) ────────

function makeIntentInput(
  intent: "create_team_mission" | "organize_evidence",
  claimId: string,
  section: string,
  overrides: Partial<{
    context: Partial<ResolvedFlorenciaContext>;
    cta: Partial<CtaResolution>;
    policyGate: Partial<PolicyGateResult>;
  }> = {},
): FlorenciaResponseTemplateInput {
  return {
    context: makeContext({
      section,
      intent,
      entityRefs: ["mechanism:MECH-VOICE-001", "study:LDR-007"],
      requestedClaimIds: [claimId],
      ...overrides.context,
    }),
    cta: makeCta({
      intent,
      requestedClaimIds: [claimId],
      ...overrides.cta,
    }),
    policyGate: makePolicyGate({
      allowedClaimIds: [claimId],
      ...overrides.policyGate,
    }),
  };
}

describe("buildResponseTemplate — create-team-mission-v1 (missão)", () => {
  test("contexto válido produz o template da missão com o claim LDR-007-001", () => {
    const result = buildResponseTemplate(
      makeIntentInput("create_team_mission", "CLAIM-LDR007-VOICE-001", "missao-equipe"),
    );
    expect(result.status).toBe("allowed");
    if (result.status !== "allowed") throw new Error("esperado allowed");
    expect(result.templateId).toBe("create-team-mission-v1");
    expect(result.usedClaimIds).toEqual(["CLAIM-LDR007-VOICE-001"]);
    expect(result.requiresHumanReview).toBe(false);
  });

  test("limitations negam o prohibited_claim registrado ('treinar líderes garante bem-estar')", () => {
    const result = buildResponseTemplate(
      makeIntentInput("create_team_mission", "CLAIM-LDR007-VOICE-001", "missao-equipe"),
    );
    if (result.status !== "allowed") throw new Error("esperado allowed");
    const limitationsText = result.limitations.join(" ");
    expect(limitationsText).toMatch(/não garante bem-estar da equipe/i);
    expect(limitationsText).toMatch(/análogo, não idêntico/i);
    expect(limitationsText).toMatch(/desempenho, promoção ou remuneração/i);
  });

  test("guidance é adesão voluntária e co-desenho — nunca obrigação nem exposição forçada", () => {
    const result = buildResponseTemplate(
      makeIntentInput("create_team_mission", "CLAIM-LDR007-VOICE-001", "missao-equipe"),
    );
    if (result.status !== "allowed") throw new Error("esperado allowed");
    const guidanceText = result.guidance.join(" ");
    expect(guidanceText).toMatch(/voluntária/i);
    expect(guidanceText).toMatch(/Co-desenhar/i);
    expect(guidanceText).not.toMatch(/obrigatóri|garante/i);
  });
});

describe("buildResponseTemplate — organize-evidence-v1 (prévia ESG)", () => {
  test("contexto válido produz o template de organização com requiresHumanReview do gate", () => {
    const result = buildResponseTemplate(
      makeIntentInput("organize_evidence", "CLAIM-EDMONDSON1999-VOICE-003", "organizar-esg", {
        policyGate: { requiresHumanReview: true },
      }),
    );
    expect(result.status).toBe("allowed");
    if (result.status !== "allowed") throw new Error("esperado allowed");
    expect(result.templateId).toBe("organize-evidence-v1");
    expect(result.usedClaimIds).toEqual(["CLAIM-EDMONDSON1999-VOICE-003"]);
    expect(result.requiresHumanReview).toBe(true);
  });

  test("limitations negam os dois prohibited_claims registrados (adoecimento e produtividade)", () => {
    const result = buildResponseTemplate(
      makeIntentInput("organize_evidence", "CLAIM-EDMONDSON1999-VOICE-003", "organizar-esg"),
    );
    if (result.status !== "allowed") throw new Error("esperado allowed");
    const limitationsText = result.limitations.join(" ");
    expect(limitationsText).toMatch(/não prova redução de adoecimento/i);
    expect(limitationsText).toMatch(/nem aumento de produtividade/i);
    expect(limitationsText).toMatch(/mudança observada, nunca impacto garantido/i);
    expect(limitationsText).toMatch(/revisão humana antes de uso real/i);
  });

  test("guidance nunca promete impacto — só separação de camadas e mudança observada", () => {
    const result = buildResponseTemplate(
      makeIntentInput("organize_evidence", "CLAIM-EDMONDSON1999-VOICE-003", "organizar-esg"),
    );
    if (result.status !== "allowed") throw new Error("esperado allowed");
    const guidanceText = result.guidance.join(" ");
    expect(guidanceText).not.toMatch(/prova de impacto do piloto atual\b.*✓|garante|comprova que/i);
    expect(guidanceText).toMatch(/nunca como prova de impacto/i);
    expect(guidanceText).toMatch(/mudança observada/i);
  });

  test("claim de outro uso não destrava a organização (claim_not_allowed)", () => {
    const result = buildResponseTemplate(
      makeIntentInput("organize_evidence", "CLAIM-EDMONDSON1999-VOICE-001", "organizar-esg"),
    );
    expect(result.status).toBe("blocked");
    if (result.status !== "blocked") throw new Error("esperado blocked");
    expect(result.reasonCode).toBe("claim_not_allowed");
  });
});

describe("buildResponseTemplate — requiresHumanReview repassado, nunca decidido aqui", () => {
  test("template comum com gate marcando revisão repassa true sem alterar o resto", () => {
    const result = buildResponseTemplate(
      makeInput({ policyGate: { requiresHumanReview: true } }),
    );
    if (result.status !== "allowed") throw new Error("esperado allowed");
    expect(result.requiresHumanReview).toBe(true);
    expect(result.templateId).toBe("prepare-safe-conversation-v1");
  });

  test("gate sem revisão repassa false", () => {
    const result = buildResponseTemplate(makeInput());
    if (result.status !== "allowed") throw new Error("esperado allowed");
    expect(result.requiresHumanReview).toBe(false);
  });
});
