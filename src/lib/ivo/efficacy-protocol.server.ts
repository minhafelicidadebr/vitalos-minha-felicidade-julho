// IVO C8 — protocolo de eficácia: rascunho → registrado → observação → parecer.
//
// Spec: docs/vitalos/specs/efficacy-protocol-c8.md. Persistência: migration
// 20261005120000 (tabelas efficacy_*; escrita somente por service_role).
//
// Regras desta camada (todas no servidor):
//   · mesma autorização do ledger (capability + sessão + papel + organização);
//   · nenhum orgId do cliente; posse do item conferida antes de qualquer escrita;
//   · protocolo INCOMPLETO permanece em rascunho (persistível); registrar exige
//     o contrato completo (validateEfficacyProtocol) — e o banco repete a regra;
//   · NUNCA persiste valor de leitura publicada: só referência; valores ausentes
//     continuam ausentes (nada vira zero);
//   · o estado da AÇÃO não é entrada da avaliação;
//   · parecer CONCLUSIVO exige D9 aprovada (registro canônico, ou override de
//     teste identificado em runtime local descartável); sem isso só "inconclusiva";
//   · resolução de valores de leituras publicadas de outros ciclos ainda não
//     existe: pareceres conclusivos e observações sobre `leitura_publicada` ficam
//     indisponíveis com motivo explícito (PI do roadmap).
import { authorizeLedger, ledgerOf, type FibtActionLoopDeps } from "./fibt-action-loop.server";
import { isConclusiveAllowed, resolveEfficacyGovernanceGate, type GovernanceGate } from "./ivo-governance-gate.server";
import { efficacyIssueLabel } from "./efficacy-labels";
import { todayInSaoPaulo } from "./local-date";
import {
  EFFICACY_PROTOCOL_CONTRACT,
  EFFICACY_STATE_LABEL,
  assessObservation,
  deriveEfficacyState,
  isIsoDate,
  validateEfficacyProtocol,
  validateVerdict,
  windowStatus,
  type Assessment,
  type EfficacyObservation,
  type EfficacyProtocol,
  type EvidenceGrade,
  type PublicationRef,
  type VerdictInput,
} from "@/engine/ivo/efficacy-protocol";
import { normalizeCycleKey } from "@/domain/ivo/cycle-key";
import { getFibtManifest } from "@/domain/instruments/fibt/fibt-instrument";
import type {
  EfficacyAssessmentView,
  EfficacyGovernanceView,
  EfficacyItemView,
  EfficacyObservationView,
  EfficacyProtocolFields,
  EfficacyProtocolView,
  EfficacyVerdictView,
  EfficacyWriteOutcome,
  LoadEfficacyOutcome,
} from "./ivo-views";

// ─── Linhas e store ─────────────────────────────────────────────────────────
export interface EfficacyProtocolRow extends EfficacyProtocolFields {
  id: string;
  orgId: string;
  itemId: string;
  revision: number;
  status: "draft" | "registered";
  supersedesId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  registeredAt: string | null;
}
export interface EfficacyObservationRow {
  id: string;
  orgId: string;
  protocolId: string;
  observedOn: string;
  value: number | null;
  ref: PublicationRef | null;
  note: string;
  recordedBy: string;
  createdAt: string;
}
export interface EfficacyVerdictRow {
  id: string;
  orgId: string;
  protocolId: string;
  observationId: string | null;
  verdict: "meta_atingida" | "meta_nao_atingida" | "inconclusiva";
  claimScope: "execucao" | "resultado";
  evidenceGrade: EvidenceGrade;
  observedChange: "melhorou" | "piorou" | "sem_mudanca" | "nao_comparavel";
  targetReached: boolean | null;
  attributionStatus: "nao_avaliada" | "nao_sustentada" | "sustentada_por_desenho";
  attributionDesign: string | null;
  reason: string;
  limitations: string[];
  reviewerUserId: string;
  reviewerRole: string;
  governanceDecision: string;
  governanceState: string;
  governanceSource: "registro_canonico" | "teste_sintetico";
  createdAt: string;
}
export interface EfficacyData {
  protocols: EfficacyProtocolRow[];
  observations: EfficacyObservationRow[];
  verdicts: EfficacyVerdictRow[];
}
export interface StoreWrite {
  accepted: boolean;
  reason: string | null;
  id: string | null;
}
export type NewProtocol = Omit<EfficacyProtocolRow, "id" | "createdAt" | "updatedAt" | "registeredAt">;
export interface EfficacyStore {
  load(orgId: string): Promise<EfficacyData>;
  insertProtocol(row: NewProtocol): Promise<StoreWrite>;
  updateProtocol(orgId: string, id: string, patch: Partial<EfficacyProtocolFields> | { status: "registered" }): Promise<StoreWrite>;
  insertObservation(row: Omit<EfficacyObservationRow, "id" | "createdAt">): Promise<StoreWrite>;
  insertVerdict(row: Omit<EfficacyVerdictRow, "id" | "createdAt">): Promise<StoreWrite>;
  /** Referência da leitura publicada que originou a ação (nunca valor). */
  deriveSourceRef(orgId: string, itemId: string): Promise<PublicationRef | null>;
}
export interface EfficacyDeps extends FibtActionLoopDeps {
  efficacy?: EfficacyStore;
  governance?: () => GovernanceGate;
}

