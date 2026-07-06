import { describe, expect, test } from "bun:test";
import {
  buildAssuranceAnnex,
  canClaimTrend,
  hasCompleteLineage,
  isBalancedReporting,
  isOmissionDocumented,
  partitionKpisByLineage,
  READY_FOR_ASSURANCE_NOTE,
  validateMaterialityDeclaration,
} from "./assurance-annex-engine";
import type { EsgKpi, MaterialityDeclaration } from "./esg-report-engine";

function kpi(over: Partial<EsgKpi> & Pick<EsgKpi, "id" | "dim" | "valueNorm">): EsgKpi {
  return {
    label: over.id,
    display: `${over.valueNorm}/1000`,
    source: "COPSOQ",
    ...over,
  } as EsgKpi;
}

function withLineage(over: Partial<EsgKpi> & Pick<EsgKpi, "id" | "dim" | "valueNorm">): EsgKpi {
  return kpi({
    ...over,
    lineage: {
      instrument: "COPSOQ",
      waveId: "wave-1",
      capsuleId: "cap-1",
      n: 40,
      kAnonStatus: "ok",
      formula: "média do high_risk_pct",
      ...(over.lineage ?? {}),
    },
  });
}

function materiality(over: Partial<MaterialityDeclaration> = {}): MaterialityDeclaration {
  return {
    theme: "Saúde psicossocial",
    impactRelevance: 4,
    financialRelevance: 3,
    declaredByRole: "Diretora de RH",
    declaredAt: "2026-07-06",
    ...over,
  };
}

describe("hasCompleteLineage", () => {
  test("false sem lineage", () => {
    expect(hasCompleteLineage(kpi({ id: "a", dim: "S", valueNorm: 600 }))).toBe(false);
  });
  test("true com todos os campos preenchidos", () => {
    expect(hasCompleteLineage(withLineage({ id: "a", dim: "S", valueNorm: 600 }))).toBe(true);
  });
  test("false quando n é zero", () => {
    const k = withLineage({ id: "a", dim: "S", valueNorm: 600, lineage: { n: 0 } as any });
    expect(hasCompleteLineage(k)).toBe(false);
  });
  test("false quando formula está vazia", () => {
    const k = withLineage({ id: "a", dim: "S", valueNorm: 600, lineage: { formula: "  " } as any });
    expect(hasCompleteLineage(k)).toBe(false);
  });
});

describe("partitionKpisByLineage — F3.1", () => {
  test("separa publicáveis de lacunas", () => {
    const p = partitionKpisByLineage([
      withLineage({ id: "a", dim: "S", valueNorm: 600 }),
      kpi({ id: "b", dim: "E", valueNorm: 500 }),
    ]);
    expect(p.published.map((k) => k.id)).toEqual(["a"]);
    expect(p.gaps.map((k) => k.id)).toEqual(["b"]);
  });

  test("array vazio produz partição vazia", () => {
    const p = partitionKpisByLineage([]);
    expect(p.published).toEqual([]);
    expect(p.gaps).toEqual([]);
  });
});

describe("canClaimTrend — F3.3", () => {
  test("trend flat ou ausente nunca exige ciclo", () => {
    expect(canClaimTrend(kpi({ id: "a", dim: "S", valueNorm: 600 }), 0)).toBe(true);
    expect(canClaimTrend(kpi({ id: "a", dim: "S", valueNorm: 600, trend: "flat" }), 0)).toBe(true);
  });
  test("trend up/down exige >= 2 ciclos registrados", () => {
    const k = kpi({ id: "a", dim: "S", valueNorm: 600, trend: "up" });
    expect(canClaimTrend(k, 0)).toBe(false);
    expect(canClaimTrend(k, 1)).toBe(false);
    expect(canClaimTrend(k, 2)).toBe(true);
  });
});

