// Ponto único de carga dos registros de evidência congelados — mesma
// disciplina de src/domain/learning/learning-dynamics-registry.ts: o domínio
// carrega o JSON e re-exporta os tipos do engine (domínio pode importar
// engine; o inverso é proibido e testado em engine-domain-boundary.test.ts).
//
// Antes deste módulo, /voz-segura (passaportes) e a FlorêncIA
// (FlorenciaSafeConversationEntryPoint) importavam e faziam cast dos mesmos
// JSONs em paralelo. Toda superfície que precisa do Evidence/Claim Registry
// consome DAQUI — um import, um cast, uma fonte. A decisão de confiança
// continua onde sempre esteve: trustGate/buildPassport/evaluatePolicyGate
// (engine); este módulo não decide nada.

import type { ClaimRegistry, EvidenceRegistry } from "@/engine/evidence/passport-engine";
import evidenceRegistryJson from "./evidence-registry.json";
import claimRegistryJson from "./claim-registry.json";

export const EVIDENCE_REGISTRY = evidenceRegistryJson as unknown as EvidenceRegistry;
export const CLAIM_REGISTRY = claimRegistryJson as unknown as ClaimRegistry;

export type { ClaimRegistry, EvidenceRegistry };
