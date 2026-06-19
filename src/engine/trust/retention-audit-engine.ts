export type RetentionAction = "delete" | "anonymize";

export interface RetentionPolicy {
  id: string;
  version: string;
  retentionDays: number;
  expiryAction: RetentionAction;
  legalHoldAllowed: boolean;
}

export interface RetainedRecordMetadata {
  recordId: string;
  policyId: string;
  createdAt: string;
  lastChangedAt: string;
  state: "active" | "deleted" | "anonymized";
  legalHoldUntil?: string;
  contentPresent: boolean;
}

export type RetentionReason =
  | "retain"
  | "retention_due"
  | "legal_hold"
  | "already_disposed"
  | "invalid_policy"
  | "invalid_record";

export interface RetentionDecision {
  valid: boolean;
  reason: RetentionReason;
  action: "none" | RetentionAction;
  dueAt: string | null;
}

export interface AuditEntryDraft {
  eventId: string;
  eventType: string;
  occurredAt: string;
  policyVersion: string;
  subjectRef: string;
  resourceRef: string;
  contentIncluded: false;
}

export interface AuditChainEntry extends AuditEntryDraft {
  sequence: number;
  previousDigest: string | null;
  digest: string;
}

export type AuditChainReason =
  | "valid"
  | "empty"
  | "duplicate_event"
  | "invalid_sequence"
  | "broken_link"
  | "invalid_timestamp"
  | "content_forbidden";

export interface AuditChainValidation {
  valid: boolean;
  reason: AuditChainReason;
  entryCount: number;
}

function timestamp(value: string): number | null {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function evaluateRetention(
  policy: RetentionPolicy,
  record: RetainedRecordMetadata,
  evaluatedAt: string,
): RetentionDecision {
  const evaluated = timestamp(evaluatedAt);
  const changed = timestamp(record.lastChangedAt);
  const created = timestamp(record.createdAt);
  if (
    !policy.id.trim() ||
    !policy.version.trim() ||
    !Number.isInteger(policy.retentionDays) ||
    policy.retentionDays <= 0 ||
    evaluated === null
  ) {
    return { valid: false, reason: "invalid_policy", action: "none", dueAt: null };
  }
  if (
    !record.recordId.trim() ||
    record.policyId !== policy.id ||
    created === null ||
    changed === null ||
    changed < created
  ) {
    return { valid: false, reason: "invalid_record", action: "none", dueAt: null };
  }
  if (record.state !== "active") {
    return { valid: true, reason: "already_disposed", action: "none", dueAt: null };
  }

  const dueTimestamp = changed + policy.retentionDays * 86_400_000;
  const dueAt = new Date(dueTimestamp).toISOString();
  if (record.legalHoldUntil) {
    const holdUntil = timestamp(record.legalHoldUntil);
    if (holdUntil === null || !policy.legalHoldAllowed) {
      return { valid: false, reason: "invalid_record", action: "none", dueAt };
    }
    if (holdUntil > evaluated) {
      return { valid: true, reason: "legal_hold", action: "none", dueAt };
    }
  }
  if (evaluated < dueTimestamp) {
    return { valid: true, reason: "retain", action: "none", dueAt };
  }
  return { valid: true, reason: "retention_due", action: policy.expiryAction, dueAt };
}

export function canonicalizeAuditDraft(
  draft: AuditEntryDraft,
  sequence: number,
  previousDigest: string | null,
): string {
  return JSON.stringify({
    schema: "vitalos.audit-entry.v1",
    sequence,
    previousDigest,
    eventId: draft.eventId,
    eventType: draft.eventType,
    occurredAt: draft.occurredAt,
    policyVersion: draft.policyVersion,
    subjectRef: draft.subjectRef,
    resourceRef: draft.resourceRef,
    contentIncluded: false,
  });
}

export function validateAuditChain(entries: readonly AuditChainEntry[]): AuditChainValidation {
  if (entries.length === 0) return { valid: false, reason: "empty", entryCount: 0 };
  const ids = new Set<string>();
  let previousTimestamp: number | null = null;

  for (const [index, entry] of entries.entries()) {
    if (entry.contentIncluded !== false) {
      return { valid: false, reason: "content_forbidden", entryCount: 0 };
    }
    if (!entry.eventId.trim() || ids.has(entry.eventId)) {
      return { valid: false, reason: "duplicate_event", entryCount: 0 };
    }
    ids.add(entry.eventId);
    if (entry.sequence !== index + 1) {
      return { valid: false, reason: "invalid_sequence", entryCount: 0 };
    }
    const expectedPrevious = index === 0 ? null : entries[index - 1]!.digest;
    if (entry.previousDigest !== expectedPrevious) {
      return { valid: false, reason: "broken_link", entryCount: 0 };
    }
    const occurred = timestamp(entry.occurredAt);
    if (occurred === null || (previousTimestamp !== null && occurred < previousTimestamp)) {
      return { valid: false, reason: "invalid_timestamp", entryCount: 0 };
    }
    previousTimestamp = occurred;
  }
  return { valid: true, reason: "valid", entryCount: entries.length };
}
