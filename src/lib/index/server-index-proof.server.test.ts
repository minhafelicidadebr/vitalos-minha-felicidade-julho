import { describe, expect, test } from "bun:test";
import { buildAggregationProof } from "../aggregation/aggregation-proof.server";
import { buildIndexProofFromAggregation, buildServerIndexProof } from "./server-index-proof.server";

describe("server index proof", () => {
  test("calculates enterprise and school indices from public aggregates", () => {
    const enterprise = buildServerIndexProof("enterprise", "2026-06-19T12:00:00.000Z");
    const school = buildServerIndexProof("school", "2026-06-19T12:00:00.000Z");

    expect(enterprise).toMatchObject({
      indexLabel: "IVO",
      source: "published_aggregates_only",
      rawResponsesReturned: false,
      respondentCount: 8,
    });
    expect(school).toMatchObject({
      indexLabel: "IEV",
      source: "published_aggregates_only",
      rawResponsesReturned: false,
      respondentCount: 8,
    });
  });

  test("public proof contains no submission or answer payload", () => {
    const serialized = JSON.stringify(buildServerIndexProof("enterprise"));

    expect(serialized).not.toContain("submissionId");
    expect(serialized).not.toContain('"answers"');
    expect(serialized).not.toContain('"itemId"');
    expect(serialized).not.toContain('"mean"');
  });

  test("refuses a protected organization aggregation", () => {
    const aggregation = buildAggregationProof("enterprise", "2026-06-19T12:00:00.000Z");
    expect(aggregation).not.toBeNull();
    if (!aggregation) return;

    expect(
      buildIndexProofFromAggregation({
        ...aggregation,
        organization: aggregation.protectedCohort,
      }),
    ).toBeNull();
  });

  test("unknown packs do not silently fall back to enterprise", () => {
    expect(buildServerIndexProof("unknown-pack")).toBeNull();
    expect(buildAggregationProof("unknown-pack")).toBeNull();
  });
});
