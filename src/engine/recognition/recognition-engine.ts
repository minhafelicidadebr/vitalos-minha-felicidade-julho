export type RecognitionVisibility = "private" | "public";

export interface RecognitionPolicy {
  weeklyBudget: number;
  duplicateCooldownDays: number;
  allowedVisibilities: RecognitionVisibility[];
  publicRequiresConsent: boolean;
  messageMaxChars: number;
  kAnonymityMin: number;
}

export interface RecognitionRequest {
  id: string;
  senderId: string;
  recipientId: string;
  pillarId: string;
  visibility: RecognitionVisibility;
  publicationConsent: boolean;
  occurredOn: string;
}

export interface RecognitionEvent {
  id: string;
  senderId: string;
  recipientId: string;
  pillarId: string;
  visibility: RecognitionVisibility;
  occurredOn: string;
}

export type RecognitionRecordReason =
  | "recorded"
  | "duplicate"
  | "self_recognition"
  | "budget_exhausted"
  | "visibility_not_allowed"
  | "public_consent_required"
  | "invalid_request";

export interface RecognitionRecordResult {
  events: RecognitionEvent[];
  event: RecognitionEvent | null;
  reason: RecognitionRecordReason;
  remainingBudget: number;
}

export interface RecognitionAggregateInput {
  pillarId: string;
  pillarLabel: string;
  recognitionCount: number;
  uniqueContributors: number;
}

export interface RecognitionAggregateResult extends RecognitionAggregateInput {
  visible: boolean;
}

const MS_PER_DAY = 86_400_000;

function parseDay(iso: string): number {
  const [year, month, day] = iso.split("-").map(Number);
  return Date.UTC(year!, (month ?? 1) - 1, day ?? 1);
}

/** Monday-based period key. Deterministic and independent of local timezone. */
export function recognitionWeekKey(iso: string): string {
  const date = new Date(parseDay(iso));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  return date.toISOString().slice(0, 10);
}

export function recognitionBudgetRemaining(
  events: readonly RecognitionEvent[],
  senderId: string,
  occurredOn: string,
  policy: RecognitionPolicy,
): number {
  const week = recognitionWeekKey(occurredOn);
  const used = events.filter(
    (event) => event.senderId === senderId && recognitionWeekKey(event.occurredOn) === week,
  ).length;
  return Math.max(0, policy.weeklyBudget - used);
}

/**
 * Records only social metadata. Message content is intentionally absent from
 * both request and event types so it cannot leak into the persisted ledger.
 */
export function recordRecognition(
  existing: readonly RecognitionEvent[],
  request: RecognitionRequest,
  policy: RecognitionPolicy,
): RecognitionRecordResult {
  const remaining = recognitionBudgetRemaining(
    existing,
    request.senderId,
    request.occurredOn,
    policy,
  );
  const finish = (
    reason: RecognitionRecordReason,
    events: RecognitionEvent[] = [...existing],
    event: RecognitionEvent | null = null,
  ): RecognitionRecordResult => ({
    events,
    event,
    reason,
    remainingBudget:
      event === null
        ? remaining
        : recognitionBudgetRemaining(events, request.senderId, request.occurredOn, policy),
  });

  if (
    !request.id.trim() ||
    !request.senderId.trim() ||
    !request.recipientId.trim() ||
    !request.pillarId.trim()
  ) {
    return finish("invalid_request");
  }
  if (existing.some((event) => event.id === request.id)) return finish("duplicate");
  if (request.senderId === request.recipientId) return finish("self_recognition");
  if (!policy.allowedVisibilities.includes(request.visibility)) {
    return finish("visibility_not_allowed");
  }
  if (
    request.visibility === "public" &&
    policy.publicRequiresConsent &&
    !request.publicationConsent
  ) {
    return finish("public_consent_required");
  }
  if (remaining <= 0) return finish("budget_exhausted");

  const requestDay = parseDay(request.occurredOn);
  const duplicate = existing.some((event) => {
    if (
      event.senderId !== request.senderId ||
      event.recipientId !== request.recipientId ||
      event.pillarId !== request.pillarId
    ) {
      return false;
    }
    const elapsedDays = Math.abs(requestDay - parseDay(event.occurredOn)) / MS_PER_DAY;
    return elapsedDays < policy.duplicateCooldownDays;
  });
  if (duplicate) return finish("duplicate");

  const event: RecognitionEvent = {
    id: request.id,
    senderId: request.senderId,
    recipientId: request.recipientId,
    pillarId: request.pillarId,
    visibility: request.visibility,
    occurredOn: request.occurredOn,
  };
  const events = [...existing, event];
  return finish("recorded", events, event);
}

export function buildRecognitionAggregates(
  inputs: readonly RecognitionAggregateInput[],
  policy: RecognitionPolicy,
): RecognitionAggregateResult[] {
  return inputs.map((input) => ({
    ...input,
    visible: input.uniqueContributors >= policy.kAnonymityMin,
  }));
}
