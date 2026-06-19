import { describe, expect, test } from "bun:test";
import {
  aggregateValidatedResponses,
  publishKAnonymousAggregation,
  type AggregationSubmission,
} from "./response-aggregation-engine";

const items = [
  { itemId: "a1", pillarId: "a" },
  { itemId: "a2", pillarId: "a" },
  { itemId: "b1", pillarId: "b", reverse: true },
] as const;
const scale = { min: 1, max: 5 };

function submission(id: string, a1: number, a2: number, b1: number): AggregationSubmission {
  return {
    submissionId: id,
    answers: [
      { itemId: "a1", value: a1 },
      { itemId: "a2", value: a2 },
      { itemId: "b1", value: b1 },
    ],
  };
}

describe("response aggregation engine", () => {
  test("averages inside participant/pillar before cohort aggregation", () => {
    const result = aggregateValidatedResponses(
      [submission("u1", 1, 5, 1), submission("u2", 5, 5, 5)],
      items,
      scale,
    );

    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.privatePillars).toEqual([
      { pillarId: "a", mean: 4, n: 2 },
      { pillarId: "b", mean: 3, n: 2 },
    ]);
  });

  test("applies reverse scoring from the injected scale", () => {
    const result = aggregateValidatedResponses([submission("u1", 3, 3, 1)], items, scale);

    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.privatePillars.find((pillar) => pillar.pillarId === "b")?.mean).toBe(5);
  });

  test("rejects duplicate submissions, duplicate/unknown items and invalid values", () => {
    expect(
      aggregateValidatedResponses(
        [submission("u1", 3, 3, 3), submission("u1", 3, 3, 3)],
        items,
        scale,
      ).reason,
    ).toBe("duplicate_submission");
    expect(
      aggregateValidatedResponses(
        [
          {
            submissionId: "u1",
            answers: [
              { itemId: "a1", value: 3 },
              { itemId: "a1", value: 3 },
            ],
          },
        ],
        items,
        scale,
      ).reason,
    ).toBe("duplicate_item");
    expect(
      aggregateValidatedResponses(
        [
          {
            submissionId: "u1",
            answers: [
              { itemId: "a1", value: 3 },
              { itemId: "a2", value: 3 },
              { itemId: "x", value: 3 },
            ],
          },
        ],
        items,
        scale,
      ).reason,
    ).toBe("unknown_item");
    expect(aggregateValidatedResponses([submission("u1", 0, 3, 3)], items, scale).reason).toBe(
      "invalid_value",
    );
  });

  test("public contract removes means below k instead of merely flagging them", () => {
    const result = aggregateValidatedResponses(
      [
        submission("u1", 3, 3, 3),
        submission("u2", 3, 3, 3),
        submission("u3", 3, 3, 3),
        submission("u4", 3, 3, 3),
      ],
      items,
      scale,
    );
    const published = publishKAnonymousAggregation("small-team", result, 5);

    expect(published.publishable).toBe(false);
    expect(published.pillars.every((pillar) => pillar.mean === null)).toBe(true);
    expect(JSON.stringify(published)).not.toContain('"mean":3');
  });

  test("n exactly equal to k is publishable", () => {
    const result = aggregateValidatedResponses(
      Array.from({ length: 5 }, (_, index) => submission(`u${index}`, 4, 4, 2)),
      items,
      scale,
    );
    const published = publishKAnonymousAggregation("team", result, 5);

    expect(published.publishable).toBe(true);
    expect(published.pillars.every((pillar) => pillar.visible)).toBe(true);
    expect(published.pillars.every((pillar) => pillar.mean !== null)).toBe(true);
  });
});