export const EMPTY_FIELDS: EfficacyProtocolFields = {
  objective: null,
  indicatorLabel: null,
  indicatorKind: null,
  indicatorOrigin: null,
  unit: null,
  direction: null,
  baselineObservedOn: null,
  baselinePopulation: null,
  baselineSource: null,
  baselineValue: null,
  baselineRef: null,
  targetKind: null,
  targetValue: null,
  targetCriterion: null,
  meaningfulDifference: null,
  windowStart: null,
  windowEnd: null,
  source: null,
  comparisonRule: null,
  responsibleRole: null,
  reviewerRole: null,
  limitations: [],
};

const REASON_MESSAGE: Record<string, string> = {
  item_not_found: "Ação não encontrada nesta organização.",
  protocol_not_found: "Esta ação ainda não tem protocolo registrado.",
  protocol_registered_use_revision: "O protocolo já foi registrado. Inicie uma nova revisão para alterá-lo.",
  draft_not_found: "Não há rascunho de protocolo para esta ação.",
  draft_already_open: "Já existe um rascunho aberto para esta ação.",
  nothing_to_revise: "Só é possível revisar um protocolo já registrado.",
  protocol_incomplete: "O protocolo está incompleto. Ele permanece em rascunho.",
  source_reference_unavailable: "Não foi possível derivar a referência da leitura publicada que originou a ação.",
  published_reading_resolution_pending:
    "Observação e parecer conclusivo sobre leitura publicada de outro ciclo ainda não estão disponíveis: a resolução protegida do valor não foi implementada. Nada foi gravado.",
  governance_pending:
    "A decisão D9 (parâmetros do protocolo de eficácia) ainda não foi aprovada. Nesta fase só o parecer 'inconclusiva' é aceito; o protocolo pode ser preparado e registrado.",
  invalid_date: "Data inválida ou no futuro.",
  invalid_value: "Informe um valor numérico.",
  observation_outside_window: "A observação está fora da janela do protocolo.",
  observation_not_found: "Observação não encontrada neste protocolo.",
  reviewer_not_independent: "O parecer deve ser emitido por pessoa diferente de quem criou o protocolo.",
  verdict_invalid: "O parecer não é coerente com o protocolo e o cálculo.",
  protocol_registered_is_immutable: "O protocolo registrado não pode ser alterado.",
  db_error: "O registro não pôde ser gravado agora. Nada foi alterado.",
};
function rejected(reason: string, errors: readonly string[] = []): EfficacyWriteOutcome {
  const detail = errors.length > 0 ? ` ${errors.map(efficacyIssueLabel).join(" ")}` : "";
  return { ok: true, accepted: false, reason, message: `${REASON_MESSAGE[reason] ?? REASON_MESSAGE.db_error}${detail}`, errors: [...errors] };
}

/** Traduz erros do banco (gatilhos/CHECKs da migration) em motivos estáveis. */
export function mapEfficacyDbError(error: { code?: string; message?: string } | null | undefined): string {
  const message = error?.message ?? "";
  if (message.includes("efficacy_protocol_registered_is_immutable")) return "protocol_registered_is_immutable";
  if (message.includes("efficacy_observation_outside_window")) return "observation_outside_window";
  if (message.includes("efficacy_verdict_reviewer_must_be_independent")) return "reviewer_not_independent";
  if (message.includes("efficacy_protocols_registered_complete")) return "protocol_incomplete";
  if (error?.code === "23505") return "draft_already_open";
  return "db_error";
}

// ─── Conversões puras ───────────────────────────────────────────────────────
const clean = (v: string | null | undefined): string | null => {
  const t = v?.trim();
  return t ? t : null;
};

