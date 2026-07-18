// Consistência da trilha Voz Segura × registro congelado (padrão journey-consistency):
// a fonte única é verificada por teste, não por fé. Se alguém trocar um study_id
// por um inexistente — ou o registro deixar de autorizar uma fonte — o gate quebra.

import { describe, expect, test } from "bun:test";
import {
  checkActivityBudget,
  findClaimForStudy,
  resolveStudy,
  trustGate,
  type ClaimRegistry,
  type EvidenceRegistry,
  type IntendedUse,
} from "@/engine/evidence/passport-engine";
import registryJson from "@/domain/evidence/evidence-registry.json";
import claimRegistryJson from "@/domain/evidence/claim-registry.json";
import {
  VOZ_SEGURA_ESG_TRACE,
  VOZ_SEGURA_PROJECT_30D,
  VOZ_SEGURA_QUIZ,
  VOZ_SEGURA_SCENARIO,
  VOZ_SEGURA_TRAIL,
} from "./voz-segura-mock";

const REGISTRY = registryJson as unknown as EvidenceRegistry;
const CLAIM_REGISTRY = claimRegistryJson as unknown as ClaimRegistry;

function allReferencedStudyIds(): string[] {
  return [
    VOZ_SEGURA_TRAIL.budget.primaryStudyId,
    ...VOZ_SEGURA_TRAIL.budget.complementaryStudyIds,
    ...VOZ_SEGURA_QUIZ.map((item) => item.sourceStudyId),
    ...VOZ_SEGURA_SCENARIO.choices.map((choice) => choice.sourceStudyId),
    ...VOZ_SEGURA_PROJECT_30D.studyIds,
    ...VOZ_SEGURA_ESG_TRACE.study_ids,
  ];
}

