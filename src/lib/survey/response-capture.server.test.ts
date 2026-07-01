import { afterEach, describe, expect, mock, test } from "bun:test";
import type { IdentityBoundaryStatus } from "@/engine/identity/authorization-engine";
import { getActiveWave } from "@/mocks/campaign-mock";
import { getWaveSurvey } from "@/mocks/survey-mock";

// Mocks para simular modos de boundary sem depender das env vars do ambiente.
const mockBoundary = mock<() => IdentityBoundaryStatus>(() => ({
  requestedMode: "demo",
  state: "demo",
  realAuthentication: false,
  serverEnforced: false,
  reason: "demo_isolated",
}));

mock.module("@/lib/identity/identity-boundary.server", () => ({
  readIdentityBoundaryStatus: mockBoundary,
}));

// Import AFTER mock setup so the module uses the mock.
const { captureSurveySubmission } = await import("./response-capture.server");

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

afterEach(() => {
  mockBoundary.mockImplementation(() => ({
    requestedMode: "demo",
    state: "demo",
    realAuthentication: false,
    serverEnforced: false,
    reason: "demo_isolated",
  }));
});

describe("server response capture boundary", () => {
  test("demo validates on the server and returns a content-free ephemeral receipt", async () => {
    mockBoundary.mockImplementation(() => ({ requestedMode: "demo", state: "demo", realAuthentication: false, serverEnforced: false, reason: "demo_isolated" }));
    const result = await captureSurveySubmission(validInput(), "2026-06-19T12:00:00.000Z");

    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(result.receipt.persistence).toBe("ephemeral_demo");
    expect(result.receipt.persisted).toBe(false);
    expect(result.receipt.contentReturned).toBe(false);
    expect(JSON.stringify(result)).not.toContain('"answers"');
  });

  test("wrong wave or survey fails without a receipt", async () => {
    mockBoundary.mockImplementation(() => ({ requestedMode: "demo", state: "demo", realAuthentication: false, serverEnforced: false, reason: "demo_isolated" }));
    const wrongWave = await captureSurveySubmission({
      ...validInput(),
      waveId: "other",
    });
    const wrongSurvey = await captureSurveySubmission({
      ...validInput(),
      surveyId: "other",
    });

    expect(wrongWave.accepted).toBe(false);
    expect(wrongSurvey.accepted).toBe(false);
    if (wrongWave.accepted || wrongSurvey.accepted) return;
    expect(wrongWave.reason).toBe("unknown_wave");
    expect(wrongSurvey.reason).toBe("unknown_survey");
  });

  test("cloud request without inviteToken returns cloud_adapter_missing", async () => {
    mockBoundary.mockImplementation(() => ({ requestedMode: "cloud", state: "cloud", realAuthentication: true, serverEnforced: true, reason: "cloud_ready" }));

    const result = await captureSurveySubmission(validInput()); // sem inviteToken
    expect(result.accepted).toBe(false);
    if (!result.accepted) {
      expect(result.reason).toBe("cloud_adapter_missing");
    }
  });
});
