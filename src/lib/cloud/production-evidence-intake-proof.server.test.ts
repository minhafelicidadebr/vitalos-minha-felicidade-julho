import { describe, expect, test } from "bun:test";
import { buildProductionEvidenceIntakeProof } from "./production-evidence-intake-proof.server";

describe("production evidence intake proof", () => {
  test("verifies cryptographic intake while keeping the runtime blocked", () => {
    expect(buildProductionEvidenceIntakeProof("2026-06-19T23:45:00.000Z")).toMatchObject({
      status: "contract_verified",
      assurance: "cryptographic_intake_blueprint",
      runtime: {
        trustedKeyRegistry: false,
        durableReplayLedger: false,
        productionEvidenceSource: false,
        passed: 0,
        total: 3,
      },
      runtimeEvidenceAccepted: false,
      productionClaimsAllowed: false,
      passedCheckCount: 10,
      checkCount: 10,
      sensitivePayloadReturned: false,
    });
  });

  test("does not expose keys, signatures, nonces or synthetic infrastructure ids", () => {
    const serialized = JSON.stringify(buildProductionEvidenceIntakeProof());
    for (const forbidden of [
      "BEGIN PUBLIC KEY",
      "BEGIN PRIVATE KEY",
      "fixture_nonce",
      "fixture-deployment",
      "fixture-key",
      "fixture-runtime",
      '"signature"',
      '"evidenceDigest"',
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });
});
