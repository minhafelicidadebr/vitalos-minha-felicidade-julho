import type { PublicAggregation } from "../aggregation/response-aggregation-engine";
import type { IVOInput } from "./ivo-engine";

export interface PublicIndexScale {
  min: number;
  max: number;
}

export type PublicIndexInputResult =
  | {
      valid: true;
      reason: "valid";
      input: IVOInput;
      visiblePillarCount: number;
      protectedPillarCount: number;
    }
  | {
      valid: false;
      reason:
        | "aggregation_not_publishable"
        | "invalid_scale"
        | "duplicate_pillar"
        | "invalid_public_contract";
      input: null;
      visiblePillarCount: 0;
      protectedPillarCount: 0;
    };

/**
 * Converts a public, k-anonymous aggregation into the only input shape accepted
 * by the server index pipeline. Hidden means must be materially absent.
 */
export function publicAggregationToIndexInput(
  organizationId: string,
  cycleId: string,
  aggregation: PublicAggregation,
  scale: PublicIndexScale,
): PublicIndexInputResult {
  const invalid = (
    reason: Exclude<PublicIndexInputResult["reason"], "valid">,
  ): PublicIndexInputResult => ({
    valid: false,
    reason,
    input: null,
    visiblePillarCount: 0,
    protectedPillarCount: 0,
  });

  if (!Number.isFinite(scale.min) || !Number.isFinite(scale.max) || scale.min >= scale.max) {
    return invalid("invalid_scale");
  }
  if (
    !aggregation.publishable ||
    aggregation.participantCount < aggregation.kAnonymityMin ||
    aggregation.kAnonymityMin < 5
  ) {
    return invalid("aggregation_not_publishable");
  }

  const pillarIds = new Set<string>();
  const aggregates: IVOInput["aggregates"] = [];
  let protectedPillarCount = 0;

  for (const pillar of aggregation.pillars) {
    if (pillarIds.has(pillar.pillarId)) return invalid("duplicate_pillar");
    pillarIds.add(pillar.pillarId);

    const countIsValid =
      Number.isInteger(pillar.n) && pillar.n >= 0 && pillar.n <= aggregation.participantCount;
    if (!countIsValid) return invalid("invalid_public_contract");

    if (!pillar.visible) {
      if (pillar.mean !== null || pillar.n >= aggregation.kAnonymityMin) {
        return invalid("invalid_public_contract");
      }
      protectedPillarCount += 1;
      continue;
    }

    if (
      pillar.n < aggregation.kAnonymityMin ||
      pillar.mean === null ||
      !Number.isFinite(pillar.mean) ||
      pillar.mean < scale.min ||
      pillar.mean > scale.max
    ) {
      return invalid("invalid_public_contract");
    }

    aggregates.push({ pillarId: pillar.pillarId, mean: pillar.mean, n: pillar.n });
  }

  return {
    valid: true,
    reason: "valid",
    input: { organizationId, cycleId, aggregates },
    visiblePillarCount: aggregates.length,
    protectedPillarCount,
  };
}
