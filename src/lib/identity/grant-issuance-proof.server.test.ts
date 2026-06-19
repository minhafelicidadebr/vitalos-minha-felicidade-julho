import { describe, expect, test } from "bun:test";
import { buildGrantIssuanceContractProof } from "./grant-issuance-proof.server";

describe("grant issuance contract proof", () => {
  test("passes positive and adversarial least-privilege cases", () => {
    const proof = buildGrantIssuanceContractProof("2026-06-19T19:00:00.000Z");
    expect(proof).toMatchObject({
      status: "contract_verified",
      runtime: "membership_store_missing",
      grantsServerIssued: false,
      productionClaimsAllowed: false,
      passedCaseCount: 12,
      caseCount: 12,
    });
    expect(proof.cases.every((item) => item.passed)).toBe(true);
  });

  test("declares atomic, tenant-bound and explicit-domain invariants", () => {
    const proof = buildGrantIssuanceContractProof();
    expect(proof.invariants).toMatchObject({
      clientRoleTrusted: false,
      atomicBatch: true,
      leastPrivilege: true,
      tenantBound: true,
      domainExplicit: true,
      wildcardDefaultDenied: true,
      grantLifetimeBounded: true,
      sensitivePayloadReturned: false,
    });
  });

  test("public proof contains no membership or scope fixture identifiers", () => {
    const serialized = JSON.stringify(buildGrantIssuanceContractProof());
    for (const forbidden of [
      "fixture-subject-a",
      "fixture-tenant-a",
      "fixture-org-a",
      "fixture-team-a",
      "fixture-role-a",
      "magic_link",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });
});
