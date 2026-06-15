// Forecast engine — projeção honesta e determinística da trajetória do IVO.
// Compõe-se com ivo/pnl/esg sem importá-los: recebe apenas pilares (0–1000) e
// alavancas de intervenção, e projeta temporada a temporada. Nunca importa de
// domain/. Princípio do comitê: projeção é ESTIMATIVA, nunca promessa — por isso
// modela retornos decrescentes, recuo natural e banda de confiança que alarga.

export type ForecastScenario = "conservador" | "medio" | "otimista";

/** Teto realista de maturidade: ganhos desaceleram ao se aproximar dele. */
export const CEILING = 900;
/** Recuo por temporada de pilares visíveis sem nenhuma alavanca (atenção é escassa). */
export const NATURAL_DRIFT = -4;

export const SCENARIO_FACTOR: Record<ForecastScenario, number> = {
  conservador: 0.5,
  medio: 1.0,
  otimista: 1.5,
};

// ─── Entradas ─────────────────────────────────────────────────────────────────

export interface ForecastPillar {
  pillarId: string;
  name: string;
  score: number; // 0–1000 (estado corrente)
  weight: number; // peso do pilar (somam ~1 no total)
  visible: boolean; // false = oculto por k-anonimato → não projetável
}

export interface ForecastLever {
  id: string;
  label: string;
  description: string;
  targetPillarIds: string[];
  pointsPerSeason: number; // ganho-base esperado/temporada nos pilares-alvo
  effort: "baixo" | "medio" | "alto";
  evidenceLevel: "meta-analise" | "rct" | "quasi-experimental" | "observacional";
}

export interface MaturityBand {
  min: number;
  max: number;
  name: string;
}

export interface ForecastInput {
  pillars: ForecastPillar[];
  levers: ForecastLever[];
  activeLeverIds: string[];
  seasons: number; // horizonte, ≥ 1
  scenario: ForecastScenario;
  maturityLevels?: MaturityBand[];
}

// ─── Saídas ───────────────────────────────────────────────────────────────────

export interface ForecastStep {
  season: number; // 1..horizonte
  ivo: number;
  ivoLow: number; // banda de confiança (piso)
  ivoHigh: number; // banda de confiança (teto)
  maturityName: string | null;
}

export interface PillarShift {
  pillarId: string;
  name: string;
  from: number;
  to: number;
  delta: number;
}

export interface ForecastResult {
  baselineIvo: number;
  baselineMaturity: string | null;
  steps: ForecastStep[];
  finalIvo: number;
  finalMaturity: string | null;
  ivoDelta: number; // finalIvo − baselineIvo
  scenario: ForecastScenario;
  activeLeverIds: string[];
  pillarShifts: PillarShift[]; // estado final por pilar (apenas visíveis), ordenado por delta
  projectedPillars: ForecastPillar[]; // pilares finais (todos), para alimentar ESG
  assumptions: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** IVO = soma(peso × score) sobre todos os pilares (score já em 0–1000). */
export function ivoFromPillars(pillars: ForecastPillar[]): number {
  return Math.round(pillars.reduce((s, p) => s + p.weight * p.score, 0));
}

export function maturityFor(score: number, bands?: MaturityBand[]): string | null {
  if (!bands || bands.length === 0) return null;
  const found = bands.find((b) => score >= b.min && score <= b.max);
  return (found ?? bands[bands.length - 1]!).name;
}

/** Ganho efetivo de uma alavanca sobre um pilar, com retornos decrescentes. */
function effectiveLift(base: number, factor: number, currentScore: number): number {
  const headroom = Math.max(0, 1 - currentScore / CEILING);
  return base * factor * headroom;
}

/** Aplica uma temporada de evolução aos pilares. */
function stepPillars(
  pillars: ForecastPillar[],
  activeLevers: ForecastLever[],
  factor: number,
): ForecastPillar[] {
  return pillars.map((p) => {
    if (!p.visible) return p; // oculto: não projetável, permanece neutro

    const lift = activeLevers
      .filter((l) => l.targetPillarIds.includes(p.pillarId))
      .reduce((sum, l) => sum + effectiveLift(l.pointsPerSeason, factor, p.score), 0);

    const next = lift > 0 ? p.score + lift : p.score + NATURAL_DRIFT;
    return { ...p, score: clamp(Math.round(next), 0, 1000) };
  });
}

/** Meia-largura da banda de confiança: alarga com o horizonte e com o salto. */
function bandHalfWidth(season: number, deltaFromBaseline: number): number {
  return Math.round(10 * Math.sqrt(season) + 0.15 * Math.abs(deltaFromBaseline));
}

// ─── Projeção ─────────────────────────────────────────────────────────────────

export function projectForecast(input: ForecastInput): ForecastResult {
  const factor = SCENARIO_FACTOR[input.scenario];
  const activeLevers = input.levers.filter((l) => input.activeLeverIds.includes(l.id));
  const horizon = Math.max(1, Math.floor(input.seasons));

  const baselineIvo = ivoFromPillars(input.pillars);

  let pillars = input.pillars;
  const steps: ForecastStep[] = [];

  for (let s = 1; s <= horizon; s++) {
    pillars = stepPillars(pillars, activeLevers, factor);
    const ivo = ivoFromPillars(pillars);
    const half = bandHalfWidth(s, ivo - baselineIvo);
    steps.push({
      season: s,
      ivo,
      ivoLow: clamp(ivo - half, 0, 1000),
      ivoHigh: clamp(ivo + half, 0, 1000),
      maturityName: maturityFor(ivo, input.maturityLevels),
    });
  }

  const finalIvo = steps[steps.length - 1]!.ivo;

  const pillarShifts: PillarShift[] = pillars
    .filter((p) => p.visible)
    .map((p) => {
      const from = input.pillars.find((o) => o.pillarId === p.pillarId)?.score ?? p.score;
      return { pillarId: p.pillarId, name: p.name, from, to: p.score, delta: p.score - from };
    })
    .sort((a, b) => b.delta - a.delta);

  return {
    baselineIvo,
    baselineMaturity: maturityFor(baselineIvo, input.maturityLevels),
    steps,
    finalIvo,
    finalMaturity: maturityFor(finalIvo, input.maturityLevels),
    ivoDelta: finalIvo - baselineIvo,
    scenario: input.scenario,
    activeLeverIds: input.activeLeverIds,
    pillarShifts,
    projectedPillars: pillars,
    assumptions: [
      "Cada alavanca aplica um ganho esperado por temporada, com retornos decrescentes à medida que o pilar amadurece.",
      `Pilares visíveis sem alavanca ativa recuam ~${Math.abs(NATURAL_DRIFT)} pts/temporada — atenção é um recurso escasso.`,
      "Pilares ocultos por k-anonimato (n<5) não entram na projeção.",
      "A faixa de confiança alarga com o horizonte: projeção é estimativa orientativa, não promessa de resultado.",
    ],
  };
}
