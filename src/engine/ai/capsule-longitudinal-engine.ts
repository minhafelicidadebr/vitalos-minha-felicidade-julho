// Capsule Longitudinal Engine — engine PURO. O MOAT de dados do VitalOS.
//
// Compõe múltiplos MeasurementContextCapsules SELADOS (de ondas encerradas ao
// longo do tempo) numa leitura cross-ciclo auditável: a prova do antes/depois que
// o CFO e o auditor querem ver. "As intervenções funcionaram?" — aqui se mede.
//
// COMPOSIÇÃO (Fable 5 §5.1 — compor, não acumular):
//   wave-lifecycle-engine.sealWave → capsule selado (1 por ciclo)   [composto]
//   ESTE engine                    → leitura longitudinal cross-ciclo
//   (distinto de reavaliacao-engine, que é NR-1/crosswalk/driver-específico;
//    este é domínio-AGNÓSTICO — serve PERMA, FIB-T e COPSOQ pela mesma porta)
//
// HONESTIDADE (Fable 5 §6 + §8):
//   - Comparação só entre pontos VISÍVEIS (k-anon ≥ k garantido no selamento). Uma
//     dimensão suprimida em algum extremo NÃO é comparável — fica fora, contada à
//     parte. Nunca se "preenche" um buraco de privacidade.
//   - Desfechos (burnout, comportamentos ofensivos) são trajetados SEPARADOS dos
//     drivers — medidos, nunca "alvo de intervenção". Separação sagrada Domínio B.
//   - Toda variação é ASSOCIAÇÃO orientativa, jamais causalidade (sem grupo de
//     controle, queda de exposição após uma ação é correlação, não prova causal).
//   - Carga normalizada: alto = pior em TODA dimensão (recursos já invertidos a
//     montante). Logo delta < 0 = melhora, uniformemente.
//
// Engine puro: sem React, sem I/O, sem domain/. Determinístico.

import type { MeasurementContextCapsule } from "./measurement-capsule-engine";
import type { RiskLevel } from "../nr1/pgr-engine";

// ─── Entrada ───────────────────────────────────────────────────────────────────

export interface LongitudinalInput {
  /** Capsules selados do MESMO pack + instrumento + domínio (≥ 2). Ordenados ou não. */
  capsules: MeasurementContextCapsule[];
  /** Variação mínima (pts de carga) para não ser "estável". Default 5. */
  minMeaningfulDelta?: number;
}

const DEFAULT_MEANINGFUL = 5;

// ─── Saída ─────────────────────────────────────────────────────────────────────

export type TrajectoryDirection = "melhorando" | "estavel" | "piorando";

/** Um ponto visível na trajetória de uma dimensão. */
export interface TrajectoryPoint {
  cycleId: string;
  label: string;
  loadScore: number;
  riskLevel: RiskLevel | null;
}

/** A evolução de UMA dimensão ao longo dos ciclos comparáveis. */
export interface DimensionTrajectory {
  dimensionId: string;
  label: string;
  isOutcome: boolean;
  /** Pontos VISÍVEIS (k-anon) em ordem cronológica. */
  points: TrajectoryPoint[];
  firstLoad: number;
  lastLoad: number;
  /** lastLoad − firstLoad. Negativo = carga caiu = melhora (alto = pior). */
  delta: number;
  /** −delta. Positivo = melhora (redução de carga/exposição). */
  improvement: number;
  direction: TrajectoryDirection;
  /** Mudança de nível de risco (só Domínio B). Null para Domínio A. */
  riskShift: { from: RiskLevel | null; to: RiskLevel | null; improved: boolean } | null;
}

export interface LongitudinalReading {
  packId: string;
  instrumentShort: string;
  domain: "A" | "B";
  cycleCount: number;
  cycleLabels: string[];
  /** Drivers (não-desfecho) comparáveis, ordenados por maior melhora primeiro. */
  exposures: DimensionTrajectory[];
  /** Desfechos, trajetados à parte — nunca "alvo". */
  outcomes: DimensionTrajectory[];
  meanFirst: number;
  meanLast: number;
  /** meanLast − meanFirst. Negativo = melhora agregada. */
  meanDelta: number;
  overallDirection: TrajectoryDirection;
  improvedCount: number;
  worsenedCount: number;
  /** Dimensões visíveis nos dois extremos (comparáveis). */
  comparableDimensions: number;
  /** Dimensões excluídas por suprimidas (k-anon) em algum extremo. */
  suppressedDimensions: number;
  disclaimer: string;
}

