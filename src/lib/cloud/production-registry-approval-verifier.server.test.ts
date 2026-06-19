import { describe, expect, test } from "bun:test";
import { generateKeyPairSync, sign } from "node:crypto";
import {
  canonicalizeRegistryApprovalAttestation,
  type RegistryApprovalAttestationClaims,
  type RegistryApprovalPolicy,
} from "@/engine/cloud/production-registry-approval-engine";
import {
  digestRegistryApprovalAttestation,
  fingerprintApprovalSealKey,
  verifyRegistryApprovalAttestation,
} from "./production-registry-approval-verifier.server";

const claims: RegistryApprovalAttestationClaims = {
  schema: "vitalos.key-registry-approval.v1",
  actorId: "approver-a",
  tenantId: "tenant-a",
  organizationId: "org-a",
  role: "security",
  registryId: "production-evidence",
  proposalDigest: "a".repeat(64),
  action: "activate",
  keyId: "key-new",
  approvedAt: "2026-06-19T20:05:00.000Z",
  expiresAt: "2026-06-19T20:15:00.000Z",
  nonce: "approval_nonce_1234567890",
  issuer: "vitalos-approval-service",
  audience: "vitalos-key-registry",
  sealKeyId: "approval-seal-2026",
  algorithm: "Ed25519",
};

function policyFor(publicKeyPem: string): RegistryApprovalPolicy {
  const sealPublicKeySha256 = fingerprintApprovalSealKey(publicKeyPem);
  if (!sealPublicKeySha256) throw new Error("fixture public key");
  return {
    issuer: claims.issuer,
    audience: claims.audience,
    sealKeyId: claims.sealKeyId,
    sealPublicKeySha256,
    requiredPermission: "key_registry.approve",
    requiredDomain: "platform_security",
    requiredScopeKind: "key_registry",
    maxApprovalLifetimeSeconds: 600,
    maxAttestationAgeSeconds: 600,
    clockSkewSeconds: 30,
  };
}

describe("registry approval seal verifier", () => {
  test("verifies Ed25519 seal and durable nonce", () => {
    const pair = generateKeyPairSync("ed25519");
    const publicKeyPem = pair.publicKey.export({ type: "spki", format: "pem" }).toString();
    const policy = policyFor(publicKeyPem);
    const envelope = {
      claims,
      signature: sign(
        null,
        Buffer.from(canonicalizeRegistryApprovalAttestation(claims)),
        pair.privateKey,
      ).toString("base64url"),
    };
    const attestationDigest = digestRegistryApprovalAttestation(envelope);
    expect(
      verifyRegistryApprovalAttestation({
        envelope,
        policy,
        evaluatedAt: "2026-06-19T20:06:00.000Z",
        trustedSealKeys: [{ keyId: claims.sealKeyId, algorithm: "Ed25519", publicKeyPem }],
        nonceCommit: {
          confirmed: true,
          status: "committed",
          nonce: claims.nonce,
          actorId: claims.actorId,
          proposalDigest: claims.proposalDigest,
          attestationDigest,
          committedAt: "2026-06-19T20:06:01.000Z",
        },
      }),
    ).toMatchObject({ accepted: true, approval: { verified: true } });
  });

  test("rejects attacker and substituted registry key", () => {
    const trusted = generateKeyPairSync("ed25519");
    const attacker = generateKeyPairSync("ed25519");
    const trustedPem = trusted.publicKey.export({ type: "spki", format: "pem" }).toString();
    const attackerPem = attacker.publicKey.export({ type: "spki", format: "pem" }).toString();
    const policy = policyFor(trustedPem);
    const envelope = {
      claims,
      signature: sign(
        null,
        Buffer.from(canonicalizeRegistryApprovalAttestation(claims)),
        attacker.privateKey,
      ).toString("base64url"),
    };
    expect(
      verifyRegistryApprovalAttestation({
        envelope,
        policy,
        evaluatedAt: "2026-06-19T20:06:00.000Z",
        trustedSealKeys: [
          { keyId: claims.sealKeyId, algorithm: "Ed25519", publicKeyPem: attackerPem },
        ],
        nonceCommit: { confirmed: false, status: "rolled_back" },
      }).reason,
    ).toBe("signature_invalid");
  });
});
