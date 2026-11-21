// Ajuda contextual com evidências — motor puro (setor-agnóstico, zero import de domain).
//
// Seleção determinística por PONTO da interface × PAPEL × ESTADO da tela. O conteúdo é
// editorial e versionado (vive em src/domain/help/). A associação científica nunca é
// decidida aqui: o chamador injeta `resolveEvidence`, que deve usar findClaimForContext +
// trustGate. Sem claim aprovado para o contexto exato, a ajuda sai só com a orientação
// operacional — fail-closed, nunca um claim de outra superfície.

import {
  findClaimForContext,
  resolveStudy,
  trustGate,
  type ClaimRegistry,
  type EvidenceRegistry,
} from "@/engine/evidence/passport-engine";

export type HelpRole = "colaborador" | "lideranca" | "rh" | "sst" | "direcao";

/** Natureza da fonte — vira o rótulo visível ao lado da frase. */
export type HelpSourceNature = "produto" | "orientacao_oficial" | "estudo";

export interface HelpSource {
  nature: HelpSourceNature;
  /** Nome curto da fonte. */
  title: string;
  /** O que esta fonte sustenta NESTE ponto (alcance). */
  supports: string;
  /** Localizador: seção, item, página ou arquivo do produto. */
  locator?: string;
  href?: string;
  /** Link interno do app (rota), quando a fonte vive no próprio produto. */
  to?: string;
}

export interface HelpRoleVariant {
  /** Exemplo concreto do que essa função faz. */
  example: string;
  /** Próximo passo realmente disponível neste fluxo. */
  nextStep: string;
  /** Rota interna onde o próximo passo acontece, quando existe. */
  link?: { to: string; label: string };
}

export interface HelpFlowStep {
  verb: string;
  who: string;
  text: string;
}

export interface HelpStateVariant {
  /** Rótulo curto do estado (ex.: "Um ciclo registrado"). */
  label: string;
  /** O que a tela permite concluir neste estado. */
  meaning: string;
}

export interface HelpEvidenceBinding {
  /** Estudo canônico candidato. */
  studyId: string;
  intendedUse: string;
  targetContext: string;
  segment: string;
}

export interface ContextualHelpEntry {
  id: string;
  version: string;
  route: string;
  anchor: string;
  /** Pergunta do botão — também o nome acessível. */
  question: string;
  /** Resposta curta (camada 1). */
  summary: string;
  /** Aviso de demonstração, quando afeta a leitura. */
  demoNotice?: string;
  /** Variações por papel (camada 2). `geral` é obrigatória e cobre papéis sem variação. */
  roles: { geral: HelpRoleVariant } & Partial<Record<HelpRole, HelpRoleVariant>>;
  flow?: HelpFlowStep[];
  /** O que acontece depois: próxima etapa e responsável, quando conhecidos. */
  afterwards?: string;
  /** O que você vê: origem e nível de agregação dos dados. */
  dataScope?: string;
  /** Por que isso importa no ciclo VitalOS. */
  whyItMatters?: string;
  /** Estados da tela que mudam a leitura, por chave de estado. */
  states?: Record<string, HelpStateVariant>;
  limits: string[];
  sources: HelpSource[];
  evidence?: HelpEvidenceBinding;
  review: { status: "proposta_editorial" | "revisado"; reviewer: string | null; date: string };
}

export interface ResolvedEvidence {
  claimId: string;
  text: string;
  citation: string;
  href?: string;
  caveat: string | null;
}

export type EvidenceResolver = (
  binding: HelpEvidenceBinding,
  role: HelpRole,
) => ResolvedEvidence | null;

export interface ResolvedHelp {
  entry: ContextualHelpEntry;
  role: HelpRole;
  variant: HelpRoleVariant;
  /** true quando o papel recebeu texto próprio (não a variação geral). */
  roleSpecific: boolean;
  state: HelpStateVariant | null;
  stateKey: string | null;
  evidence: ResolvedEvidence | null;
}

const PERSONA_TO_HELP_ROLE: Record<string, HelpRole> = {
  COLABORADOR: "colaborador",
  EMBAIXADOR: "colaborador",
  LIDER_EQUIPE: "lideranca",
  RH_ADMIN: "rh",
  CHRO: "rh",
  SST_PROFISSIONAL: "sst",
  CIPA_MEMBRO: "sst",
  C_LEVEL: "direcao",
  HOLDING_ADMIN: "direcao",
  // Papéis institucionais (profiles.role) — mesma leitura, nunca autorização.
  DGP_RH: "rh",
  DIRETOR: "direcao",
  SESMT_SAUDE: "sst",
};

