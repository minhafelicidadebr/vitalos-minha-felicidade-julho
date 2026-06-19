import { describe, expect, test } from "bun:test";
import { buildRlsParityProof } from "./rls-parity-proof.server";

describe("RLS parity proof", () => {
  test("keeps application and intended database policy semantics aligned", () => {
    const proof = buildRlsParityProof("2026-06-19T20:00:00.000Z");
    expect(proof).toMatchObject({
      status: "verified",
      enforcement: "policy_manifest",
      rlsDeployed: false,
      sqlApplied: false,
      productionClaimsAllowed: false,
      passedCaseCount: 16,
      caseCount: 16,
      manifest: {
        defaultDeny: true,
        ruleCount: 6,
        tableCount: 5,
      },
    });
    expect(proof.cases.every((item) => item.passed)).toBe(true);
  });

  test("covers allow canaries and every critical deny class", () => {
    const proof = buildRlsParityProof();
    const classes = new Set(proof.cases.map((item) => item.expectedClass));
    for (const required of [
      "allowed",
      "identity",
      "tenant",
      "privacy",
      "policy",
      "expiry",
      "domain",
      "scope",
    ]) {
      expect(classes.has(required as never)).toBe(true);
    }
  });

  test("public proof strips identity, tenant, row and scope fixtures", () => {
    const serialized = JSON.stringify(buildRlsParityProof());
    for (const forbidden of [
      "fixture-subject-a",
      "fixture-tenant-a",
      "fixture-org-a",
      "fixture-team-a",
      "fixture-row",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });
});
