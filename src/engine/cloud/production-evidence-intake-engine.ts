import type { ProductionControlId, RuntimeEvidence } from "./production-promotion-engine";

export interface ProductionEvidenceClaims {
  schema: "vitalos.production-evidence.v1";
  controlId: ProductionControlId;
  environment: "production";
  status: "verified" | "failed";
  deploymentId: string;
  releaseCommit: string;
  observedAt: string;
  expiresAt: string;
  evidenceDigest: string;
  issuer: string;
  audience: string;
  keyId: string;
  algorithm: "Ed25519";
  nonce: string;
  issuedAt: string;
}

export interface SignedProductionEvidenceEnvelope {
  claims: ProductionEvidenceClaims;
  signature: string;
}

export interface TrustedEvidenceKey {
  keyId: string;
  algorithm: "Ed25519";
  publicKeySha256: string;
  validFrom: string;
  validUntil: string;
  revoked: boolean;
}

export interface ProductionEvidenceTrustPolicy {
  trustedIssuer: string;
  audience: string;
  deploymentId: string;
  releaseCommit: string;
  keyRegistryVersion: number;
  maxEnvelopeAgeSeconds: number;
  clockSkewSeconds: number;
  trustedKeys: readonly TrustedEvidenceKey[];
}

export interface EvidenceSignatureVerification {
  verified: boolean;
  keyId: string;
  algorithm: "Ed25519";
  envelopeDigest: string;
}

export type EvidenceNonceCommit =
  | {
      confirmed: true;
      status: "committed" | "replayed";
      nonce: string;
      keyId: string;
      envelopeDigest: string;
      committedAt: string;
    }
  | {
      confirmed: false;
      status: "conflict" | "rolled_back" | "adapter_error";
    };

export interface ProductionEvidenceIntakeInput {
  envelope: SignedProductionEvidenceEnvelope;
  policy: ProductionEvidenceTrustPolicy;
  minimumKeyRegistryVersion: number;
  evaluatedAt: string;
  signatureVerification: EvidenceSignatureVerification;
  nonceCommit: EvidenceNonceCommit;
}

export type ProductionEvidenceIntakeReason =
  | "accepted"
  | "invalid_claims"
  | "issuer_mismatch"
  | "audience_mismatch"
  | "deployment_mismatch"
  | "release_mismatch"
  | "registry_rollback"
  | "untrusted_key"
  | "revoked_key"
  | "key_not_active"
  | "invalid_time"
  | "not_yet_observed"
  | "expired"
  | "stale_envelope"
  | "invalid_digest"
  | "invalid_signature_encoding"
  | "signature_invalid"
  | "signature_metadata_mismatch"
  | "nonce_conflict"
  | "nonce_uncommitted"
  | "nonce_commit_mismatch";

export interface ProductionEvidenceReceipt {
  schema: "vitalos.production-evidence-receipt.v1";
  controlId: ProductionControlId;
  envelopeDigest: string;
  acceptedAt: string;
  replayed: boolean;
  persistedNonce: true;
  contentReturned: false;
}

export type ProductionEvidenceIntakeResult =
  | {
      accepted: true;
      reason: "accepted";
      evidence: RuntimeEvidence;
      receipt: ProductionEvidenceReceipt;
    }
  | {
      accepted: false;
      reason: Exclude<ProductionEvidenceIntakeReason, "accepted">;
      evidence: null;
      receipt: null;
    };

function denied(
  reason: Exclude<ProductionEvidenceIntakeReason, "accepted">,
): ProductionEvidenceIntakeResult {
  return { accepted: false, reason, evidence: null, receipt: null };
}

