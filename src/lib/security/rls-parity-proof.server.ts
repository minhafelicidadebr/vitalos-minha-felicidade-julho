import type {
  AccessGrant,
  IdentityContext,
  ProtectedResource,
} from "@/engine/identity/authorization-engine";
import {
  auditRlsParity,
  type PolicyDecisionClass,
  type RlsOperation,
  type RlsParityCase,
  type RlsPolicyManifest,
  type RlsRowDescriptor,
} from "@/engine/security/rls-policy-engine";

export interface RlsParityPublicCase {
  id: string;
  label: string;
  expectedClass: PolicyDecisionClass;
  applicationClass: PolicyDecisionClass;
  databaseClass: PolicyDecisionClass;
  passed: boolean;
}

export interface RlsParityProof {
  generatedAt: string;
  status: "verified" | "failed";
  enforcement: "policy_manifest";
  rlsDeployed: false;
  sqlApplied: false;
  productionClaimsAllowed: false;
  manifest: {
    version: string;
    defaultDeny: true;
    ruleCount: number;
    tableCount: number;
  };
  passedCaseCount: number;
  caseCount: number;
  cases: RlsParityPublicCase[];
  sensitivePayloadReturned: false;
}

const MANIFEST: RlsPolicyManifest = {
  version: "2026-06-19.v1",
  defaultDeny: true,
  rules: [
    {
      id: "aggregate-domain-a-select",
      table: "aggregates",
      operation: "select",
      dataClass: "collective",
      permission: "aggregate.read",
      domain: "A",
    },
    {
      id: "domain-b-dossier-select",
      table: "domain_b_dossiers",
      operation: "select",
      dataClass: "collective",
      permission: "domain_b.read",
      domain: "B",
    },
    {
      id: "survey-response-blind-insert",
      table: "survey_responses",
      operation: "insert",
      dataClass: "individual_response",
      permission: "response.submit",
      domain: "A",
      blindWrite: true,
    },
    {
      id: "consent-event-insert",
      table: "consent_events",
      operation: "insert",
      dataClass: "personal",
      permission: "consent.write",
      domain: "A",
    },
    {
      id: "consent-event-select",
      table: "consent_events",
      operation: "select",
      dataClass: "personal",
      permission: "consent.read",
      domain: "A",
    },
    {
      id: "membership-self-select",
      table: "memberships",
      operation: "select",
      dataClass: "personal",
      permission: "membership.read",
    },
  ],
};

const grants: AccessGrant[] = [
  {
    roleId: "fixture-role",
    tenantId: "fixture-tenant-a",
    permission: "aggregate.read",
    scope: { kind: "team", refId: "fixture-team-a" },
    domains: ["A"],
  },
  {
    roleId: "fixture-role",
    tenantId: "fixture-tenant-a",
    permission: "domain_b.read",
    scope: { kind: "organization", refId: "fixture-org-a" },
    domains: ["B"],
    readOnly: true,
  },
  {
    roleId: "fixture-role",
    tenantId: "fixture-tenant-a",
    permission: "response.submit",
    scope: { kind: "self", refId: "fixture-subject-a" },
    domains: ["A"],
  },
  {
    roleId: "fixture-role",
    tenantId: "fixture-tenant-a",
    permission: "consent.write",
    scope: { kind: "self", refId: "fixture-subject-a" },
    domains: ["A"],
  },
  {
    roleId: "fixture-role",
    tenantId: "fixture-tenant-a",
    permission: "consent.read",
    scope: { kind: "self", refId: "fixture-subject-a" },
    domains: ["A"],
  },
  {
    roleId: "fixture-role",
    tenantId: "fixture-tenant-a",
    permission: "membership.read",
    scope: { kind: "self", refId: "fixture-subject-a" },
  },
];

const identity: IdentityContext = {
  state: "authenticated",
  subjectId: "fixture-subject-a",
  activeTenantId: "fixture-tenant-a",
  grants,
  evaluatedOn: "2026-06-19T13:00:00.000Z",
};

function row(
  overrides: Partial<RlsRowDescriptor> & Pick<RlsRowDescriptor, "table" | "dataClass">,
): RlsRowDescriptor {
  return {
    id: "fixture-row",
    tenantId: "fixture-tenant-a",
    scopeRefs: {
      self: "fixture-subject-a",
      team: "fixture-team-a",
      organization: "fixture-org-a",
    },
    ...overrides,
  };
}

function resource(
  rowValue: RlsRowDescriptor,
  permission: string,
  operation: RlsOperation,
): ProtectedResource {
  return {
    id: rowValue.id,
    tenantId: rowValue.tenantId,
    permission,
    action: operation === "select" ? "read" : "write",
    dataClass: rowValue.dataClass,
    domain: rowValue.domain,
    ownerSubjectId: rowValue.ownerSubjectId,
    scopeRefs: rowValue.scopeRefs,
  };
}

function parityCase(
  id: string,
  label: string,
  identityValue: IdentityContext,
  rowValue: RlsRowDescriptor,
  permission: string,
  operation: RlsOperation,
  expectedClass: PolicyDecisionClass,
): RlsParityCase {
  return {
    id,
    label,
    identity: identityValue,
    resource: resource(rowValue, permission, operation),
    row: rowValue,
    operation,
    expectedClass,
  };
}

