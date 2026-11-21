// Cobertura por dimensão do IVO — engine PURO sobre a matriz 4×4.
//
// Responde, por dimensão, "o que podemos dizer?" sem nunca produzir número:
//   sem_medicao · suprimido · nao_coberto · mapeamento_pendente · metodo_pendente
//   · desatualizado · elegivel
// Nenhum desses estados equivale a zero. `elegivel` só existe com mapeamento
// APROVADO + evidência publicada + método em estado aprovado para piloto (ou além);
// hoje não há mapeamento aprovado nem método, logo nenhuma dimensão é elegível.
//
// Proposta: docs/vitalos/ivo-methodology-dossier.md §10. Os estados do método são
// propostas (ADR-005); aprovar método ≠ validar o índice.

import type { IvoDimensionId } from "./lens-contract";
import type { IvoMatrix, IvoMatrixCell } from "./ivo-matrix";

export type IvoMethodState = "nenhum" | "rascunho" | "aprovado_para_piloto" | "validado_para_uso_definido" | "retirado";

export type DimensionCoverageState =
  | "sem_medicao"
  | "suprimido"
  | "nao_coberto"
  | "mapeamento_pendente"
  | "metodo_pendente"
  | "desatualizado"
  | "elegivel";

export const DIMENSION_COVERAGE_LABEL: Record<DimensionCoverageState, string> = {
  sem_medicao: "Sem medição",
  suprimido: "Resultado protegido",
  nao_coberto: "Não coberto",
  mapeamento_pendente: "Mapeamento pendente",
  metodo_pendente: "Método pendente",
  desatualizado: "Desatualizado",
  elegivel: "Elegível",
};

export interface DimensionCoverage {
  dimension: IvoDimensionId;
  label: string;
  state: DimensionCoverageState;
  reason: string;
  /** Lentes que sustentam a dimensão (mapeamento aprovado + evidência publicada). */
  contributingLenses: readonly string[];
  /** Sempre false fora de `elegivel`. Mesmo elegível, este motor não calcula valor. */
  numberAllowed: boolean;
}

export interface IvoCoverage {
  dimensions: readonly DimensionCoverage[];
  methodState: IvoMethodState;
  /** `nao_definida` enquanto a janela de validade (decisão D7) não existir: nada fica "desatualizado". */
  stalenessPolicy: "definida" | "nao_definida";
  indexEligible: boolean;
  /** Motivos legíveis pelos quais nenhum número pode ser mostrado. Vazio só se `indexEligible`. */
  indexBlockers: readonly string[];
}

export interface BuildCoverageOptions {
  /** Estado do método do índice. Padrão `nenhum` (não há método aprovado). */
  methodState?: IvoMethodState;
  /** Data civil AAAA-MM-DD de referência; usada só se `staleAfterDays` for definido. */
  asOf?: string;
  /** Janela de validade em dias. Sem default: a política é decisão metodológica (D7). */
  staleAfterDays?: number;
}

const METHOD_READY: readonly IvoMethodState[] = ["aprovado_para_piloto", "validado_para_uso_definido"];

const functional = (cell: IvoMatrixCell) => cell.availability === "functional";

function daysBetween(fromIso: string, toDate: string): number {
  const from = new Date(fromIso).getTime();
  const to = new Date(`${toDate}T00:00:00Z`).getTime();
  return Math.floor((to - from) / 86_400_000);
}

export function buildIvoCoverage(matrix: IvoMatrix, options: BuildCoverageOptions = {}): IvoCoverage {
  const methodState = options.methodState ?? "nenhum";
  const stalenessDefined = typeof options.staleAfterDays === "number" && !!options.asOf;
  const methodReady = METHOD_READY.includes(methodState);

  const dimensions = matrix.rows.map(({ dimension, cells }): DimensionCoverage => {
    const live = cells.filter(functional);
    const contributing = live.filter((c) => c.mapping === "approved" && c.evidence.length > 0);
    const make = (state: DimensionCoverageState, reason: string): DimensionCoverage => ({
      dimension: dimension.id,
      label: dimension.label,
      state,
      reason,
      contributingLenses: contributing.map((c) => c.lens),
      numberAllowed: state === "elegivel",
    });

    if (contributing.length > 0) {
      if (stalenessDefined) {
        const fresh = contributing.some((c) => c.lastMeasuredAt && daysBetween(c.lastMeasuredAt, options.asOf!) <= options.staleAfterDays!);
        if (!fresh) return make("desatualizado", "A última leitura está fora da janela de validade do método.");
      }
      return methodReady
        ? make("elegivel", "Mapeamento aprovado, leitura publicada e método aprovado para piloto.")
        : make("metodo_pendente", "Há leitura publicada e mapeamento aprovado, mas não há método do índice aprovado: nenhum valor é calculado.");
    }

    const available = live.filter((c) => c.resultState === "available");
    if (available.some((c) => c.mapping === "proposed")) {
      return make("mapeamento_pendente", "A lente publicou resultado, mas a associação com esta dimensão ainda não foi aprovada.");
    }
    if (available.some((c) => c.mapping === "approved")) {
      return make("sem_medicao", "O construto associado ainda não tem leitura publicada nesta dimensão.");
    }
    if (available.length > 0) {
      return make("nao_coberto", "A lente publicou resultado nativo, mas nenhuma associação com esta dimensão foi aprovada.");
    }
    if (live.some((c) => c.resultState === "protected")) {
      return make("suprimido", "A leitura existe, mas está retida pela proteção de pequenos grupos: ausência não é zero.");
    }
    return make("sem_medicao", "Nenhuma leitura publicada sustenta esta dimensão.");
  });

  const blockers: string[] = [];
  if (!methodReady) blockers.push("não há método do índice aprovado");
  const notEligible = dimensions.filter((d) => d.state !== "elegivel");
  if (notEligible.length > 0) {
    blockers.push(`dimensões sem elegibilidade: ${notEligible.map((d) => `${d.label} (${DIMENSION_COVERAGE_LABEL[d.state].toLowerCase()})`).join(", ")}`);
  }

  return {
    dimensions,
    methodState,
    stalenessPolicy: stalenessDefined ? "definida" : "nao_definida",
    indexEligible: blockers.length === 0,
    indexBlockers: blockers,
  };
}
