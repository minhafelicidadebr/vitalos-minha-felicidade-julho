import type { AccessGrant, ScopeBinding } from "./authorization-engine";
import type { SessionTrustDecision } from "./session-contract-engine";

export interface GrantMembershipProfile {
  subjectId: string;
  tenantId: string;
  organizationId: string;
  roleId: string;
  status: "active" | "suspended" | "revoked";
  validFrom: string;
  expiresAt?: string;
  scopeRefs: Readonly<Record<string, readonly string[]>>;
}

export interface GrantEntitlement {
  permission: string;
  scope: ScopeBinding;
  domain?: string;
  readOnly?: boolean;
  expiresAt?: string;
}

export interface GrantIssuancePolicy {
  evaluatedAt: string;
  maxGrantLifetimeSeconds: number;
  allowedPermissions: readonly string[];
  forbiddenPermissions: readonly string[];
  allowedDomains: readonly string[];
  allowedScopeKinds: readonly string[];
  wildcardScopeKinds: readonly string[];
}

export interface GrantIssuanceInput {
  session: SessionTrustDecision;
  membership: GrantMembershipProfile;
  entitlements: readonly GrantEntitlement[];
  policy: GrantIssuancePolicy;
}

export interface IssuedAccessGrant extends AccessGrant {
  source: "membership_policy";
  issuedAt: string;
}

export type GrantIssuanceReason =
  | "issued"
  | "untrusted_session"
  | "membership_identity_mismatch"
  | "membership_tenant_mismatch"
  | "membership_organization_mismatch"
  | "membership_role_mismatch"
  | "membership_inactive"
  | "membership_not_yet_valid"
  | "membership_expired"
  | "invalid_policy"
  | "empty_entitlements"
  | "permission_forbidden"
  | "permission_not_allowed"
  | "scope_kind_not_allowed"
  | "scope_ref_not_bound"
  | "wildcard_scope_forbidden"
  | "domain_not_allowed"
  | "entitlement_expired"
  | "entitlement_conflict";

export interface GrantIssuanceResult {
  issued: boolean;
  reason: GrantIssuanceReason;
  grants: IssuedAccessGrant[];
  rejectedEntitlementIndex: number | null;
}

function rejected(
  reason: Exclude<GrantIssuanceReason, "issued">,
  rejectedEntitlementIndex: number | null = null,
): GrantIssuanceResult {
  return { issued: false, reason, grants: [], rejectedEntitlementIndex };
}

