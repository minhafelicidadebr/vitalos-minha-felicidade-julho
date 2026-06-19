import { describe, expect, test } from "bun:test";
import { buildRetentionAuditProof } from "./retention-audit-proof.server";

describe("retention and audit proof", () => {
  test("verifies lifecycle and tamper evidence without claiming live jobs", () => {
    expect(buildRetentionAuditProof("2026-06-19T23:00:00.000Z")).toMatchObject({
      status: "contract_verified",
      runtime: "scheduler_missing",
      retentionJobsActive: false,
      immutableAuditStoreActive: false,
      productionClaimsAllowed: false,
      policySource: "injected_demo_policy",
      passedCheckCount: 8,
      checkCount: 8,
      digestScope: "sanitized_audit_metadata",
      sensitivePayloadReturned: false,
    });
  });

  test("digest is deterministic across generation timestamps", () => {
    const first = buildRetentionAuditProof("2026-06-19T23:00:00.000Z");
    const second = buildRetentionAuditProof("2026-06-20T10:00:00.000Z");
    expect(first.auditDigest).toBe(second.auditDigest);
    expect(first.auditDigest).toHaveLength(64);
  });

  test("public proof strips record, subject, purpose and event fixture ids", () => {
    const serialized = JSON.stringify(buildRetentionAuditProof());
    for (const forbidden of ["fixture-record", "subject-ref", "purpose-ref", "fixture-audit"]) {
      expect(serialized).not.toContain(forbidden);
    }
  });
});
