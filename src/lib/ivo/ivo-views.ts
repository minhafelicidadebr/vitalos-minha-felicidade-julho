// Tipos PUROS das visões da experiência IVO, compartilhados entre o servidor
// (ivo-q2-reading.server.ts, fibt-action-loop.server.ts) e o cliente (rotas e
// componentes). Sem I/O — o cliente nunca importa de `.server.ts`.

import type { ManagerAnalytics } from "@/lib/fibt/fibt-manager-control-center";
import type { IvoDimensionId, NormalizedLensReading } from "@/engine/ivo/lens-contract";
import type { PlanActionStatus } from "@/engine/action-plan/action-log-engine";
import type { EfficacyState, EfficacyVerdict, EvidenceGrade, IndicatorKind, IndicatorOrigin, ObservedChange, PublicationRef, WindowStatus } from "@/engine/ivo/efficacy-protocol";
import type { GovernanceEntry, GovernanceState } from "@/engine/ivo/governance-decision";

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
  | "module_disabled"
  | "unavailable"
  | "hml_boundary"
  | "validation"
  | "backend";

/**
 * Caminho já autorizado ao papel recusado (colaborador → Diário de Prática,
 * só agregados coletivos k≥5). É orientação, nunca dado: não amplia autoridade.
 */
export type IvoMemberPath = { href: "/diario"; label: string; description: string };

export type IvoQ2Failure = { ok: false; category: IvoFailureCategory; error: string; memberPath?: IvoMemberPath };

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
  /** PI-13: preenchido quando a ação foi incluída DEPOIS da criação do plano (quando e por qual papel). */
  addedLater: { at: string; byRole: string } | null;
}

export interface FibtActionPlanView {
  id: string;
  cycleKey: string;
  cycleKeyCanonical: string | null;
  status: "draft" | "active" | "closed";
  createdAt: string;
  activatedAt: string | null;
  /** PI-13: encerramento OPERACIONAL (instante definido pelo banco e papel de quem encerrou). Não indica eficácia. */
  closedAt: string | null;
  closedByRole: string | null;
  /**
   * PI-13: `unavailable` quando o banco ainda não tem a migration de inclusão/encerramento
   * (código novo publicado antes dela): a interface não oferece as duas operações.
   */
  composition: "available" | "unavailable";
  missingAccountability: number;
  actions: FibtActionView[];
}

export type LedgerFailure = { ok: false; category: IvoFailureCategory; error: string };

export type LoadFibtActionLoopOutcome = { ok: true; plans: FibtActionPlanView[] } | LedgerFailure;

export type LedgerWriteOutcome =
  /** `replayed`: o mesmo pedido já havia sido aplicado antes; nada foi gravado de novo. */
  | { ok: true; accepted: true; id: string | null; replayed?: true }
  | { ok: true; accepted: false; reason: string; message: string }
  | LedgerFailure;

export const EFFICACY_NOT_EVALUATED_REASON =
  "Concluir a ação ou registrar evidência mostra que ela aconteceu — não que o indicador melhorou, " +
  "nem que a melhora foi causada por ela. O critério de eficácia (comparação entre leituras publicadas " +
  "de ciclos diferentes) ainda depende de decisão metodológica.";

