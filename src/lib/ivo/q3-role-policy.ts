// Política de papéis do Q3 · PERMA+V (fatia F2) — DECIDIDA (Q3-07), NÃO LIGADA.
//
// Q3-07 (docs/vitalos/decisions/DOSSIE_DECISOES_Q3_LINHAGEM_PILOTO_2026-11-19.md), espelhando o Q2:
// RH aplica e lê o agregado; liderança só sobre ações próprias; membros só a devolutiva coletiva;
// ninguém vê respostas individuais. Papel não citado na decisão (ex.: SST) é recusado até decisão.
//
// Função pura: não lê sessão nem banco. `actor` precisa vir resolvido no SERVIDOR. Nenhum endpoint
// a importa antes da F5 (teste de importadores).

export type Q3Operation = "apply" | "read_aggregate" | "run_feedback" | "own_actions" | "collective_feedback" | "read_individual";

export interface Q3Actor {
  userId: string;
  orgId: string;
  role: string;
}

export interface Q3Target {
  orgId: string;
  /** Só em `own_actions`: responsável pela ação. */
  actionOwnerUserId?: string | null;
}

export type Q3DenialReason = "other_org" | "individual_never" | "role_not_allowed" | "not_action_owner";
export type Q3Decision = { allowed: true } | { allowed: false; reason: Q3DenialReason };

const ALLOWED: Readonly<Record<string, ReadonlySet<Q3Operation>>> = {
  RH_ADMIN: new Set(["apply", "read_aggregate", "run_feedback", "collective_feedback"]),
  LIDER_EQUIPE: new Set(["own_actions", "collective_feedback"]),
  COLABORADOR: new Set(["collective_feedback"]),
};

export function decideQ3Operation(actor: Q3Actor, op: Q3Operation, target: Q3Target): Q3Decision {
  if (op === "read_individual") return { allowed: false, reason: "individual_never" };
  if (actor.orgId !== target.orgId) return { allowed: false, reason: "other_org" };
  if (!ALLOWED[actor.role]?.has(op)) return { allowed: false, reason: "role_not_allowed" };
  if (op === "own_actions" && (!target.actionOwnerUserId || target.actionOwnerUserId !== actor.userId))
    return { allowed: false, reason: "not_action_owner" };
  return { allowed: true };
}
