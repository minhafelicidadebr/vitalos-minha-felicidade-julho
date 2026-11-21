// Matriz IVO 4 × 4 — dimensões (linhas) × lentes (colunas). Spec
// ivo-platform-foundation.md, regras M1–M6.
//
// Engine PURO. A matriz NUNCA carrega pontuação: mostra disponibilidade,
// versão, estado de publicação, última medição e evidência. Evidência só
// entra numa célula quando existe mapeamento lente→dimensão APROVADO.

import {
  IVO_QUARTERS,
  assertNormalizedLensReading,
  type IvoDimension,
  type IvoDimensionId,
  type IvoLensDescriptor,
  type IvoLensId,
  type LensAvailability,
  type LensPublicationState,
  type NormalizedLensReading,
} from "./lens-contract";

export type MappingStatus = "PROPOSTO" | "APROVADO" | "REJEITADO";

/** Mapeamento metodológico versionado (registro em src/domain/ivo/). */
export interface DimensionMapping {
  id: string;
  version: string;
  lens: IvoLensId;
  /** Construto de origem no instrumento (ex.: id de Fator FIB-T). */
  sourceConstructId: string;
  dimension: IvoDimensionId;
  status: MappingStatus;
  rationale: string;
  owner: string | null;
  scientificEvidence: readonly string[];
  approvedAt: string | null;
}

export interface MatrixCellEvidence {
  mappingId: string;
  sourceConstructId: string;
  cycleKey: string;
  cohortKeys: readonly string[];
}

/**
 * Estado do RESULTADO NATIVO da lente (não da dimensão). Quatro perguntas
 * distintas que a célula responde separadamente:
 *   · a lente existe?            → `availability`
 *   · há resultado da lente?     → `resultState`
 *   · o resultado está retido?   → `resultState === "protected"` / `cohortSummary.protected`
 *   · ele conta para a dimensão? → `mapping`
 * Ausência, proteção e pendência nunca viram zero: são estados, sem número.
 */
export type LensResultState =
  | "not_applicable"
  | "no_reading"
  | "no_data"
  | "collecting"
  | "protected"
  | "available";

/** Contagem de RECORTES (setores) por estado — nunca de participantes. */
export interface LensCohortSummary {
  published: number;
  protected: number;
  collecting: number;
  total: number;
}

export interface IvoMatrixCell {
  dimension: IvoDimensionId;
  lens: IvoLensId;
  availability: LensAvailability;
  instrumentVersion: string | null;
  publicationState: LensPublicationState;
  resultState: LensResultState;
  cohortSummary: LensCohortSummary | null;
  lastMeasuredAt: string | null;
  mapping: "none" | "proposed" | "approved";
  evidence: readonly MatrixCellEvidence[];
  detailRoute: string | null;
}

export interface IvoMatrix {
  organizationId: string | null;
  dimensions: readonly IvoDimension[];
  lenses: readonly IvoLensDescriptor[];
  rows: ReadonlyArray<{ dimension: IvoDimension; cells: readonly IvoMatrixCell[] }>;
  warnings: readonly string[];
}

export interface BuildIvoMatrixInput {
  /** null = sem organização selecionada; a matriz mostra só o catálogo. */
  organizationId: string | null;
  dimensions: readonly IvoDimension[];
  lenses: readonly IvoLensDescriptor[];
  readings: readonly NormalizedLensReading[];
  mappings: readonly DimensionMapping[];
}

/** Só APROVADO com responsável, evidência e data conta como aprovado. */
export function isMappingApproved(mapping: DimensionMapping): boolean {
  return (
    mapping.status === "APROVADO" &&
    !!mapping.owner &&
    !!mapping.approvedAt &&
    mapping.scientificEvidence.length > 0
  );
}

function latestReading(readings: readonly NormalizedLensReading[]): NormalizedLensReading | null {
  if (readings.length === 0) return null;
  return [...readings].sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))[0]!;
}

