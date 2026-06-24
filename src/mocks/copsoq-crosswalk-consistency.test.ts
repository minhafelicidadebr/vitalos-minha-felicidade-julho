import { describe, expect, test } from "bun:test";
import { getWaveSurvey } from "./survey-mock";
import { NR1_CROSSWALK } from "./nr1-crosswalk-mock";

// Fonte única survey ↔ crosswalk: cada item COPSOQ aplicado no runtime deve mapear a uma
// dimensão canônica do NR1_CROSSWALK (pelo pillarId === dimension.id). Isto garante que a
// resposta capturada possa alimentar rankDriversByExposure sem tradução ad-hoc — compor, não
// duplicar (Fable 5 §5.1). Se alguém renomear uma dimensão sem alinhar o survey, isto falha.

const COPSOQ = getWaveSurvey("enterprise", "COPSOQ")!;

// Dimensões COPSOQ canônicas no crosswalk (exposição + desfecho).
const COPSOQ_DIMS = NR1_CROSSWALK.dimensions.filter((d) => d.instrument === "copsoq");
const EXPOSURE_DIMS = COPSOQ_DIMS.filter((d) => !d.isOutcome);
const OUTCOME_DIMS = COPSOQ_DIMS.filter((d) => d.isOutcome);

const DIM_IDS = new Set(COPSOQ_DIMS.map((d) => d.id));
const OUTCOME_IDS = new Set(OUTCOME_DIMS.map((d) => d.id));

// Dimensões de exposição cuja frequência ALTA = recurso (direto, sem reverse).
const RESOURCE_DIMS = new Set([
  "influence",
  "meaning",
  "predictability",
  "role_clarity",
  "leadership_quality",
  "social_support",
  "recognition",
  "community",
]);

describe("COPSOQ ↔ crosswalk — cobertura dimensional integral", () => {
  test("serve exatamente 41 itens (cobertura estrutural integral)", () => {
    expect(COPSOQ.items).toHaveLength(41);
  });

  test("todo item COPSOQ mapeia a uma dimensão canônica do crosswalk", () => {
    for (const item of COPSOQ.items) {
      expect(DIM_IDS.has(item.pillarId)).toBe(true);
    }
  });

  test("todas as 12 dimensões de exposição da NR-1 estão cobertas", () => {
    const covered = new Set(COPSOQ.items.map((i) => i.pillarId));
    for (const dim of EXPOSURE_DIMS) {
      expect(covered.has(dim.id)).toBe(true);
    }
    expect(EXPOSURE_DIMS).toHaveLength(12);
  });

  test("os 2 desfechos (burnout, comportamentos ofensivos) estão cobertos", () => {
    const covered = new Set(COPSOQ.items.map((i) => i.pillarId));
    for (const dim of OUTCOME_DIMS) {
      expect(covered.has(dim.id)).toBe(true);
    }
    expect(OUTCOME_DIMS.map((d) => d.id).sort()).toEqual([
      "burnout",
      "offensive_behaviors",
    ]);
  });

  test("cada dimensão de exposição tem ao menos 2 itens (profundidade de bateria)", () => {
    for (const dim of EXPOSURE_DIMS) {
      const count = COPSOQ.items.filter((i) => i.pillarId === dim.id).length;
      expect(count).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("COPSOQ ↔ crosswalk — direção de pontuação (reverse) honesta", () => {
  test("itens de recurso (influência, sentido, apoio…) são diretos, sem reverse", () => {
    for (const item of COPSOQ.items) {
      if (RESOURCE_DIMS.has(item.pillarId)) {
        expect(item.reverse ?? false).toBe(false);
      }
    }
  });

  test("itens de exigência, insegurança e desfecho são reverse (frequência alta = pior)", () => {
    const reverseDims = new Set([
      "demands_quant",
      "work_pace",
      "demands_emotional",
      "insecurity",
      ...OUTCOME_IDS,
    ]);
    for (const item of COPSOQ.items) {
      if (reverseDims.has(item.pillarId)) {
        expect(item.reverse).toBe(true);
      }
    }
  });
});

describe("COPSOQ ↔ crosswalk — separação sagrada Domínio B", () => {
  test("desfechos são medidos como itens, mas o crosswalk nunca os usa como célula de driver", () => {
    // A medição do desfecho (burnout/assédio) é legítima no Domínio B; o que é proibido é
    // tratá-lo como ALVO de intervenção (célula de driver). Aqui confirmamos os dois lados:
    // (1) há itens medindo desfechos; (2) nenhuma célula do crosswalk aponta a um desfecho.
    const outcomeItems = COPSOQ.items.filter((i) => OUTCOME_IDS.has(i.pillarId));
    expect(outcomeItems.length).toBeGreaterThan(0);

    const cellsToOutcomes = NR1_CROSSWALK.cells.filter((c) => OUTCOME_IDS.has(c.dimensionId));
    expect(cellsToOutcomes).toEqual([]);
  });
});
