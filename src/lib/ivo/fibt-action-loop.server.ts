// IVO R6 (recorte mínimo) — resultado FIB-T autorizado → prioridade → ação →
// evidência → aprendizagem, sobre o Ledger de Transformação existente
// (20260705100000 + 20261002120000). Nenhuma RPC nova: as cinco do ledger.
//
// Regras desta camada (todas no servidor):
//   · capability ACTION_PLAN respeitada (registro global desligado; só liga em
//     fixture local controlada — local-fixture-capabilities.server.ts);
//   · sessão → organização via requireOrgAdmin; nenhum orgId do cliente;
//   · TODA escrita sobre item/plano confere que ele pertence à organização da
//     sessão ANTES da RPC (as RPCs do ledger não recebem organização — sem esta
//     checagem, conhecer um UUID alheio bastaria);
//   · prioridade só nasce de setor com leitura PUBLICADA, revalidada aqui a
//     partir do snapshot protegido — o cliente não declara o que está publicado;
//   · nenhum valor do resultado (média, contagem, escore) é copiado para a
//     ação, o log ou a evidência: a origem é só referência (ids, versão,
//     instante da publicação, derivados no banco);
//   · dimensão IVO NÃO é atribuída à ação: é derivada na leitura a partir do
//     registro de mapeamentos aprovados — hoje vazio, logo "pendente";
//   · evidência de EXECUÇÃO e APRENDIZAGEM são separadas; EFICÁCIA não é
//     registrável e aparece sempre como "não avaliada" (gate metodológico C8).

import { authorizeIvoSession, loadIvoQ2ForOrg, type IvoQ2Deps, type IvoSessionOptions } from "./ivo-q2-reading.server";
import { LEADER_ROLE, decideLeaderOperation, leaderVisibleActions } from "./leader-scope-policy";
import {
  activateActionPlanAsAdmin,
  callLedgerRpc,
  recordActionEventAsAdmin,
  recordEvidenceAsAdmin,
  setActionItemAccountabilityAsAdmin,
  type ActivatePlanResult,
  type RecordEventInput,
  type RecordEvidenceInput,
  type SetAccountabilityInput,
} from "@/lib/api/action-plan.server";
import { resolveServerCapability, type ServerCapabilityDecision } from "@/lib/capabilities/local-fixture-capabilities.server";
import { CAPABILITY_DISABLED_REASON } from "@/lib/capabilities/registry";
import { resolveIvoRuntimeProfile } from "./ivo-runtime-profile.server";
import type { PlanActionStatus } from "@/engine/action-plan/action-log-engine";
import { canTransition } from "@/engine/action-plan/action-log-engine";
import { normalizeCycleKey, sameCycle } from "@/domain/ivo/cycle-key";
import { getDimensionMappings } from "@/domain/ivo/dimension-mappings";
import { encodeContentRef, getFactorContentById } from "@/domain/ivo/factor-content";
import { resolveEducationAvailability, isEducationContentAvailable, type EducationRuntimeDeps } from "./education-availability.server";
import { isMappingApproved } from "@/engine/ivo/ivo-matrix";
import { getFibtManifest } from "@/domain/instruments/fibt/fibt-instrument";
import type { IvoDimensionId } from "@/engine/ivo/lens-contract";
import {
  EFFICACY_NOT_EVALUATED_REASON,
  type FibtActionPlanView,
  type FibtActionView,
  type FibtEvidenceView,
  type LedgerWriteOutcome,
  type LoadFibtActionLoopOutcome,
} from "./ivo-views";

// ─── Linhas do ledger (já escopadas pela organização da sessão) ─────────────

export interface FibtLedgerPlanRow {
  id: string;
  orgId: string;
  cycleKey: string;
  seasonName: string;
  status: "draft" | "active" | "closed";
  createdAt: string;
  activatedAt: string | null;
  /** PI-13 (ausente em stores anteriores à migration): encerramento operacional. */
  closedAt?: string | null;
  closedByRole?: string | null;
}

export interface FibtLedgerItemRow {
  id: string;
  planId: string;
  orgId: string;
  rank: number;
  title: string;
  description: string;
  effort: "baixo" | "medio" | "alto";
  status: PlanActionStatus;
  ownerUserId: string | null;
  ownerRoleLabel: string | null;
  dueOn: string | null;
  metricLabel: string | null;
  metricBaseline: number | null;
  metricTarget: number | null;
  metricUnit: string | null;
  sourceLensId: string | null;
  sourceWaveId: string | null;
  sourceCohortId: string | null;
  sourceFactorId: string | null;
  sourceInstrumentVersion: string | null;
  sourcePublishedAt: string | null;
  /** PI-13 (ausentes em stores anteriores à migration): quando e por qual papel a ação foi incluída depois do plano. */
  createdAt?: string;
  addedByRole?: string | null;
}

