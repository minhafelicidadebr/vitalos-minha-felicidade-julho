// ÍNDICE IVO EXPERIMENTAL — SOMENTE AMBIENTE DE TESTE (ADR-005, dossiê §9).
//
// Existe para provar o COMPORTAMENTO do software (normalização, ausência ≠ zero,
// sem redistribuição de pesos, sensibilidade) com parâmetros e dados SINTÉTICOS.
// NÃO é o método do IVO, NÃO foi aprovado e NÃO pode ser importado por rota,
// servidor ou componente (guarda em ivo-experimental-index.test.ts).
//
// Travas em execução:
//  · só roda com NODE_ENV === "test";
//  · o `methodId` precisa começar por "synthetic-test-";
//  · todo construto precisa ter id "synthetic_*" — construtos reais (ex.: fatores
//    da FIB-T) são recusados;
//  · a coorte precisa ter chave "synthetic-*";
//  · a saída carrega a marca EXPERIMENTAL.

import { IVO_DIMENSION_IDS, type IvoDimensionId } from "../lens-contract";

export const EXPERIMENTAL_MARK = "EXPERIMENTAL — parâmetros de teste; método não aprovado; dados sintéticos" as const;

export type ExperimentalAggregation = "media_aritmetica_ponderada" | "media_geometrica_ponderada";

export interface ExperimentalConstruct {
  id: string;
  weight: number;
  min: number;
  max: number;
  direction: "maior_melhor" | "menor_melhor";
}

export interface ExperimentalMethodParams {
  methodId: string;
  status: "TEST_ONLY_NOT_APPROVED";
  aggregation: ExperimentalAggregation;
  dimensions: Record<IvoDimensionId, { weight: number; constructs: readonly ExperimentalConstruct[] }>;
}

export interface ExperimentalInput {
  synthetic: true;
  cohortKey: string;
  /** Só coortes publicadas (k≥5, sem supressão) entram. */
  published: boolean;
  /** Valor nativo por construto; null/ausente = não disponível. */
  constructs: Readonly<Record<string, number | null | undefined>>;
}

export interface ExperimentalDimensionResult {
  value: number | null;
  reason: string | null;
}

export interface ExperimentalResult {
  mark: typeof EXPERIMENTAL_MARK;
  methodId: string;
  cohortKey: string;
  /** null com motivo — nunca zero por ausência. Escala 0–100 só de teste. */
  value: number | null;
  reason: string | null;
  dimensions: Record<IvoDimensionId, ExperimentalDimensionResult>;
}

export class ExperimentalIndexRefused extends Error {
  constructor(message: string) {
    super(`[ivo-experimental] ${message}`);
    this.name = "ExperimentalIndexRefused";
  }
}

const EPS = 1e-9;

function assertTestOnly(params: ExperimentalMethodParams, input: ExperimentalInput): void {
  if (process.env.NODE_ENV !== "test") throw new ExperimentalIndexRefused("índice experimental só roda em ambiente de teste");
  if (!params.methodId.startsWith("synthetic-test-")) throw new ExperimentalIndexRefused("methodId deve começar por synthetic-test-");
  if (params.status !== "TEST_ONLY_NOT_APPROVED") throw new ExperimentalIndexRefused("status do método deve ser TEST_ONLY_NOT_APPROVED");
  if (input.synthetic !== true || !input.cohortKey.startsWith("synthetic-")) throw new ExperimentalIndexRefused("entrada deve ser sintética e identificada");
  const dimensionWeight = IVO_DIMENSION_IDS.reduce((sum, id) => sum + params.dimensions[id].weight, 0);
  if (Math.abs(dimensionWeight - 1) > EPS) throw new ExperimentalIndexRefused("pesos das dimensões devem somar 1");
  for (const id of IVO_DIMENSION_IDS) {
    const { constructs } = params.dimensions[id];
    if (constructs.length === 0) throw new ExperimentalIndexRefused(`dimensão ${id} sem construtos`);
    if (Math.abs(constructs.reduce((s, c) => s + c.weight, 0) - 1) > EPS) throw new ExperimentalIndexRefused(`pesos dos construtos de ${id} devem somar 1`);
    for (const c of constructs) {
      if (!c.id.startsWith("synthetic_")) throw new ExperimentalIndexRefused(`construto real recusado: ${c.id}`);
      if (!(c.max > c.min)) throw new ExperimentalIndexRefused(`escala inválida em ${c.id}`);
    }
  }
}

