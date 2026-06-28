import { describe, expect, test } from "bun:test";
import { buildCycleProof } from "./cycle-proof.server";

// Capstone: prova que a Prova de Ciclo compõe longitudinal + evidência + ROI numa
// leitura única e honesta.

describe("buildCycleProof — composição ponta a ponta (enterprise)", () => {
  const proof = buildCycleProof("enterprise");

  test("MEDIR: compõe a leitura longitudinal (2 ciclos)", () => {
    expect(proof.cycleCount).toBe(2);
    expect(proof.cycleLabels).toEqual(["2025-01", "2026-01"]);
    expect(proof.overallDirection).not.toBeNull();
  });

  test("PROVAR: avalia as intervenções ligadas às dimensões", () => {
    expect(proof.interventions.length).toBeGreaterThan(0);
    // demands_quant melhorou muito → ao menos uma intervenção com efeito atribuível
    expect(proof.interventionsWithEffect).toBeGreaterThan(0);
  });

  test("CUSTO: redução atribuível positiva gera ROI de prevenção com fórmula", () => {
    expect(proof.attributableReductionPts).toBeGreaterThan(0);
    expect(proof.preventionRoi).not.toBeNull();
    expect(proof.preventionRoi!.avoidedCostYear).toBeGreaterThan(0);
    expect(proof.preventionRoi!.lines.every((l) => l.formula.length > 0)).toBe(true);
  });

  test("SÍNTESE: veredicto coerente e headline com o custo evitado", () => {
    expect(["comprovado", "parcial"]).toContain(proof.verdict);
    expect(proof.headline).toContain("R$");
    expect(proof.headline).toContain("2025-01 → 2026-01");
  });

  test("a redução atribuível = soma dos netEffects positivos das intervenções medidas", () => {
    const manual = proof.interventions
      .filter((e) => e.measured && (e.netEffect ?? 0) > 0 && e.verdict?.reportable)
      .reduce((s, e) => s + (e.netEffect ?? 0), 0);
    expect(proof.attributableReductionPts).toBe(manual);
  });
});

describe("buildCycleProof — honestidade", () => {
  test("intervenção em dimensão que piorou (work_pace) não conta como efeito", () => {
    const proof = buildCycleProof("enterprise");
    const ritmo = proof.interventions.find((e) => e.targetDimensionId === "work_pace");
    expect(ritmo).toBeDefined();
    expect((ritmo!.netEffect ?? 0) <= 0).toBe(true);
  });

  test("disclaimer nega causalidade e promessa", () => {
    const proof = buildCycleProof("enterprise");
    expect(proof.disclaimer.toLowerCase()).toContain("causalidade");
    expect(proof.disclaimer).toContain("estimativas");
  });

  test("pack sem histórico → sem_dados, sem inventar prova", () => {
    const proof = buildCycleProof("government");
    expect(proof.verdict).toBe("sem_dados");
    expect(proof.cycleCount).toBe(0);
    expect(proof.preventionRoi).toBeNull();
    expect(proof.attributableReductionPts).toBe(0);
  });

  test("determinístico: duas chamadas produzem a mesma prova", () => {
    const a = buildCycleProof("enterprise");
    const b = buildCycleProof("enterprise");
    expect(a.headline).toBe(b.headline);
    expect(a.attributableReductionPts).toBe(b.attributableReductionPts);
  });
});