export interface FibtLedgerEvidenceRow {
  id: string;
  itemId: string;
  orgId: string;
  kind: string;
  scope: "execucao" | "aprendizagem";
  contentRef: string;
  occurredOn: string;
  createdAt: string;
}

export interface FibtLedgerEventRow {
  id: string;
  itemId: string;
  orgId: string;
  kind: string;
  toStatus: PlanActionStatus | null;
  note: string | null;
  occurredAt: string;
}

export interface FibtLedgerSnapshot {
  plans: FibtLedgerPlanRow[];
  items: FibtLedgerItemRow[];
  evidence: FibtLedgerEvidenceRow[];
  events: FibtLedgerEventRow[];
  cohortLabels: Record<string, string>;
  /** `false` quando o banco ainda não tem as colunas do PI-13 (código publicado antes da migration). Ausente = disponível. */
  composition?: boolean;
}

export interface FibtCreatePlanInput {
  orgId: string;
  createdBy: string;
  cycleKey: string;
  seasonName: string;
  items: Array<Record<string, unknown>>;
}

export interface FibtActionLedgerStore {
  loadFibtLedger(orgId: string): Promise<FibtLedgerSnapshot>;
  listPlanCycles(orgId: string): Promise<Array<{ id: string; cycleKey: string; status: string }>>;
  findItem(orgId: string, itemId: string): Promise<{
    id: string;
    orgId: string;
    planId: string;
    sourceLensId: string | null;
    /** Fator FIB-T de origem (para validar o vínculo educativo). */
    sourceFactorId?: string | null;
    sourceWaveId?: string | null;
    sourceCohortId?: string | null;
    description?: string;
    status: PlanActionStatus;
    planStatus: string;
    /** Responsável pela ação; ausente = sem responsável (liderança nega). */
    ownerUserId?: string | null;
  } | null>;
  findPlan(orgId: string, planId: string): Promise<{ id: string; orgId: string; status: string } | null>;
  createPlan(input: FibtCreatePlanInput): Promise<{ accepted: boolean; reason: string | null; planId: string | null }>;
  setAccountability(input: SetAccountabilityInput): Promise<{ accepted: boolean; reason: string | null }>;
  activatePlan(planId: string): Promise<ActivatePlanResult>;
  recordEvent(input: RecordEventInput): Promise<{ accepted: boolean; reason: string | null }>;
  recordEvidence(input: RecordEvidenceInput): Promise<{ accepted: boolean; reason: string | null; evidenceId: string | null }>;
}

// ─── Visões devolvidas ao cliente (tipos puros em ivo-views.ts) ─────────────

export type {
  FibtActionPlanView,
  FibtActionView,
  FibtEvidenceView,
  LedgerFailure,
  LedgerWriteOutcome,
  LoadFibtActionLoopOutcome,
} from "./ivo-views";
export { EFFICACY_NOT_EVALUATED_REASON } from "./ivo-views";

export interface FibtActionLoopDeps extends IvoQ2Deps, EducationRuntimeDeps {
  capability?: () => ServerCapabilityDecision;
  ledger?: FibtActionLedgerStore;
  /** Mostra/aceita conteúdo de TESTE (padrão: só em runtime local descartável). */
  testContent?: boolean;
}

const REASON_MESSAGE: Record<string, string> = {
  cycle_already_planned: "Já existe um plano para este ciclo nesta organização.",
  source_not_published:
    "A prioridade só pode partir de um setor com leitura publicada. Setores protegidos não embasam ações.",
  duplicate_priority: "A mesma combinação de setor e fator foi escolhida mais de uma vez.",
  provenance_cross_tenant_denied: "A origem informada não pertence a esta organização.",
  provenance_incomplete: "A origem da ação está incompleta.",
  provenance_forbids_ivo_lift: "Ações de origem FIB-T não declaram ganho no IVO.",
  item_not_found: "Ação não encontrada nesta organização.",
  plan_not_found: "Plano não encontrado nesta organização.",
  plan_not_editable: "Responsável e prazo só podem ser definidos enquanto o plano está em rascunho.",
  plan_not_draft: "Este plano já foi ativado.",
  plan_not_active: "Ative o plano antes de registrar execução ou evidência.",
  incomplete_section_13: "Defina responsável, prazo e indicador de execução de todas as ações antes de ativar.",
  invalid_transition: "Essa mudança de estado não é permitida a partir do estado atual.",
  invalid_date: "Data inválida ou no futuro.",
  content_link_only_for_learning: "O vínculo com conteúdo educativo vale somente para registros de aprendizagem.",
  content_not_available: "Esse conteúdo não está disponível para o fator desta ação.",
  reserved_content_reference: "A referência educativa é definida pelo servidor. Use a jornada de aprendizagem.",
  db_error: "O registro não pôde ser gravado agora. Nada foi alterado.",
};

