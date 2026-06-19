import { describe, expect, test } from "bun:test";
import { generateKeyPairSync, sign } from "node:crypto";
import {
  canonicalizeProductionEvidenceClaims,
  type ProductionEvidenceClaims,
  type ProductionEvidenceTrustPolicy,
} from "@/engine/cloud/production-evidence-intake-engine";
import {
  deriveTrustedEvidenceKeys,
  type ProductionKeyRegistryState,
} from "@/engine/cloud/production-key-registry-engine";
import {
  digestProductionEvidenceEnvelope,
  fingerprintEvidencePublicKey,
  verifyProductionEvidenceEnvelope,
} from "./production-evidence-verifier.server";

function fixture(status: "active" | "revoked", version = 7) {
  const pair = generateKeyPairSync("ed25519");
  const publicKeyPem = pair.publicKey.export({ type: "spki", format: "pem" }).toString();
  const publicKeySha256 = fingerprintEvidencePublicKey(publicKeyPem);
  if (!publicKeySha256) throw new Error("fixture public key must be valid");
  const state: ProductionKeyRegistryState = {
    schema: "vitalos.production-key-registry.v1",
    registryId: "production-evidence",
    version,
    keys: [
      {
        keyId: "key-a",
        algorithm: "Ed25519",
        publicKeySha256,
        status,
        validFrom: "2026-01-01T00:00:00.000Z",
        validUntil: "2027-01-01T00:00:00.000Z",
        activatedAt: "2026-01-01T00:00:00.000Z",
        retiredAt: null,
        revokedAt: status === "revoked" ? "2026-06-19T20:04:00.000Z" : null,
      },
    ],
    appliedRequests: [],
  };
  const claims: ProductionEvidenceClaims = {
    schema: "vitalos.production-evidence.v1",
    controlId: "production_attestation",
    environment: "production",
    status: "verified",
    deploymentId: "deploy-a",
    releaseCommit: "c42c775",
    observedAt: "2026-06-19T20:00:00.000Z",
    expiresAt: "2026-06-19T22:00:00.000Z",
    evidenceDigest: "a".repeat(64),
    issuer: "vitalos-runtime",
    audience: "vitalos-promotion",
    keyId: "key-a",
    algorithm: "Ed25519",
    nonce: "nonce_registry_integration_1234",
    issuedAt: "2026-06-19T20:01:00.000Z",
  };
  const envelope = {
    claims,
    signature: sign(
      null,
      Buffer.from(canonicalizeProductionEvidenceClaims(claims)),
      pair.privateKey,
    ).toString("base64url"),
  };
  const policy: ProductionEvidenceTrustPolicy = {
    trustedIssuer: claims.issuer,
    audience: claims.audience,
    deploymentId: claims.deploymentId,
    releaseCommit: claims.releaseCommit,
    keyRegistryVersion: state.version,
    maxEnvelopeAgeSeconds: 900,
    clockSkewSeconds: 30,
    trustedKeys: deriveTrustedEvidenceKeys(state),
  };
  const envelopeDigest = digestProductionEvidenceEnvelope(envelope);
  return {
    input: {
      envelope,
      policy,
      evaluatedAt: "2026-06-19T20:05:00.000Z",
      minimumKeyRegistryVersion: 7,
      trustedKeyRegistry: [{ keyId: "key-a", algorithm: "Ed25519" as const, publicKeyPem }],
      nonceCommit: {
        confirmed: true as const,
        status: "committed" as const,
        nonce: claims.nonce,
        keyId: claims.keyId,
        envelopeDigest,
        committedAt: "2026-06-19T20:05:01.000Z",
      },
    },
  };
}

describe("governed registry → signed evidence intake", () => {
  test("active key from the current registry version accepts the envelope", () => {
    expect(verifyProductionEvidenceEnvelope(fixture("active").input)).toMatchObject({
      accepted: true,
      evidence: { assurance: "runtime_verified" },
    });
  });

  test("registry rollback and key revocation both fail closed", () => {
    expect(verifyProductionEvidenceEnvelope(fixture("active", 6).input).reason).toBe(
      "registry_rollback",
    );
    expect(verifyProductionEvidenceEnvelope(fixture("revoked").input).reason).toBe("revoked_key");
  });
});