/** Monta o protocolo do motor a partir de um rascunho (campos ausentes viram pendências). */
export function draftToEngine(row: EfficacyProtocolFields & { revision: number }): { protocol: EfficacyProtocol; missing: string[] } {
  const missing: string[] = [];
  if (!row.indicatorKind) missing.push("tipo_de_indicador_ausente");
  if (!row.indicatorOrigin) missing.push("origem_ausente");
  if (!row.comparisonRule) missing.push("regra_de_comparacao_ausente");
  const protocol: EfficacyProtocol = {
    contractVersion: EFFICACY_PROTOCOL_CONTRACT,
    revision: row.revision,
    objective: row.objective ?? "",
    indicator: {
      label: row.indicatorLabel ?? "",
      kind: row.indicatorKind ?? "resultado",
      origin: row.indicatorOrigin ?? "medida_da_organizacao",
      unit: row.unit ?? "",
      direction: row.direction,
    },
    baseline:
      row.baselineObservedOn || row.baselinePopulation || row.baselineSource || row.baselineValue !== null || row.baselineRef
        ? {
            observedOn: row.baselineObservedOn ?? "",
            population: row.baselinePopulation ?? "",
            source: row.baselineSource ?? "",
            value: row.baselineValue,
            ref: row.baselineRef,
          }
        : null,
    target:
      row.targetKind === "numerico" && row.targetValue !== null
        ? { kind: "numerico", value: row.targetValue }
        : row.targetKind === "qualitativo"
          ? { kind: "qualitativo", criterion: row.targetCriterion ?? "" }
          : null,
    meaningfulDifference: row.meaningfulDifference,
    window: { start: row.windowStart ?? "", end: row.windowEnd ?? "" },
    source: row.source ?? "",
    comparisonRule: {
      sameCohort: row.comparisonRule?.sameCohort ?? false,
      sameInstrumentVersion: row.comparisonRule?.sameInstrumentVersion ?? false,
      sameCalculationVersion: row.comparisonRule?.sameCalculationVersion ?? false,
      requirePublished: true,
    },
    responsibleRole: row.responsibleRole ?? "",
    reviewerRole: row.reviewerRole ?? "",
    limitations: row.limitations,
  };
  return { protocol, missing };
}

/** O que falta para registrar o rascunho (vazio ⇒ pode registrar). Nunca inventa valor. */
export function registrationIssues(row: EfficacyProtocolFields & { revision: number }): string[] {
  const { protocol, missing } = draftToEngine(row);
  const result = validateEfficacyProtocol(protocol);
  const errors = result.ok ? [] : [...result.errors];
  if (protocol.indicator.kind === "resultado" && row.targetKind === "numerico" && row.targetValue === null) {
    errors.push("meta_numerica_invalida");
  }
  return [...new Set([...missing, ...errors])];
}

function fieldsOf(row: EfficacyProtocolRow): EfficacyProtocolFields {
  const { objective, indicatorLabel, indicatorKind, indicatorOrigin, unit, direction, baselineObservedOn, baselinePopulation, baselineSource, baselineValue, baselineRef, targetKind, targetValue, targetCriterion, meaningfulDifference, windowStart, windowEnd, source, comparisonRule, responsibleRole, reviewerRole, limitations } = row;
  return { objective, indicatorLabel, indicatorKind, indicatorOrigin, unit, direction, baselineObservedOn, baselinePopulation, baselineSource, baselineValue, baselineRef, targetKind, targetValue, targetCriterion, meaningfulDifference, windowStart, windowEnd, source, comparisonRule, responsibleRole, reviewerRole, limitations };
}
const protocolView = (row: EfficacyProtocolRow): EfficacyProtocolView => ({
  ...fieldsOf(row),
  id: row.id,
  itemId: row.itemId,
  revision: row.revision,
  status: row.status,
  supersedesId: row.supersedesId,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  registeredAt: row.registeredAt,
});
const observationView = (o: EfficacyObservationRow): EfficacyObservationView => ({
  id: o.id,
  protocolId: o.protocolId,
  observedOn: o.observedOn,
  value: o.value,
  ref: o.ref,
  note: o.note,
  recordedAt: o.createdAt,
});
const verdictView = (v: EfficacyVerdictRow): EfficacyVerdictView => ({
  id: v.id,
  protocolId: v.protocolId,
  observationId: v.observationId,
  verdict: v.verdict,
  claimScope: v.claimScope,
  evidenceGrade: v.evidenceGrade,
  observedChange: v.observedChange,
  targetReached: v.targetReached,
  attribution: { status: v.attributionStatus, design: v.attributionDesign },
  reason: v.reason,
  limitations: v.limitations,
  reviewerRole: v.reviewerRole,
  governance: { decision: v.governanceDecision, state: v.governanceState, source: v.governanceSource },
  createdAt: v.createdAt,
});

const byRecency = <T extends { createdAt: string }>(a: T, b: T) => a.createdAt.localeCompare(b.createdAt);
const latestObservation = (list: EfficacyObservationRow[]): EfficacyObservationRow | null =>
  [...list].sort((a, b) => a.observedOn.localeCompare(b.observedOn) || byRecency(a, b)).at(-1) ?? null;