function rejected(reason: string): LedgerWriteOutcome {
  return { ok: true, accepted: false, reason, message: REASON_MESSAGE[reason] ?? REASON_MESSAGE.db_error! };
}

// ─── Autorização do ledger ──────────────────────────────────────────────────

/**
 * ACTION_PLAN para o ciclo IVO: fixture local controlada OU perfil IVO de
 * staging válido. O registro global continua desligado — os server functions
 * legados de /plano-acao (isCapabilityEnabled) seguem fechados.
 */
function defaultLedgerCapability(deps: FibtActionLoopDeps): ServerCapabilityDecision {
  const local = resolveServerCapability("ACTION_PLAN");
  if (local.enabled) return local;
  const profile = (deps.profile ?? resolveIvoRuntimeProfile)();
  return profile.kind === "staging" ? { enabled: true, source: "ivo_staging_profile" } : local;
}

export async function authorizeLedger(accessToken: string | undefined, deps: FibtActionLoopDeps, options: IvoSessionOptions = {}) {
  const capability = (deps.capability ?? (() => defaultLedgerCapability(deps)))();
  if (!capability.enabled) {
    return { ok: false as const, category: "unavailable" as const, error: CAPABILITY_DISABLED_REASON };
  }
  const auth = await authorizeIvoSession(accessToken, deps, options);
  if (!auth.ok) return auth;
  const access = await (deps.moduleAccess ?? (async org => (await import("@/lib/identity/module-access.server")).checkInstrument(org, "FIB_T")))(auth.orgId);
  return access.ok ? auth : { ok: false as const, category: access.reason === "unavailable" ? "backend" as const : "module_disabled" as const, error: access.error };
}

export function ledgerOf(deps: FibtActionLoopDeps): FibtActionLedgerStore {
  return deps.ledger ?? createSupabaseLedgerStore();
}

// ─── Leitura ─────────────────────────────────────────────────────────────────

function approvedDimensionsFor(factorId: string): IvoDimensionId[] {
  return getDimensionMappings()
    .filter((m) => m.lens === "fibt" && m.sourceConstructId === factorId && isMappingApproved(m))
    .map((m) => m.dimension);
}

export function buildFibtActionPlanViews(
  snapshot: FibtLedgerSnapshot,
  orgId: string,
  currentUserId: string,
): FibtActionPlanView[] {
  const factorNames = new Map(getFibtManifest().factors.map((f) => [f.id, f.name]));
  // Defesa em profundidade: mesmo que a store devolva linha de outra
  // organização, ela não entra na visão.
  const items = snapshot.items.filter((i) => i.orgId === orgId && i.sourceLensId === "fibt");
  const evidence = snapshot.evidence.filter((e) => e.orgId === orgId);
  const events = snapshot.events.filter((e) => e.orgId === orgId);

  return snapshot.plans
    .filter((p) => p.orgId === orgId)
    .map((plan) => {
      const actions = items
        .filter((item) => item.planId === plan.id)
        .sort((a, b) => a.rank - b.rank)
        .map((item): FibtActionView => {
          const dimensionIds = approvedDimensionsFor(item.sourceFactorId ?? "");
          const own = evidence.filter((e) => e.itemId === item.id);
          const toView = (e: FibtLedgerEvidenceRow): FibtEvidenceView => ({
            id: e.id,
            kind: e.kind,
            content: e.contentRef,
            occurredOn: e.occurredOn,
            recordedAt: e.createdAt,
          });
          return {
            id: item.id,
            planId: item.planId,
            rank: item.rank,
            title: item.title,
            description: item.description,
            effort: item.effort,
            status: item.status,
            owner: item.ownerUserId
              ? { roleLabel: item.ownerRoleLabel ?? "", isCurrentUser: item.ownerUserId === currentUserId }
              : null,
            dueOn: item.dueOn,
            executionMetric:
              item.metricLabel != null && item.metricBaseline != null && item.metricTarget != null
                ? {
                  label: item.metricLabel,
                  baseline: Number(item.metricBaseline),
                  target: Number(item.metricTarget),
                  unit: item.metricUnit ?? "",
                }
                : null,
            source: {
              lens: "fibt",
              waveId: item.sourceWaveId ?? "",
              cohortId: item.sourceCohortId ?? "",
              cohortLabel: item.sourceCohortId ? snapshot.cohortLabels[item.sourceCohortId] ?? null : null,
              factorId: item.sourceFactorId ?? "",
              factorName: factorNames.get(item.sourceFactorId ?? "") ?? item.sourceFactorId ?? "",
              instrumentVersion: item.sourceInstrumentVersion ?? "",
              publishedAt: item.sourcePublishedAt ?? "",
            },
            dimension: { status: dimensionIds.length > 0 ? "mapped" : "mapping_pending", dimensionIds },
            evidence: {
              execution: own.filter((e) => e.scope === "execucao").map(toView),
              learning: own.filter((e) => e.scope === "aprendizagem").map(toView),
            },
            efficacy: { status: "not_evaluated", reason: EFFICACY_NOT_EVALUATED_REASON },
            timeline: events
              .filter((e) => e.itemId === item.id)
              .map((e) => ({ id: e.id, kind: e.kind, toStatus: e.toStatus, note: e.note, occurredAt: e.occurredAt })),
            addedLater: item.addedByRole && item.createdAt ? { at: item.createdAt, byRole: item.addedByRole } : null,
          };
        });
      return {
        id: plan.id,
        cycleKey: plan.cycleKey,
        cycleKeyCanonical: normalizeCycleKey(plan.cycleKey),
        status: plan.status,
        createdAt: plan.createdAt,
        activatedAt: plan.activatedAt,
        closedAt: plan.closedAt ?? null,
        closedByRole: plan.closedByRole ?? null,
        composition: snapshot.composition === false ? ("unavailable" as const) : ("available" as const),
        missingAccountability: actions.filter((a) => !a.owner || !a.dueOn || !a.executionMetric).length,
        actions,
      };
    })
    .filter((plan) => plan.actions.length > 0);
}

