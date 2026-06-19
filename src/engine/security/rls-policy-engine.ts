import {
  authorizeResource,
  type AccessGrant,
  type AuthorizationReason,
  type DataClass,
  type IdentityContext,
  type ProtectedResource,
} from "../identity/authorization-engine";

export type RlsOperation = "select" | "insert" | "update" | "delete";

export interface RlsPolicyRule {
  id: string;
  table: string;
  operation: RlsOperation;
  dataClass: DataClass;
  permission: string;
  domain?: string;
  blindWrite?: boolean;
}

export interface RlsPolicyManifest {
  version: string;
  defaultDeny: true;
  rules: readonly RlsPolicyRule[];
}

export interface RlsRowDescriptor {
  id: string;
  table: string;
  tenantId: string;
  dataClass: DataClass;
  domain?: string;
  ownerSubjectId?: string;
  scopeRefs: Readonly<Record<string, string>>;
}

export type RlsDecisionReason =
  | "allowed"
  | "anonymous"
  | "invalid_identity"
  | "tenant_mismatch"
  | "raw_response_read_forbidden"
  | "policy_missing"
  | "permission_missing"
  | "grant_expired"
  | "domain_mismatch"
  | "scope_mismatch"
  | "read_only"
  | "blind_write_owner_mismatch";

export interface RlsPolicyDecision {
  allowed: boolean;
  reason: RlsDecisionReason;
  matchedPolicyId: string | null;
}

export type PolicyDecisionClass =
  | "allowed"
  | "identity"
  | "tenant"
  | "privacy"
  | "policy"
  | "expiry"
  | "domain"
  | "scope"
  | "write";

export interface RlsParityCase {
  id: string;
  label: string;
  identity: IdentityContext;
  resource: ProtectedResource;
  row: RlsRowDescriptor;
  operation: RlsOperation;
  expectedClass: PolicyDecisionClass;
}

export interface RlsParityCaseResult {
  id: string;
  label: string;
  expectedClass: PolicyDecisionClass;
  applicationClass: PolicyDecisionClass;
  databaseClass: PolicyDecisionClass;
  applicationAllowed: boolean;
  databaseAllowed: boolean;
  passed: boolean;
}

export interface RlsParityAudit {
  status: "verified" | "failed";
  caseCount: number;
  passedCaseCount: number;
  cases: RlsParityCaseResult[];
}

function decision(
  reason: RlsDecisionReason,
  matchedPolicyId: string | null = null,
): RlsPolicyDecision {
  return { allowed: reason === "allowed", reason, matchedPolicyId };
}

function isExpired(grant: AccessGrant, evaluatedOn: string): boolean {
  if (!grant.expiresOn) return false;
  return Date.parse(grant.expiresOn) < Date.parse(evaluatedOn);
}

function scopeMatches(
  identity: IdentityContext,
  grant: AccessGrant,
  row: RlsRowDescriptor,
): boolean {
  if (grant.scope.kind === "platform") return grant.scope.refId === "*";
  if (grant.scope.kind === "self") {
    return (
      row.ownerSubjectId === identity.subjectId &&
      (grant.scope.refId === "*" || grant.scope.refId === identity.subjectId)
    );
  }
  const rowRef = row.scopeRefs[grant.scope.kind];
  return grant.scope.refId === "*" || rowRef === grant.scope.refId;
}

/**
 * Provider-neutral RLS semantics. It mirrors what future database policies must
 * enforce, but does not generate SQL or claim that a database policy exists.
 */
