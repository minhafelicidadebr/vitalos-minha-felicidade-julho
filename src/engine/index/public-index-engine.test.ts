import { describe, expect, test } from "bun:test";
import type { PublicAggregation } from "../aggregation/response-aggregation-engine";
import { publicAggregationToIndexInput } from "./public-index-engine";

const SCALE = { min: 1, max: 5 };

function aggregation(overrides: Partial<PublicAggregation> = {}): PublicAggregation {
  return {
    cohortId: "organization",
    participantCount: 8,
    kAnonymityMin: 5,
    publishable: true,
    pillars: [
      { pillarId: "energia", n: 8, visible: true, mean: 4.2 },
      { pillarId: "proposito", n: 3, visible: false, mean: null },
    ],
    ...overrides,
  };
}

describe("publicAggregationToIndexInput", () => {
  test("forwards only publishable pillar means", () => {
    const result = publicAggregationToIndexInput("org-1", "cycle-1", aggregation(), SCALE);

    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.input.aggregates).toEqual([{ pillarId: "energia", mean: 4.2, n: 8 }]);
    expect(result.visiblePillarCount).toBe(1);
    expect(result.protectedPillarCount).toBe(1);
  });

  test("rejects a protected pillar that still carries a mean", () => {
    const result = publicAggregationToIndexInput(
      "org-1",
      "cycle-1",
      aggregation({
        pillars: [{ pillarId: "energia", n: 3, visible: false, mean: 4.8 }],
      }),
      SCALE,
    );

    expect(result).toMatchObject({ valid: false, reason: "invalid_public_contract" });
  });

  test("rejects a cohort below k even when a caller marks it publishable", () => {
    const result = publicAggregationToIndexInput(
      "org-1",
      "cycle-1",
      aggregation({ participantCount: 4 }),
      SCALE,
    );

    expect(result).toMatchObject({ valid: false, reason: "aggregation_not_publishable" });
  });

  test("rejects duplicate pillars and out-of-scale means", () => {
    const duplicate = publicAggregationToIndexInput(
      "org-1",
      "cycle-1",
      aggregation({
        pillars: [
          { pillarId: "energia", n: 8, visible: true, mean: 4 },
          { pillarId: "energia", n: 8, visible: true, mean: 3 },
        ],
      }),
      SCALE,
    );
    const outOfScale = publicAggregationToIndexInput(
      "org-1",
      "cycle-1",
      aggregation({ pillars: [{ pillarId: "energia", n: 8, visible: true, mean: 6 }] }),
      SCALE,
    );

    expect(duplicate).toMatchObject({ valid: false, reason: "duplicate_pillar" });
    expect(outOfScale).toMatchObject({ valid: false, reason: "invalid_public_contract" });
  });
});
