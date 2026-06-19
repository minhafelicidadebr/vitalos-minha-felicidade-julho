import { createHash, createPublicKey, verify } from "node:crypto";
import {
  canonicalizeRegistryApprovalAttestation,
  evaluateRegistryApprovalIntake,
  type RegistryApprovalIntakeDecision,
  type RegistryApprovalNonceCommit,
  type RegistryApprovalPolicy,
  type SignedRegistryApprovalAttestation,
} from "@/engine/cloud/production-registry-approval-engine";

export interface RegistryApprovalSealPublicKey {
  keyId: string;
  algorithm: "Ed25519";
  publicKeyPem: string;
}

export interface VerifyRegistryApprovalInput {
  envelope: SignedRegistryApprovalAttestation;
  policy: RegistryApprovalPolicy;
  evaluatedAt: string;
  trustedSealKeys: readonly RegistryApprovalSealPublicKey[];
  nonceCommit: RegistryApprovalNonceCommit;
}

function decodeBase64Url(value: string): Buffer | null {
  if (!/^[A-Za-z0-9_-]{80,120}$/.test(value)) return null;
  try {
    return Buffer.from(value, "base64url");
  } catch {
    return null;
  }
}

export function fingerprintApprovalSealKey(publicKeyPem: string): string | null {
  try {
    const der = createPublicKey(publicKeyPem).export({ type: "spki", format: "der" });
    return createHash("sha256").update(der).digest("hex");
  } catch {
    return null;
  }
}

export function digestRegistryApprovalAttestation(
  envelope: SignedRegistryApprovalAttestation,
): string {
  return createHash("sha256")
    .update(canonicalizeRegistryApprovalAttestation(envelope.claims))
    .digest("hex");
}

export function verifyRegistryApprovalAttestation(
  input: VerifyRegistryApprovalInput,
): RegistryApprovalIntakeDecision {
  const canonical = canonicalizeRegistryApprovalAttestation(input.envelope.claims);
  const attestationDigest = createHash("sha256").update(canonical).digest("hex");
  const signature = decodeBase64Url(input.envelope.signature);
  const matches = input.trustedSealKeys.filter(
    (key) =>
      key.keyId === input.envelope.claims.sealKeyId &&
      key.algorithm === input.envelope.claims.algorithm,
  );
  const key = matches.length === 1 ? matches[0]! : null;
  const fingerprint = key ? fingerprintApprovalSealKey(key.publicKeyPem) : null;
  let verified = false;
  if (key && fingerprint === input.policy.sealPublicKeySha256 && signature) {
    try {
      verified = verify(null, Buffer.from(canonical), key.publicKeyPem, signature);
    } catch {
      verified = false;
    }
  }

  return evaluateRegistryApprovalIntake({
    envelope: input.envelope,
    policy: input.policy,
    evaluatedAt: input.evaluatedAt,
    signatureVerification: {
      verified,
      keyId: input.envelope.claims.sealKeyId,
      algorithm: input.envelope.claims.algorithm,
      attestationDigest,
    },
    nonceCommit: input.nonceCommit,
  });
}
