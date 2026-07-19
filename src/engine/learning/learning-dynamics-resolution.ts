// Resolução do Learning Dynamics Registry (Onda LDX-1) — puro, determinístico,
// sem React, sem I/O, sem import de domain/ (o catálogo entra por parâmetro,
// invariante Engine ≠ Domínio). Nunca deriva status por heurística: só lê os
// 6 campos de governança já classificados em learning-dynamics-registry.json.
//
// `PLANNED`, `PROPOSED`, `R_AND_D`, `AUSENTE` e `DEPRECATED` nunca resolvem
// CTA operacional — getAvailableDynamics exclui todos eles por construção.
//
// Os tipos do contrato (CanonicalLearningDynamic e os 6 enums de governança)
// vivem AQUI, não em src/domain/ — mesmo padrão de EvidenceStudy/EvidenceRegistry
// em src/engine/evidence/passport-engine.ts. src/domain/learning/ só guarda o
// JSON congelado + um loader tipado que RE-EXPORTA estes tipos (domain pode
// importar engine; o inverso é que é proibido — engine-domain-boundary.test.ts).

export type RuntimeStatus =
  | "REAL"
  | "PARCIAL"
  | "DEMO"
  | "PLANNED"
  | "PROPOSED"
  | "R_AND_D"
  | "AUSENTE"
  | "DEPRECATED";

export type ContentStatus = "VERIFIED" | "CURATED" | "DEMO" | "DRAFT" | "ABSENT";

export type PersistenceStatus =
  | "PERSISTED_PRIVATE"
  | "PERSISTED_TENANT"
  | "PERSISTED_AGGREGATED"
  | "SESSION_ONLY"
  | "NONE"
  | "NOT_APPLICABLE";

export type AiMode = "NONE" | "DETERMINISTIC" | "GENERATIVE_GATED" | "GENERATIVE_PROHIBITED";

export type PublicExposure = "AVAILABLE" | "PILOT" | "DEMO" | "PREPARATION" | "HIDDEN" | "R_AND_D";

export type RiskTier = "R1_LOW" | "R2_MODERATE" | "R3_HIGH" | "R4_CRITICAL";

export type MeteAxis = "medir" | "educar" | "transformar" | "evoluir";

export interface CanonicalLearningDynamic {
  id: string;
  version: string;
  slug: string;
  title: string;
  shortLabel: string;
  description: string;
  kind: string;
  meteAxes: MeteAxis[];
  primaryOutcome: string;
  authorizedRoles: string[];
  enrichesRoutes: string[];
  runtimeStatus: RuntimeStatus;
  contentStatus: ContentStatus;
  persistenceStatus: PersistenceStatus;
  aiMode: AiMode;
  publicExposure: PublicExposure;
  riskTier: RiskTier;
  dataClasses: string[];
  evidenceRefs: string[];
  runtimeEvidence: string[];
  documentationEvidence: string[];
  dependencies: string[];
  forbiddenUses: string[];
  accessibilityRequirements: string[];
  acceptanceCriteria: string[];
  rolloutWave: string;
}

/** Estados que NUNCA podem resolver CTA operacional (invariante "sem funcionalidade fantasma"). */
export const ROADMAP_RUNTIME_STATUSES: readonly RuntimeStatus[] = [
  "PLANNED",
  "PROPOSED",
  "R_AND_D",
  "AUSENTE",
  "DEPRECATED",
];

/** Exposições que nunca aparecem na jornada comum do usuário final. */
export const NON_JOURNEY_EXPOSURES: readonly PublicExposure[] = ["HIDDEN", "R_AND_D"];

/**
 * Allowlist, não blocklist: falha FECHADO. Um runtimeStatus desconhecido ou
 * malformado (dado corrompido, versão futura do schema) nunca deve resolver
 * CTA operacional só por não estar na lista de roadmap — "nenhuma superfície
 * exibe mais certeza do que o registro autoriza" vale também para o próprio
 * enum, não só para o conteúdo.
 */
const AVAILABLE_RUNTIME_STATUSES: readonly RuntimeStatus[] = ["REAL", "PARCIAL", "DEMO"];

export interface DynamicResolutionContext {
  route: string;
  /** Role ID do rbac (ex.: "LIDER_EQUIPE") — vazio = sem restrição de papel avaliada. */
  role?: string;
}

/** authorizedRoles vazio = ainda sem papel fechado (PLANNED/PROPOSED/R_AND_D) — nunca restringe. */
function roleAuthorized(dynamic: CanonicalLearningDynamic, role: string | undefined): boolean {
  if (dynamic.authorizedRoles.length === 0) return true;
  if (!role) return false;
  return dynamic.authorizedRoles.includes(role);
}

