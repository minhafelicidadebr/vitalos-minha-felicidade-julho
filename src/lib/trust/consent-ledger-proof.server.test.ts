import { describe, expect, test } from "bun:test";
import { buildConsentLedgerContractProof } from "./consent-ledger-proof.server";

describe("consent ledger contract proof", () => {
  test("verifies revocation semantics without claiming persisted consent", () => {
    const proof = buildConsentLedgerContractProof("2026-06-19T12:00:00.000Z");
    // Cloud state determines runtime label; contract must be verified in both modes.
    expect(proof).toMatchObject({
      status: "contract_verified",
      persisted: false,
      productionClaimsAllowed: false,
      passedCheckCount: 8,
      checkCount: 8,
      eventPayloadReturned: false,
    });
    expect(["ephemeral_demo", "cloud_available"]).toContain(proof.runtime);
  });

  test("public proof strips events and subject-level decisions", () => {
    const serialized = JSON.stringify(buildConsentLedgerContractProof());

    expect(serialized).not.toContain('"events"');
    expect(serialized).not.toContain('"subjectId"');
    expect(serialized).not.toContain('"decision"');
    expect(serialized).not.toContain('"purposeId"');
  });
});