function cases(): RlsParityCase[] {
  const aggregate = row({
    table: "aggregates",
    dataClass: "collective",
    domain: "A",
  });
  const domainB = row({
    table: "domain_b_dossiers",
    dataClass: "collective",
    domain: "B",
  });
  const ownResponse = row({
    table: "survey_responses",
    dataClass: "individual_response",
    domain: "A",
    ownerSubjectId: "fixture-subject-a",
  });
  const ownConsent = row({
    table: "consent_events",
    dataClass: "personal",
    domain: "A",
    ownerSubjectId: "fixture-subject-a",
  });
  const membership = row({
    table: "memberships",
    dataClass: "personal",
    ownerSubjectId: "fixture-subject-a",
  });

  return [
    parityCase(
      "aggregate-allowed",
      "Agregado do próprio time é permitido",
      identity,
      aggregate,
      "aggregate.read",
      "select",
      "allowed",
    ),
    parityCase(
      "other-tenant-denied",
      "Outro tenant é negado nas duas camadas",
      identity,
      { ...aggregate, tenantId: "fixture-tenant-b" },
      "aggregate.read",
      "select",
      "tenant",
    ),
    parityCase(
      "other-team-denied",
      "Outro time não atravessa o vínculo de escopo",
      identity,
      { ...aggregate, scopeRefs: { ...aggregate.scopeRefs, team: "fixture-team-b" } },
      "aggregate.read",
      "select",
      "scope",
    ),
    parityCase(
      "domain-b-allowed",
      "Domínio B explícito permite o dossiê educativo",
      identity,
      domainB,
      "domain_b.read",
      "select",
      "allowed",
    ),
    parityCase(
      "domain-b-not-in-a",
      "Grant de Domínio A não abre Domínio B",
      {
        ...identity,
        grants: grants.map((grant) =>
          grant.permission === "domain_b.read" ? { ...grant, domains: ["A"] } : grant,
        ),
      },
      domainB,
      "domain_b.read",
      "select",
      "domain",
    ),
    parityCase(
      "domain-b-permission-missing",
      "Sem entitlement de Domínio B não há política útil",
      {
        ...identity,
        grants: grants.filter((grant) => grant.permission !== "domain_b.read"),
      },
      domainB,
      "domain_b.read",
      "select",
      "policy",
    ),
    parityCase(
      "own-response-insert",
      "Resposta própria entra como escrita cega",
      identity,
      ownResponse,
      "response.submit",
      "insert",
      "allowed",
    ),
    parityCase(
      "other-response-insert",
      "Ninguém envia resposta por outra pessoa",
      identity,
      {
        ...ownResponse,
        ownerSubjectId: "fixture-subject-b",
        scopeRefs: { ...ownResponse.scopeRefs, self: "fixture-subject-b" },
      },
      "response.submit",
      "insert",
      "scope",
    ),
    parityCase(
      "raw-response-select",
      "Resposta individual nunca volta por leitura",
      identity,
      ownResponse,
      "response.read",
      "select",
      "privacy",
    ),
    parityCase(
      "expired-grant",
      "Grant expirado é negado igualmente",
      {
        ...identity,
        grants: grants.map((grant) =>
          grant.permission === "aggregate.read"
            ? { ...grant, expiresOn: "2026-06-19T12:00:00.000Z" }
            : grant,
        ),
      },
      aggregate,
      "aggregate.read",
      "select",
      "expiry",
    ),
    parityCase(
      "anonymous-denied",
      "Sessão anônima não alcança dados",
      { ...identity, state: "anonymous", subjectId: null, activeTenantId: null, grants: [] },
      aggregate,
      "aggregate.read",
      "select",
      "identity",
    ),
    parityCase(
      "invalid-identity-denied",
      "Identidade incompleta falha fechado",
      { ...identity, subjectId: null },
      aggregate,
      "aggregate.read",
      "select",
      "identity",
    ),
    parityCase(
      "consent-insert",
      "Titular registra sua própria decisão de consentimento",
      identity,
      ownConsent,
      "consent.write",
      "insert",
      "allowed",
    ),
    parityCase(
      "consent-read",
      "Titular lê a projeção do próprio Consent Ledger",
      identity,
      ownConsent,
      "consent.read",
      "select",
      "allowed",
    ),
    parityCase(
      "other-consent-denied",
      "Consentimento de outra pessoa não atravessa o escopo",
      identity,
      {
        ...ownConsent,
        ownerSubjectId: "fixture-subject-b",
        scopeRefs: { ...ownConsent.scopeRefs, self: "fixture-subject-b" },
      },
      "consent.read",
      "select",
      "scope",
    ),
    parityCase(
      "membership-self-read",
      "Pessoa lê somente a própria membership",
      identity,
      membership,
      "membership.read",
      "select",
      "allowed",
    ),
  ];
}

export function buildRlsParityProof(generatedAt = new Date().toISOString()): RlsParityProof {
  const audit = auditRlsParity(MANIFEST, cases());
  return {
    generatedAt,
    status: audit.status,
    enforcement: "policy_manifest",
    rlsDeployed: false,
    sqlApplied: false,
    productionClaimsAllowed: false,
    manifest: {
      version: MANIFEST.version,
      defaultDeny: MANIFEST.defaultDeny,
      ruleCount: MANIFEST.rules.length,
      tableCount: new Set(MANIFEST.rules.map((rule) => rule.table)).size,
    },
    passedCaseCount: audit.passedCaseCount,
    caseCount: audit.caseCount,
    cases: audit.cases.map((item) => ({
      id: item.id,
      label: item.label,
      expectedClass: item.expectedClass,
      applicationClass: item.applicationClass,
      databaseClass: item.databaseClass,
      passed: item.passed,
    })),
    sensitivePayloadReturned: false,
  };
}
