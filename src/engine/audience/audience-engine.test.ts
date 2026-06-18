import { describe, expect, test } from "bun:test";
import {
  auditAudiencePolicies,
  hasAudienceCapability,
  resolveAudiencePolicy,
  type AudiencePolicy,
} from "./audience-engine";

type Capability = "read_collective" | "participate";

interface TestPolicy extends AudiencePolicy<Capability> {
  label: string;
}

const fallback: TestPolicy = {
  id: "safe",
  label: "Safe",
  roleIds: [],
  capabilities: ["participate"],
};

const policies: TestPolicy[] = [
  {
    id: "management",
    label: "Management",
    roleIds: ["ADMIN"],
    capabilities: ["read_collective", "participate"],
  },
  {
    id: "participant",
    label: "Participant",
    roleIds: ["MEMBER"],
    capabilities: ["participate"],
  },
];

describe("audience engine", () => {
  test("resolves the single policy mapped to a role", () => {
    const result = resolveAudiencePolicy(policies, "ADMIN", fallback);

    expect(result.reason).toBe("matched");
    expect(result.policy.id).toBe("management");
    expect(hasAudienceCapability(result.policy, "read_collective")).toBe(true);
  });

  test("fails closed for an unknown role", () => {
    const result = resolveAudiencePolicy(policies, "UNKNOWN", fallback);

    expect(result.reason).toBe("missing_role");
    expect(result.policy.id).toBe("safe");
    expect(hasAudienceCapability(result.policy, "read_collective")).toBe(false);
  });

  test("fails closed when a role is mapped more than once", () => {
    const ambiguous = [
      ...policies,
      {
        id: "duplicate",
        label: "Duplicate",
        roleIds: ["ADMIN"],
        capabilities: ["participate"] as Capability[],
      },
    ];
    const result = resolveAudiencePolicy(ambiguous, "ADMIN", fallback);

    expect(result.reason).toBe("ambiguous_role");
    expect(result.policy.id).toBe("safe");
  });

  test("audits duplicate and missing role mappings", () => {
    const audit = auditAudiencePolicies(
      [policies[0]!, { ...policies[1]!, roleIds: ["ADMIN"] }],
      ["ADMIN", "MEMBER", "OBSERVER"],
    );

    expect(audit.valid).toBe(false);
    expect(audit.duplicateRoleIds).toEqual(["ADMIN"]);
    expect(audit.missingRoleIds).toEqual(["MEMBER", "OBSERVER"]);
  });

  test("accepts complete, non-overlapping policy coverage", () => {
    expect(auditAudiencePolicies(policies, ["ADMIN", "MEMBER"])).toEqual({
      valid: true,
      duplicateRoleIds: [],
      missingRoleIds: [],
      emptyPolicyIds: [],
    });
  });
});