export function evaluateRlsPolicy(
  identity: IdentityContext,
  row: RlsRowDescriptor,
  operation: RlsOperation,
  manifest: RlsPolicyManifest,
): RlsPolicyDecision {
  if (identity.state !== "authenticated") return decision("anonymous");
  if (!identity.subjectId || !identity.activeTenantId) return decision("invalid_identity");
  if (identity.activeTenantId !== row.tenantId) return decision("tenant_mismatch");
  if (row.dataClass === "individual_response" && operation === "select") {
    return decision("raw_response_read_forbidden");
  }

  const policy = manifest.rules.find(
    (rule) =>
      rule.table === row.table &&
      rule.operation === operation &&
      rule.dataClass === row.dataClass &&
      (rule.domain === undefined || rule.domain === row.domain),
  );
  if (!policy) return decision("policy_missing");

  if (policy.blindWrite && operation === "insert" && row.ownerSubjectId !== identity.subjectId) {
    return decision("blind_write_owner_mismatch", policy.id);
  }

  const permissionGrants = identity.grants.filter(
    (grant) => grant.tenantId === identity.activeTenantId && grant.permission === policy.permission,
  );
  if (permissionGrants.length === 0) return decision("permission_missing", policy.id);

  const activeGrants = permissionGrants.filter((grant) => !isExpired(grant, identity.evaluatedOn));
  if (activeGrants.length === 0) return decision("grant_expired", policy.id);

  const domainGrants = policy.domain
    ? activeGrants.filter((grant) => grant.domains?.includes(policy.domain!))
    : activeGrants;
  if (domainGrants.length === 0) return decision("domain_mismatch", policy.id);

  const scopedGrants = domainGrants.filter((grant) => scopeMatches(identity, grant, row));
  if (scopedGrants.length === 0) return decision("scope_mismatch", policy.id);

  const isWrite = operation !== "select";
  const writableGrant = isWrite ? scopedGrants.find((grant) => !grant.readOnly) : scopedGrants[0];
  if (!writableGrant) return decision("read_only", policy.id);

  return decision("allowed", policy.id);
}

export function normalizeAuthorizationReason(reason: AuthorizationReason): PolicyDecisionClass {
  const classes: Record<AuthorizationReason, PolicyDecisionClass> = {
    allowed: "allowed",
    anonymous: "identity",
    invalid_identity: "identity",
    tenant_mismatch: "tenant",
    individual_response_read_forbidden: "privacy",
    permission_missing: "policy",
    grant_expired: "expiry",
    domain_mismatch: "domain",
    scope_mismatch: "scope",
    read_only: "write",
  };
  return classes[reason];
}

export function normalizeRlsReason(reason: RlsDecisionReason): PolicyDecisionClass {
  const classes: Record<RlsDecisionReason, PolicyDecisionClass> = {
    allowed: "allowed",
    anonymous: "identity",
    invalid_identity: "identity",
    tenant_mismatch: "tenant",
    raw_response_read_forbidden: "privacy",
    policy_missing: "policy",
    permission_missing: "policy",
    grant_expired: "expiry",
    domain_mismatch: "domain",
    scope_mismatch: "scope",
    read_only: "write",
    blind_write_owner_mismatch: "scope",
  };
  return classes[reason];
}

export function auditRlsParity(
  manifest: RlsPolicyManifest,
  cases: readonly RlsParityCase[],
): RlsParityAudit {
  const results = cases.map((scenario): RlsParityCaseResult => {
    const application = authorizeResource(scenario.identity, scenario.resource);
    const database = evaluateRlsPolicy(
      scenario.identity,
      scenario.row,
      scenario.operation,
      manifest,
    );
    const applicationClass = normalizeAuthorizationReason(application.reason);
    const databaseClass = normalizeRlsReason(database.reason);
    const passed =
      application.allowed === database.allowed &&
      applicationClass === databaseClass &&
      databaseClass === scenario.expectedClass;

    return {
      id: scenario.id,
      label: scenario.label,
      expectedClass: scenario.expectedClass,
      applicationClass,
      databaseClass,
      applicationAllowed: application.allowed,
      databaseAllowed: database.allowed,
      passed,
    };
  });
  const passedCaseCount = results.filter((item) => item.passed).length;
  return {
    status: results.length > 0 && passedCaseCount === results.length ? "verified" : "failed",
    caseCount: results.length,
    passedCaseCount,
    cases: results,
  };
}