export async function loadFibtActionLoop(
  input: { accessToken?: string },
  deps: FibtActionLoopDeps = {},
): Promise<LoadFibtActionLoopOutcome> {
  const auth = await authorizeLedger(input.accessToken, deps, { allowLeader: true });
  if (!auth.ok) return auth;
  try {
    const snapshot = await ledgerOf(deps).loadFibtLedger(auth.orgId);
    if (auth.role === LEADER_ROLE) {
      return { ok: true, plans: buildFibtActionPlanViews(scopeSnapshotToLeader(snapshot, auth), auth.orgId, auth.userId), viewerScope: "own_actions" };
    }
    return { ok: true, plans: buildFibtActionPlanViews(snapshot, auth.orgId, auth.userId) };
  } catch {
    return { ok: false, category: "backend", error: "As ações não puderam ser carregadas agora." };
  }
}

/**
 * Liderança vê só as próprias ações (e o que pende delas), nunca rascunho nem
 * ações alheias; plano sem ação própria some — o estado vazio já existente.
 */
function scopeSnapshotToLeader(snapshot: FibtLedgerSnapshot, actor: { userId: string; orgId: string; role: string }): FibtLedgerSnapshot {
  const planById = new Map(snapshot.plans.map((p) => [p.id, p]));
  const items = snapshot.items.filter((item) => {
    const plan = planById.get(item.planId);
    return plan ? leaderVisibleActions(actor, plan.orgId, plan.status, [item]).length === 1 : false;
  });
  const itemIds = new Set(items.map((i) => i.id));
  const planIds = new Set(items.map((i) => i.planId));
  return {
    ...snapshot,
    plans: snapshot.plans.filter((p) => planIds.has(p.id)),
    items,
    evidence: snapshot.evidence.filter((e) => itemIds.has(e.itemId)),
    events: snapshot.events.filter((e) => itemIds.has(e.itemId)),
  };
}

function leaderWriteDenied(
  auth: { userId: string; orgId: string; role: string },
  operation: "record_status" | "record_execution_evidence",
  item: { orgId: string; ownerUserId?: string | null; planStatus: string },
): LedgerWriteOutcome | null {
  if (auth.role !== LEADER_ROLE) return null;
  const planStatus = item.planStatus === "active" || item.planStatus === "closed" ? item.planStatus : "draft";
  const decision = decideLeaderOperation(auth, operation, { orgId: item.orgId, planStatus, action: { ownerUserId: item.ownerUserId ?? null } });
  // Ação alheia responde como inexistente: não revela que ela existe.
  return decision.allowed ? null : rejected(decision.reason === "not_action_owner" ? "item_not_found" : decision.reason);
}

// ─── Prioridades → ações (cria o plano do ciclo) ────────────────────────────

export interface FibtPriorityInput {
  cohortId: string;
  factorId: string;
  title: string;
  description: string;
  effort: "baixo" | "medio" | "alto";
}

/** Agendamento padrão de um ciclo trimestral (13 semanas). Operacional, não metodológico. */
const QUARTER_SCHEDULE = { start_week: 1, end_week: 13, milestone_week: 7, weeks_budget: 13 } as const;

