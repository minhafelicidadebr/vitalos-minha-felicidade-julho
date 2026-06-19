import type { ConsentDecision } from "./consent-ledger-engine";

export interface ConsentPersistenceSession {
  authenticated: boolean;
  subjectId: string | null;
  tenantId: string | null;
  organizationId: string | null;
}

export interface ConsentAppendEnvelope {
  tenantId: string;
  organizationId: string;
  requestId: string;
  purposeId: string;
  revision: number;
  decision: ConsentDecision;
  policyVersion: string;
  occurredAt: string;
}

export interface CommittedConsentEvent {
  idempotencyKey: string;
  tenantId: string;
  organizationId: string;
  subjectId: string;
  requestId: string;
  purposeId: string;
  revision: number;
  decision: ConsentDecision;
  policyVersion: string;
  occurredAt: string;
  commitId: string;
  committedAt: string;
}

export type ConsentPersistenceReason =
  | "insert_required"
  | "idempotent_replay"
  | "invalid_session"
  | "tenant_mismatch"
  | "invalid_envelope"
  | "revision_conflict"
  | "request_conflict";

export type ConsentPersistencePlan =
  | {
      allowed: true;
      action: "insert";
      reason: "insert_required";
      idempotencyKey: string;
      expectedRevision: number;
      existing: null;
    }
  | {
      allowed: true;
      action: "replay";
      reason: "idempotent_replay";
      idempotencyKey: string;
      expectedRevision: number;
      existing: CommittedConsentEvent;
    }
  | {
      allowed: false;
      action: "deny";
      reason: Exclude<ConsentPersistenceReason, "insert_required" | "idempotent_replay">;
      idempotencyKey: string | null;
      expectedRevision: number;
      existing: CommittedConsentEvent | null;
    };

export type ConsentCommitConfirmation =
  | {
      confirmed: true;
      status: "committed" | "replayed";
      record: CommittedConsentEvent;
    }
  | {
      confirmed: false;
      status: "rolled_back" | "adapter_error";
      record: null;
    };

export interface DurableConsentReceipt {
  receiptId: string;
  purposeId: string;
  revision: number;
  decision: ConsentDecision;
  policyVersion: string;
  acceptedAt: string;
  persistence: "cloud_persisted";
  persisted: true;
  replayed: boolean;
  contentReturned: false;
}

export type ConsentReceiptDecision =
  | { issued: true; receipt: DurableConsentReceipt }
  | {
      issued: false;
      reason: "commit_unconfirmed" | "commit_scope_mismatch" | "commit_metadata_mismatch";
      receipt: null;
    };

function validDate(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

function validEnvelope(envelope: ConsentAppendEnvelope): boolean {
  return (
    Boolean(envelope.tenantId.trim()) &&
    Boolean(envelope.organizationId.trim()) &&
    Boolean(envelope.requestId.trim()) &&
    Boolean(envelope.purposeId.trim()) &&
    Number.isInteger(envelope.revision) &&
    envelope.revision > 0 &&
    Boolean(envelope.policyVersion.trim()) &&
    validDate(envelope.occurredAt)
  );
}

export function buildConsentIdempotencyKey(
  session: ConsentPersistenceSession,
  envelope: ConsentAppendEnvelope,
): string | null {
  if (!session.tenantId?.trim() || !session.subjectId?.trim()) return null;
  return [
    "consent",
    session.tenantId.trim(),
    session.subjectId.trim(),
    envelope.purposeId.trim(),
    envelope.requestId.trim(),
  ].join(":");
}

function sameEvent(
  session: ConsentPersistenceSession,
  envelope: ConsentAppendEnvelope,
  existing: CommittedConsentEvent,
): boolean {
  return (
    existing.tenantId === session.tenantId &&
    existing.organizationId === session.organizationId &&
    existing.subjectId === session.subjectId &&
    existing.requestId === envelope.requestId &&
    existing.purposeId === envelope.purposeId &&
    existing.revision === envelope.revision &&
    existing.decision === envelope.decision &&
    existing.policyVersion === envelope.policyVersion &&
    existing.occurredAt === envelope.occurredAt
  );
}

/**
 * Plans one append-only consent transaction. Subject, tenant and organization
 * are trusted-session facts; the client cannot widen them.
 */
export function planConsentPersistence(
  session: ConsentPersistenceSession,
  envelope: ConsentAppendEnvelope,
  latestRevision: number,
  existingByRequest: CommittedConsentEvent | null,
): ConsentPersistencePlan {
  const expectedRevision = latestRevision + 1;
  if (
    !session.authenticated ||
    !session.subjectId?.trim() ||
    !session.tenantId?.trim() ||
    !session.organizationId?.trim() ||
    !Number.isInteger(latestRevision) ||
    latestRevision < 0
  ) {
    return {
      allowed: false,
      action: "deny",
      reason: "invalid_session",
      idempotencyKey: null,
      expectedRevision,
      existing: existingByRequest,
    };
  }

  const idempotencyKey = buildConsentIdempotencyKey(session, envelope);
  if (!validEnvelope(envelope) || !idempotencyKey) {
    return {
      allowed: false,
      action: "deny",
      reason: "invalid_envelope",
      idempotencyKey,
      expectedRevision,
      existing: existingByRequest,
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
      expectedRevision,
      existing: existingByRequest,
    };
  }

  if (existingByRequest) {
    if (
      existingByRequest.idempotencyKey === idempotencyKey &&
      sameEvent(session, envelope, existingByRequest)
    ) {
      return {
        allowed: true,
        action: "replay",
        reason: "idempotent_replay",
        idempotencyKey,
        expectedRevision: existingByRequest.revision,
        existing: existingByRequest,
      };
    }
    return {
      allowed: false,
      action: "deny",
      reason: "request_conflict",
      idempotencyKey,
      expectedRevision,
      existing: existingByRequest,
    };
  }

  if (envelope.revision !== expectedRevision) {
    return {
      allowed: false,
      action: "deny",
      reason: "revision_conflict",
      idempotencyKey,
      expectedRevision,
      existing: null,
    };
  }

  return {
    allowed: true,
    action: "insert",
    reason: "insert_required",
    idempotencyKey,
    expectedRevision,
    existing: null,
  };
}

export function issueDurableConsentReceipt(
  session: ConsentPersistenceSession,
  envelope: ConsentAppendEnvelope,
  confirmation: ConsentCommitConfirmation,
): ConsentReceiptDecision {
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
  if (!sameEvent(session, envelope, record)) {
    return { issued: false, reason: "commit_metadata_mismatch", receipt: null };
  }

  return {
    issued: true,
    receipt: {
      receiptId: `consent:${record.commitId}`,
      purposeId: record.purposeId,
      revision: record.revision,
      decision: record.decision,
      policyVersion: record.policyVersion,
      acceptedAt: record.committedAt,
      persistence: "cloud_persisted",
      persisted: true,
      replayed: confirmation.status === "replayed",
      contentReturned: false,
    },
  };
}