// ─── Validação ─────────────────────────────────────────────────────────────────

export type LongitudinalViolation =
  | "too_few_cycles"
  | "mixed_pack"
  | "mixed_instrument"
  | "mixed_domain";

export type LongitudinalResult =
  | { ok: true; reading: LongitudinalReading }
  | { ok: false; violations: LongitudinalViolation[] };

const DISCLAIMER =
  "Leitura longitudinal: associação orientativa entre ciclos, NÃO prova de causalidade. " +
  "Sem grupo de controle, a variação de exposição reflete o contexto inteiro, não só as ações. " +
  "Agregados protegidos (k-anonimato); dimensões suprimidas ficam fora da comparação.";

/** Valida coerência do conjunto de capsules antes de construir a leitura. */
export function validateLongitudinalInput(capsules: MeasurementContextCapsule[]): {
  valid: boolean;
  violations: LongitudinalViolation[];
} {
  const violations: LongitudinalViolation[] = [];
  if (capsules.length < 2) violations.push("too_few_cycles");
  if (capsules.length > 0) {
    const first = capsules[0]!;
    if (capsules.some((c) => c.packId !== first.packId)) violations.push("mixed_pack");
    if (capsules.some((c) => c.instrumentShort !== first.instrumentShort))
      violations.push("mixed_instrument");
    if (capsules.some((c) => c.domain !== first.domain)) violations.push("mixed_domain");
  }
  return { valid: violations.length === 0, violations };
}

// ─── Construção ────────────────────────────────────────────────────────────────

/**
 * Constrói a leitura longitudinal a partir de capsules selados do mesmo
 * instrumento. Rejeita conjuntos incoerentes (pack/instrumento/domínio misto, < 2).
 */
export function buildLongitudinalReading(input: LongitudinalInput): LongitudinalResult {
  const validation = validateLongitudinalInput(input.capsules);
  if (!validation.valid) return { ok: false, violations: validation.violations };

  const meaningful = input.minMeaningfulDelta ?? DEFAULT_MEANINGFUL;

  // Ordena cronologicamente por closedOn (estável, determinístico).
  const capsules = [...input.capsules].sort((a, b) => a.closedOn.localeCompare(b.closedOn));
  const first = capsules[0]!;

  // Reúne todas as dimensões que aparecem em qualquer ciclo.
  const allDimIds = new Set<string>();
  for (const c of capsules) for (const d of c.dimensions) allDimIds.add(d.dimensionId);

  const exposures: DimensionTrajectory[] = [];
  const outcomes: DimensionTrajectory[] = [];
  let suppressed = 0;

  for (const dimId of allDimIds) {
    const points: TrajectoryPoint[] = [];
    let label = dimId;
    let isOutcome = false;

    for (const c of capsules) {
      const dim = c.dimensions.find((d) => d.dimensionId === dimId);
      if (!dim) continue;
      label = dim.label;
      isOutcome = dim.isOutcome;
      // Só pontos VISÍVEIS entram na trajetória — honestidade de k-anon.
      if (dim.visible) {
        points.push({
          cycleId: c.waveId,
          label: cycleLabelOf(c),
          loadScore: dim.loadScore,
          riskLevel: dim.riskLevel,
        });
      }
    }

    // Comparável = visível em ao menos 2 ciclos (extremos legítimos).
    if (points.length < 2) {
      suppressed++;
      continue;
    }

    const firstPt = points[0]!;
    const lastPt = points[points.length - 1]!;
    const delta = lastPt.loadScore - firstPt.loadScore;
    const direction = directionOf(delta, meaningful);

    const trajectory: DimensionTrajectory = {
      dimensionId: dimId,
      label,
      isOutcome,
      points,
      firstLoad: firstPt.loadScore,
      lastLoad: lastPt.loadScore,
      delta,
      improvement: -delta,
      direction,
      riskShift:
        first.domain === "B"
          ? {
              from: firstPt.riskLevel,
              to: lastPt.riskLevel,
              improved: riskRank(lastPt.riskLevel) < riskRank(firstPt.riskLevel),
            }
          : null,
    };

    if (isOutcome) outcomes.push(trajectory);
    else exposures.push(trajectory);
  }

  // Drivers ordenados por maior melhora primeiro (maiores ganhos no topo).
  exposures.sort((a, b) => b.improvement - a.improvement);
  outcomes.sort((a, b) => b.improvement - a.improvement);

  const meanFirst = mean(exposures.map((e) => e.firstLoad));
  const meanLast = mean(exposures.map((e) => e.lastLoad));
  const meanDelta = round1(meanLast - meanFirst);

  return {
    ok: true,
    reading: {
      packId: first.packId,
      instrumentShort: first.instrumentShort,
      domain: first.domain,
      cycleCount: capsules.length,
      cycleLabels: capsules.map(cycleLabelOf),
      exposures,
      outcomes,
      meanFirst,
      meanLast,
      meanDelta,
      overallDirection: directionOf(meanDelta, meaningful),
      improvedCount: exposures.filter((e) => e.direction === "melhorando").length,
      worsenedCount: exposures.filter((e) => e.direction === "piorando").length,
      comparableDimensions: exposures.length + outcomes.length,
      suppressedDimensions: suppressed,
      disclaimer: DISCLAIMER,
    },
  };
}

