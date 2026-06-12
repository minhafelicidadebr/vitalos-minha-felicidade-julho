// Pulse engine — selects items from the pack following rotationStrategy.
// Pure, sector-agnostic: receives packIndex, never imports from domain/.
import type { ProprietaryIndex } from "../pack/pack-types";

export interface PulseItem {
  pillarId: string;
  pillarName: string;
  lensId: string;
  lensColor: string;
  text: string;
}

export interface PulseConfig {
  durationSeconds: number;
  itemsPerPulse: number;
  optOut: boolean;
}

interface FrameworkShape {
  lenses: Array<{
    id: string;
    color: string;
    pillars: Array<{ id: string; name: string; sampleItems?: string[] }>;
  }>;
  pulse?: { durationSeconds?: number; itemsPerPulse?: number; optOut?: boolean };
  responseScale?: { labels?: string[] };
}

export function getPulseConfig(packIndex: ProprietaryIndex): PulseConfig {
  const fw = packIndex as unknown as FrameworkShape;
  return {
    durationSeconds: fw.pulse?.durationSeconds ?? 60,
    itemsPerPulse: fw.pulse?.itemsPerPulse ?? 3,
    optOut: fw.pulse?.optOut ?? true,
  };
}

export function getResponseLabels(packIndex: ProprietaryIndex): string[] {
  const fw = packIndex as unknown as FrameworkShape;
  return fw.responseScale?.labels ?? ["1", "2", "3", "4", "5"];
}

/**
 * rotationStrategy: "lowest-scoring-pillars-first"
 * Receives current pillar scores (pillarId → score 0–1000) and picks one
 * sample item from each of the N lowest-scoring pillars.
 */
export function selectPulseItems(
  packIndex: ProprietaryIndex,
  pillarScores: Map<string, number>,
  count: number,
): PulseItem[] {
  const fw = packIndex as unknown as FrameworkShape;

  const all: Array<PulseItem & { score: number }> = [];
  for (const lens of fw.lenses) {
    for (const pillar of lens.pillars) {
      const item = pillar.sampleItems?.[0];
      if (!item) continue;
      all.push({
        pillarId: pillar.id,
        pillarName: pillar.name,
        lensId: lens.id,
        lensColor: lens.color,
        text: item,
        score: pillarScores.get(pillar.id) ?? 500,
      });
    }
  }

  return all
    .sort((a, b) => a.score - b.score)
    .slice(0, count)
    .map(({ score: _score, ...item }) => item);
}