function engineObservation(o: EfficacyObservationRow): EfficacyObservation {
  return { id: o.id, observedOn: o.observedOn, value: o.value, ref: o.ref };
}

/** Cálculo da observação mais recente — só quando o valor é resolvível sem violar a regra de referência. */
function assessLatest(registered: EfficacyProtocolRow, observations: EfficacyObservationRow[]): EfficacyAssessmentView | null {
  const latest = latestObservation(observations);
  if (!latest || registered.indicatorOrigin !== "medida_da_organizacao") return null;
  const { protocol } = draftToEngine(registered);
  const a = assessObservation({ protocol, observation: engineObservation(latest), baselineValue: registered.baselineValue, observedValue: latest.value });
  return {
    observationId: latest.id,
    observedChange: a.observedChange,
    delta: a.delta,
    changeIsDescriptiveOnly: a.changeIsDescriptiveOnly,
    targetReached: a.targetReached,
    comparable: a.comparability.comparable,
    reasons: [...a.reasons],
  };
}

export function buildEfficacyItemViews(data: EfficacyData, orgId: string, today: string): EfficacyItemView[] {
  const protocols = data.protocols.filter((p) => p.orgId === orgId);
  const itemIds = [...new Set(protocols.map((p) => p.itemId))];
  return itemIds.map((itemId): EfficacyItemView => {
    const own = protocols.filter((p) => p.itemId === itemId).sort((a, b) => a.revision - b.revision);
    const draft = own.find((p) => p.status === "draft") ?? null;
    const registeredList = own.filter((p) => p.status === "registered");
    const registered = registeredList.at(-1) ?? null;
    const observations = registered ? data.observations.filter((o) => o.orgId === orgId && o.protocolId === registered.id) : [];
    const verdictRow = registered
      ? ([...data.verdicts.filter((v) => v.orgId === orgId && v.protocolId === registered.id)].sort(byRecency).at(-1) ?? null)
      : null;
    const engine = registered ? draftToEngine(registered).protocol : null;
    const state = deriveEfficacyState({
      protocol: engine,
      observations,
      verdict: verdictRow && registered ? { verdict: verdictRow.verdict, protocolRevision: registered.revision } : null,
    });
    return {
      itemId,
      draft: draft ? protocolView(draft) : null,
      registered: registered ? protocolView(registered) : null,
      previousRevisions: Math.max(0, registeredList.length - 1),
      observations: observations.sort((a, b) => a.observedOn.localeCompare(b.observedOn) || byRecency(a, b)).map(observationView),
      verdict: verdictRow ? verdictView(verdictRow) : null,
      state,
      stateLabel: EFFICACY_STATE_LABEL[state],
      windowStatus: engine ? windowStatus(engine, today) : null,
      registrationIssues: draft ? registrationIssues(draft) : [],
      assessment: registered ? assessLatest(registered, observations) : null,
    };
  });
}

function governanceView(gate: GovernanceGate): EfficacyGovernanceView {
  const allowed = isConclusiveAllowed(gate);
  return {
    decisionId: "D9",
    state: gate.state,
    source: gate.source,
    conclusiveAllowed: allowed,
    reason: allowed ? null : REASON_MESSAGE.governance_pending!,
  };
}

// ─── Leituras e escritas ────────────────────────────────────────────────────
const storeOf = (deps: EfficacyDeps): EfficacyStore => deps.efficacy ?? createSupabaseEfficacyStore();
const gateOf = (deps: EfficacyDeps): GovernanceGate => (deps.governance ?? (() => resolveEfficacyGovernanceGate()))();
const todayOf = (deps: EfficacyDeps): string => todayInSaoPaulo((deps.now ?? (() => new Date()))());

export async function loadEfficacyForSession(input: { accessToken?: string }, deps: EfficacyDeps = {}): Promise<LoadEfficacyOutcome> {
  const auth = await authorizeLedger(input.accessToken, deps);
  if (!auth.ok) return auth;
  try {
    const data = await storeOf(deps).load(auth.orgId);
    return { ok: true, items: buildEfficacyItemViews(data, auth.orgId, todayOf(deps)), governance: governanceView(gateOf(deps)) };
  } catch {
    return { ok: false, category: "backend", error: "Os protocolos de eficácia não puderam ser carregados agora." };
  }
}

async function authorizeItem(accessToken: string | undefined, itemId: string, deps: EfficacyDeps) {
  const auth = await authorizeLedger(accessToken, deps);
  if (!auth.ok) return { fail: auth as EfficacyWriteOutcome, auth: null, item: null } as const;
  const item = await ledgerOf(deps).findItem(auth.orgId, itemId);
  if (!item || item.orgId !== auth.orgId || item.sourceLensId !== "fibt") return { fail: rejected("item_not_found"), auth: null, item: null } as const;
  return { fail: null, auth, item } as const;
}

