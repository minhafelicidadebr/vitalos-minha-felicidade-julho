import { describe, expect, test } from "bun:test";
import { generateKeyPairSync, sign } from "node:crypto";
import {
  canonicalizeProductionEvidenceClaims,
  type ProductionEvidenceClaims,
  type ProductionEvidenceTrustPolicy,
} from "@/engine/cloud/production-evidence-intake-engine";
import {
  digestProductionEvidenceEnvelope,
  fingerprintEvidencePublicKey,
  verifyProductionEvidenceEnvelope,
} from "./production-evidence-verifier.server";

const claims: ProductionEvidenceClaims = {
  schema: "vitalos.production-evidence.v1",
  controlId: "rls",
  environment: "production",
  status: "verified",
  deploymentId: "deploy-a",
  releaseCommit: "38d74de",
  observedAt: "2026-06-19T20:00:00.000Z",
  expiresAt: "2026-06-19T22:00:00.000Z",
  evidenceDigest: "a".repeat(64),
  issuer: "vitalos-runtime",
  audience: "vitalos-promotion",
  keyId: "key-a",
  algorithm: "Ed25519",
  nonce: "nonce_1234567890abcdefgh",
  issuedAt: "2026-06-19T20:01:00.000Z",
};

function policyFor(publicKeyPem: string): ProductionEvidenceTrustPolicy {
  const publicKeySha256 = fingerprintEvidencePublicKey(publicKeyPem);
  if (!publicKeySha256) throw new Error("fixture public key must be valid");
  return {
    trustedIssuer: "vitalos-runtime",
    audience: "vitalos-promotion",
    deploymentId: "deploy-a",
    releaseCommit: "38d74de",
    keyRegistryVersion: 7,
    maxEnvelopeAgeSeconds: 900,
    clockSkewSeconds: 30,
    trustedKeys: [
      {
        keyId: "key-a",
        algorithm: "Ed25519",
        publicKeySha256,
        validFrom: "2026-01-01T00:00:00.000Z",
        validUntil: "2027-01-01T00:00:00.000Z",
        revoked: false,
      },
    ],
  };
}

describe("production evidence signature verifier", () => {
  test("verifies an Ed25519 envelope using a server-owned public key", () => {
    const pair = generateKeyPairSync("ed25519");
    const publicKeyPem = pair.publicKey.export({ type: "spki", format: "pem" }).toString();
    const policy = policyFor(publicKeyPem);
    const envelope = {
      claims,
      signature: sign(
        null,
        Buffer.from(canonicalizeProductionEvidenceClaims(claims)),
        pair.privateKey,
      ).toString("base64url"),
    };
    const digest = digestProductionEvidenceEnvelope(envelope);

    expect(
      verifyProductionEvidenceEnvelope({
        envelope,
        policy,
        evaluatedAt: "2026-06-19T20:05:00.000Z",
        minimumKeyRegistryVersion: 7,
        trustedKeyRegistry: [{ keyId: "key-a", algorithm: "Ed25519", publicKeyPem }],
        nonceCommit: {
          confirmed: true,
          status: "committed",
          nonce: claims.nonce,
          keyId: claims.keyId,
          envelopeDigest: digest,
          committedAt: "2026-06-19T20:05:01.000Z",
        },
      }),
    ).toMatchObject({
      accepted: true,
      evidence: { assurance: "runtime_verified" },
    });
  });

  test("rejects a signature produced by another key", () => {
    const trusted = generateKeyPairSync("ed25519");
    const attacker = generateKeyPairSync("ed25519");
    const trustedPublicKeyPem = trusted.publicKey
      .export({ type: "spki", format: "pem" })
      .toString();
    const policy = policyFor(trustedPublicKeyPem);
    const envelope = {
      claims,
      signature: sign(
        null,
        Buffer.from(canonicalizeProductionEvidenceClaims(claims)),
        attacker.privateKey,
      ).toString("base64url"),
    };

    expect(
      verifyProductionEvidenceEnvelope({
        envelope,
        policy,
        evaluatedAt: "2026-06-19T20:05:00.000Z",
        minimumKeyRegistryVersion: 7,
        trustedKeyRegistry: [
          { keyId: "key-a", algorithm: "Ed25519", publicKeyPem: trustedPublicKeyPem },
        ],
        nonceCommit: {
          confirmed: false,
          status: "rolled_back",
        },
      }).reason,
    ).toBe("signature_invalid");
  });

  test("rejects absent keys and malformed signatures without throwing", () => {
    const trusted = generateKeyPairSync("ed25519");
    const publicKeyPem = trusted.publicKey.export({ type: "spki", format: "pem" }).toString();
    const policy = policyFor(publicKeyPem);
    const envelope = { claims, signature: "malformed" };
    expect(
      verifyProductionEvidenceEnvelope({
        envelope,
        policy,
        evaluatedAt: "2026-06-19T20:05:00.000Z",
        minimumKeyRegistryVersion: 7,
        trustedKeyRegistry: [],
        nonceCommit: { confirmed: false, status: "adapter_error" },
      }).reason,
    ).toBe("invalid_signature_encoding");
  });

  test("rejects a substituted registry key even when its signature is valid", () => {
    const trusted = generateKeyPairSync("ed25519");
    const attacker = generateKeyPairSync("ed25519");
    const trustedPublicKeyPem = trusted.publicKey
      .export({ type: "spki", format: "pem" })
      .toString();
    const attackerPublicKeyPem = attacker.publicKey
      .export({ type: "spki", format: "pem" })
      .toString();
    const policy = policyFor(trustedPublicKeyPem);
    const envelope = {
      claims,
      signature: sign(
        null,
        Buffer.from(canonicalizeProductionEvidenceClaims(claims)),
        attacker.privateKey,
      ).toString("base64url"),
    };

    expect(
      verifyProductionEvidenceEnvelope({
        envelope,
        policy,
        evaluatedAt: "2026-06-19T20:05:00.000Z",
        minimumKeyRegistryVersion: 7,
        trustedKeyRegistry: [
          { keyId: "key-a", algorithm: "Ed25519", publicKeyPem: attackerPublicKeyPem },
        ],
        nonceCommit: { confirmed: false, status: "rolled_back" },
      }).reason,
    ).toBe("signature_invalid");
  });
});
