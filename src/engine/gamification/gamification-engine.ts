// Gamification engine — pure readers over the gamification pack.
// Never imports from domain/; receives the economy as parameter.
import type { GamificationEconomy } from "../pack/pack-types";

export interface MissionDef {
  id: string;
  type: "micro" | "macro" | "legendary";
  scope: string;
  pillarId: string;
  title: string;
  xp?: number;
  impact?: number;
  evidence: string;
  ownerRole?: string;
  optIn?: boolean;
}

export interface BadgeDef {
  id: string;
  name: string;
  scope: string;
  trigger: string;
  role?: string;
}

export interface AntiGamingRules {
  xpDailyCap: number;
  kudosWeeklyBudget: number;
  duplicateMissionCooldownHours: number;
}

interface EconomyShape {
  seedMissions?: Array<Record<string, unknown>>;
  badges?: Array<Record<string, unknown>>;
  antiGaming?: {
    xpDailyCap?: number;
    kudosWeeklyBudget?: number;
    duplicateMissionCooldownHours?: number;
  };
  ethicalPrinciples?: string[];
}

export function getMissions(economy: GamificationEconomy): MissionDef[] {
  const shape = economy as unknown as EconomyShape;
  return (shape.seedMissions ?? []).map((m) => ({
    id: String(m.id),
    type: m.type as MissionDef["type"],
    scope: String(m.scope),
    pillarId: String(m.pillar),
    title: String(m.title),
    xp: typeof m.xp === "number" ? m.xp : undefined,
    impact: typeof m.impact === "number" ? m.impact : undefined,
    evidence: String(m.evidence ?? "none"),
    ownerRole: m.ownerRole ? String(m.ownerRole) : undefined,
    optIn: Boolean(m.optIn),
  }));
}

export function getBadges(economy: GamificationEconomy): BadgeDef[] {
  const shape = economy as unknown as EconomyShape;
  return (shape.badges ?? []).map((b) => ({
    id: String(b.id),
    name: String(b.name),
    scope: String(b.scope),
    trigger: String(b.trigger),
    role: b.role ? String(b.role) : undefined,
  }));
}

export function getAntiGamingRules(economy: GamificationEconomy): AntiGamingRules {
  const shape = economy as unknown as EconomyShape;
  return {
    xpDailyCap: shape.antiGaming?.xpDailyCap ?? 150,
    kudosWeeklyBudget: shape.antiGaming?.kudosWeeklyBudget ?? 5,
    duplicateMissionCooldownHours: shape.antiGaming?.duplicateMissionCooldownHours ?? 20,
  };
}

export function getEthicalPrinciples(economy: GamificationEconomy): string[] {
  const shape = economy as unknown as EconomyShape;
  return shape.ethicalPrinciples ?? [];
}

/** Clamps an XP award to the daily cap given today's accumulated XP. */
export function clampXpAward(
  award: number,
  earnedToday: number,
  rules: AntiGamingRules,
): number {
  return Math.max(0, Math.min(award, rules.xpDailyCap - earnedToday));
}
