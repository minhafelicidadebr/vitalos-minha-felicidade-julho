import { describe, expect, test } from "bun:test";
import { computeCost, computeRoi, DEFAULT_PARAMS } from "./impact-calc";

describe("impact-calc — custo da inação (números dos benchmarks)", () => {
  const cost = computeCost(DEFAULT_PARAMS);

  test("massa salarial anual = colaboradores × salário × 12", () => {
    expect(cost.annualPayroll).toBe(30_000_000);
  });

  test("as 4 linhas batem com as fórmulas explícitas", () => {
    const byId = Object.fromEntries(cost.lines.map((l) => [l.id, l.value]));
    expect(byId.turnover).toBe(1_125_000); // 500 × 0,15 × 15000
    expect(byId.absenteeism).toBe(1_200_000); // 30M × 0,04
    expect(byId.presenteeism).toBe(2_400_000); // 30M × 0,08
    expect(byId.productivity).toBe(1_500_000); // 30M × 0,05
  });

  test("total, por mês e por colaborador", () => {
    expect(cost.total).toBe(6_225_000);
    expect(cost.perMonth).toBe(518_750);
    expect(cost.perEmployee).toBe(12_450);
  });
});

describe("impact-calc — ROI potencial", () => {
  const cost = computeCost(DEFAULT_PARAMS);
  const roi = computeRoi(cost, DEFAULT_PARAMS);

  test("investimento ≈ 2% da massa salarial", () => {
    expect(roi.investment).toBe(600_000);
  });

  test("recuperação = 35% dos custos (conservador)", () => {
    expect(roi.recovery).toBe(2_178_750);
  });

  test("ganho líquido e razão de ROI", () => {
    expect(roi.netGain).toBe(1_578_750);
    expect(Math.round(roi.roiRatio * 10) / 10).toBe(3.6);
  });
});
