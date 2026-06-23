// Reavaliação NR-1 — engine PURO. Fecha o eixo EVOLUIR do M.E.T.E.: dada a exposição psicossocial
// medida ao longo de VÁRIOS ciclos (COPSOQ agregado por dimensão, k-anon a montante), mostra como
// o risco de cada driver evoluiu — a prova do "antes/depois" depois do PGR (Transformar).
//
// COMPOSIÇÃO (não acumulação): reusa `rankDriversByExposure` (exposição→driver, por ciclo),
// `probabilityFromLoad` + `driverSeverity` + `classifyRisk` (mesma matriz de risco NR-01 do
// pgr-engine). NÃO redefine severidade nem reinventa drivers — lê o registro canônico.
//
// HONESTIDADE (Fable 5 §8): a "eficácia" associa medidas de FONTE implementadas a quedas de
// exposição — é correlação orientativa, NUNCA prova de causalidade (sem grupo de controle, é
// associação). A severidade é estrutural (do registro); só a probabilidade (exposição medida) varia
// no tempo. Desfechos nunca entram (garantido pelo registro). Dimensões não-visíveis (k-anon)
// já chegam excluídas via rankDriversByExposure.

import { type CrosswalkRegistry, type DimensionExposure } from "./crosswalk-engine";
import {
  classifyRisk,
  driverSeverity,
  probabilityFromLoad,
  type PgrPlan,
  type RiskLevel,
} from "./pgr-engine";

export type RiskTrend = "melhorando" | "estavel" | "piorando";

/** Um ciclo de medição: exposição COPSOQ agregada por dimensão. */
export interface CycleExposure {
  cycleId: string;
  /** Rótulo do ciclo, ex.: "2025-Q3". */
  label: string;
  exposures: DimensionExposure[];
}

export interface ReavaliacaoInput {
  registry: CrosswalkRegistry;
  /** Série temporal de ciclos, do mais antigo ao mais recente (≥ 1). */
  cycles: CycleExposure[];
  /** PGR do período — para a leitura honesta de eficácia (medidas de fonte implementadas). */
  pgrPlan?: PgrPlan;
}

export interface EvolutionPoint {
  cycleId: string;
  label: string;
  /** Exposição medida (0..100; alto = pior) da dimensão-fonte do driver naquele ciclo. */
  load: number;
  riskLevel: RiskLevel;
  riskScore: number;
}

export interface DriverEvolution {
  driverId: string;
  label: string;
  macroLayer: string;
  /** Dimensão COPSOQ "assinatura" do driver, seguida fixa ao longo dos ciclos. */
  dimensionId: string;
  dimensionLabel: string;
  points: EvolutionPoint[];
  firstLoad: number;
  lastLoad: number;
  /** lastLoad − firstLoad (negativo = exposição caiu = melhora, pois alto = pior). */
  delta: number;
  /** Redução de exposição (−delta; positivo = melhora). */
  reduction: number;
  firstRisk: RiskLevel;
  lastRisk: RiskLevel;
  trend: RiskTrend;
  /** True se o nível de risco caiu entre o primeiro e o último ciclo. */
  improved: boolean;
}

export interface CycleAggregate {
  cycleId: string;
  label: string;
  /** Exposição média das dimensões visíveis do ciclo (0..100). */
  meanLoad: number;
  visibleDims: number;
}

export interface ReavaliacaoEfficacy {
  /** Drivers que receberam ≥1 medida de FONTE implementada no PGR. */
  withSourceMeasure: number;
  /** Desses, quantos melhoraram de nível de risco. */
  ofWhichImproved: number;
  driverIds: string[];
}

export interface ReavaliacaoResult {
  cycles: CycleAggregate[];
  /** Drivers com exposição medida, ordenados por maior redução (maiores ganhos primeiro). */
  drivers: DriverEvolution[];
  meanFirst: number;
  meanLast: number;
  /** meanLast − meanFirst (negativo = melhora agregada). */
  meanDelta: number;
  overallTrend: RiskTrend;
  improvedCount: number;
  worsenedCount: number;
  efficacy: ReavaliacaoEfficacy | null;
  disclaimer: string;
}

const MEANINGFUL = 5; // pts de exposição para considerar variação relevante

function trendFromDelta(delta: number): RiskTrend {
  if (delta <= -MEANINGFUL) return "melhorando"; // exposição caiu
  if (delta >= MEANINGFUL) return "piorando"; // exposição subiu
  return "estavel";
}

const RISK_RANK: Record<RiskLevel, number> = { baixo: 0, moderado: 1, alto: 2, critico: 3 };

/** Mapa dimensão→load das dimensões COPSOQ visíveis e não-desfecho de um ciclo. */
function visibleLoadMap(
  registry: CrosswalkRegistry,
  exposures: DimensionExposure[],
): Map<string, number> {
  const outcomes = new Set(registry.dimensions.filter((d) => d.isOutcome).map((d) => d.id));
  const copsoq = new Set(
    registry.dimensions.filter((d) => d.instrument === "copsoq").map((d) => d.id),
  );
  return new Map(
    exposures
      .filter((e) => e.visible !== false && !outcomes.has(e.dimensionId) && copsoq.has(e.dimensionId))
      .map((e) => [e.dimensionId, e.load]),
  );
}

/**
 * Dimensão "assinatura" do driver: a célula COPSOQ de MAIOR força cuja dimensão está visível na
 * reavaliação mais recente. Fixa no tempo (segue a mesma dimensão em todos os ciclos), evitando o
 * artefato de comparar dimensões diferentes entre ciclos. Empate resolvido por id (determinístico).
 */
