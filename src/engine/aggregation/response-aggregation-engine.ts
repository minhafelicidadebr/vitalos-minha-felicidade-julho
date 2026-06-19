export interface AggregationItemDefinition {
  itemId: string;
  pillarId: string;
  reverse?: boolean;
}

export interface AggregationScale {
  min: number;
  max: number;
}

export interface AggregationAnswer {
  itemId: string;
  value: number;
}

export interface AggregationSubmission {
  submissionId: string;
  answers: readonly AggregationAnswer[];
}

export interface PrivatePillarAggregate {
  pillarId: string;
  mean: number;
  n: number;
}

export interface PublicPillarAggregate {
  pillarId: string;
  n: number;
  visible: boolean;
  mean: number | null;
}

export interface PublicAggregation {
  cohortId: string;
  participantCount: number;
  kAnonymityMin: number;
  publishable: boolean;
  pillars: PublicPillarAggregate[];
}

export type AggregationValidationReason =
  | "valid"
  | "invalid_scale"
  | "duplicate_submission"
  | "duplicate_item"
  | "unknown_item"
  | "invalid_value"
  | "incomplete_submission";

export type AggregationResult =
  | {
      valid: true;
      reason: "valid";
      participantCount: number;
      privatePillars: PrivatePillarAggregate[];
    }
  | {
      valid: false;
      reason: Exclude<AggregationValidationReason, "valid">;
      participantCount: 0;
      privatePillars: [];
    };

function roundedMean(values: readonly number[]): number {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.round(mean * 100) / 100;
}

/**
 * Computes one score per participant/pillar before aggregating the cohort.
 * This prevents pillars with more questionnaire items from overweighting a
 * participant in the group mean.
 */
export function aggregateValidatedResponses(
  submissions: readonly AggregationSubmission[],
  items: readonly AggregationItemDefinition[],
  scale: AggregationScale,
): AggregationResult {
  const invalid = (reason: Exclude<AggregationValidationReason, "valid">): AggregationResult => ({
    valid: false,
    reason,
    participantCount: 0,
    privatePillars: [],
  });

  if (!Number.isFinite(scale.min) || !Number.isFinite(scale.max) || scale.min >= scale.max) {
    return invalid("invalid_scale");
  }

  const submissionIds = new Set<string>();
  const itemById = new Map(items.map((item) => [item.itemId, item]));
  const expectedIds = new Set(itemById.keys());
  const participantPillarScores = new Map<string, number[]>();

  for (const submission of submissions) {
    if (!submission.submissionId.trim() || submissionIds.has(submission.submissionId)) {
      return invalid("duplicate_submission");
    }
    submissionIds.add(submission.submissionId);

    const answers = new Map<string, number>();
    for (const answer of submission.answers) {
      if (answers.has(answer.itemId)) return invalid("duplicate_item");
      const definition = itemById.get(answer.itemId);
      if (!definition) return invalid("unknown_item");
      if (!Number.isFinite(answer.value) || answer.value < scale.min || answer.value > scale.max) {
        return invalid("invalid_value");
      }
      answers.set(
        answer.itemId,
        definition.reverse ? scale.min + scale.max - answer.value : answer.value,
      );
    }

    if (
      answers.size !== expectedIds.size ||
      [...expectedIds].some((itemId) => !answers.has(itemId))
    ) {
      return invalid("incomplete_submission");
    }

    const valuesByPillar = new Map<string, number[]>();
    for (const [itemId, value] of answers) {
      const pillarId = itemById.get(itemId)!.pillarId;
      const values = valuesByPillar.get(pillarId) ?? [];
      values.push(value);
      valuesByPillar.set(pillarId, values);
    }

    for (const [pillarId, values] of valuesByPillar) {
      const participantScores = participantPillarScores.get(pillarId) ?? [];
      participantScores.push(roundedMean(values));
      participantPillarScores.set(pillarId, participantScores);
    }
  }

  return {
    valid: true,
    reason: "valid",
    participantCount: submissions.length,
    privatePillars: [...participantPillarScores.entries()]
      .map(([pillarId, values]) => ({
        pillarId,
        mean: roundedMean(values),
        n: values.length,
      }))
      .sort((a, b) => a.pillarId.localeCompare(b.pillarId)),
  };
}

/** Removes protected means entirely from the public contract. */
export function publishKAnonymousAggregation(
  cohortId: string,
  result: AggregationResult,
  kAnonymityMin: number,
): PublicAggregation {
  const safeK = Math.max(5, Math.floor(kAnonymityMin));
  if (!result.valid) {
    return {
      cohortId,
      participantCount: 0,
      kAnonymityMin: safeK,
      publishable: false,
      pillars: [],
    };
  }

  return {
    cohortId,
    participantCount: result.participantCount,
    kAnonymityMin: safeK,
    publishable: result.participantCount >= safeK,
    pillars: result.privatePillars.map((pillar) => ({
      pillarId: pillar.pillarId,
      n: pillar.n,
      visible: pillar.n >= safeK,
      mean: pillar.n >= safeK ? pillar.mean : null,
    })),
  };
}
