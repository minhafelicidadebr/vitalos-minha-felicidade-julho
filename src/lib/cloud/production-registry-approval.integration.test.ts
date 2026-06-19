import { describe, expect, test } from "bun:test";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import {
  canonicalizeKeyRegistryProposal,
  evaluateKeyRegistryMutation,
  type KeyRegistryProposal,
  type ProductionKeyRegistryState,
  type VerifiedRegistryApproval,
} from "@/engine/cloud/production-key-registry-engine";
import {
  canonicalizeRegistryApprovalAttestation,
  createRegistryApprovalDraft,
  type RegistryApprovalPolicy,
  type RegistryApprovalRequest,
} from "@/engine/cloud/production-registry-approval-engine";
import { issueMembershipGrants } from "@/engine/identity/grant-issuance-engine";
import {
  resolveTrustedSession,
  type VerifiedSessionClaims,
} from "@/engine/identity/session-contract-engine";
import {
  digestRegistryApprovalAttestation,
  fingerprintApprovalSealKey,
  verifyRegistryApprovalAttestation,
} from "./production-registry-approval-verifier.server";

const registryId = "production-evidence";
const evaluatedAt = "2026-06-19T20:10:00.000Z";
const sealPair = generateKeyPairSync("ed25519");
const sealPublicKeyPem = sealPair.publicKey.export({ type: "spki", format: "pem" }).toString();
const sealPublicKeySha256 = fingerprintApprovalSealKey(sealPublicKeyPem);
if (!sealPublicKeySha256) throw new Error("fixture seal key");

const approvalPolicy: RegistryApprovalPolicy = {
  issuer: "vitalos-approval-service",
  audience: "vitalos-key-registry",
  sealKeyId: "approval-seal",
  sealPublicKeySha256,
  requiredPermission: "key_registry.approve",
  requiredDomain: "platform_security",
  requiredScopeKind: "key_registry",
  maxApprovalLifetimeSeconds: 600,
  maxAttestationAgeSeconds: 600,
  clockSkewSeconds: 30,
};

function createApproval(
  actorId: string,
  role: "security" | "platform",
  proposal: KeyRegistryProposal,
  proposalDigest: string,
  scopeRef = registryId,
): VerifiedRegistryApproval | null {
  const claims: VerifiedSessionClaims = {
    adapter: "lovable-cloud",
    verificationPerformed: true,
    signatureVerified: true,
    issuer: "lovable-auth",
    audience: "vitalos",
    subjectId: actorId,
    sessionId: `session-${actorId}`,
    authMethod: "webauthn",
    issuedAt: "2026-06-19T20:00:00.000Z",
    expiresAt: "2026-06-19T21:00:00.000Z",
  };
  const session = resolveTrustedSession({
    claims,
    memberships: [
      {
        subjectId: actorId,
        tenantId: "tenant-a",
        organizationId: "org-a",
        roleIds: [role],
        status: "active",
        validFrom: "2026-01-01T00:00:00.000Z",
      },
    ],
    requestedTenantId: "tenant-a",
    policy: {
      expectedAdapter: "lovable-cloud",
      expectedIssuer: "lovable-auth",
      expectedAudience: "vitalos",
      evaluatedAt,
      maxSessionAgeSeconds: 3_600,
    },
  });
  const grants = issueMembershipGrants({
    session,
    membership: {
      subjectId: actorId,
      tenantId: "tenant-a",
      organizationId: "org-a",
      roleId: role,
      status: "active",
      validFrom: "2026-01-01T00:00:00.000Z",
      scopeRefs: { key_registry: [registryId] },
    },
    entitlements: [
      {
        permission: "key_registry.approve",
        scope: { kind: "key_registry", refId: scopeRef },
        domain: "platform_security",
      },
    ],
    policy: {
      evaluatedAt,
      maxGrantLifetimeSeconds: 900,
      allowedPermissions: ["key_registry.approve"],
      forbiddenPermissions: [],
      allowedDomains: ["platform_security"],
      allowedScopeKinds: ["key_registry"],
      wildcardScopeKinds: [],
    },
  });
  if (!grants.issued) return null;

  const request: RegistryApprovalRequest = {
    schema: "vitalos.key-registry-approval-request.v1",
    registryId,
    proposalDigest,
    action: proposal.action,
    keyId: proposal.keyId,
    nonce: `approval_${actorId}_nonce_1234`,
    requestedAt: "2026-06-19T20:05:00.000Z",
    expiresAt: "2026-06-19T20:20:00.000Z",
  };
  const draft = createRegistryApprovalDraft(
    request,
    session,
    grants.grants,
    approvalPolicy,
    evaluatedAt,
  );
  if (!draft.created) return null;
  const envelope = {
    claims: draft.claims,
    signature: sign(
      null,
      Buffer.from(canonicalizeRegistryApprovalAttestation(draft.claims)),
      sealPair.privateKey,
    ).toString("base64url"),
  };
  const attestationDigest = digestRegistryApprovalAttestation(envelope);
  const intake = verifyRegistryApprovalAttestation({
    envelope,
    policy: approvalPolicy,
    evaluatedAt,
    trustedSealKeys: [
      { keyId: approvalPolicy.sealKeyId, algorithm: "Ed25519", publicKeyPem: sealPublicKeyPem },
    ],
    nonceCommit: {
      confirmed: true,
      status: "committed",
      nonce: draft.claims.nonce,
      actorId: draft.claims.actorId,
      proposalDigest,
      attestationDigest,
      committedAt: "2026-06-19T20:10:01.000Z",
    },
  });
  return intake.accepted ? intake.approval : null;
}

