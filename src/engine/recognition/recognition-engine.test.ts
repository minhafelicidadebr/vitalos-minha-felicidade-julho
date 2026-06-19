import { describe, expect, test } from "bun:test";
import {
  buildRecognitionAggregates,
  recognitionBudgetRemaining,
  recognitionWeekKey,
  recordRecognition,
  type RecognitionEvent,
  type RecognitionPolicy,
} from "./recognition-engine";

const POLICY: RecognitionPolicy = {
  weeklyBudget: 2,
  duplicateCooldownDays: 7,
  allowedVisibilities: ["private", "public"],
  publicRequiresConsent: true,
  messageMaxChars: 240,
  kAnonymityMin: 5,
};

function request(over: Partial<Parameters<typeof recordRecognition>[1]> = {}) {
  return {
    id: "r1",
    senderId: "me",
    recipientId: "you",
    pillarId: "trust",
    visibility: "private" as const,
    publicationConsent: false,
    occurredOn: "2026-06-18",
    ...over,
  };
}

describe("recognition engine", () => {
  test("records only minimum metadata and never message content", () => {
    const result = recordRecognition([], request(), POLICY);

    expect(result.reason).toBe("recorded");
    expect(result.event).toEqual({
      id: "r1",
      senderId: "me",
      recipientId: "you",
      pillarId: "trust",
      visibility: "private",
      occurredOn: "2026-06-18",
    });
    expect(Object.keys(result.event ?? {})).not.toContain("message");
  });

  test("blocks self-recognition", () => {
    expect(recordRecognition([], request({ recipientId: "me" }), POLICY).reason).toBe(
      "self_recognition",
    );
  });

  test("public recognition requires explicit publication consent", () => {
    expect(recordRecognition([], request({ visibility: "public" }), POLICY).reason).toBe(
      "public_consent_required",
    );
    expect(
      recordRecognition([], request({ visibility: "public", publicationConsent: true }), POLICY)
        .reason,
    ).toBe("recorded");
  });

  test("blocks same recipient and pillar inside cooldown", () => {
    const first = recordRecognition([], request(), POLICY);
    const duplicate = recordRecognition(
      first.events,
      request({ id: "r2", occurredOn: "2026-06-23" }),
      POLICY,
    );

    expect(duplicate.reason).toBe("duplicate");
  });

  test("allows a new recognition after cooldown", () => {
    const first = recordRecognition([], request(), POLICY);
    const next = recordRecognition(
      first.events,
      request({ id: "r2", occurredOn: "2026-06-25" }),
      POLICY,
    );

    expect(next.reason).toBe("recorded");
  });

  test("weekly budget is enforced per sender", () => {
    const events: RecognitionEvent[] = [
      {
        id: "a",
        senderId: "me",
        recipientId: "a",
        pillarId: "p1",
        visibility: "private",
        occurredOn: "2026-06-16",
      },
      {
        id: "b",
        senderId: "me",
        recipientId: "b",
        pillarId: "p2",
        visibility: "private",
        occurredOn: "2026-06-17",
      },
    ];

    expect(recognitionBudgetRemaining(events, "me", "2026-06-18", POLICY)).toBe(0);
    expect(recordRecognition(events, request(), POLICY).reason).toBe("budget_exhausted");
  });

  test("week key rolls over on Monday", () => {
    expect(recognitionWeekKey("2026-06-21")).toBe("2026-06-15");
    expect(recognitionWeekKey("2026-06-22")).toBe("2026-06-22");
  });

  test("collective aggregates require k-anonymity", () => {
    const result = buildRecognitionAggregates(
      [
        { pillarId: "a", pillarLabel: "A", recognitionCount: 12, uniqueContributors: 5 },
        { pillarId: "b", pillarLabel: "B", recognitionCount: 3, uniqueContributors: 4 },
      ],
      POLICY,
    );

    expect(result[0]!.visible).toBe(true);
    expect(result[1]!.visible).toBe(false);
  });
});
