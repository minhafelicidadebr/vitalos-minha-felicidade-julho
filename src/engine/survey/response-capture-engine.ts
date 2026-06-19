import { isAllowedSurveyValue, type SurveyDefinition, type SurveyValue } from "./survey-engine";

export interface BlindAnswer {
  itemId: string;
  value: SurveyValue;
}

export interface BlindSurveySubmission {
  submissionId: string;
  waveId: string;
  surveyId: string;
  answers: readonly BlindAnswer[];
}

export type CaptureValidationReason =
  | "valid"
  | "invalid_submission"
  | "duplicate_item"
  | "item_set_mismatch"
  | "invalid_value";

export type CaptureValidation =
  | {
      valid: true;
      reason: "valid";
      itemCount: number;
      normalizedAnswers: BlindAnswer[];
    }
  | {
      valid: false;
      reason: Exclude<CaptureValidationReason, "valid">;
      itemCount: 0;
      normalizedAnswers: [];
    };

export type CapturePersistence = "ephemeral_demo" | "cloud_persisted";

export interface CaptureReceipt {
  receiptId: string;
  submissionId: string;
  waveId: string;
  surveyId: string;
  instrumentShort: string;
  itemCount: number;
  acceptedAt: string;
  persistence: CapturePersistence;
  persisted: boolean;
  contentReturned: false;
}

export type CaptureResult =
  | { accepted: true; receipt: CaptureReceipt }
  | {
      accepted: false;
      reason:
        | Exclude<CaptureValidationReason, "valid">
        | "unknown_wave"
        | "unknown_survey"
        | "cloud_adapter_missing";
    };

/**
 * Validates the complete answer set. The normalized answers are server-internal
 * material and must never be included in a client response or receipt.
 */
export function validateBlindSubmission(
  submission: BlindSurveySubmission,
  survey: SurveyDefinition,
): CaptureValidation {
  const invalid = (reason: Exclude<CaptureValidationReason, "valid">): CaptureValidation => ({
    valid: false,
    reason,
    itemCount: 0,
    normalizedAnswers: [],
  });

  if (
    !submission.submissionId.trim() ||
    !submission.waveId.trim() ||
    submission.surveyId !== survey.id ||
    submission.answers.length === 0
  ) {
    return invalid("invalid_submission");
  }

  const answerByItem = new Map<string, SurveyValue>();
  for (const answer of submission.answers) {
    if (answerByItem.has(answer.itemId)) return invalid("duplicate_item");
    answerByItem.set(answer.itemId, answer.value);
  }

  const expectedIds = survey.items.map((item) => item.id);
  const expectedSet = new Set(expectedIds);
  if (
    answerByItem.size !== expectedIds.length ||
    [...answerByItem.keys()].some((itemId) => !expectedSet.has(itemId))
  ) {
    return invalid("item_set_mismatch");
  }

  const normalizedAnswers: BlindAnswer[] = [];
  for (const itemId of expectedIds) {
    const value = answerByItem.get(itemId);
    if (value === undefined || !isAllowedSurveyValue(survey.scale, value)) {
      return invalid("invalid_value");
    }
    normalizedAnswers.push({ itemId, value });
  }

  return {
    valid: true,
    reason: "valid",
    itemCount: normalizedAnswers.length,
    normalizedAnswers,
  };
}

export function issueCaptureReceipt(
  submission: BlindSurveySubmission,
  survey: SurveyDefinition,
  itemCount: number,
  acceptedAt: string,
  persistence: CapturePersistence,
): CaptureReceipt {
  return {
    receiptId: `capture:${submission.submissionId}`,
    submissionId: submission.submissionId,
    waveId: submission.waveId,
    surveyId: survey.id,
    instrumentShort: survey.instrumentShort,
    itemCount,
    acceptedAt,
    persistence,
    persisted: persistence === "cloud_persisted",
    contentReturned: false,
  };
}
