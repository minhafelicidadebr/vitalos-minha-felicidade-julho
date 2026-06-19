import { describe, expect, test } from "bun:test";
import {
  buildPipelineAttestation,
  canonicalAttestationPayload,
  type PipelineAttestationInput,
} from "./pipeline-attestation-engine";

type InputOverrides = Omit<
  Partial<PipelineAttestationInput>,
  "capture" | "aggregation" | "index"
> & {
  capture?: Partial<PipelineAttestationInput["capture"]>;
  aggregation?: Partial<PipelineAttestationInput["aggregation"]>;
  index?: Partial<PipelineAttestationInput["index"]>;
};

function input(overrides: InputOverrides = {}): PipelineAttestationInput {
  const base: PipelineAttestationInput = {
    packId: "enterprise",
    organizationId: "org-1",
    cycleId: "cycle-1",
    capture: {
      mode: "ephemeral_demo",
      persisted: false,
      contentReturned: false,
    },
    aggregation: {
      participantCount: 8,
      kAnonymityMin: 5,
      publishable: true,
      publishedPillarCount: 12,
      protectedPillarCount: 12,
      protectedContractValid: true,
      rawResponsesReturned: false,
    },
    index: {
      indexId: "ivo",
      indexLabel: "IVO",
      score: 498,
      respondentCount: 8,
      visiblePillarCount: 12,
      source: "published_aggregates_only",
      rawResponsesReturned: false,
    },
  };

  return {
    ...base,
    ...overrides,
    capture: { ...base.capture, ...overrides.capture },
    aggregation: { ...base.aggregation, ...overrides.aggregation },
    index: { ...base.index, ...overrides.index },
  };
}

describe("pipeline attestation engine", () => {
  test("verifies the complete demo contract without claiming production runtime", () => {
    const result = buildPipelineAttestation(input());

    expect(result.status).toBe("verified");
    expect(result.assuranceLevel).toBe("demo_contract");
    expect(result.checks.every((item) => item.passed)).toBe(true);
  });

  test("fails closed when a protected value was not materially removed", () => {
    const result = buildPipelineAttestation(
      input({ aggregation: { protectedContractValid: false } }),
    );

    expect(result.status).toBe("blocked");
    expect(
      result.checks.find((item) => item.id === "aggregation.protected_values_removed")?.passed,
    ).toBe(false);
  });

  test("does not accept dishonest demo persistence or a non-public index source", () => {
    const dishonest = buildPipelineAttestation(
      input({
        capture: { persisted: true },
        index: { source: "private_submissions" },
      }),
    );

    expect(dishonest.status).toBe("blocked");
    expect(dishonest.stages.find((stage) => stage.id === "capture")?.status).toBe("blocked");
    expect(dishonest.stages.find((stage) => stage.id === "index")?.status).toBe("blocked");
  });

  test("canonical payload is deterministic and contains only sanitized metadata", () => {
    const draft = buildPipelineAttestation(input());
    const first = canonicalAttestationPayload(draft);
    const second = canonicalAttestationPayload(buildPipelineAttestation(input()));

    expect(first).toBe(second);
    expect(first).not.toContain("submissionId");
    expect(first).not.toContain('"answers"');
    expect(first).not.toContain('"itemId"');
    expect(first).not.toContain('"mean"');
  });
});
