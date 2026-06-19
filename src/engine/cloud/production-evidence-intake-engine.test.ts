import { describe, expect, test } from "bun:test";
import {
  evaluateProductionEvidenceIntake,
  type ProductionEvidenceIntakeInput,
} from "./production-evidence-intake-engine";

const envelope: ProductionEvidenceIntakeInput["envelope"] = {
  claims: {
    schema: "vitalos.production-evidence.v1",
    controlId: "signed_session",
    environment: "production",
    status: "verified",
    deploymentId: "deploy-a",
    releaseCommit: "38d74de",
    observedAt: "2026-06-19T20:00:00.000Z",
    expiresAt: "2026-06-19T22:00:00.000Z",
    evidenceDigest: "a".repeat(64),
    issuer: "vitalos-runtime",
    audience: "vitalos-promotion",
    keyId: "evidence-key-2026-01",
    algorithm: "Ed25519",
    nonce: "nonce_1234567890abcdefgh",
    issuedAt: "2026-06-19T20:01:00.000Z",
  },
  signature: "A".repeat(86),
};

const base: ProductionEvidenceIntakeInput = {
  envelope,
  policy: {
    trustedIssuer: "vitalos-runtime",
    audience: "vitalos-promotion",
    deploymentId: "deploy-a",
    releaseCommit: "38d74de",
    keyRegistryVersion: 7,
    maxEnvelopeAgeSeconds: 900,
    clockSkewSeconds: 30,
    trustedKeys: [
      {
        keyId: "evidence-key-2026-01",
        algorithm: "Ed25519",
        publicKeySha256: "c".repeat(64),
        validFrom: "2026-01-01T00:00:00.000Z",
        validUntil: "2027-01-01T00:00:00.000Z",
        revoked: false,
      },
    ],
  },
  evaluatedAt: "2026-06-19T20:05:00.000Z",
  minimumKeyRegistryVersion: 7,
  signatureVerification: {
    verified: true,
    keyId: "evidence-key-2026-01",
    algorithm: "Ed25519",
    envelopeDigest: "b".repeat(64),
  },
  nonceCommit: {
    confirmed: true,
    status: "committed",
    nonce: "nonce_1234567890abcdefgh",
    keyId: "evidence-key-2026-01",
    envelopeDigest: "b".repeat(64),
    committedAt: "2026-06-19T20:05:01.000Z",
  },
};
const committedNonce = base.nonceCommit.confirmed
  ? base.nonceCommit
  : (() => {
      throw new Error("fixture must be a confirmed nonce commit");
    })();

describe("production evidence intake", () => {
  test("emits runtime_verified evidence only after signature and nonce commit", () => {
    expect(evaluateProductionEvidenceIntake(base)).toMatchObject({
      accepted: true,
      reason: "accepted",
      evidence: {
        assurance: "runtime_verified",
        deploymentId: "deploy-a",
        releaseCommit: "38d74de",
      },
      receipt: {
        persistedNonce: true,
        replayed: false,
        contentReturned: false,
      },
    });
  });

  test("rejects issuer, audience, deployment and release drift", () => {
    expect(
      evaluateProductionEvidenceIntake({
        ...base,
        envelope: { ...envelope, claims: { ...envelope.claims, issuer: "attacker" } },
      }).reason,
    ).toBe("issuer_mismatch");
    expect(
      evaluateProductionEvidenceIntake({
        ...base,
        envelope: { ...envelope, claims: { ...envelope.claims, audience: "other" } },
      }).reason,
    ).toBe("audience_mismatch");
    expect(
      evaluateProductionEvidenceIntake({
        ...base,
        envelope: { ...envelope, claims: { ...envelope.claims, deploymentId: "deploy-b" } },
      }).reason,
    ).toBe("deployment_mismatch");
    expect(
      evaluateProductionEvidenceIntake({
        ...base,
        envelope: { ...envelope, claims: { ...envelope.claims, releaseCommit: "deadbee" } },
      }).reason,
    ).toBe("release_mismatch");
  });

  test("rejects a rolled-back key registry snapshot", () => {
    expect(
      evaluateProductionEvidenceIntake({
        ...base,
        policy: { ...base.policy, keyRegistryVersion: 6 },
      }).reason,
    ).toBe("registry_rollback");
  });

  test("rejects unknown, revoked and inactive keys", () => {
    expect(
      evaluateProductionEvidenceIntake({
        ...base,
        policy: { ...base.policy, trustedKeys: [] },
      }).reason,
    ).toBe("untrusted_key");
    expect(
      evaluateProductionEvidenceIntake({
        ...base,
        policy: {
          ...base.policy,
          trustedKeys: [{ ...base.policy.trustedKeys[0]!, revoked: true }],
        },
      }).reason,
    ).toBe("revoked_key");
    expect(
      evaluateProductionEvidenceIntake({
        ...base,
        policy: {
          ...base.policy,
          trustedKeys: [
            {
              ...base.policy.trustedKeys[0]!,
              validFrom: "2026-06-20T00:00:00.000Z",
              validUntil: "2027-01-01T00:00:00.000Z",
            },
          ],
        },
      }).reason,
    ).toBe("key_not_active");
  });

  test("rejects expired, stale and future envelopes", () => {
    expect(
      evaluateProductionEvidenceIntake({
        ...base,
        evaluatedAt: "2026-06-19T22:00:31.000Z",
      }).reason,
    ).toBe("expired");
    expect(
      evaluateProductionEvidenceIntake({
        ...base,
        evaluatedAt: "2026-06-19T20:30:31.000Z",
        envelope: {
          ...envelope,
          claims: { ...envelope.claims, expiresAt: "2026-06-19T23:00:00.000Z" },
        },
      }).reason,
    ).toBe("stale_envelope");
    expect(
      evaluateProductionEvidenceIntake({
        ...base,
        envelope: {
          ...envelope,
          claims: {
            ...envelope.claims,
            observedAt: "2026-06-19T20:02:00.000Z",
            issuedAt: "2026-06-19T20:01:00.000Z",
          },
        },
      }).reason,
    ).toBe("not_yet_observed");
  });

  test("rejects forged or mismatched signature metadata", () => {
    expect(
      evaluateProductionEvidenceIntake({
        ...base,
        signatureVerification: { ...base.signatureVerification, verified: false },
      }).reason,
    ).toBe("signature_invalid");
    expect(
      evaluateProductionEvidenceIntake({
        ...base,
        signatureVerification: { ...base.signatureVerification, keyId: "other-key" },
      }).reason,
    ).toBe("signature_metadata_mismatch");
  });

  test("fails closed until nonce reservation is durably confirmed", () => {
    expect(
      evaluateProductionEvidenceIntake({
        ...base,
        nonceCommit: { confirmed: false, status: "rolled_back" },
      }).reason,
    ).toBe("nonce_uncommitted");
    expect(
      evaluateProductionEvidenceIntake({
        ...base,
        nonceCommit: { confirmed: false, status: "conflict" },
      }).reason,
    ).toBe("nonce_conflict");
    expect(
      evaluateProductionEvidenceIntake({
        ...base,
        nonceCommit: { ...committedNonce, envelopeDigest: "c".repeat(64) },
      }).reason,
    ).toBe("nonce_commit_mismatch");
  });

  test("an exact replay is idempotent and marked as replayed", () => {
    expect(
      evaluateProductionEvidenceIntake({
        ...base,
        nonceCommit: { ...committedNonce, status: "replayed" },
      }),
    ).toMatchObject({
      accepted: true,
      receipt: { replayed: true },
    });
  });
});
