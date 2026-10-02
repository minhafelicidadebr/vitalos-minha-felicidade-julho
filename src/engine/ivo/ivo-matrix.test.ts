import { describe, expect, test } from "bun:test";
import {
  IVO_LENS_READING_CONTRACT,
  assertNormalizedLensReading,
  type IvoDimension,
  type IvoLensDescriptor,
  type NormalizedLensReading,
} from "./lens-contract";
import { buildIvoMatrix, isMappingApproved, type DimensionMapping } from "./ivo-matrix";

const DIMENSIONS: IvoDimension[] = [
  { id: "eu", label: "EU" },
  { id: "nos", label: "NÓS" },
  { id: "lideranca", label: "LIDERANÇA" },
  { id: "organizacao", label: "ORGANIZAÇÃO" },
];

// Ordem embaralhada de propósito: a matriz ordena pela jornada (M6).
const LENSES: IvoLensDescriptor[] = [
  { id: "via_t", quarter: "Q4", label: "VIA-T", instrument: "VIA-T", instrumentVersion: null, availability: "planned", route: null },
  { id: "fibt", quarter: "Q2", label: "FIB-T", instrument: "FIB-T", instrumentVersion: "1.0.0", availability: "functional", route: "/fibt-piloto" },
  { id: "copsoq", quarter: "Q1", label: "COPSOQ", instrument: "COPSOQ", instrumentVersion: null, availability: "planned", route: null },
  { id: "perma_v", quarter: "Q3", label: "PERMA+V", instrument: "PERMA+V", instrumentVersion: null, availability: "planned", route: null },
];

function reading(overrides: Partial<NormalizedLensReading> = {}): NormalizedLensReading {
  return {
    contractVersion: IVO_LENS_READING_CONTRACT,
    organizationId: "org-demo",
    cycleKey: "2026-T2",
    quarter: "Q2",
    lens: "fibt",
    instrumentVersion: "1.0.0",
    calculationVersion: "fibt-manifest/1.0.0",
    cohortScope: "cohort",
    privacyStatus: "protected",
    kMin: 5,
    publicationStatus: "published",
    cohorts: [
      {
        cohortKey: "A",
        cohortLabel: "Setor A",
        publication: "published",
        countLabel: "7",
        constructs: [{ id: "bem_estar", label: "Bem-Estar", value: 3, scaleMin: 0, scaleMax: 4 }],
        protectionReason: null,
      },
      {
        cohortKey: "B",
        cohortLabel: "Setor B",
        publication: "protected",
        countLabel: "<5",
        constructs: null,
        protectionReason: "Abaixo do limiar.",
      },
    ],
    evidenceReferences: [],
    generatedAt: "2026-06-30T12:00:00.000Z",
    ...overrides,
  };
}

const approvedMapping: DimensionMapping = {
  id: "map-bem-estar-eu",
  version: "1.0.0",
  lens: "fibt",
  sourceConstructId: "bem_estar",
  dimension: "eu",
  status: "APROVADO",
  rationale: "fixture",
  owner: "comite-metodologico",
  scientificEvidence: ["ref-fixture"],
  approvedAt: "2026-09-01",
};

describe("contrato de leitura de lente", () => {
  test("aceita leitura válida", () => {
    expect(() => assertNormalizedLensReading(reading())).not.toThrow();
  });

  test("coorte protegida com valores é recusada (CL2)", () => {
    const bad = reading({
      cohorts: [
        {
          cohortKey: "B",
          cohortLabel: "B",
          publication: "protected",
          countLabel: "protegida",
          constructs: [{ id: "x", label: "x", value: 1, scaleMin: 0, scaleMax: 4 }],
          protectionReason: null,
        },
      ],
    });
    expect(() => assertNormalizedLensReading(bad)).toThrow(/não publicada carrega valores/);
  });

  test("contagem exata abaixo do limiar é recusada (CL3)", () => {
    const bad = reading({
      cohorts: [
        { cohortKey: "A", cohortLabel: "A", publication: "protected", countLabel: "3", constructs: null, protectionReason: null },
      ],
    });
    expect(() => assertNormalizedLensReading(bad)).toThrow(/contagem exata/);
  });

  test("campo de índice composto é recusado (CL4)", () => {
    const bad = { ...reading(), ivoScore: 619 } as unknown as NormalizedLensReading;
    expect(() => assertNormalizedLensReading(bad)).toThrow(/índice composto/);
  });

  test("kMin abaixo de 5 é recusado", () => {
    expect(() => assertNormalizedLensReading(reading({ kMin: 3 }))).toThrow(/kMin/);
  });

  test("privacyStatus published com coorte protegida é recusado", () => {
    expect(() => assertNormalizedLensReading(reading({ privacyStatus: "published" }))).toThrow(/privacyStatus/);
  });
});

