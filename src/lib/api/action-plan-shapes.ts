// Tipos + conversões PURAS compartilhadas entre action-plan.server.ts
// (constrói) e o cliente /plano-acao.tsx (consome). Sem I/O, sem service
// role — por isso mora fora de .server.ts (que nunca deve ser importado do
// cliente, mesmo quando um export específico seria seguro).

import type {
  ActionItem,
  ActionPlanSeason,
  ActionStatus,
  QuarterlyPlan,
} from "@/engine/action-plan/action-plan-engine";
import type { ActionAccountability, ControlTier } from "@/engine/action-plan/plan-enrichment-engine";
import type {
  ActionLogEvent,
  ActionLogEventKind,
  PlanActionStatus,
} from "@/engine/action-plan/action-log-engine";

export interface LoadedActionItem {
  id: string;
  rank: number;
  leverId: string;
  title: string;
  description: string;
  effort: "baixo" | "medio" | "alto";
  expectedIvoLift: number;
  isQuickWin: boolean;
  amb: { id: string | null; name: string | null; emoji: string | null };
  lensId: string | null;
  lensLabel: string | null;
  lensColor: string | null;
  esgCodes: string[];
  startWeek: number;
  endWeek: number;
  milestoneWeek: number;
  weeksBudget: number;
  controlTier: ControlTier | null;
  owner: { userId: string; roleLabel: string } | null;
  dueOn: string | null;
  metric: { label: string; baseline: number; target: number; unit: string } | null;
  cmo: { context: string; mechanism: string; outcome: string } | null;
  status: PlanActionStatus;
}

export interface LoadedActionPlan {
  id: string;
  cycleKey: string;
  seasonName: string;
  status: "draft" | "active" | "closed";
  sourceCapsuleId: string | null;
  createdAt: string;
  activatedAt: string | null;
  items: LoadedActionItem[];
  log: Array<{
    id: string;
    itemId: string;
    kind: ActionLogEventKind;
    actorRoleLabel: string;
    toStatus: PlanActionStatus | null;
    maintained: boolean | null;
    note: string | null;
    occurredAt: string;
  }>;
}

/** Converte a leitura do banco para o formato que plan-enrichment-engine consome. */
export function toAccountability(plan: LoadedActionPlan): ActionAccountability[] {
  return plan.items.map((item) => ({
    leverId: item.leverId,
    controlTier: item.controlTier,
    owner: item.owner
      ? { membershipId: item.owner.userId, displayRole: item.owner.roleLabel }
      : null,
    dueOn: item.dueOn,
    metric: item.metric,
    cmo: item.cmo,
  }));
}

/** ActionItem.status (3 valores, usado só p/ o selo visual do card) é derivado do status real do ledger (5 valores). */
export function deriveDisplayStatus(real: PlanActionStatus): ActionStatus {
  if (real === "concluida" || real === "em_vigilancia") return "concluido";
  if (real === "em_execucao") return "em_andamento";
  return "futuro";
}

/**
 * Converte o log bruto do banco (chaveado por item_id, o uuid da linha) para
 * o formato que action-log-engine consome (chaveado por actionKey = leverId
 * — mesma convenção do mock). Eventos cujo item já não existe no snapshot
 * (não deveria acontecer, FK garante) são descartados silenciosamente.
 */
export function toActionLogEvents(plan: LoadedActionPlan): ActionLogEvent[] {
  const leverIdByItemId = new Map(plan.items.map((item) => [item.id, item.leverId]));
  const events: ActionLogEvent[] = [];
  for (const raw of plan.log) {
    const actionKey = leverIdByItemId.get(raw.itemId);
    if (!actionKey) continue;
    events.push({
      id: raw.id,
      actionKey,
      kind: raw.kind,
      actorRole: raw.actorRoleLabel,
      occurredOn: raw.occurredAt.slice(0, 10),
      toStatus: raw.toStatus ?? undefined,
      maintained: raw.maintained ?? undefined,
      note: raw.note ?? undefined,
    });
  }
  return events;
}

/**
 * Reconstrói um QuarterlyPlan a partir do snapshot congelado no banco — o
 * agendamento (semanas/esforço/lift) é o que foi gravado na criação, nunca
 * recalculado; só `season` (nome/cor/semana atual) vem fresco do
 * season-engine no cliente, que é quem chama esta função com o objeto certo.
 */
export function toQuarterlyPlan(plan: LoadedActionPlan, season: ActionPlanSeason): QuarterlyPlan {
  const actions: ActionItem[] = plan.items.map((item) => ({
    rank: item.rank,
    leverId: item.leverId,
    leverLabel: item.title,
    description: item.description,
    effort: item.effort,
    expectedIvoLift: item.expectedIvoLift,
    isQuickWin: item.isQuickWin,
    amb: item.amb,
    lensId: item.lensId,
    lensLabel: item.lensLabel,
    lensColor: item.lensColor,
    esgCodes: item.esgCodes,
    startWeek: item.startWeek,
    endWeek: item.endWeek,
    milestoneWeek: item.milestoneWeek,
    status: deriveDisplayStatus(item.status),
    weeksBudget: item.weeksBudget,
  }));

  return {
    season,
    actions,
    quickWinCount: actions.filter((a) => a.isQuickWin).length,
    scheduledIvoLift: Math.round(actions.reduce((s, a) => s + a.expectedIvoLift, 0) * 10) / 10,
    hiddenActionsCount: 0,
    disclaimer:
      "Plano ativo desta organização — dados reais, gravados quando o plano foi criado. " +
      "O lift esperado é estimativa, não promessa.",
  };
}
