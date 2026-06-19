import { generateKeyPairSync, sign } from "node:crypto";
import {
  canonicalizeProductionEvidenceClaims,
  type ProductionEvidenceClaims,
  type ProductionEvidenceTrustPolicy,
  type SignedProductionEvidenceEnvelope,
} from "@/engine/cloud/production-evidence-intake-engine";
import {
  digestProductionEvidenceEnvelope,
  fingerprintEvidencePublicKey,
  verifyProductionEvidenceEnvelope,
} from "./production-evidence-verifier.server";

export interface ProductionEvidenceIntakeProof {
  generatedAt: string;
  status: "contract_verified" | "contract_failed";
  assurance: "cryptographic_intake_blueprint";
  runtime: {
    trustedKeyRegistry: false;
    durableReplayLedger: false;
    productionEvidenceSource: false;
    passed: 0;
    total: 3;
  };
  runtimeEvidenceAccepted: false;
  productionClaimsAllowed: false;
  checks: Array<{ id: string; label: string; passed: boolean; note: string }>;
  passedCheckCount: number;
  checkCount: number;
  sensitivePayloadReturned: false;
}

function signEnvelope(
  claims: ProductionEvidenceClaims,
  privateKey: ReturnType<typeof generateKeyPairSync>["privateKey"],
): SignedProductionEvidenceEnvelope {
  return {
    claims,
    signature: sign(
      null,
      Buffer.from(canonicalizeProductionEvidenceClaims(claims)),
      privateKey,
    ).toString("base64url"),
  };
}

