import { describe, expect, test } from "bun:test";
import {
  buildAnnualEsgReport,
  type AnnualEsgReportInput,
  type EsgKpi,
  type MaterialityDeclaration,
} from "./esg-report-engine";

function kpi(over: Partial<EsgKpi> & Pick<EsgKpi, "id" | "dim" | "valueNorm">): EsgKpi {
  return {
    label: over.id,
    display: `${over.valueNorm}/1000`,
    source: "IVO/PERMA",
    ...over,
  } as EsgKpi;
}

function input(over: Partial<AnnualEsgReportInput> = {}): AnnualEsgReportInput {
  return {
    year: 2026,
    orgName: "TechCorp",
    kpis: [
      kpi({ id: "amb", dim: "E", valueNorm: 600, source: "FIB-T", ods: "ODS 13" }),
      kpi({ id: "perma", dim: "S", valueNorm: 640, source: "IVO/PERMA", ods: "ODS 3" }),
      kpi({ id: "viat", dim: "S", valueNorm: 700, source: "VIA-T", ods: "ODS 4" }),
      kpi({ id: "gov", dim: "G", valueNorm: 580, source: "COPSOQ", ods: "ODS 16" }),
    ],
    journey: [
      { quarter: "T1", lensName: "COPSOQ", instrument: "COPSOQ", highlight: "risco mapeado" },
    ],
    proof: {
      experimentsConcluded: 3,
      experimentsConfirmed: 2,
      sealLabel: "Empresa Viva",
      sealGranted: true,
    },
    methodology: [{ instrument: "FIB-T", measures: "ecossistema", science: "Furtado 2020" }],
    ...over,
  };
}

// ─── Agrupamento por dimensão ─────────────────────────────────────────────────

describe("buildAnnualEsgReport — dimensões", () => {
  test("agrupa KPIs em E, S, G na ordem certa", () => {
    const r = buildAnnualEsgReport(input());
    expect(r.dimensions.map((d) => d.dim)).toEqual(["E", "S", "G"]);
    expect(r.dimensions.find((d) => d.dim === "S")!.kpis).toHaveLength(2);
  });

  test("score da dimensão = média dos valueNorm dos KPIs", () => {
    const r = buildAnnualEsgReport(input());
    // S: (640+700)/2 = 670
    expect(r.dimensions.find((d) => d.dim === "S")!.score).toBe(670);
  });

  test("dimensão sem KPI → score null e narrativa de ausência", () => {
    const r = buildAnnualEsgReport(input({ kpis: [kpi({ id: "s", dim: "S", valueNorm: 600 })] }));
    const e = r.dimensions.find((d) => d.dim === "E")!;
    expect(e.score).toBeNull();
    expect(e.narrative).toContain("sem indicadores");
  });

  test("bandLabel por faixa", () => {
    const r = buildAnnualEsgReport(input({ kpis: [kpi({ id: "x", dim: "S", valueNorm: 820 })] }));
    expect(r.dimensions.find((d) => d.dim === "S")!.bandLabel).toBe("Referência");
  });
});

// ─── Prontidão geral ──────────────────────────────────────────────────────────

describe("buildAnnualEsgReport — prontidão geral", () => {
  test("usa overallReadiness do input quando fornecido", () => {
    expect(buildAnnualEsgReport(input({ overallReadiness: 555 })).overallReadiness).toBe(555);
  });

  test("calcula média das dimensões quando ausente", () => {
    // E=600, S=670, G=580 → média 617
    const r = buildAnnualEsgReport(input());
    expect(r.overallReadiness).toBe(617);
  });
});

// ─── ODS ──────────────────────────────────────────────────────────────────────

describe("buildAnnualEsgReport — ODS", () => {
  test("deduplica e ordena ODS por número", () => {
    const r = buildAnnualEsgReport(
      input({
        kpis: [
          kpi({ id: "a", dim: "S", valueNorm: 600, ods: "ODS 8" }),
          kpi({ id: "b", dim: "S", valueNorm: 600, ods: "ODS 3" }),
          kpi({ id: "c", dim: "E", valueNorm: 600, ods: "ODS 3" }),
        ],
      }),
    );
    expect(r.odsCovered).toEqual(["ODS 3", "ODS 8"]);
  });
});

// ─── Headline ─────────────────────────────────────────────────────────────────

describe("buildAnnualEsgReport — headline", () => {
  test("cita prontidão, prova e selo concedido", () => {
    const h = buildAnnualEsgReport(input()).headline;
    expect(h).toContain("2026");
    expect(h).toContain("2/3");
    expect(h).toContain("Selo Empresa Viva ativo");
  });

  test("selo não concedido → frase de jornada", () => {
    const h = buildAnnualEsgReport(
      input({
        proof: {
          experimentsConcluded: 0,
          experimentsConfirmed: 0,
          sealLabel: "Em jornada",
          sealGranted: false,
        },
      }),
    ).headline;
    expect(h).toContain("selo em jornada");
    expect(h).toContain("transformações em curso");
  });

  test("propaga journey e methodology", () => {
    const r = buildAnnualEsgReport(input());
    expect(r.journey).toHaveLength(1);
    expect(r.methodology[0]!.instrument).toBe("FIB-T");
  });
});

// ─── Extensão retrocompatível: linhagem e materialidade (I-E1, §F1/§F2) ───────

describe("buildAnnualEsgReport — linhagem e materialidade (opcionais)", () => {
  test("KPI sem lineage continua funcionando exatamente como antes", () => {
    const r = buildAnnualEsgReport(input());
    expect(r.dimensions.every((d) => d.kpis.every((k) => k.lineage === undefined))).toBe(true);
  });

  test("propaga lineage de um KPI sem alterar o restante do cálculo", () => {
    const withLineage = kpi({
      id: "copsoq",
      dim: "G",
      valueNorm: 580,
      source: "COPSOQ",
      lineage: {
        instrument: "COPSOQ",
        waveId: "wave-1",
        capsuleId: "cap-1",
        n: 40,
        kAnonStatus: "ok",
        formula: "high_risk_pct médio das dimensões visíveis",
      },
    });
    const r = buildAnnualEsgReport(input({ kpis: [withLineage] }));
    const found = r.dimensions.find((d) => d.dim === "G")!.kpis[0]!;
    expect(found.lineage?.capsuleId).toBe("cap-1");
    expect(found.lineage?.kAnonStatus).toBe("ok");
  });

  test("materiality ausente vira array vazio, nunca undefined", () => {
    const r = buildAnnualEsgReport(input());
    expect(r.materiality).toEqual([]);
  });

  test("propaga declarações de materialidade sem alterá-las", () => {
    const declarations: MaterialityDeclaration[] = [
      {
        theme: "Saúde psicossocial",
        impactRelevance: 5,
        financialRelevance: 4,
        declaredByRole: "Diretora de RH",
        declaredAt: "2026-07-06",
      },
    ];
    const r = buildAnnualEsgReport(input({ materiality: declarations }));
    expect(r.materiality).toEqual(declarations);
  });
});
