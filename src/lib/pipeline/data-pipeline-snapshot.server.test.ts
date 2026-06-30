import { describe, expect, test } from "bun:test";
import { buildDataPipelineSnapshot } from "./data-pipeline-snapshot.server";

describe("data pipeline snapshot", () => {
  test("builds one coherent, verified snapshot", () => {
    const snapshot = buildDataPipelineSnapshot("enterprise", "2026-06-19T12:00:00.000Z");

    expect(snapshot).not.toBeNull();
    expect(snapshot?.attestation).toMatchObject({
      status: "verified",
      assuranceLevel: "demo_contract",
      digestScope: "sanitized_public_metadata",
      rawResponsesReturned: false,
    });
    expect(snapshot?.persistence.status).toBe("contract_verified");
    expect(snapshot?.persistence.passedCheckCount).toBe(snapshot?.persistence.checkCount);
    expect(["adapter_missing", "cloud_available"]).toContain(snapshot?.persistence.runtime);
    expect(snapshot?.generatedAt).toBe(snapshot?.aggregation.generatedAt);
    expect(snapshot?.generatedAt).toBe(snapshot?.index.generatedAt);
    expect(snapshot?.generatedAt).toBe(snapshot?.attestation.generatedAt);
  });

  test("digest is reproducible across generation timestamps", () => {
    const first = buildDataPipelineSnapshot("enterprise", "2026-06-19T12:00:00.000Z");
    const second = buildDataPipelineSnapshot("enterprise", "2026-06-19T13:00:00.000Z");

    expect(first?.attestation.digest).toBe(second?.attestation.digest);
    expect(first?.attestation.attestationId).toBe(second?.attestation.attestationId);
  });

  test("serialized attestation has no individual payload or private-value hash", () => {
    const serialized = JSON.stringify(buildDataPipelineSnapshot("enterprise")?.attestation);

    expect(serialized).not.toContain("submissionId");
    expect(serialized).not.toContain('"answers"');
    expect(serialized).not.toContain('"itemId"');
    expect(serialized).not.toContain('"mean"');
    expect(serialized).not.toContain('"value"');
    expect(serialized).not.toContain("private_hash");
  });

  test("unknown packs fail closed", () => {
    expect(buildDataPipelineSnapshot("unknown-pack")).toBeNull();
  });
});