function parseTimestamp(value: string): number | null {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function nonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

function minTimestamp(values: number[]): number {
  return values.reduce((minimum, value) => Math.min(minimum, value), values[0]!);
}

function entitlementKey(entitlement: GrantEntitlement): string {
  return [
    entitlement.permission,
    entitlement.scope.kind,
    entitlement.scope.refId,
    entitlement.domain ?? "*",
  ].join("|");
}

/**
 * Issues least-privilege grants from a trusted session and a server-side
 * membership profile. Entitlements are atomic: one invalid entry rejects the
 * entire batch, so partial privilege can never be inferred.
 */
export function issueMembershipGrants(input: GrantIssuanceInput): GrantIssuanceResult {
  const context = input.session.context;
  if (!input.session.trusted || !context) return rejected("untrusted_session");

  const { membership, policy } = input;
  if (membership.subjectId !== context.subjectId) {
    return rejected("membership_identity_mismatch");
  }
  if (membership.tenantId !== context.activeTenantId) {
    return rejected("membership_tenant_mismatch");
  }
  if (membership.organizationId !== context.organizationId) {
    return rejected("membership_organization_mismatch");
  }
  if (!context.roleIds.includes(membership.roleId)) {
    return rejected("membership_role_mismatch");
  }
  if (membership.status !== "active") return rejected("membership_inactive");

  const evaluatedAt = parseTimestamp(policy.evaluatedAt);
  const membershipValidFrom = parseTimestamp(membership.validFrom);
  const sessionExpiresAt = parseTimestamp(context.sessionExpiresAt);
  if (
    evaluatedAt === null ||
    membershipValidFrom === null ||
    sessionExpiresAt === null ||
    policy.maxGrantLifetimeSeconds <= 0 ||
    policy.allowedPermissions.length === 0 ||
    policy.allowedScopeKinds.length === 0
  ) {
    return rejected("invalid_policy");
  }
  if (membershipValidFrom > evaluatedAt) return rejected("membership_not_yet_valid");

  let membershipExpiresAt: number | null = null;
  if (membership.expiresAt) {
    membershipExpiresAt = parseTimestamp(membership.expiresAt);
    if (membershipExpiresAt === null) return rejected("invalid_policy");
    if (membershipExpiresAt <= evaluatedAt) return rejected("membership_expired");
  }
  if (input.entitlements.length === 0) return rejected("empty_entitlements");

  const seen = new Map<string, GrantEntitlement>();
  const grants: IssuedAccessGrant[] = [];

  for (const [index, entitlement] of input.entitlements.entries()) {
    if (!nonEmpty(entitlement.permission)) return rejected("permission_not_allowed", index);
    if (policy.forbiddenPermissions.includes(entitlement.permission)) {
      return rejected("permission_forbidden", index);
    }
    if (!policy.allowedPermissions.includes(entitlement.permission)) {
      return rejected("permission_not_allowed", index);
    }
    if (!policy.allowedScopeKinds.includes(entitlement.scope.kind)) {
      return rejected("scope_kind_not_allowed", index);
    }
    if (
      entitlement.scope.refId === "*" &&
      !policy.wildcardScopeKinds.includes(entitlement.scope.kind)
    ) {
      return rejected("wildcard_scope_forbidden", index);
    }

    const boundRefs = membership.scopeRefs[entitlement.scope.kind] ?? [];
    const scopeBound =
      entitlement.scope.refId === "*"
        ? policy.wildcardScopeKinds.includes(entitlement.scope.kind)
        : boundRefs.includes(entitlement.scope.refId);
    if (!scopeBound) return rejected("scope_ref_not_bound", index);

    if (entitlement.domain && !policy.allowedDomains.includes(entitlement.domain)) {
      return rejected("domain_not_allowed", index);
    }

    let entitlementExpiresAt: number | null = null;
    if (entitlement.expiresAt) {
      entitlementExpiresAt = parseTimestamp(entitlement.expiresAt);
      if (entitlementExpiresAt === null) return rejected("invalid_policy", index);
      if (entitlementExpiresAt <= evaluatedAt) return rejected("entitlement_expired", index);
    }

    const key = entitlementKey(entitlement);
    const previous = seen.get(key);
    if (previous) {
      if (
        Boolean(previous.readOnly) !== Boolean(entitlement.readOnly) ||
        previous.expiresAt !== entitlement.expiresAt
      ) {
        return rejected("entitlement_conflict", index);
      }
      continue;
    }
    seen.set(key, entitlement);

    const expiryCandidates = [
      sessionExpiresAt,
      evaluatedAt + policy.maxGrantLifetimeSeconds * 1_000,
      ...(membershipExpiresAt === null ? [] : [membershipExpiresAt]),
      ...(entitlementExpiresAt === null ? [] : [entitlementExpiresAt]),
    ];
    const expiresOn = new Date(minTimestamp(expiryCandidates)).toISOString();

    grants.push({
      roleId: membership.roleId,
      tenantId: membership.tenantId,
      permission: entitlement.permission,
      scope: { ...entitlement.scope },
      domains: entitlement.domain ? [entitlement.domain] : undefined,
      readOnly: entitlement.readOnly,
      expiresOn,
      source: "membership_policy",
      issuedAt: policy.evaluatedAt,
    });
  }

  return {
    issued: true,
    reason: "issued",
    grants,
    rejectedEntitlementIndex: null,
  };
}
