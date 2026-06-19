import { describe, expect, test } from "bun:test";
import { resolveTrustedSession, type ResolveTrustedSessionInput } from "./session-contract-engine";

const base: ResolveTrustedSessionInput = {
  claims: {
    adapter: "lovable-cloud",
    verificationPerformed: true,
    signatureVerified: true,
    issuer: "https://identity.vitalos.test",
    audience: "vitalos-app",
    subjectId: "subject-a",
    sessionId: "session-a",
    authMethod: "magic_link",
    issuedAt: "2026-06-19T12:00:00.000Z",
    expiresAt: "2026-06-19T14:00:00.000Z",
  },
  memberships: [
    {
      subjectId: "subject-a",
      tenantId: "tenant-a",
      organizationId: "org-a",
      roleIds: ["leader", "participant", "leader"],
      status: "active",
      validFrom: "2026-01-01T00:00:00.000Z",
    },
  ],
  requestedTenantId: "tenant-a",
  policy: {
    expectedAdapter: "lovable-cloud",
    expectedIssuer: "https://identity.vitalos.test",
    expectedAudience: "vitalos-app",
    evaluatedAt: "2026-06-19T13:00:00.000Z",
    maxSessionAgeSeconds: 7_200,
  },
};

function decide(overrides: Partial<ResolveTrustedSessionInput> = {}) {
  return resolveTrustedSession({
    ...base,
    ...overrides,
    claims: { ...base.claims, ...overrides.claims },
    policy: { ...base.policy, ...overrides.policy },
  });
}

describe("session contract engine", () => {
  test("derives the minimum trusted context from verified claims and membership", () => {
    expect(decide()).toEqual({
      trusted: true,
      reason: "trusted",
      context: {
        source: "server_adapter",
        subjectId: "subject-a",
        activeTenantId: "tenant-a",
        organizationId: "org-a",
        roleIds: ["leader", "participant"],
        authMethod: "magic_link",
        sessionExpiresAt: "2026-06-19T14:00:00.000Z",
      },
    });
  });

  test("rejects an adapter that is not the configured trust boundary", () => {
    expect(decide({ claims: { ...base.claims, adapter: "client-cookie" } }).reason).toBe(
      "adapter_mismatch",
    );
  });

  test("requires server verification and a valid signature", () => {
    expect(decide({ claims: { ...base.claims, verificationPerformed: false } }).reason).toBe(
      "verification_missing",
    );
    expect(decide({ claims: { ...base.claims, signatureVerified: false } }).reason).toBe(
      "signature_invalid",
    );
  });

  test("binds issuer and audience exactly", () => {
    expect(decide({ claims: { ...base.claims, issuer: "https://evil.test" } }).reason).toBe(
      "issuer_mismatch",
    );
    expect(decide({ claims: { ...base.claims, audience: "other-app" } }).reason).toBe(
      "audience_mismatch",
    );
  });

  test("rejects malformed or inverted temporal claims", () => {
    expect(decide({ claims: { ...base.claims, subjectId: " " } }).reason).toBe("invalid_claims");
    expect(decide({ claims: { ...base.claims, issuedAt: "not-a-date" } }).reason).toBe(
      "invalid_claims",
    );
    expect(
      decide({
        claims: {
          ...base.claims,
          issuedAt: "2026-06-19T14:00:00.000Z",
          expiresAt: "2026-06-19T13:00:00.000Z",
        },
      }).reason,
    ).toBe("invalid_claims");
  });

  test("rejects sessions from the future, expired sessions and excessive age", () => {
    expect(
      decide({ claims: { ...base.claims, issuedAt: "2026-06-19T13:30:00.000Z" } }).reason,
    ).toBe("session_not_yet_valid");
    expect(
      decide({ claims: { ...base.claims, expiresAt: "2026-06-19T13:00:00.000Z" } }).reason,
    ).toBe("session_expired");
    expect(
      decide({
        claims: { ...base.claims, issuedAt: "2026-06-19T10:00:00.000Z" },
        policy: { ...base.policy, maxSessionAgeSeconds: 3_000 },
      }).reason,
    ).toBe("session_too_old");
  });

  test("never accepts a tenant requested by the client without membership", () => {
    expect(decide({ requestedTenantId: "tenant-b" }).reason).toBe("membership_missing");
  });

  test("rejects suspended, future and expired memberships", () => {
    expect(
      decide({
        memberships: [{ ...base.memberships[0]!, status: "suspended" }],
      }).reason,
    ).toBe("membership_inactive");
    expect(
      decide({
        memberships: [{ ...base.memberships[0]!, validFrom: "2026-06-20T00:00:00.000Z" }],
      }).reason,
    ).toBe("membership_not_yet_valid");
    expect(
      decide({
        memberships: [{ ...base.memberships[0]!, expiresAt: "2026-06-19T13:00:00.000Z" }],
      }).reason,
    ).toBe("membership_expired");
  });

  test("requires explicit tenant selection when more than one membership is active", () => {
    expect(
      decide({
        requestedTenantId: undefined,
        memberships: [
          base.memberships[0]!,
          {
            ...base.memberships[0]!,
            tenantId: "tenant-b",
            organizationId: "org-b",
          },
        ],
      }).reason,
    ).toBe("tenant_selection_required");
  });

  test("fails closed when the same tenant resolves to multiple organizations", () => {
    expect(
      decide({
        memberships: [
          base.memberships[0]!,
          { ...base.memberships[0]!, organizationId: "org-shadow" },
        ],
      }).reason,
    ).toBe("membership_ambiguous");
  });

  test("does not leak a context in any denied decision", () => {
    expect(decide({ claims: { ...base.claims, signatureVerified: false } }).context).toBeNull();
  });
});
