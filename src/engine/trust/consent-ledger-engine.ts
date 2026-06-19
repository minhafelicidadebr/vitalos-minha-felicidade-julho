export type ConsentDecision = "granted" | "revoked";

export interface ConsentPurposeDefinition {
  id: string;
  policyVersion: string;
  required?: boolean;
}

export interface ConsentLedgerEvent {
  eventId: string;
  requestId: string;
  purposeId: string;
  revision: number;
  decision: ConsentDecision;
  policyVersion: string;
  occurredAt: string;
  actor: "subject";
  source: "self_service";
}

export interface ConsentPurposeState {
  purposeId: string;
  decision: ConsentDecision;
  granted: boolean;
  revision: number;
  policyVersion: string;
  changedAt: string | null;
}

export type ConsentLedgerValidationReason =
  | "valid"
  | "duplicate_event"
  | "duplicate_request"
  | "unknown_purpose"
  | "invalid_revision"
  | "stale_policy";

export type ConsentLedgerProjection =
  | {
      valid: true;
      reason: "valid";
      states: ConsentPurposeState[];
      eventCount: number;
    }
  | {
      valid: false;
      reason: Exclude<ConsentLedgerValidationReason, "valid">;
      states: [];
      eventCount: 0;
    };

export interface ConsentDecisionRequest {
  requestId: string;
  purposeId: string;
  decision: ConsentDecision;
  expectedRevision: number;
  policyVersion: string;
  occurredAt: string;
}

export interface ConsentDecisionReceipt {
  receiptId: string;
  purposeId: string;
  revision: number;
  decision: ConsentDecision;
  acceptedAt: string;
  persistence: "ephemeral_demo" | "cloud_persisted";
  persisted: boolean;
  replayed: boolean;
  changed: boolean;
  contentReturned: false;
}

export type ConsentMutationReason =
  | "appended"
  | "idempotent_replay"
  | "unchanged"
  | "invalid_ledger"
  | "invalid_request"
  | "required_purpose"
  | "revision_conflict"
  | "stale_policy";

export type ConsentMutationResult =
  | {
      accepted: true;
      reason: "appended" | "idempotent_replay" | "unchanged";
      events: ConsentLedgerEvent[];
      receipt: ConsentDecisionReceipt;
    }
  | {
      accepted: false;
      reason: Exclude<ConsentMutationReason, "appended" | "idempotent_replay" | "unchanged">;
      events: ConsentLedgerEvent[];
      receipt: null;
    };

function purposeState(
  purpose: ConsentPurposeDefinition,
  event?: ConsentLedgerEvent,
): ConsentPurposeState {
  const decision = event?.decision ?? (purpose.required ? "granted" : "revoked");
  return {
    purposeId: purpose.id,
    decision,
    granted: decision === "granted",
    revision: event?.revision ?? 0,
    policyVersion: purpose.policyVersion,
    changedAt: event?.occurredAt ?? null,
  };
}

/** Rebuilds current consent solely from the append-only event stream. */
export function projectConsentLedger(
  purposes: readonly ConsentPurposeDefinition[],
  events: readonly ConsentLedgerEvent[],
): ConsentLedgerProjection {
  const invalid = (
    reason: Exclude<ConsentLedgerValidationReason, "valid">,
  ): ConsentLedgerProjection => ({
    valid: false,
    reason,
    states: [],
    eventCount: 0,
  });
  const purposeById = new Map(purposes.map((purpose) => [purpose.id, purpose]));
  const eventIds = new Set<string>();
  const requestIds = new Set<string>();
  const latest = new Map<string, ConsentLedgerEvent>();

  for (const event of events) {
    if (!event.eventId.trim() || eventIds.has(event.eventId)) return invalid("duplicate_event");
    if (!event.requestId.trim() || requestIds.has(event.requestId)) {
      return invalid("duplicate_request");
    }
    eventIds.add(event.eventId);
    requestIds.add(event.requestId);

    const purpose = purposeById.get(event.purposeId);
    if (!purpose) return invalid("unknown_purpose");
    if (event.policyVersion !== purpose.policyVersion) return invalid("stale_policy");

    const expectedRevision = (latest.get(event.purposeId)?.revision ?? 0) + 1;
    if (!Number.isInteger(event.revision) || event.revision !== expectedRevision) {
      return invalid("invalid_revision");
    }
    latest.set(event.purposeId, event);
  }

  return {
    valid: true,
    reason: "valid",
    states: purposes.map((purpose) => purposeState(purpose, latest.get(purpose.id))),
    eventCount: events.length,
  };
}

