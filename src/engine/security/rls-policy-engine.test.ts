import { describe, expect, test } from "bun:test";
import type {
  AccessGrant,
  IdentityContext,
  ProtectedResource,
} from "../identity/authorization-engine";
import {
  auditRlsParity,
  evaluateRlsPolicy,
  type RlsParityCase,
  type RlsPolicyManifest,
  type RlsRowDescriptor,
} from "./rls-policy-engine";

const manifest: RlsPolicyManifest = {
  version: "2026-06-19",
  defaultDeny: true,
  rules: [
    {
      id: "aggregate-a-select",
      table: "aggregates",
      operation: "select",
      dataClass: "collective",
      permission: "aggregate.read",
      domain: "A",
    },
    {
      id: "response-blind-insert",
      table: "survey_responses",
      operation: "insert",
      dataClass: "individual_response",
      permission: "response.submit",
      domain: "A",
      blindWrite: true,
    },
  ],
};

const grants: AccessGrant[] = [
  {
    roleId: "leader",
    tenantId: "tenant-a",
    permission: "aggregate.read",
    scope: { kind: "team", refId: "team-a" },
    domains: ["A"],
  },
  {
    roleId: "leader",
    tenantId: "tenant-a",
    permission: "response.submit",
    scope: { kind: "self", refId: "subject-a" },
    domains: ["A"],
  },
];

const identity: IdentityContext = {
  state: "authenticated",
  subjectId: "subject-a",
  activeTenantId: "tenant-a",
  grants,
  evaluatedOn: "2026-06-19T13:00:00.000Z",
};

const aggregateRow: RlsRowDescriptor = {
  id: "aggregate-a",
  table: "aggregates",
  tenantId: "tenant-a",
  dataClass: "collective",
  domain: "A",
  scopeRefs: { team: "team-a", organization: "org-a" },
};

describe("RLS policy engine", () => {
  test("allows a tenant, permission, domain and scope match", () => {
    expect(evaluateRlsPolicy(identity, aggregateRow, "select", manifest)).toEqual({
      allowed: true,
      reason: "allowed",
      matchedPolicyId: "aggregate-a-select",
    });
  });

  test("tenant mismatch precedes policy and permission checks", () => {
    expect(
      evaluateRlsPolicy(identity, { ...aggregateRow, tenantId: "tenant-b" }, "select", manifest)
        .reason,
    ).toBe("tenant_mismatch");
  });

  test("raw individual response select is always denied", () => {
    expect(
      evaluateRlsPolicy(
        identity,
        {
          id: "response-a",
          table: "survey_responses",
          tenantId: "tenant-a",
          dataClass: "individual_response",
          domain: "A",
          ownerSubjectId: "subject-a",
          scopeRefs: { self: "subject-a" },
        },
        "select",
        manifest,
      ).reason,
    ).toBe("raw_response_read_forbidden");
  });

  test("blind write requires the authenticated subject to own the row", () => {
    const ownRow: RlsRowDescriptor = {
      id: "response-a",
      table: "survey_responses",
      tenantId: "tenant-a",
      dataClass: "individual_response",
      domain: "A",
      ownerSubjectId: "subject-a",
      scopeRefs: { self: "subject-a" },
    };
    expect(evaluateRlsPolicy(identity, ownRow, "insert", manifest).allowed).toBe(true);
    expect(
      evaluateRlsPolicy(
        identity,
        { ...ownRow, ownerSubjectId: "subject-b", scopeRefs: { self: "subject-b" } },
        "insert",
        manifest,
      ).reason,
    ).toBe("blind_write_owner_mismatch");
  });

  test("missing operation policies deny by default", () => {
    expect(evaluateRlsPolicy(identity, aggregateRow, "update", manifest).reason).toBe(
      "policy_missing",
    );
  });

  test("parity audit requires matching application and database semantics", () => {
    const resource: ProtectedResource = {
      id: aggregateRow.id,
      tenantId: aggregateRow.tenantId,
      permission: "aggregate.read",
      action: "read",
      dataClass: aggregateRow.dataClass,
      domain: aggregateRow.domain,
      scopeRefs: aggregateRow.scopeRefs,
    };
    const cases: RlsParityCase[] = [
      {
        id: "allowed",
        label: "allowed",
        identity,
        resource,
        row: aggregateRow,
        operation: "select",
        expectedClass: "allowed",
      },
      {
        id: "tenant-denied",
        label: "tenant denied",
        identity,
        resource: { ...resource, tenantId: "tenant-b" },
        row: { ...aggregateRow, tenantId: "tenant-b" },
        operation: "select",
        expectedClass: "tenant",
      },
    ];
    expect(auditRlsParity(manifest, cases)).toMatchObject({
      status: "verified",
      caseCount: 2,
      passedCaseCount: 2,
    });
  });

  test("parity audit fails when database manifest drifts from application permission", () => {
    const resource: ProtectedResource = {
      id: aggregateRow.id,
      tenantId: aggregateRow.tenantId,
      permission: "aggregate.read",
      action: "read",
      dataClass: aggregateRow.dataClass,
      domain: aggregateRow.domain,
      scopeRefs: aggregateRow.scopeRefs,
    };
    const drifted: RlsPolicyManifest = {
      ...manifest,
      rules: [{ ...manifest.rules[0]!, permission: "aggregate.admin" }],
    };
    expect(
      auditRlsParity(drifted, [
        {
          id: "drift",
          label: "drift",
          identity,
          resource,
          row: aggregateRow,
          operation: "select",
          expectedClass: "allowed",
        },
      ]).status,
    ).toBe("failed");
  });
});
