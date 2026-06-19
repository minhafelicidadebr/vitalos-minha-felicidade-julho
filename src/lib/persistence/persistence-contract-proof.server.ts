import {
  issueCloudPersistenceReceipt,
  planResponsePersistence,
  type CommittedSubmission,
  type PersistenceEnvelope,
  type PersistenceSession,
} from "@/engine/persistence/response-persistence-engine";
import { readIdentityBoundaryStatus } from "../identity/identity-boundary.server";

export interface PersistenceContractCheck {
  id: string;
  label: string;
  passed: boolean;
  note: string;
}

export interface PersistenceContractProof {
  generatedAt: string;
  status: "contract_verified" | "contract_failed";
  runtime: "adapter_missing" | "cloud_available";
  productionClaimsAllowed: boolean;
  uniqueConstraint: "(tenant_id, subject_id, wave_id, submission_id)";
  checks: PersistenceContractCheck[];
  passedCheckCount: number;
  checkCount: number;
  rawResponsesReturned: false;
}

export function buildPersistenceContractProof(
  generatedAt = new Date().toISOString(),
): PersistenceContractProof {
  const session: PersistenceSession = {
    authenticated: true,
    subjectId: "contract-subject",
    tenantId: "contract-tenant",
    organizationId: "contract-organization",
  };
  const envelope: PersistenceEnvelope = {
    submissionId: "contract-submission",
    tenantId: "contract-tenant",
    organizationId: "contract-organization",
    waveId: "contract-wave",
    surveyId: "contract-survey",
    itemCount: 12,
  };
  const first = planResponsePersistence(session, envelope, null);
  const record: CommittedSubmission = {
    idempotencyKey: first.idempotencyKey ?? "",
    tenantId: session.tenantId!,
    organizationId: session.organizationId!,
    subjectId: session.subjectId!,
    submissionId: envelope.submissionId,
    waveId: envelope.waveId,
    surveyId: envelope.surveyId,
    itemCount: envelope.itemCount,
    commitId: "contract-commit",
    committedAt: generatedAt,
  };
  const replay = planResponsePersistence(session, envelope, record);
  const conflict = planResponsePersistence(
    session,
    { ...envelope, surveyId: "changed-survey" },
    record,
  );
  const crossTenant = planResponsePersistence(
    session,
    { ...envelope, tenantId: "other-tenant" },
    null,
  );
  const committedReceipt = issueCloudPersistenceReceipt(session, envelope, {
    confirmed: true,
    status: "committed",
    record,
  });
  const rollbackReceipt = issueCloudPersistenceReceipt(session, envelope, {
    confirmed: false,
    status: "rolled_back",
    record: null,
  });

  const checks: PersistenceContractCheck[] = [
    {
      id: "session_scope",
      label: "Tenant e sujeito vêm da sessão",
      passed: crossTenant.reason === "tenant_mismatch",
      note: "O payload não pode trocar tenant ou organização.",
    },
    {
      id: "unique_insert",
      label: "Primeiro envio exige uma única inserção",
      passed: first.allowed && first.action === "insert",
      note: "A chave combina tenant, sujeito, onda e submissionId.",
    },
    {
      id: "idempotent_retry",
      label: "Retry devolve replay idempotente",
      passed: replay.allowed && replay.action === "replay",
      note: "O mesmo envio não cria uma segunda resposta.",
    },
    {
      id: "metadata_conflict",
      label: "Mudança de metadados gera conflito",
      passed: !conflict.allowed && conflict.reason === "submission_conflict",
      note: "Uma chave existente não pode ser reutilizada para outro instrumento.",
    },
    {
      id: "receipt_after_commit",
      label: "Recibo somente após commit confirmado",
      passed: committedReceipt.issued,
      note: "Persistência só é declarada depois da confirmação transacional.",
    },
    {
      id: "rollback_no_receipt",
      label: "Rollback não emite recibo",
      passed: !rollbackReceipt.issued && rollbackReceipt.reason === "commit_unconfirmed",
      note: "Falha do banco nunca vira sucesso aparente.",
    },
    {
      id: "content_free_receipt",
      label: "Recibo sem conteúdo individual",
      passed:
        committedReceipt.issued &&
        committedReceipt.receipt.contentReturned === false &&
        !JSON.stringify(committedReceipt.receipt).includes("answers"),
      note: "Itens e valores permanecem fora da resposta pública.",
    },
    {
      id: "adapter_gate",
      label: "Sem adaptador, runtime falha fechado",
      passed: readIdentityBoundaryStatus().state !== "cloud",
      note: "Contrato verificado não é confundido com banco disponível.",
    },
  ];
  const boundary = readIdentityBoundaryStatus();
  const passedCheckCount = checks.filter((item) => item.passed).length;

  return {
    generatedAt,
    status: passedCheckCount === checks.length ? "contract_verified" : "contract_failed",
    runtime: boundary.state === "cloud" ? "cloud_available" : "adapter_missing",
    productionClaimsAllowed: boundary.state === "cloud" && passedCheckCount === checks.length,
    uniqueConstraint: "(tenant_id, subject_id, wave_id, submission_id)",
    checks,
    passedCheckCount,
    checkCount: checks.length,
    rawResponsesReturned: false,
  };
}
