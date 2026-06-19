export type MembershipStatus = "active" | "suspended" | "revoked";

export interface VerifiedSessionClaims {
  adapter: string;
  verificationPerformed: boolean;
  signatureVerified: boolean;
  issuer: string;
  audience: string;
  subjectId: string;
  sessionId: string;
  authMethod: string;
  issuedAt: string;
  expiresAt: string;
}

export interface TenantMembership {
  subjectId: string;
  tenantId: string;
  organizationId: string;
  roleIds: readonly string[];
  status: MembershipStatus;
  validFrom: string;
  expiresAt?: string;
}

export interface SessionTrustPolicy {
  expectedAdapter: string;
  expectedIssuer: string;
  expectedAudience: string;
  evaluatedAt: string;
  maxSessionAgeSeconds: number;
}

export interface ResolveTrustedSessionInput {
  claims: VerifiedSessionClaims;
  memberships: readonly TenantMembership[];
  requestedTenantId?: string;
  policy: SessionTrustPolicy;
}

export type SessionTrustReason =
  | "trusted"
  | "adapter_mismatch"
  | "verification_missing"
  | "signature_invalid"
  | "issuer_mismatch"
  | "audience_mismatch"
  | "invalid_claims"
  | "session_not_yet_valid"
  | "session_expired"
  | "session_too_old"
  | "membership_missing"
  | "membership_inactive"
  | "membership_not_yet_valid"
  | "membership_expired"
  | "tenant_selection_required"
  | "membership_ambiguous";

export interface TrustedSessionContext {
  source: "server_adapter";
  subjectId: string;
  activeTenantId: string;
  organizationId: string;
  roleIds: string[];
  authMethod: string;
  sessionExpiresAt: string;
}

export interface SessionTrustDecision {
  trusted: boolean;
  reason: SessionTrustReason;
  context: TrustedSessionContext | null;
}

function denied(reason: Exclude<SessionTrustReason, "trusted">): SessionTrustDecision {
  return { trusted: false, reason, context: null };
}

function parseTimestamp(value: string): number | null {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function isNonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

function activeAt(membership: TenantMembership, evaluatedAt: number): SessionTrustReason | null {
  if (membership.status !== "active") return "membership_inactive";

  const validFrom = parseTimestamp(membership.validFrom);
  if (validFrom === null) return "invalid_claims";
  if (validFrom > evaluatedAt) return "membership_not_yet_valid";

  if (membership.expiresAt) {
    const expiresAt = parseTimestamp(membership.expiresAt);
    if (expiresAt === null) return "invalid_claims";
    if (expiresAt <= evaluatedAt) return "membership_expired";
  }

  return null;
}

/**
 * Converts claims already verified by a server-side identity adapter into the
 * smallest trusted tenant context. Raw tokens, response content and client
 * persona state are deliberately outside this contract.
 */
export function resolveTrustedSession(input: ResolveTrustedSessionInput): SessionTrustDecision {
  const { claims, memberships, policy } = input;

  if (claims.adapter !== policy.expectedAdapter) return denied("adapter_mismatch");
  if (!claims.verificationPerformed) return denied("verification_missing");
  if (!claims.signatureVerified) return denied("signature_invalid");
  if (claims.issuer !== policy.expectedIssuer) return denied("issuer_mismatch");
  if (claims.audience !== policy.expectedAudience) return denied("audience_mismatch");
  if (
    !isNonEmpty(claims.subjectId) ||
    !isNonEmpty(claims.sessionId) ||
    !isNonEmpty(claims.authMethod) ||
    policy.maxSessionAgeSeconds <= 0
  ) {
    return denied("invalid_claims");
  }

  const evaluatedAt = parseTimestamp(policy.evaluatedAt);
  const issuedAt = parseTimestamp(claims.issuedAt);
  const expiresAt = parseTimestamp(claims.expiresAt);
  if (evaluatedAt === null || issuedAt === null || expiresAt === null || expiresAt <= issuedAt) {
    return denied("invalid_claims");
  }
  if (issuedAt > evaluatedAt) return denied("session_not_yet_valid");
  if (expiresAt <= evaluatedAt) return denied("session_expired");
  if (evaluatedAt - issuedAt > policy.maxSessionAgeSeconds * 1_000) {
    return denied("session_too_old");
  }

  const subjectMemberships = memberships.filter(
    (membership) => membership.subjectId === claims.subjectId,
  );
  if (subjectMemberships.length === 0) return denied("membership_missing");

  const requestedTenantId = input.requestedTenantId?.trim();
  const tenantCandidates = requestedTenantId
    ? subjectMemberships.filter((membership) => membership.tenantId === requestedTenantId)
    : subjectMemberships;
  if (tenantCandidates.length === 0) return denied("membership_missing");

  const eligible: TenantMembership[] = [];
  let firstMembershipFailure: SessionTrustReason | null = null;
  for (const membership of tenantCandidates) {
    const failure = activeAt(membership, evaluatedAt);
    if (failure) {
      firstMembershipFailure ??= failure;
    } else {
      eligible.push(membership);
    }
  }
  if (eligible.length === 0) {
    return denied(
      (firstMembershipFailure ?? "membership_missing") as Exclude<SessionTrustReason, "trusted">,
    );
  }

  const tenantIds = [...new Set(eligible.map((membership) => membership.tenantId))];
  if (!requestedTenantId && tenantIds.length > 1) return denied("tenant_selection_required");

  const selectedTenantId = requestedTenantId ?? tenantIds[0]!;
  const selected = eligible.filter((membership) => membership.tenantId === selectedTenantId);
  const organizations = [...new Set(selected.map((membership) => membership.organizationId))];
  if (organizations.length !== 1) return denied("membership_ambiguous");

  return {
    trusted: true,
    reason: "trusted",
    context: {
      source: "server_adapter",
      subjectId: claims.subjectId,
      activeTenantId: selectedTenantId,
      organizationId: organizations[0]!,
      roleIds: [...new Set(selected.flatMap((membership) => membership.roleIds))].sort(),
      authMethod: claims.authMethod,
      sessionExpiresAt: claims.expiresAt,
    },
  };
}
