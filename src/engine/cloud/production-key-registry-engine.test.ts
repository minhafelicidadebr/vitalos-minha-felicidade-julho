import { describe, expect, test } from "bun:test";
import {
  deriveTrustedEvidenceKeys,
  evaluateKeyRegistryMutation,
  issueKeyRegistryMutationReceipt,
  type KeyRegistryMutationInput,
  type KeyRegistryProposal,
  type ProductionKeyRegistryState,
} from "./production-key-registry-engine";

const digest = "a".repeat(64);
const state: ProductionKeyRegistryState = {
  schema: "vitalos.production-key-registry.v1",
  registryId: "prod-evidence",
  version: 4,
  keys: [
    {
      keyId: "key-old",
      algorithm: "Ed25519",
      publicKeySha256: "b".repeat(64),
      status: "active",
      validFrom: "2026-01-01T00:00:00.000Z",
      validUntil: "2026-07-01T00:00:00.000Z",
      activatedAt: "2026-01-01T00:00:00.000Z",
      retiredAt: null,
      revokedAt: null,
    },
    {
      keyId: "key-new",
      algorithm: "Ed25519",
      publicKeySha256: "c".repeat(64),
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
  requestId: "request-activate-new",
  registryId: "prod-evidence",
  baseVersion: 4,
  action: "activate",
  keyId: "key-new",
  requestedBy: "operator-requester",
  requestedAt: "2026-06-19T20:01:00.000Z",
  expiresAt: "2026-06-19T21:01:00.000Z",
};
const base: KeyRegistryMutationInput = {
  state,
  proposal,
  proposalDigest: digest,
  approvals: [
    {
      actorId: "security-approver",
      role: "security",
      proposalDigest: digest,
      action: "activate",
      keyId: "key-new",
      approvedAt: "2026-06-19T20:02:00.000Z",
      verified: true,
    },
    {
      actorId: "platform-approver",
      role: "platform",
      proposalDigest: digest,
      action: "activate",
      keyId: "key-new",
      approvedAt: "2026-06-19T20:03:00.000Z",
      verified: true,
    },
  ],
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
  evaluatedAt: "2026-06-19T20:05:00.000Z",
};

describe("production key registry governance", () => {
  test("activates a pending key only with quorum and safe overlap", () => {
    expect(evaluateKeyRegistryMutation(base)).toMatchObject({
      allowed: true,
      action: "commit",
      reason: "mutation_planned",
      previousVersion: 4,
      nextState: {
        version: 5,
        keys: [
          { keyId: "key-old", status: "active" },
          { keyId: "key-new", status: "active" },
        ],
      },
    });
  });

  test("enforces distinct approvers, roles and separation of duties", () => {
    expect(
      evaluateKeyRegistryMutation({
        ...base,
        approvals: [base.approvals[0]!, { ...base.approvals[1]!, actorId: "security-approver" }],
      }).reason,
    ).toBe("approval_quorum");
    expect(
      evaluateKeyRegistryMutation({
        ...base,
        approvals: [base.approvals[0]!, { ...base.approvals[1]!, role: "security" }],
      }).reason,
    ).toBe("approval_role_quorum");
    expect(
      evaluateKeyRegistryMutation({
        ...base,
        approvals: [{ ...base.approvals[0]!, actorId: proposal.requestedBy }, base.approvals[1]!],
      }).reason,
    ).toBe("separation_of_duties");
  });

  test("rejects stale versions and divergent request replay", () => {
    expect(
      evaluateKeyRegistryMutation({
        ...base,
        proposal: { ...proposal, baseVersion: 3 },
      }).reason,
    ).toBe("version_conflict");
    expect(
      evaluateKeyRegistryMutation({
        ...base,
        state: {
          ...state,
          appliedRequests: [
            { requestId: proposal.requestId, proposalDigest: "d".repeat(64), resultingVersion: 4 },
          ],
        },
      }).reason,
    ).toBe("request_conflict");
  });

  test("rejects malformed snapshots and blank approver identities", () => {
    expect(
      evaluateKeyRegistryMutation({
        ...base,
        state: {
          ...state,
          keys: [{ ...state.keys[0]!, status: "active", activatedAt: null }, state.keys[1]!],
        },
      }).reason,
    ).toBe("invalid_state");
    expect(
      evaluateKeyRegistryMutation({
        ...base,
        approvals: [{ ...base.approvals[0]!, actorId: " " }, base.approvals[1]!],
      }).reason,
    ).toBe("approval_invalid");
  });

  test("exact request retry is idempotent", () => {
    expect(
      evaluateKeyRegistryMutation({
        ...base,
        state: {
          ...state,
          version: 5,
          appliedRequests: [
            { requestId: proposal.requestId, proposalDigest: digest, resultingVersion: 5 },
          ],
        },
      }),
    ).toMatchObject({
      allowed: true,
      action: "replay",
      reason: "idempotent_replay",
    });
  });

  test("blocks activation without overlap or beyond active-key limit", () => {
    expect(
      evaluateKeyRegistryMutation({
        ...base,
        state: { ...state, keys: [state.keys[1]!] },
      }).reason,
    ).toBe("rotation_overlap");
    expect(
      evaluateKeyRegistryMutation({
        ...base,
        policy: { ...base.policy, maxActiveKeys: 1 },
      }).reason,
    ).toBe("active_key_limit");
  });

  test("retirement requires an active successor and shortens trust validity", () => {
    const activated = evaluateKeyRegistryMutation(base);
    if (!activated.allowed || activated.action !== "commit") throw new Error("fixture activation");
    const retireProposal: KeyRegistryProposal = {
      ...proposal,
      requestId: "request-retire-old",
      baseVersion: 5,
      action: "retire",
      keyId: "key-old",
      effectiveAt: "2026-06-19T20:10:00.000Z",
    };
    const retirement = evaluateKeyRegistryMutation({
      ...base,
      state: activated.nextState,
      proposal: retireProposal,
      approvals: base.approvals.map((approval) => ({
        ...approval,
        action: "retire",
        keyId: "key-old",
      })),
      evaluatedAt: "2026-06-19T20:10:00.000Z",
    });
    expect(retirement).toMatchObject({
      allowed: true,
      nextState: {
        version: 6,
        keys: [
          { keyId: "key-old", status: "retired" },
          { keyId: "key-new", status: "active" },
        ],
      },
    });
    if (!retirement.allowed) throw new Error("fixture retirement");
    expect(deriveTrustedEvidenceKeys(retirement.nextState)[0]?.validUntil).toBe(
      "2026-06-19T20:10:00.000Z",
    );

    expect(
      evaluateKeyRegistryMutation({
        ...base,
        proposal: {
          ...retireProposal,
          baseVersion: 4,
        },
        approvals: base.approvals.map((approval) => ({
          ...approval,
          action: "retire",
          keyId: "key-old",
        })),
        evaluatedAt: "2026-06-19T20:10:00.000Z",
      }).reason,
    ).toBe("active_successor_missing");
  });

  test("revocation is immediate and exported as revoked trust metadata", () => {
    const revokeProposal: KeyRegistryProposal = {
      ...proposal,
      requestId: "request-revoke-old",
      action: "revoke",
      keyId: "key-old",
      effectiveAt: "2026-06-19T20:05:00.000Z",
      reasonCode: "suspected_compromise",
    };
    const revocation = evaluateKeyRegistryMutation({
      ...base,
      proposal: revokeProposal,
      approvals: base.approvals.map((approval) => ({
        ...approval,
        action: "revoke",
        keyId: "key-old",
      })),
    });
    expect(revocation).toMatchObject({ allowed: true, nextState: { version: 5 } });
    if (!revocation.allowed) throw new Error("fixture revocation");
    expect(revocation.nextState.keys.find((key) => key.keyId === "key-old")?.status).toBe(
      "revoked",
    );
    expect(deriveTrustedEvidenceKeys(revocation.nextState)[0]?.revoked).toBe(true);
  });

  test("durable receipt exists only after matching commit", () => {
    const plan = evaluateKeyRegistryMutation(base);
    expect(
      issueKeyRegistryMutationReceipt(plan, proposal, {
        confirmed: true,
        status: "committed",
        registryId: "prod-evidence",
        requestId: proposal.requestId,
        proposalDigest: digest,
        version: 5,
        committedAt: "2026-06-19T20:05:01.000Z",
      }),
    ).toMatchObject({
      issued: true,
      receipt: { version: 5, persisted: true, keyMaterialReturned: false },
    });
    expect(
      issueKeyRegistryMutationReceipt(plan, proposal, {
        confirmed: false,
        status: "rolled_back",
      }).issued,
    ).toBe(false);
  });
});