function signatureDimension(
  registry: CrosswalkRegistry,
  driverId: string,
  visibleNow: Map<string, number>,
): string | null {
  const copsoq = new Set(
    registry.dimensions.filter((d) => d.instrument === "copsoq").map((d) => d.id),
  );
  const candidates = registry.cells
    .filter((c) => c.driverId === driverId && copsoq.has(c.dimensionId) && visibleNow.has(c.dimensionId))
    .sort((a, b) => b.strength - a.strength || a.dimensionId.localeCompare(b.dimensionId));
  return candidates[0]?.dimensionId ?? null;
}

/** Exposição média das dimensões COPSOQ visíveis e não-desfecho de um ciclo. */
function meanVisibleLoad(
  registry: CrosswalkRegistry,
  exposures: DimensionExposure[],
): { mean: number; count: number } {
  const outcomes = new Set(registry.dimensions.filter((d) => d.isOutcome).map((d) => d.id));
  const copsoq = new Set(
    registry.dimensions.filter((d) => d.instrument === "copsoq").map((d) => d.id),
  );
  const visible = exposures.filter(
    (e) => e.visible !== false && !outcomes.has(e.dimensionId) && copsoq.has(e.dimensionId),
  );
  if (visible.length === 0) return { mean: 0, count: 0 };
  const sum = visible.reduce((s, e) => s + e.load, 0);
  return { mean: Math.round(sum / visible.length), count: visible.length };
}

export function buildReavaliacao(input: ReavaliacaoInput): ReavaliacaoResult {
  const { registry, cycles, pgrPlan } = input;

  const disclaimer =
    "Leitura longitudinal da exposição psicossocial medida (COPSOQ agregado, k-anonimato ≥ 5). A " +
    "associação entre medidas implementadas e queda de exposição é orientativa — sem grupo de " +
    "controle, é correlação, não prova de causalidade. A severidade é estrutural; só a exposição varia.";

  if (cycles.length === 0) {
    return {
      cycles: [],
      drivers: [],
      meanFirst: 0,
      meanLast: 0,
      meanDelta: 0,
      overallTrend: "estavel",
      improvedCount: 0,
      worsenedCount: 0,
      efficacy: null,
      disclaimer,
    };
  }

  // Agregado por ciclo (média de exposição visível).
  const cycleAggs: CycleAggregate[] = cycles.map((c) => {
    const { mean, count } = meanVisibleLoad(registry, c.exposures);
    return { cycleId: c.cycleId, label: c.label, meanLoad: mean, visibleDims: count };
  });

  // Mapa dimensão→load por ciclo (apenas dimensões COPSOQ visíveis, não-desfecho).
  const dimLabel = new Map(registry.dimensions.map((d) => [d.id, d.label]));
  const cycleLoadMaps = cycles.map((c) => visibleLoadMap(registry, c.exposures));
  // A assinatura é definida pela ÚLTIMA reavaliação (o que conseguimos enxergar agora).
  const latestVisible = cycleLoadMaps[cycleLoadMaps.length - 1]!;

  const drivers: DriverEvolution[] = [];
  for (const driver of registry.drivers) {
    const sig = signatureDimension(registry, driver.id, latestVisible);
    if (!sig) continue; // sem dimensão COPSOQ visível na reavaliação → fora do inventário

    const sevScore = driverSeverity(registry, driver.id).score;
    const points: EvolutionPoint[] = cycles.map((c, i) => {
      const load = cycleLoadMaps[i]!.get(sig) ?? 0;
      const { level, score } = classifyRisk(probabilityFromLoad(load).score, sevScore);
      return { cycleId: c.cycleId, label: c.label, load, riskLevel: level, riskScore: score };
    });

    const first = points[0]!;
    const last = points[points.length - 1]!;
    const delta = last.load - first.load;

    drivers.push({
      driverId: driver.id,
      label: driver.label,
      macroLayer: driver.macroLayer,
      dimensionId: sig,
      dimensionLabel: dimLabel.get(sig) ?? sig,
      points,
      firstLoad: first.load,
      lastLoad: last.load,
      delta,
      reduction: -delta,
      firstRisk: first.riskLevel,
      lastRisk: last.riskLevel,
      trend: trendFromDelta(delta),
      improved: RISK_RANK[last.riskLevel] < RISK_RANK[first.riskLevel],
    });
  }

  // Ordena por maior redução (melhoras primeiro), empate por id (determinístico).
  drivers.sort((a, b) => b.reduction - a.reduction || a.driverId.localeCompare(b.driverId));

  const meanFirst = cycleAggs[0]!.meanLoad;
  const meanLast = cycleAggs[cycleAggs.length - 1]!.meanLoad;
  const meanDelta = meanLast - meanFirst;

  // Eficácia honesta: drivers com medida de FONTE implementada no PGR que também melhoraram.
  let efficacy: ReavaliacaoEfficacy | null = null;
  if (pgrPlan) {
    const sourceTiers = new Set(["eliminacao", "organizacao"]);
    const improvedSet = new Set(drivers.filter((d) => d.improved).map((d) => d.driverId));
    const withSource = pgrPlan.risks
      .filter((r) =>
        r.measures.some((m) => sourceTiers.has(m.tier) && m.status === "implementada"),
      )
      .map((r) => r.driverId);
    efficacy = {
      withSourceMeasure: withSource.length,
      ofWhichImproved: withSource.filter((id) => improvedSet.has(id)).length,
      driverIds: withSource,
    };
  }

  return {
    cycles: cycleAggs,
    drivers,
    meanFirst,
    meanLast,
    meanDelta,
    overallTrend: trendFromDelta(meanDelta),
    improvedCount: drivers.filter((d) => d.improved).length,
    worsenedCount: drivers.filter((d) => d.trend === "piorando").length,
    efficacy,
    disclaimer,
  };
}
