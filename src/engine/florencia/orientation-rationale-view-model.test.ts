// Testes do Orientation Rationale View Model (SAFE-VOICE-BRIDGE §5, Fatia B).
//
// Cobre os 14 cenários exigidos na autorização: rationale válido/ausente,
// fail-closed (skill sem nome curado), ausência de IDs internos no texto
// público, ausência de causalidade/personalização/eficácia, referência
// válida/ausente ao Passport, determinismo, imutabilidade, nunca conteúdo
// parcial, não duplicação da função do Passport, ausência de efeitos
// colaterais — mais um teste de integração encadeando a saída real da
// Fatia A (resolveOrientationRationale) através da projeção.

import { describe, expect, test } from "bun:test";
import {
  projectOrientationRationaleViewModel,
  type OrientationRationaleViewModel,
} from "./orientation-rationale-view-model";
import { resolveOrientationRationale } from "./orientation-rationale-engine";
import type { OrientationRationale } from "./orientation-rationale-engine";
import type { SkillLifecycleStatus } from "./skill-status";
import { EVIDENCE_REGISTRY, CLAIM_REGISTRY, MECHANISM_REGISTRY } from "@/domain/evidence/registries";
import { resolveSkillStatusMap } from "@/domain/florencia/skill-status-projection";

function makeRationale(overrides: Partial<OrientationRationale> = {}): OrientationRationale {
  return {
    templateId: "prepare-safe-conversation-v1",
    mechanism: {
      mechanismId: "MECH-VOICE-001",
      name: "Redução do medo interpessoal",
      safeExplanation:
        "Ambientes em que perguntar, discordar e admitir erro recebem resposta não punitiva favorecem comportamentos de aprendizagem.",
      nascente: "seguranca",
    },
    claim: {
      claimId: "CLAIM-EDMONDSON1999-VOICE-002",
      safeClaim: "Claim seguro de teste com pelo menos quarenta caracteres de comprimento útil.",
      studyId: "TRU-006",
    },
    skill: {
      skillId: "SKILL-CONVERSATION-FACILITATOR",
      status: "PARCIAL" as SkillLifecycleStatus,
    },
    ...overrides,
  };
}

// Frases proibidas — literais e variantes próximas das 6 formulações do pedido.
const FORBIDDEN_PATTERNS: RegExp[] = [
  /ia escolheu/i,
  /escolheu (esta|essa) orienta[cç][aã]o para voc[eê]/i,
  /melhor recomenda[cç][aã]o/i,
  /esta [ée] a melhor/i,
  /ci[eê]ncia prova/i,
  /prova que (vai )?funcionar/i,
  /reduzir[aá] o risco/i,
  /esta a[cç][aã]o reduzir/i,
  /identificamos seu perfil/i,
  /esta nascente explica/i,
  /explica seu problema/i,
];

function assertNoForbiddenLanguage(text: string) {
  for (const pattern of FORBIDDEN_PATTERNS) {
    expect(text, `texto "${text}" não pode casar com ${pattern}`).not.toMatch(pattern);
  }
}

// Padrão de id técnico (MECH-/CLAIM-/SKILL-/STUDY-/TRU-/LDR- etc.) — nenhuma
// string de copy pública pode conter algo desse formato.
const ID_SHAPE = /\b[A-Z]{2,}-[A-Z0-9-]+\b/;

describe("projectOrientationRationaleViewModel — caminho válido", () => {
  test("rationale válido produz os 7 campos esperados, com os textos corretos", () => {
    const vm = projectOrientationRationaleViewModel(makeRationale());
    expect(vm).not.toBeNull();
    expect(vm!.title).toBe("Como esta orientação foi selecionada?");
    expect(vm!.selectionExplanation).toContain("regra determinística");
    expect(vm!.mechanismPublicName).toBe("Redução do medo interpessoal");
    expect(vm!.mechanismSafeExplanation).toContain("resposta não punitiva");
    expect(vm!.evidenceSummary).toBe("Claim seguro de teste com pelo menos quarenta caracteres de comprimento útil.");
    expect(vm!.skillPublicName).toBe("Facilitador Conversacional");
  });
});

