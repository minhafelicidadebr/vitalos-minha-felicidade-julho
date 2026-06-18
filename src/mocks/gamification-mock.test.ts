import { describe, expect, test } from "bun:test";
import enterpriseEconomy from "@/domain/packs/enterprise/gamification-economy.json";
import {
  getAntiGamingRules,
  getEthicalPrinciples,
  getParticipationLedgerConfig,
} from "@/engine/gamification/gamification-engine";
import type { GamificationEconomy } from "@/engine/pack/pack-types";

const economy = enterpriseEconomy as unknown as GamificationEconomy;

describe("gamification config — economia ética viva", () => {
  test("event kinds are unique and every award is bounded", () => {
    const config = getParticipationLedgerConfig(economy);
    const kinds = config.awards.map((rule) => rule.kind);

    expect(new Set(kinds).size).toBe(kinds.length);
    expect(config.awards.every((rule) => rule.xp >= 0 && rule.xp <= 25)).toBe(true);
    expect(config.awards.every((rule) => rule.maxPerDay >= 1)).toBe(true);
  });

  test("the ledger has no event for score, mood value or performance", () => {
    const kinds = getParticipationLedgerConfig(economy).awards.map((rule) => String(rule.kind));

    expect(kinds.some((kind) => /score|mood|performance|answer|ranking/i.test(kind))).toBe(false);
  });

  test("all badges require verifiable progress and never compare people", () => {
    const badges = getParticipationLedgerConfig(economy).badges;

    expect(badges.length).toBeGreaterThanOrEqual(4);
    expect(badges.every((badge) => badge.threshold >= 1)).toBe(true);
    expect(badges.every((badge) => Boolean(badge.kind || badge.category))).toBe(true);
  });

  test("pack keeps explicit anti-ranking and anti-performance principles", () => {
    const principles = getEthicalPrinciples(economy);

    expect(principles).toContain("collective_progress_over_individual_ranking");
    expect(principles).toContain("xp_never_feeds_performance_review_promotion_or_pay");
    expect(getAntiGamingRules(economy).xpDailyCap).toBe(150);
  });
});
