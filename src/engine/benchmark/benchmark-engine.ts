// Benchmark engine — puro. Posiciona a organização contra um coorte setorial
// ANÔNIMO (agregado entre clientes), sem nunca expor uma organização individual.
// Invariante-chave (o "moat" honesto): k-anonimato ENTRE TENANTS — um coorte com
// menos de N organizações fica oculto, pois revelaria o concorrente. Trabalha só
// com estatísticas de distribuição (quartis), nunca com dados de uma empresa.
// Nunca importa de domain/.

export const MIN_COHORT_ORGS = 5;

export type Position = "lider" | "acima" | "mediana" | "abaixo";

// ─── Entradas ─────────────────────────────────────────────────────────────────

export interface CohortMetricStats {
  metricId: string; // "ivo" | lensId | pillarId
  p25: number;
  median: number;
  p75: number;
}

export interface CohortStats {
  cohortId: string;
  label: string; // ex.: "Tecnologia · 200–1000 colaboradores"
  nOrgs: number; // organizações no coorte — base do k-anon entre tenants
  metrics: CohortMetricStats[];
}

export interface OrgMetric {
  metricId: string;
  label: string;
  score: number;
  kind: "ivo" | "lens" | "pillar";
  weight?: number; // peso do pilar (para eleger a maior oportunidade)
}

// ─── Saídas ───────────────────────────────────────────────────────────────────

export interface BenchmarkRow {
  metricId: string;
  label: string;
  kind: "ivo" | "lens" | "pillar";
  score: number;
  p25: number;
  median: number;
  p75: number;
  position: Position;
  percentile: number; // 0–100 (aproximado, por interpolação dos quartis)
  gapToMedian: number; // score − mediana (negativo = abaixo)
  gapToTopQuartile: number; // score − p75
}

export interface BenchmarkResult {
  cohortId: string;
  cohortLabel: string;
  nOrgs: number;
  minOrgs: number;
  available: boolean; // nOrgs ≥ minOrgs
  rows: BenchmarkRow[];
  overall: BenchmarkRow | null; // a linha do IVO
  leads: BenchmarkRow[]; // onde a org está acima/líder
  lags: BenchmarkRow[]; // onde a org está abaixo
  topOpportunity: BenchmarkRow | null; // maior lacuna ponderada abaixo da mediana
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function positionFor(score: number, s: CohortMetricStats): Position {
  if (score >= s.p75) return "lider";
  if (score >= s.median) return "acima";
  if (score >= s.p25) return "mediana";
  return "abaixo";
}

/** Percentil aproximado por interpolação linear entre 0–p25–mediana–p75–1000. */
function percentileFor(score: number, s: CohortMetricStats): number {
  const safe = (a: number, b: number) => (b - a === 0 ? 0 : 1);
  if (score <= 0) return 0;
  if (score < s.p25) {
    return Math.round(clamp(s.p25 > 0 ? (score / s.p25) * 25 : 0, 0, 25));
  }
  if (score < s.median) {
    const frac = safe(s.p25, s.median) ? (score - s.p25) / (s.median - s.p25) : 0;
    return Math.round(25 + frac * 25);
  }
  if (score < s.p75) {
    const frac = safe(s.median, s.p75) ? (score - s.median) / (s.p75 - s.median) : 0;
    return Math.round(50 + frac * 25);
  }
  const frac = safe(s.p75, 1000) ? (score - s.p75) / (1000 - s.p75) : 0;
  return Math.round(clamp(75 + frac * 25, 75, 100));
}

export function buildBenchmark(
  orgMetrics: OrgMetric[],
  cohort: CohortStats,
  minOrgs: number = MIN_COHORT_ORGS,
): BenchmarkResult {
  const available = cohort.nOrgs >= minOrgs;

  const base: BenchmarkResult = {
    cohortId: cohort.cohortId,
    cohortLabel: cohort.label,
    nOrgs: cohort.nOrgs,
    minOrgs,
    available,
    rows: [],
    overall: null,
    leads: [],
    lags: [],
    topOpportunity: null,
  };

  if (!available) return base; // k-anon entre tenants: coorte insuficiente fica oculto

  const statById = new Map(cohort.metrics.map((m) => [m.metricId, m]));

  const rows: BenchmarkRow[] = [];
  for (const m of orgMetrics) {
    const s = statById.get(m.metricId);
    if (!s) continue; // só compara a interseção org × coorte
    rows.push({
      metricId: m.metricId,
      label: m.label,
      kind: m.kind,
      score: m.score,
      p25: s.p25,
      median: s.median,
      p75: s.p75,
      position: positionFor(m.score, s),
      percentile: percentileFor(m.score, s),
      gapToMedian: m.score - s.median,
      gapToTopQuartile: m.score - s.p75,
    });
  }

  const overall = rows.find((r) => r.metricId === "ivo") ?? null;

  const leads = rows
    .filter((r) => r.kind !== "ivo" && (r.position === "lider" || r.position === "acima"))
    .sort((a, b) => b.percentile - a.percentile);

  const lags = rows
    .filter((r) => r.kind !== "ivo" && r.position === "abaixo")
    .sort((a, b) => a.percentile - b.percentile);

  // Maior oportunidade: pilar abaixo da mediana com maior lacuna ponderada pelo peso.
  let topOpportunity: BenchmarkRow | null = null;
  let bestScore = 0;
  for (const r of rows) {
    if (r.kind !== "pillar" || r.gapToMedian >= 0) continue;
    const weight = orgMetrics.find((m) => m.metricId === r.metricId)?.weight ?? 1;
    const weighted = Math.abs(r.gapToMedian) * weight;
    if (weighted > bestScore) {
      bestScore = weighted;
      topOpportunity = r;
    }
  }

  return { ...base, rows, overall, leads, lags, topOpportunity };
}