export function buildProductionEvidenceIntakeProof(
  generatedAt = new Date().toISOString(),
): ProductionEvidenceIntakeProof {
  const trusted = generateKeyPairSync("ed25519");
  const attacker = generateKeyPairSync("ed25519");
  const publicKey = trusted.publicKey.export({ type: "spki", format: "pem" }).toString();
  const publicKeySha256 = fingerprintEvidencePublicKey(publicKey);
  if (!publicKeySha256) throw new Error("fixture public key must be valid");
  const claims: ProductionEvidenceClaims = {
    schema: "vitalos.production-evidence.v1",
    controlId: "production_attestation",
    environment: "production",
    status: "verified",
    deploymentId: "fixture-deployment",
    releaseCommit: "38d74de",
    observedAt: "2026-06-19T20:00:00.000Z",
    expiresAt: "2026-06-19T22:00:00.000Z",
    evidenceDigest: "a".repeat(64),
    issuer: "fixture-runtime",
    audience: "fixture-promotion",
    keyId: "fixture-key",
    algorithm: "Ed25519",
    nonce: "fixture_nonce_1234567890",
    issuedAt: "2026-06-19T20:01:00.000Z",
  };
  const policy: ProductionEvidenceTrustPolicy = {
    trustedIssuer: claims.issuer,
    audience: claims.audience,
    deploymentId: claims.deploymentId,
    releaseCommit: claims.releaseCommit,
    maxEnvelopeAgeSeconds: 900,
    clockSkewSeconds: 30,
    trustedKeys: [
      {
        keyId: claims.keyId,
        algorithm: "Ed25519",
        publicKeySha256,
        validFrom: "2026-01-01T00:00:00.000Z",
        validUntil: "2027-01-01T00:00:00.000Z",
        revoked: false,
      },
    ],
  };
  const envelope = signEnvelope(claims, trusted.privateKey);
  const digest = digestProductionEvidenceEnvelope(envelope);
  const committed = {
    confirmed: true as const,
    status: "committed" as const,
    nonce: claims.nonce,
    keyId: claims.keyId,
    envelopeDigest: digest,
    committedAt: "2026-06-19T20:05:01.000Z",
  };
  const verify = (
    candidate: SignedProductionEvidenceEnvelope,
    overrides: Partial<Parameters<typeof verifyProductionEvidenceEnvelope>[0]> = {},
  ) =>
    verifyProductionEvidenceEnvelope({
      envelope: candidate,
      policy,
      evaluatedAt: "2026-06-19T20:05:00.000Z",
      trustedKeyRegistry: [
        { keyId: claims.keyId, algorithm: claims.algorithm, publicKeyPem: publicKey },
      ],
      nonceCommit: committed,
      ...overrides,
    });

  const valid = verify(envelope);
  const forged = verify(signEnvelope(claims, attacker.privateKey));
  const wrongIssuerClaims = { ...claims, issuer: "fixture-attacker" };
  const wrongIssuer = verify(signEnvelope(wrongIssuerClaims, trusted.privateKey));
  const driftClaims = { ...claims, deploymentId: "fixture-other" };
  const deploymentDrift = verify(signEnvelope(driftClaims, trusted.privateKey));
  const expiredClaims = { ...claims, expiresAt: "2026-06-19T20:04:00.000Z" };
  const expired = verify(signEnvelope(expiredClaims, trusted.privateKey));
  const revoked = verify(envelope, {
    policy: {
      ...policy,
      trustedKeys: [{ ...policy.trustedKeys[0]!, revoked: true }],
    },
  });
  const rollback = verify(envelope, {
    nonceCommit: { confirmed: false, status: "rolled_back" },
  });
  const conflict = verify(envelope, {
    nonceCommit: { confirmed: false, status: "conflict" },
  });
  const replay = verify(envelope, {
    nonceCommit: { ...committed, status: "replayed" },
  });
  const current = verify(envelope, {
    trustedKeyRegistry: [],
    nonceCommit: { confirmed: false, status: "adapter_error" },
  });

  const checks = [
    {
      id: "valid_ed25519",
      label: "Envelope Ed25519 válido cruza a fronteira",
      passed: valid.accepted && valid.evidence.assurance === "runtime_verified",
      note: "A chave pública pertence ao servidor, não ao payload.",
    },
    {
      id: "forgery_rejected",
      label: "Assinatura de outra chave é recusada",
      passed: !forged.accepted && forged.reason === "signature_invalid",
      note: "Digest bem formado não substitui autenticidade.",
    },
    {
      id: "issuer_bound",
      label: "Issuer precisa coincidir com a política",
      passed: !wrongIssuer.accepted && wrongIssuer.reason === "issuer_mismatch",
      note: "Emissor arbitrário não adquire confiança.",
    },
    {
      id: "deployment_bound",
      label: "Envelope pertence ao deployment alvo",
      passed: !deploymentDrift.accepted && deploymentDrift.reason === "deployment_mismatch",
      note: "Prova de outro ambiente não pode ser reciclada.",
    },
    {
      id: "freshness_required",
      label: "Envelope vencido é recusado",
      passed: !expired.accepted && expired.reason === "expired",
      note: "Promoção depende de observação fresca.",
    },
    {
      id: "revocation_enforced",
      label: "Chave revogada perde confiança imediatamente",
      passed: !revoked.accepted && revoked.reason === "revoked_key",
      note: "Rotação e revogação fazem parte do contrato.",
    },
    {
      id: "commit_required",
      label: "Nonce exige commit durável",
      passed: !rollback.accepted && rollback.reason === "nonce_uncommitted",
      note: "Rollback nunca gera runtime_verified.",
    },
    {
      id: "replay_conflict",
      label: "Conflito de nonce falha fechado",
      passed: !conflict.accepted && conflict.reason === "nonce_conflict",
      note: "Mesmo nonce com outro envelope é bloqueado.",
    },
    {
      id: "idempotent_replay",
      label: "Retry idêntico é idempotente",
      passed: replay.accepted && replay.receipt.replayed,
      note: "A mesma prova não cria uma segunda reserva.",
    },
    {
      id: "current_runtime_blocked",
      label: "Runtime atual não aceita evidência",
      passed: !current.accepted && current.reason === "signature_invalid",
      note: "Registro de chaves e replay ledger ainda não existem.",
    },
  ];
  const passedCheckCount = checks.filter((item) => item.passed).length;

  return {
    generatedAt,
    status: passedCheckCount === checks.length ? "contract_verified" : "contract_failed",
    assurance: "cryptographic_intake_blueprint",
    runtime: {
      trustedKeyRegistry: false,
      durableReplayLedger: false,
      productionEvidenceSource: false,
      passed: 0,
      total: 3,
    },
    runtimeEvidenceAccepted: false,
    productionClaimsAllowed: false,
    checks,
    passedCheckCount,
    checkCount: checks.length,
    sensitivePayloadReturned: false,
  };
}
