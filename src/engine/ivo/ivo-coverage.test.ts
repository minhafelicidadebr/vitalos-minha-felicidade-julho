import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { IVO_LENS_READING_CONTRACT, type IvoDimension, type IvoLensDescriptor, type NormalizedLensReading } from "./lens-contract";
import { buildIvoMatrix, type DimensionMapping } from "./ivo-matrix";
import { buildIvoCoverage } from "./ivo-coverage";

// Fixtures SINTÉTICAS: os mapeamentos "aprovados" existem só aqui; o registro real está vazio.
const DIMENSIONS: IvoDimension[] = [
  { id: "eu", label: "EU" },
  { id: "nos", label: "NÓS" },
  { id: "lideranca", label: "LIDERANÇA" },
  { id: "organizacao", label: "ORGANIZAÇÃO" },
];
const LENSES: IvoLensDescriptor[] = [
  { id: "copsoq", quarter: "Q1", label: "COPSOQ", instrument: "COPSOQ", instrumentVersion: null, availability: "planned", route: null },
  { id: "fibt", quarter: "Q2", label: "FIB-T", instrument: "FIB-T", instrumentVersion: "1.0.0", availability: "functional", route: "/ivo-integral/q2" },
  { id: "perma_v", quarter: "Q3", label: "PERMA+V", instrument: "PERMA+V", instrumentVersion: null, availability: "planned", route: null },
  { id: "via_t", quarter: "Q4", label: "VIA-T", instrument: "VIA-T", instrumentVersion: null, availability: "planned", route: null },
];

function reading(kind: "published" | "protected" | "empty", generatedAt = "2026-09-30T12:00:00.000Z"): NormalizedLensReading {
  const published = kind === "published";
  return {
    contractVersion: IVO_LENS_READING_CONTRACT,
    organizationId: "org-sintetica",
    cycleKey: "2026-T2",
    quarter: "Q2",
    lens: "fibt",
    instrumentVersion: "1.0.0",
    calculationVersion: "fibt-manifest/1.0.0",
    cohortScope: "cohort",
    privacyStatus: published ? "published" : "protected",
    kMin: 5,
    publicationStatus: kind === "empty" ? "collecting" : published ? "published" : "protected",
    cohorts:
      kind === "empty"
        ? []
        : [
            published
              ? {
                  cohortKey: "A",
                  cohortLabel: "Setor A sintético",
                  publication: "published",
                  countLabel: "7",
                  constructs: [
                    { id: "bem_estar", label: "Bem-Estar", value: 3, scaleMin: 0, scaleMax: 4 },
                    { id: "satisfacao_empresa", label: "Satisfação com a Empresa", value: 2.5, scaleMin: 0, scaleMax: 4 },
                  ],
                  protectionReason: null,
                }
              : { cohortKey: "A", cohortLabel: "Setor A sintético", publication: "protected", countLabel: "<5", constructs: null, protectionReason: "Abaixo do limiar." },
          ],
    evidenceReferences: [],
    generatedAt,
  };
}

const mapping = (id: string, construct: string, dimension: DimensionMapping["dimension"], status: DimensionMapping["status"]): DimensionMapping => ({
  id,
  version: "0.0.0-sintetico",
  lens: "fibt",
  sourceConstructId: construct,
  dimension,
  status,
  rationale: "fixture sintética",
  owner: status === "APROVADO" ? "papel-metodologico-sintetico" : null,
  scientificEvidence: status === "APROVADO" ? ["referencia-sintetica"] : [],
  approvedAt: status === "APROVADO" ? "2026-10-01" : null,
});

const matrixOf = (readings: NormalizedLensReading[], mappings: DimensionMapping[]) =>
  buildIvoMatrix({ organizationId: "org-sintetica", dimensions: DIMENSIONS, lenses: LENSES, readings, mappings });
const stateOf = (c: ReturnType<typeof buildIvoCoverage>, id: string) => c.dimensions.find((d) => d.dimension === id)!.state;

