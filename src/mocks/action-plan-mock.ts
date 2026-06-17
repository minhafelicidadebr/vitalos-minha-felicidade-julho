// Action-plan mock — config de domínio. Compõe priority-engine + season-engine
// para montar o QuarterlyPlan demo. Fonte única: usa os mesmos levers do
// forecast-mock e os mesmos mapeamentos do priority-mock (embaixadorias + lentes).

import { rankPriorities } from "@/engine/priority/priority-engine";
import { buildQuarterlyPlan, type ActionPlanLeverMeta } from "@/engine/action-plan/action-plan-engine";
import { FORECAST_LEVERS, pillarsFromIvo } from "./forecast-mock";
import { ambassadorshipForPillar, lensForPillar, esgUnlockedBy } from "./priority-mock";
import { computeSeasonOverview, clampProgramWeek } from "@/engine/season/season-engine";
import { ANNUAL_PLAN, CURRENT_PROGRAM_WEEK } from "./season-mock";
import { ivoCurrentCycle } from "./ivo-mock";
import { calculateIVO } from "@/engine/index/ivo-engine";
import ivoFramework from "@/domain/packs/enterprise/ivo-framework.json";
import type { ProprietaryIndex } from "@/engine/pack/pack-types";

// ─── Fila de prioridades (reusa o priority-engine) ───────────────────────────

const ivoResult = calculateIVO(ivoCurrentCycle, ivoFramework as unknown as ProprietaryIndex);
const pillars = pillarsFromIvo(ivoResult);

const PRIORITY_RESULT = rankPriorities(pillars, FORECAST_LEVERS, {
  scenario: "medio",
  quickWinCount: 3,
});

// ─── Mapeamento lever → embaixadoria + lente + esg ───────────────────────────
// Cada alavanca endereça um ou mais pilares; usamos o PRIMEIRO pilar visível
// para derivar a embaixadoria e lente representativas.

export const LEVER_META: ActionPlanLeverMeta[] = FORECAST_LEVERS.map((lever) => {
  // Primeiro pilar visível que esta alavanca endereça
  const firstPillarId = lever.targetPillarIds[0] ?? null;
  const ambRef = firstPillarId ? ambassadorshipForPillar(firstPillarId) : null;
  const lensRef = firstPillarId ? lensForPillar(firstPillarId) : null;
  const esgInfo = esgUnlockedBy(lever.targetPillarIds);

  return {
    leverId: lever.id,
    ambRef: ambRef ? { id: ambRef.id, name: ambRef.name, emoji: ambRef.emoji } : { id: null, name: null, emoji: null },
    lensId: lensRef?.id ?? null,
    lensLabel: lensRef?.label ?? null,
    lensColor: lensRef?.color ?? null,
    esgCodes: esgInfo.codes.slice(0, 3), // top 3 por clareza
  };
});

// ─── Temporada atual (fonte única: season-engine) ─────────────────────────────

const week = clampProgramWeek(ANNUAL_PLAN, CURRENT_PROGRAM_WEEK);
const overview = computeSeasonOverview(ANNUAL_PLAN, week);
const cs = overview.currentSeason;

const SEASON_NOW = {
  name: cs.name,
  color: cs.color,
  totalWeeks: ANNUAL_PLAN.weeksPerSeason,
  currentWeek: overview.position.weekInSeason,
  phaseLabel: overview.currentPhase.label,
};

// ─── Plano trimestral ─────────────────────────────────────────────────────────

export const QUARTERLY_PLAN = buildQuarterlyPlan({
  season: SEASON_NOW,
  items: PRIORITY_RESULT.items,
  leverMeta: LEVER_META,
  maxActions: 8,
});

// ─── Copy de UI ───────────────────────────────────────────────────────────────

export const ACTION_PLAN_INTRO = {
  eyebrow: "Plano Operacional Trimestral",
  title: "Quem faz o quê — e em qual semana",
  lead:
    "A fila de prioridades vira cronograma. Cada intervenção recebe uma Embaixadoria responsável, " +
    "janela de execução na temporada corrente e um milestone de acompanhamento. " +
    "O plano respeita o esforço de cada protocolo e escalonamento de responsabilidades.",
};

export const WEEK_LABEL = (w: number) => `Semana ${w}`;
