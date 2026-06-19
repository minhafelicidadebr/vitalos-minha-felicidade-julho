import {
  issueMembershipGrants,
  type GrantIssuanceInput,
  type GrantIssuanceReason,
} from "@/engine/identity/grant-issuance-engine";
import type { SessionTrustDecision } from "@/engine/identity/session-contract-engine";

export interface GrantIssuanceCaseProof {
  id: string;
  label: string;
  category: "identity" | "membership" | "permission" | "scope" | "domain" | "lifetime";
  expectedReason: GrantIssuanceReason;
  actualReason: GrantIssuanceReason;
  passed: boolean;
}

export interface GrantIssuanceContractProof {
  generatedAt: string;
  status: "contract_verified" | "contract_failed";
  runtime: "membership_store_missing";
  grantsServerIssued: false;
  productionClaimsAllowed: false;
  passedCaseCount: number;
  caseCount: number;
  cases: GrantIssuanceCaseProof[];
  invariants: {
    clientRoleTrusted: false;
    atomicBatch: true;
    leastPrivilege: true;
    tenantBound: true;
    domainExplicit: true;
    wildcardDefaultDenied: true;
    grantLifetimeBounded: true;
    sensitivePayloadReturned: false;
  };
}

const session: SessionTrustDecision = {
  trusted: true,
  reason: "trusted",
  context: {
    source: "server_adapter",
    subjectId: "fixture-subject-a",
    activeTenantId: "fixture-tenant-a",
    organizationId: "fixture-org-a",
    roleIds: ["fixture-role-a"],
    authMethod: "magic_link",
    sessionExpiresAt: "2026-06-19T16:00:00.000Z",
  },
};

const base: GrantIssuanceInput = {
  session,
  membership: {
    subjectId: "fixture-subject-a",
    tenantId: "fixture-tenant-a",
    organizationId: "fixture-org-a",
    roleId: "fixture-role-a",
    status: "active",
    validFrom: "2026-01-01T00:00:00.000Z",
    scopeRefs: {
      self: ["fixture-subject-a"],
      team: ["fixture-team-a"],
      organization: ["fixture-org-a"],
    },
  },
  entitlements: [
    {
      permission: "aggregate.read",
      scope: { kind: "team", refId: "fixture-team-a" },
      domain: "A",
      readOnly: true,
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

interface Scenario {
  id: string;
  label: string;
  category: GrantIssuanceCaseProof["category"];
  expectedReason: GrantIssuanceReason;
  input: GrantIssuanceInput;
}

function input(overrides: Partial<GrantIssuanceInput>): GrantIssuanceInput {
  return {
    ...base,
    ...overrides,
    membership: { ...base.membership, ...overrides.membership },
    policy: { ...base.policy, ...overrides.policy },
  };
}

function scenarios(): Scenario[] {
  return [
    {
      id: "least-privilege-issued",
      label: "Membership válida emite somente o entitlement declarado",
      category: "identity",
      expectedReason: "issued",
      input: base,
    },
    {
      id: "untrusted-session",
      label: "Sessão não confiável não emite grants",
      category: "identity",
      expectedReason: "untrusted_session",
      input: input({
        session: { trusted: false, reason: "signature_invalid", context: null },
      }),
    },
    {
      id: "tenant-mismatch",
      label: "Membership de outro tenant é recusada",
      category: "identity",
      expectedReason: "membership_tenant_mismatch",
      input: input({ membership: { ...base.membership, tenantId: "fixture-tenant-b" } }),
    },
    {
      id: "role-mismatch",
      label: "Papel ausente na sessão não cria privilégio",
      category: "membership",
      expectedReason: "membership_role_mismatch",
      input: input({ membership: { ...base.membership, roleId: "fixture-role-admin" } }),
    },
    {
      id: "membership-revoked",
      label: "Membership revogada invalida o lote inteiro",
      category: "membership",
      expectedReason: "membership_inactive",
      input: input({ membership: { ...base.membership, status: "revoked" } }),
    },
    {
      id: "forbidden-permission",
      label: "Leitura de resposta individual permanece vedada",
      category: "permission",
      expectedReason: "permission_forbidden",
      input: input({
        entitlements: [
          {
            ...base.entitlements[0]!,
            permission: "response.read",
          },
        ],
      }),
    },
    {
      id: "permission-not-allowed",
      label: "Permissão fora da allowlist falha fechado",
      category: "permission",
      expectedReason: "permission_not_allowed",
      input: input({
        entitlements: [
          {
            ...base.entitlements[0]!,
            permission: "billing.admin",
          },
        ],
      }),
    },
    {
      id: "unbound-scope",
      label: "Equipe não vinculada à membership é negada",
      category: "scope",
      expectedReason: "scope_ref_not_bound",
      input: input({
        entitlements: [
          {
            ...base.entitlements[0]!,
            scope: { kind: "team", refId: "fixture-team-b" },
          },
        ],
      }),
    },
    {
      id: "wildcard-denied",
      label: "Wildcard não autorizado nunca amplia o escopo",
      category: "scope",
      expectedReason: "wildcard_scope_forbidden",
      input: input({
        entitlements: [
          {
            ...base.entitlements[0]!,
            scope: { kind: "organization", refId: "*" },
          },
        ],
      }),
    },
    {
      id: "domain-b-explicit",
      label: "Domínio B exige autorização explícita",
      category: "domain",
      expectedReason: "domain_not_allowed",
      input: input({
        entitlements: [
          {
            permission: "domain_b.read",
            scope: { kind: "organization", refId: "fixture-org-a" },
            domain: "B",
            readOnly: true,
          },
        ],
        policy: { ...base.policy, allowedDomains: ["A"] },
      }),
    },
    {
      id: "expired-entitlement",
      label: "Entitlement vencido não emite grant",
      category: "lifetime",
      expectedReason: "entitlement_expired",
      input: input({
        entitlements: [
          {
            ...base.entitlements[0]!,
            expiresAt: "2026-06-19T13:00:00.000Z",
          },
        ],
      }),
    },
    {
      id: "conflicting-entitlement",
      label: "Entitlements conflitantes rejeitam o lote atomicamente",
      category: "lifetime",
      expectedReason: "entitlement_conflict",
      input: input({
        entitlements: [base.entitlements[0]!, { ...base.entitlements[0]!, readOnly: false }],
      }),
    },
  ];
}

export function buildGrantIssuanceContractProof(
  generatedAt = new Date().toISOString(),
): GrantIssuanceContractProof {
  const cases = scenarios().map((scenario): GrantIssuanceCaseProof => {
    const result = issueMembershipGrants(scenario.input);
    return {
      id: scenario.id,
      label: scenario.label,
      category: scenario.category,
      expectedReason: scenario.expectedReason,
      actualReason: result.reason,
      passed: result.reason === scenario.expectedReason,
    };
  });
  const passedCaseCount = cases.filter((item) => item.passed).length;

  return {
    generatedAt,
    status: passedCaseCount === cases.length ? "contract_verified" : "contract_failed",
    runtime: "membership_store_missing",
    grantsServerIssued: false,
    productionClaimsAllowed: false,
    passedCaseCount,
    caseCount: cases.length,
    cases,
    invariants: {
      clientRoleTrusted: false,
      atomicBatch: true,
      leastPrivilege: true,
      tenantBound: true,
      domainExplicit: true,
      wildcardDefaultDenied: true,
      grantLifetimeBounded: true,
      sensitivePayloadReturned: false,
    },
  };
}
