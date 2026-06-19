import { describe, expect, test } from "bun:test";
import { generateKeyPairSync, sign } from "node:crypto";
import {
  canonicalizeProductionEvidenceClaims,
  type ProductionEvidenceClaims,
  type ProductionEvidenceTrustPolicy,
} from "@/engine/cloud/production-evidence-intake-engine";
import {
  evaluateProductionPromotion,
  REQUIRED_PRODUCTION_CONTROLS,
  type RuntimeEvidence,
} from "@/engine/cloud/production-promotion-engine";
import {
  digestProductionEvidenceEnvelope,
  fingerprintEvidencePublicKey,
  verifyProductionEvidenceEnvelope,
} from "./production-evidence-verifier.server";

const deploymentId = "deploy-a";
const releaseCommit = "38d74de";
const evaluatedAt = "2026-06-19T20:10:00.000Z";

function buildEvidenceSet(forgeControl: string | null = null): RuntimeEvidence[] {
  const trusted = generateKeyPairSync("ed25519");
  const attacker = generateKeyPairSync("ed25519");
  const publicKeyPem = trusted.publicKey.export({ type: "spki", format: "pem" }).toString();
  const publicKeySha256 = fingerprintEvidencePublicKey(publicKeyPem);
  if (!publicKeySha256) throw new Error("fixture public key must be valid");

  const policy: ProductionEvidenceTrustPolicy = {
    trustedIssuer: "vitalos-runtime",
    audience: "vitalos-promotion",
    deploymentId,
    releaseCommit,
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

  return REQUIRED_PRODUCTION_CONTROLS.flatMap((controlId, index) => {
    const claims: ProductionEvidenceClaims = {
      schema: "vitalos.production-evidence.v1",
      controlId,
      environment: "production",
      status: "verified",
      deploymentId,
      releaseCommit,
      observedAt: `2026-06-19T20:0${index}:00.000Z`,
      expiresAt: "2026-06-19T22:00:00.000Z",
      evidenceDigest: String(index + 1).repeat(64),
      issuer: "vitalos-runtime",
      audience: "vitalos-promotion",
      keyId: "key-a",
      algorithm: "Ed25519",
      nonce: `nonce_${index}_production_evidence_1234567890`,
      issuedAt: `2026-06-19T20:0${index}:30.000Z`,
    };
    const signingKey = forgeControl === controlId ? attacker.privateKey : trusted.privateKey;
    const envelope = {
      claims,
      signature: sign(
        null,
        Buffer.from(canonicalizeProductionEvidenceClaims(claims)),
        signingKey,
      ).toString("base64url"),
    };
    const envelopeDigest = digestProductionEvidenceEnvelope(envelope);
    const intake = verifyProductionEvidenceEnvelope({
      envelope,
      policy,
      evaluatedAt,
      trustedKeyRegistry: [{ keyId: "key-a", algorithm: "Ed25519", publicKeyPem }],
      nonceCommit: {
        confirmed: true,
        status: "committed",
        nonce: claims.nonce,
        keyId: claims.keyId,
        envelopeDigest,
        committedAt: evaluatedAt,
      },
    });

    return intake.accepted ? [intake.evidence] : [];
  });
}

describe("signed evidence → production promotion", () => {
  test("five cryptographically accepted envelopes satisfy the 5/5 gate", () => {
    expect(
      evaluateProductionPromotion({
        deploymentId,
        releaseCommit,
        evaluatedAt,
        evidence: buildEvidenceSet(),
      }),
    ).toMatchObject({
      status: "ready",
      productionClaimsAllowed: true,
      passedControlCount: 5,
      certificate: { schema: "vitalos.production-promotion.v1" },
    });
  });

  test("one forged envelope leaves the promotion blocked at 4/5", () => {
    expect(
      evaluateProductionPromotion({
        deploymentId,
        releaseCommit,
        evaluatedAt,
        evidence: buildEvidenceSet("rls"),
      }),
    ).toMatchObject({
      status: "blocked",
      productionClaimsAllowed: false,
      passedControlCount: 4,
      certificate: null,
    });
  });
});
