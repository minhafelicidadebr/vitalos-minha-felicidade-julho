import { describe, expect, test } from "bun:test";
import { buildPersistenceContractProof } from "./persistence-contract-proof.server";

describe("persistence contract proof", () => {
  test("verifies the transaction protocol while keeping runtime blocked", () => {
    const proof = buildPersistenceContractProof("2026-06-19T12:00:00.000Z");

    expect(proof).toMatchObject({
      status: "contract_verified",
      runtime: "adapter_missing",
      productionClaimsAllowed: false,
      passedCheckCount: 8,
      checkCount: 8,
      rawResponsesReturned: false,
    });
  });

  test("public proof has no individual response payload", () => {
    const serialized = JSON.stringify(buildPersistenceContractProof());

    expect(serialized).not.toContain('"subjectId":');
    expect(serialized).not.toContain('"submissionId":');
    expect(serialized).not.toContain('"answers"');
    expect(serialized).not.toContain('"itemId"');
    expect(serialized).not.toContain('"value"');
  });
});
