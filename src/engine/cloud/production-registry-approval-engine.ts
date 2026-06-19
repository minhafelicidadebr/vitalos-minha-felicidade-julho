import { authorizeResource, type IdentityContext } from "@/engine/identity/authorization-engine";
import type { IssuedAccessGrant } from "@/engine/identity/grant-issuance-engine";
import type { SessionTrustDecision } from "@/engine/identity/session-contract-engine";
import type {
  RegistryMutationAction,
  VerifiedRegistryApproval,
} from "./production-key-registry-engine";

export interface RegistryApprovalRequest {
  schema: "vitalos.key-registry-approval-request.v1";
  registryId: string;
  proposalDigest: string;
  action: RegistryMutationAction;
  keyId: string;
  nonce: string;
  requestedAt: string;
  expiresAt: string;
}

export interface RegistryApprovalPolicy {
  issuer: string;
  audience: string;
  sealKeyId: string;
  sealPublicKeySha256: string;
  requiredPermission: string;
  requiredDomain: string;
  requiredScopeKind: string;
  maxApprovalLifetimeSeconds: number;
  maxAttestationAgeSeconds: number;
  clockSkewSeconds: number;
}

export interface RegistryApprovalAttestationClaims {
  schema: "vitalos.key-registry-approval.v1";
  actorId: string;
  tenantId: string;
  organizationId: string;
  role: string;
  registryId: string;
  proposalDigest: string;
  action: RegistryMutationAction;
  keyId: string;
  approvedAt: string;
  expiresAt: string;
  nonce: string;
  issuer: string;
  audience: string;
  sealKeyId: string;
  algorithm: "Ed25519";
}

export interface SignedRegistryApprovalAttestation {
  claims: RegistryApprovalAttestationClaims;
  signature: string;
}

export type RegistryApprovalDraftReason =
  | "draft_created"
  | "untrusted_session"
  | "invalid_request"
  | "request_expired"
  | "permission_denied"
  | "scope_denied"
  | "domain_denied"
  | "read_only"
  | "grant_expired"
  | "grant_source_invalid"
  | "invalid_policy";

export type RegistryApprovalDraftDecision =
  | {
      created: true;
      reason: "draft_created";
      claims: RegistryApprovalAttestationClaims;
    }
  | {
      created: false;
      reason: Exclude<RegistryApprovalDraftReason, "draft_created">;
      claims: null;
    };

export interface RegistryApprovalSignatureVerification {
  verified: boolean;
  keyId: string;
  algorithm: "Ed25519";
  attestationDigest: string;
}

export type RegistryApprovalNonceCommit =
  | {
      confirmed: true;
      status: "committed" | "replayed";
      nonce: string;
      actorId: string;
      proposalDigest: string;
      attestationDigest: string;
      committedAt: string;
    }
  | {
      confirmed: false;
      status: "conflict" | "rolled_back" | "adapter_error";
    };

export interface RegistryApprovalIntakeInput {
  envelope: SignedRegistryApprovalAttestation;
  policy: RegistryApprovalPolicy;
  evaluatedAt: string;
  signatureVerification: RegistryApprovalSignatureVerification;
  nonceCommit: RegistryApprovalNonceCommit;
}

export type RegistryApprovalIntakeReason =
  | "accepted"
  | "invalid_claims"
  | "issuer_mismatch"
  | "audience_mismatch"
  | "seal_key_mismatch"
  | "invalid_time"
  | "not_yet_valid"
  | "expired"
  | "stale_attestation"
  | "invalid_signature_encoding"
  | "signature_invalid"
  | "signature_metadata_mismatch"
  | "nonce_conflict"
  | "nonce_uncommitted"
  | "nonce_commit_mismatch";

export interface RegistryApprovalReceipt {
  schema: "vitalos.key-registry-approval-receipt.v1";
  registryId: string;
  proposalDigest: string;
  action: RegistryMutationAction;
  keyId: string;
  acceptedAt: string;
  replayed: boolean;
  persistedNonce: true;
  identityReturned: false;
}

export type RegistryApprovalIntakeDecision =
  | {
      accepted: true;
      reason: "accepted";
      approval: VerifiedRegistryApproval;
      receipt: RegistryApprovalReceipt;
    }
  | {
      accepted: false;
      reason: Exclude<RegistryApprovalIntakeReason, "accepted">;
      approval: null;
      receipt: null;
    };

