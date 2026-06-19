export interface PersistenceSession {
  authenticated: boolean;
  subjectId: string | null;
  tenantId: string | null;
  organizationId: string | null;
}

export interface PersistenceEnvelope {
  submissionId: string;
  tenantId: string;
  organizationId: string;
  waveId: string;
  surveyId: string;
  itemCount: number;
}

export interface CommittedSubmission {
  idempotencyKey: string;
  tenantId: string;
  organizationId: string;
  subjectId: string;
  submissionId: string;
  waveId: string;
  surveyId: string;
  itemCount: number;
  commitId: string;
  committedAt: string;
}

export type PersistencePlanReason =
  | "insert_required"
  | "idempotent_replay"
  | "invalid_session"
  | "tenant_mismatch"
  | "invalid_envelope"
  | "submission_conflict";

export type PersistencePlan =
  | {
      allowed: true;
      action: "insert";
      reason: "insert_required";
      idempotencyKey: string;
      existing: null;
    }
  | {
      allowed: true;
      action: "replay";
      reason: "idempotent_replay";
      idempotencyKey: string;
      existing: CommittedSubmission;
    }
  | {
      allowed: false;
      action: "deny";
      reason: Exclude<PersistencePlanReason, "insert_required" | "idempotent_replay">;
      idempotencyKey: string | null;
      existing: CommittedSubmission | null;
    };

export type CommitConfirmation =
  | {
      confirmed: true;
      status: "committed" | "replayed";
      record: CommittedSubmission;
    }
  | {
      confirmed: false;
      status: "rolled_back" | "adapter_error";
      record: null;
    };

export interface CloudPersistenceReceipt {
  receiptId: string;
  submissionId: string;
  waveId: string;
  surveyId: string;
  itemCount: number;
  acceptedAt: string;
  persistence: "cloud_persisted";
  persisted: true;
  replayed: boolean;
  contentReturned: false;
}

export type ReceiptDecision =
  | { issued: true; receipt: CloudPersistenceReceipt }
  | {
      issued: false;
      reason: "commit_unconfirmed" | "commit_scope_mismatch" | "commit_metadata_mismatch";
      receipt: null;
    };

function normalizedPart(value: string): string {
  return value.trim();
}

export function buildResponseIdempotencyKey(
  session: PersistenceSession,
  envelope: PersistenceEnvelope,
): string | null {
  if (!session.subjectId || !session.tenantId) return null;
  return [
    "response",
    normalizedPart(session.tenantId),
    normalizedPart(session.subjectId),
    normalizedPart(envelope.waveId),
    normalizedPart(envelope.submissionId),
  ].join(":");
}

function validEnvelope(envelope: PersistenceEnvelope): boolean {
  return (
    Boolean(envelope.submissionId.trim()) &&
    Boolean(envelope.tenantId.trim()) &&
    Boolean(envelope.organizationId.trim()) &&
    Boolean(envelope.waveId.trim()) &&
    Boolean(envelope.surveyId.trim()) &&
    Number.isInteger(envelope.itemCount) &&
    envelope.itemCount > 0
  );
}

function sameCommittedMetadata(
  session: PersistenceSession,
  envelope: PersistenceEnvelope,
  existing: CommittedSubmission,
): boolean {
  return (
    existing.tenantId === session.tenantId &&
    existing.organizationId === session.organizationId &&
    existing.subjectId === session.subjectId &&
    existing.submissionId === envelope.submissionId &&
    existing.waveId === envelope.waveId &&
    existing.surveyId === envelope.surveyId &&
    existing.itemCount === envelope.itemCount
  );
}

/**
 * Plans the transaction without touching response values. Tenant and subject
 * come from the trusted session; a client payload can never widen the scope.
 */
export function planResponsePersistence(
  session: PersistenceSession,
  envelope: PersistenceEnvelope,
  existing: CommittedSubmission | null,
): PersistencePlan {
  if (
    !session.authenticated ||
    !session.subjectId?.trim() ||
    !session.tenantId?.trim() ||
    !session.organizationId?.trim()
  ) {
    return {
      allowed: false,
      action: "deny",
      reason: "invalid_session",
      idempotencyKey: null,
      existing,
    };
  }

  const idempotencyKey = buildResponseIdempotencyKey(session, envelope);
  if (!validEnvelope(envelope) || !idempotencyKey) {
    return {
      allowed: false,
      action: "deny",
      reason: "invalid_envelope",
      idempotencyKey,
      existing,
    };
  }

  if (
    envelope.tenantId !== session.tenantId ||
    envelope.organizationId !== session.organizationId
  ) {
    return {
      allowed: false,
      action: "deny",
      reason: "tenant_mismatch",
      idempotencyKey,
      existing,
    };
  }

  if (!existing) {
    return {
      allowed: true,
      action: "insert",
      reason: "insert_required",
      idempotencyKey,
      existing: null,
    };
  }

  if (
    existing.idempotencyKey !== idempotencyKey ||
    !sameCommittedMetadata(session, envelope, existing)
  ) {
    return {
      allowed: false,
      action: "deny",
      reason: "submission_conflict",
      idempotencyKey,
      existing,
    };
  }

  return {
    allowed: true,
    action: "replay",
    reason: "idempotent_replay",
    idempotencyKey,
    existing,
  };
}

/** A public receipt exists only after the adapter confirms an exact scoped commit. */
export function issueCloudPersistenceReceipt(
  session: PersistenceSession,
  envelope: PersistenceEnvelope,
  confirmation: CommitConfirmation,
): ReceiptDecision {
  if (!confirmation.confirmed) {
    return { issued: false, reason: "commit_unconfirmed", receipt: null };
  }

  const record = confirmation.record;
  if (
    record.tenantId !== session.tenantId ||
    record.organizationId !== session.organizationId ||
    record.subjectId !== session.subjectId
  ) {
    return { issued: false, reason: "commit_scope_mismatch", receipt: null };
  }

  if (
    record.submissionId !== envelope.submissionId ||
    record.waveId !== envelope.waveId ||
    record.surveyId !== envelope.surveyId ||
    record.itemCount !== envelope.itemCount
  ) {
    return { issued: false, reason: "commit_metadata_mismatch", receipt: null };
  }

  return {
    issued: true,
    receipt: {
      receiptId: `capture:${record.commitId}`,
      submissionId: record.submissionId,
      waveId: record.waveId,
      surveyId: record.surveyId,
      itemCount: record.itemCount,
      acceptedAt: record.committedAt,
      persistence: "cloud_persisted",
      persisted: true,
      replayed: confirmation.status === "replayed",
      contentReturned: false,
    },
  };
}