const toWrite = (r: StoreWrite): EfficacyWriteOutcome =>
  r.accepted ? { ok: true, accepted: true, id: r.id } : rejected(r.reason ?? "db_error");

/** Normaliza o rascunho: valor de leitura publicada nunca é mantido; referência só em leitura publicada. */
export function normalizeDraftFields(fields: EfficacyProtocolFields): EfficacyProtocolFields {
  const next: EfficacyProtocolFields = {
    ...fields,
    objective: clean(fields.objective),
    indicatorLabel: clean(fields.indicatorLabel),
    unit: clean(fields.unit),
    baselinePopulation: clean(fields.baselinePopulation),
    baselineSource: clean(fields.baselineSource),
    targetCriterion: clean(fields.targetCriterion),
    source: clean(fields.source),
    responsibleRole: clean(fields.responsibleRole),
    reviewerRole: clean(fields.reviewerRole),
    limitations: fields.limitations.map((l) => l.trim()).filter(Boolean),
  };
  if (next.indicatorOrigin === "leitura_publicada") next.baselineValue = null;
  if (next.indicatorOrigin === "medida_da_organizacao") next.baselineRef = null;
  if (next.targetKind === "numerico") next.targetCriterion = null;
  if (next.targetKind === "qualitativo") next.targetValue = null;
  return next;
}

export async function saveEfficacyDraft(
  input: { accessToken?: string; itemId: string; fields: Partial<EfficacyProtocolFields>; useSourceAsBaseline?: boolean },
  deps: EfficacyDeps = {},
): Promise<EfficacyWriteOutcome> {
  const a = await authorizeItem(input.accessToken, input.itemId, deps);
  if (a.fail) return a.fail;
  const store = storeOf(deps);
  try {
    const data = await store.load(a.auth.orgId);
    const own = data.protocols.filter((p) => p.itemId === input.itemId && p.orgId === a.auth.orgId);
    const draft = own.find((p) => p.status === "draft");
    if (!draft && own.some((p) => p.status === "registered")) return rejected("protocol_registered_use_revision");
    const merged = normalizeDraftFields({ ...(draft ? fieldsOf(draft) : EMPTY_FIELDS), ...input.fields });
    if (input.useSourceAsBaseline && merged.indicatorOrigin === "leitura_publicada") {
      const ref = await store.deriveSourceRef(a.auth.orgId, input.itemId);
      if (!ref) return rejected("source_reference_unavailable");
      merged.baselineRef = ref;
      merged.baselineValue = null;
    }
    if (draft) return toWrite(await store.updateProtocol(a.auth.orgId, draft.id, merged));
    return toWrite(
      await store.insertProtocol({ ...merged, orgId: a.auth.orgId, itemId: input.itemId, revision: 1, status: "draft", supersedesId: null, createdBy: a.auth.userId }),
    );
  } catch {
    return rejected("db_error");
  }
}

export async function startEfficacyRevision(input: { accessToken?: string; itemId: string }, deps: EfficacyDeps = {}): Promise<EfficacyWriteOutcome> {
  const a = await authorizeItem(input.accessToken, input.itemId, deps);
  if (a.fail) return a.fail;
  try {
    const data = await storeOf(deps).load(a.auth.orgId);
    const own = data.protocols.filter((p) => p.itemId === input.itemId && p.orgId === a.auth.orgId).sort((x, y) => x.revision - y.revision);
    if (own.some((p) => p.status === "draft")) return rejected("draft_already_open");
    const latest = own.at(-1);
    if (!latest || latest.status !== "registered") return rejected("nothing_to_revise");
    return toWrite(
      await storeOf(deps).insertProtocol({ ...fieldsOf(latest), orgId: a.auth.orgId, itemId: input.itemId, revision: latest.revision + 1, status: "draft", supersedesId: latest.id, createdBy: a.auth.userId }),
    );
  } catch {
    return rejected("db_error");
  }
}

export async function registerEfficacyProtocol(input: { accessToken?: string; itemId: string }, deps: EfficacyDeps = {}): Promise<EfficacyWriteOutcome> {
  const a = await authorizeItem(input.accessToken, input.itemId, deps);
  if (a.fail) return a.fail;
  const store = storeOf(deps);
  try {
    const data = await store.load(a.auth.orgId);
    const draft = data.protocols.find((p) => p.itemId === input.itemId && p.orgId === a.auth.orgId && p.status === "draft");
    if (!draft) return rejected("draft_not_found");
    const issues = registrationIssues(draft);
    if (issues.length > 0) return rejected("protocol_incomplete", issues);
    return toWrite(await store.updateProtocol(a.auth.orgId, draft.id, { status: "registered" }));
  } catch {
    return rejected("db_error");
  }
}