export async function createFibtPriorityActions(
  input: { accessToken?: string; waveId: string; priorities: FibtPriorityInput[] },
  deps: FibtActionLoopDeps = {},
): Promise<LedgerWriteOutcome> {
  const auth = await authorizeLedger(input.accessToken, deps);
  if (!auth.ok) return auth;

  const keys = input.priorities.map((p) => `${p.cohortId}|${p.factorId}`);
  if (input.priorities.some(p => /^\s*\[conteudo:/i.test(p.description))) return rejected("reserved_content_reference");
  if (new Set(keys).size !== keys.length) return rejected("duplicate_priority");

  // A fonte é revalidada aqui, com a organização da SESSÃO.
  const q2 = await loadIvoQ2ForOrg(auth.orgId, input.waveId, deps);
  if (!q2.ok) return q2;
  if (q2.state !== "ready") return rejected("source_not_published");
  const view = q2.view;

  const items: Array<Record<string, unknown>> = [];
  for (const [index, priority] of input.priorities.entries()) {
    const sector = view.sectors.find((s) => s.cohortId === priority.cohortId);
    const factor = sector?.group === "available" ? sector.factors?.find((f) => f.id === priority.factorId) : undefined;
    if (!sector || !factor) return rejected("source_not_published");

    // Somente referências. Nenhum valor (média, contagem, escore) vai junto.
    items.push({
      rank: index + 1,
      lever_id: `fibt:${sector.key}:${factor.id}`,
      title: priority.title,
      description: priority.description,
      effort: priority.effort,
      expected_ivo_lift: 0,
      is_quick_win: false,
      amb_id: null,
      amb_name: null,
      amb_emoji: null,
      lens_id: "fibt",
      lens_label: "FIB-T · Q2",
      lens_color: null,
      esg_codes: [],
      ...QUARTER_SCHEDULE,
      control_tier: null,
      source_lens_id: "fibt",
      source_wave_id: view.wave.id,
      source_cohort_id: sector.cohortId,
      source_factor_id: factor.id,
    });
  }

  try {
    const ledger = ledgerOf(deps);
    const existing = await ledger.listPlanCycles(auth.orgId);
    if (existing.some((plan) => sameCycle(plan.cycleKey, view.cycleKey))) return rejected("cycle_already_planned");

    const created = await ledger.createPlan({
      orgId: auth.orgId,
      createdBy: auth.userId,
      cycleKey: view.cycleKey,
      seasonName: `FIB-T ${view.cycleKey}`,
      items,
    });
    if (!created.accepted || !created.planId) return rejected(created.reason ?? "db_error");
    return { ok: true, accepted: true, id: created.planId };
  } catch {
    return rejected("db_error");
  }
}

// ─── Responsável, prazo e indicador de execução ─────────────────────────────

export async function setFibtActionAccountability(
  input: {
    accessToken?: string;
    itemId: string;
    ownerRoleLabel: string;
    dueOn: string;
    executionMetric: { label: string; baseline: number; target: number; unit: string };
  },
  deps: FibtActionLoopDeps = {},
): Promise<LedgerWriteOutcome> {
  const auth = await authorizeLedger(input.accessToken, deps);
  if (!auth.ok) return auth;
  if (!isIsoDate(input.dueOn)) return rejected("invalid_date");
  try {
    const ledger = ledgerOf(deps);
    const item = await ledger.findItem(auth.orgId, input.itemId);
    if (!item || item.orgId !== auth.orgId || item.sourceLensId !== "fibt") return rejected("item_not_found");
    if (item.planStatus !== "draft") return rejected("plan_not_editable");
    const r = await ledger.setAccountability({
      itemId: item.id,
      // Escopo declarado do ledger S6: o responsável accountable é quem
      // administra o plano; o rótulo descreve a função que executa.
      owner: { userId: auth.userId, roleLabel: input.ownerRoleLabel },
      dueOn: input.dueOn,
      metric: input.executionMetric,
      cmo: null,
      controlTier: null,
    });
    return r.accepted ? { ok: true, accepted: true, id: item.id } : rejected(r.reason ?? "db_error");
  } catch {
    return rejected("db_error");
  }
}

export async function activateFibtActionPlan(
  input: { accessToken?: string; planId: string },
  deps: FibtActionLoopDeps = {},
): Promise<LedgerWriteOutcome> {
  const auth = await authorizeLedger(input.accessToken, deps);
  if (!auth.ok) return auth;
  try {
    const ledger = ledgerOf(deps);
    const plan = await ledger.findPlan(auth.orgId, input.planId);
    if (!plan || plan.orgId !== auth.orgId) return rejected("plan_not_found");
    const r = await ledger.activatePlan(plan.id);
    return r.accepted ? { ok: true, accepted: true, id: plan.id } : rejected(r.reason);
  } catch {
    return rejected("db_error");
  }
}

// ─── Execução: estado e evidência ───────────────────────────────────────────

export async function recordFibtActionStatus(
  input: { accessToken?: string; itemId: string; toStatus: PlanActionStatus; note?: string },
  deps: FibtActionLoopDeps = {},
): Promise<LedgerWriteOutcome> {
  const auth = await authorizeLedger(input.accessToken, deps, { allowLeader: true });
  if (!auth.ok) return auth;
  try {
    const ledger = ledgerOf(deps);
    const item = await ledger.findItem(auth.orgId, input.itemId);
    if (!item || item.orgId !== auth.orgId || item.sourceLensId !== "fibt") return rejected("item_not_found");
    const leaderDenial = leaderWriteDenied(auth, "record_status", item);
    if (leaderDenial) return leaderDenial;
    if (item.planStatus !== "active") return rejected("plan_not_active");
    // Pré-checagem pura sobre o estado REAL lido do banco (a RPC recusa de novo).
    if (!canTransition(item.status, input.toStatus)) return rejected("invalid_transition");
    const r = await ledger.recordEvent({
      itemId: item.id,
      kind: "status_change",
      actorUserId: auth.userId,
      // Papel derivado da sessão, nunca texto livre do cliente.
      actorRoleLabel: auth.role,
      toStatus: input.toStatus,
      note: input.note,
    });
    return r.accepted ? { ok: true, accepted: true, id: item.id } : rejected(r.reason ?? "db_error");
  } catch {
    return rejected("db_error");
  }
}

export async function recordFibtActionEvidence(
  input: {
    accessToken?: string;
    itemId: string;
    scope: "execucao" | "aprendizagem";
    kind?: "texto" | "checklist" | "metrica";
    content: string;
    occurredOn: string;
    /** Só aprendizagem: referência estruturada ao conteúdo educativo estudado (catálogo curatorial). */
    contentId?: string;
    contentVersion?: string;
  },
  deps: FibtActionLoopDeps = {},
): Promise<LedgerWriteOutcome> {
  const auth = await authorizeLedger(input.accessToken, deps, { allowLeader: true });
  if (!auth.ok) return auth;
  // Aprendizagem segue com o RH; a liderança registra só execução.
  if (auth.role === LEADER_ROLE && input.scope !== "execucao") return rejected("authority_reserved_to_admin");
  const today = (deps.now ?? (() => new Date()))().toISOString().slice(0, 10);
  if (!isIsoDate(input.occurredOn) || input.occurredOn > today) return rejected("invalid_date");
  try {
    const ledger = ledgerOf(deps);
    const item = await ledger.findItem(auth.orgId, input.itemId);
    if (!item || item.orgId !== auth.orgId || item.sourceLensId !== "fibt") return rejected("item_not_found");
    const leaderDenial = leaderWriteDenied(auth, "record_execution_evidence", item);
    if (leaderDenial) return leaderDenial;
    if (item.planStatus !== "active") return rejected("plan_not_active");
    let contentRef = input.content;
    if (/^\s*\[conteudo:/i.test(input.content) || (input.contentVersion !== undefined && !input.contentId)) return rejected("content_not_available");
    if (input.contentId) {
      if (input.scope !== "aprendizagem") return rejected("content_link_only_for_learning");
      const content = getFactorContentById(input.contentId);
      const visible = isEducationContentAvailable(content, resolveEducationAvailability(deps));
      if (!content || !visible || content.factorId !== (item.sourceFactorId ?? null)) return rejected("content_not_available");
      if (input.contentVersion !== undefined && input.contentVersion !== content.version) return rejected("content_not_available");
      contentRef = encodeContentRef(content, input.content);
    }
    const r = await ledger.recordEvidence({
      itemId: item.id,
      evidenceKind: input.scope === "aprendizagem" ? "aprendizagem" : (input.kind ?? "texto"),
      contentRef,
      sourceKind: "direct",
      consentRef: null,
      occurredOn: input.occurredOn,
      recordedBy: auth.userId,
      actorRoleLabel: auth.role,
    });
    return r.accepted ? { ok: true, accepted: true, id: r.evidenceId } : rejected(r.reason ?? "db_error");
  } catch {
    return rejected("db_error");
  }
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());
}

// ─── Store Supabase (service_role, sempre filtrada pela organização da sessão) ─

const ITEM_COLUMNS =
  "id, plan_id, org_id, rank, title, description, effort, status, owner_user_id, owner_role_label, due_on, metric_label, metric_baseline, metric_target, metric_unit, source_lens_id, source_wave_id, source_cohort_id, source_factor_id, source_instrument_version, source_published_at";
// PI-13: colunas da migration 20261016120000 (podem não existir ainda no banco).
const ITEM_COLUMNS_PI13 = `${ITEM_COLUMNS}, created_at, added_by_role`;
const PLAN_COLUMNS = "id, org_id, cycle_key, season_name, status, created_at, activated_at";
const PLAN_COLUMNS_PI13 = `${PLAN_COLUMNS}, closed_at, closed_by_role`;

/** Coluna ausente: o código novo foi publicado antes da migration (PostgREST 42703/PGRST204). */
export function isUndefinedColumnError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return error.code === "42703" || error.code === "PGRST204" || /column .* does not exist/i.test(error.message ?? "");
}

