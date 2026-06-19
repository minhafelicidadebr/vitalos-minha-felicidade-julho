import { describe, expect, test } from "bun:test";
import { buildProductionRegistryApprovalProof } from "./production-registry-approval-proof.server";

describe("production registry approval proof", () => {
  test("verifies approver authority while keeping runtime inactive", () => {
    expect(buildProductionRegistryApprovalProof("2026-06-20T00:05:00.000Z")).toMatchObject({
      status: "contract_verified",
      assurance: "authorized_approval_blueprint",
      runtime: {
        signedSession: false,
        serverGrants: false,
        approvalSealKey: false,
        durableApprovalNonceLedger: false,
        passed: 0,
        total: 4,
      },
      verifiedRegistryApprovalsActive: false,
      productionClaimsAllowed: false,
      passedCheckCount: 14,
      checkCount: 14,
      sensitivePayloadReturned: false,
    });
  });

  test("public proof strips actors, tenant, org, keys, nonces and grants", () => {
    const serialized = JSON.stringify(buildProductionRegistryApprovalProof());
    for (const forbidden of [
      "fixture-approver",
      "fixture-tenant",
      "fixture-org",
      "fixture-seal",
      "fixture_approval_nonce",
      '"grants"',
      '"signature"',
      "BEGIN PUBLIC KEY",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });
});
