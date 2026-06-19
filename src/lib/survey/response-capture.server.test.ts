import { afterEach, describe, expect, test } from "bun:test";
import { getActiveWave } from "@/mocks/campaign-mock";
import { getWaveSurvey } from "@/mocks/survey-mock";
import { captureSurveySubmission } from "./response-capture.server";

const previousMode = process.env.VITALOS_IDENTITY_MODE;

afterEach(() => {
  if (previousMode === undefined) {
    delete process.env.VITALOS_IDENTITY_MODE;
  } else {
    process.env.VITALOS_IDENTITY_MODE = previousMode;
  }
});

function validInput(packId = "enterprise") {
  const wave = getActiveWave(packId);
  const survey = getWaveSurvey(packId, wave.instrumentShort)!;
  const firstValue = survey.scale.options[0]!.value;
  return {
    submissionId: "123e4567-e89b-12d3-a456-426614174000",
    packId,
    waveId: wave.id,
    surveyId: survey.id,
    answers: survey.items.map((item) => ({ itemId: item.id, value: firstValue })),
  };
}

describe("server response capture boundary", () => {
  test("demo validates on the server and returns a content-free ephemeral receipt", () => {
    delete process.env.VITALOS_IDENTITY_MODE;
    const result = captureSurveySubmission(validInput(), "2026-06-19T12:00:00.000Z");

    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(result.receipt.persistence).toBe("ephemeral_demo");
    expect(result.receipt.persisted).toBe(false);
    expect(result.receipt.contentReturned).toBe(false);
    expect(JSON.stringify(result)).not.toContain('"answers"');
  });

  test("wrong wave or survey fails without a receipt", () => {
    const wrongWave = captureSurveySubmission({
      ...validInput(),
      waveId: "other",
    });
    const wrongSurvey = captureSurveySubmission({
      ...validInput(),
      surveyId: "other",
    });

    expect(wrongWave.accepted).toBe(false);
    expect(wrongSurvey.accepted).toBe(false);
    if (wrongWave.accepted || wrongSurvey.accepted) return;
    expect(wrongWave.reason).toBe("unknown_wave");
    expect(wrongSurvey.reason).toBe("unknown_survey");
  });

  test("cloud request cannot silently fall back to ephemeral capture", () => {
    process.env.VITALOS_IDENTITY_MODE = "cloud";

    expect(captureSurveySubmission(validInput())).toEqual({
      accepted: false,
      reason: "cloud_adapter_missing",
    });
  });
});