// ─── C8 · protocolo de eficácia (rascunho → registrado → observação → parecer) ───
/** Campos do protocolo; TODOS anuláveis para permitir rascunho incompleto. */
export interface EfficacyProtocolFields {
  objective: string | null;
  indicatorLabel: string | null;
  indicatorKind: IndicatorKind | null;
  indicatorOrigin: IndicatorOrigin | null;
  unit: string | null;
  direction: "aumentar" | "diminuir" | null;
  baselineObservedOn: string | null;
  baselinePopulation: string | null;
  baselineSource: string | null;
  /** Só `medida_da_organizacao`. Em leitura publicada é SEMPRE null (nunca se persiste valor protegido). */
  baselineValue: number | null;
  /** Só `leitura_publicada`: referência (coorte, ciclo, versões), nunca valor. */
  baselineRef: PublicationRef | null;
  targetKind: "numerico" | "qualitativo" | null;
  targetValue: number | null;
  targetCriterion: string | null;
  meaningfulDifference: number | null;
  windowStart: string | null;
  windowEnd: string | null;
  source: string | null;
  comparisonRule: { sameCohort: boolean; sameInstrumentVersion: boolean; sameCalculationVersion: boolean } | null;
  responsibleRole: string | null;
  reviewerRole: string | null;
  limitations: string[];
}
export interface EfficacyProtocolView extends EfficacyProtocolFields {
  id: string;
  itemId: string;
  revision: number;
  status: "draft" | "registered";
  supersedesId: string | null;
  createdAt: string;
  updatedAt: string;
  registeredAt: string | null;
}
export interface EfficacyObservationView {
  id: string;
  protocolId: string;
  observedOn: string;
  /** Só `medida_da_organizacao`. */
  value: number | null;
  ref: PublicationRef | null;
  note: string;
  recordedAt: string;
}
export interface EfficacyVerdictView {
  id: string;
  protocolId: string;
  observationId: string | null;
  verdict: EfficacyVerdict;
  claimScope: IndicatorKind;
  evidenceGrade: EvidenceGrade;
  observedChange: ObservedChange;
  targetReached: boolean | null;
  attribution: { status: "nao_avaliada" | "nao_sustentada" | "sustentada_por_desenho"; design: string | null };
  reason: string;
  limitations: string[];
  reviewerRole: string;
  governance: { decision: string; state: string; source: "registro_canonico" | "teste_sintetico" };
  createdAt: string;
}
/** Cálculo da última observação com valor resolvido (só `medida_da_organizacao`). */
export interface EfficacyAssessmentView {
  observationId: string;
  observedChange: ObservedChange;
  delta: number | null;
  changeIsDescriptiveOnly: boolean;
  targetReached: boolean | null;
  comparable: boolean;
  reasons: string[];
}
export interface EfficacyItemView {
  itemId: string;
  /** Rascunho aberto (editável), se houver. Não vale como protocolo até ser registrado. */
  draft: EfficacyProtocolView | null;
  /** Última revisão REGISTRADA — a que vale para observações e pareceres. */
  registered: EfficacyProtocolView | null;
  /** Revisões registradas anteriores à vigente (somente contagem; a história fica no banco). */
  previousRevisions: number;
  observations: EfficacyObservationView[];
  verdict: EfficacyVerdictView | null;
  state: EfficacyState;
  stateLabel: string;
  windowStatus: WindowStatus | null;
  /** Do rascunho aberto: o que falta para registrar (vazio ⇒ pode registrar). */
  registrationIssues: string[];
  assessment: EfficacyAssessmentView | null;
}
export interface EfficacyGovernanceView {
  decisionId: "D9";
  state: GovernanceState;
  source: "registro_canonico" | "teste_sintetico";
  conclusiveAllowed: boolean;
  reason: string | null;
}
export type LoadEfficacyOutcome =
  | { ok: true; items: EfficacyItemView[]; governance: EfficacyGovernanceView }
  | LedgerFailure;
export type EfficacyWriteOutcome =
  | { ok: true; accepted: true; id: string | null }
  | { ok: true; accepted: false; reason: string; message: string; errors: string[] }
  | LedgerFailure;

// ─── R8 · governança metodológica ────────────────────────────────────────────
export interface GovernanceAuthorityView {
  configured: boolean;
  canApprove: boolean;
  reason: string | null;
}
export type LoadGovernanceOutcome =
  | {
    ok: true;
    registryVersion: string;
    authorityPolicy: string;
    entries: GovernanceEntry[];
    counts: Record<GovernanceState, number>;
    authority: GovernanceAuthorityView;
    efficacyGate: EfficacyGovernanceView;
  }
  | LedgerFailure;
export type PrepareGovernanceDecisionOutcome =
  | { ok: true; accepted: true; entry: GovernanceEntry; audit: { entryId: string; from: GovernanceState; to: GovernanceState; by: string; at: string; test: boolean }; note: string }
  | { ok: true; accepted: false; reason: string; message: string; errors: string[] }
  | LedgerFailure;

// ─── R7 · educação (catálogo curatorial fator → conteúdo) ───────────────────
export interface EducationContentView {
  usageNotice?: string;
  activity?: import("./learning-application").LearningActivity;
  contentId: string;
  factorId: string;
  status: "APROVADO" | "TESTE";
  version: string;
  title: string;
  objective: string;
  audience: string;
  format: string;
  estimatedMinutes: number;
  body: string[];
  evidenceCodes: string[];
  safeClaimIds: string[];
}
export interface EducationCatalogView {
  curationStatus: string;
  curationDecision: string;
  approvedCount: number;
  /** true quando conteúdo de TESTE está visível (runtime local descartável). */
  testVisible: boolean;
}
export type LoadEducationOutcome =
  | { ok: true; catalog: EducationCatalogView; byFactor: Record<string, EducationContentView[]> }
  | LedgerFailure;
