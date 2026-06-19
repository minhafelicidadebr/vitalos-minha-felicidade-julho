import { describe, expect, test } from "bun:test";
import type { IssuedAccessGrant } from "@/engine/identity/grant-issuance-engine";
import type { SessionTrustDecision } from "@/engine/identity/session-contract-engine";
import {
  createRegistryApprovalDraft,
  evaluateRegistryApprovalIntake,
  type RegistryApprovalIntakeInput,
  type RegistryApprovalPolicy,
  type RegistryApprovalRequest,
} from "./production-registry-approval-engine";

const session: SessionTrustDecision = {
  trusted: true,
  reason: "trusted",
  context: {
    source: "server_adapter",
    subjectId: "approver-a",
    activeTenantId: "tenant-a",
    organizationId: "org-a",
    roleIds: ["security"],
    authMethod: "webauthn",
    sessionExpiresAt: "2026-06-19T21:00:00.000Z",
  },
};
const grant: IssuedAccessGrant = {
  roleId: "security",
  tenantId: "tenant-a",
  permission: "key_registry.approve",
  scope: { kind: "key_registry", refId: "production-evidence" },
  domains: ["platform_security"],
  expiresOn: "2026-06-19T20:30:00.000Z",
  source: "membership_policy",
  issuedAt: "2026-06-19T20:00:00.000Z",
};
const policy: RegistryApprovalPolicy = {
  issuer: "vitalos-approval-service",
  audience: "vitalos-key-registry",
  sealKeyId: "approval-seal-2026",
  sealPublicKeySha256: "a".repeat(64),
  requiredPermission: "key_registry.approve",
  requiredDomain: "platform_security",
  requiredScopeKind: "key_registry",
  maxApprovalLifetimeSeconds: 600,
  maxAttestationAgeSeconds: 600,
  clockSkewSeconds: 30,
};
const request: RegistryApprovalRequest = {
  schema: "vitalos.key-registry-approval-request.v1",
  registryId: "production-evidence",
  proposalDigest: "b".repeat(64),
  action: "activate",
  keyId: "key-new",
  nonce: "approval_nonce_1234567890",
  requestedAt: "2026-06-19T20:01:00.000Z",
  expiresAt: "2026-06-19T20:20:00.000Z",
};

describe("registry approval authority", () => {
  test("derives actor and role from trusted session and scoped grant", () => {
    expect(
      createRegistryApprovalDraft(request, session, [grant], policy, "2026-06-19T20:05:00.000Z"),
    ).toMatchObject({
      created: true,
      claims: {
        actorId: "approver-a",
        tenantId: "tenant-a",
        organizationId: "org-a",
        role: "security",
        registryId: "production-evidence",
        expiresAt: "2026-06-19T20:15:00.000Z",
      },
    });
  });

  test("fails closed for untrusted session and authorization drift", () => {
    expect(
      createRegistryApprovalDraft(
        request,
        { trusted: false, reason: "signature_invalid", context: null },
        [grant],
        policy,
        "2026-06-19T20:05:00.000Z",
      ).reason,
    ).toBe("untrusted_session");
    expect(
      createRegistryApprovalDraft(
        request,
        session,
        [{ ...grant, permission: "aggregate.read" }],
        policy,
        "2026-06-19T20:05:00.000Z",
      ).reason,
    ).toBe("permission_denied");
    expect(
      createRegistryApprovalDraft(
        request,
        session,
        [{ ...grant, scope: { kind: "key_registry", refId: "other" } }],
        policy,
        "2026-06-19T20:05:00.000Z",
      ).reason,
    ).toBe("scope_denied");
    expect(
      createRegistryApprovalDraft(
        request,
        session,
        [{ ...grant, domains: ["other"] }],
        policy,
        "2026-06-19T20:05:00.000Z",
      ).reason,
    ).toBe("domain_denied");
    expect(
      createRegistryApprovalDraft(
        request,
        session,
        [{ ...grant, readOnly: true }],
        policy,
        "2026-06-19T20:05:00.000Z",
      ).reason,
    ).toBe("read_only");
    expect(
      createRegistryApprovalDraft(
        request,
        session,
        [{ ...grant, source: "forged" as "membership_policy" }],
        policy,
        "2026-06-19T20:05:00.000Z",
      ).reason,
    ).toBe("grant_source_invalid");
  });

  test("bounds approval lifetime by request, session, grant and policy", () => {
    expect(
      createRegistryApprovalDraft(
        { ...request, expiresAt: "2026-06-19T20:08:00.000Z" },
        session,
        [grant],
        policy,
        "2026-06-19T20:05:00.000Z",
      ),
    ).toMatchObject({ created: true, claims: { expiresAt: "2026-06-19T20:08:00.000Z" } });
  });
});

const claims = createRegistryApprovalDraft(
  request,
  session,
  [grant],
  policy,
  "2026-06-19T20:05:00.000Z",
);
if (!claims.created) throw new Error("fixture draft must be created");
const baseIntake: RegistryApprovalIntakeInput = {
  envelope: { claims: claims.claims, signature: "A".repeat(86) },
  policy,
  evaluatedAt: "2026-06-19T20:06:00.000Z",
  signatureVerification: {
    verified: true,
    keyId: policy.sealKeyId,
    algorithm: "Ed25519",
    attestationDigest: "c".repeat(64),
  },
  nonceCommit: {
    confirmed: true,
    status: "committed",
    nonce: request.nonce,
    actorId: "approver-a",
    proposalDigest: request.proposalDigest,
    attestationDigest: "c".repeat(64),
    committedAt: "2026-06-19T20:06:01.000Z",
  },
};

describe("registry approval intake", () => {
  test("emits a verified approval only after seal and nonce commit", () => {
    expect(evaluateRegistryApprovalIntake(baseIntake)).toMatchObject({
      accepted: true,
      approval: {
        actorId: "approver-a",
        role: "security",
        verified: true,
      },
      receipt: {
        persistedNonce: true,
        replayed: false,
        identityReturned: false,
      },
    });
  });

  test("rejects forged seals, stale attestations and replay conflicts", () => {
    expect(
      evaluateRegistryApprovalIntake({
        ...baseIntake,
        signatureVerification: { ...baseIntake.signatureVerification, verified: false },
      }).reason,
    ).toBe("signature_invalid");
    expect(
      evaluateRegistryApprovalIntake({
        ...baseIntake,
        evaluatedAt: "2026-06-19T20:16:00.000Z",
      }).reason,
    ).toBe("expired");
    expect(
      evaluateRegistryApprovalIntake({
        ...baseIntake,
        nonceCommit: { confirmed: false, status: "conflict" },
      }).reason,
    ).toBe("nonce_conflict");
    expect(
      evaluateRegistryApprovalIntake({
        ...baseIntake,
        nonceCommit: { confirmed: false, status: "rolled_back" },
      }).reason,
    ).toBe("nonce_uncommitted");
  });

  test("exact retry is idempotent", () => {
    if (!baseIntake.nonceCommit.confirmed) throw new Error("fixture commit");
    expect(
      evaluateRegistryApprovalIntake({
        ...baseIntake,
        nonceCommit: { ...baseIntake.nonceCommit, status: "replayed" },
      }),
    ).toMatchObject({ accepted: true, receipt: { replayed: true } });
  });
});
