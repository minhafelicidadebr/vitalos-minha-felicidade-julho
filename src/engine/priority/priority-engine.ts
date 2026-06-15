// Priority engine — puro. Ranqueia INTERVENÇÕES (alavancas do Playbook) pela
// alavancagem esperada no IVO, compondo `expectedLeverLift` do forecast-engine.
// Não reimplementa matemática de impacto — reusa a já validada. Nunca importa
// de domain/. É a ponte entre "medir" (IVO) e "agir" (Playbook/Embaixadorias):
// responde "por onde começar, e com qual retorno por esforço".

import {
  expectedLeverLift,
  SCENARIO_FACTOR,
  type ForecastLever,
  type ForecastPillar,
  type ForecastScenario,
} from "../forecast/forecast-engine";

/** Esforço relativo de execução (para o índice de vitória rápida). */
export const EFFORT_WEIGHT: Record<ForecastLever["effort"], number> = {
  baixo: 1,
  medio: 2,
  alto: 3,
};

/** Alvo de "bom" para cálculo de lacuna (limiar de maturidade Referência). */
export const DEFAULT_TARGET = 800;

export interface PriorityPillar {
  pillarId: string;
  name: string;
  score: number;
  gap: number; // max(0, target − score)
  ivoContribution: number; // pts de IVO que a alavanca traz por este pilar
}

export interface PriorityItem {
  rank: number;
  leverId: string;
  label: string;
  description: string;
  expectedIvoLift: number; // pts de IVO (1 temporada, cenário)
  impactPerEffort: number; // expectedIvoLift / peso de esforço (1 casa)
  isQuickWin: boolean; // está entre os melhores por impacto/esforço
  effort: ForecastLever["effort"];
  evidenceLevel: ForecastLever["evidenceLevel"];
  addressedPillars: PriorityPillar[]; // visíveis, por contribuição decrescente
  hiddenTargetCount: number;
}

export interface PriorityResult {
  target: number;
  scenario: ForecastScenario;
  items: PriorityItem[]; // ranqueados por alavancagem (expectedIvoLift) desc
  quickWinIds: string[]; // melhores por impacto/esforço
}

export interface PriorityOptions {
  target?: number;
  scenario?: ForecastScenario;
  quickWinCount?: number;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function rankPriorities(
  pillars: ForecastPillar[],
  levers: ForecastLever[],
  opts: PriorityOptions = {},
): PriorityResult {
  const target = opts.target ?? DEFAULT_TARGET;
  const scenario = opts.scenario ?? "medio";
  const factor = SCENARIO_FACTOR[scenario];
  const quickWinCount = opts.quickWinCount ?? 3;

  const scoreById = new Map(pillars.map((p) => [p.pillarId, p.score] as const));

  // Avalia cada alavanca compondo o forecast.
  const evaluated = levers.map((lever) => {
    const lift = expectedLeverLift(pillars, lever, factor);
    const addressedPillars: PriorityPillar[] = lift.perPillar.map((p) => {
      const score = scoreById.get(p.pillarId) ?? p.score;
      return {
        pillarId: p.pillarId,
        name: p.name,
        score,
        gap: Math.max(0, target - score),
        ivoContribution: p.ivoContribution,
      };
    });
    const impactPerEffort = round1(lift.ivoLift / EFFORT_WEIGHT[lever.effort]);
    return { lever, lift, addressedPillars, impactPerEffort };
  });

  // Vitórias rápidas: melhores por impacto/esforço (apenas com impacto > 0).
  const quickWinIds = [...evaluated]
    .filter((e) => e.lift.ivoLift > 0)
    .sort((a, b) => b.impactPerEffort - a.impactPerEffort)
    .slice(0, quickWinCount)
    .map((e) => e.lever.id);
  const quickWinSet = new Set(quickWinIds);

  // Ranking principal: por alavancagem (desempate por impacto/esforço).
  const items: PriorityItem[] = [...evaluated]
    .sort((a, b) => b.lift.ivoLift - a.lift.ivoLift || b.impactPerEffort - a.impactPerEffort)
    .map((e, i) => ({
      rank: i + 1,
      leverId: e.lever.id,
      label: e.lever.label,
      description: e.lever.description,
      expectedIvoLift: e.lift.ivoLift,
      impactPerEffort: e.impactPerEffort,
      isQuickWin: quickWinSet.has(e.lever.id),
      effort: e.lever.effort,
      evidenceLevel: e.lever.evidenceLevel,
      addressedPillars: e.addressedPillars,
      hiddenTargetCount: e.lift.hiddenTargetCount,
    }));

  return { target, scenario, items, quickWinIds };
}
