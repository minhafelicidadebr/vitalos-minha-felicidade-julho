import {
  issueDurableConsentReceipt,
  planConsentPersistence,
  type CommittedConsentEvent,
  type ConsentAppendEnvelope,
  type ConsentPersistenceSession,
} from "@/engine/trust/consent-persistence-engine";

export interface ConsentPersistenceContractProof {
  generatedAt: string;
  status: "contract_verified" | "contract_failed";
  runtime: "adapter_missing";
  durableConsentLedger: false;
  productionClaimsAllowed: false;
  checks: Array<{ id: string; label: string; passed: boolean; note: string }>;
  passedCheckCount: number;
  checkCount: number;
  sensitivePayloadReturned: false;
}

const session: ConsentPersistenceSession = {
  authenticated: true,
  subjectId: "fixture-subject",
  tenantId: "fixture-tenant",
  organizationId: "fixture-org",
};
const envelope: ConsentAppendEnvelope = {
  tenantId: "fixture-tenant",
  organizationId: "fixture-org",
  requestId: "fixture-request",
  purposeId: "fixture-purpose",
  revision: 2,
  decision: "revoked",
  policyVersion: "2026.1",
  occurredAt: "2026-06-19T15:00:00.000Z",
};
const committed: CommittedConsentEvent = {
  idempotencyKey: "consent:fixture-tenant:fixture-subject:fixture-purpose:fixture-request",
  tenantId: "fixture-tenant",
  organizationId: "fixture-org",
  subjectId: "fixture-subject",
  requestId: "fixture-request",
  purposeId: "fixture-purpose",
  revision: 2,
  decision: "revoked",
  policyVersion: "2026.1",
  occurredAt: "2026-06-19T15:00:00.000Z",
  commitId: "fixture-commit",
  committedAt: "2026-06-19T15:00:01.000Z",
};

export function buildConsentPersistenceContractProof(
  generatedAt = new Date().toISOString(),
): ConsentPersistenceContractProof {
  const insert = planConsentPersistence(session, envelope, 1, null);
  const replay = planConsentPersistence(session, envelope, 2, committed);
  const revisionConflict = planConsentPersistence(session, { ...envelope, revision: 3 }, 1, null);
  const requestConflict = planConsentPersistence(
    session,
    { ...envelope, decision: "granted" },
    2,
    committed,
  );
  const tenantAttack = planConsentPersistence(
    session,
    { ...envelope, tenantId: "fixture-tenant-other" },
    1,
    null,
  );
  const committedReceipt = issueDurableConsentReceipt(session, envelope, {
    confirmed: true,
    status: "committed",
    record: committed,
  });
  const rollbackReceipt = issueDurableConsentReceipt(session, envelope, {
    confirmed: false,
    status: "rolled_back",
    record: null,
  });
  const scopeMismatchReceipt = issueDurableConsentReceipt(session, envelope, {
    confirmed: true,
    status: "committed",
    record: { ...committed, tenantId: "fixture-tenant-other" },
  });

  const checks = [
    {
      id: "append_once",
      label: "Primeira decisão planeja um único append",
      passed: insert.allowed && insert.action === "insert",
      note: "O evento nasce append-only sob revisão esperada.",
    },
    {
      id: "idempotent_retry",
      label: "Retry idêntico não duplica evento",
      passed: replay.allowed && replay.action === "replay",
      note: "A mesma request reutiliza o commit já confirmado.",
    },
    {
      id: "monotonic_revision",
      label: "Revisão precisa ser monotônica",
      passed: !revisionConflict.allowed && revisionConflict.reason === "revision_conflict",
      note: "Lacunas e sobrescritas concorrentes são bloqueadas.",
    },
    {
      id: "request_integrity",
      label: "Request não pode mudar de significado",
      passed: !requestConflict.allowed && requestConflict.reason === "request_conflict",
      note: "Idempotência divergente falha fechado.",
    },
    {
      id: "session_scope",
      label: "Tenant vem da sessão confiável",
      passed: !tenantAttack.allowed && tenantAttack.reason === "tenant_mismatch",
      note: "Payload cliente não amplia organização ou tenant.",
    },
    {
      id: "receipt_after_commit",
      label: "Recibo durável exige commit confirmado",
      passed: committedReceipt.issued && committedReceipt.receipt.persisted,
      note: "cloud_persisted só existe após confirmação exata.",
    },
    {
      id: "rollback_no_receipt",
      label: "Rollback não emite recibo",
      passed: !rollbackReceipt.issued,
      note: "Falha de adapter nunca é convertida em sucesso visual.",
    },
    {
      id: "scope_mismatch_no_receipt",
      label: "Commit fora do escopo não emite recibo",
      passed: !scopeMismatchReceipt.issued,
      note: "Confirmação precisa coincidir com subject, tenant e organização.",
    },
  ];
  const passedCheckCount = checks.filter((item) => item.passed).length;

  return {
    generatedAt,
    status: passedCheckCount === checks.length ? "contract_verified" : "contract_failed",
    runtime: "adapter_missing",
    durableConsentLedger: false,
    productionClaimsAllowed: false,
    checks,
    passedCheckCount,
    checkCount: checks.length,
    sensitivePayloadReturned: false,
  };
}
