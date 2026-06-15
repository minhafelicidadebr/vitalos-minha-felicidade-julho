import { describe, expect, test } from "bun:test";
import {
  getMissions,
  getBadges,
  getAntiGamingRules,
  getEthicalPrinciples,
  clampXpAward,
} from "./gamification-engine";
import type { GamificationEconomy } from "../pack/pack-types";

const ECONOMY = {
  version: "1.0.0",
  ethicalPrinciples: ["Sem ranking individual público", "Reconhecimento, não vigilância"],
  seedMissions: [
    {
      id: "m1",
      type: "micro",
      scope: "self",
      pillar: "energia",
      title: "Faça 3 pausas reais hoje",
      xp: 15,
      evidence: "self_report",
    },
    {
      id: "m2",
      type: "macro",
      scope: "team",
      pillar: "confianca",
      title: "Facilite um ritual de equipe",
      impact: 50,
      evidence: "peer",
      ownerRole: "LIDER_EQUIPE",
      optIn: true,
    },
  ],
  badges: [
    { id: "b1", name: "Semente", scope: "self", trigger: "first_pulse" },
    { id: "b2", name: "Guardião", scope: "team", trigger: "streak_4", role: "EMBAIXADOR" },
  ],
  antiGaming: { xpDailyCap: 120, kudosWeeklyBudget: 4, duplicateMissionCooldownHours: 24 },
} as unknown as GamificationEconomy;

// ─── Missions ────────────────────────────────────────────────────────────────

describe("getMissions", () => {
  test("mapeia campos e renomeia pillar → pillarId", () => {
    const missions = getMissions(ECONOMY);
    expect(missions).toHaveLength(2);
    const m1 = missions.find((m) => m.id === "m1")!;
    expect(m1.pillarId).toBe("energia");
    expect(m1.type).toBe("micro");
    expect(m1.xp).toBe(15);
    expect(m1.impact).toBeUndefined();
  });

  test("preserva opcionais (ownerRole, optIn, impact)", () => {
    const m2 = getMissions(ECONOMY).find((m) => m.id === "m2")!;
    expect(m2.ownerRole).toBe("LIDER_EQUIPE");
    expect(m2.optIn).toBe(true);
    expect(m2.impact).toBe(50);
    expect(m2.xp).toBeUndefined();
  });

  test("evidence default 'none' quando ausente", () => {
    const eco = {
      version: "1",
      seedMissions: [{ id: "x", type: "micro", scope: "self", pillar: "p", title: "t" }],
    } as unknown as GamificationEconomy;
    expect(getMissions(eco)[0]!.evidence).toBe("none");
  });

  test("seedMissions ausente → lista vazia", () => {
    expect(getMissions({ version: "1" } as GamificationEconomy)).toEqual([]);
  });
});

// ─── Badges ──────────────────────────────────────────────────────────────────

describe("getBadges", () => {
  test("mapeia badges", () => {
    const badges = getBadges(ECONOMY);
    expect(badges).toHaveLength(2);
    expect(badges[0]!.name).toBe("Semente");
  });

  test("preserva role opcional", () => {
    const b2 = getBadges(ECONOMY).find((b) => b.id === "b2")!;
    expect(b2.role).toBe("EMBAIXADOR");
    expect(getBadges(ECONOMY).find((b) => b.id === "b1")!.role).toBeUndefined();
  });

  test("badges ausente → lista vazia", () => {
    expect(getBadges({ version: "1" } as GamificationEconomy)).toEqual([]);
  });
});

// ─── Anti-gaming ─────────────────────────────────────────────────────────────

describe("getAntiGamingRules", () => {
  test("lê regras do pack", () => {
    const r = getAntiGamingRules(ECONOMY);
    expect(r.xpDailyCap).toBe(120);
    expect(r.kudosWeeklyBudget).toBe(4);
    expect(r.duplicateMissionCooldownHours).toBe(24);
  });

  test("usa defaults quando ausente", () => {
    const r = getAntiGamingRules({ version: "1" } as GamificationEconomy);
    expect(r.xpDailyCap).toBe(150);
    expect(r.kudosWeeklyBudget).toBe(5);
    expect(r.duplicateMissionCooldownHours).toBe(20);
  });
});

// ─── Ethical principles ──────────────────────────────────────────────────────

describe("getEthicalPrinciples", () => {
  test("lê princípios do pack", () => {
    expect(getEthicalPrinciples(ECONOMY)).toHaveLength(2);
  });

  test("ausente → lista vazia", () => {
    expect(getEthicalPrinciples({ version: "1" } as GamificationEconomy)).toEqual([]);
  });
});

// ─── clampXpAward ────────────────────────────────────────────────────────────

describe("clampXpAward", () => {
  const rules = getAntiGamingRules(ECONOMY); // cap 120

  test("award abaixo do cap restante passa intacto", () => {
    expect(clampXpAward(30, 50, rules)).toBe(30); // 50+30=80 < 120
  });

  test("award que estoura o cap é truncado ao restante", () => {
    expect(clampXpAward(50, 100, rules)).toBe(20); // só 20 cabem até 120
  });

  test("já no cap → award 0", () => {
    expect(clampXpAward(40, 120, rules)).toBe(0);
  });

  test("acima do cap → nunca negativo", () => {
    expect(clampXpAward(40, 150, rules)).toBe(0);
  });

  test("award exatamente no limite restante", () => {
    expect(clampXpAward(20, 100, rules)).toBe(20); // 100+20=120 exato
  });
});
