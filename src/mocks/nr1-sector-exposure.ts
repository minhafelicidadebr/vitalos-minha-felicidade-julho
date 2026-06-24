// Seletor de dados NR-1 por setor (mock-first, versionado). O crosswalk (`NR1_CROSSWALK`) é
// CANÔNICO — a NR-1 é norma única, com os mesmos 12 drivers, dimensões COPSOQ II e células em
// qualquer setor. O que varia por setor é o DADO medido: o perfil de exposição psicossocial, a
// série longitudinal de reavaliação e o vocabulário de responsável das medidas do PGR.
//
// Espelha o padrão de `sector-data.ts`: Record<packId, …> + getX(packId) com fallback enterprise.
// Garante a honestidade do switch: ao ativar o pack Saúde, a /matriz prioriza a assinatura de
// exaustão (exigências emocionais + ritmo), não dados de empresa relabelados. Engines puros só
// recebem estas formas — nunca conhecem setor.

import type { DimensionExposure } from "@/engine/nr1/crosswalk-engine";
import type { CycleExposure } from "@/engine/nr1/reavaliacao-engine";
import type { PgrMeasureSeed } from "@/engine/nr1/pgr-engine";
import { DEMO_COPSOQ_EXPOSURE } from "./nr1-crosswalk-mock";
import { NR1_CYCLES, NR1_MEASURE_MAINTENANCE } from "./nr1-reavaliacao-mock";
import { PGR_MEASURES } from "./pgr-nr1-mock";

// ─── Perfis de exposição COPSOQ por setor (0..100; alto = pior) ─────────────────
// Assinaturas distintas e defensáveis: cada setor tem o seu padrão de risco psicossocial.
// `community` segue oculta (k-anon n<5) em todos — recortes pequenos não se expõem.

const EXPOSURE: Record<string, DimensionExposure[]> = {
  // Empresa: cultura de sobrecarga e baixo controle (= DEMO canônico).
  enterprise: DEMO_COPSOQ_EXPOSURE,

  // Escola: carga emocional e de ritmo do docente, ambiguidade de papel, reconhecimento/justiça.
  school: [
    { dimensionId: "demands_quant", load: 60, visible: true },
    { dimensionId: "work_pace", load: 64, visible: true },
    { dimensionId: "demands_emotional", load: 71, visible: true },
    { dimensionId: "influence", load: 55, visible: true },
    { dimensionId: "meaning", load: 24, visible: true },
    { dimensionId: "predictability", load: 48, visible: true },
    { dimensionId: "role_clarity", load: 57, visible: true },
    { dimensionId: "leadership_quality", load: 50, visible: true },
    { dimensionId: "social_support", load: 44, visible: true },
    { dimensionId: "recognition", load: 62, visible: true },
    { dimensionId: "community", load: 21, visible: false },
    { dimensionId: "insecurity", load: 45, visible: true },
  ],

  // Governo: insegurança em reestruturações, previsibilidade e justiça de critérios.
  government: [
    { dimensionId: "demands_quant", load: 54, visible: true },
    { dimensionId: "work_pace", load: 49, visible: true },
    { dimensionId: "demands_emotional", load: 50, visible: true },
    { dimensionId: "influence", load: 58, visible: true },
    { dimensionId: "meaning", load: 34, visible: true },
    { dimensionId: "predictability", load: 62, visible: true },
    { dimensionId: "role_clarity", load: 48, visible: true },
    { dimensionId: "leadership_quality", load: 52, visible: true },
    { dimensionId: "social_support", load: 41, visible: true },
    { dimensionId: "recognition", load: 60, visible: true },
    { dimensionId: "community", load: 22, visible: false },
    { dimensionId: "insecurity", load: 67, visible: true },
  ],

  // Condomínio: equipes pequenas, exigência emocional (conflitos), apoio frágil, liderança.
  condominium: [
    { dimensionId: "demands_quant", load: 50, visible: true },
    { dimensionId: "work_pace", load: 47, visible: true },
    { dimensionId: "demands_emotional", load: 63, visible: true },
    { dimensionId: "influence", load: 49, visible: true },
    { dimensionId: "meaning", load: 38, visible: true },
    { dimensionId: "predictability", load: 50, visible: true },
    { dimensionId: "role_clarity", load: 46, visible: true },
    { dimensionId: "leadership_quality", load: 56, visible: true },
    { dimensionId: "social_support", load: 60, visible: true },
    { dimensionId: "recognition", load: 54, visible: true },
    { dimensionId: "community", load: 19, visible: false },
    { dimensionId: "insecurity", load: 43, visible: true },
  ],

  // Saúde: a assinatura do burnout — exaustão emocional e ritmo no topo.
  health: [
    { dimensionId: "demands_quant", load: 70, visible: true },
    { dimensionId: "work_pace", load: 74, visible: true },
    { dimensionId: "demands_emotional", load: 79, visible: true },
    { dimensionId: "influence", load: 52, visible: true },
    { dimensionId: "meaning", load: 23, visible: true },
    { dimensionId: "predictability", load: 46, visible: true },
    { dimensionId: "role_clarity", load: 40, visible: true },
    { dimensionId: "leadership_quality", load: 50, visible: true },
    { dimensionId: "social_support", load: 48, visible: true },
    { dimensionId: "recognition", load: 55, visible: true },
    { dimensionId: "community", load: 20, visible: false },
    { dimensionId: "insecurity", load: 45, visible: true },
  ],
};

