import { describe, expect, test } from "bun:test";
import { buildProductionKeyRegistryProof } from "./production-key-registry-proof.server";

describe("production key registry proof", () => {
  test("verifies governance while keeping the durable registry inactive", () => {
    expect(buildProductionKeyRegistryProof("2026-06-19T23:55:00.000Z")).toMatchObject({
      status: "contract_verified",
      assurance: "governed_key_registry_blueprint",
      runtime: {
        durableRegistry: false,
        verifiedApproverIdentity: false,
        immutableAuditLog: false,
        passed: 0,
        total: 3,
      },
      trustedKeyRegistryActive: false,
      productionClaimsAllowed: false,
      passedCheckCount: 12,
      checkCount: 12,
      sensitivePayloadReturned: false,
    });
  });

  test("public proof excludes actors, requests, keys and fingerprints", () => {
    const serialized = JSON.stringify(buildProductionKeyRegistryProof());
    for (const forbidden of [
      "fixture-security",
      "fixture-platform",
      "fixture-requester",
      "fixture-activate",
      "fixture-old",
      "fixture-new",
      "aaaaaaaaaaaa",
      "bbbbbbbbbbbb",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });
});
