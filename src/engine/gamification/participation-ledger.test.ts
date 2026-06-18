import { describe, expect, test } from "bun:test";
import {
  buildParticipationSummary,
  hasParticipationEvidence,
  recordParticipationEvent,
  type ParticipationAwardRule,
  type ParticipationLedgerEvent,
} from "./participation-ledger";
import type { AntiGamingRules } from "./gamification-engine";

const ANTI: AntiGamingRules = {
  xpDailyCap: 50,
  kudosWeeklyBudget: 5,
  duplicateMissionCooldownHours: 20,
};

const RULES: ParticipationAwardRule[] = [
  { kind: "wave_response", category: "participation", xp: 25, maxPerDay: 1 },
  { kind: "learning_module", category: "learning", xp: 10, maxPerDay: 2 },
  { kind: "kudo_sent", category: "contribution", xp: 10, maxPerDay: 1 },
];

function record(
  events: ParticipationLedgerEvent[],
  over: Partial<Parameters<typeof recordParticipationEvent>[1]> = {},
) {
  return recordParticipationEvent(
    events,
    {
      id: "e1",
      kind: "wave_response",
      sourceId: "wave-1",
      occurredOn: "2026-06-18",
      ...over,
    },
    RULES,
    ANTI,
  );
}

describe("participation ledger", () => {
  test("XP comes from policy, never from the caller", () => {
    const result = record([]);

    expect(result.reason).toBe("recorded");
    expect(result.event?.xpAwarded).toBe(25);
    expect(Object.keys(result.event ?? {})).not.toContain("answer");
    expect(Object.keys(result.event ?? {})).not.toContain("score");
  });

  test("duplicate id or source is idempotent", () => {
    const first = record([]);
    const duplicateId = record(first.events);
    const duplicateSource = record(first.events, { id: "different-id" });

    expect(duplicateId.reason).toBe("duplicate");
    expect(duplicateSource.reason).toBe("duplicate");
    expect(duplicateSource.events).toHaveLength(1);
  });

  test("daily kind limit preserves evidence but awards zero XP", () => {
    const first = record([], {
      id: "k1",
      kind: "kudo_sent",
      sourceId: "kudo-1",
    });
    const second = record(first.events, {
      id: "k2",
      kind: "kudo_sent",
      sourceId: "kudo-2",
    });

    expect(second.reason).toBe("recorded_capped");
    expect(second.event?.xpAwarded).toBe(0);
    expect(second.events).toHaveLength(2);
  });

  test("global daily cap truncates XP without discarding completion", () => {
    const wave = record([]);
    const moduleOne = record(wave.events, {
      id: "m1",
      kind: "learning_module",
      sourceId: "path:m1",
    });
    const moduleTwo = record(moduleOne.events, {
      id: "m2",
      kind: "learning_module",
      sourceId: "path:m2",
    });
    const kudo = record(moduleTwo.events, {
      id: "k1",
      kind: "kudo_sent",
      sourceId: "kudo-1",
    });

    expect(kudo.event?.xpAwarded).toBe(5);
    expect(kudo.event?.capped).toBe(true);
    expect(kudo.events.reduce((sum, event) => sum + event.xpAwarded, 0)).toBe(50);
  });

  test("unknown event kind policy fails closed", () => {
    const result = recordParticipationEvent(
      [],
      {
        id: "n1",
        kind: "nudge_action",
        sourceId: "nudge-1",
        occurredOn: "2026-06-18",
      },
      RULES,
      ANTI,
    );

    expect(result.reason).toBe("no_rule");
    expect(result.events).toEqual([]);
  });

  test("summary computes XP, evidence counts and badges", () => {
    const wave = record([]).events;
    const module = record(wave, {
      id: "m1",
      kind: "learning_module",
      sourceId: "path:m1",
    }).events;
    const summary = buildParticipationSummary(module, "2026-06-18", [
      {
        id: "voice",
        name: "Voz presente",
        emoji: "🗣",
        kind: "wave_response",
        threshold: 1,
      },
      {
        id: "learner",
        name: "Aprendiz",
        emoji: "📚",
        category: "learning",
        threshold: 3,
      },
    ]);

    expect(summary.totalXp).toBe(35);
    expect(summary.xpToday).toBe(35);
    expect(summary.countsByKind.wave_response).toBe(1);
    expect(summary.badges[0]!.earned).toBe(true);
    expect(summary.badges[1]!.earned).toBe(false);
    expect(hasParticipationEvidence(module, "learning_module", "path:m1")).toBe(true);
  });
});