function parseTime(value: string): number | null {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function validDigest(value: string): boolean {
  return /^[a-f0-9]{64}$/.test(value);
}

function validNonce(value: string): boolean {
  return /^[A-Za-z0-9_-]{22,128}$/.test(value);
}

function validSignature(value: string): boolean {
  return /^[A-Za-z0-9_-]{80,120}$/.test(value);
}

function validAction(value: string): value is RegistryMutationAction {
  return ["register", "activate", "retire", "revoke"].includes(value);
}

function deniedDraft(
  reason: Exclude<RegistryApprovalDraftReason, "draft_created">,
): RegistryApprovalDraftDecision {
  return { created: false, reason, claims: null };
}

function deniedIntake(
  reason: Exclude<RegistryApprovalIntakeReason, "accepted">,
): RegistryApprovalIntakeDecision {
  return { accepted: false, reason, approval: null, receipt: null };
}

function validPolicy(policy: RegistryApprovalPolicy): boolean {
  return (
    Boolean(policy.issuer.trim()) &&
    Boolean(policy.audience.trim()) &&
    Boolean(policy.sealKeyId.trim()) &&
    validDigest(policy.sealPublicKeySha256) &&
    Boolean(policy.requiredPermission.trim()) &&
    Boolean(policy.requiredDomain.trim()) &&
    Boolean(policy.requiredScopeKind.trim()) &&
    Number.isInteger(policy.maxApprovalLifetimeSeconds) &&
    policy.maxApprovalLifetimeSeconds > 0 &&
    Number.isInteger(policy.maxAttestationAgeSeconds) &&
    policy.maxAttestationAgeSeconds > 0 &&
    Number.isInteger(policy.clockSkewSeconds) &&
    policy.clockSkewSeconds >= 0
  );
}

/**
 * Derives actor, tenant, organization and role from trusted server context.
 * The browser request carries no identity or authority fields.
 */
export function createRegistryApprovalDraft(
  request: RegistryApprovalRequest,
  session: SessionTrustDecision,
  grants: readonly IssuedAccessGrant[],
  policy: RegistryApprovalPolicy,
  evaluatedAt: string,
): RegistryApprovalDraftDecision {
  if (!validPolicy(policy)) return deniedDraft("invalid_policy");
  if (!session.trusted || !session.context) return deniedDraft("untrusted_session");

  const requestedAt = parseTime(request.requestedAt);
  const requestExpiresAt = parseTime(request.expiresAt);
  const now = parseTime(evaluatedAt);
  if (
    request.schema !== "vitalos.key-registry-approval-request.v1" ||
    !request.registryId.trim() ||
    !validDigest(request.proposalDigest) ||
    !request.keyId.trim() ||
    !validAction(request.action) ||
    !validNonce(request.nonce) ||
    requestedAt === null ||
    requestExpiresAt === null ||
    now === null ||
    requestExpiresAt <= requestedAt
  ) {
    return deniedDraft("invalid_request");
  }
  const skewMs = policy.clockSkewSeconds * 1_000;
  if (requestedAt > now + skewMs || requestExpiresAt <= now - skewMs) {
    return deniedDraft("request_expired");
  }

  const identity: IdentityContext = {
    state: "authenticated",
    subjectId: session.context.subjectId,
    activeTenantId: session.context.activeTenantId,
    grants,
    evaluatedOn: evaluatedAt,
  };
  const authorization = authorizeResource(identity, {
    id: `key-registry:${request.registryId}:approval`,
    tenantId: session.context.activeTenantId,
    permission: policy.requiredPermission,
    action: "write",
    dataClass: "collective",
    domain: policy.requiredDomain,
    scopeRefs: { [policy.requiredScopeKind]: request.registryId },
  });
  if (!authorization.allowed || !authorization.matchedGrant) {
    const reason =
      authorization.reason === "scope_mismatch"
        ? "scope_denied"
        : authorization.reason === "domain_mismatch"
          ? "domain_denied"
          : authorization.reason === "read_only"
            ? "read_only"
            : authorization.reason === "grant_expired"
              ? "grant_expired"
              : "permission_denied";
    return deniedDraft(reason);
  }
  const matchedGrant = authorization.matchedGrant as IssuedAccessGrant;
  if (matchedGrant.source !== "membership_policy" || parseTime(matchedGrant.issuedAt) === null) {
    return deniedDraft("grant_source_invalid");
  }

  const sessionExpiresAt = parseTime(session.context.sessionExpiresAt);
  const grantExpiresAt = matchedGrant.expiresOn ? parseTime(matchedGrant.expiresOn) : null;
  if (sessionExpiresAt === null || grantExpiresAt === null) {
    return deniedDraft("invalid_policy");
  }
  const expiresAt = Math.min(
    requestExpiresAt,
    sessionExpiresAt,
    grantExpiresAt,
    now + policy.maxApprovalLifetimeSeconds * 1_000,
  );
  if (expiresAt <= now) return deniedDraft("grant_expired");

  return {
    created: true,
    reason: "draft_created",
    claims: {
      schema: "vitalos.key-registry-approval.v1",
      actorId: session.context.subjectId,
      tenantId: session.context.activeTenantId,
      organizationId: session.context.organizationId,
      role: matchedGrant.roleId,
      registryId: request.registryId,
      proposalDigest: request.proposalDigest,
      action: request.action,
      keyId: request.keyId,
      approvedAt: evaluatedAt,
      expiresAt: new Date(expiresAt).toISOString(),
      nonce: request.nonce,
      issuer: policy.issuer,
      audience: policy.audience,
      sealKeyId: policy.sealKeyId,
      algorithm: "Ed25519",
    },
  };
}

function validClaims(claims: RegistryApprovalAttestationClaims): boolean {
  return (
    claims.schema === "vitalos.key-registry-approval.v1" &&
    Boolean(claims.actorId.trim()) &&
    Boolean(claims.tenantId.trim()) &&
    Boolean(claims.organizationId.trim()) &&
    Boolean(claims.role.trim()) &&
    Boolean(claims.registryId.trim()) &&
    validDigest(claims.proposalDigest) &&
    validAction(claims.action) &&
    Boolean(claims.keyId.trim()) &&
    validNonce(claims.nonce) &&
    Boolean(claims.issuer.trim()) &&
    Boolean(claims.audience.trim()) &&
    Boolean(claims.sealKeyId.trim()) &&
    claims.algorithm === "Ed25519"
  );
}

export function evaluateRegistryApprovalIntake(
  input: RegistryApprovalIntakeInput,
): RegistryApprovalIntakeDecision {
  const { claims } = input.envelope;
  if (!validPolicy(input.policy) || !validClaims(claims)) return deniedIntake("invalid_claims");
  if (!validSignature(input.envelope.signature)) {
    return deniedIntake("invalid_signature_encoding");
  }
  if (claims.issuer !== input.policy.issuer) return deniedIntake("issuer_mismatch");
  if (claims.audience !== input.policy.audience) return deniedIntake("audience_mismatch");
  if (claims.sealKeyId !== input.policy.sealKeyId) {
    return deniedIntake("seal_key_mismatch");
  }

  const approvedAt = parseTime(claims.approvedAt);
  const expiresAt = parseTime(claims.expiresAt);
  const evaluatedAt = parseTime(input.evaluatedAt);
  if (
    approvedAt === null ||
    expiresAt === null ||
    evaluatedAt === null ||
    expiresAt <= approvedAt
  ) {
    return deniedIntake("invalid_time");
  }
  const skewMs = input.policy.clockSkewSeconds * 1_000;
  if (approvedAt > evaluatedAt + skewMs) return deniedIntake("not_yet_valid");
  if (expiresAt <= evaluatedAt - skewMs) return deniedIntake("expired");
  if (evaluatedAt - approvedAt > input.policy.maxAttestationAgeSeconds * 1_000 + skewMs) {
    return deniedIntake("stale_attestation");
  }

  const verification = input.signatureVerification;
  if (
    verification.keyId !== claims.sealKeyId ||
    verification.algorithm !== claims.algorithm ||
    !validDigest(verification.attestationDigest)
  ) {
    return deniedIntake("signature_metadata_mismatch");
  }
  if (!verification.verified) return deniedIntake("signature_invalid");

  if (!input.nonceCommit.confirmed) {
    return deniedIntake(
      input.nonceCommit.status === "conflict" ? "nonce_conflict" : "nonce_uncommitted",
    );
  }
  if (
    input.nonceCommit.nonce !== claims.nonce ||
    input.nonceCommit.actorId !== claims.actorId ||
    input.nonceCommit.proposalDigest !== claims.proposalDigest ||
    input.nonceCommit.attestationDigest !== verification.attestationDigest ||
    parseTime(input.nonceCommit.committedAt) === null
  ) {
    return deniedIntake("nonce_commit_mismatch");
  }

  return {
    accepted: true,
    reason: "accepted",
    approval: {
      actorId: claims.actorId,
      role: claims.role,
      proposalDigest: claims.proposalDigest,
      action: claims.action,
      keyId: claims.keyId,
      approvedAt: claims.approvedAt,
      verified: true,
    },
    receipt: {
      schema: "vitalos.key-registry-approval-receipt.v1",
      registryId: claims.registryId,
      proposalDigest: claims.proposalDigest,
      action: claims.action,
      keyId: claims.keyId,
      acceptedAt: input.nonceCommit.committedAt,
      replayed: input.nonceCommit.status === "replayed",
      persistedNonce: true,
      identityReturned: false,
    },
  };
}

export function canonicalizeRegistryApprovalAttestation(
  claims: RegistryApprovalAttestationClaims,
): string {
  return JSON.stringify(claims);
}
