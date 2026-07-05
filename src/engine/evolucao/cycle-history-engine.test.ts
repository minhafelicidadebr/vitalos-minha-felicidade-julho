import { describe, expect, test } from "bun:test";
import {
  buildRegisteredHistory,
  riskLevelFromHighRiskPct,
  type DimensionMeta,
  type RegisteredCycleRow,
} from "./cycle-history-engine";

const DIMENSION_META: DimensionMeta[] = [
  { id: "demands_quant", label: "Exig. quantitativas" },
  { id: "work_pace", label: "Ritmo de trabalho" },
  { id: "burnout", label: "Burnout (desfecho)", isOutcome: true },
];

function row(over: Partial<RegisteredCycleRow> = {}): RegisteredCycleRow {
  return {
    cycleKey: "2026-t1",
    capsuleId: "cap-1",
    waveId: "wave-1",
    instrument: "COPSOQ",
    domain: "B",
    closedOn: "2026-01-22",
    participantCount: 40,
    kAnonymityMin: 5,
    dimensions: {
      demands_quant: { mean: 3.2, high_risk_pct: 70, n: 40 },
      work_pace: { mean: 3.0, high_risk_pct: 45, n: 40 },
    },
    outcomes: {
      burnout: { mean: 2.8, high_risk_pct: 55, n: 40 },
    },
    ...over,
  };
}

describe("riskLevelFromHighRiskPct", () => {
  test("bandas alinhadas com probabilityFromLoad do pgr-engine (40/60/75)", () => {
    expect(riskLevelFromHighRiskPct(10)).toBe("baixo");
    expect(riskLevelFromHighRiskPct(45)).toBe("moderado");
    expect(riskLevelFromHighRiskPct(65)).toBe("alto");
    expect(riskLevelFromHighRiskPct(80)).toBe("critico");
  });
});

describe("buildRegisteredHistory", () => {
  test("produz um capsule por linha, ordenado por closedOn", () => {
    const rows = [
      row({ cycleKey: "2026-t2", closedOn: "2026-06-01" }),
      row({ cycleKey: "2026-t1", closedOn: "2026-01-22" }),
    ];
    const history = buildRegisteredHistory(rows, DIMENSION_META, "enterprise");
    expect(history).toHaveLength(2);
    expect(history[0]!.cohortId).toBe("2026-t1");
    expect(history[1]!.cohortId).toBe("2026-t2");
  });

  test("high_risk_pct vira loadScore diretamente", () => {
    const history = buildRegisteredHistory([row()], DIMENSION_META, "enterprise");
    const dim = history[0]!.dimensions.find((d) => d.dimensionId === "demands_quant")!;
    expect(dim.loadScore).toBe(70);
  });

  test("desfecho (outcome) nunca entra em topDriverIds", () => {
    const history = buildRegisteredHistory([row()], DIMENSION_META, "enterprise");
    expect(history[0]!.topDriverIds).not.toContain("burnout");
    const outcomeDim = history[0]!.dimensions.find((d) => d.dimensionId === "burnout")!;
    expect(outcomeDim.isOutcome).toBe(true);
  });

  test("dimensão sem registro canônico de label é omitida, nunca inventada", () => {
    const withUnknown = row({
      dimensions: { ...row().dimensions, unknown_dim: { mean: 3, high_risk_pct: 50, n: 40 } },
    });
    const history = buildRegisteredHistory([withUnknown], DIMENSION_META, "enterprise");
    expect(history[0]!.dimensions.some((d) => d.dimensionId === "unknown_dim")).toBe(false);
  });

  test("n abaixo do k-anonimato marca a dimensão como não visível", () => {
    const suppressed = row({
      dimensions: { ...row().dimensions, demands_quant: { mean: 3.2, high_risk_pct: 70, n: 3 } },
    });
    const history = buildRegisteredHistory([suppressed], DIMENSION_META, "enterprise");
    const dim = history[0]!.dimensions.find((d) => d.dimensionId === "demands_quant")!;
    expect(dim.visible).toBe(false);
    expect(history[0]!.topDriverIds).not.toContain("demands_quant");
  });

  test("domínio A nunca carrega riskLevel", () => {
    const domainA = row({ domain: "A" });
    const history = buildRegisteredHistory([domainA], DIMENSION_META, "enterprise");
    for (const dim of history[0]!.dimensions) {
      expect(dim.riskLevel).toBeNull();
    }
  });

  test("segundo ciclo ganha trend computado a partir do primeiro", () => {
    const rows = [
      row({ cycleKey: "2026-t1", closedOn: "2026-01-22" }),
      row({
        cycleKey: "2026-t2",
        closedOn: "2026-06-01",
        dimensions: { demands_quant: { mean: 3.9, high_risk_pct: 40, n: 40 }, work_pace: { mean: 3.0, high_risk_pct: 45, n: 40 } },
      }),
    ];
    const history = buildRegisteredHistory(rows, DIMENSION_META, "enterprise");
    const secondCycleDim = history[1]!.dimensions.find((d) => d.dimensionId === "demands_quant")!;
    expect(secondCycleDim.trend).toBe("melhorando"); // 70 → 40 = queda de exposição
    const firstCycleDim = history[0]!.dimensions.find((d) => d.dimensionId === "demands_quant")!;
    expect(firstCycleDim.trend).toBeNull(); // sem ciclo anterior
  });

  test("array vazio produz série vazia, nunca erro", () => {
    expect(buildRegisteredHistory([], DIMENSION_META, "enterprise")).toEqual([]);
  });
});