// Dimensões em que o programa de cada setor efetivamente agiu (caem ao longo dos ciclos).
// Honesto: só essas melhoram; o resto fica estável e `meaning` deriva levemente para pior
// (sentido não é alavanca de sobrecarga — §8).
const IMPROVING: Record<string, string[]> = {
  school: ["demands_emotional", "work_pace", "recognition"],
  government: ["insecurity", "predictability", "recognition"],
  condominium: ["demands_emotional", "social_support", "leadership_quality"],
  health: ["demands_emotional", "work_pace", "demands_quant"],
};

const CYCLE_LABELS = ["2025 · Q3", "2025 · Q4", "2026 · Q1"];

/** Gera 3 ciclos honestos a partir do baseline: dims acionadas caem ~9/ciclo; sentido deriva +1. */
function buildSectorCycles(packId: string, base: DimensionExposure[]): CycleExposure[] {
  const improving = new Set(IMPROVING[packId] ?? []);
  return CYCLE_LABELS.map((label, i) => ({
    cycleId: `${packId}-c${i}`,
    label,
    exposures: base.map((e) => {
      let load = e.load;
      if (improving.has(e.dimensionId)) load = e.load - i * 9;
      else if (e.dimensionId === "meaning") load = e.load + i; // deriva leve p/ pior
      return { ...e, load: Math.max(0, Math.min(100, load)) };
    }),
  }));
}

// ─── Vocabulário de responsável por setor ───────────────────────────────────────
// A AÇÃO organizacional é universal (eliminar sobrecarga vale em qualquer setor); muda QUEM
// responde por ela. Traduz os tokens genéricos do PGR_MEASURES para o contexto setorial.

const RESPONSIBLE: Record<string, Record<string, string>> = {
  enterprise: {},
  school: {
    "Alta Direção": "Direção Escolar",
    Liderança: "Coordenação Pedagógica",
    RH: "Secretaria / RH",
    Gestão: "Gestão Escolar",
    SESMT: "Saúde Ocupacional",
  },
  government: {
    "Alta Direção": "Alta Administração",
    Liderança: "Chefia Imediata",
    RH: "DGP / RH",
    Gestão: "Gestão do Órgão",
    CIPA: "CIPA / SST",
  },
  condominium: {
    "Alta Direção": "Síndico",
    Liderança: "Conselho / Subsíndico",
    RH: "Administradora",
    Gestão: "Gestão do Condomínio",
    CIPA: "Comissão de Convivência",
    SESMT: "SST terceirizado",
  },
  health: {
    "Alta Direção": "Direção Clínica",
    Liderança: "Coordenação de Equipe",
    RH: "Gestão de Pessoas",
    Gestão: "Gerência de Enfermagem",
    SESMT: "Saúde Ocupacional",
  },
};

// ─── Manutenção das medidas por setor (11.4.4) ──────────────────────────────────
// Enterprise reusa o mock canônico (carga em desuso). Demais: por ora, mantidas.
const MAINTENANCE: Record<string, Record<string, boolean>> = {
  enterprise: NR1_MEASURE_MAINTENANCE,
};

// ─── API ─────────────────────────────────────────────────────────────────────

/** Perfil de exposição COPSOQ do setor (fallback: enterprise). */
export function getSectorExposure(packId: string): DimensionExposure[] {
  return EXPOSURE[packId] ?? EXPOSURE.enterprise!;
}

/** Série longitudinal de ciclos do setor (enterprise = curva canônica autorada). */
export function getSectorCycles(packId: string): CycleExposure[] {
  if (packId === "enterprise" || !EXPOSURE[packId]) return NR1_CYCLES;
  return buildSectorCycles(packId, EXPOSURE[packId]!);
}

/** Medidas do PGR com responsável traduzido ao vocabulário do setor (ação é universal). */
export function getSectorPgrMeasures(packId: string): PgrMeasureSeed[] {
  const map = RESPONSIBLE[packId];
  if (!map || Object.keys(map).length === 0) return PGR_MEASURES;
  return PGR_MEASURES.map((m) => ({ ...m, responsible: map[m.responsible] ?? m.responsible }));
}

/** Manutenção das medidas de fonte no tempo (enterprise = mock canônico; demais = mantidas). */
export function getSectorMeasureMaintenance(packId: string): Record<string, boolean> {
  return MAINTENANCE[packId] ?? {};
}
