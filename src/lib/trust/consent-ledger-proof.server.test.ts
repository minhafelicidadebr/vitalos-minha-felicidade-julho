import { describe, expect, test } from "bun:test";
import { buildConsentLedgerContractProof } from "./consent-ledger-proof.server";

describe("consent ledger contract proof", () => {
  test("verifies revocation semantics without claiming persisted consent", () => {
    expect(buildConsentLedgerContractProof("2026-06-19T12:00:00.000Z")).toMatchObject({
      status: "contract_verified",
      runtime: "ephemeral_demo",
      persisted: false,
      productionClaimsAllowed: false,
      passedCheckCount: 8,
      checkCount: 8,
      eventPayloadReturned: false,
    });
  });

  test("public proof strips events and subject-level decisions", () => {
    const serialized = JSON.stringify(buildConsentLedgerContractProof());

    expect(serialized).not.toContain('"events"');
    expect(serialized).not.toContain('"subjectId"');
    expect(serialized).not.toContain('"decision"');
    expect(serialized).not.toContain('"purposeId"');
  });
});