describe("matriz IVO 4 × 4", () => {
  test("colunas seguem a jornada Q1..Q4 e linhas as 4 dimensões (M6)", () => {
    const m = buildIvoMatrix({ organizationId: null, dimensions: DIMENSIONS, lenses: LENSES, readings: [], mappings: [] });
    expect(m.lenses.map((l) => l.id)).toEqual(["copsoq", "fibt", "perma_v", "via_t"]);
    expect(m.rows.map((r) => r.dimension.id)).toEqual(["eu", "nos", "lideranca", "organizacao"]);
    expect(m.rows.every((r) => r.cells.length === 4)).toBe(true);
  });

  test("lentes planejadas ficam planned, sem evidência nem data (M1)", () => {
    const m = buildIvoMatrix({ organizationId: "org-demo", dimensions: DIMENSIONS, lenses: LENSES, readings: [reading()], mappings: [approvedMapping] });
    for (const row of m.rows) {
      for (const cell of row.cells.filter((c) => c.lens !== "fibt")) {
        expect(cell.publicationState).toBe("planned");
        expect(cell.evidence).toEqual([]);
        expect(cell.lastMeasuredAt).toBeNull();
      }
    }
  });

  test("lente funcional sem leitura fica prepared (M2)", () => {
    const m = buildIvoMatrix({ organizationId: "org-demo", dimensions: DIMENSIONS, lenses: LENSES, readings: [], mappings: [] });
    expect(m.rows[0]!.cells.find((c) => c.lens === "fibt")!.publicationState).toBe("prepared");
  });

  test("leitura de outra organização é descartada e avisada (M3)", () => {
    const m = buildIvoMatrix({
      organizationId: "org-demo",
      dimensions: DIMENSIONS,
      lenses: LENSES,
      readings: [reading({ organizationId: "org-alheia" })],
      mappings: [approvedMapping],
    });
    expect(m.rows[0]!.cells.find((c) => c.lens === "fibt")!.publicationState).toBe("prepared");
    expect(m.warnings.join(" ")).toContain("outra organização");
  });

  test("sem mapeamento aprovado não há evidência, mas o estado da lente aparece (M4)", () => {
    const m = buildIvoMatrix({ organizationId: "org-demo", dimensions: DIMENSIONS, lenses: LENSES, readings: [reading()], mappings: [] });
    for (const row of m.rows) {
      const cell = row.cells.find((c) => c.lens === "fibt")!;
      expect(cell.publicationState).toBe("published");
      expect(cell.mapping).toBe("none");
      expect(cell.evidence).toEqual([]);
    }
  });

  test("mapeamento PROPOSTO não alimenta evidência", () => {
    const proposed = { ...approvedMapping, status: "PROPOSTO" as const, approvedAt: null };
    const m = buildIvoMatrix({ organizationId: "org-demo", dimensions: DIMENSIONS, lenses: LENSES, readings: [reading()], mappings: [proposed] });
    const cell = m.rows[0]!.cells.find((c) => c.lens === "fibt")!;
    expect(cell.mapping).toBe("proposed");
    expect(cell.evidence).toEqual([]);
  });

  test("mapeamento APROVADO liga só coortes publicadas do construto", () => {
    const m = buildIvoMatrix({ organizationId: "org-demo", dimensions: DIMENSIONS, lenses: LENSES, readings: [reading()], mappings: [approvedMapping] });
    const eu = m.rows.find((r) => r.dimension.id === "eu")!.cells.find((c) => c.lens === "fibt")!;
    expect(eu.mapping).toBe("approved");
    expect(eu.evidence).toEqual([{ mappingId: "map-bem-estar-eu", sourceConstructId: "bem_estar", cycleKey: "2026-T2", cohortKeys: ["A"] }]);
    const nos = m.rows.find((r) => r.dimension.id === "nos")!.cells.find((c) => c.lens === "fibt")!;
    expect(nos.evidence).toEqual([]);
  });

  test("APROVADO sem responsável/evidência/data não conta como aprovado", () => {
    expect(isMappingApproved({ ...approvedMapping, owner: null })).toBe(false);
    expect(isMappingApproved({ ...approvedMapping, scientificEvidence: [] })).toBe(false);
    expect(isMappingApproved({ ...approvedMapping, approvedAt: null })).toBe(false);
  });

  test("distingue lente disponível, resultado disponível, resultado protegido e mapeamento pendente (M7)", () => {
    const m = buildIvoMatrix({ organizationId: "org-demo", dimensions: DIMENSIONS, lenses: LENSES, readings: [reading()], mappings: [] });
    const fibt = m.rows[0]!.cells.find((c) => c.lens === "fibt")!;
    expect(fibt.availability).toBe("functional");
    expect(fibt.resultState).toBe("available");
    expect(fibt.cohortSummary).toEqual({ published: 1, protected: 1, collecting: 0, total: 2 });
    expect(fibt.mapping).toBe("none");

    const planned = m.rows[0]!.cells.find((c) => c.lens === "copsoq")!;
    expect(planned.availability).toBe("planned");
    expect(planned.resultState).toBe("not_applicable");
    expect(planned.cohortSummary).toBeNull();
  });

  test("tudo protegido vira resultState protected, sem número (M7)", () => {
    const allProtected = reading({
      publicationStatus: "protected",
      cohorts: [
        { cohortKey: "B", cohortLabel: "Setor B", publication: "protected", countLabel: "<5", constructs: null, protectionReason: "limiar" },
      ],
    });
    const m = buildIvoMatrix({ organizationId: "org-demo", dimensions: DIMENSIONS, lenses: LENSES, readings: [allProtected], mappings: [] });
    const fibt = m.rows[0]!.cells.find((c) => c.lens === "fibt")!;
    expect(fibt.resultState).toBe("protected");
    expect(fibt.cohortSummary).toEqual({ published: 0, protected: 1, collecting: 0, total: 1 });
  });

  test("ausência de leitura e coleta sem dados nunca viram zero (M7)", () => {
    const none = buildIvoMatrix({ organizationId: "org-demo", dimensions: DIMENSIONS, lenses: LENSES, readings: [], mappings: [] });
    expect(none.rows[0]!.cells.find((c) => c.lens === "fibt")!.resultState).toBe("no_reading");

    const collecting = reading({
      publicationStatus: "collecting",
      cohorts: [{ cohortKey: "A", cohortLabel: "A", publication: "collecting", countLabel: "0", constructs: null, protectionReason: null }],
    });
    const m = buildIvoMatrix({ organizationId: "org-demo", dimensions: DIMENSIONS, lenses: LENSES, readings: [collecting], mappings: [] });
    expect(m.rows[0]!.cells.find((c) => c.lens === "fibt")!.resultState).toBe("collecting");
  });

  test("nenhuma célula carrega pontuação (M5)", () => {
    const m = buildIvoMatrix({ organizationId: "org-demo", dimensions: DIMENSIONS, lenses: LENSES, readings: [reading()], mappings: [approvedMapping] });
    const serialized = JSON.stringify(m.rows);
    expect(serialized).not.toMatch(/"(score|ivoScore|compositeScore|value)"/);
  });

  test("leitura inválida é descartada com aviso, nunca exibida", () => {
    const bad = { ...reading(), ivoScore: 700 } as unknown as NormalizedLensReading;
    const m = buildIvoMatrix({ organizationId: "org-demo", dimensions: DIMENSIONS, lenses: LENSES, readings: [bad], mappings: [] });
    expect(m.rows[0]!.cells.find((c) => c.lens === "fibt")!.publicationState).toBe("prepared");
    expect(m.warnings.join(" ")).toContain("descartada");
  });
});