/**
 * Sempre estrito: enrichesRoutes vazio significa "ainda sem superfície
 * fechada" (PROPOSED/R_AND_D) — nunca "enriquece qualquer rota". Diferente
 * de roleAuthorized: um papel em aberto ainda pode aparecer informativamente
 * em "Em evolução"; uma rota em aberto não aparece em rota nenhuma.
 */
function routeMatches(dynamic: CanonicalLearningDynamic, route: string): boolean {
  return dynamic.enrichesRoutes.includes(route);
}

function isJourneyVisible(dynamic: CanonicalLearningDynamic): boolean {
  return !NON_JOURNEY_EXPOSURES.includes(dynamic.publicExposure);
}

function isAvailableStatus(dynamic: CanonicalLearningDynamic): boolean {
  return AVAILABLE_RUNTIME_STATUSES.includes(dynamic.runtimeStatus);
}

/** Busca por id — undefined se não existir (nunca lança, nunca inventa). */
export function getDynamicById(
  catalog: readonly CanonicalLearningDynamic[],
  id: string,
): CanonicalLearningDynamic | undefined {
  return catalog.find((d) => d.id === id);
}

/** Dinâmicas que enriquecem uma rota, preservando a ordem do catálogo. */
export function getDynamicsForRoute(
  catalog: readonly CanonicalLearningDynamic[],
  route: string,
): CanonicalLearningDynamic[] {
  return catalog.filter((d) => routeMatches(d, route));
}

/** Dinâmicas autorizadas para um papel, preservando a ordem do catálogo. */
export function getDynamicsForRole(
  catalog: readonly CanonicalLearningDynamic[],
  role: string,
): CanonicalLearningDynamic[] {
  return catalog.filter((d) => roleAuthorized(d, role));
}

/**
 * Dinâmicas que podem aparecer nesta rota para este papel — já filtra
 * PROPOSED/R_AND_D (nunca aparecem na jornada comum, doutrina §8). Inclui
 * REAL/PARCIAL/DEMO (com CTA) e PLANNED (sem CTA, seção "Em evolução").
 */
export function getVisibleDynamics(
  catalog: readonly CanonicalLearningDynamic[],
  context: DynamicResolutionContext,
): CanonicalLearningDynamic[] {
  return catalog.filter(
    (d) => routeMatches(d, context.route) && roleAuthorized(d, context.role) && isJourneyVisible(d),
  );
}

/** Subconjunto de getVisibleDynamics com runtime REAL/PARCIAL/DEMO — únicas com CTA ativo. */
export function getAvailableDynamics(
  catalog: readonly CanonicalLearningDynamic[],
  context: DynamicResolutionContext,
): CanonicalLearningDynamic[] {
  return getVisibleDynamics(catalog, context).filter(isAvailableStatus);
}

/** Subconjunto de getVisibleDynamics em status de roadmap — só para a seção recolhida, sem CTA. */
export function getRoadmapDynamics(
  catalog: readonly CanonicalLearningDynamic[],
  context: DynamicResolutionContext,
): CanonicalLearningDynamic[] {
  return getVisibleDynamics(catalog, context).filter((d) => ROADMAP_RUNTIME_STATUSES.includes(d.runtimeStatus));
}

export interface RegistryIntegrityResult {
  valid: boolean;
  errors: string[];
}

/**
 * Invariantes de negócio verificáveis em runtime (espelha os testes de
 * src/domain/learning/learning-dynamics-registry.test.ts, mas como função
 * pura chamável por qualquer composição — ex.: um boot check futuro).
 */
export function assertDynamicRegistryIntegrity(
  catalog: readonly CanonicalLearningDynamic[],
): RegistryIntegrityResult {
  const errors: string[] = [];
  const ids = new Set<string>();
  const slugs = new Set<string>();

  for (const d of catalog) {
    if (ids.has(d.id)) errors.push(`${d.id}: id duplicado`);
    ids.add(d.id);
    if (slugs.has(d.slug)) errors.push(`${d.id}: slug duplicado (${d.slug})`);
    slugs.add(d.slug);

    if (d.aiMode === "GENERATIVE_GATED") {
      errors.push(`${d.id}: GENERATIVE_GATED não autorizado nesta onda`);
    }
    if (ROADMAP_RUNTIME_STATUSES.includes(d.runtimeStatus) && !["PREPARATION", "HIDDEN", "R_AND_D"].includes(d.publicExposure)) {
      errors.push(`${d.id}: runtimeStatus de roadmap (${d.runtimeStatus}) com exposição operacional (${d.publicExposure})`);
    }
    if (
      ["REAL", "PARCIAL", "DEMO"].includes(d.runtimeStatus) &&
      NON_JOURNEY_EXPOSURES.includes(d.publicExposure)
    ) {
      errors.push(`${d.id}: runtime ${d.runtimeStatus} escondido da jornada (${d.publicExposure})`);
    }
  }

  return { valid: errors.length === 0, errors };
}