function createSupabaseLedgerStore(): FibtActionLedgerStore {
  async function admin() {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Tipos gerados ainda não conhecem as colunas source_* (migration local).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return supabaseAdmin as any;
  }

  return {
    async loadFibtLedger(orgId) {
      const db = await admin();
      // PI-13: tenta as colunas novas; se o banco ainda não as tem, lê as antigas e sinaliza
      // `composition: false` (a interface então não oferece incluir/encerrar).
      let composition = true;
      const readItems = (columns: string) =>
        db.from("action_items").select(columns).eq("org_id", orgId).eq("source_lens_id", "fibt").order("rank", { ascending: true });
      let itemsRead = await readItems(ITEM_COLUMNS_PI13);
      if (itemsRead.error && isUndefinedColumnError(itemsRead.error)) {
        composition = false;
        itemsRead = await readItems(ITEM_COLUMNS);
      }
      const { data: items, error: itemErr } = itemsRead;
      if (itemErr) throw new Error("IVO_LEDGER_ITEMS_READ_FAILED");
      const itemRows = (items ?? []) as Array<Record<string, unknown>>;
      const planIds = [...new Set(itemRows.map((r) => String(r.plan_id)))];
      const itemIds = itemRows.map((r) => String(r.id));
      const cohortIds = [...new Set(itemRows.map((r) => r.source_cohort_id).filter(Boolean).map(String))];

      const empty = { data: [], error: null };
      const readPlans = (columns: string) =>
        db.from("action_plans").select(columns).eq("org_id", orgId).in("id", planIds).order("created_at", { ascending: false });
      const [plans, evidence, events, cohorts] = await Promise.all([
        planIds.length
          ? readPlans(composition ? PLAN_COLUMNS_PI13 : PLAN_COLUMNS).then(async (r: { data: unknown; error: { code?: string; message?: string } | null }) => {
            if (r.error && composition && isUndefinedColumnError(r.error)) {
              composition = false;
              return readPlans(PLAN_COLUMNS);
            }
            return r;
          })
          : empty,
        itemIds.length
          ? db
            .from("evidence_records")
            .select("id, item_id, org_id, evidence_kind, evidence_scope, content_ref, occurred_on, created_at")
            .eq("org_id", orgId)
            .in("item_id", itemIds)
            .order("created_at", { ascending: true })
          : empty,
        itemIds.length
          ? db
            .from("action_log")
            .select("id, item_id, org_id, event_kind, to_status, note, occurred_at")
            .eq("org_id", orgId)
            .in("item_id", itemIds)
            .order("occurred_at", { ascending: true })
          : empty,
        cohortIds.length
          ? db.from("wave_cohorts").select("id, label").eq("org_id", orgId).in("id", cohortIds)
          : empty,
      ]);
      if (plans.error || evidence.error || events.error || cohorts.error) {
        throw new Error("IVO_LEDGER_READ_FAILED");
      }

      return {
        plans: (plans.data as Array<Record<string, unknown>>).map((p) => ({
          id: String(p.id),
          orgId: String(p.org_id),
          cycleKey: String(p.cycle_key),
          seasonName: String(p.season_name),
          status: p.status as FibtLedgerPlanRow["status"],
          createdAt: String(p.created_at),
          activatedAt: (p.activated_at as string | null) ?? null,
          closedAt: (p.closed_at as string | null | undefined) ?? null,
          closedByRole: (p.closed_by_role as string | null | undefined) ?? null,
        })),
        items: itemRows.map((r) => ({
          id: String(r.id),
          planId: String(r.plan_id),
          orgId: String(r.org_id),
          rank: Number(r.rank),
          title: String(r.title),
          description: String(r.description ?? ""),
          effort: r.effort as FibtLedgerItemRow["effort"],
          status: r.status as PlanActionStatus,
          ownerUserId: (r.owner_user_id as string | null) ?? null,
          ownerRoleLabel: (r.owner_role_label as string | null) ?? null,
          dueOn: (r.due_on as string | null) ?? null,
          metricLabel: (r.metric_label as string | null) ?? null,
          metricBaseline: r.metric_baseline == null ? null : Number(r.metric_baseline),
          metricTarget: r.metric_target == null ? null : Number(r.metric_target),
          metricUnit: (r.metric_unit as string | null) ?? null,
          sourceLensId: (r.source_lens_id as string | null) ?? null,
          sourceWaveId: (r.source_wave_id as string | null) ?? null,
          sourceCohortId: (r.source_cohort_id as string | null) ?? null,
          sourceFactorId: (r.source_factor_id as string | null) ?? null,
          sourceInstrumentVersion: (r.source_instrument_version as string | null) ?? null,
          sourcePublishedAt: (r.source_published_at as string | null) ?? null,
          createdAt: r.created_at == null ? undefined : String(r.created_at),
          addedByRole: (r.added_by_role as string | null | undefined) ?? null,
        })),
        evidence: (evidence.data as Array<Record<string, unknown>>).map((e) => ({
          id: String(e.id),
          itemId: String(e.item_id),
          orgId: String(e.org_id),
          kind: String(e.evidence_kind),
          scope: e.evidence_scope === "aprendizagem" ? "aprendizagem" : "execucao",
          contentRef: String(e.content_ref),
          occurredOn: String(e.occurred_on),
          createdAt: String(e.created_at),
        })),
        events: (events.data as Array<Record<string, unknown>>).map((e) => ({
          id: String(e.id),
          itemId: String(e.item_id),
          orgId: String(e.org_id),
          kind: String(e.event_kind),
          toStatus: (e.to_status as PlanActionStatus | null) ?? null,
          note: (e.note as string | null) ?? null,
          occurredAt: String(e.occurred_at),
        })),
        cohortLabels: Object.fromEntries(
          (cohorts.data as Array<Record<string, unknown>>).map((c) => [String(c.id), String(c.label)]),
        ),
        composition,
      };
    },

    async listPlanCycles(orgId) {
      const db = await admin();
      const { data, error } = await db.from("action_plans").select("id, cycle_key, status").eq("org_id", orgId);
      if (error) throw new Error("IVO_LEDGER_PLANS_READ_FAILED");
      return ((data ?? []) as Array<Record<string, unknown>>).map((p) => ({
        id: String(p.id),
        cycleKey: String(p.cycle_key),
        status: String(p.status),
      }));
    },

    async findItem(orgId, itemId) {
      const db = await admin();
      const { data: item, error } = await db
        .from("action_items")
        .select("id, org_id, plan_id, source_lens_id, source_factor_id, source_wave_id, source_cohort_id, description, status, owner_user_id")
        .eq("id", itemId)
        .eq("org_id", orgId)
        .maybeSingle();
      if (error) throw new Error("IVO_LEDGER_ITEM_READ_FAILED");
      if (!item) return null;
      const { data: plan, error: planErr } = await db
        .from("action_plans")
        .select("id, status")
        .eq("id", item.plan_id)
        .eq("org_id", orgId)
        .maybeSingle();
      if (planErr) throw new Error("IVO_LEDGER_PLAN_READ_FAILED");
      if (!plan) return null;
      return {
        id: String(item.id),
        orgId: String(item.org_id),
        planId: String(item.plan_id),
        sourceLensId: (item.source_lens_id as string | null) ?? null,
        sourceFactorId: (item.source_factor_id as string | null) ?? null,
        sourceWaveId: (item.source_wave_id as string | null) ?? null,
        sourceCohortId: (item.source_cohort_id as string | null) ?? null,
        description: String(item.description ?? ""),
        status: item.status as PlanActionStatus,
        planStatus: String(plan.status),
        ownerUserId: (item.owner_user_id as string | null) ?? null,
      };
    },

    async findPlan(orgId, planId) {
      const db = await admin();
      const { data, error } = await db
        .from("action_plans")
        .select("id, org_id, status")
        .eq("id", planId)
        .eq("org_id", orgId)
        .maybeSingle();
      if (error) throw new Error("IVO_LEDGER_PLAN_READ_FAILED");
      return data ? { id: String(data.id), orgId: String(data.org_id), status: String(data.status) } : null;
    },

    async createPlan(input) {
      const row = await callLedgerRpc<{ plan_id: string | null }>("create_action_plan", {
        p_org_id: input.orgId,
        p_cycle_key: input.cycleKey,
        p_season_name: input.seasonName,
        p_source_capsule_id: null,
        p_created_by: input.createdBy,
        p_items: input.items,
      });
      return { accepted: row.accepted, reason: row.reason ?? null, planId: row.plan_id ?? null };
    },

    setAccountability: setActionItemAccountabilityAsAdmin,
    activatePlan: activateActionPlanAsAdmin,
    recordEvent: recordActionEventAsAdmin,
    recordEvidence: recordEvidenceAsAdmin,
  };
}
