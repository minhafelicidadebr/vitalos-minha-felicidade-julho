import { describe, expect, test } from "bun:test";
import { buildIsolationAuditProof } from "./isolation-audit-proof.server";

describe("isolation audit proof", () => {
  test("passes every synthetic attack without claiming RLS deployment", () => {
    const proof = buildIsolationAuditProof("2026-06-19T12:00:00.000Z");

    expect(proof).toMatchObject({
      status: "verified",
      caseCount: 13,
      passedCaseCount: 13,
      rlsDeployed: false,
      enforcement: "policy_oracle",
      productionClaimsAllowed: false,
      sensitiveFixturesReturned: false,
    });
    expect(proof.categories.every((category) => category.passed)).toBe(true);
  });

  test("public report strips synthetic identity and resource payloads", () => {
    const serialized = JSON.stringify(buildIsolationAuditProof());

    expect(serialized).not.toContain("tenant-a");
    expect(serialized).not.toContain("subject-a");
    expect(serialized).not.toContain('"grants"');
    expect(serialized).not.toContain('"scopeRefs"');
    expect(serialized).not.toContain('"resource"');
    expect(serialized).not.toContain('"envelope"');
  });
});
