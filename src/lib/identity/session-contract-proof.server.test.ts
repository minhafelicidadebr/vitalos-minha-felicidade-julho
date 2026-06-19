import { describe, expect, test } from "bun:test";
import { buildSignedSessionContractProof } from "./session-contract-proof.server";

describe("signed session contract proof", () => {
  test("verifies every positive and adversarial scenario", () => {
    const proof = buildSignedSessionContractProof("2026-06-19T18:00:00.000Z");
    expect(proof).toMatchObject({
      status: "contract_verified",
      runtime: "adapter_missing",
      signedSessionActive: false,
      productionClaimsAllowed: false,
      passedCaseCount: 12,
      caseCount: 12,
    });
    expect(proof.cases.every((item) => item.passed)).toBe(true);
  });

  test("keeps demo proof separate from runtime activation", () => {
    const proof = buildSignedSessionContractProof();
    expect(proof.invariants.rawTokenAccepted).toBe(false);
    expect(proof.invariants.clientPersonaTrusted).toBe(false);
    expect(proof.invariants.tenantDerivedFromMembership).toBe(true);
    expect(proof.invariants.sensitivePayloadReturned).toBe(false);
  });

  test("public proof strips session, subject, tenant and organization fixtures", () => {
    const serialized = JSON.stringify(buildSignedSessionContractProof());
    for (const forbidden of [
      "fixture-subject-a",
      "fixture-session-a",
      "fixture-tenant-a",
      "fixture-org-a",
      "magic_link",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });
});
