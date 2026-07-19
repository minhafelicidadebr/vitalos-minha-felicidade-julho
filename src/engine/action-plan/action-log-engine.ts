// Action Log — o event ledger do Plano Vivo (Arco da Prova, I-T1 + I-E4).
//
// Princípio: STATUS NÃO É OPINIÃO, É FOLD. A ação nunca "tem" um status
// gravado — o status é derivado da sequência de eventos INSERT-only, mesma
// disciplina do consent ledger e da carteira de Sementes. Isso dá de graça a
// trilha de auditoria que o Guia MTE pede e impede a reescrita de história.
//
// A máquina de transições vive AQUI (onde os eventos moram): registrar um
// status_change inválido é recusado no fold, não na UI. O estado
// "em_vigilancia" é a mecânica do Vigia de Manutenção (I-E4): medida
// concluída entra em vigilância; check-ins atestam se segue viva; medida em
// desuso perde o crédito de eficácia — o flag maintenanceByAction alimenta o
// reavaliacao-engine/intervention-evidence-engine, que JÁ o consomem.
//
// Kinds compatíveis com o Diário de Prática Viva (Academia I7): o evento
// evidence_recorded referencia evidência, nunca a contém (conteúdo vive em
// evidence_records; reflexão pessoal vive em practice_records — a ponte é
// referência consentida, jamais cópia).
//
// Engine puro: sem React, sem I/O, sem domain/. Ator identificado por PAPEL.

// ─── Estados e transições ────────────────────────────────────────────────────

export type PlanActionStatus =
  | "planejada"
  | "em_execucao"
  | "concluida"
  | "em_vigilancia"
  | "interrompida";

/** Transições válidas — conclusão direta sem execução não existe. */
const VALID_TRANSITIONS: Record<PlanActionStatus, readonly PlanActionStatus[]> = {
  planejada: ["em_execucao", "interrompida"],
  em_execucao: ["concluida", "interrompida"],
  concluida: ["em_vigilancia"],
  em_vigilancia: ["em_execucao"], // medida caiu em desuso → volta ao trabalho
  interrompida: ["planejada"], // retomada consciente, nunca silenciosa
};

export function canTransition(from: PlanActionStatus, to: PlanActionStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

// ─── Eventos ─────────────────────────────────────────────────────────────────

export type ActionLogEventKind =
  | "status_change"
  | "checkin"
  | "note"
  | "maintenance_check"
  | "evidence_recorded";

export interface ActionLogEvent {
  id: string;
  /** Chave da ação (mock-first: leverId; no S6 vira action_items.id). */
  actionKey: string;
  kind: ActionLogEventKind;
  /** Papel de quem registrou — nunca exige nome. */
  actorRole: string;
  occurredOn: string;
  /** status_change. */
  toStatus?: PlanActionStatus;
  /** maintenance_check: a medida segue em funcionamento? */
  maintained?: boolean;
  /** evidence_recorded: tipo (vocabulário do pack) + referência, nunca conteúdo. */
  evidenceKind?: string;
  evidenceRef?: string;
  /** evidence_recorded: claim_ids do Claim Registry que sustentaram a evidência —
   * referências, nunca o texto do claim (mesma disciplina do evidenceRef). */
  evidenceClaimIds?: readonly string[];
  /** checkin/note — texto curto operacional (nunca dado de pessoa). */
  note?: string;
}

export type ActionLogRecordReason =
  | "recorded"
  | "duplicate"
  | "invalid_request"
  | "invalid_transition";

export interface ActionLogRecordResult {
  events: ActionLogEvent[];
  event: ActionLogEvent | null;
  reason: ActionLogRecordReason;
  status: PlanActionStatus;
}

// ─── Fold ────────────────────────────────────────────────────────────────────

const INITIAL_STATUS: PlanActionStatus = "planejada";

export function foldActionStatus(
  events: readonly ActionLogEvent[],
  actionKey: string,
): PlanActionStatus {
  let status = INITIAL_STATUS;
  for (const event of events) {
    if (event.actionKey !== actionKey) continue;
    if (event.kind === "status_change" && event.toStatus) status = event.toStatus;
  }
  return status;
}

export function recordActionEvent(
  existing: readonly ActionLogEvent[],
  event: ActionLogEvent,
): ActionLogRecordResult {
  const current = foldActionStatus(existing, event.actionKey);
  const finish = (
    reason: ActionLogRecordReason,
    events: ActionLogEvent[] = [...existing],
    recorded: ActionLogEvent | null = null,
  ): ActionLogRecordResult => ({
    events,
    event: recorded,
    reason,
    status: recorded?.kind === "status_change" && recorded.toStatus ? recorded.toStatus : current,
  });

  if (!event.id.trim() || !event.actionKey.trim() || !event.actorRole.trim()) {
    return finish("invalid_request");
  }
  if (existing.some((e) => e.id === event.id)) return finish("duplicate");

  if (event.kind === "status_change") {
    if (!event.toStatus) return finish("invalid_request");
    if (!canTransition(current, event.toStatus)) return finish("invalid_transition");
  }
  if (event.kind === "maintenance_check" && typeof event.maintained !== "boolean") {
    return finish("invalid_request");
  }

  return finish("recorded", [...existing, event], event);
}

// ─── Leituras derivadas ──────────────────────────────────────────────────────

export interface ActionLogSummary {
  totalActions: number;
  /** concluida OU em_vigilancia (vigilância é pós-conclusão, não regressão). */
  concludedCount: number;
  pctConcluded: number;
  evidenceCountByAction: Record<string, number>;
  /**
   * Último maintenance_check por ação — só ações COM check aparecem
   * (ausência = manutenção não atestada, nunca presumida true).
   * É o alimento real do flag que reavaliacao/intervention-evidence consomem.
   */
  maintenanceByAction: Record<string, boolean>;
}

export function buildActionTimeline(
  events: readonly ActionLogEvent[],
  actionKey: string,
): ActionLogEvent[] {
  return events
    .filter((e) => e.actionKey === actionKey)
    .slice()
    .sort((a, b) => a.occurredOn.localeCompare(b.occurredOn));
}

export function summarizeActionLog(
  events: readonly ActionLogEvent[],
  actionKeys: readonly string[],
): ActionLogSummary {
  const evidenceCountByAction: Record<string, number> = {};
  const maintenanceByAction: Record<string, boolean> = {};

  for (const event of events) {
    if (event.kind === "evidence_recorded") {
      evidenceCountByAction[event.actionKey] = (evidenceCountByAction[event.actionKey] ?? 0) + 1;
    }
    if (event.kind === "maintenance_check" && typeof event.maintained === "boolean") {
      maintenanceByAction[event.actionKey] = event.maintained; // último vence
    }
  }

  const concludedCount = actionKeys.filter((key) => {
    const status = foldActionStatus(events, key);
    return status === "concluida" || status === "em_vigilancia";
  }).length;

  return {
    totalActions: actionKeys.length,
    concludedCount,
    pctConcluded:
      actionKeys.length === 0 ? 0 : Math.round((concludedCount / actionKeys.length) * 100),
    evidenceCountByAction,
    maintenanceByAction,
  };
}
