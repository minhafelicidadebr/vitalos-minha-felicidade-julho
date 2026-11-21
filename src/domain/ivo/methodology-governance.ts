// Registro canônico da governança metodológica do IVO (R8).
//
// Fail-closed no carregamento, mesma disciplina de dimension-mappings.ts: um
// registro malformado ou incoerente derruba o boot em vez de virar aprovação
// silenciosa. Todas as entradas atuais estão em `proposta`.

import raw from "./methodology-governance.json";
import { getFibtManifest } from "@/domain/instruments/fibt/fibt-instrument";
import { IVO_DIMENSION_IDS } from "@/engine/ivo/lens-contract";
import {
  GOVERNANCE_STATES,
  isApprovedState,
  type GovernanceApproval,
  type GovernanceEntry,
  type GovernanceState,
  type MappingNature,
} from "@/engine/ivo/governance-decision";

interface RawEntry {
  id: string;
  kind: string;
  title: string;
  version: string;
  state: string;
  proposal: string;
  rationale: string;
  alternatives: string[];
  recommendation: string;
  sources: Array<{ ref: string; kind: string }>;
  limitations: string[];
  owner: string | null;
  reviewer: string | null;
  approval: null | {
    decided_by: string;
    decided_at: string;
    evidence: string[];
    intended_use: string | null;
    test?: boolean;
  };
  approval_criteria: string[];
  effects: Array<{ feature: string; effect: string }>;
  depends_on: string[];
  mapping?: { lens: string; sourceConstructId: string | null; dimension: string | null; nature: string };
}

interface RawRegistry {
  registry_version: string;
  description: string;
  authority_policy: string;
  states: Array<{ id: string; label: string; meaning: string }>;
  entries: RawEntry[];
}

export class MethodologyGovernanceError extends Error {
  constructor(message: string) {
    super(`[ivo-methodology-governance] ${message}`);
    this.name = "MethodologyGovernanceError";
  }
}

const NATURES: readonly MappingNature[] = ["direta", "complementar", "inadequada", "insuficiente"];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const nonEmpty = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;