function normalize(value: number, c: ExperimentalConstruct): number {
  const unit = (value - c.min) / (c.max - c.min);
  return (c.direction === "maior_melhor" ? unit : 1 - unit) * 100;
}

// Dentro da dimensão: sempre média aritmética ponderada. `aggregation` vale ENTRE dimensões (compensação a testar).
function weightedMean(parts: readonly { weight: number; value: number }[]): number {
  return parts.reduce((s, p) => s + p.weight * p.value, 0);
}

function aggregate(parts: readonly { weight: number; value: number }[], how: ExperimentalAggregation): number {
  if (how === "media_aritmetica_ponderada") return parts.reduce((s, p) => s + p.weight * p.value, 0);
  return Math.exp(parts.reduce((s, p) => s + p.weight * Math.log(Math.max(p.value, 1e-12)), 0));
}

/** Calcula o índice de TESTE para uma coorte sintética. Ausência → nulo com motivo; sem redistribuição. */
export function computeExperimentalIvo(params: ExperimentalMethodParams, input: ExperimentalInput): ExperimentalResult {
  assertTestOnly(params, input);
  const emptyDims = Object.fromEntries(IVO_DIMENSION_IDS.map((id) => [id, { value: null, reason: null }])) as Record<IvoDimensionId, ExperimentalDimensionResult>;
  const base = { mark: EXPERIMENTAL_MARK, methodId: params.methodId, cohortKey: input.cohortKey };

  if (!input.published) {
    const dims = Object.fromEntries(IVO_DIMENSION_IDS.map((id) => [id, { value: null, reason: "coorte_nao_publicada" }])) as Record<IvoDimensionId, ExperimentalDimensionResult>;
    return { ...base, value: null, reason: "coorte_nao_publicada", dimensions: dims };
  }

  const dimensions = { ...emptyDims };
  for (const id of IVO_DIMENSION_IDS) {
    const parts: { weight: number; value: number }[] = [];
    let reason: string | null = null;
    for (const c of params.dimensions[id].constructs) {
      const raw = input.constructs[c.id];
      if (raw === null || raw === undefined || !Number.isFinite(raw)) {
        reason = `entrada_ausente:${c.id}`;
        break;
      }
      if (raw < c.min || raw > c.max) {
        reason = `fora_da_escala:${c.id}`;
        break;
      }
      parts.push({ weight: c.weight, value: normalize(raw, c) });
    }
    dimensions[id] = reason ? { value: null, reason } : { value: weightedMean(parts), reason: null };
  }

  const unavailable = IVO_DIMENSION_IDS.filter((id) => dimensions[id].value === null);
  if (unavailable.length > 0) {
    return { ...base, value: null, reason: `dimensao_indisponivel:${unavailable.join(",")}`, dimensions };
  }
  const value = aggregate(
    IVO_DIMENSION_IDS.map((id) => ({ weight: params.dimensions[id].weight, value: dimensions[id].value as number })),
    params.aggregation,
  );
  return { ...base, value, reason: null, dimensions };
}

export interface SensitivityVariant {
  label: string;
  params: ExperimentalMethodParams;
}

export interface SensitivityReport {
  rows: readonly { label: string; value: number | null; reason: string | null }[];
  /** Amplitude entre variantes com valor; null se alguma variante não produziu valor. */
  spread: number | null;
}

/** Análise de sensibilidade de TESTE: mesma entrada, variantes de pesos/agregação. */
export function runExperimentalSensitivity(input: ExperimentalInput, variants: readonly SensitivityVariant[]): SensitivityReport {
  const rows = variants.map((v) => {
    const r = computeExperimentalIvo(v.params, input);
    return { label: v.label, value: r.value, reason: r.reason };
  });
  const values = rows.map((r) => r.value);
  const spread = values.every((v): v is number => v !== null) && values.length > 0 ? Math.max(...values) - Math.min(...values) : null;
  return { rows, spread };
}
