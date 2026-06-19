import { describe, expect, test } from "bun:test";
import {
  issueCaptureReceipt,
  validateBlindSubmission,
  type BlindSurveySubmission,
} from "./response-capture-engine";
import type { SurveyDefinition } from "./survey-engine";

const survey: SurveyDefinition = {
  id: "survey-1",
  instrumentShort: "TEST",
  items: [
    { id: "i1", pillarId: "p1", text: "A" },
    { id: "i2", pillarId: "p2", text: "B" },
  ],
  scale: {
    presentation: "buttons",
    options: [
      { value: 0, label: "Não" },
      { value: 1, label: "Sim" },
    ],
    minLabel: "Não",
    maxLabel: "Sim",
  },
  intro: {
    eyebrow: "Test",
    lead: "Test",
    disclaimer: "Test",
    thanksTitle: "Test",
    thanksBody: "Test",
  },
  completionRoute: "/devolutiva",
  completionLabel: "Test",
};

function submission(overrides: Partial<BlindSurveySubmission> = {}): BlindSurveySubmission {
  return {
    submissionId: "123e4567-e89b-12d3-a456-426614174000",
    waveId: "wave-1",
    surveyId: survey.id,
    answers: [
      { itemId: "i1", value: 0 },
      { itemId: "i2", value: 1 },
    ],
    ...overrides,
  };
}

describe("blind response capture", () => {
  test("accepts the exact complete item set and preserves canonical item order", () => {
    const result = validateBlindSubmission(
      submission({
        answers: [
          { itemId: "i2", value: 1 },
          { itemId: "i1", value: 0 },
        ],
      }),
      survey,
    );

    expect(result.valid).toBe(true);
    expect(result.normalizedAnswers).toEqual([
      { itemId: "i1", value: 0 },
      { itemId: "i2", value: 1 },
    ]);
  });

  test("rejects missing, extra and duplicate items", () => {
    expect(
      validateBlindSubmission(submission({ answers: [{ itemId: "i1", value: 0 }] }), survey).reason,
    ).toBe("item_set_mismatch");
    expect(
      validateBlindSubmission(
        submission({
          answers: [
            { itemId: "i1", value: 0 },
            { itemId: "i2", value: 1 },
            { itemId: "extra", value: 1 },
          ],
        }),
        survey,
      ).reason,
    ).toBe("item_set_mismatch");
    expect(
      validateBlindSubmission(
        submission({
          answers: [
            { itemId: "i1", value: 0 },
            { itemId: "i1", value: 1 },
          ],
        }),
        survey,
      ).reason,
    ).toBe("duplicate_item");
  });

  test("rejects values outside the injected scale", () => {
    expect(
      validateBlindSubmission(
        submission({
          answers: [
            { itemId: "i1", value: 0 },
            { itemId: "i2", value: 9 },
          ],
        }),
        survey,
      ).reason,
    ).toBe("invalid_value");
  });

  test("receipt contains operational metadata and never answer content", () => {
    const receipt = issueCaptureReceipt(
      submission(),
      survey,
      2,
      "2026-06-19T12:00:00.000Z",
      "ephemeral_demo",
    );
    const serialized = JSON.stringify(receipt);

    expect(receipt.persisted).toBe(false);
    expect(receipt.contentReturned).toBe(false);
    expect(serialized).not.toContain('"answers"');
    expect(serialized).not.toContain('"value"');
    expect(serialized).not.toContain('"itemId"');
  });
});