export function validateGovernanceRegistry(registry: RawRegistry): GovernanceEntry[] {
  if (!nonEmpty(registry.registry_version)) throw new MethodologyGovernanceError("registry_version ausente");
  const ids = new Set<string>();
  for (const e of registry.entries) {
    if (!nonEmpty(e.id) || ids.has(e.id)) throw new MethodologyGovernanceError(`id ausente ou duplicado: ${e.id}`);
    ids.add(e.id);
  }
  const factors = new Set(getFibtManifest().factors.map((f) => f.id));

  return registry.entries.map((e) => {
    const where = e.id;
    if (e.kind !== "decision" && e.kind !== "mapping") throw new MethodologyGovernanceError(`${where}: kind inválido`);
    if (!(GOVERNANCE_STATES as readonly string[]).includes(e.state)) throw new MethodologyGovernanceError(`${where}: estado inválido ${e.state}`);
    for (const field of ["title", "version", "proposal", "rationale", "recommendation"] as const) {
      if (!nonEmpty(e[field])) throw new MethodologyGovernanceError(`${where}: ${field} ausente`);
    }
    if (e.approval_criteria.length === 0) throw new MethodologyGovernanceError(`${where}: critérios de aprovação ausentes`);
    if (e.effects.length === 0) throw new MethodologyGovernanceError(`${where}: efeito da pendência ausente`);
    if (e.sources.length === 0) throw new MethodologyGovernanceError(`${where}: fontes ausentes`);
    for (const s of e.sources) {
      if (!nonEmpty(s.ref) || (s.kind !== "repo" && s.kind !== "externa_a_verificar")) {
        throw new MethodologyGovernanceError(`${where}: fonte inválida`);
      }
    }
    for (const dep of e.depends_on) {
      if (!ids.has(dep)) throw new MethodologyGovernanceError(`${where}: dependência inexistente ${dep}`);
    }

    const state = e.state as GovernanceState;
    let approval: GovernanceApproval | null = null;
    if (isApprovedState(state)) {
      const a = e.approval;
      if (!nonEmpty(e.owner) || !nonEmpty(e.reviewer)) throw new MethodologyGovernanceError(`${where}: aprovada exige responsável e revisor`);
      if (e.owner.trim().toLowerCase() === e.reviewer.trim().toLowerCase()) throw new MethodologyGovernanceError(`${where}: revisor igual ao responsável`);
      if (!a || !nonEmpty(a.decided_by) || !ISO_DATE.test(a.decided_at) || a.evidence.filter(nonEmpty).length === 0) {
        throw new MethodologyGovernanceError(`${where}: aprovada exige decisor, data e evidência`);
      }
      if (state === "validado_para_uso_definido" && !nonEmpty(a.intended_use)) {
        throw new MethodologyGovernanceError(`${where}: validada exige uso definido`);
      }
      approval = {
        decidedBy: a.decided_by,
        decidedAt: a.decided_at,
        evidence: [...a.evidence],
        intendedUse: a.intended_use ?? null,
        test: a.test === true,
      };
    } else if (e.approval !== null) {
      throw new MethodologyGovernanceError(`${where}: estado ${state} não pode carregar aprovação`);
    }

    let mapping: GovernanceEntry["mapping"];
    if (e.kind === "mapping") {
      const m = e.mapping;
      if (!m) throw new MethodologyGovernanceError(`${where}: mapeamento sem definição`);
      if (m.lens !== "fibt") throw new MethodologyGovernanceError(`${where}: lente ${m.lens} sem construtos versionados`);
      if (m.sourceConstructId !== null && !factors.has(m.sourceConstructId)) {
        throw new MethodologyGovernanceError(`${where}: construto ${m.sourceConstructId} não existe na lente`);
      }
      if (m.dimension !== null && !(IVO_DIMENSION_IDS as readonly string[]).includes(m.dimension)) {
        throw new MethodologyGovernanceError(`${where}: dimensão desconhecida ${m.dimension}`);
      }
      if (!(NATURES as readonly string[]).includes(m.nature)) throw new MethodologyGovernanceError(`${where}: natureza inválida`);
      mapping = { lens: m.lens, sourceConstructId: m.sourceConstructId, dimension: m.dimension, nature: m.nature as MappingNature };
    }

    return Object.freeze({
      id: e.id,
      kind: e.kind,
      title: e.title,
      version: e.version,
      state,
      proposal: e.proposal,
      rationale: e.rationale,
      alternatives: Object.freeze([...e.alternatives]),
      recommendation: e.recommendation,
      sources: Object.freeze(e.sources.map((s) => ({ ref: s.ref, kind: s.kind as "repo" | "externa_a_verificar" }))),
      limitations: Object.freeze([...e.limitations]),
      owner: e.owner,
      reviewer: e.reviewer,
      approval,
      approvalCriteria: Object.freeze([...e.approval_criteria]),
      effects: Object.freeze(e.effects.map((x) => ({ ...x }))),
      dependsOn: Object.freeze([...e.depends_on]),
      ...(mapping ? { mapping } : {}),
    } as GovernanceEntry);
  });
}

const ENTRIES = Object.freeze(validateGovernanceRegistry(raw as unknown as RawRegistry));

export function getGovernanceEntries(): readonly GovernanceEntry[] {
  return ENTRIES;
}

export function getGovernanceRegistryMeta(): { version: string; description: string; authorityPolicy: string } {
  const r = raw as unknown as RawRegistry;
  return { version: r.registry_version, description: r.description, authorityPolicy: r.authority_policy };
}

export function getGovernanceEntry(id: string): GovernanceEntry | undefined {
  return ENTRIES.find((e) => e.id === id);
}

/** Estado vigente de uma decisão; ausente ⇒ `proposta` (nunca aprovada por omissão). */
export function governanceStateOf(id: string): GovernanceState {
  return getGovernanceEntry(id)?.state ?? "proposta";
}