describe("projectOrientationRationaleViewModel — fail-closed", () => {
  test("rationale ausente (null) → ViewModel null", () => {
    expect(projectOrientationRationaleViewModel(null)).toBeNull();
  });

  test("Skill sem nome público curado → ViewModel null inteiro (não expõe o skillId cru)", () => {
    const vm = projectOrientationRationaleViewModel(
      makeRationale({ skill: { skillId: "SKILL-SEM-NOME-CURADO", status: "PARCIAL" } }),
    );
    expect(vm).toBeNull();
  });

  test("nunca devolve conteúdo parcial — o cenário acima é null, nunca um objeto com skillPublicName vazio", () => {
    const vm = projectOrientationRationaleViewModel(
      makeRationale({ skill: { skillId: "SKILL-SEM-NOME-CURADO", status: "PARCIAL" } }),
    );
    expect(vm).toBeNull();
    expect(vm).not.toEqual(expect.objectContaining({ skillPublicName: "" }));
  });
});

describe("projectOrientationRationaleViewModel — separação de campos (nenhum ID interno na copy pública)", () => {
  test("nenhuma string pública contém mechanismId, claimId, studyId ou skillId", () => {
    const vm = projectOrientationRationaleViewModel(makeRationale())!;
    const publicStrings = [
      vm.title,
      vm.selectionExplanation,
      vm.mechanismPublicName,
      vm.mechanismSafeExplanation,
      vm.evidenceSummary,
      vm.skillPublicName,
    ];
    for (const text of publicStrings) {
      expect(text, `"${text}" não pode conter formato de id técnico`).not.toMatch(ID_SHAPE);
      expect(text).not.toContain("MECH-VOICE-001");
      expect(text).not.toContain("CLAIM-EDMONDSON1999-VOICE-002");
      expect(text).not.toContain("SKILL-CONVERSATION-FACILITATOR");
      expect(text).not.toContain("TRU-006");
    }
  });

  test("studyId só existe dentro de passportReference (chave estrutural, não texto de copy)", () => {
    const vm = projectOrientationRationaleViewModel(makeRationale())!;
    expect(vm.passportReference?.studyId).toBe("TRU-006");
    // ctaLabel é texto público — precisa ser genérico, sem o id embutido.
    expect(vm.passportReference?.ctaLabel).not.toContain("TRU-006");
  });

  test("nascente NUNCA aparece no ViewModel — campo deliberadamente omitido do contrato", () => {
    const vm = projectOrientationRationaleViewModel(makeRationale())!;
    expect(Object.keys(vm)).not.toContain("nascente");
    expect(JSON.stringify(vm)).not.toContain("seguranca");
  });
});

describe("projectOrientationRationaleViewModel — semântica autorizada (governança/roteamento, nunca causalidade/personalização/eficácia)", () => {
  test("os textos fixos (title, selectionExplanation) não contêm nenhuma formulação proibida", () => {
    const vm = projectOrientationRationaleViewModel(makeRationale())!;
    assertNoForbiddenLanguage(vm.title);
    assertNoForbiddenLanguage(vm.selectionExplanation);
  });

  test("selectionExplanation afirma explicitamente que NÃO é personalização por IA", () => {
    const vm = projectOrientationRationaleViewModel(makeRationale())!;
    expect(vm.selectionExplanation.toLowerCase()).toContain("não");
    expect(vm.selectionExplanation.toLowerCase()).toMatch(/intelig[eê]ncia artificial/);
  });

  test("textos fixos são idênticos para rationales completamente diferentes — nunca variam por conteúdo (não é personalização disfarçada)", () => {
    const vmA = projectOrientationRationaleViewModel(makeRationale())!;
    const vmB = projectOrientationRationaleViewModel(
      makeRationale({
        templateId: "organize-evidence-v1",
        mechanism: { ...makeRationale().mechanism, name: "Outro mecanismo qualquer" },
        claim: { claimId: "CLAIM-OUTRO", safeClaim: "Outro claim seguro qualquer com texto suficiente.", studyId: "OUTRO-STUDY" },
      }),
    )!;
    expect(vmA.title).toBe(vmB.title);
    expect(vmA.selectionExplanation).toBe(vmB.selectionExplanation);
  });

  test("conteúdo trazido dos registries (mechanismSafeExplanation, evidenceSummary) também passa no filtro de linguagem proibida", () => {
    const vm = projectOrientationRationaleViewModel(makeRationale())!;
    assertNoForbiddenLanguage(vm.mechanismSafeExplanation);
    assertNoForbiddenLanguage(vm.evidenceSummary);
  });
});

