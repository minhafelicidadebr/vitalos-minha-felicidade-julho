import { describe, expect, test } from "bun:test";
import { buildIdentityTrustChainProof } from "./trust-chain-attestation.server";

describe("identity trust-chain proof", () => {
  test("attests every public contract without promoting runtime", () => {
    expect(buildIdentityTrustChainProof("2026-06-19T21:00:00.000Z")).toMatchObject({
      status: "verified",
      assuranceLevel: "cutover_blueprint",
      productionClaimsAllowed: false,
      passedCheckCount: 12,
      checkCount: 12,
      runtime: {
        passed: 0,
        total: 3,
      },
      digestAlgorithm: "sha256",
      digestScope: "sanitized_public_metadata",
      sensitivePayloadReturned: false,
    });
  });

  test("digest is reproducible across generation timestamps", () => {
    const first = buildIdentityTrustChainProof("2026-06-19T21:00:00.000Z");
    const second = buildIdentityTrustChainProof("2026-06-20T09:00:00.000Z");
    expect(first.digest).toBe(second.digest);
    expect(first.digest).toHaveLength(64);
  });

  test("serialized proof excludes identities, tenants, memberships and raw grants", () => {
    const serialized = JSON.stringify(buildIdentityTrustChainProof());
    for (const forbidden of [
      "fixture-subject",
      "fixture-tenant",
      "fixture-org",
      "fixture-team",
      '"memberships"',
      '"entitlements"',
      '"grants"',
      '"token"',
    ]) {
      expect(serialized.toLowerCase()).not.toContain(forbidden.toLowerCase());
    }
  });
});
