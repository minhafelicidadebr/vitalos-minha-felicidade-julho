import type { ProprietaryIndex } from "../pack/pack-types";

export const K_ANONYMITY_MIN = 5;
const NEUTRAL_MEAN = 3.0;

export interface PillarAggregate {
  pillarId: string;
  mean: number;
  n: number;
}

export interface IVOInput {
  organizationId: string;
  cycleId: string;
  aggregates: PillarAggregate[];
}

export interface PillarResult {
  pillarId: string;
  lensId: string;
  pillarName: string;
  weight: number;
  mean: number;
  normalized: number;
  contribution: number;
  score: number;
  n: number;
  visible: boolean;
  sampleItems: string[];
}

export interface LensResult {
  lensId: string;
  lensName: string;
  color: string;
  score: number;
  pillars: PillarResult[];
}

export interface MaturityLevel {
  name: string;
  min: number;
  max: number;
  badge: string;
}

export interface IVOResult {
  organizationId: string;
  cycleId: string;
  ivoScore: number;
  maturityLevel: MaturityLevel;
  lenses: LensResult[];
  totalRespondents: number;
  disclaimer: string;
  calculatedAt: string;
}

// Internal types mirroring ivo-framework.json shape — no domain/ imports
interface IVOPillarDef {
  id: string;
  name: string;
  weight: number;
  sampleItems?: string[];
}

interface IVOLensDef {
  id: string;
  name: string;
  color: string;
  pillars: IVOPillarDef[];
}

interface IVOMaturityDef {
  min: number;
  max: number;
  name: string;
  badge: string;
}

interface IVOFrameworkShape {
  lenses: IVOLensDef[];
  maturityLevels: IVOMaturityDef[];
  mandatoryDisclaimer: string;
  privacy?: { kAnonymityMin?: number };
}

function asFramework(idx: ProprietaryIndex): IVOFrameworkShape {
  return idx as unknown as IVOFrameworkShape;
}

export function calculateIVO(
  input: IVOInput,
  packIndex: ProprietaryIndex,
): IVOResult {
  const fw = asFramework(packIndex);
  const kMin = fw.privacy?.kAnonymityMin ?? K_ANONYMITY_MIN;
  const aggMap = new Map(input.aggregates.map((a) => [a.pillarId, a]));

  let totalContrib = 0;
  let maxN = 0;
  const lenses: LensResult[] = [];

  for (const lensDef of fw.lenses) {
    const lensWeight = lensDef.pillars.reduce((s, p) => s + p.weight, 0);
    let lensNormWeighted = 0;
    const pillars: PillarResult[] = [];

    for (const pillarDef of lensDef.pillars) {
      const agg = aggMap.get(pillarDef.id);
      const n = agg?.n ?? 0;
      const visible = n >= kMin;
      const rawMean = agg?.mean ?? NEUTRAL_MEAN;
      const effectiveMean = visible ? rawMean : NEUTRAL_MEAN;
      const normalized = (effectiveMean - 1) / 4;
      const contribution = pillarDef.weight * normalized;
      const relWeight = lensWeight > 0 ? pillarDef.weight / lensWeight : 0;

      totalContrib += contribution;
      if (visible && n > maxN) maxN = n;
      lensNormWeighted += relWeight * normalized;

      pillars.push({
        pillarId: pillarDef.id,
        lensId: lensDef.id,
        pillarName: pillarDef.name,
        weight: pillarDef.weight,
        mean: rawMean,
        normalized,
        contribution,
        score: Math.round(normalized * 1000),
        n,
        visible,
        sampleItems: pillarDef.sampleItems?.slice(0, 2) ?? [],
      });
    }

    lenses.push({
      lensId: lensDef.id,
      lensName: lensDef.name,
      color: lensDef.color,
      score: Math.round(lensNormWeighted * 1000),
      pillars,
    });
  }

  const ivoScore = Math.round(totalContrib * 1000);
  const maturityLevel =
    fw.maturityLevels.find((l) => ivoScore >= l.min && ivoScore <= l.max) ??
    fw.maturityLevels[fw.maturityLevels.length - 1]!;

  return {
    organizationId: input.organizationId,
    cycleId: input.cycleId,
    ivoScore,
    maturityLevel,
    lenses,
    totalRespondents: maxN,
    disclaimer: fw.mandatoryDisclaimer,
    calculatedAt: new Date().toISOString(),
  };
}
