/**
 * Cross-sector portfolio engine — a prova viva da opcionalidade multissetorial.
 *
 * Recebe N setores (cada um com seu framework + ciclos) e computa, com o MESMO
 * motor (calculateIVO/buildTrend), o portfólio inteiro: score, maturidade, lente
 * de foco, momentum por setor + estatísticas agregadas. Setor-agnóstico e puro:
 * cada framework chega como parâmetro (Engine ≠ Domínio). Adicionar um pack faz o
 * Atlas crescer sem tocar este arquivo.
 */

import { calculateIVO, type IVOInput } from "@/engine/index/ivo-engine";
import type { ProprietaryIndex } from "@/engine/pack/pack-types";
import { buildTrend, type Momentum, type TrendPoint } from "@/engine/trend/trend-engine";

export interface SectorPortfolioInput {
  packId: string;
  sectorLabel: string;
  indexLabel: string;
  orgName: string;
  participationRate: number;
  current: IVOInput;
  previous: IVOInput;
  trend: IVOInput[];
  framework: ProprietaryIndex;
}

export interface PortfolioLens {
  id: string;
  name: string;
  score: number;
}

export interface SectorPortfolioEntry {
  packId: string;
  sectorLabel: string;
  indexLabel: string;
  orgName: string;
  participationRate: number;
  score: number;
  delta: number;
  maturityName: string;
  /** Lente de menor score (onde focar). */
  focusLens: PortfolioLens | null;
  /** Lente de maior score (força do setor). */
  topLens: PortfolioLens | null;
  momentum: Momentum;
  slopePerCycle: number;
}

export interface SectorPortfolio {
  /** Setores ordenados por score (desc). */
  sectors: SectorPortfolioEntry[];
  count: number;
  averageScore: number;
  /** Amplitude entre o maior e o menor índice (dispersão do portfólio). */
  spread: number;
  best: SectorPortfolioEntry | null;
  needsAttention: SectorPortfolioEntry | null;
  /** Participação média ponderada simples entre setores. */
  averageParticipation: number;
}

const shortLensName = (name: string): string => name.split(" — ")[0] ?? name;

function lensFrom(
  result: ReturnType<typeof calculateIVO>,
  pick: "min" | "max",
): PortfolioLens | null {
  const lenses = result.lenses;
  if (lenses.length === 0) return null;
  const sorted = [...lenses].sort((a, b) =>
    pick === "min" ? a.score - b.score : b.score - a.score,
  );
  const l = sorted[0]!;
  return { id: l.lensId, name: shortLensName(l.lensName), score: l.score };
}

function buildEntry(input: SectorPortfolioInput): SectorPortfolioEntry {
  const current = calculateIVO(input.current, input.framework);
  const previous = calculateIVO(input.previous, input.framework);

  const points: TrendPoint[] = input.trend.map((cycle) => {
    const r = calculateIVO(cycle, input.framework);
    return {
      cycleId: r.cycleId,
      label: r.cycleId,
      ivo: r.ivoScore,
      lenses: r.lenses.map((l) => ({ id: l.lensId, name: l.lensName, score: l.score })),
    };
  });
  const trend = buildTrend(points);

  return {
    packId: input.packId,
    sectorLabel: input.sectorLabel,
    indexLabel: input.indexLabel,
    orgName: input.orgName,
    participationRate: input.participationRate,
    score: current.ivoScore,
    delta: current.ivoScore - previous.ivoScore,
    maturityName: current.maturityLevel.name,
    focusLens: lensFrom(current, "min"),
    topLens: lensFrom(current, "max"),
    momentum: trend.momentum,
    slopePerCycle: trend.slopePerCycle,
  };
}

/** Computa o portfólio multissetorial a partir dos setores fornecidos. */
export function buildSectorPortfolio(inputs: readonly SectorPortfolioInput[]): SectorPortfolio {
  const entries = inputs.map(buildEntry).sort((a, b) => b.score - a.score);

  if (entries.length === 0) {
    return {
      sectors: [],
      count: 0,
      averageScore: 0,
      spread: 0,
      best: null,
      needsAttention: null,
      averageParticipation: 0,
    };
  }

  const scores = entries.map((e) => e.score);
  const averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / entries.length);
  const averageParticipation = Math.round(
    entries.reduce((a, e) => a + e.participationRate, 0) / entries.length,
  );

  return {
    sectors: entries,
    count: entries.length,
    averageScore,
    spread: Math.max(...scores) - Math.min(...scores),
    best: entries[0]!,
    needsAttention: entries[entries.length - 1]!,
    averageParticipation,
  };
}