describe("cobertura por dimensão", () => {
  test("registro vazio: FIB-T publicada não cobre nenhuma dimensão e nenhum número é permitido", () => {
    const c = buildIvoCoverage(matrixOf([reading("published")], []));
    expect(c.dimensions.map((d) => d.state)).toEqual(["nao_coberto", "nao_coberto", "nao_coberto", "nao_coberto"]);
    expect(c.dimensions.every((d) => d.numberAllowed === false)).toBe(true);
    expect(c.indexEligible).toBe(false);
    expect(c.indexBlockers.join(" ")).toContain("não há método do índice aprovado");
    expect(c.stalenessPolicy).toBe("nao_definida");
  });

  test("mapeamento proposto é pendência, não cobertura", () => {
    const c = buildIvoCoverage(matrixOf([reading("published")], [mapping("m1", "bem_estar", "eu", "PROPOSTO")]));
    expect(stateOf(c, "eu")).toBe("mapeamento_pendente");
    expect(stateOf(c, "nos")).toBe("nao_coberto");
  });

  test("mapeamento rejeitado não cobre", () => {
    const c = buildIvoCoverage(matrixOf([reading("published")], [mapping("m4", "padrao_de_vida", "eu", "REJEITADO")]));
    expect(stateOf(c, "eu")).toBe("nao_coberto");
  });

  test("mapeamento aprovado sem método: 'método pendente' e nenhum valor", () => {
    const c = buildIvoCoverage(matrixOf([reading("published")], [mapping("m1", "bem_estar", "eu", "APROVADO"), mapping("m2", "satisfacao_empresa", "organizacao", "APROVADO")]));
    expect(stateOf(c, "eu")).toBe("metodo_pendente");
    expect(stateOf(c, "organizacao")).toBe("metodo_pendente");
    expect(stateOf(c, "nos")).toBe("nao_coberto");
    expect(stateOf(c, "lideranca")).toBe("nao_coberto");
    expect(c.dimensions.find((d) => d.dimension === "eu")!.contributingLenses).toEqual(["fibt"]);
    expect(c.indexEligible).toBe(false);
    expect(c.indexBlockers.join(" ")).toContain("NÓS");
  });

  test("elegível só com as quatro dimensões aprovadas E método aprovado para piloto", () => {
    const all = [
      mapping("a", "bem_estar", "eu", "APROVADO"),
      mapping("b", "bem_estar", "nos", "APROVADO"),
      mapping("c", "satisfacao_empresa", "lideranca", "APROVADO"),
      mapping("d", "satisfacao_empresa", "organizacao", "APROVADO"),
    ];
    const withMethod = buildIvoCoverage(matrixOf([reading("published")], all), { methodState: "aprovado_para_piloto" });
    expect(withMethod.dimensions.every((d) => d.state === "elegivel")).toBe(true);
    expect(withMethod.indexEligible).toBe(true);
    const draft = buildIvoCoverage(matrixOf([reading("published")], all), { methodState: "rascunho" });
    expect(draft.indexEligible).toBe(false);
    const partial = buildIvoCoverage(matrixOf([reading("published")], all.slice(0, 3)), { methodState: "aprovado_para_piloto" });
    expect(partial.indexEligible).toBe(false);
    expect(stateOf(partial, "organizacao")).toBe("nao_coberto");
  });

  test("resultado retido é 'protegido', nunca zero; sem leitura é 'sem medição'", () => {
    expect(stateOf(buildIvoCoverage(matrixOf([reading("protected")], [mapping("m1", "bem_estar", "eu", "APROVADO")])), "eu")).toBe("suprimido");
    expect(stateOf(buildIvoCoverage(matrixOf([], [])), "eu")).toBe("sem_medicao");
    expect(stateOf(buildIvoCoverage(matrixOf([reading("empty")], [])), "eu")).toBe("sem_medicao");
  });

  test("'desatualizado' só existe com janela definida; sem política nada envelhece", () => {
    const m = matrixOf([reading("published", "2026-01-10T12:00:00.000Z")], [mapping("m1", "bem_estar", "eu", "APROVADO")]);
    expect(stateOf(buildIvoCoverage(m, { asOf: "2026-10-05" }), "eu")).toBe("metodo_pendente");
    const stale = buildIvoCoverage(m, { asOf: "2026-10-05", staleAfterDays: 90 });
    expect(stateOf(stale, "eu")).toBe("desatualizado");
    expect(stale.stalenessPolicy).toBe("definida");
    expect(stateOf(buildIvoCoverage(m, { asOf: "2026-10-05", staleAfterDays: 365 }), "eu")).toBe("metodo_pendente");
  });

  test("módulo de cobertura não importa o índice legado nem calcula valor", () => {
    const source = readFileSync(join(process.cwd(), "src/engine/ivo/ivo-coverage.ts"), "utf8");
    for (const forbidden of ["calculateIVO", "ivo-engine", "expected_ivo_lift"]) expect(source.includes(forbidden)).toBe(false);
  });
});
