// C2 · devolutiva coletiva da transformação para os membros da organização.
// Decisões do operador (Q2_C2_COLLABORATOR_FEEDBACK_PROPOSAL_2026-11-19): D1 recusa Q2 + Diário,
// D2 título visível com aviso ao RH, D3 todos os membros, D4 título só de ações escritas
// sob o aviso. Projeção FECHADA montada no servidor: nada de responsável, descrição,
// indicador, evidência ou linha do tempo sai daqui.
//
// B2: a regra D4 lê `action_items.title_visible_at` (migration 20261119120000), preenchida
// pelo banco em toda inserção nova e NULL nas linhas anteriores ao aviso. Sem a coluna
// (ambiente sem a migration), nenhum título é exibido — padrão conservador.

import { authorizeLedger, buildFibtActionPlanViews, isUndefinedColumnError, ledgerOf, type FibtActionLoopDeps, type FibtLedgerSnapshot } from "./fibt-action-loop.server";
import type { PlanActionStatus } from "@/engine/action-plan/action-log-engine";
import type { FibtActionPlanView } from "./ivo-views";

export interface MemberFeedbackAction {
  /** Null quando o título não foi escrito sob o aviso ao RH (D4). */
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

export interface MemberPlanFeedbackDeps extends FibtActionLoopDeps {
  /** Ids das ações da org cujo título pode ser exibido (title_visible_at preenchido). */
  titleVisibleItemIds?: (orgId: string) => Promise<ReadonlySet<string>>;
}

async function defaultTitleVisibleItemIds(orgId: string): Promise<ReadonlySet<string>> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await (supabaseAdmin as any)
    .from("action_items").select("id").eq("org_id", orgId).not("title_visible_at", "is", null);
  if (error) {
    if (isUndefinedColumnError(error)) return new Set();
    throw new Error("IVO_TITLE_VISIBILITY_READ_FAILED");
  }
  return new Set(((data ?? []) as { id: string }[]).map((r) => String(r.id)));
}

export function projectMemberFeedback(views: FibtActionPlanView[], titleVisible: ReadonlySet<string>): MemberFeedbackPlan[] {
  return views
    .filter((p): p is FibtActionPlanView & { status: "active" | "closed" } => p.status === "active" || p.status === "closed")
    .map((plan) => ({
      cycle: plan.cycleKeyCanonical ?? plan.cycleKey,
      status: plan.status,
      actions: plan.actions.map((a) => ({
        title: titleVisible.has(a.id) ? a.title : null,
        sectorLabel: a.source.cohortLabel,
        factorName: a.source.factorName,
        status: a.status,
        dueMonth: a.dueOn ? a.dueOn.slice(0, 7) : null,
        hasExecutionRecord: a.evidence.execution.length > 0,
      })),
    }))
    .filter((p) => p.actions.length > 0);
}

export async function loadMemberPlanFeedback(
  input: { accessToken?: string },
  deps: MemberPlanFeedbackDeps = {},
): Promise<MemberPlanFeedbackOutcome> {
  const auth = await authorizeLedger(input.accessToken, deps, { allowMember: true });
  if (!auth.ok) return { ok: false, category: auth.category, error: auth.error };
  try {
    const snapshot: FibtLedgerSnapshot = await ledgerOf(deps).loadFibtLedger(auth.orgId);
    const titleVisible = await (deps.titleVisibleItemIds ?? defaultTitleVisibleItemIds)(auth.orgId);
    const views = buildFibtActionPlanViews(snapshot, auth.orgId, "");
    return { ok: true, plans: projectMemberFeedback(views, titleVisible) };
  } catch {
    return { ok: false, category: "backend", error: "A devolutiva não pôde ser carregada agora." };
  }
}
