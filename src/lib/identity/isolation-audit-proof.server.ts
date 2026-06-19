import {
  runIsolationAudit,
  type IsolationScenario,
} from "@/engine/security/isolation-audit-engine";
import type {
  AccessGrant,
  IdentityContext,
  ProtectedResource,
} from "@/engine/identity/authorization-engine";
import type {
  CommittedSubmission,
  PersistenceEnvelope,
  PersistenceSession,
} from "@/engine/persistence/response-persistence-engine";

export interface IsolationAuditProof {
  generatedAt: string;
  status: "verified" | "failed";
  rlsDeployed: false;
  enforcement: "policy_oracle";
  productionClaimsAllowed: false;
  caseCount: number;
  passedCaseCount: number;
  categories: ReturnType<typeof runIsolationAudit>["categories"];
  cases: ReturnType<typeof runIsolationAudit>["cases"];
  sensitiveFixturesReturned: false;
}

const teamGrant: AccessGrant = {
  roleId: "LEADER",
  tenantId: "tenant-a",
  permission: "aggregate.read",
  scope: { kind: "team", refId: "team-a" },
  domains: ["A"],
};
const domainBGrant: AccessGrant = {
  roleId: "SST",
  tenantId: "tenant-a",
  permission: "dossier.read",
  scope: { kind: "organization", refId: "org-a" },
  domains: ["B"],
};
const identity: IdentityContext = {
  state: "authenticated",
  subjectId: "subject-a",
  activeTenantId: "tenant-a",
  grants: [teamGrant, domainBGrant],
  evaluatedOn: "2026-06-19",
};
const aggregate: ProtectedResource = {
  id: "team-aggregate",
  tenantId: "tenant-a",
  permission: "aggregate.read",
  action: "read",
  dataClass: "collective",
  domain: "A",
  scopeRefs: { team: "team-a", organization: "org-a" },
};
const selfWriteGrant: AccessGrant = {
  roleId: "MEMBER",
  tenantId: "tenant-a",
  permission: "response.submit",
  scope: { kind: "self", refId: "subject-a" },
};
const persistenceSession: PersistenceSession = {
  authenticated: true,
  subjectId: "subject-a",
  tenantId: "tenant-a",
  organizationId: "org-a",
};
const persistenceEnvelope: PersistenceEnvelope = {
  submissionId: "submission-a",
  tenantId: "tenant-a",
  organizationId: "org-a",
  waveId: "wave-a",
  surveyId: "survey-a",
  itemCount: 12,
};
const committed: CommittedSubmission = {
  idempotencyKey: "response:tenant-a:subject-a:wave-a:submission-a",
  tenantId: "tenant-a",
  organizationId: "org-a",
  subjectId: "subject-a",
  submissionId: "submission-a",
  waveId: "wave-a",
  surveyId: "survey-a",
  itemCount: 12,
  commitId: "commit-a",
  committedAt: "2026-06-19T12:00:00.000Z",
};

