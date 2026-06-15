// Trend engine — puro. Analisa a CURVA LONGITUDINAL: como o IVO evoluiu ao longo
// de vários ciclos (o track record real, não a projeção por alavancas). Calcula
// inclinação, momentum, projeção honesta por tendência e quais lentes mais
// subiram ou caíram. Recebe os pontos já computados (a rota compõe calculateIVO
// sobre os ciclos). Nunca importa de domain/.

export type Momentum = "acelerando" | "subindo" | "estavel" | "caindo";

export interface TrendPoint {
  cycleId: string;
  label: string; // ex.: "2025-Q3"
  ivo: number;
  lenses: Array<{ id: string; name: string; score: number }>;
}

export interface LensTrend {
  id: string;
  name: string;
  first: number;
  last: number;
  delta: number; // last − first
}

export interface TrendResult {
  points: TrendPoint[];
  firstIvo: number | null;
  lastIvo: number | null;
  totalDelta: number; // last − first
  slopePerCycle: number; // média de variação por ciclo
  recentDelta: number; // variação do último passo
  momentum: Momentum;
  projectedNext: number | null; // extrapolação linear (tendência, não promessa)
  lensTrends: LensTrend[]; // por lente, ordenado por delta desc
  bestLens: LensTrend | null;
  worstLens: LensTrend | null;
}

const MEANINGFUL = 5; // pts/ciclo para considerar tendência relevante

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function momentumFor(slope: number, recent: number): Momentum {
  if (slope >= MEANINGFUL) return recent > slope ? "acelerando" : "subindo";
  if (slope <= -MEANINGFUL) return "caindo";
  return "estavel";
}

export function buildTrend(points: TrendPoint[]): TrendResult {
  const empty: TrendResult = {
    points,
    firstIvo: null,
    lastIvo: null,
    totalDelta: 0,
    slopePerCycle: 0,
    recentDelta: 0,
    momentum: "estavel",
    projectedNext: null,
    lensTrends: [],
    bestLens: null,
    worstLens: null,
  };
  if (points.length === 0) return empty;

  const first = points[0]!;
  const last = points[points.length - 1]!;
  const n = points.length;

  const totalDelta = last.ivo - first.ivo;
  const slopePerCycle = n > 1 ? Math.round(totalDelta / (n - 1)) : 0;
  const recentDelta = n > 1 ? last.ivo - points[n - 2]!.ivo : 0;
  const momentum = momentumFor(slopePerCycle, recentDelta);
  const projectedNext = n > 1 ? clamp(last.ivo + slopePerCycle, 0, 1000) : last.ivo;

  // Tendência por lente (primeiro vs. último ponto).
  const firstLensMap = new Map(first.lenses.map((l) => [l.id, l.score]));
  const lensTrends: LensTrend[] = last.lenses
    .map((l) => {
      const f = firstLensMap.get(l.id) ?? l.score;
      return { id: l.id, name: l.name, first: f, last: l.score, delta: l.score - f };
    })
    .sort((a, b) => b.delta - a.delta);

  return {
    points,
    firstIvo: first.ivo,
    lastIvo: last.ivo,
    totalDelta,
    slopePerCycle,
    recentDelta,
    momentum,
    projectedNext,
    lensTrends,
    bestLens: lensTrends.length ? lensTrends[0]! : null,
    worstLens: lensTrends.length ? lensTrends[lensTrends.length - 1]! : null,
  };
}