// ─── Grounding para a FlorescerIA ─────────────────────────────────────────────

export interface LongitudinalGrounding {
  headline: string;
  /** Frases citáveis (maior melhora e maior piora), ancoradas em números. */
  claims: { dimensionId: string; text: string; evidence: string }[];
  disclaimer: string;
}

/** Resume a leitura longitudinal para o copiloto formular resposta aterrada. */
export function groundLongitudinalReading(reading: LongitudinalReading): LongitudinalGrounding {
  const span = `${reading.cycleCount} ciclos (${reading.cycleLabels.join(" → ")})`;
  const trendWord =
    reading.overallDirection === "melhorando"
      ? "queda agregada de exposição"
      : reading.overallDirection === "piorando"
        ? "aumento agregado de exposição"
        : "estabilidade agregada";

  const headline =
    reading.comparableDimensions === 0
      ? `Sem dimensões comparáveis entre os ${reading.cycleCount} ciclos (k-anonimato).`
      : `${reading.instrumentShort}: ${trendWord} em ${span} — ${reading.improvedCount} dimensões melhoraram, ${reading.worsenedCount} pioraram.`;

  const claims: LongitudinalGrounding["claims"] = [];
  const bestImprovement = reading.exposures[0];
  if (bestImprovement && bestImprovement.improvement > 0) {
    claims.push({
      dimensionId: bestImprovement.dimensionId,
      text: `Maior melhora: ${bestImprovement.label} (carga ${bestImprovement.firstLoad}→${bestImprovement.lastLoad}).`,
      evidence: `−${bestImprovement.improvement} pts em ${bestImprovement.points.length} ciclos`,
    });
  }
  const worstRegression = reading.exposures[reading.exposures.length - 1];
  if (worstRegression && worstRegression.improvement < 0) {
    claims.push({
      dimensionId: worstRegression.dimensionId,
      text: `Maior piora: ${worstRegression.label} (carga ${worstRegression.firstLoad}→${worstRegression.lastLoad}).`,
      evidence: `+${Math.abs(worstRegression.improvement)} pts em ${worstRegression.points.length} ciclos`,
    });
  }

  return { headline, claims, disclaimer: reading.disclaimer };
}

// ─── Utilitários internos ─────────────────────────────────────────────────────

function cycleLabelOf(c: MeasurementContextCapsule): string {
  // Rótulo legível a partir do fechamento: "AAAA-MM".
  return c.closedOn.slice(0, 7);
}

function directionOf(delta: number, meaningful: number): TrajectoryDirection {
  if (Math.abs(delta) < meaningful) return "estavel";
  return delta < 0 ? "melhorando" : "piorando"; // carga caiu = melhora
}

/** Ordena severidade NR-1 para detectar melhora de nível (menor = melhor). */
function riskRank(level: RiskLevel | null): number {
  switch (level) {
    case "baixo":
      return 0;
    case "moderado":
      return 1;
    case "alto":
      return 2;
    case "critico":
      return 3;
    default:
      return -1; // null: indefinido — nunca conta como melhora nem piora
  }
}

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return round1(xs.reduce((a, b) => a + b, 0) / xs.length);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
