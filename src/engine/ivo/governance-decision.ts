// Governança metodológica do IVO (R8) — regras PURAS de decisão.
//
// Separa três coisas que não se confundem:
//   · proposta              — material preparado; sem efeito no produto;
//   · aprovado_para_piloto  — uso experimental delimitado e identificado;
//   · validado_para_uso_definido — evidência de validação para o uso declarado.
//
// Quem decide: uma AUTORIDADE METODOLÓGICA configurada no servidor. O papel
// RH_ADMIN de uma organização NÃO concede essa autoridade (ela só vale dentro
// da própria organização). Sem autoridade configurada, a aprovação fica
// indisponível com motivo explícito — a consulta das propostas continua.
//
// Este módulo não persiste nada: produz o registro resultante (versão nova +
// trilha) para revisão humana e commit. O registro canônico é versionado no
// repositório.

export const GOVERNANCE_STATES = [
  "proposta",
  "em_revisao",
  "aprovado_para_piloto",
  "validado_para_uso_definido",
  "rejeitada",
  "retirada",
] as const;
export type GovernanceState = (typeof GOVERNANCE_STATES)[number];

export const GOVERNANCE_STATE_LABEL: Record<GovernanceState, string> = {
  proposta: "Proposta",
  em_revisao: "Em revisão",
  aprovado_para_piloto: "Aprovado para piloto",
  validado_para_uso_definido: "Validado para uso definido",
  rejeitada: "Rejeitada",
  retirada: "Retirada",
};

export type GovernanceKind = "decision" | "mapping";
export type MappingNature = "direta" | "complementar" | "inadequada" | "insuficiente";

export interface GovernanceSource {
  ref: string;
  /** `externa_a_verificar`: citada, ainda não verificada neste repositório. */
  kind: "repo" | "externa_a_verificar";
}

export interface GovernanceApproval {
  decidedBy: string;
  decidedAt: string;
  evidence: readonly string[];
  /** Obrigatório em `validado_para_uso_definido`. */
  intendedUse: string | null;
  /** true quando a decisão veio de identidade fictícia de teste. */
  test: boolean;
}

export interface GovernanceEntry {
  id: string;
  kind: GovernanceKind;
  title: string;
  version: string;
  state: GovernanceState;
  proposal: string;
  rationale: string;
  alternatives: readonly string[];
  recommendation: string;
  sources: readonly GovernanceSource[];
  limitations: readonly string[];
  owner: string | null;
  reviewer: string | null;
  approval: GovernanceApproval | null;
  approvalCriteria: readonly string[];
  effects: ReadonlyArray<{ feature: string; effect: string }>;
  dependsOn: readonly string[];
  mapping?: {
    lens: string;
    sourceConstructId: string | null;
    dimension: string | null;
    nature: MappingNature;
  };
}

export const APPROVED_STATES: readonly GovernanceState[] = ["aprovado_para_piloto", "validado_para_uso_definido"];
export const isApprovedState = (state: GovernanceState): boolean => APPROVED_STATES.includes(state);

const TRANSITIONS: Record<GovernanceState, readonly GovernanceState[]> = {
  proposta: ["em_revisao", "rejeitada"],
  em_revisao: ["proposta", "aprovado_para_piloto", "rejeitada"],
  aprovado_para_piloto: ["validado_para_uso_definido", "retirada"],
  validado_para_uso_definido: ["retirada"],
  rejeitada: ["proposta"],
  retirada: [],
};
export const canTransitionGovernance = (from: GovernanceState, to: GovernanceState): boolean => TRANSITIONS[from].includes(to);

export interface GovernanceAuthority {
  /** Identificadores (user id) da autoridade metodológica configurada no servidor. */
  configuredUserIds: readonly string[];
}

export interface GovernanceActor {
  userId: string;
  /** Papel na organização (ex.: RH_ADMIN). Informativo: NUNCA concede autoridade. */
  orgRole?: string;
}

export interface AuthorityAssessment {
  allowed: boolean;
  reason: string | null;
}

