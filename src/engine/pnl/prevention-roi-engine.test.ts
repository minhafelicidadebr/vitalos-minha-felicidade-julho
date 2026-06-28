import { describe, expect, test } from "bun:test";
import {
  calculatePreventionRoi,
  attributableReductionFromEvidence,
  type PreventionRoiInput,
} from "./prevention-roi-engine";
import { DEFAULT_INPUTS } from "./pnl-engine";
import type { InterventionEvidence } from "../lab/intervention-evidence-engine";

const base: PreventionRoiInput = {
  costBase: DEFAULT_INPUTS,
  attributableExposureReductionPts: 16,
  scenario: "médio",
};

// ─── Cálculo e transparência ──────────────────────────────────────────────────

describe("calculatePreventionRoi — a conta visível", () => {
  test("toda linha carrega uma fórmula (nada é número nu)", () => {
    const r = calculatePreventionRoi(base);
    expect(r.lines.length).toBeGreaterThanOrEqual(4);
    for (const line of r.lines) {
      expect(line.formula.length).toBeGreaterThan(8);
    }
  });

  test("parcela psicossocial = (absenteísmo + turnover) × fração", () => {
    const r = calculatePreventionRoi(base);
    const abs = r.lines.find((l) => l.id === "absenteeism_base")!.value;
    const turn = r.lines.find((l) => l.id === "turnover_base")!.value;
    expect(r.psychosocialBaselineCost).toBe(Math.round((abs + turn) * 0.25));
  });

  test("custo evitado = parcela psicossocial × fator de prevenção", () => {
    const r = calculatePreventionRoi(base);
    expect(r.avoidedCostYear).toBe(Math.round(r.psychosocialBaselineCost * r.preventionFactor));
  });

  test("custo evitado é positivo com redução atribuível positiva", () => {
    expect(calculatePreventionRoi(base).avoidedCostYear).toBeGreaterThan(0);
  });
});

// ─── Honestidade ──────────────────────────────────────────────────────────────

describe("calculatePreventionRoi — honestidade", () => {
  test("redução ≤ 0 → custo evitado zero (sem melhora atribuível, sem retorno)", () => {
    const r = calculatePreventionRoi({ ...base, attributableExposureReductionPts: 0 });
    expect(r.avoidedCostYear).toBe(0);
    const neg = calculatePreventionRoi({ ...base, attributableExposureReductionPts: -10 });
    expect(neg.avoidedCostYear).toBe(0);
  });

  test("cenário em banda: conservador < médio < otimista", () => {
    const cons = calculatePreventionRoi({ ...base, scenario: "conservador" }).avoidedCostYear;
    const med = calculatePreventionRoi({ ...base, scenario: "médio" }).avoidedCostYear;
    const oti = calculatePreventionRoi({ ...base, scenario: "otimista" }).avoidedCostYear;
    expect(cons).toBeLessThan(med);
    expect(med).toBeLessThan(oti);
  });

  test("fator de prevenção tem teto (mesmo redução enorme + otimista não estoura)", () => {
    const r = calculatePreventionRoi({
      ...base,
      attributableExposureReductionPts: 100,
      scenario: "otimista",
    });
    expect(r.preventionFactor).toBeLessThanOrEqual(0.5);
  });

  test("fração psicossocial é ajustável e move a baseline", () => {
    const low = calculatePreventionRoi({ ...base, psychosocialAttributableFraction: 0.1 });
    const high = calculatePreventionRoi({ ...base, psychosocialAttributableFraction: 0.4 });
    expect(high.psychosocialBaselineCost).toBeGreaterThan(low.psychosocialBaselineCost);
  });

  test("disclaimer nega promessa e causalidade", () => {
    const r = calculatePreventionRoi(base);
    expect(r.disclaimer).toContain("NÃO promessa");
    expect(r.disclaimer.toLowerCase()).toContain("causal");
  });
});

// ─── Composição com a evidência de intervenção ────────────────────────────────

describe("attributableReductionFromEvidence — só o que é atribuível", () => {
  function ev(overrides: Partial<InterventionEvidence>): InterventionEvidence {
    return {
      interventionId: "x",
      label: "X",
      targetDimensionId: "demands_quant",
      targetLabel: "Demandas",
      measured: true,
      firstLoad: 80,
      lastLoad: 58,
      targetImprovement: 22,
      secularDrift: 6,
      netEffect: 16,
      verdict: { grossDelta: 22, netEffect: 16, verdict: "confirmado", confidenceTier: "indicativo", effectMagnitude: "moderado", withinHypothesis: true, reportable: true, n: 403, note: "" },
      note: "",
      disclaimer: "",
      ...overrides,
    };
  }

  test("soma os netEffects positivos, reportáveis e medidos", () => {
    const total = attributableReductionFromEvidence([
      ev({ netEffect: 16 }),
      ev({ netEffect: 8 }),
    ]);
    expect(total).toBe(24);
  });

  test("ignora não-medido, não-reportável e netEffect ≤ 0", () => {
    const total = attributableReductionFromEvidence([
      ev({ netEffect: 10 }),
      ev({ measured: false, verdict: null }), // não medido
      ev({ netEffect: -5 }), // piorou
      ev({ verdict: { grossDelta: 0, netEffect: 4, verdict: "protegido", confidenceTier: "oculto", effectMagnitude: null, withinHypothesis: null, reportable: false, n: 3, note: "" }, netEffect: 4 }), // protegido
    ]);
    expect(total).toBe(10);
  });

  test("compõe ponta a ponta: evidência → redução atribuível → custo evitado", () => {
    const reduction = attributableReductionFromEvidence([ev({ netEffect: 16 }), ev({ netEffect: 4 })]);
    const roi = calculatePreventionRoi({ ...base, attributableExposureReductionPts: reduction });
    expect(roi.attributableExposureReductionPts).toBe(20);
    expect(roi.avoidedCostYear).toBeGreaterThan(0);
  });
});
