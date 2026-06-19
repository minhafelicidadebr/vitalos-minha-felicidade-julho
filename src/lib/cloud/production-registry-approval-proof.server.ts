import { generateKeyPairSync, sign } from "node:crypto";
import type { IssuedAccessGrant } from "@/engine/identity/grant-issuance-engine";
import type { SessionTrustDecision } from "@/engine/identity/session-contract-engine";
import {
  canonicalizeRegistryApprovalAttestation,
  createRegistryApprovalDraft,
  type RegistryApprovalPolicy,
  type RegistryApprovalRequest,
  type SignedRegistryApprovalAttestation,
} from "@/engine/cloud/production-registry-approval-engine";
import {
  digestRegistryApprovalAttestation,
  fingerprintApprovalSealKey,
  verifyRegistryApprovalAttestation,
} from "./production-registry-approval-verifier.server";

export interface ProductionRegistryApprovalProof {
  generatedAt: string;
  status: "contract_verified" | "contract_failed";
  assurance: "authorized_approval_blueprint";
  runtime: {
    signedSession: false;
    serverGrants: false;
    approvalSealKey: false;
    durableApprovalNonceLedger: false;
    passed: 0;
    total: 4;
  };
  verifiedRegistryApprovalsActive: false;
  productionClaimsAllowed: false;
  checks: Array<{ id: string; label: string; passed: boolean; note: string }>;
  passedCheckCount: number;
  checkCount: number;
  sensitivePayloadReturned: false;
}

function signApproval(
  claims: NonNullable<
    ReturnType<typeof createRegistryApprovalDraft> extends { claims: infer T } ? T : never
  >,
  privateKey: ReturnType<typeof generateKeyPairSync>["privateKey"],
): SignedRegistryApprovalAttestation {
  return {
    claims,
    signature: sign(
      null,
      Buffer.from(canonicalizeRegistryApprovalAttestation(claims)),
      privateKey,
    ).toString("base64url"),
  };
}

