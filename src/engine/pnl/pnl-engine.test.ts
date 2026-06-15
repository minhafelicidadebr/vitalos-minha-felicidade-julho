import { describe, expect, test } from "bun:test";
import { calculatePnL, DEFAULT_INPUTS, type PnLInputs } from "./pnl-engine";

// Inputs simples e redondos para conferir as fórmulas à mão.
const SIMPLE: PnLInputs = {
  employees: 100,
  avgMonthlySalary: 1_000,
  turnoverRatePctYear: 10,
  replacementCostMultiplier: 2,
  absenteeismDaysPerEmployeeYear: 10,
  presenteeismLossPct: 5,
  workdaysPerYear: 220,
};

// ─── Linhas de custo ─────────────────────────────────────────────────────────

describe("calculatePnL — linhas de custo", () => {
  test("turnover = leavers × salário × multiplicador", () => {
    const r = calculatePnL(SIMPLE, 0, "médio");
    const turnover = r.lines.find((l) => l.id === "turnover")!;
    // 100 × 10% = 10 leavers ; 10 × 1000 × 2 = 20.000
    expect(turnover.value).toBe(20_000);
  });

  test("absenteísmo = colab × dias × salário-dia (salário ÷ 22)", () => {
    const r = calculatePnL(SIMPLE, 0, "médio");
    const abs = r.lines.find((l) => l.id === "absenteeism")!;
    // salário-dia = 1000/22 ≈ 45.4545 ; 100 × 10 × 45.4545 ≈ 45.454,5
    expect(abs.value).toBeCloseTo((100 * 10 * 1000) / 22, 2);
  });

  test("presenteísmo = folha anual × perda%", () => {
    const r = calculatePnL(SIMPLE, 0, "médio");
    const pres = r.lines.find((l) => l.id === "presenteeism")!;
    // folha anual = 100 × 1000 × 12 = 1.200.000 ; × 5% = 60.000
    expect(pres.value).toBe(60_000);
  });

  test("custo total = turnover + absenteísmo + presenteísmo", () => {
    const r = calculatePnL(SIMPLE, 0, "médio");
    const sum =
      r.lines.find((l) => l.id === "turnover")!.value +
      r.lines.find((l) => l.id === "absenteeism")!.value +
      r.lines.find((l) => l.id === "presenteeism")!.value;
    expect(r.totalCurrentCost).toBeCloseTo(sum, 5);
  });

  test("toda linha carrega a fórmula (transparência)", () => {
    const r = calculatePnL(SIMPLE, 50, "médio");
    for (const line of r.lines) {
      expect(typeof line.formula).toBe("string");
      expect(line.formula.length).toBeGreaterThan(0);
    }
  });
});

// ─── Custo evitável e cenários ───────────────────────────────────────────────

describe("calculatePnL — custo evitável", () => {
  test("Δ IVO = 0 → custo evitável = 0", () => {
    const r = calculatePnL(SIMPLE, 0, "médio");
    expect(r.avoidedCost).toBe(0);
  });

  test("Δ IVO 100 pts, cenário médio → 6% do custo total", () => {
    const r = calculatePnL(SIMPLE, 100, "médio");
    expect(r.avoidedCost).toBeCloseTo(r.totalCurrentCost * 0.06, 5);
  });

  test("cenário conservador = metade do médio", () => {
    const med = calculatePnL(SIMPLE, 100, "médio").avoidedCost;
    const cons = calculatePnL(SIMPLE, 100, "conservador").avoidedCost;
    expect(cons).toBeCloseTo(med * 0.5, 5);
  });

  test("cenário otimista = 1.5× o médio", () => {
    const med = calculatePnL(SIMPLE, 100, "médio").avoidedCost;
    const otim = calculatePnL(SIMPLE, 100, "otimista").avoidedCost;
    expect(otim).toBeCloseTo(med * 1.5, 5);
  });

  test("custo evitável escala linearmente com Δ IVO", () => {
    const d100 = calculatePnL(SIMPLE, 100, "médio").avoidedCost;
    const d200 = calculatePnL(SIMPLE, 200, "médio").avoidedCost;
    expect(d200).toBeCloseTo(d100 * 2, 5);
  });
});

// ─── Custo da inação ─────────────────────────────────────────────────────────

describe("calculatePnL — inação", () => {
  test("inação 12m = custo total × 1.08", () => {
    const r = calculatePnL(SIMPLE, 0, "médio");
    expect(r.inactionCost12m).toBeCloseTo(r.totalCurrentCost * 1.08, 5);
  });

  test("inação independe de Δ IVO e cenário", () => {
    const a = calculatePnL(SIMPLE, 0, "conservador").inactionCost12m;
    const b = calculatePnL(SIMPLE, 300, "otimista").inactionCost12m;
    expect(a).toBeCloseTo(b, 5);
  });
});

// ─── Defaults ────────────────────────────────────────────────────────────────

describe("calculatePnL — defaults", () => {
  test("DEFAULT_INPUTS produz custos positivos e coerentes", () => {
    const r = calculatePnL(DEFAULT_INPUTS, 80, "médio");
    expect(r.totalCurrentCost).toBeGreaterThan(0);
    expect(r.avoidedCost).toBeGreaterThan(0);
    expect(r.avoidedCost).toBeLessThan(r.totalCurrentCost);
    expect(r.scenario).toBe("médio");
  });
});
