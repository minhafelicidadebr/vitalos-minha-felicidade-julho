import type { TrustedEvidenceKey } from "./production-evidence-intake-engine";

export type RegistryKeyStatus = "pending" | "active" | "retired" | "revoked";
export type RegistryMutationAction = "register" | "activate" | "retire" | "revoke";

export interface ProductionRegistryKey {
  keyId: string;
  algorithm: "Ed25519";
  publicKeySha256: string;
  status: RegistryKeyStatus;
  validFrom: string;
  validUntil: string;
  activatedAt: string | null;
  retiredAt: string | null;
  revokedAt: string | null;
}

export interface AppliedRegistryRequest {
  requestId: string;
  proposalDigest: string;
  resultingVersion: number;
}

export interface ProductionKeyRegistryState {
  schema: "vitalos.production-key-registry.v1";
  registryId: string;
  version: number;
  keys: readonly ProductionRegistryKey[];
  appliedRequests: readonly AppliedRegistryRequest[];
}

interface RegistryProposalBase {
  schema: "vitalos.key-registry-proposal.v1";
  requestId: string;
  registryId: string;
  baseVersion: number;
  action: RegistryMutationAction;
  keyId: string;
  requestedBy: string;
  requestedAt: string;
  expiresAt: string;
}

export type KeyRegistryProposal =
  | (RegistryProposalBase & {
      action: "register";
      algorithm: "Ed25519";
      publicKeySha256: string;
      validFrom: string;
      validUntil: string;
    })
  | (RegistryProposalBase & {
      action: "activate";
    })
  | (RegistryProposalBase & {
      action: "retire";
      effectiveAt: string;
    })
  | (RegistryProposalBase & {
      action: "revoke";
      effectiveAt: string;
      reasonCode:
        | "compromised"
        | "suspected_compromise"
        | "operator_offboarding"
        | "superseded"
        | "policy_violation";
    });

export interface VerifiedRegistryApproval {
  actorId: string;
  role: string;
  proposalDigest: string;
  action: RegistryMutationAction;
  keyId: string;
  approvedAt: string;
  verified: boolean;
}

export interface KeyRegistryGovernancePolicy {
  minApprovals: number;
  minDistinctRoles: number;
  allowedApprovalRoles: readonly string[];
  approvalMaxAgeSeconds: number;
  clockSkewSeconds: number;
  minimumRotationOverlapSeconds: number;
  maxActiveKeys: number;
  allowBootstrapActivation: boolean;
}

export interface KeyRegistryMutationInput {
  state: ProductionKeyRegistryState;
  proposal: KeyRegistryProposal;
  proposalDigest: string;
  approvals: readonly VerifiedRegistryApproval[];
  policy: KeyRegistryGovernancePolicy;
  evaluatedAt: string;
}

export type KeyRegistryMutationReason =
  | "mutation_planned"
  | "idempotent_replay"
  | "invalid_state"
  | "invalid_policy"
  | "invalid_proposal"
  | "registry_mismatch"
  | "request_conflict"
  | "version_conflict"
  | "proposal_expired"
  | "approval_quorum"
  | "approval_role_quorum"
  | "approval_invalid"
  | "separation_of_duties"
  | "key_id_conflict"
  | "fingerprint_conflict"
  | "key_not_found"
  | "invalid_transition"
  | "key_not_active"
  | "rotation_overlap"
  | "active_key_limit"
  | "active_successor_missing";

export type KeyRegistryMutationPlan =
  | {
      allowed: true;
      action: "commit";
      reason: "mutation_planned";
      proposalDigest: string;
      previousVersion: number;
      nextState: ProductionKeyRegistryState;
    }
  | {
      allowed: true;
      action: "replay";
      reason: "idempotent_replay";
      proposalDigest: string;
      previousVersion: number;
      nextState: ProductionKeyRegistryState;
    }
  | {
      allowed: false;
      action: "deny";
      reason: Exclude<KeyRegistryMutationReason, "mutation_planned" | "idempotent_replay">;
      proposalDigest: string | null;
      previousVersion: number;
      nextState: null;
    };

