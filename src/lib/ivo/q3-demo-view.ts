// Q3 · demonstração sintética — modelo de visão por perfil (puro, sem I/O).
//
// Compõe só agregados por equipe: oculta equipes com < 5 respostas, calcula a média da
// organização ponderada pelas equipes visíveis, roda a régua do IVO sobre as médias e filtra
// ações pela política de papéis do Q3 (Q3-07). Nada individual entra ou sai daqui.
import { decideQ3Operation, type Q3Actor } from "./q3-role-policy";
import { Q3_TEAM_K_MIN, testConvergent, testDiscriminant, type ConvergenceCriteria, type ConvergenceResult, type TeamAggregate } from "./q3-team-convergence";

export type FactorId = "P" | "E" | "R" | "M" | "A";
type IvoKey = "proposito_significado" | "crescimento_maestria" | "cooperacao_confianca" | "condicoes_carga";

export interface DemoTeamInput {
  id: string;
  label: string;
  invited: number;
  responded: number;
  factors: Record<FactorId, number>;
  ivo: Record<IvoKey, number>;
}

export interface DemoHypothesis {
  id: string;
  kind: "convergent" | "discriminant";
  factor: FactorId;
  ivo: IvoKey;
  against?: string;
  label: string;
}

export interface DemoAction {
  id: string;
  ownerUserId: string;
}

export type TeamRow =
  | { id: string; label: string; invited: number; responded: number; visible: true; factors: Record<FactorId, number> }
  | { id: string; label: string; invited: number; responded: number; visible: false };

export interface OrgSummary {
  invited: number;
  responded: number;
  adherence: number;
  /** Média ponderada pelas respostas das equipes VISÍVEIS; `null` se nenhuma. */
  factors: Record<FactorId, number> | null;
  /** Fatores da menor para a maior média (só se houver agregado). */
  priorities: FactorId[];
}

const FACTOR_IDS: readonly FactorId[] = ["P", "E", "R", "M", "A"];

export function buildTeamRows(teams: readonly DemoTeamInput[]): TeamRow[] {
  return teams.map((t) =>
    t.responded >= Q3_TEAM_K_MIN
      ? { id: t.id, label: t.label, invited: t.invited, responded: t.responded, visible: true, factors: t.factors }
      : { id: t.id, label: t.label, invited: t.invited, responded: t.responded, visible: false },
  );
}

export function buildOrgSummary(teams: readonly DemoTeamInput[]): OrgSummary {
  const invited = teams.reduce((a, t) => a + t.invited, 0);
  const responded = teams.reduce((a, t) => a + t.responded, 0);
  const visible = teams.filter((t) => t.responded >= Q3_TEAM_K_MIN);
  const weight = visible.reduce((a, t) => a + t.responded, 0);
  const factors =
    weight === 0
      ? null
      : (Object.fromEntries(
          FACTOR_IDS.map((f) => [f, Math.round((visible.reduce((a, t) => a + t.factors[f] * t.responded, 0) / weight) * 10) / 10]),
        ) as Record<FactorId, number>);
  const priorities = factors ? [...FACTOR_IDS].sort((a, b) => factors[a] - factors[b]) : [];
  return { invited, responded, adherence: invited === 0 ? 0 : responded / invited, factors, priorities };
}

export function buildConvergence(
  teams: readonly DemoTeamInput[],
  hypotheses: readonly DemoHypothesis[],
  criteria: ConvergenceCriteria,
): { id: string; label: string; kind: DemoHypothesis["kind"]; result: ConvergenceResult }[] {
  const pairs = (h: DemoHypothesis): TeamAggregate[] =>
    teams.map((t) => ({ teamId: t.id, permaMean: t.factors[h.factor], permaN: t.responded, ivoMean: t.ivo[h.ivo], ivoN: t.responded }));
  const results = new Map<string, ConvergenceResult>();
  for (const h of hypotheses.filter((x) => x.kind === "convergent")) results.set(h.id, testConvergent(pairs(h), criteria));
  for (const h of hypotheses.filter((x) => x.kind === "discriminant")) {
    const conv = results.get(h.against ?? "");
    results.set(h.id, conv ? testDiscriminant(conv, pairs(h), criteria) : { verdict: "insufficient", teams: 0, reason: "few_teams" });
  }
  return hypotheses.map((h) => ({ id: h.id, label: h.label, kind: h.kind, result: results.get(h.id)! }));
}

export interface PersonaAccess {
  rhDashboard: boolean;
  collective: boolean;
  respond: boolean;
  ownActions: boolean;
}

/** O que cada perfil vê, derivado SÓ da política de papéis. */
export function personaAccess(actor: Q3Actor): PersonaAccess {
  const can = (op: Parameters<typeof decideQ3Operation>[1]) => decideQ3Operation(actor, op, { orgId: actor.orgId, actionOwnerUserId: actor.userId }).allowed;
  return {
    rhDashboard: can("read_aggregate"),
    collective: can("collective_feedback"),
    respond: actor.role === "COLABORADOR" || actor.role === "LIDER_EQUIPE",
    ownActions: can("own_actions"),
  };
}

export function ownActions<T extends DemoAction>(actor: Q3Actor, actions: readonly T[]): T[] {
  return actions.filter((a) => decideQ3Operation(actor, "own_actions", { orgId: actor.orgId, actionOwnerUserId: a.ownerUserId }).allowed);
}