function registeredOf(data: EfficacyData, orgId: string, itemId: string): EfficacyProtocolRow | null {
  return data.protocols.filter((p) => p.orgId === orgId && p.itemId === itemId && p.status === "registered").sort((x, y) => x.revision - y.revision).at(-1) ?? null;
}

export async function recordEfficacyObservation(
  input: { accessToken?: string; itemId: string; observedOn: string; value: number; note?: string },
  deps: EfficacyDeps = {},
): Promise<EfficacyWriteOutcome> {
  const a = await authorizeItem(input.accessToken, input.itemId, deps);
  if (a.fail) return a.fail;
  const store = storeOf(deps);
  try {
    const registered = registeredOf(await store.load(a.auth.orgId), a.auth.orgId, input.itemId);
    if (!registered) return rejected("protocol_not_found");
    if (registered.indicatorOrigin === "leitura_publicada") return rejected("published_reading_resolution_pending");
    if (!isIsoDate(input.observedOn) || input.observedOn > todayOf(deps)) return rejected("invalid_date");
    if (!Number.isFinite(input.value)) return rejected("invalid_value");
    if (input.observedOn < (registered.windowStart ?? "") || input.observedOn > (registered.windowEnd ?? "")) return rejected("observation_outside_window");
    return toWrite(
      await store.insertObservation({ orgId: a.auth.orgId, protocolId: registered.id, observedOn: input.observedOn, value: input.value, ref: null, note: (input.note ?? "").trim(), recordedBy: a.auth.userId }),
    );
  } catch {
    return rejected("db_error");
  }
}

export interface VerdictRequest {
  accessToken?: string;
  itemId: string;
  verdict: "meta_atingida" | "meta_nao_atingida" | "inconclusiva";
  evidenceGrade: EvidenceGrade;
  attribution?: { status: "nao_avaliada" | "nao_sustentada" | "sustentada_por_desenho"; design?: string };
  reason?: string;
  limitations?: string[];
  /** Só para meta QUALITATIVA: o revisor declara se foi atingida. */
  qualitativeTargetReached?: boolean | null;
}

export async function recordEfficacyVerdict(input: VerdictRequest, deps: EfficacyDeps = {}): Promise<EfficacyWriteOutcome> {
  const a = await authorizeItem(input.accessToken, input.itemId, deps);
  if (a.fail) return a.fail;
  const store = storeOf(deps);
  try {
    const data = await store.load(a.auth.orgId);
    const registered = registeredOf(data, a.auth.orgId, input.itemId);
    if (!registered) return rejected("protocol_not_found");
    if (registered.createdBy === a.auth.userId) return rejected("reviewer_not_independent");
    const gate = gateOf(deps);
    const conclusive = input.verdict !== "inconclusiva";
    if (conclusive && !isConclusiveAllowed(gate)) return rejected("governance_pending");
    if (conclusive && registered.indicatorOrigin === "leitura_publicada") return rejected("published_reading_resolution_pending");

    const { protocol } = draftToEngine(registered);
    const observation = latestObservation(data.observations.filter((o) => o.orgId === a.auth.orgId && o.protocolId === registered.id));
    const assessment: Assessment | null =
      observation && registered.indicatorOrigin === "medida_da_organizacao"
        ? assessObservation({ protocol, observation: engineObservation(observation), baselineValue: registered.baselineValue, observedValue: observation.value })
        : null;

    const attribution = { status: input.attribution?.status ?? "nao_avaliada", design: input.attribution?.design };
    const targetReached = !conclusive
      ? null
      : protocol.target?.kind === "qualitativo"
        ? (input.qualitativeTargetReached ?? null)
        : (assessment?.targetReached ?? null);
    const verdictInput: VerdictInput = {
      protocolRevision: registered.revision,
      verdict: input.verdict,
      evidenceGrade: input.evidenceGrade,
      observedChange: assessment?.observedChange ?? "nao_comparavel",
      targetReached,
      attribution,
      reason: input.reason ?? "",
      reviewerRole: registered.reviewerRole ?? "",
      limitations: input.limitations ?? [],
    };
    const errors = validateVerdict(protocol, assessment, verdictInput);
    if (errors.length > 0) return rejected("verdict_invalid", errors);

    return toWrite(
      await store.insertVerdict({
        orgId: a.auth.orgId,
        protocolId: registered.id,
        observationId: observation?.id ?? null,
        verdict: input.verdict,
        claimScope: protocol.indicator.kind,
        evidenceGrade: input.evidenceGrade,
        observedChange: verdictInput.observedChange,
        targetReached,
        attributionStatus: attribution.status,
        attributionDesign: attribution.design?.trim() || null,
        reason: (input.reason ?? "").trim(),
        limitations: (input.limitations ?? []).map((l) => l.trim()).filter(Boolean),
        reviewerUserId: a.auth.userId,
        reviewerRole: registered.reviewerRole ?? "",
        governanceDecision: gate.decisionId,
        governanceState: gate.state,
        governanceSource: gate.source,
      }),
    );
  } catch {
    return rejected("db_error");
  }
}