describe("projectOrientationRationaleViewModel — referência ao Evidence Passport", () => {
  test("referência válida quando studyId existe", () => {
    const vm = projectOrientationRationaleViewModel(makeRationale())!;
    expect(vm.passportReference).toEqual({
      studyId: "TRU-006",
      ctaLabel: "Ver a evidência científica completa",
    });
  });

  test("Passport ausente/inválido (studyId vazio) → passportReference null, mas o RESTO do ViewModel continua válido", () => {
    const vm = projectOrientationRationaleViewModel(
      makeRationale({ claim: { claimId: "CLAIM-EDMONDSON1999-VOICE-002", safeClaim: "Claim válido.", studyId: "   " } }),
    );
    expect(vm).not.toBeNull();
    expect(vm!.passportReference).toBeNull();
    expect(vm!.mechanismPublicName).toBe("Redução do medo interpessoal"); // resto continua íntegro
  });
});

describe("projectOrientationRationaleViewModel — não duplica a função do Evidence Passport", () => {
  test("o ViewModel tem exatamente os 7 campos esperados — sem lines/level/trusted/estrutura de passaporte", () => {
    const vm = projectOrientationRationaleViewModel(makeRationale())!;
    expect(Object.keys(vm).sort()).toEqual(
      [
        "title",
        "selectionExplanation",
        "mechanismPublicName",
        "mechanismSafeExplanation",
        "evidenceSummary",
        "skillPublicName",
        "passportReference",
      ].sort(),
    );
    expect(vm).not.toHaveProperty("lines");
    expect(vm).not.toHaveProperty("level");
    expect(vm).not.toHaveProperty("trusted");
    expect(vm).not.toHaveProperty("caveat");
  });
});

describe("projectOrientationRationaleViewModel — invariantes de engenharia", () => {
  test("imutabilidade — o ViewModel e seus objetos aninhados são frozen", () => {
    const vm = projectOrientationRationaleViewModel(makeRationale());
    expect(vm).not.toBeNull();
    expect(Object.isFrozen(vm)).toBe(true);
    expect(Object.isFrozen(vm!.passportReference)).toBe(true);
  });

  test("determinismo — mesma entrada produz saída estruturalmente idêntica em chamadas repetidas", () => {
    const rationale = makeRationale();
    const first = projectOrientationRationaleViewModel(rationale);
    const second = projectOrientationRationaleViewModel(rationale);
    expect(first).toEqual(second);
  });

  test("ausência de efeitos colaterais — o rationale de entrada não é mutado pela projeção", () => {
    const rationale = makeRationale();
    const snapshot = JSON.parse(JSON.stringify(rationale));
    projectOrientationRationaleViewModel(rationale);
    expect(JSON.parse(JSON.stringify(rationale))).toEqual(snapshot);
  });
});

describe("projectOrientationRationaleViewModel — integração ponta-a-ponta (Fatia A → Fatia B, registries reais)", () => {
  test("a saída real de resolveOrientationRationale projeta um ViewModel válido e seguro", () => {
    const rationale = resolveOrientationRationale(
      {
        templateId: "prepare-safe-conversation-v1",
        requestContext: {
          intendedUse: "prepare_conversation",
          role: "lider",
          segment: "enterprise",
          targetContext: "preparar-conversa",
        },
        candidateSkillIds: ["SKILL-CONVERSATION-FACILITATOR", "SKILL-EVIDENCE-CLAIM-GUARDIAN", "SKILL-PRIVACY-SAFETY-GUARDIAN"],
      },
      {
        evidenceRegistry: EVIDENCE_REGISTRY,
        claimRegistry: CLAIM_REGISTRY,
        mechanisms: MECHANISM_REGISTRY,
        skillStatusMap: resolveSkillStatusMap(),
      },
    );
    const vm = projectOrientationRationaleViewModel(rationale);
    expect(vm).not.toBeNull();
    expect(vm!.mechanismPublicName).toBe("Redução do medo interpessoal");
    expect(vm!.skillPublicName).toBe("Facilitador Conversacional");
    expect(vm!.passportReference).not.toBeNull();
    for (const text of [vm!.title, vm!.selectionExplanation, vm!.mechanismPublicName, vm!.mechanismSafeExplanation, vm!.evidenceSummary, vm!.skillPublicName]) {
      expect(text).not.toMatch(ID_SHAPE);
      assertNoForbiddenLanguage(text);
    }
  });
});
