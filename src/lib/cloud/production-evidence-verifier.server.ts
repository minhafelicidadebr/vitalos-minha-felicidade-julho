import { createHash, createPublicKey, verify } from "node:crypto";
import {
  canonicalizeProductionEvidenceClaims,
  evaluateProductionEvidenceIntake,
  type EvidenceNonceCommit,
  type ProductionEvidenceIntakeResult,
  type ProductionEvidenceTrustPolicy,
  type SignedProductionEvidenceEnvelope,
} from "@/engine/cloud/production-evidence-intake-engine";

export interface VerifyProductionEvidenceInput {
  envelope: SignedProductionEvidenceEnvelope;
  policy: ProductionEvidenceTrustPolicy;
  evaluatedAt: string;
  minimumKeyRegistryVersion: number;
  trustedKeyRegistry: readonly ProductionEvidencePublicKey[];
  nonceCommit: EvidenceNonceCommit;
}

export interface ProductionEvidencePublicKey {
  keyId: string;
  algorithm: "Ed25519";
  publicKeyPem: string;
}

function decodeBase64Url(value: string): Buffer | null {
  if (!/^[A-Za-z0-9_-]{80,120}$/.test(value)) return null;
  try {
    return Buffer.from(value, "base64url");
  } catch {
    return null;
  }
}

export function digestProductionEvidenceEnvelope(
  envelope: SignedProductionEvidenceEnvelope,
): string {
  return createHash("sha256")
    .update(canonicalizeProductionEvidenceClaims(envelope.claims))
    .digest("hex");
}

export function fingerprintEvidencePublicKey(publicKeyPem: string): string | null {
  try {
    const der = createPublicKey(publicKeyPem).export({ type: "spki", format: "der" });
    return createHash("sha256").update(der).digest("hex");
  } catch {
    return null;
  }
}

/**
 * Server-only cryptographic boundary. Public keys must come from the trusted
 * production key registry, never from the envelope or browser.
 */
export function verifyProductionEvidenceEnvelope(
  input: VerifyProductionEvidenceInput,
): ProductionEvidenceIntakeResult {
  const canonical = canonicalizeProductionEvidenceClaims(input.envelope.claims);
  const envelopeDigest = createHash("sha256").update(canonical).digest("hex");
  const signature = decodeBase64Url(input.envelope.signature);
  const policyKey = input.policy.trustedKeys.find(
    (candidate) => candidate.keyId === input.envelope.claims.keyId,
  );
  const registryMatches = input.trustedKeyRegistry.filter(
    (candidate) =>
      candidate.keyId === input.envelope.claims.keyId &&
      candidate.algorithm === input.envelope.claims.algorithm,
  );
  const registryKey = registryMatches.length === 1 ? registryMatches[0]! : null;
  const registryFingerprint = registryKey
    ? fingerprintEvidencePublicKey(registryKey.publicKeyPem)
    : null;
  let signatureVerified = false;

  if (policyKey && registryKey && registryFingerprint === policyKey.publicKeySha256 && signature) {
    try {
      signatureVerified = verify(null, Buffer.from(canonical), registryKey.publicKeyPem, signature);
    } catch {
      signatureVerified = false;
    }
  }

  return evaluateProductionEvidenceIntake({
    envelope: input.envelope,
    policy: input.policy,
    minimumKeyRegistryVersion: input.minimumKeyRegistryVersion,
    evaluatedAt: input.evaluatedAt,
    signatureVerification: {
      verified: signatureVerified,
      keyId: input.envelope.claims.keyId,
      algorithm: input.envelope.claims.algorithm,
      envelopeDigest,
    },
    nonceCommit: input.nonceCommit,
  });
}
