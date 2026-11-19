// Política de escopo da liderança no ciclo de ação Q2 — PROPOSTA, NÃO LIGADA.
//
// Contrato proposto (ramo B do ToT em docs/vitalos/decisions/Q2_LEADER_SCOPE_PROPOSAL_2026-11-18.md):
// a liderança opera apenas sobre ações das quais é a pessoa responsável
// (`owner_user_id`), no plano ATIVO da própria organização. Nada de leitura por
// setor, nada de criação/ativação/encerramento de plano, nada de atribuir
// responsáveis. O escopo deriva de um dado que já existe; não há migration.
//
// Função pura: não lê sessão nem banco. Quem a chamar precisa entregar
// `actor` resolvido no SERVIDOR (requireOrg… → profiles) — nunca do payload.
// Enquanto a decisão não for registrada, nenhum endpoint a importa.

export type LeaderOperation =
  | "view_plan_summary"
  | "view_action"
  | "record_status"
  | "record_execution_evidence"
  | "create_actions"
  | "set_accountability"
  | "activate_plan"
  | "add_action"
  | "close_plan"
  | "view_sector_reading";

export interface LeaderActor {
  userId: string;
  orgId: string;
  role: string;
}

export interface LeaderTarget {
  orgId: string;
  planStatus: "draft" | "active" | "closed";
  /** Ausente nas operações de plano; presente nas operações sobre uma ação. */
  action?: { ownerUserId: string | null };
}

export type LeaderDenialReason =
  | "not_leader"
  | "other_org"
  | "authority_reserved_to_admin"
  | "plan_not_active"
  | "not_action_owner";

export type LeaderDecision = { allowed: true } | { allowed: false; reason: LeaderDenialReason };

export const LEADER_ROLE = "LIDER_EQUIPE";

/** Operações que continuam exclusivas do administrador institucional. */
const RESERVED_TO_ADMIN: ReadonlySet<LeaderOperation> = new Set([
  "create_actions",
  "set_accountability",
  "activate_plan",
  "add_action",
  "close_plan",
  "view_sector_reading",
]);

/** Escrita sobre a ação: só no plano ativo (plano fechado é imutável; rascunho ainda não tem responsáveis firmes). */
const WRITES: ReadonlySet<LeaderOperation> = new Set(["record_status", "record_execution_evidence"]);

export function decideLeaderOperation(actor: LeaderActor, operation: LeaderOperation, target: LeaderTarget): LeaderDecision {
  if (actor.role !== LEADER_ROLE) return { allowed: false, reason: "not_leader" };
  if (actor.orgId !== target.orgId) return { allowed: false, reason: "other_org" };
  if (RESERVED_TO_ADMIN.has(operation)) return { allowed: false, reason: "authority_reserved_to_admin" };

  if (operation === "view_plan_summary") {
    // Resumo = contagens agregadas do plano, sem títulos de ações alheias.
    return target.planStatus === "draft" ? { allowed: false, reason: "plan_not_active" } : { allowed: true };
  }

  // Daqui em diante: operações sobre UMA ação.
  const owner = target.action?.ownerUserId ?? null;
  if (owner === null || owner !== actor.userId) return { allowed: false, reason: "not_action_owner" };
  if (target.planStatus === "draft") return { allowed: false, reason: "plan_not_active" };
  if (WRITES.has(operation) && target.planStatus !== "active") return { allowed: false, reason: "plan_not_active" };
  return { allowed: true };
}

/** Filtra a lista de ações que a liderança pode ver: só as próprias. */
export function leaderVisibleActions<T extends { ownerUserId: string | null }>(
  actor: LeaderActor,
  planOrgId: string,
  planStatus: LeaderTarget["planStatus"],
  items: readonly T[],
): T[] {
  return items.filter(
    (item) => decideLeaderOperation(actor, "view_action", { orgId: planOrgId, planStatus, action: { ownerUserId: item.ownerUserId } }).allowed,
  );
}
