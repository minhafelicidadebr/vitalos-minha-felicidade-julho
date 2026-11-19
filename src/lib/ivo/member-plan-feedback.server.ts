// C2 · devolutiva coletiva da transformação para os membros da organização.
// Decisões do operador (Q2_C2_COLLABORATOR_FEEDBACK_PROPOSAL_2026-11-19): D1 recusa Q2 + Diário,
// D2 título visível com aviso ao RH, D3 todos os membros, D4 título só de ações criadas
// depois do aviso. Projeção FECHADA montada no servidor: nada de responsável, descrição,
// indicador, evidência ou linha do tempo sai daqui.

import { authorizeLedger, buildFibtActionPlanViews, ledgerOf, type FibtActionLoopDeps, type FibtLedgerSnapshot } from "./fibt-action-loop.server";
import type { PlanActionStatus } from "@/engine/action-plan/action-log-engine";
import type { FibtActionPlanView } from "./ivo-views";

/** Instante em que o aviso "Visível para as pessoas da organização" passou a existir nos formulários do RH. */
export const TITLE_VISIBLE_SINCE = "2026-11-19T03:50:00.000Z";

export interface MemberFeedbackAction {
  /** Null quando a ação é anterior ao aviso ao RH (D4). */
  title: string | null;
  sectorLabel: string | null;
  factorName: string;
  status: PlanActionStatus;
  /** "AAAA-MM" — só o mês do prazo. */
  dueMonth: string | null;
  hasExecutionRecord: boolean;
}

export interface MemberFeedbackPlan {
  cycle: string;
  status: "active" | "closed";
  actions: MemberFeedbackAction[];
}

export type MemberPlanFeedbackOutcome =
  | { ok: true; plans: MemberFeedbackPlan[] }
  | { ok: false; category: string; error: string };

export function projectMemberFeedback(views: FibtActionPlanView[], createdAtById: ReadonlyMap<string, string | undefined>): MemberFeedbackPlan[] {
  return views
    .filter((p): p is FibtActionPlanView & { status: "active" | "closed" } => p.status === "active" || p.status === "closed")
    .map((plan) => ({
      cycle: plan.cycleKeyCanonical ?? plan.cycleKey,
      status: plan.status,
      actions: plan.actions.map((a) => {
        const createdAt = createdAtById.get(a.id);
        return {
          title: createdAt && createdAt >= TITLE_VISIBLE_SINCE ? a.title : null,
          sectorLabel: a.source.cohortLabel,
          factorName: a.source.factorName,
          status: a.status,
          dueMonth: a.dueOn ? a.dueOn.slice(0, 7) : null,
          hasExecutionRecord: a.evidence.execution.length > 0,
        };
      }),
    }))
    .filter((p) => p.actions.length > 0);
}

export async function loadMemberPlanFeedback(
  input: { accessToken?: string },
  deps: FibtActionLoopDeps = {},
): Promise<MemberPlanFeedbackOutcome> {
  const auth = await authorizeLedger(input.accessToken, deps, { allowMember: true });
  if (!auth.ok) return { ok: false, category: auth.category, error: auth.error };
  try {
    const snapshot: FibtLedgerSnapshot = await ledgerOf(deps).loadFibtLedger(auth.orgId);
    const createdAt = new Map(snapshot.items.map((i) => [i.id, i.createdAt]));
    const views = buildFibtActionPlanViews(snapshot, auth.orgId, "");
    return { ok: true, plans: projectMemberFeedback(views, createdAt) };
  } catch {
    return { ok: false, category: "backend", error: "A devolutiva não pôde ser carregada agora." };
  }
}