export function buildProductionRegistryApprovalProof(
  generatedAt = new Date().toISOString(),
): ProductionRegistryApprovalProof {
  const trusted = generateKeyPairSync("ed25519");
  const attacker = generateKeyPairSync("ed25519");
  const publicKeyPem = trusted.publicKey.export({ type: "spki", format: "pem" }).toString();
  const sealPublicKeySha256 = fingerprintApprovalSealKey(publicKeyPem);
  if (!sealPublicKeySha256) throw new Error("fixture seal key must be valid");

  const policy: RegistryApprovalPolicy = {
    issuer: "fixture-approval-service",
    audience: "fixture-key-registry",
    sealKeyId: "fixture-seal",
    sealPublicKeySha256,
    requiredPermission: "key_registry.approve",
    requiredDomain: "platform_security",
    requiredScopeKind: "key_registry",
    maxApprovalLifetimeSeconds: 600,
    maxAttestationAgeSeconds: 600,
    clockSkewSeconds: 30,
  };
  const request: RegistryApprovalRequest = {
    schema: "vitalos.key-registry-approval-request.v1",
    registryId: "fixture-registry",
    proposalDigest: "a".repeat(64),
    action: "activate",
    keyId: "fixture-key",
    nonce: "fixture_approval_nonce_1234",
    requestedAt: "2026-06-19T20:01:00.000Z",
    expiresAt: "2026-06-19T20:20:00.000Z",
  };
  const session: SessionTrustDecision = {
    trusted: true,
    reason: "trusted",
    context: {
      source: "server_adapter",
      subjectId: "fixture-approver",
      activeTenantId: "fixture-tenant",
      organizationId: "fixture-org",
      roleIds: ["security"],
      authMethod: "webauthn",
      sessionExpiresAt: "2026-06-19T21:00:00.000Z",
    },
  };
  const grant: IssuedAccessGrant = {
    roleId: "security",
    tenantId: "fixture-tenant",
    permission: "key_registry.approve",
    scope: { kind: "key_registry", refId: request.registryId },
    domains: ["platform_security"],
    expiresOn: "2026-06-19T20:30:00.000Z",
    source: "membership_policy",
    issuedAt: "2026-06-19T20:00:00.000Z",
  };
  const create = (candidateSession = session, grants: readonly IssuedAccessGrant[] = [grant]) =>
    createRegistryApprovalDraft(
      request,
      candidateSession,
      grants,
      policy,
      "2026-06-19T20:05:00.000Z",
    );
  const draft = create();
  if (!draft.created) throw new Error("fixture draft must be created");
  const envelope = signApproval(draft.claims, trusted.privateKey);
  const attackerEnvelope = signApproval(draft.claims, attacker.privateKey);
  const attestationDigest = digestRegistryApprovalAttestation(envelope);
  const committed = {
    confirmed: true as const,
    status: "committed" as const,
    nonce: draft.claims.nonce,
    actorId: draft.claims.actorId,
    proposalDigest: draft.claims.proposalDigest,
    attestationDigest,
    committedAt: "2026-06-19T20:06:01.000Z",
  };
  const verify = (
    candidate: SignedRegistryApprovalAttestation,
    overrides: Partial<Parameters<typeof verifyRegistryApprovalAttestation>[0]> = {},
  ) =>
    verifyRegistryApprovalAttestation({
      envelope: candidate,
      policy,
      evaluatedAt: "2026-06-19T20:06:00.000Z",
      trustedSealKeys: [{ keyId: policy.sealKeyId, algorithm: "Ed25519", publicKeyPem }],
      nonceCommit: committed,
      ...overrides,
    });

  const valid = verify(envelope);
  const untrusted = create({ trusted: false, reason: "signature_invalid", context: null });
  const permission = create(session, [{ ...grant, permission: "aggregate.read" }]);
  const scope = create(session, [
    { ...grant, scope: { kind: "key_registry", refId: "fixture-other" } },
  ]);
  const domain = create(session, [{ ...grant, domains: ["other"] }]);
  const readOnly = create(session, [{ ...grant, readOnly: true }]);
  const forgedGrant = create(session, [{ ...grant, source: "forged" as "membership_policy" }]);
  const forged = verify(attackerEnvelope);
  const substituted = verify(attackerEnvelope, {
    trustedSealKeys: [
      {
        keyId: policy.sealKeyId,
        algorithm: "Ed25519",
        publicKeyPem: attacker.publicKey.export({ type: "spki", format: "pem" }).toString(),
      },
    ],
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
    trustedSealKeys: [],
    nonceCommit: { confirmed: false, status: "adapter_error" },
  });

  const checks = [
    {
      id: "authority_derived",
      label: "Identidade e papel vêm do servidor",
      passed:
        draft.claims.actorId === session.context?.subjectId && draft.claims.role === grant.roleId,
      note: "O request cliente não possui campos de autoridade.",
    },
    {
      id: "trusted_session_required",
      label: "Sessão não confiável não cria aprovação",
      passed: !untrusted.created && untrusted.reason === "untrusted_session",
      note: "Persona local ou token inválido não chegam ao quorum.",
    },
    {
      id: "permission_required",
      label: "Permissão explícita é obrigatória",
      passed: !permission.created && permission.reason === "permission_denied",
      note: "Papel nominal não substitui entitlement.",
    },
    {
      id: "scope_bound",
      label: "Grant permanece no registry autorizado",
      passed: !scope.created && scope.reason === "scope_denied",
      note: "Aprovação não atravessa registry.",
    },
    {
      id: "domain_bound",
      label: "Domínio de segurança é explícito",
      passed: !domain.created && domain.reason === "domain_denied",
      note: "Grant de outro domínio não administra chaves.",
    },
    {
      id: "write_required",
      label: "Grant somente leitura não aprova",
      passed: !readOnly.created && readOnly.reason === "read_only",
      note: "Leitura de governança não implica poder de mutação.",
    },
    {
      id: "grant_source",
      label: "Grant precisa nascer da membership policy",
      passed: !forgedGrant.created && forgedGrant.reason === "grant_source_invalid",
      note: "Objeto fabricado não adquire autoridade por formato.",
    },
    {
      id: "valid_seal",
      label: "Selo Ed25519 válido produz aprovação",
      passed: valid.accepted && valid.approval.verified,
      note: "A atestação é canônica e verificada no servidor.",
    },
    {
      id: "forgery_rejected",
      label: "Selo atacante é recusado",
      passed: !forged.accepted && forged.reason === "signature_invalid",
      note: "Claims bem formados não criam autenticidade.",
    },
    {
      id: "key_substitution_rejected",
      label: "Substituição da chave de selo falha",
      passed: !substituted.accepted && substituted.reason === "signature_invalid",
      note: "Fingerprint fixa o material exato da chave.",
    },
    {
      id: "nonce_commit_required",
      label: "Nonce exige commit durável",
      passed: !rollback.accepted && rollback.reason === "nonce_uncommitted",
      note: "Rollback não entra no quorum.",
    },
    {
      id: "nonce_conflict",
      label: "Conflito de nonce é bloqueado",
      passed: !conflict.accepted && conflict.reason === "nonce_conflict",
      note: "Aprovação não pode ser reciclada com outro conteúdo.",
    },
    {
      id: "idempotent_retry",
      label: "Retry exato é idempotente",
      passed: replay.accepted && replay.receipt.replayed,
      note: "A mesma aprovação não duplica presença no ledger.",
    },
    {
      id: "current_runtime_blocked",
      label: "Runtime atual não verifica aprovadores",
      passed: !current.accepted && current.reason === "signature_invalid",
      note: "Sessão, grants, selo e ledger reais ainda não existem.",
    },
  ];
  const passedCheckCount = checks.filter((check) => check.passed).length;

  return {
    generatedAt,
    status: passedCheckCount === checks.length ? "contract_verified" : "contract_failed",
    assurance: "authorized_approval_blueprint",
    runtime: {
      signedSession: false,
      serverGrants: false,
      approvalSealKey: false,
      durableApprovalNonceLedger: false,
      passed: 0,
      total: 4,
    },
    verifiedRegistryApprovalsActive: false,
    productionClaimsAllowed: false,
    checks,
    passedCheckCount,
    checkCount: checks.length,
    sensitivePayloadReturned: false,
  };
}
