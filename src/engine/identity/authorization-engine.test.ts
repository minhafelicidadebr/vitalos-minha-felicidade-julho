import { describe, expect, test } from "bun:test";
import {
  authorizeResource,
  resolveIdentityBoundary,
  type AccessGrant,
  type IdentityContext,
  type ProtectedResource,
} from "./authorization-engine";

const grant: AccessGrant = {
  roleId: "LEADER",
  tenantId: "tenant-a",
  permission: "aggregate.read",
  scope: { kind: "team", refId: "team-a" },
  domains: ["A"],
};

function identity(overrides: Partial<IdentityContext> = {}): IdentityContext {
  return {
    state: "authenticated",
    subjectId: "user-1",
    activeTenantId: "tenant-a",
    grants: [grant],
    evaluatedOn: "2026-06-18",
    ...overrides,
  };
}

function resource(overrides: Partial<ProtectedResource> = {}): ProtectedResource {
  return {
    id: "team-summary",
    tenantId: "tenant-a",
    permission: "aggregate.read",
    action: "read",
    dataClass: "collective",
    domain: "A",
    scopeRefs: { team: "team-a", organization: "org-a" },
    ...overrides,
  };
}

describe("authorization engine", () => {
  test("allows a matching permission, domain, tenant and scope", () => {
    const result = authorizeResource(identity(), resource());

    expect(result.allowed).toBe(true);
    expect(result.reason).toBe("allowed");
    expect(result.matchedGrant?.roleId).toBe("LEADER");
  });

  test("anonymous identities fail closed", () => {
    expect(authorizeResource(identity({ state: "anonymous" }), resource()).reason).toBe(
      "anonymous",
    );
  });

  test("missing subject or tenant is never treated as authenticated", () => {
    expect(authorizeResource(identity({ subjectId: null }), resource()).reason).toBe(
      "invalid_identity",
    );
  });

  test("tenant mismatch wins even for an otherwise valid grant", () => {
    expect(authorizeResource(identity(), resource({ tenantId: "tenant-b" })).reason).toBe(
      "tenant_mismatch",
    );
  });

  test("individual responses can never be read by client roles", () => {
    const result = authorizeResource(identity(), resource({ dataClass: "individual_response" }));

    expect(result.reason).toBe("individual_response_read_forbidden");
  });

  test("own response can be submitted when a writable self grant exists", () => {
    const result = authorizeResource(
      identity({
        grants: [
          {
            roleId: "MEMBER",
            tenantId: "tenant-a",
            permission: "response.submit",
            scope: { kind: "self", refId: "user-1" },
          },
        ],
      }),
      resource({
        id: "response-draft",
        permission: "response.submit",
        action: "write",
        dataClass: "individual_response",
        domain: undefined,
        ownerSubjectId: "user-1",
        scopeRefs: { self: "user-1" },
      }),
    );

    expect(result.reason).toBe("allowed");
  });

  test("self grant cannot submit another person's response", () => {
    const result = authorizeResource(
      identity({
        grants: [
          {
            roleId: "MEMBER",
            tenantId: "tenant-a",
            permission: "response.submit",
            scope: { kind: "self", refId: "user-1" },
          },
        ],
      }),
      resource({
        permission: "response.submit",
        action: "write",
        dataClass: "individual_response",
        domain: undefined,
        ownerSubjectId: "user-2",
        scopeRefs: { self: "user-2" },
      }),
    );

    expect(result.reason).toBe("scope_mismatch");
  });

  test("team grant cannot escape to another team", () => {
    expect(authorizeResource(identity(), resource({ scopeRefs: { team: "team-b" } })).reason).toBe(
      "scope_mismatch",
    );
  });

  test("domain B requires an explicit B grant", () => {
    expect(authorizeResource(identity(), resource({ domain: "B" })).reason).toBe("domain_mismatch");
  });

  test("expired and read-only grants are rejected", () => {
    const expired = authorizeResource(
      identity({ grants: [{ ...grant, expiresOn: "2026-06-17" }] }),
      resource(),
    );
    const readOnly = authorizeResource(
      identity({ grants: [{ ...grant, readOnly: true }] }),
      resource({ action: "write" }),
    );

    expect(expired.reason).toBe("grant_expired");
    expect(readOnly.reason).toBe("read_only");
  });
});

describe("identity boundary", () => {
  test("demo mode is explicit and never claims real authentication", () => {
    expect(resolveIdentityBoundary("demo", false)).toEqual({
      requestedMode: "demo",
      state: "demo",
      realAuthentication: false,
      serverEnforced: false,
      reason: "demo_isolated",
    });
  });

  test("cloud flag without an adapter blocks instead of falling back silently", () => {
    expect(resolveIdentityBoundary("cloud", false).state).toBe("blocked");
    expect(resolveIdentityBoundary("cloud", false).realAuthentication).toBe(false);
  });

  test("cloud becomes active only with a real adapter", () => {
    expect(resolveIdentityBoundary("cloud", true)).toMatchObject({
      state: "cloud",
      realAuthentication: true,
      serverEnforced: true,
    });
  });
});