function scenarios(): IsolationScenario[] {
  return [
    {
      id: "tenant-read-denied",
      label: "Outro tenant não lê agregado",
      category: "tenant",
      kind: "authorization",
      identity,
      resource: { ...aggregate, tenantId: "tenant-b" },
      expectedReason: "tenant_mismatch",
    },
    {
      id: "tenant-write-denied",
      label: "Payload não troca tenant de persistência",
      category: "tenant",
      kind: "persistence",
      session: persistenceSession,
      envelope: { ...persistenceEnvelope, tenantId: "tenant-b" },
      existing: null,
      expectedReason: "tenant_mismatch",
    },
    {
      id: "same-team-allowed",
      label: "Equipe vinculada lê o próprio agregado",
      category: "scope",
      kind: "authorization",
      identity,
      resource: aggregate,
      expectedReason: "allowed",
    },
    {
      id: "other-team-denied",
      label: "Líder não escapa para outra equipe",
      category: "scope",
      kind: "authorization",
      identity,
      resource: { ...aggregate, scopeRefs: { team: "team-b", organization: "org-a" } },
      expectedReason: "scope_mismatch",
    },
    {
      id: "domain-b-allowed",
      label: "Domínio B exige concessão B explícita",
      category: "domain",
      kind: "authorization",
      identity,
      resource: {
        ...aggregate,
        id: "domain-b-dossier",
        permission: "dossier.read",
        domain: "B",
        scopeRefs: { organization: "org-a" },
      },
      expectedReason: "allowed",
    },
    {
      id: "domain-cross-denied",
      label: "Concessão A não abre recurso B",
      category: "domain",
      kind: "authorization",
      identity: { ...identity, grants: [teamGrant] },
      resource: { ...aggregate, domain: "B" },
      expectedReason: "domain_mismatch",
    },
    {
      id: "individual-read-denied",
      label: "Resposta individual nunca é legível",
      category: "data_class",
      kind: "authorization",
      identity,
      resource: { ...aggregate, dataClass: "individual_response" },
      expectedReason: "individual_response_read_forbidden",
    },
    {
      id: "own-blind-write-allowed",
      label: "Titular pode executar escrita cega própria",
      category: "blind_write",
      kind: "authorization",
      identity: { ...identity, grants: [selfWriteGrant] },
      resource: {
        ...aggregate,
        id: "own-response",
        permission: "response.submit",
        action: "write",
        dataClass: "individual_response",
        domain: undefined,
        ownerSubjectId: "subject-a",
        scopeRefs: { self: "subject-a" },
      },
      expectedReason: "allowed",
    },
    {
      id: "other-blind-write-denied",
      label: "Titular não envia resposta por outra pessoa",
      category: "blind_write",
      kind: "authorization",
      identity: { ...identity, grants: [selfWriteGrant] },
      resource: {
        ...aggregate,
        id: "other-response",
        permission: "response.submit",
        action: "write",
        dataClass: "individual_response",
        domain: undefined,
        ownerSubjectId: "subject-b",
        scopeRefs: { self: "subject-b" },
      },
      expectedReason: "scope_mismatch",
    },
    {
      id: "expired-denied",
      label: "Concessão expirada não autoriza",
      category: "grant_lifecycle",
      kind: "authorization",
      identity: { ...identity, grants: [{ ...teamGrant, expiresOn: "2026-06-18" }] },
      resource: aggregate,
      expectedReason: "grant_expired",
    },
    {
      id: "read-only-write-denied",
      label: "Somente leitura não vira escrita",
      category: "grant_lifecycle",
      kind: "authorization",
      identity: { ...identity, grants: [{ ...teamGrant, readOnly: true }] },
      resource: { ...aggregate, action: "write" },
      expectedReason: "read_only",
    },
    {
      id: "idempotent-replay-allowed",
      label: "Retry idêntico reutiliza o commit",
      category: "idempotency",
      kind: "persistence",
      session: persistenceSession,
      envelope: persistenceEnvelope,
      existing: committed,
      expectedReason: "idempotent_replay",
    },
    {
      id: "idempotency-conflict-denied",
      label: "Chave não é reciclada para outro survey",
      category: "idempotency",
      kind: "persistence",
      session: persistenceSession,
      envelope: { ...persistenceEnvelope, surveyId: "survey-b" },
      existing: committed,
      expectedReason: "submission_conflict",
    },
  ];
}

export function buildIsolationAuditProof(
  generatedAt = new Date().toISOString(),
): IsolationAuditProof {
  const audit = runIsolationAudit(scenarios());
  return {
    generatedAt,
    status: audit.status,
    rlsDeployed: false,
    enforcement: "policy_oracle",
    productionClaimsAllowed: false,
    caseCount: audit.caseCount,
    passedCaseCount: audit.passedCaseCount,
    categories: audit.categories,
    cases: audit.cases,
    sensitiveFixturesReturned: false,
  };
}