export type KeyRegistryCommitConfirmation =
  | {
      confirmed: true;
      status: "committed" | "replayed";
      registryId: string;
      requestId: string;
      proposalDigest: string;
      version: number;
      committedAt: string;
    }
  | {
      confirmed: false;
      status: "rolled_back" | "adapter_error" | "conflict";
    };

export interface KeyRegistryMutationReceipt {
  schema: "vitalos.key-registry-receipt.v1";
  registryId: string;
  requestId: string;
  action: RegistryMutationAction;
  keyId: string;
  version: number;
  acceptedAt: string;
  replayed: boolean;
  persisted: true;
  keyMaterialReturned: false;
}

export type KeyRegistryReceiptDecision =
  | { issued: true; receipt: KeyRegistryMutationReceipt }
  | {
      issued: false;
      reason: "commit_unconfirmed" | "commit_mismatch";
      receipt: null;
    };

function parseTime(value: string): number | null {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function validDigest(value: string): boolean {
  return /^[a-f0-9]{64}$/.test(value);
}

function validState(state: ProductionKeyRegistryState): boolean {
  if (
    state.schema !== "vitalos.production-key-registry.v1" ||
    !state.registryId.trim() ||
    !Number.isInteger(state.version) ||
    state.version < 0
  ) {
    return false;
  }
  const keyIds = new Set<string>();
  const fingerprints = new Set<string>();
  for (const key of state.keys) {
    const validFrom = parseTime(key.validFrom);
    const validUntil = parseTime(key.validUntil);
    if (
      !key.keyId.trim() ||
      key.algorithm !== "Ed25519" ||
      !validDigest(key.publicKeySha256) ||
      validFrom === null ||
      validUntil === null ||
      validUntil <= validFrom ||
      keyIds.has(key.keyId) ||
      fingerprints.has(key.publicKeySha256)
    ) {
      return false;
    }
    const activatedAt = key.activatedAt ? parseTime(key.activatedAt) : null;
    const retiredAt = key.retiredAt ? parseTime(key.retiredAt) : null;
    const revokedAt = key.revokedAt ? parseTime(key.revokedAt) : null;
    if (
      (key.status === "pending" &&
        (key.activatedAt !== null || key.retiredAt !== null || key.revokedAt !== null)) ||
      (key.status === "active" &&
        (activatedAt === null || key.retiredAt !== null || key.revokedAt !== null)) ||
      (key.status === "retired" &&
        (activatedAt === null || retiredAt === null || key.revokedAt !== null)) ||
      (key.status === "revoked" && revokedAt === null)
    ) {
      return false;
    }
    keyIds.add(key.keyId);
    fingerprints.add(key.publicKeySha256);
  }
  const requestIds = new Set<string>();
  for (const request of state.appliedRequests) {
    if (
      !request.requestId.trim() ||
      !validDigest(request.proposalDigest) ||
      !Number.isInteger(request.resultingVersion) ||
      request.resultingVersion <= 0 ||
      request.resultingVersion > state.version ||
      requestIds.has(request.requestId)
    ) {
      return false;
    }
    requestIds.add(request.requestId);
  }
  return true;
}

function validPolicy(policy: KeyRegistryGovernancePolicy): boolean {
  return (
    Number.isInteger(policy.minApprovals) &&
    policy.minApprovals > 0 &&
    Number.isInteger(policy.minDistinctRoles) &&
    policy.minDistinctRoles > 0 &&
    policy.minDistinctRoles <= policy.minApprovals &&
    new Set(policy.allowedApprovalRoles).size === policy.allowedApprovalRoles.length &&
    policy.allowedApprovalRoles.every((role) => Boolean(role.trim())) &&
    Number.isInteger(policy.approvalMaxAgeSeconds) &&
    policy.approvalMaxAgeSeconds > 0 &&
    Number.isInteger(policy.clockSkewSeconds) &&
    policy.clockSkewSeconds >= 0 &&
    Number.isInteger(policy.minimumRotationOverlapSeconds) &&
    policy.minimumRotationOverlapSeconds >= 0 &&
    Number.isInteger(policy.maxActiveKeys) &&
    policy.maxActiveKeys > 0
  );
}

function denied(
  input: KeyRegistryMutationInput,
  reason: Exclude<KeyRegistryMutationReason, "mutation_planned" | "idempotent_replay">,
  digest: string | null = validDigest(input.proposalDigest) ? input.proposalDigest : null,
): KeyRegistryMutationPlan {
  return {
    allowed: false,
    action: "deny",
    reason,
    proposalDigest: digest,
    previousVersion: input.state.version,
    nextState: null,
  };
}

function replaceKey(
  state: ProductionKeyRegistryState,
  keyId: string,
  update: (key: ProductionRegistryKey) => ProductionRegistryKey,
): ProductionRegistryKey[] {
  return state.keys.map((key) => (key.keyId === keyId ? update(key) : { ...key }));
}

function activeAt(key: ProductionRegistryKey, at: number): boolean {
  const validFrom = parseTime(key.validFrom);
  const validUntil = parseTime(key.validUntil);
  return (
    key.status === "active" &&
    validFrom !== null &&
    validUntil !== null &&
    validFrom <= at &&
    at < validUntil
  );
}

function appendAppliedRequest(
  state: ProductionKeyRegistryState,
  requestId: string,
  proposalDigest: string,
): AppliedRegistryRequest[] {
  return [
    ...state.appliedRequests.map((request) => ({ ...request })),
    { requestId, proposalDigest, resultingVersion: state.version + 1 },
  ];
}

function planned(
  input: KeyRegistryMutationInput,
  keys: readonly ProductionRegistryKey[],
): KeyRegistryMutationPlan {
  return {
    allowed: true,
    action: "commit",
    reason: "mutation_planned",
    proposalDigest: input.proposalDigest,
    previousVersion: input.state.version,
    nextState: {
      schema: "vitalos.production-key-registry.v1",
      registryId: input.state.registryId,
      version: input.state.version + 1,
      keys,
      appliedRequests: appendAppliedRequest(
        input.state,
        input.proposal.requestId,
        input.proposalDigest,
      ),
    },
  };
}

/**
 * Plans a governed registry mutation. Approval signatures are verified by the
 * server boundary before entering this pure lifecycle engine.
 */
export function evaluateKeyRegistryMutation(
  input: KeyRegistryMutationInput,
): KeyRegistryMutationPlan {
  if (!validState(input.state)) return denied(input, "invalid_state");
  if (!validPolicy(input.policy)) return denied(input, "invalid_policy");
  if (!validDigest(input.proposalDigest)) return denied(input, "invalid_proposal", null);

  const { proposal } = input;
  const evaluatedAt = parseTime(input.evaluatedAt);
  const requestedAt = parseTime(proposal.requestedAt);
  const expiresAt = parseTime(proposal.expiresAt);
  if (
    proposal.schema !== "vitalos.key-registry-proposal.v1" ||
    !proposal.requestId.trim() ||
    !proposal.registryId.trim() ||
    !proposal.keyId.trim() ||
    !proposal.requestedBy.trim() ||
    !Number.isInteger(proposal.baseVersion) ||
    proposal.baseVersion < 0 ||
    evaluatedAt === null ||
    requestedAt === null ||
    expiresAt === null ||
    expiresAt <= requestedAt
  ) {
    return denied(input, "invalid_proposal");
  }
  if (proposal.registryId !== input.state.registryId) {
    return denied(input, "registry_mismatch");
  }

  const priorRequest = input.state.appliedRequests.find(
    (request) => request.requestId === proposal.requestId,
  );
  if (priorRequest) {
    if (priorRequest.proposalDigest !== input.proposalDigest) {
      return denied(input, "request_conflict");
    }
    return {
      allowed: true,
      action: "replay",
      reason: "idempotent_replay",
      proposalDigest: input.proposalDigest,
      previousVersion: input.state.version,
      nextState: input.state,
    };
  }
  if (proposal.baseVersion !== input.state.version) {
    return denied(input, "version_conflict");
  }

  const skewMs = input.policy.clockSkewSeconds * 1_000;
  if (requestedAt > evaluatedAt + skewMs || expiresAt <= evaluatedAt - skewMs) {
    return denied(input, "proposal_expired");
  }

  const eligibleApprovals = input.approvals.filter((approval) => {
    const approvedAt = parseTime(approval.approvedAt);
    return (
      approval.verified &&
      Boolean(approval.actorId.trim()) &&
      approval.proposalDigest === input.proposalDigest &&
      approval.action === proposal.action &&
      approval.keyId === proposal.keyId &&
      input.policy.allowedApprovalRoles.includes(approval.role) &&
      approvedAt !== null &&
      approvedAt >= requestedAt - skewMs &&
      approvedAt <= evaluatedAt + skewMs &&
      approvedAt < expiresAt &&
      evaluatedAt - approvedAt <= input.policy.approvalMaxAgeSeconds * 1_000 + skewMs
    );
  });
  if (eligibleApprovals.length !== input.approvals.length) {
    return denied(input, "approval_invalid");
  }
  if (eligibleApprovals.some((approval) => approval.actorId === proposal.requestedBy)) {
    return denied(input, "separation_of_duties");
  }
  const actors = new Set(eligibleApprovals.map((approval) => approval.actorId));
  if (actors.size < input.policy.minApprovals) return denied(input, "approval_quorum");
  const roles = new Set(eligibleApprovals.map((approval) => approval.role));
  if (roles.size < input.policy.minDistinctRoles) {
    return denied(input, "approval_role_quorum");
  }

  const existing = input.state.keys.find((key) => key.keyId === proposal.keyId);
  if (proposal.action === "register") {
    const validFrom = parseTime(proposal.validFrom);
    const validUntil = parseTime(proposal.validUntil);
    if (
      proposal.algorithm !== "Ed25519" ||
      !validDigest(proposal.publicKeySha256) ||
      validFrom === null ||
      validUntil === null ||
      validUntil <= validFrom
    ) {
      return denied(input, "invalid_proposal");
    }
    if (existing) return denied(input, "key_id_conflict");
    if (input.state.keys.some((key) => key.publicKeySha256 === proposal.publicKeySha256)) {
      return denied(input, "fingerprint_conflict");
    }
    return planned(input, [
      ...input.state.keys.map((key) => ({ ...key })),
      {
        keyId: proposal.keyId,
        algorithm: proposal.algorithm,
        publicKeySha256: proposal.publicKeySha256,
        status: "pending",
        validFrom: proposal.validFrom,
        validUntil: proposal.validUntil,
        activatedAt: null,
        retiredAt: null,
        revokedAt: null,
      },
    ]);
  }

  if (!existing) return denied(input, "key_not_found");
  if (proposal.action === "activate") {
    if (existing.status !== "pending") return denied(input, "invalid_transition");
    const validFrom = parseTime(existing.validFrom)!;
    const validUntil = parseTime(existing.validUntil)!;
    if (evaluatedAt < validFrom - skewMs || evaluatedAt >= validUntil) {
      return denied(input, "key_not_active");
    }
    const activeKeys = input.state.keys.filter((key) => activeAt(key, evaluatedAt));
    if (activeKeys.length >= input.policy.maxActiveKeys) {
      return denied(input, "active_key_limit");
    }
    if (activeKeys.length === 0 && !input.policy.allowBootstrapActivation) {
      return denied(input, "rotation_overlap");
    }
    if (activeKeys.length > 0) {
      const overlapSatisfied = activeKeys.some((key) => {
        const activeUntil = parseTime(key.validUntil)!;
        const overlapStart = Math.max(evaluatedAt, validFrom);
        const overlapEnd = Math.min(activeUntil, validUntil);
        return overlapEnd - overlapStart >= input.policy.minimumRotationOverlapSeconds * 1_000;
      });
      if (!overlapSatisfied) return denied(input, "rotation_overlap");
    }
    return planned(
      input,
      replaceKey(input.state, proposal.keyId, (key) => ({
        ...key,
        status: "active",
        activatedAt: input.evaluatedAt,
      })),
    );
  }

  const effectiveAt = parseTime(proposal.effectiveAt);
  if (
    effectiveAt === null ||
    effectiveAt < requestedAt - skewMs ||
    effectiveAt > evaluatedAt + skewMs
  ) {
    return denied(input, "invalid_proposal");
  }

  if (proposal.action === "retire") {
    if (existing.status !== "active") return denied(input, "invalid_transition");
    const successorExists = input.state.keys.some(
      (key) => key.keyId !== existing.keyId && activeAt(key, effectiveAt),
    );
    if (!successorExists) return denied(input, "active_successor_missing");
    return planned(
      input,
      replaceKey(input.state, proposal.keyId, (key) => ({
        ...key,
        status: "retired",
        validUntil:
          parseTime(key.validUntil)! < effectiveAt ? key.validUntil : proposal.effectiveAt,
        retiredAt: proposal.effectiveAt,
      })),
    );
  }

  if (existing.status === "revoked") return denied(input, "invalid_transition");
  return planned(
    input,
    replaceKey(input.state, proposal.keyId, (key) => ({
      ...key,
      status: "revoked",
      revokedAt: proposal.effectiveAt,
    })),
  );
}

export function issueKeyRegistryMutationReceipt(
  plan: KeyRegistryMutationPlan,
  proposal: KeyRegistryProposal,
  confirmation: KeyRegistryCommitConfirmation,
): KeyRegistryReceiptDecision {
  if (!confirmation.confirmed) {
    return { issued: false, reason: "commit_unconfirmed", receipt: null };
  }
  const expectedVersion =
    plan.allowed && plan.action === "commit"
      ? plan.nextState.version
      : plan.allowed && plan.action === "replay"
        ? plan.nextState.appliedRequests.find((request) => request.requestId === proposal.requestId)
            ?.resultingVersion
        : null;
  if (
    !plan.allowed ||
    expectedVersion === null ||
    expectedVersion === undefined ||
    confirmation.registryId !== proposal.registryId ||
    confirmation.requestId !== proposal.requestId ||
    confirmation.proposalDigest !== plan.proposalDigest ||
    confirmation.version !== expectedVersion ||
    parseTime(confirmation.committedAt) === null
  ) {
    return { issued: false, reason: "commit_mismatch", receipt: null };
  }
  return {
    issued: true,
    receipt: {
      schema: "vitalos.key-registry-receipt.v1",
      registryId: proposal.registryId,
      requestId: proposal.requestId,
      action: proposal.action,
      keyId: proposal.keyId,
      version: confirmation.version,
      acceptedAt: confirmation.committedAt,
      replayed: confirmation.status === "replayed",
      persisted: true,
      keyMaterialReturned: false,
    },
  };
}

export function deriveTrustedEvidenceKeys(state: ProductionKeyRegistryState): TrustedEvidenceKey[] {
  return state.keys
    .filter((key) => key.status !== "pending")
    .map((key) => ({
      keyId: key.keyId,
      algorithm: key.algorithm,
      publicKeySha256: key.publicKeySha256,
      validFrom: key.validFrom,
      validUntil: key.validUntil,
      revoked: key.status === "revoked",
    }));
}

export function canonicalizeKeyRegistryProposal(proposal: KeyRegistryProposal): string {
  return JSON.stringify(proposal);
}
