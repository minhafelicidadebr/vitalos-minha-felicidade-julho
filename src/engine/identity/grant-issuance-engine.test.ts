import { describe, expect, test } from "bun:test";
import type { SessionTrustDecision } from "./session-contract-engine";
import { issueMembershipGrants, type GrantIssuanceInput } from "./grant-issuance-engine";

const trustedSession: SessionTrustDecision = {
  trusted: true,
  reason: "trusted",
  context: {
    source: "server_adapter",
    subjectId: "subject-a",
    activeTenantId: "tenant-a",
    organizationId: "org-a",
    roleIds: ["leader"],
    authMethod: "magic_link",
    sessionExpiresAt: "2026-06-19T16:00:00.000Z",
  },
};

const base: GrantIssuanceInput = {
  session: trustedSession,
  membership: {
    subjectId: "subject-a",
    tenantId: "tenant-a",
    organizationId: "org-a",
    roleId: "leader",
    status: "active",
    validFrom: "2026-01-01T00:00:00.000Z",
    scopeRefs: {
      self: ["subject-a"],
      team: ["team-a"],
      organization: ["org-a"],
    },
  },
  entitlements: [
    {
      permission: "aggregate.read",
      scope: { kind: "team", refId: "team-a" },
      domain: "A",
      readOnly: true,
    },
    {
      permission: "response.submit",
      scope: { kind: "self", refId: "subject-a" },
      domain: "A",
    },
  ],
  policy: {
    evaluatedAt: "2026-06-19T13:00:00.000Z",
    maxGrantLifetimeSeconds: 3_600,
    allowedPermissions: ["aggregate.read", "response.submit", "domain_b.read"],
    forbiddenPermissions: ["response.read", "performance.write"],
    allowedDomains: ["A", "B"],
    allowedScopeKinds: ["self", "team", "organization"],
    wildcardScopeKinds: [],
  },
};

function issue(overrides: Partial<GrantIssuanceInput> = {}) {
  return issueMembershipGrants({
    ...base,
    ...overrides,
    membership: { ...base.membership, ...overrides.membership },
    policy: { ...base.policy, ...overrides.policy },
  });
}

describe("grant issuance engine", () => {
  test("issues least-privilege grants from trusted membership entitlements", () => {
    const result = issue();
    expect(result).toMatchObject({
      issued: true,
      reason: "issued",
      rejectedEntitlementIndex: null,
    });
    expect(result.grants).toHaveLength(2);
    expect(result.grants[0]).toMatchObject({
      roleId: "leader",
      tenantId: "tenant-a",
      permission: "aggregate.read",
      scope: { kind: "team", refId: "team-a" },
      domains: ["A"],
      readOnly: true,
      expiresOn: "2026-06-19T14:00:00.000Z",
      source: "membership_policy",
    });
  });

  test("requires a trusted session decision", () => {
    expect(
      issue({
        session: { trusted: false, reason: "signature_invalid", context: null },
      }).reason,
    ).toBe("untrusted_session");
  });

  test("binds subject, tenant, organization and role to the trusted context", () => {
    expect(issue({ membership: { ...base.membership, subjectId: "subject-b" } }).reason).toBe(
      "membership_identity_mismatch",
    );
    expect(issue({ membership: { ...base.membership, tenantId: "tenant-b" } }).reason).toBe(
      "membership_tenant_mismatch",
    );
    expect(issue({ membership: { ...base.membership, organizationId: "org-b" } }).reason).toBe(
      "membership_organization_mismatch",
    );
    expect(issue({ membership: { ...base.membership, roleId: "admin" } }).reason).toBe(
      "membership_role_mismatch",
    );
  });

  test("rejects inactive, future and expired memberships", () => {
    expect(issue({ membership: { ...base.membership, status: "revoked" } }).reason).toBe(
      "membership_inactive",
    );
    expect(
      issue({
        membership: { ...base.membership, validFrom: "2026-06-20T00:00:00.000Z" },
      }).reason,
    ).toBe("membership_not_yet_valid");
    expect(
      issue({
        membership: {
          ...base.membership,
          expiresAt: "2026-06-19T13:00:00.000Z",
        },
      }).reason,
    ).toBe("membership_expired");
  });

  test("denies forbidden and non-allowlisted permissions atomically", () => {
    expect(
      issue({
        entitlements: [
          base.entitlements[0]!,
          { ...base.entitlements[1]!, permission: "response.read" },
        ],
      }),
    ).toMatchObject({
      issued: false,
      reason: "permission_forbidden",
      grants: [],
      rejectedEntitlementIndex: 1,
    });
    expect(
      issue({
        entitlements: [{ ...base.entitlements[0]!, permission: "billing.admin" }],
      }).reason,
    ).toBe("permission_not_allowed");
  });

  test("scope must be allowed and bound to the membership", () => {
    expect(
      issue({
        entitlements: [
          {
            ...base.entitlements[0]!,
            scope: { kind: "holding", refId: "holding-a" },
          },
        ],
      }).reason,
    ).toBe("scope_kind_not_allowed");
    expect(
      issue({
        entitlements: [
          {
            ...base.entitlements[0]!,
            scope: { kind: "team", refId: "team-b" },
          },
        ],
      }).reason,
    ).toBe("scope_ref_not_bound");
  });

  test("wildcards require an explicit policy exception", () => {
    expect(
      issue({
        entitlements: [
          {
            ...base.entitlements[0]!,
            scope: { kind: "organization", refId: "*" },
          },
        ],
      }).reason,
    ).toBe("wildcard_scope_forbidden");
  });

  test("Domain B must be explicitly allowlisted", () => {
    expect(
      issue({
        entitlements: [
          {
            permission: "domain_b.read",
            scope: { kind: "organization", refId: "org-a" },
            domain: "B",
            readOnly: true,
          },
        ],
        policy: { ...base.policy, allowedDomains: ["A"] },
      }).reason,
    ).toBe("domain_not_allowed");
  });

  test("grant expiry is bounded by session, policy, membership and entitlement", () => {
    const result = issue({
      membership: {
        ...base.membership,
        expiresAt: "2026-06-19T13:45:00.000Z",
      },
      entitlements: [
        {
          ...base.entitlements[0]!,
          expiresAt: "2026-06-19T13:30:00.000Z",
        },
      ],
    });
    expect(result.grants[0]?.expiresOn).toBe("2026-06-19T13:30:00.000Z");
  });

  test("identical duplicate entitlements collapse but conflicts fail closed", () => {
    expect(
      issue({
        entitlements: [base.entitlements[0]!, { ...base.entitlements[0]! }],
      }).grants,
    ).toHaveLength(1);
    expect(
      issue({
        entitlements: [base.entitlements[0]!, { ...base.entitlements[0]!, readOnly: false }],
      }).reason,
    ).toBe("entitlement_conflict");
  });

  test("empty entitlement batches never imply access", () => {
    expect(issue({ entitlements: [] }).reason).toBe("empty_entitlements");
  });
});
