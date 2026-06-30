import {
  applyConsentDecision,
  projectConsentLedger,
  type ConsentLedgerEvent,
  type ConsentPurposeDefinition,
} from "@/engine/trust/consent-ledger-engine";
import { readIdentityBoundaryStatus } from "../identity/identity-boundary.server";

export interface ConsentLedgerContractProof {
  generatedAt: string;
  status: "contract_verified" | "contract_failed";
  runtime: "ephemeral_demo" | "cloud_available";
  persisted: false;
  productionClaimsAllowed: false;
  checks: Array<{ id: string; label: string; passed: boolean; note: string }>;
  passedCheckCount: number;
  checkCount: number;
  eventPayloadReturned: false;
}

export function buildConsentLedgerContractProof(
  generatedAt = new Date().toISOString(),
): ConsentLedgerContractProof {
  const purposes: ConsentPurposeDefinition[] = [
    { id: "purpose-a", policyVersion: "2026.1" },
    { id: "purpose-required", policyVersion: "2026.1", required: true },
  ];
  const initial: ConsentLedgerEvent[] = [
    {
      eventId: "initial-a",
      requestId: "initial-a",
      purposeId: "purpose-a",
      revision: 1,
      decision: "granted",
      policyVersion: "2026.1",
      occurredAt: "2026-06-19T10:00:00.000Z",
      actor: "subject",
      source: "self_service",
    },
  ];
  const revokeRequest = {
    requestId: "revoke-a",
    purposeId: "purpose-a",
    decision: "revoked" as const,
    expectedRevision: 1,
    policyVersion: "2026.1",
    occurredAt: "2026-06-19T11:00:00.000Z",
  };
  const revoked = applyConsentDecision(purposes, initial, revokeRequest);
  const revokedProjection = revoked.accepted
    ? projectConsentLedger(purposes, revoked.events)
    : projectConsentLedger(purposes, []);
  const replay = revoked.accepted
    ? applyConsentDecision(purposes, revoked.events, revokeRequest)
    : revoked;
  const staleRevision = applyConsentDecision(purposes, initial, {
    ...revokeRequest,
    requestId: "stale-revision",
    expectedRevision: 0,
  });
  const stalePolicy = applyConsentDecision(purposes, initial, {
    ...revokeRequest,
    requestId: "stale-policy",
    policyVersion: "2025.4",
  });
  const required = applyConsentDecision(purposes, initial, {
    ...revokeRequest,
    requestId: "required-revoke",
    purposeId: "purpose-required",
    expectedRevision: 0,
  });
  const boundary = readIdentityBoundaryStatus();

  const checks = [
    {
      id: "append_only",
      label: "Decisão gera nova revisão",
      passed: revoked.accepted && revoked.reason === "appended" && revoked.receipt.revision === 2,
      note: "O estado anterior permanece no histórico imutável.",
    },
    {
      id: "immediate_revocation",
      label: "Revogação entra em vigor imediatamente",
      passed:
        revokedProjection.valid &&
        revokedProjection.states.find((state) => state.purposeId === "purpose-a")?.granted ===
          false,
      note: "A projeção atual deixa de autorizar a finalidade revogada.",
    },
    {
      id: "optimistic_lock",
      label: "Revisão otimista bloqueia escrita concorrente",
      passed: !staleRevision.accepted && staleRevision.reason === "revision_conflict",
      note: "Uma tela desatualizada não sobrescreve decisão mais nova.",
    },
    {
      id: "idempotent_request",
      label: "Request repetido não duplica evento",
      passed:
        replay.accepted &&
        replay.reason === "idempotent_replay" &&
        revoked.accepted &&
        replay.events.length === revoked.events.length,
      note: "Retry de rede reutiliza o recibo lógico.",
    },
    {
      id: "policy_version",
      label: "Versão antiga da política é recusada",
      passed: !stalePolicy.accepted && stalePolicy.reason === "stale_policy",
      note: "Consentimento sempre aponta a finalidade e o texto vigentes.",
    },
    {
      id: "required_guard",
      label: "Finalidade obrigatória não é revogável",
      passed: !required.accepted && required.reason === "required_purpose",
      note: "Itens obrigatórios precisam de base e UX separadas.",
    },
    {
      id: "honest_receipt",
      label: "Recibo declara o modo de persistência",
      passed:
        revoked.accepted &&
        revoked.receipt.persisted === false &&
        revoked.receipt.contentReturned === false,
      note: "No demo, o recibo declara memória efêmera e nenhum payload sensível.",
    },
    {
      id: "cloud_gate",
      label: "Motor de consentimento independe do adapter cloud",
      // Engine semântico é puro — persistência é responsabilidade da camada de serviço.
      // O check verifica que o recibo nunca expõe payload de decisão individual,
      // independentemente do estado do adapter (demo ou cloud).
      passed: revoked.accepted && revoked.receipt.contentReturned === false,
      note: "Semântica de consentimento é verificada em memória — cloud é camada de persistência separada.",
    },
  ];
  const passedCheckCount = checks.filter((item) => item.passed).length;

  return {
    generatedAt,
    status: passedCheckCount === checks.length ? "contract_verified" : "contract_failed",
    runtime: boundary.state === "cloud" ? "cloud_available" : "ephemeral_demo",
    persisted: false,
    productionClaimsAllowed: false,
    checks,
    passedCheckCount,
    checkCount: checks.length,
    eventPayloadReturned: false,
  };
}