describe("voz-segura × evidence registry", () => {
  test("todo study_id referenciado existe no registro congelado e passa no trust gate", () => {
    const failures: string[] = [];
    for (const id of new Set(allReferencedStudyIds())) {
      const study = resolveStudy(REGISTRY, id);
      if (!study) {
        failures.push(`${id}: não existe no registro`);
        continue;
      }
      const gate = trustGate(study);
      if (!gate.trusted) failures.push(`${id}: ${gate.reasons.join("; ")}`);
    }
    expect(failures).toEqual([]);
  });

  test("orçamento de evidência da trilha respeita o contrato (1 mecanismo, 1 principal, ≤2 complementares)", () => {
    expect(checkActivityBudget(VOZ_SEGURA_TRAIL.budget).errors).toEqual([]);
  });

  test("só as fontes autorizadas no TASK.md são usadas (TRU-006 e LDR-007, canônicos)", () => {
    const canonical = new Set(
      [...new Set(allReferencedStudyIds())].map((id) => resolveStudy(REGISTRY, id)?.study_id),
    );
    expect([...canonical].sort()).toEqual(["LDR-007", "TRU-006"]);
  });

  // "Todo claim registrado tem superfície, toda superfície tem claim":
  // espelha exatamente a resolução da rota (trustedClaimForUse em voz-segura.tsx)
  // — se um claim da trilha sumir do registry ou parar de passar no gate, quebra
  // aqui, não silenciosamente na tela.
  test("cada uso registrado da trilha resolve para o SEU claim e passa no trust gate", () => {
    const anchors = [
      VOZ_SEGURA_TRAIL.budget.primaryStudyId,
      ...VOZ_SEGURA_TRAIL.budget.complementaryStudyIds,
    ].map((id) => resolveStudy(REGISTRY, id)!);

    function trustedClaimForUse(use: IntendedUse): string | null {
      for (const study of anchors) {
        const claim = findClaimForStudy(REGISTRY, CLAIM_REGISTRY, study, use);
        if (claim && trustGate(study, claim).trusted) return claim.claim_id;
      }
      return null;
    }

    // Superfícies da rota /voz-segura (passaporte usa explain_mechanism por estudo).
    expect(trustedClaimForUse("explain_mechanism")).toBe("CLAIM-EDMONDSON1999-VOICE-001");
    expect(trustedClaimForUse("create_team_mission")).toBe("CLAIM-LDR007-VOICE-001");
    expect(trustedClaimForUse("suggest_observation")).toBe("CLAIM-LDR007-VOICE-002");
    expect(trustedClaimForUse("organize_evidence")).toBe("CLAIM-EDMONDSON1999-VOICE-003");
    // prepare_conversation pertence à FlorêncIA (Policy Gate) — coberto em
    // FlorenciaSafeConversationEntryPoint.test.tsx, não aqui.
  });

  test("nenhum claim do registry aponta para uso sem superfície conhecida na trilha", () => {
    const knownUses: IntendedUse[] = [
      "explain_mechanism",
      "prepare_conversation",
      "create_team_mission",
      "suggest_observation",
      "organize_evidence",
    ];
    for (const claim of CLAIM_REGISTRY.claims) {
      expect(knownUses).toContain(claim.intended_use);
    }
  });

  test("quiz: toda resposta correta existe entre as opções e explicação nunca é vazia", () => {
    for (const item of VOZ_SEGURA_QUIZ) {
      expect(item.options.some((o) => o.id === item.correctOptionId)).toBe(true);
      expect(item.explanation.trim().length).toBeGreaterThan(20);
    }
  });

  test("cenário: bestChoiceId existe e toda escolha tem consequência PROVÁVEL (nunca garantida)", () => {
    expect(
      VOZ_SEGURA_SCENARIO.choices.some((c) => c.id === VOZ_SEGURA_SCENARIO.bestChoiceId),
    ).toBe(true);
    for (const choice of VOZ_SEGURA_SCENARIO.choices) {
      expect(choice.likelyConsequence).not.toMatch(/garantid|sempre acontece|com certeza/i);
    }
  });

  test("projeto 30d: hipótese, contexto elegível, stop rule e fronteira clínica presentes", () => {
    expect(VOZ_SEGURA_PROJECT_30D.hypothesis.length).toBeGreaterThan(40);
    expect(VOZ_SEGURA_PROJECT_30D.eligibleContext).toContain("NÃO elegível");
    expect(VOZ_SEGURA_PROJECT_30D.stopRule).toContain("Interromper");
    expect(VOZ_SEGURA_PROJECT_30D.clinicalBoundary).toContain("não vira profissional clínico");
  });

  test("rastro ESG: linguagem 'mudança observada', limitações declaradas, sem claim de saúde", () => {
    expect(VOZ_SEGURA_ESG_TRACE.reporting_language).toBe("mudanca_observada");
    expect(VOZ_SEGURA_ESG_TRACE.limitations.length).toBeGreaterThanOrEqual(1);
    expect(VOZ_SEGURA_ESG_TRACE.outcome_indicators.every((o) => o.attribution_note.length > 20)).toBe(
      true,
    );
    const text = JSON.stringify(VOZ_SEGURA_ESG_TRACE);
    expect(text).not.toMatch(/reduz adoecimento|melhora a saúde garantid|ROI/i);
  });

  test("claim proibido do registro nunca aparece no conteúdo da trilha", () => {
    // TRU-006 proíbe "segurança psicológica garante desempenho" — o conteúdo
    // pode citar a proibição pedagogicamente no quiz, mas nunca AFIRMÁ-LA.
    const contentText = [
      ...VOZ_SEGURA_QUIZ.map((i) => i.explanation),
      ...VOZ_SEGURA_SCENARIO.choices.map((c) => `${c.likelyConsequence} ${c.mechanismNote}`),
      VOZ_SEGURA_PROJECT_30D.hypothesis,
      VOZ_SEGURA_PROJECT_30D.justification,
    ].join(" ");
    expect(contentText).not.toMatch(/garante desempenho|desempenho garantido/i);
  });
});