export function assessMethodAuthority(actor: GovernanceActor | null, authority: GovernanceAuthority): AuthorityAssessment {
  if (authority.configuredUserIds.length === 0) {
    return {
      allowed: false,
      reason: "Nenhuma autoridade metodológica está configurada neste ambiente. A aprovação permanece indisponível.",
    };
  }
  if (!actor || !authority.configuredUserIds.includes(actor.userId)) {
    return {
      allowed: false,
      reason: "Sua sessão não é da autoridade metodológica. O papel de administrador da organização não aprova método global.",
    };
  }
  return { allowed: true, reason: null };
}

export interface DecisionRequest {
  toState: GovernanceState;
  actor: GovernanceActor;
  authority: GovernanceAuthority;
  owner: string | null;
  reviewer: string | null;
  evidence: readonly string[];
  /** Critérios de aprovação confirmados (devem cobrir todos os da entrada). */
  criteriaMet: readonly string[];
  intendedUse?: string | null;
  decidedAt: string;
  test?: boolean;
}

export type DecisionResult =
  | { ok: true; entry: GovernanceEntry; audit: { entryId: string; from: GovernanceState; to: GovernanceState; by: string; at: string; test: boolean } }
  | { ok: false; errors: readonly string[] };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function bumpMinor(version: string): string {
  const [major, minor] = version.split(".").map((n) => Number(n));
  return `${Number.isFinite(major) ? major : 0}.${(Number.isFinite(minor) ? minor : 0) + 1}.0`;
}

/** Valida e produz o registro resultante de uma decisão. Não persiste. */
export function prepareGovernanceDecision(entry: GovernanceEntry, request: DecisionRequest): DecisionResult {
  const errors: string[] = [];
  const authority = assessMethodAuthority(request.actor, request.authority);
  if (!authority.allowed) errors.push(authority.reason ?? "sem_autoridade");
  if (!canTransitionGovernance(entry.state, request.toState)) {
    errors.push(`transicao_invalida:${entry.state}->${request.toState}`);
  }
  if (!ISO_DATE.test(request.decidedAt)) errors.push("data_invalida");

  const approving = isApprovedState(request.toState);
  const owner = request.owner?.trim() || null;
  const reviewer = request.reviewer?.trim() || null;
  if (approving || request.toState === "em_revisao") {
    if (!owner) errors.push("responsavel_ausente");
    if (!reviewer) errors.push("revisor_ausente");
    if (owner && reviewer && owner.toLowerCase() === reviewer.toLowerCase()) errors.push("revisor_igual_ao_responsavel");
  }
  if (approving) {
    if (request.evidence.filter((e) => e.trim().length > 0).length === 0) errors.push("evidencia_ausente");
    const missing = entry.approvalCriteria.filter((c) => !request.criteriaMet.includes(c));
    if (missing.length > 0) errors.push(`criterios_pendentes:${missing.length}`);
  }
  if (request.toState === "validado_para_uso_definido") {
    if (entry.state !== "aprovado_para_piloto") errors.push("validacao_exige_piloto_previo");
    if (!request.intendedUse?.trim()) errors.push("uso_definido_ausente");
  }
  if (errors.length > 0) return { ok: false, errors };

  const next: GovernanceEntry = {
    ...entry,
    version: bumpMinor(entry.version),
    state: request.toState,
    owner: owner ?? entry.owner,
    reviewer: reviewer ?? entry.reviewer,
    approval: approving
      ? {
          decidedBy: request.actor.userId,
          decidedAt: request.decidedAt,
          evidence: request.evidence.map((e) => e.trim()).filter(Boolean),
          intendedUse: request.toState === "validado_para_uso_definido" ? request.intendedUse!.trim() : null,
          test: request.test === true,
        }
      : null,
  };
  return {
    ok: true,
    entry: next,
    audit: { entryId: entry.id, from: entry.state, to: request.toState, by: request.actor.userId, at: request.decidedAt, test: request.test === true },
  };
}

export const DECISION_ERROR_LABEL: Record<string, string> = {
  responsavel_ausente: "Informe o responsável.",
  revisor_ausente: "Informe o revisor.",
  revisor_igual_ao_responsavel: "O revisor deve ser diferente do responsável.",
  evidencia_ausente: "Anexe ao menos uma evidência da decisão.",
  validacao_exige_piloto_previo: "A validação para uso definido exige aprovação prévia para piloto.",
  uso_definido_ausente: "Declare o uso definido que a validação cobre.",
  data_invalida: "Data da decisão inválida.",
};
