// Learning Dynamics Registry — contrato de governança das 14 dinâmicas de
// aprendizagem (LD-001..LD-014), Onda LDX-1.
//
// Distinto de src/engine/learning/learning-dynamics.ts (catálogo pedagógico
// D1..X3 do WWP, usado hoje em /academia): aquele descreve PEDAGOGIA por
// eixo M.E.T.E.; este descreve MATURIDADE/GOVERNANÇA (runtime, conteúdo,
// persistência, IA, exposição pública, risco) de capacidades do produto.
// Os dois catálogos coexistem deliberadamente — não fundir, não renomear.
//
// "Nenhuma interface pode apresentar uma dinâmica com status superior ao
// autorizado aqui" — src/domain/learning/REGISTRO_CANONICO... (docs/learning/).
//
// Domínio: só tipos + dado + loader tipado. Zero lógica de resolução — isso
// vive em src/engine/learning/learning-dynamics-resolution.ts (invariante
// Engine ≠ Domínio: o engine recebe este catálogo por parâmetro, nunca
// importa o JSON diretamente).

import registryJson from "./learning-dynamics-registry.json";
import type { MeteAxis } from "@/engine/learning/learning-dynamics";

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

export interface LearningDynamicsRegistryFile {
  registry: string;
  version: string;
  frozen: boolean;
  sourceDocument?: string;
  dynamics: CanonicalLearningDynamic[];
}

const REGISTRY = registryJson as unknown as LearningDynamicsRegistryFile;

/** Catálogo tipado das 14 dinâmicas canônicas — fonte única para o engine de resolução. */
export function getLearningDynamicsRegistry(): CanonicalLearningDynamic[] {
  return REGISTRY.dynamics;
}