function parseTime(value: string): number | null {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function validDigest(value: string): boolean {
  return /^[a-f0-9]{64}$/.test(value);
}

function validSignature(value: string): boolean {
  return /^[A-Za-z0-9_-]{80,120}$/.test(value);
}

function validNonce(value: string): boolean {
  return /^[A-Za-z0-9_-]{22,128}$/.test(value);
}

function structurallyValid(claims: ProductionEvidenceClaims): boolean {
  return (
    claims.schema === "vitalos.production-evidence.v1" &&
    claims.environment === "production" &&
    claims.status === "verified" &&
    Boolean(claims.deploymentId.trim()) &&
    /^[a-f0-9]{7,64}$/.test(claims.releaseCommit) &&
    Boolean(claims.issuer.trim()) &&
    Boolean(claims.audience.trim()) &&
    Boolean(claims.keyId.trim()) &&
    claims.algorithm === "Ed25519" &&
    validNonce(claims.nonce)
  );
}

/**
 * Converts a signed envelope into promotion evidence only after the server
 * verifies its signature and atomically persists its nonce.
 */
export function evaluateProductionEvidenceIntake(
  input: ProductionEvidenceIntakeInput,
): ProductionEvidenceIntakeResult {
  const { claims } = input.envelope;
  if (!structurallyValid(claims)) return denied("invalid_claims");
  if (!validDigest(claims.evidenceDigest)) return denied("invalid_digest");
  if (!validSignature(input.envelope.signature)) return denied("invalid_signature_encoding");
  if (claims.issuer !== input.policy.trustedIssuer) return denied("issuer_mismatch");
  if (claims.audience !== input.policy.audience) return denied("audience_mismatch");
  if (claims.deploymentId !== input.policy.deploymentId) return denied("deployment_mismatch");
  if (claims.releaseCommit !== input.policy.releaseCommit) return denied("release_mismatch");
  if (
    !Number.isInteger(input.policy.keyRegistryVersion) ||
    input.policy.keyRegistryVersion < input.minimumKeyRegistryVersion ||
    !Number.isInteger(input.minimumKeyRegistryVersion) ||
    input.minimumKeyRegistryVersion < 0
  ) {
    return denied("registry_rollback");
  }

  const key = input.policy.trustedKeys.find((candidate) => candidate.keyId === claims.keyId);
  if (!key || key.algorithm !== claims.algorithm || !validDigest(key.publicKeySha256)) {
    return denied("untrusted_key");
  }
  if (key.revoked) return denied("revoked_key");

  const evaluatedAt = parseTime(input.evaluatedAt);
  const observedAt = parseTime(claims.observedAt);
  const issuedAt = parseTime(claims.issuedAt);
  const expiresAt = parseTime(claims.expiresAt);
  const keyValidFrom = parseTime(key.validFrom);
  const keyValidUntil = parseTime(key.validUntil);
  if (
    evaluatedAt === null ||
    observedAt === null ||
    issuedAt === null ||
    expiresAt === null ||
    keyValidFrom === null ||
    keyValidUntil === null ||
    expiresAt <= issuedAt ||
    keyValidUntil <= keyValidFrom ||
    !Number.isInteger(input.policy.maxEnvelopeAgeSeconds) ||
    input.policy.maxEnvelopeAgeSeconds <= 0 ||
    !Number.isInteger(input.policy.clockSkewSeconds) ||
    input.policy.clockSkewSeconds < 0
  ) {
    return denied("invalid_time");
  }

  const skewMs = input.policy.clockSkewSeconds * 1_000;
  if (issuedAt < keyValidFrom || issuedAt >= keyValidUntil) return denied("key_not_active");
  if (observedAt > issuedAt + skewMs || issuedAt > evaluatedAt + skewMs) {
    return denied("not_yet_observed");
  }
  if (expiresAt <= evaluatedAt - skewMs) return denied("expired");
  if (evaluatedAt - issuedAt > input.policy.maxEnvelopeAgeSeconds * 1_000 + skewMs) {
    return denied("stale_envelope");
  }

  const verification = input.signatureVerification;
  if (
    verification.keyId !== claims.keyId ||
    verification.algorithm !== claims.algorithm ||
    !validDigest(verification.envelopeDigest)
  ) {
    return denied("signature_metadata_mismatch");
  }
  if (!verification.verified) return denied("signature_invalid");

  if (!input.nonceCommit.confirmed) {
    return denied(input.nonceCommit.status === "conflict" ? "nonce_conflict" : "nonce_uncommitted");
  }
  if (
    input.nonceCommit.nonce !== claims.nonce ||
    input.nonceCommit.keyId !== claims.keyId ||
    input.nonceCommit.envelopeDigest !== verification.envelopeDigest ||
    parseTime(input.nonceCommit.committedAt) === null
  ) {
    return denied("nonce_commit_mismatch");
  }

  return {
    accepted: true,
    reason: "accepted",
    evidence: {
      controlId: claims.controlId,
      environment: "production",
      assurance: "runtime_verified",
      status: "verified",
      deploymentId: claims.deploymentId,
      releaseCommit: claims.releaseCommit,
      observedAt: claims.observedAt,
      expiresAt: claims.expiresAt,
      digest: claims.evidenceDigest,
    },
    receipt: {
      schema: "vitalos.production-evidence-receipt.v1",
      controlId: claims.controlId,
      envelopeDigest: verification.envelopeDigest,
      acceptedAt: input.nonceCommit.committedAt,
      replayed: input.nonceCommit.status === "replayed",
      persistedNonce: true,
      contentReturned: false,
    },
  };
}

export function canonicalizeProductionEvidenceClaims(claims: ProductionEvidenceClaims): string {
  return JSON.stringify(claims);
}