// ─── Store Supabase (service_role, sempre filtrada pela organização da sessão) ─
export function createSupabaseEfficacyStore(): EfficacyStore {
  async function admin() {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return supabaseAdmin as any;
  }
  const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));
  const protocolFromDb = (r: Record<string, unknown>): EfficacyProtocolRow => ({
    id: String(r.id),
    orgId: String(r.org_id),
    itemId: String(r.item_id),
    revision: Number(r.revision),
    status: r.status as "draft" | "registered",
    supersedesId: (r.supersedes_id as string | null) ?? null,
    objective: (r.objective as string | null) ?? null,
    indicatorLabel: (r.indicator_label as string | null) ?? null,
    indicatorKind: (r.indicator_kind as EfficacyProtocolRow["indicatorKind"]) ?? null,
    indicatorOrigin: (r.indicator_origin as EfficacyProtocolRow["indicatorOrigin"]) ?? null,
    unit: (r.unit as string | null) ?? null,
    direction: (r.direction as EfficacyProtocolRow["direction"]) ?? null,
    baselineObservedOn: (r.baseline_observed_on as string | null) ?? null,
    baselinePopulation: (r.baseline_population as string | null) ?? null,
    baselineSource: (r.baseline_source as string | null) ?? null,
    baselineValue: num(r.baseline_value),
    baselineRef: (r.baseline_ref as PublicationRef | null) ?? null,
    targetKind: (r.target_kind as EfficacyProtocolRow["targetKind"]) ?? null,
    targetValue: num(r.target_value),
    targetCriterion: (r.target_criterion as string | null) ?? null,
    meaningfulDifference: num(r.meaningful_difference),
    windowStart: (r.window_start as string | null) ?? null,
    windowEnd: (r.window_end as string | null) ?? null,
    source: (r.source as string | null) ?? null,
    comparisonRule: (r.comparison_rule as EfficacyProtocolRow["comparisonRule"]) ?? null,
    responsibleRole: (r.responsible_role as string | null) ?? null,
    reviewerRole: (r.reviewer_role as string | null) ?? null,
    limitations: ((r.limitations as string[] | null) ?? []).map(String),
    createdBy: String(r.created_by),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
    registeredAt: (r.registered_at as string | null) ?? null,
  });
  const fieldsToDb = (f: Partial<EfficacyProtocolFields>): Record<string, unknown> => {
    const map: Record<string, string> = {
      objective: "objective", indicatorLabel: "indicator_label", indicatorKind: "indicator_kind", indicatorOrigin: "indicator_origin",
      unit: "unit", direction: "direction", baselineObservedOn: "baseline_observed_on", baselinePopulation: "baseline_population",
      baselineSource: "baseline_source", baselineValue: "baseline_value", baselineRef: "baseline_ref", targetKind: "target_kind",
      targetValue: "target_value", targetCriterion: "target_criterion", meaningfulDifference: "meaningful_difference",
      windowStart: "window_start", windowEnd: "window_end", source: "source", comparisonRule: "comparison_rule",
      responsibleRole: "responsible_role", reviewerRole: "reviewer_role", limitations: "limitations",
    };
    const out: Record<string, unknown> = {};
    for (const [key, column] of Object.entries(map)) {
      if (key in f) {
        const value = (f as Record<string, unknown>)[key];
        out[column] = key === "comparisonRule" && value ? { ...(value as object), requirePublished: true } : value;
      }
    }
    return out;
  };
  const written = (data: { id?: string } | null, error: { code?: string; message?: string } | null): StoreWrite =>
    error ? { accepted: false, reason: mapEfficacyDbError(error), id: null } : { accepted: true, reason: null, id: data?.id ? String(data.id) : null };

  return {
    async load(orgId) {
      const db = await admin();
      const [p, o, v] = await Promise.all([
        db.from("efficacy_protocols").select("*").eq("org_id", orgId).order("revision", { ascending: true }),
        db.from("efficacy_observations").select("*").eq("org_id", orgId).order("observed_on", { ascending: true }),
        db.from("efficacy_verdicts").select("*").eq("org_id", orgId).order("created_at", { ascending: true }),
      ]);
      if (p.error || o.error || v.error) throw new Error("IVO_EFFICACY_READ_FAILED");
      return {
        protocols: (p.data as Array<Record<string, unknown>>).map(protocolFromDb),
        observations: (o.data as Array<Record<string, unknown>>).map((r) => ({
          id: String(r.id), orgId: String(r.org_id), protocolId: String(r.protocol_id), observedOn: String(r.observed_on),
          value: num(r.value), ref: (r.ref as PublicationRef | null) ?? null, note: String(r.note ?? ""),
          recordedBy: String(r.recorded_by), createdAt: String(r.created_at),
        })),
        verdicts: (v.data as Array<Record<string, unknown>>).map((r) => ({
          id: String(r.id), orgId: String(r.org_id), protocolId: String(r.protocol_id), observationId: (r.observation_id as string | null) ?? null,
          verdict: r.verdict as EfficacyVerdictRow["verdict"], claimScope: r.claim_scope as EfficacyVerdictRow["claimScope"],
          evidenceGrade: r.evidence_grade as EvidenceGrade, observedChange: r.observed_change as EfficacyVerdictRow["observedChange"],
          targetReached: (r.target_reached as boolean | null) ?? null, attributionStatus: r.attribution_status as EfficacyVerdictRow["attributionStatus"],
          attributionDesign: (r.attribution_design as string | null) ?? null, reason: String(r.reason ?? ""),
          limitations: ((r.limitations as string[] | null) ?? []).map(String), reviewerUserId: String(r.reviewer_user_id),
          reviewerRole: String(r.reviewer_role), governanceDecision: String(r.governance_decision), governanceState: String(r.governance_state),
          governanceSource: r.governance_source as EfficacyVerdictRow["governanceSource"], createdAt: String(r.created_at),
        })),
      };
    },
    async insertProtocol(row) {
      const db = await admin();
      const { data, error } = await db
        .from("efficacy_protocols")
        .insert({ org_id: row.orgId, item_id: row.itemId, revision: row.revision, status: "draft", supersedes_id: row.supersedesId, created_by: row.createdBy, ...fieldsToDb(fieldsOf(row as EfficacyProtocolRow)) })
        .select("id")
        .single();
      return written(data, error);
    },
    async updateProtocol(orgId, id, patch) {
      const db = await admin();
      const body = "status" in patch ? { status: "registered" } : fieldsToDb(patch);
      const { data, error } = await db.from("efficacy_protocols").update(body).eq("id", id).eq("org_id", orgId).select("id").single();
      return written(data, error);
    },
    async insertObservation(row) {
      const db = await admin();
      const { data, error } = await db
        .from("efficacy_observations")
        .insert({ org_id: row.orgId, protocol_id: row.protocolId, observed_on: row.observedOn, value: row.value, ref: row.ref, note: row.note, recorded_by: row.recordedBy })
        .select("id")
        .single();
      return written(data, error);
    },
    async insertVerdict(row) {
      const db = await admin();
      const { data, error } = await db
        .from("efficacy_verdicts")
        .insert({
          org_id: row.orgId, protocol_id: row.protocolId, observation_id: row.observationId, verdict: row.verdict, claim_scope: row.claimScope,
          evidence_grade: row.evidenceGrade, observed_change: row.observedChange, target_reached: row.targetReached,
          attribution_status: row.attributionStatus, attribution_design: row.attributionDesign, reason: row.reason, limitations: row.limitations,
          reviewer_user_id: row.reviewerUserId, reviewer_role: row.reviewerRole, governance_decision: row.governanceDecision,
          governance_state: row.governanceState, governance_source: row.governanceSource,
        })
        .select("id")
        .single();
      return written(data, error);
    },
    async deriveSourceRef(orgId, itemId) {
      const db = await admin();
      const { data: item } = await db
        .from("action_items")
        .select("plan_id, source_cohort_id, source_instrument_version")
        .eq("id", itemId)
        .eq("org_id", orgId)
        .maybeSingle();
      if (!item?.source_cohort_id || !item.source_instrument_version) return null;
      const [{ data: cohort }, { data: plan }] = await Promise.all([
        db.from("wave_cohorts").select("key").eq("id", item.source_cohort_id).eq("org_id", orgId).maybeSingle(),
        db.from("action_plans").select("cycle_key").eq("id", item.plan_id).eq("org_id", orgId).maybeSingle(),
      ]);
      if (!cohort?.key || !plan?.cycle_key) return null;
      return {
        cohortKey: String(cohort.key),
        cycleKey: normalizeCycleKey(String(plan.cycle_key)) ?? String(plan.cycle_key),
        instrumentVersion: String(item.source_instrument_version),
        calculationVersion: `fibt-manifest/${item.source_instrument_version ?? getFibtManifest().instrument_version}`,
        publicationState: "published",
      };
    },
  };
}
