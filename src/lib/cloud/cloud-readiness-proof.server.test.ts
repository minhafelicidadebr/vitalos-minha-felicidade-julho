import { describe, expect, test } from "bun:test";
import { buildCloudReadinessProof } from "./cloud-readiness-proof.server";

describe("cloud readiness proof", () => {
  test("composes all current contracts into an honest blocked gate", () => {
    expect(buildCloudReadinessProof("enterprise", "2026-06-19T12:00:00.000Z")).toMatchObject({
      status: "blocked",
      productionClaimsAllowed: false,
      environment: "demo",
      lovableCloudConfigured: false,
      foundation: { passed: 5, total: 5 },
      runtime: { passed: 0, total: 5 },
      nextControlId: "runtime.signed_session",
      sensitivePayloadReturned: false,
    });
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