/** Papel de leitura da ajuda a partir do papel demonstrativo. Desconhecido → colaborador. */
export function helpRoleFromPersona(roleId: string): HelpRole {
  return PERSONA_TO_HELP_ROLE[roleId] ?? "colaborador";
}

export function resolveHelp(
  entry: ContextualHelpEntry,
  role: HelpRole,
  options: { stateKey?: string | null; resolveEvidence?: EvidenceResolver } = {},
): ResolvedHelp {
  const own = entry.roles[role];
  const stateKey = options.stateKey ?? null;
  const state = stateKey && entry.states ? (entry.states[stateKey] ?? null) : null;
  const evidence =
    entry.evidence && options.resolveEvidence
      ? options.resolveEvidence(entry.evidence, role)
      : null;
  return {
    entry,
    role,
    variant: own ?? entry.roles.geral,
    roleSpecific: !!own,
    state,
    stateKey: state ? stateKey : null,
    evidence,
  };
}

/** Termos que a ajuda nunca usa (promessa de efeito, conformidade ou diagnóstico). */
export const HELP_FORBIDDEN_TERMS = [
  "garante",
  "comprova",
  "comprovado",
  "certifica conformidade",
  "em conformidade com a nr-1",
  "diagnóstico de",
  "elimina o risco",
] as const;

export function validateHelpEntry(entry: ContextualHelpEntry): string[] {
  const problems: string[] = [];
  if (!entry.question.trim().endsWith("?")) problems.push(`${entry.id}: pergunta sem "?"`);
  if (!entry.summary.trim()) problems.push(`${entry.id}: resumo vazio`);
  if (entry.sources.length === 0) problems.push(`${entry.id}: sem fonte declarada`);
  if (!entry.sources.some((s) => s.nature === "produto"))
    problems.push(`${entry.id}: falta a fonte "Como funciona no VitalOS"`);
  if (entry.sources.some((s) => s.nature === "estudo"))
    problems.push(`${entry.id}: estudo só entra via resolveEvidence (claim do contexto), nunca fixo`);
  const texts = [
    entry.question,
    entry.summary,
    entry.demoNotice ?? "",
    entry.afterwards ?? "",
    entry.dataScope ?? "",
    entry.whyItMatters ?? "",
    ...Object.values(entry.roles).flatMap((v) => (v ? [v.example, v.nextStep] : [])),
    ...(entry.flow ?? []).map((f) => f.text),
    ...Object.values(entry.states ?? {}).map((s) => s.meaning),
    ...entry.limits,
    ...entry.sources.map((s) => s.supports),
  ]
    .join(" \n ")
    .toLowerCase();
  for (const term of HELP_FORBIDDEN_TERMS)
    if (texts.includes(term)) problems.push(`${entry.id}: termo proibido "${term}"`);
  return problems;
}

// ─── Resolver de evidência (composição com o Passaporte) ─────────────────────

/** Papel da ajuda → papel do Claim Registry. SST não tem claim de passaporte: fica sem estudo. */
const HELP_ROLE_TO_CLAIM_ROLE: Partial<Record<HelpRole, string>> = {
  colaborador: "colaborador",
  lideranca: "lider",
  rh: "rh",
  direcao: "chro",
};

/**
 * Resolver padrão: só devolve evidência quando existe claim do Claim Registry para o
 * contexto EXATO (uso × papel × segmento × contexto-alvo) e o trustGate passa.
 */
export function createHelpEvidenceResolver(
  evidenceRegistry: EvidenceRegistry,
  claimRegistry: ClaimRegistry,
): EvidenceResolver {
  return (binding, role) => {
    const claimRole = HELP_ROLE_TO_CLAIM_ROLE[role];
    if (!claimRole) return null;
    const study = resolveStudy(evidenceRegistry, binding.studyId);
    if (!study) return null;
    const context = {
      intendedUse: binding.intendedUse,
      role: claimRole,
      segment: binding.segment,
      targetContext: binding.targetContext,
    };
    const claim = findClaimForContext(evidenceRegistry, claimRegistry, study, context);
    if (!claim) return null;
    return {
      claimId: claim.claim_id,
      text: claim.safe_claim,
      citation: study.canonical_citation,
      href: study.doi ? `https://doi.org/${study.doi}` : undefined,
      caveat: trustGate(study, claim, context).requiredCaveat,
    };
  };
}
