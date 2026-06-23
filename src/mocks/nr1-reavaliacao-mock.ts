// Série longitudinal de exposição COPSOQ (mock de domínio, versionado) — fonte-da-verdade da rota
// /evolucao-nr1 (eixo Evoluir). Três ciclos trimestrais: baseline (Q3, = DEMO_COPSOQ_EXPOSURE),
// meio do programa (Q4) e reavaliação após o PGR (Q1).
//
// DOUTRINA (Fable 5 §8): a melhora é HONESTA, não uniforme. Os drivers com medidas de fonte
// implementadas (carga via Alta Direção/Liderança; autonomia; justiça) caem mais; dimensões sem
// ação direta ficam estáveis; e o sentido do trabalho (meaning) oscila levemente para cima
// (piora) — porque "workshop de propósito" jamais foi a resposta à sobrecarga (primeiro muda a
// organização do trabalho). k-anon: `community` permanece oculta (n<5) nos três ciclos.

import type { CycleExposure } from "@/engine/nr1/reavaliacao-engine";

export const NR1_CYCLES: CycleExposure[] = [
  {
    cycleId: "2025-Q3",
    label: "2025 · Q3",
    exposures: [
      { dimensionId: "demands_quant", load: 72, visible: true },
      { dimensionId: "work_pace", load: 68, visible: true },
      { dimensionId: "demands_emotional", load: 54, visible: true },
      { dimensionId: "influence", load: 61, visible: true },
      { dimensionId: "meaning", load: 28, visible: true },
      { dimensionId: "predictability", load: 44, visible: true },
      { dimensionId: "role_clarity", load: 33, visible: true },
      { dimensionId: "leadership_quality", load: 47, visible: true },
      { dimensionId: "social_support", load: 39, visible: true },
      { dimensionId: "recognition", load: 58, visible: true },
      { dimensionId: "community", load: 22, visible: false },
      { dimensionId: "insecurity", load: 51, visible: true },
    ],
  },
  {
    cycleId: "2025-Q4",
    label: "2025 · Q4",
    exposures: [
      { dimensionId: "demands_quant", load: 63, visible: true },
      { dimensionId: "work_pace", load: 60, visible: true },
      { dimensionId: "demands_emotional", load: 51, visible: true },
      { dimensionId: "influence", load: 54, visible: true },
      { dimensionId: "meaning", load: 30, visible: true },
      { dimensionId: "predictability", load: 41, visible: true },
      { dimensionId: "role_clarity", load: 31, visible: true },
      { dimensionId: "leadership_quality", load: 43, visible: true },
      { dimensionId: "social_support", load: 37, visible: true },
      { dimensionId: "recognition", load: 51, visible: true },
      { dimensionId: "community", load: 21, visible: false },
      { dimensionId: "insecurity", load: 49, visible: true },
    ],
  },
  {
    cycleId: "2026-Q1",
    label: "2026 · Q1",
    exposures: [
      { dimensionId: "demands_quant", load: 52, visible: true },
      { dimensionId: "work_pace", load: 49, visible: true },
      { dimensionId: "demands_emotional", load: 48, visible: true },
      { dimensionId: "influence", load: 45, visible: true },
      { dimensionId: "meaning", load: 32, visible: true },
      { dimensionId: "predictability", load: 38, visible: true },
      { dimensionId: "role_clarity", load: 30, visible: true },
      { dimensionId: "leadership_quality", load: 40, visible: true },
      { dimensionId: "social_support", load: 35, visible: true },
      { dimensionId: "recognition", load: 44, visible: true },
      { dimensionId: "community", load: 20, visible: false },
      { dimensionId: "insecurity", load: 47, visible: true },
    ],
  },
];

// ─── Cópia introdutória da rota (domínio, não engine) ──────────────────────────

export const REAVALIACAO_INTRO = {
  eyebrow: "Evoluir · Domínio B",
  title: "Reavaliação NR-1",
  subtitle:
    "A prova do antes/depois: como a exposição psicossocial medida evoluiu ao longo dos ciclos, depois das medidas do PGR. Sem grupo de controle, é associação orientativa — nunca prova de causalidade.",
} as const;