function summarizeCohorts(reading: NormalizedLensReading): LensCohortSummary {
  return {
    published: reading.cohorts.filter((c) => c.publication === "published").length,
    protected: reading.cohorts.filter((c) => c.publication === "protected").length,
    collecting: reading.cohorts.filter((c) => c.publication === "collecting").length,
    total: reading.cohorts.length,
  };
}

function resultStateOf(reading: NormalizedLensReading, summary: LensCohortSummary): LensResultState {
  if (summary.published > 0) return "available";
  if (summary.protected > 0) return "protected";
  if (summary.collecting > 0 || reading.publicationStatus === "collecting") return "collecting";
  return "no_data";
}

export function buildIvoMatrix(input: BuildIvoMatrixInput): IvoMatrix {
  const warnings: string[] = [];
  const lenses = [...input.lenses].sort(
    (a, b) => IVO_QUARTERS.indexOf(a.quarter) - IVO_QUARTERS.indexOf(b.quarter),
  );

  // Leituras válidas, da própria organização, de lentes funcionais.
  const byLens = new Map<IvoLensId, NormalizedLensReading[]>();
  for (const reading of input.readings) {
    try {
      assertNormalizedLensReading(reading);
    } catch (error) {
      warnings.push(`Leitura descartada: ${(error as Error).message}`);
      continue;
    }
    if (!input.organizationId || reading.organizationId !== input.organizationId) {
      warnings.push(`Leitura de outra organização descartada (lente ${reading.lens}).`);
      continue;
    }
    const descriptor = lenses.find((l) => l.id === reading.lens);
    if (!descriptor || descriptor.availability !== "functional") {
      warnings.push(`Leitura de lente não funcional descartada (lente ${reading.lens}).`);
      continue;
    }
    const list = byLens.get(reading.lens) ?? [];
    list.push(reading);
    byLens.set(reading.lens, list);
  }

  const rows = input.dimensions.map((dimension) => ({
    dimension,
    cells: lenses.map((lens): IvoMatrixCell => {
      const base = {
        dimension: dimension.id,
        lens: lens.id,
        availability: lens.availability,
        instrumentVersion: lens.instrumentVersion,
        detailRoute: lens.route,
      };

      if (lens.availability === "planned") {
        return {
          ...base,
          publicationState: "planned",
          resultState: "not_applicable",
          cohortSummary: null,
          lastMeasuredAt: null,
          mapping: "none",
          evidence: [],
        };
      }

      const lensMappings = input.mappings.filter(
        (m) => m.lens === lens.id && m.dimension === dimension.id && m.status !== "REJEITADO",
      );
      const approved = lensMappings.filter(isMappingApproved);
      const mapping = approved.length > 0 ? "approved" : lensMappings.length > 0 ? "proposed" : "none";

      const reading = latestReading(byLens.get(lens.id) ?? []);
      if (!reading) {
        return {
          ...base,
          publicationState: "prepared",
          resultState: "no_reading",
          cohortSummary: null,
          lastMeasuredAt: null,
          mapping,
          evidence: [],
        };
      }
      const cohortSummary = summarizeCohorts(reading);

      const evidence: MatrixCellEvidence[] = approved.flatMap((m) => {
        const cohortKeys = reading.cohorts
          .filter(
            (c) =>
              c.publication === "published" &&
              (c.constructs ?? []).some((construct) => construct.id === m.sourceConstructId),
          )
          .map((c) => c.cohortKey);
        return cohortKeys.length > 0
          ? [{ mappingId: m.id, sourceConstructId: m.sourceConstructId, cycleKey: reading.cycleKey, cohortKeys }]
          : [];
      });

      return {
        ...base,
        instrumentVersion: reading.instrumentVersion,
        publicationState: reading.publicationStatus,
        resultState: resultStateOf(reading, cohortSummary),
        cohortSummary,
        lastMeasuredAt: reading.generatedAt,
        mapping,
        evidence,
      };
    }),
  }));

  return { organizationId: input.organizationId, dimensions: input.dimensions, lenses, rows, warnings };
}
