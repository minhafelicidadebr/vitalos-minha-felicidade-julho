// Learning Dynamics Registry — camada de domínio: só JSON congelado + loader
// tipado. Os tipos do contrato (CanonicalLearningDynamic e os 6 enums de
// governança) vivem em src/engine/learning/learning-dynamics-resolution.ts
// (mesmo padrão de EvidenceStudy/EvidenceRegistry em passport-engine.ts) —
// re-exportados aqui só por conveniência de import para quem consome o
// registro (rotas, componentes). Domínio pode importar engine; o inverso é
// proibido (engine-domain-boundary.test.ts).
//
// Distinto de src/engine/learning/learning-dynamics.ts (catálogo pedagógico
// D1..X3 do WWP, usado hoje em /academia): aquele descreve PEDAGOGIA por
// eixo M.E.T.E.; este descreve MATURIDADE/GOVERNANÇA (runtime, conteúdo,
// persistência, IA, exposição pública, risco) de capacidades do produto.
// Os dois catálogos coexistem deliberadamente — não fundir, não renomear.
//
// "Nenhuma interface pode apresentar uma dinâmica com status superior ao
// autorizado aqui" — docs/learning/REGISTRO_CANONICO_DINAMICAS_APRENDIZAGEM_V1.md.

import registryJson from "./learning-dynamics-registry.json";
import type { CanonicalLearningDynamic } from "@/engine/learning/learning-dynamics-resolution";

export type {
  RuntimeStatus,
  ContentStatus,
  PersistenceStatus,
  AiMode,
  PublicExposure,
  RiskTier,
  CanonicalLearningDynamic,
} from "@/engine/learning/learning-dynamics-resolution";
export { ROADMAP_RUNTIME_STATUSES, NON_JOURNEY_EXPOSURES } from "@/engine/learning/learning-dynamics-resolution";

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
