// Tipos PUROS das visões da experiência IVO, compartilhados entre o servidor
// (ivo-q2-reading.server.ts, fibt-action-loop.server.ts) e o cliente (rotas e
// componentes). Sem I/O — o cliente nunca importa de `.server.ts`.

import type { ManagerAnalytics } from "@/lib/fibt/fibt-manager-control-center";
import type { IvoDimensionId, NormalizedLensReading } from "@/engine/ivo/lens-contract";
import type { PlanActionStatus } from "@/engine/action-plan/action-log-engine";

// ─── R5 · leitura Q2 ─────────────────────────────────────────────────────────

/** Agrupamento de estados para a experiência IVO (o estado nativo viaja junto). */
export type IvoQ2SectorGroup =
  | "no_data"
  | "collecting"
  | "suppressed"
  | "pending_publication"
  | "available"
  | "unavailable";

export interface IvoQ2Sector {
  cohortId: string;
  key: string;
  label: string;
  group: IvoQ2SectorGroup;
  /** Estado nativo do leitor FIB-T, sem tradução. */
  nativeState: ManagerAnalytics["state"];
  /** Rótulo já protegido pelo leitor: número só quando publicado. */
  countLabel: string;
  message: string | null;
  publishedAt: string | null;
  /** Somente quando `group === "available"`. Escala 0–4 do instrumento. */
  factors: ReadonlyArray<{ id: string; name: string; mean: number }> | null;
  /** Somente quando `group === "available"`. Escala 0–12 do instrumento. */
  rawScore: number | null;
}

export interface IvoQ2View {
  organizationName: string;
  cycleKey: string;
  wave: { id: string; label: string; status: string; createdAt: string; closesAt: string | null };
  methodology: {
    instrumentId: string;
    instrumentName: string;
    /** Versão declarada na onda — a que foi aplicada. */
    waveInstrumentVersion: string;
    /** Versão do manifesto carregado — a usada no cálculo. */
    manifestVersion: string;
    manifestStatus: string;
    calculationVersion: string;
    author: string;
    citation: string;
    kMin: number;
    factorScale: { min: number; max: number };
    rawScoreMax: number;
  };
  overall: "no_data" | "collecting" | "protected" | "available";
  sectors: readonly IvoQ2Sector[];
  reading: NormalizedLensReading;
  privacy: { kMin: number; individualResponsesExposed: false; waveLevelReading: "unavailable" };
}

export type IvoFailureCategory =
  | "unauthenticated"
  | "forbidden"
  | "unavailable"
  | "hml_boundary"
  | "validation"
  | "backend";

export type IvoQ2Failure = { ok: false; category: IvoFailureCategory; error: string };

export type IvoQ2Outcome =
  | { ok: true; state: "ready"; view: IvoQ2View }
  | { ok: true; state: "no_wave" }
  | IvoQ2Failure;

// ─── R6 · ciclo de ação ─────────────────────────────────────────────────────

export interface FibtEvidenceView {
  id: string;
  kind: string;
  content: string;
  occurredOn: string;
  recordedAt: string;
}

export interface FibtActionView {
  id: string;
  planId: string;
  rank: number;
  title: string;
  description: string;
  effort: "baixo" | "medio" | "alto";
  status: PlanActionStatus;
  owner: { roleLabel: string; isCurrentUser: boolean } | null;
  dueOn: string | null;
  executionMetric: { label: string; baseline: number; target: number; unit: string } | null;
  source: {
    lens: "fibt";
    waveId: string;
    cohortId: string;
    cohortLabel: string | null;
    factorId: string;
    factorName: string;
    instrumentVersion: string;
    publishedAt: string;
  };
  dimension: { status: "mapping_pending" | "mapped"; dimensionIds: readonly IvoDimensionId[] };
  evidence: { execution: FibtEvidenceView[]; learning: FibtEvidenceView[] };
  efficacy: { status: "not_evaluated"; reason: string };
  timeline: Array<{ id: string; kind: string; toStatus: PlanActionStatus | null; note: string | null; occurredAt: string }>;
}

export interface FibtActionPlanView {
  id: string;
  cycleKey: string;
  cycleKeyCanonical: string | null;
  status: "draft" | "active" | "closed";
  createdAt: string;
  activatedAt: string | null;
  missingAccountability: number;
  actions: FibtActionView[];
}

export type LedgerFailure = { ok: false; category: IvoFailureCategory; error: string };

export type LoadFibtActionLoopOutcome = { ok: true; plans: FibtActionPlanView[] } | LedgerFailure;

export type LedgerWriteOutcome =
  | { ok: true; accepted: true; id: string | null }
  | { ok: true; accepted: false; reason: string; message: string }
  | LedgerFailure;

export const EFFICACY_NOT_EVALUATED_REASON =
  "Concluir a ação ou registrar evidência mostra que ela aconteceu — não que o indicador melhorou, " +
  "nem que a melhora foi causada por ela. O critério de eficácia (comparação entre leituras publicadas " +
  "de ciclos diferentes) ainda depende de decisão metodológica.";
