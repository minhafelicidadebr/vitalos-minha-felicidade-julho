import { describe, expect, test } from "bun:test";
import { buildConsentPersistenceContractProof } from "./consent-persistence-proof.server";

describe("consent persistence contract proof", () => {
  test("verifies transaction semantics while runtime remains absent", () => {
    expect(buildConsentPersistenceContractProof("2026-06-19T22:00:00.000Z")).toMatchObject({
      status: "contract_verified",
      runtime: "adapter_missing",
      durableConsentLedger: false,
      productionClaimsAllowed: false,
      passedCheckCount: 8,
      checkCount: 8,
      sensitivePayloadReturned: false,
    });
  });

  test("public proof strips personal and transaction fixtures", () => {
    const serialized = JSON.stringify(buildConsentPersistenceContractProof());
    for (const forbidden of [
      "fixture-subject",
      "fixture-tenant",
      "fixture-org",
      "fixture-request",
      "fixture-purpose",
      "fixture-commit",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });
});
