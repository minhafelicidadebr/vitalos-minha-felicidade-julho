import {
  issueCaptureReceipt,
  validateBlindSubmission,
  type BlindSurveySubmission,
  type CaptureResult,
} from "@/engine/survey/response-capture-engine";
import { getActiveWave } from "@/mocks/campaign-mock";
import { getWaveSurvey } from "@/mocks/survey-mock";
import { readIdentityBoundaryStatus } from "../identity/identity-boundary.server";
import { saveWaveResponse } from "../cloud/db-adapter";

export interface ServerCaptureInput extends BlindSurveySubmission {
  packId: string;
  // Em modo cloud, inviteToken vem da URL (/responder/:token).
  inviteToken?: string;
}

/**
 * Server-only capture boundary.
 * Demo:  valida e descarta (ephemeral_demo — sem persistência, por design).
 * Cloud: valida, persiste via db-adapter (k-anon garantido pelo banco + RLS).
 */
export async function captureSurveySubmission(
  input: ServerCaptureInput,
  acceptedAt = new Date().toISOString(),
): Promise<CaptureResult> {
  const boundary = readIdentityBoundaryStatus();

  if (boundary.state === "cloud" && input.inviteToken) {
    // ── Modo real: persiste no Supabase ──────────────────────────────────────
    const answersMap: Record<string, number> = {};
    for (const a of input.answers) answersMap[a.itemId] = a.value;

    const result = await saveWaveResponse({
      waveId: input.waveId,
      inviteToken: input.inviteToken,
      answers: answersMap,
    });

    if (!result.accepted) {
      return { accepted: false, reason: "cloud_adapter_missing" };
    }

    // Usa survey COPSOQ para emitir o receipt (instrumento predominante no piloto)
    const survey = getWaveSurvey(input.packId, "COPSOQ");
    return {
      accepted: true,
      receipt: issueCaptureReceipt(
        input,
        survey ?? ({ id: input.surveyId, items: [], scale: { options: [] } } as never),
        input.answers.length,
        acceptedAt,
        "cloud_persisted",
      ),
    };
  }

  // ── Modo demo: valida e descarta (ephemeral_demo) ─────────────────────────
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

  return {
    accepted: true,
    receipt: issueCaptureReceipt(input, survey, validation.itemCount, acceptedAt, "ephemeral_demo"),
  };
}
