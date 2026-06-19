import { describe, expect, test } from "bun:test";
import { buildAggregationProof } from "./aggregation-proof.server";

describe("server aggregation proof", () => {
  test("returns visible organization aggregates and strips the protected cohort", () => {
    const proof = buildAggregationProof("enterprise", "2026-06-19T12:00:00.000Z")!;

    expect(proof.organization.publishable).toBe(true);
    expect(proof.organization.pillars.every((pillar) => pillar.mean !== null)).toBe(true);
    expect(proof.protectedCohort.publishable).toBe(false);
    expect(proof.protectedCohort.pillars.every((pillar) => pillar.mean === null)).toBe(true);
    expect(proof.rawResponsesReturned).toBe(false);
  });

  test("public proof has no submission or answer fields", () => {
    const serialized = JSON.stringify(buildAggregationProof("school"));

    expect(serialized).not.toContain("submissionId");
    expect(serialized).not.toContain('"answers"');
    expect(serialized).not.toContain('"itemId"');
    expect(serialized).not.toContain('"value"');
  });
});
