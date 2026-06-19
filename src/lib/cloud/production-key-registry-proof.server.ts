import { createHash } from "node:crypto";
import {
  canonicalizeKeyRegistryProposal,
  evaluateKeyRegistryMutation,
  issueKeyRegistryMutationReceipt,
  type KeyRegistryGovernancePolicy,
  type KeyRegistryProposal,
  type ProductionKeyRegistryState,
  type VerifiedRegistryApproval,
} from "@/engine/cloud/production-key-registry-engine";

export interface ProductionKeyRegistryProof {
  generatedAt: string;
  status: "contract_verified" | "contract_failed";
  assurance: "governed_key_registry_blueprint";
  runtime: {
    durableRegistry: false;
    verifiedApproverIdentity: false;
    immutableAuditLog: false;
    passed: 0;
    total: 3;
  };
  trustedKeyRegistryActive: false;
  productionClaimsAllowed: false;
  checks: Array<{ id: string; label: string; passed: boolean; note: string }>;
  passedCheckCount: number;
  checkCount: number;
  sensitivePayloadReturned: false;
}

const policy: KeyRegistryGovernancePolicy = {
  minApprovals: 2,
  minDistinctRoles: 2,
  allowedApprovalRoles: ["security", "platform"],
  approvalMaxAgeSeconds: 900,
  clockSkewSeconds: 30,
  minimumRotationOverlapSeconds: 86_400,
  maxActiveKeys: 3,
  allowBootstrapActivation: false,
};

function digestProposal(proposal: KeyRegistryProposal): string {
  return createHash("sha256").update(canonicalizeKeyRegistryProposal(proposal)).digest("hex");
}

function approvalsFor(
  proposal: KeyRegistryProposal,
  proposalDigest: string,
): VerifiedRegistryApproval[] {
  return [
    {
      actorId: "fixture-security",
      role: "security",
      proposalDigest,
      action: proposal.action,
      keyId: proposal.keyId,
      approvedAt: "2026-06-19T20:02:00.000Z",
      verified: true,
    },
    {
      actorId: "fixture-platform",
      role: "platform",
      proposalDigest,
      action: proposal.action,
      keyId: proposal.keyId,
      approvedAt: "2026-06-19T20:03:00.000Z",
      verified: true,
    },
  ];
}

