export type IdentityState = "anonymous" | "authenticated";
export type AccessAction = "read" | "write";
export type DataClass = "public" | "collective" | "personal" | "individual_response";
export type IdentityMode = "demo" | "cloud";
export type IdentityBoundaryState = "demo" | "cloud" | "blocked";

export interface ScopeBinding {
  kind: string;
  refId: string;
}

export interface AccessGrant {
  roleId: string;
  tenantId: string;
  permission: string;
  scope: ScopeBinding;
  domains?: readonly string[];
  readOnly?: boolean;
  expiresOn?: string;
}

export interface IdentityContext {
  state: IdentityState;
  subjectId: string | null;
  activeTenantId: string | null;
  grants: readonly AccessGrant[];
  evaluatedOn: string;
}

export interface ProtectedResource {
  id: string;
  tenantId: string;
  permission: string;
  action: AccessAction;
  dataClass: DataClass;
  domain?: string;
  ownerSubjectId?: string;
  scopeRefs: Readonly<Record<string, string>>;
}

export type AuthorizationReason =
  | "allowed"
  | "anonymous"
  | "invalid_identity"
  | "tenant_mismatch"
  | "individual_response_read_forbidden"
  | "permission_missing"
  | "grant_expired"
  | "domain_mismatch"
  | "scope_mismatch"
  | "read_only";

export interface AuthorizationDecision {
  allowed: boolean;
  reason: AuthorizationReason;
  resourceId: string;
  matchedGrant: AccessGrant | null;
}

export interface IdentityBoundaryStatus {
  requestedMode: IdentityMode;
  state: IdentityBoundaryState;
  realAuthentication: boolean;
  serverEnforced: boolean;
  reason: "demo_isolated" | "cloud_ready" | "cloud_adapter_missing";
}

function decision(
  resource: ProtectedResource,
  reason: AuthorizationReason,
  matchedGrant: AccessGrant | null = null,
): AuthorizationDecision {
  return {
    allowed: reason === "allowed",
    reason,
    resourceId: resource.id,
    matchedGrant,
  };
}

function isExpired(grant: AccessGrant, evaluatedOn: string): boolean {
  if (!grant.expiresOn) return false;
  return Date.parse(grant.expiresOn) < Date.parse(evaluatedOn);
}

function scopeMatches(
  identity: IdentityContext,
  grant: AccessGrant,
  resource: ProtectedResource,
): boolean {
  if (grant.scope.kind === "platform") return grant.scope.refId === "*";

  if (grant.scope.kind === "self") {
    return (
      resource.ownerSubjectId === identity.subjectId &&
      (grant.scope.refId === "*" || grant.scope.refId === identity.subjectId)
    );
  }

  const resourceRef =
    resource.scopeRefs[grant.scope.kind] ??
    (grant.scope.kind === "scoped_reports" ? resource.id : undefined);
  return grant.scope.refId === "*" || resourceRef === grant.scope.refId;
}

/**
 * Pure authorization decision. It assumes grants were issued by a trusted
 * identity provider; it never derives privilege from client-selected labels.
 */
export function authorizeResource(
  identity: IdentityContext,
  resource: ProtectedResource,
): AuthorizationDecision {
  if (identity.state !== "authenticated") return decision(resource, "anonymous");
  if (!identity.subjectId || !identity.activeTenantId) {
    return decision(resource, "invalid_identity");
  }
  if (identity.activeTenantId !== resource.tenantId) {
    return decision(resource, "tenant_mismatch");
  }
  if (resource.dataClass === "individual_response" && resource.action === "read") {
    return decision(resource, "individual_response_read_forbidden");
  }

  const permissionGrants = identity.grants.filter(
    (grant) =>
      grant.tenantId === identity.activeTenantId && grant.permission === resource.permission,
  );
  if (permissionGrants.length === 0) return decision(resource, "permission_missing");

  const activeGrants = permissionGrants.filter((grant) => !isExpired(grant, identity.evaluatedOn));
  if (activeGrants.length === 0) return decision(resource, "grant_expired");

  const domainGrants = resource.domain
    ? activeGrants.filter((grant) => grant.domains?.includes(resource.domain!))
    : activeGrants;
  if (domainGrants.length === 0) return decision(resource, "domain_mismatch");

  const scopedGrants = domainGrants.filter((grant) => scopeMatches(identity, grant, resource));
  if (scopedGrants.length === 0) return decision(resource, "scope_mismatch");

  const writableGrant =
    resource.action === "write" ? scopedGrants.find((grant) => !grant.readOnly) : scopedGrants[0];
  if (!writableGrant) return decision(resource, "read_only", scopedGrants[0] ?? null);

  return decision(resource, "allowed", writableGrant);
}

export function authorizeResources(
  identity: IdentityContext,
  resources: readonly ProtectedResource[],
): AuthorizationDecision[] {
  return resources.map((resource) => authorizeResource(identity, resource));
}

/**
 * Cloud mode only becomes active when an actual adapter is present. Merely
 * setting an environment flag can never turn demo identity into "real auth".
 */
export function resolveIdentityBoundary(
  requestedMode: IdentityMode,
  cloudAdapterAvailable: boolean,
): IdentityBoundaryStatus {
  if (requestedMode === "cloud" && !cloudAdapterAvailable) {
    return {
      requestedMode,
      state: "blocked",
      realAuthentication: false,
      serverEnforced: false,
      reason: "cloud_adapter_missing",
    };
  }

  if (requestedMode === "cloud") {
    return {
      requestedMode,
      state: "cloud",
      realAuthentication: true,
      serverEnforced: true,
      reason: "cloud_ready",
    };
  }

  return {
    requestedMode,
    state: "demo",
    realAuthentication: false,
    serverEnforced: false,
    reason: "demo_isolated",
  };
}