const state: ProductionKeyRegistryState = {
  schema: "vitalos.production-key-registry.v1",
  registryId,
  version: 4,
  keys: [
    {
      keyId: "key-old",
      algorithm: "Ed25519",
      publicKeySha256: "a".repeat(64),
      status: "active",
      validFrom: "2026-01-01T00:00:00.000Z",
      validUntil: "2026-12-31T00:00:00.000Z",
      activatedAt: "2026-01-01T00:00:00.000Z",
      retiredAt: null,
      revokedAt: null,
    },
    {
      keyId: "key-new",
      algorithm: "Ed25519",
      publicKeySha256: "b".repeat(64),
      status: "pending",
      validFrom: "2026-06-19T20:00:00.000Z",
      validUntil: "2027-06-19T20:00:00.000Z",
      activatedAt: null,
      retiredAt: null,
      revokedAt: null,
    },
  ],
  appliedRequests: [],
};
const proposal: KeyRegistryProposal = {
  schema: "vitalos.key-registry-proposal.v1",
  requestId: "activate-key-new",
  registryId,
  baseVersion: 4,
  action: "activate",
  keyId: "key-new",
  requestedBy: "operator-requester",
  requestedAt: "2026-06-19T20:01:00.000Z",
  expiresAt: "2026-06-19T21:00:00.000Z",
};
const proposalDigest = createHash("sha256")
  .update(canonicalizeKeyRegistryProposal(proposal))
  .digest("hex");

function mutation(approvals: VerifiedRegistryApproval[]) {
  return evaluateKeyRegistryMutation({
    state,
    proposal,
    proposalDigest,
    approvals,
    policy: {
      minApprovals: 2,
      minDistinctRoles: 2,
      allowedApprovalRoles: ["security", "platform"],
      approvalMaxAgeSeconds: 900,
      clockSkewSeconds: 30,
      minimumRotationOverlapSeconds: 86_400,
      maxActiveKeys: 3,
      allowBootstrapActivation: false,
    },
    evaluatedAt,
  });
}

describe("identity → sealed approval → governed registry", () => {
  test("two authorized and sealed approvals satisfy the registry quorum", () => {
    const security = createApproval("approver-security", "security", proposal, proposalDigest);
    const platform = createApproval("approver-platform", "platform", proposal, proposalDigest);
    if (!security || !platform) throw new Error("fixture approvals");

    expect(mutation([security, platform])).toMatchObject({
      allowed: true,
      action: "commit",
      nextState: { version: 5 },
    });
  });

  test("scope drift removes authority and leaves quorum blocked", () => {
    const security = createApproval("approver-security", "security", proposal, proposalDigest);
    const wrongScope = createApproval(
      "approver-platform",
      "platform",
      proposal,
      proposalDigest,
      "other-registry",
    );
    expect(wrongScope).toBeNull();
    if (!security) throw new Error("fixture security approval");
    expect(mutation([security])).toMatchObject({
      allowed: false,
      reason: "approval_quorum",
    });
  });
});
