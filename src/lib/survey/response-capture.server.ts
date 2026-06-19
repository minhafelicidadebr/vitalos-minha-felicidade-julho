import {
  issueCaptureReceipt,
  validateBlindSubmission,
  type BlindSurveySubmission,
  type CaptureResult,
} from "@/engine/survey/response-capture-engine";
import { getActiveWave } from "@/mocks/campaign-mock";
import { getWaveSurvey } from "@/mocks/survey-mock";
import { readIdentityBoundaryStatus } from "../identity/identity-boundary.server";

export interface ServerCaptureInput extends BlindSurveySubmission {
  packId: string;
}

/**
 * Server-only capture boundary. In demo mode it validates then discards the
 * answers. In cloud mode it fails closed until a persistence adapter exists.
 */
export function captureSurveySubmission(
  input: ServerCaptureInput,
  acceptedAt = new Date().toISOString(),
): CaptureResult {
  const boundary = readIdentityBoundaryStatus();
  if (boundary.state === "blocked") {
    return { accepted: false, reason: "cloud_adapter_missing" };
  }

  const wave = getActiveWave(input.packId);
  if (wave.id !== input.waveId) {
    return { accepted: false, reason: "unknown_wave" };
  }

  const survey = getWaveSurvey(input.packId, wave.instrumentShort);
  if (!survey || survey.id !== input.surveyId) {
    return { accepted: false, reason: "unknown_survey" };
  }

  const validation = validateBlindSubmission(input, survey);
  if (!validation.valid) {
    return { accepted: false, reason: validation.reason };
  }

  // Demo: deliberately no write and no logging of normalizedAnswers.
  return {
    accepted: true,
    receipt: issueCaptureReceipt(input, survey, validation.itemCount, acceptedAt, "ephemeral_demo"),
  };
}
