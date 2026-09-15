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

  // ── TASK 10.1 §D — release-unit invariant ──────────────────────────────
  //
  // capsule-aggregator.server.ts's batching guard (P1) only checks the
  // WAVE-LEVEL delta (participant_count), never a per-pillar delta. That is
  // only privacy-safe if every pillar's n is ALWAYS equal to the wave's
  // participantCount — i.e. there's no independently observable subgroup
  // cell smaller than the wave total inside a single wave_capsules row.
  // This test proves that invariant HOLDS by construction: an incomplete
  // submission (missing an item — which is the only way a respondent could
  // contribute to some pillars but not others) is rejected as INVALID for
  // the WHOLE aggregation, never silently excluded from one pillar. So a
  // valid (accepted) aggregation result can never have per-pillar n values
  // that differ from each other or from participantCount.
  test("release-unit invariant: an incomplete submission invalidates the WHOLE aggregation, never just one pillar — so every pillar.n always equals participantCount", () => {
    const incomplete = aggregateValidatedResponses(
      [
        submission("u1", 3, 3, 3),
        // u2 vota só em a1/a2, omite b1 — resposta parcial.
        { submissionId: "u2", answers: [{ itemId: "a1", value: 3 }, { itemId: "a2", value: 3 }] },
      ],
      items,
      scale,
    );
    expect(incomplete.valid).toBe(false);
    if (!incomplete.valid) expect(incomplete.reason).toBe("incomplete_submission");
    // Não é "pillar b tem n=1 e pillar a tem n=2" — é INVALID por completo,
    // então nem chega a existir um capsule com pillars de n divergente.

    const complete = aggregateValidatedResponses(
      [
        submission("u1", 3, 3, 3),
        submission("u2", 4, 4, 4),
        submission("u3", 5, 5, 5),
        submission("u4", 2, 2, 2),
        submission("u5", 1, 1, 1),
        submission("u6", 3, 3, 3),
        submission("u7", 4, 4, 4),
      ],
      items,
      scale,
    );
    expect(complete.valid).toBe(true);
    if (complete.valid) {
      // TODOS os pilares têm n === participantCount — a "unidade de
      // liberação" de wave_capsules é a ONDA, não a coluna/pilar: não há
      // como um pilar ter menos respondentes que outro num resultado válido.
      expect(complete.participantCount).toBe(7);
      for (const pillar of complete.privatePillars) {
        expect(pillar.n).toBe(complete.participantCount);
      }
    }
  });
});
