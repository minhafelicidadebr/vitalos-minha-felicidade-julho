import { clampXpAward, type AntiGamingRules } from "./gamification-engine";

export type ParticipationEventKind =
  | "wave_response"
  | "pulse_completed"
  | "check_in"
  | "learning_module"
  | "learning_path"
  | "kudo_sent"
  | "nudge_action"
  | "mission_evidence";

export type ParticipationCategory = "participation" | "learning" | "contribution";

export interface ParticipationAwardRule {
  kind: ParticipationEventKind;
  category: ParticipationCategory;
  xp: number;
  maxPerDay: number;
}

export interface ParticipationEventRequest {
  id: string;
  kind: ParticipationEventKind;
  sourceId: string;
  occurredOn: string;
}

export interface ParticipationLedgerEvent extends ParticipationEventRequest {
  category: ParticipationCategory;
  xpAwarded: number;
  capped: boolean;
}

export type ParticipationRecordReason = "recorded" | "recorded_capped" | "duplicate" | "no_rule";

export interface ParticipationRecordResult {
  events: ParticipationLedgerEvent[];
  event: ParticipationLedgerEvent | null;
  reason: ParticipationRecordReason;
}

export interface ParticipationBadgeRule {
  id: string;
  name: string;
  emoji: string;
  threshold: number;
  kind?: ParticipationEventKind;
  category?: ParticipationCategory;
}

export interface ParticipationBadgeResult extends ParticipationBadgeRule {
  progress: number;
  earned: boolean;
}

export interface ParticipationLedgerSummary {
  totalXp: number;
  xpToday: number;
  eventCount: number;
  countsByKind: Record<ParticipationEventKind, number>;
  badges: ParticipationBadgeResult[];
}

const EVENT_KINDS: ParticipationEventKind[] = [
  "wave_response",
  "pulse_completed",
  "check_in",
  "learning_module",
  "learning_path",
  "kudo_sent",
  "nudge_action",
  "mission_evidence",
];

function emptyCounts(): Record<ParticipationEventKind, number> {
  return Object.fromEntries(EVENT_KINDS.map((kind) => [kind, 0])) as Record<
    ParticipationEventKind,
    number
  >;
}

/**
 * Records evidence without accepting an XP amount from the caller. The award
 * always comes from injected policy, is deduplicated by id/source and respects
 * both the event limit and the global daily cap.
 */
export function recordParticipationEvent(
  existing: readonly ParticipationLedgerEvent[],
  request: ParticipationEventRequest,
  awardRules: readonly ParticipationAwardRule[],
  antiGaming: AntiGamingRules,
): ParticipationRecordResult {
  const duplicate = existing.some(
    (event) =>
      event.id === request.id ||
      (event.kind === request.kind && event.sourceId === request.sourceId),
  );
  if (duplicate) return { events: [...existing], event: null, reason: "duplicate" };

  const rule = awardRules.find((candidate) => candidate.kind === request.kind);
  if (!rule) return { events: [...existing], event: null, reason: "no_rule" };

  const eventsToday = existing.filter((event) => event.occurredOn === request.occurredOn);
  const earnedToday = eventsToday.reduce((sum, event) => sum + event.xpAwarded, 0);
  const kindCountToday = eventsToday.filter((event) => event.kind === request.kind).length;
  const requestedXp = kindCountToday >= rule.maxPerDay ? 0 : Math.max(0, rule.xp);
  const xpAwarded = clampXpAward(requestedXp, earnedToday, antiGaming);
  const event: ParticipationLedgerEvent = {
    ...request,
    category: rule.category,
    xpAwarded,
    capped: xpAwarded < Math.max(0, rule.xp),
  };

  return {
    events: [...existing, event],
    event,
    reason: event.capped ? "recorded_capped" : "recorded",
  };
}

export function buildParticipationSummary(
  events: readonly ParticipationLedgerEvent[],
  today: string,
  badgeRules: readonly ParticipationBadgeRule[],
): ParticipationLedgerSummary {
  const countsByKind = emptyCounts();

  for (const event of events) {
    countsByKind[event.kind] += 1;
  }

  const badges = badgeRules.map((rule) => {
    const progress = events.filter((event) => {
      if (rule.kind && event.kind !== rule.kind) return false;
      if (rule.category && event.category !== rule.category) return false;
      return true;
    }).length;

    return {
      ...rule,
      progress,
      earned: progress >= rule.threshold,
    };
  });

  return {
    totalXp: events.reduce((sum, event) => sum + event.xpAwarded, 0),
    xpToday: events
      .filter((event) => event.occurredOn === today)
      .reduce((sum, event) => sum + event.xpAwarded, 0),
    eventCount: events.length,
    countsByKind,
    badges,
  };
}

export function hasParticipationEvidence(
  events: readonly ParticipationLedgerEvent[],
  kind: ParticipationEventKind,
  sourceId: string,
): boolean {
  return events.some((event) => event.kind === kind && event.sourceId === sourceId);
}
