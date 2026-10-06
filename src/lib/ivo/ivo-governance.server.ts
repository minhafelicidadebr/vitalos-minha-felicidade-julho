// R8 — consulta da governança metodológica e preparo (sem persistência) de decisões.
// Server-only. Qualquer administrador autenticado de organização pode CONSULTAR;
// decidir exige a autoridade metodológica configurada no servidor. RH_ADMIN não aprova.
import { authorizeIvoSession, type IvoSessionDeps } from "./ivo-q2-reading.server";
import { getGovernanceEntries, getGovernanceEntry, getGovernanceRegistryMeta } from "@/domain/ivo/methodology-governance";
import {
  GOVERNANCE_STATES,
  assessMethodAuthority,
  prepareGovernanceDecision,
  DECISION_ERROR_LABEL,
  type GovernanceAuthority,
  type GovernanceState,
} from "@/engine/ivo/governance-decision";
import {
  isConclusiveAllowed,
  isDisposableLocalRuntime,
  resolveEfficacyGovernanceGate,
  resolveMethodAuthority,
  type GovernanceGate,
  type GovernanceGateEnv,
} from "./ivo-governance-gate.server";
import { todayInSaoPaulo } from "./local-date";
import type { LoadGovernanceOutcome, PrepareGovernanceDecisionOutcome } from "./ivo-views";

export interface GovernanceDeps extends IvoSessionDeps {
  authority?: () => GovernanceAuthority;
  gate?: () => GovernanceGate;
  now?: () => Date;
  /** Marca a decisão como de teste (identidades fictícias). Padrão: runtime local descartável. */
  test?: () => boolean;
}

export async function loadGovernanceForSession(input: { accessToken?: string }, deps: GovernanceDeps = {}): Promise<LoadGovernanceOutcome> {
  const auth = await authorizeIvoSession(input.accessToken, deps);
  if (!auth.ok) return auth;
  const authority = (deps.authority ?? (() => resolveMethodAuthority()))();
  const assessed = assessMethodAuthority({ userId: auth.userId, orgRole: auth.role }, authority);
  const gate = (deps.gate ?? (() => resolveEfficacyGovernanceGate()))();
  const entries = [...getGovernanceEntries()];
  const counts = Object.fromEntries(GOVERNANCE_STATES.map((s) => [s, entries.filter((e) => e.state === s).length])) as Record<GovernanceState, number>;
  const meta = getGovernanceRegistryMeta();
  return {
    ok: true,
    registryVersion: meta.version,
    authorityPolicy: meta.authorityPolicy,
    entries,
    counts,
    authority: { configured: authority.configuredUserIds.length > 0, canApprove: assessed.allowed, reason: assessed.reason },
    efficacyGate: {
      decisionId: "D9",
      state: gate.state,
      source: gate.source,
      conclusiveAllowed: isConclusiveAllowed(gate),
      reason: isConclusiveAllowed(gate) ? null : "D9 ainda não aprovada: só o parecer 'inconclusiva' é aceito.",
    },
  };
}

export interface PrepareDecisionInput {
  accessToken?: string;
  entryId: string;
  toState: GovernanceState;
  owner?: string | null;
  reviewer?: string | null;
  evidence?: string[];
  criteriaMet?: string[];
  intendedUse?: string | null;
}

/** Valida e devolve o registro resultante para revisão/commit. NÃO grava nada. */
export async function prepareGovernanceDecisionForSession(input: PrepareDecisionInput, deps: GovernanceDeps = {}): Promise<PrepareGovernanceDecisionOutcome> {
  const auth = await authorizeIvoSession(input.accessToken, deps);
  if (!auth.ok) return auth;
  const authority = (deps.authority ?? (() => resolveMethodAuthority()))();
  const actor = { userId: auth.userId, orgRole: auth.role };
  const assessed = assessMethodAuthority(actor, authority);
  if (!assessed.allowed) {
    return { ok: true, accepted: false, reason: "authority_unavailable", message: assessed.reason ?? "Aprovação indisponível.", errors: [] };
  }
  const entry = getGovernanceEntry(input.entryId);
  if (!entry) return { ok: true, accepted: false, reason: "entry_not_found", message: "Decisão não encontrada no registro.", errors: [] };
  const result = prepareGovernanceDecision(entry, {
    toState: input.toState,
    actor,
    authority,
    owner: input.owner ?? null,
    reviewer: input.reviewer ?? null,
    evidence: input.evidence ?? [],
    criteriaMet: input.criteriaMet ?? [],
    intendedUse: input.intendedUse ?? null,
    decidedAt: todayInSaoPaulo((deps.now ?? (() => new Date()))()),
    test: (deps.test ?? (() => isDisposableLocalRuntime(process.env as GovernanceGateEnv)))(),
  });
  if (!result.ok) {
    return {
      ok: true,
      accepted: false,
      reason: "decision_invalid",
      message: result.errors.map((e) => DECISION_ERROR_LABEL[e] ?? e).join(" "),
      errors: [...result.errors],
    };
  }
  return {
    ok: true,
    accepted: true,
    entry: result.entry,
    audit: result.audit,
    note: "Nada foi gravado. Este é o registro resultante para revisão humana e commit no repositório.",
  };
}