function issueReceipt(
  request: ConsentDecisionRequest,
  revision: number,
  persistence: ConsentDecisionReceipt["persistence"],
  replayed: boolean,
  changed: boolean,
): ConsentDecisionReceipt {
  return {
    receiptId: `consent:${request.requestId}`,
    purposeId: request.purposeId,
    revision,
    decision: request.decision,
    acceptedAt: request.occurredAt,
    persistence,
    persisted: persistence === "cloud_persisted",
    replayed,
    changed,
    contentReturned: false,
  };
}

export function applyConsentDecision(
  purposes: readonly ConsentPurposeDefinition[],
  events: readonly ConsentLedgerEvent[],
  request: ConsentDecisionRequest,
  persistence: ConsentDecisionReceipt["persistence"] = "ephemeral_demo",
): ConsentMutationResult {
  const projection = projectConsentLedger(purposes, events);
  if (!projection.valid) {
    return { accepted: false, reason: "invalid_ledger", events: [...events], receipt: null };
  }

  if (
    !request.requestId.trim() ||
    !request.purposeId.trim() ||
    !Number.isInteger(request.expectedRevision) ||
    request.expectedRevision < 0 ||
    !request.occurredAt.trim()
  ) {
    return { accepted: false, reason: "invalid_request", events: [...events], receipt: null };
  }

  const replay = events.find((event) => event.requestId === request.requestId);
  if (replay) {
    const exactReplay =
      replay.purposeId === request.purposeId &&
      replay.decision === request.decision &&
      replay.policyVersion === request.policyVersion;
    if (!exactReplay) {
      return { accepted: false, reason: "invalid_request", events: [...events], receipt: null };
    }
    return {
      accepted: true,
      reason: "idempotent_replay",
      events: [...events],
      receipt: issueReceipt(request, replay.revision, persistence, true, false),
    };
  }

  const purpose = purposes.find((candidate) => candidate.id === request.purposeId);
  if (!purpose) {
    return { accepted: false, reason: "invalid_request", events: [...events], receipt: null };
  }
  if (request.policyVersion !== purpose.policyVersion) {
    return { accepted: false, reason: "stale_policy", events: [...events], receipt: null };
  }
  if (purpose.required && request.decision === "revoked") {
    return { accepted: false, reason: "required_purpose", events: [...events], receipt: null };
  }

  const current = projection.states.find((state) => state.purposeId === request.purposeId)!;
  if (request.expectedRevision !== current.revision) {
    return { accepted: false, reason: "revision_conflict", events: [...events], receipt: null };
  }
  if (current.decision === request.decision) {
    return {
      accepted: true,
      reason: "unchanged",
      events: [...events],
      receipt: issueReceipt(request, current.revision, persistence, false, false),
    };
  }

  const revision = current.revision + 1;
  const event: ConsentLedgerEvent = {
    eventId: `consent-event:${request.requestId}`,
    requestId: request.requestId,
    purposeId: request.purposeId,
    revision,
    decision: request.decision,
    policyVersion: request.policyVersion,
    occurredAt: request.occurredAt,
    actor: "subject",
    source: "self_service",
  };

  return {
    accepted: true,
    reason: "appended",
    events: [...events, event],
    receipt: issueReceipt(request, revision, persistence, false, true),
  };
}