export function buildProductionKeyRegistryProof(
  generatedAt = new Date().toISOString(),
): ProductionKeyRegistryProof {
  const state: ProductionKeyRegistryState = {
    schema: "vitalos.production-key-registry.v1",
    registryId: "fixture-registry",
    version: 8,
    keys: [
      {
        keyId: "fixture-old",
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
        keyId: "fixture-new",
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
  const activation: KeyRegistryProposal = {
    schema: "vitalos.key-registry-proposal.v1",
    requestId: "fixture-activate",
    registryId: state.registryId,
    baseVersion: state.version,
    action: "activate",
    keyId: "fixture-new",
    requestedBy: "fixture-requester",
    requestedAt: "2026-06-19T20:01:00.000Z",
    expiresAt: "2026-06-19T21:01:00.000Z",
  };
  const activationDigest = digestProposal(activation);
  const activationApprovals = approvalsFor(activation, activationDigest);
  const evaluate = (
    proposal: KeyRegistryProposal,
    currentState = state,
    approvals = approvalsFor(proposal, digestProposal(proposal)),
    governance = policy,
    proposalDigest = digestProposal(proposal),
  ) =>
    evaluateKeyRegistryMutation({
      state: currentState,
      proposal,
      proposalDigest,
      approvals,
      policy: governance,
      evaluatedAt: "2026-06-19T20:05:00.000Z",
    });

  const activated = evaluate(activation, state, activationApprovals, policy, activationDigest);
  const noQuorum = evaluate(activation, state, activationApprovals.slice(0, 1));
  const sameRole = evaluate(activation, state, [
    activationApprovals[0]!,
    { ...activationApprovals[1]!, role: "security" },
  ]);
  const selfApproval = evaluate(activation, state, [
    { ...activationApprovals[0]!, actorId: activation.requestedBy },
    activationApprovals[1]!,
  ]);
  const staleVersion = evaluate({ ...activation, baseVersion: 7 });
  const noOverlap = evaluate(activation, { ...state, keys: [state.keys[1]!] });
  const replay = activated.allowed
    ? evaluate(
        activation,
        {
          ...activated.nextState,
          appliedRequests: [
            {
              requestId: activation.requestId,
              proposalDigest: activationDigest,
              resultingVersion: activated.nextState.version,
            },
          ],
        },
        activationApprovals,
        policy,
        activationDigest,
      )
    : activated;
  const conflict = evaluate(
    activation,
    {
      ...state,
      appliedRequests: [
        {
          requestId: activation.requestId,
          proposalDigest: "c".repeat(64),
          resultingVersion: 8,
        },
      ],
    },
    activationApprovals,
    policy,
    activationDigest,
  );

  const retire: KeyRegistryProposal = {
    ...activation,
    requestId: "fixture-retire",
    baseVersion: 9,
    action: "retire",
    keyId: "fixture-old",
    effectiveAt: "2026-06-19T20:05:00.000Z",
  };
  const retirement =
    activated.allowed && activated.action === "commit"
      ? evaluate(retire, activated.nextState)
      : activated;
  const noSuccessor = evaluate({ ...retire, baseVersion: 8 }, { ...state, keys: [state.keys[0]!] });

  const revoke: KeyRegistryProposal = {
    ...activation,
    requestId: "fixture-revoke",
    action: "revoke",
    keyId: "fixture-old",
    effectiveAt: "2026-06-19T20:05:00.000Z",
    reasonCode: "suspected_compromise",
  };
  const revocation = evaluate(revoke);
  const committedReceipt = issueKeyRegistryMutationReceipt(activated, activation, {
    confirmed: true,
    status: "committed",
    registryId: state.registryId,
    requestId: activation.requestId,
    proposalDigest: activationDigest,
    version: 9,
    committedAt: "2026-06-19T20:05:01.000Z",
  });
  const rollbackReceipt = issueKeyRegistryMutationReceipt(activated, activation, {
    confirmed: false,
    status: "rolled_back",
  });

  const checks = [
    {
      id: "quorum_activation",
      label: "Ativação exige dupla custódia",
      passed: activated.allowed && activated.action === "commit",
      note: "Duas identidades e dois papéis aprovam a mesma proposta.",
    },
    {
      id: "approval_quorum",
      label: "Uma aprovação não forma quorum",
      passed: !noQuorum.allowed && noQuorum.reason === "approval_quorum",
      note: "Mudança crítica não depende de uma única pessoa.",
    },
    {
      id: "role_quorum",
      label: "Papéis distintos são obrigatórios",
      passed: !sameRole.allowed && sameRole.reason === "approval_role_quorum",
      note: "Dois operadores do mesmo domínio não simulam segregação.",
    },
    {
      id: "separation_of_duties",
      label: "Solicitante não aprova a própria mudança",
      passed: !selfApproval.allowed && selfApproval.reason === "separation_of_duties",
      note: "Pedido e autorização permanecem separados.",
    },
    {
      id: "monotonic_version",
      label: "Versão antiga é recusada",
      passed: !staleVersion.allowed && staleVersion.reason === "version_conflict",
      note: "Rollback de estado não restaura confiança removida.",
    },
    {
      id: "rotation_overlap",
      label: "Rotação exige sobreposição segura",
      passed: !noOverlap.allowed && noOverlap.reason === "rotation_overlap",
      note: "A troca evita janela sem chave válida.",
    },
    {
      id: "idempotent_retry",
      label: "Retry exato não reaplica mutação",
      passed: replay.allowed && replay.action === "replay",
      note: "Request já persistida retorna o mesmo resultado.",
    },
    {
      id: "request_conflict",
      label: "Request divergente falha fechado",
      passed: !conflict.allowed && conflict.reason === "request_conflict",
      note: "Idempotência não permite mudança de significado.",
    },
    {
      id: "safe_retirement",
      label: "Retirada preserva sucessor ativo",
      passed: retirement.allowed && retirement.action === "commit",
      note: "A chave antiga sai somente após a nova estar ativa.",
    },
    {
      id: "no_successor_blocked",
      label: "Retirada sem sucessor é bloqueada",
      passed: !noSuccessor.allowed && noSuccessor.reason === "active_successor_missing",
      note: "Operação planejada não pode desligar toda a confiança.",
    },
    {
      id: "immediate_revocation",
      label: "Revogação invalida a chave imediatamente",
      passed:
        revocation.allowed &&
        revocation.nextState.keys.find((key) => key.keyId === revoke.keyId)?.status === "revoked",
      note: "Suspeita de comprometimento prevalece sobre disponibilidade.",
    },
    {
      id: "receipt_after_commit",
      label: "Recibo exige commit correspondente",
      passed: committedReceipt.issued && !rollbackReceipt.issued,
      note: "Plano ou rollback nunca são exibidos como persistência.",
    },
  ];
  const passedCheckCount = checks.filter((check) => check.passed).length;

  return {
    generatedAt,
    status: passedCheckCount === checks.length ? "contract_verified" : "contract_failed",
    assurance: "governed_key_registry_blueprint",
    runtime: {
      durableRegistry: false,
      verifiedApproverIdentity: false,
      immutableAuditLog: false,
      passed: 0,
      total: 3,
    },
    trustedKeyRegistryActive: false,
    productionClaimsAllowed: false,
    checks,
    passedCheckCount,
    checkCount: checks.length,
    sensitivePayloadReturned: false,
  };
}