describe("isOmissionDocumented — F3.4", () => {
  test("sem supressão, nada a documentar", () => {
    expect(isOmissionDocumented(withLineage({ id: "a", dim: "S", valueNorm: 600 }))).toBe(true);
  });
  test("supressão sem lista de dimensões falha", () => {
    const k = withLineage({
      id: "a",
      dim: "S",
      valueNorm: 600,
      lineage: { kAnonStatus: "partially_suppressed" } as any,
    });
    expect(isOmissionDocumented(k)).toBe(false);
  });
  test("supressão com lista de dimensões declarada passa", () => {
    const k = withLineage({
      id: "a",
      dim: "S",
      valueNorm: 600,
      lineage: { kAnonStatus: "partially_suppressed", suppressedDimensions: ["insecurity"] } as any,
    });
    expect(isOmissionDocumented(k)).toBe(true);
  });
});

describe("isBalancedReporting — F3.5", () => {
  test("todos os KPIs desfavoráveis publicáveis foram publicados", () => {
    const down = withLineage({ id: "a", dim: "S", valueNorm: 400, trend: "down" });
    expect(isBalancedReporting([down], [down])).toBe(true);
  });
  test("KPI desfavorável publicável omitido do publicado falha", () => {
    const down = withLineage({ id: "a", dim: "S", valueNorm: 400, trend: "down" });
    expect(isBalancedReporting([down], [])).toBe(false);
  });
  test("KPI desfavorável sem linhagem não conta (já é lacuna, não filtro seletivo)", () => {
    const downNoLineage = kpi({ id: "a", dim: "S", valueNorm: 400, trend: "down" });
    expect(isBalancedReporting([downNoLineage], [])).toBe(true);
  });
});

describe("validateMaterialityDeclaration — F2", () => {
  test("declaração completa é válida", () => {
    expect(validateMaterialityDeclaration(materiality()).valid).toBe(true);
  });
  test("tema vazio é inválido", () => {
    const r = validateMaterialityDeclaration(materiality({ theme: "" }));
    expect(r.valid).toBe(false);
    expect(r.missingFields).toContain("theme");
  });
  test("relevância fora de 1..5 é inválida", () => {
    const r = validateMaterialityDeclaration(materiality({ impactRelevance: 6 }));
    expect(r.valid).toBe(false);
    expect(r.missingFields).toContain("impactRelevance");
  });
  test("nunca infere materialidade — só valida o que foi declarado", () => {
    const r = validateMaterialityDeclaration(materiality({ financialRelevance: 1 }));
    expect(r.valid).toBe(true); // 1 é um valor DECLARADO válido, o engine não julga o valor em si
  });
});

describe("buildAssuranceAnnex — composição", () => {
  test("nota de asseguração é sempre a verbatim exata", () => {
    const annex = buildAssuranceAnnex([], [], 0);
    expect(annex.readyForAssuranceNote).toBe(READY_FOR_ASSURANCE_NOTE);
  });

  test("todos os checks passam com dado íntegro e balanceado", () => {
    const up = withLineage({ id: "a", dim: "S", valueNorm: 700, trend: "up" });
    const down = withLineage({ id: "b", dim: "S", valueNorm: 400, trend: "down" });
    const annex = buildAssuranceAnnex([up, down], [materiality()], 2);
    expect(annex.allChecksPassed).toBe(true);
    expect(annex.publishedKpis).toHaveLength(2);
  });

  test("falha f3_3 quando trend é afirmado sem 2 ciclos", () => {
    const up = withLineage({ id: "a", dim: "S", valueNorm: 700, trend: "up" });
    const annex = buildAssuranceAnnex([up], [], 1);
    const check = annex.checks.find((c) => c.rule === "f3_3_trend_cycles")!;
    expect(check.passed).toBe(false);
    expect(annex.allChecksPassed).toBe(false);
  });

  test("materialidade inválida derruba allChecksPassed mesmo com KPIs íntegros", () => {
    const ok = withLineage({ id: "a", dim: "S", valueNorm: 600 });
    const annex = buildAssuranceAnnex([ok], [materiality({ theme: "" })], 0);
    expect(annex.allChecksPassed).toBe(false);
  });

  test("KPI sem linhagem vira lacuna e não derruba allChecksPassed sozinho", () => {
    const gap = kpi({ id: "a", dim: "S", valueNorm: 600 });
    const annex = buildAssuranceAnnex([gap], [], 0);
    expect(annex.gapKpis).toHaveLength(1);
    expect(annex.publishedKpis).toHaveLength(0);
    expect(annex.allChecksPassed).toBe(true);
  });
});
