import { describe, expect, test } from "bun:test";
import type {
  AccessGrant,
  IdentityContext,
  ProtectedResource,
} from "../identity/authorization-engine";
import type {
  PersistenceEnvelope,
  PersistenceSession,
} from "../persistence/response-persistence-engine";
import { runIsolationAudit, type IsolationScenario } from "./isolation-audit-engine";

const grant: AccessGrant = {
  roleId: "LEADER",
  tenantId: "tenant-a",
  permission: "aggregate.read",
  scope: { kind: "team", refId: "team-a" },
  domains: ["A"],
};
const identity: IdentityContext = {
  state: "authenticated",
  subjectId: "user-a",
  activeTenantId: "tenant-a",
  grants: [grant],
  evaluatedOn: "2026-06-19",
};
const resource: ProtectedResource = {
  id: "aggregate-a",
  tenantId: "tenant-a",
  permission: "aggregate.read",
  action: "read",
  dataClass: "collective",
  domain: "A",
  scopeRefs: { team: "team-a" },
};
const session: PersistenceSession = {
  authenticated: true,
  subjectId: "user-a",
  tenantId: "tenant-a",
  organizationId: "org-a",
};
const envelope: PersistenceEnvelope = {
  submissionId: "submission-a",
  tenantId: "tenant-a",
  organizationId: "org-a",
  waveId: "wave-a",
  surveyId: "survey-a",
  itemCount: 12,
};

describe("isolation audit engine", () => {
  test("verifies mixed allow and deny canaries", () => {
    const scenarios: IsolationScenario[] = [
      {
        id: "same-team",
        label: "Agregado da equipe vinculada",
        category: "scope",
        kind: "authorization",
        identity,
        resource,
        expectedReason: "allowed",
      },
      {
        id: "other-tenant",
        label: "Leitura em outro tenant",
        category: "tenant",
        kind: "authorization",
        identity,
        resource: { ...resource, tenantId: "tenant-b" },
        expectedReason: "tenant_mismatch",
      },
      {
        id: "blind-write",
        label: "Persistência no tenant da sessão",
        category: "blind_write",
        kind: "persistence",
        session,
        envelope,
        existing: null,
        expectedReason: "insert_required",
      },
    ];

    const result = runIsolationAudit(scenarios);

    expect(result.status).toBe("verified");
    expect(result.passedCaseCount).toBe(3);
    expect(result.categories.every((category) => category.passed)).toBe(true);
  });

  test("a wrong expectation makes the audit fail", () => {
    const result = runIsolationAudit([
      {
        id: "wrong-oracle",
        label: "Expectativa incorreta",
        category: "tenant",
        kind: "authorization",
        identity,
        resource: { ...resource, tenantId: "tenant-b" },
        expectedReason: "allowed",
      },
    ]);

    expect(result.status).toBe("failed");
    expect(result.cases[0]).toMatchObject({
      actualReason: "tenant_mismatch",
      passed: false,
    });
  });

  test("empty suites never pass by vacuity", () => {
    expect(runIsolationAudit([]).status).toBe("failed");
  });
});
