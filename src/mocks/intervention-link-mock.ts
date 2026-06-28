// Ligação intervenção (Culture Lab) → dimensão COPSOQ medida. É a ponte que permite
// avaliar a EFICÁCIA de cada intervenção contra a trajetória longitudinal real.
//
// Cada link declara qual dimensão a intervenção MIROU. O intervention-evidence-engine
// então confronta a hipótese com a mudança medida (drift-adjusted, indicativa).
//
// Honestidade: os alvos casam com o histórico de capsules (capsule-history-mock) —
// demands_quant melhorou muito, work_pace piorou. O resultado da eficácia não é
// roteirizado: emerge do confronto entre o que se mirou e o que se mediu.

import type { InterventionLink } from "@/engine/lab/intervention-evidence-engine";

const ENTERPRISE_LINKS: InterventionLink[] = [
  {
    interventionId: "exp-redesenho-carga",
    label: "Redesenho de carga (Operações)",
    targetDimensionId: "demands_quant",
    participantCount: 403,
    expectedReductionBand: { low: 10, high: 20 },
  },
  {
    interventionId: "exp-pausas-protegidas",
    label: "Pausas protegidas",
    targetDimensionId: "work_pace",
    participantCount: 403,
    expectedReductionBand: { low: 5, high: 12 },
  },
  {
    interventionId: "exp-formacao-lideres",
    label: "Formação de líderes (escuta + clareza)",
    targetDimensionId: "leadership_quality",
    participantCount: 403,
    expectedReductionBand: { low: 4, high: 10 },
  },
  {
    interventionId: "exp-escuta-emocional",
    label: "Rede de escuta emocional",
    targetDimensionId: "demands_emotional",
    participantCount: 403,
    expectedReductionBand: { low: 6, high: 14 },
  },
];

const LINKS: Record<string, InterventionLink[]> = {
  enterprise: ENTERPRISE_LINKS,
};

/** Intervenções do Culture Lab ligadas a dimensões COPSOQ, por pack. */
export function getInterventionLinks(packId: string): InterventionLink[] {
  return LINKS[packId] ?? [];
}
