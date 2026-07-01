import { describe, expect, test } from "bun:test";
import { buildCloudReadinessProof } from "./cloud-readiness-proof.server";

describe("cloud readiness proof", () => {
  test("composes all current contracts into an honest readiness gate", () => {
    const proof = buildCloudReadinessProof("enterprise", "2026-06-19T12:00:00.000Z");

    expect(proof).not.toBeNull();
    expect(proof?.sensitivePayloadReturned).toBe(false);
    // Foundation: all five mathematical contracts must always pass.
    expect(proof?.foundation).toEqual({ passed: 5, total: 5 });
    // status and lovableCloudConfigured reflect the actual environment.
    expect(["demo", "cloud"]).toContain(proof?.environment ?? "");
    // Production claims are only allowed when all controls pass.
    if (proof?.status === "ready") {
      expect(proof.productionClaimsAllowed).toBe(true);
    } else {
      expect(proof?.productionClaimsAllowed).toBe(false);
    }
  });

  test("works for every registered vertical without leaking private proofs", () => {
    const enterprise = buildCloudReadinessProof("enterprise");
    const school = buildCloudReadinessProof("school");
    const serialized = JSON.stringify(enterprise);

    expect(enterprise?.foundation).toEqual(school?.foundation);
    expect(serialized).not.toContain('"answers"');
    expect(serialized).not.toContain('"events"');
    expect(serialized).not.toContain('"grants"');
    expect(serialized).not.toContain('"mean"');
  });

  test("unknown packs fail closed", () => {
    expect(buildCloudReadinessProof("unknown-pack")).toBeNull();
  });
});
