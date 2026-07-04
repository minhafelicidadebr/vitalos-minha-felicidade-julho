// Gamification engine — pure readers over the gamification pack.
// Never imports from domain/; receives the economy as parameter.
import type { GamificationEconomy } from "../pack/pack-types";
import type {
  ParticipationAwardRule,
  ParticipationBadgeRule,
  ParticipationCategory,
  ParticipationEventKind,
} from "./participation-ledger";
import type { RecognitionPolicy, RecognitionVisibility } from "../recognition/recognition-engine";
import type {
  SeedCatalogItem,
  SeedEconomyPolicy,
  SeedPoolDef,
} from "../recognition/seed-economy-engine";

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
  participationLedger?: {
    awards?: Array<Record<string, unknown>>;
    badges?: Array<Record<string, unknown>>;
  };
  socialRecognition?: {
    weeklyBudget?: number;
    duplicateCooldownDays?: number;
    allowedVisibilities?: string[];
    publicRequiresConsent?: boolean;
    messageMaxChars?: number;
    kAnonymityMin?: number;
  };
  prosocialEconomy?: {
    currency?: { id?: string; name?: string; verb?: string };
    earning?: Record<string, number>;
    weeklyEarnCap?: number;
    weeklyDonationBudget?: number;
    kAnonymityMin?: number;
    catalog?: Array<Record<string, unknown>>;
    pools?: Array<Record<string, unknown>>;
  };
}

export interface ParticipationLedgerConfig {
  awards: ParticipationAwardRule[];
  badges: ParticipationBadgeRule[];
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

export function getParticipationLedgerConfig(
  economy: GamificationEconomy,
): ParticipationLedgerConfig {
  const shape = economy as unknown as EconomyShape;
  return {
    awards: (shape.participationLedger?.awards ?? []).map((rule) => ({
      kind: String(rule.kind) as ParticipationEventKind,
      category: String(rule.category) as ParticipationCategory,
      xp: typeof rule.xp === "number" ? rule.xp : 0,
      maxPerDay: typeof rule.maxPerDay === "number" ? rule.maxPerDay : 1,
    })),
    badges: (shape.participationLedger?.badges ?? []).map((rule) => ({
      id: String(rule.id),
      name: String(rule.name),
      emoji: String(rule.emoji ?? "✦"),
      threshold: typeof rule.threshold === "number" ? rule.threshold : 1,
      kind: rule.kind ? (String(rule.kind) as ParticipationEventKind) : undefined,
      category: rule.category ? (String(rule.category) as ParticipationCategory) : undefined,
    })),
  };
}

export function getRecognitionPolicy(economy: GamificationEconomy): RecognitionPolicy {
  const shape = economy as unknown as EconomyShape;
  const config = shape.socialRecognition;
  return {
    weeklyBudget: config?.weeklyBudget ?? getAntiGamingRules(economy).kudosWeeklyBudget,
    duplicateCooldownDays: config?.duplicateCooldownDays ?? 7,
    allowedVisibilities: (config?.allowedVisibilities ?? [
      "private",
      "public",
    ]) as RecognitionVisibility[],
    publicRequiresConsent: config?.publicRequiresConsent ?? true,
    messageMaxChars: config?.messageMaxChars ?? 240,
    kAnonymityMin: config?.kAnonymityMin ?? 5,
  };
}

/** Clamps an XP award to the daily cap given today's accumulated XP. */
export function clampXpAward(award: number, earnedToday: number, rules: AntiGamingRules): number {
  return Math.max(0, Math.min(award, rules.xpDailyCap - earnedToday));
}

// ─── Economia pró-social (Sementes Vivas · Academia Viva 2.0 I1) ─────────────

export interface SeedEconomyVocabulary {
  /** Nome da moeda no pack (ex.: "Sementes"). */
  currencyName: string;
  /** Verbo da metáfora (ex.: "plantar"). */
  verb: string;
}

/** null quando o pack não declara a economia pró-social — a UI esconde a seção. */
export function getSeedEconomyPolicy(economy: GamificationEconomy): SeedEconomyPolicy | null {
  const shape = economy as unknown as EconomyShape;
  const config = shape.prosocialEconomy;
  if (!config?.earning || Object.keys(config.earning).length === 0) return null;
  return {
    earning: config.earning,
    weeklyEarnCap: config.weeklyEarnCap ?? 12,
    weeklyDonationBudget: config.weeklyDonationBudget ?? 3,
    kAnonymityMin: config.kAnonymityMin ?? 5,
  };
}

export function getSeedEconomyVocabulary(economy: GamificationEconomy): SeedEconomyVocabulary {
  const shape = economy as unknown as EconomyShape;
  return {
    currencyName: shape.prosocialEconomy?.currency?.name ?? "Sementes",
    verb: shape.prosocialEconomy?.currency?.verb ?? "plantar",
  };
}

export function getSeedCatalog(economy: GamificationEconomy): SeedCatalogItem[] {
  const shape = economy as unknown as EconomyShape;
  return (shape.prosocialEconomy?.catalog ?? []).map((item) => ({
    id: String(item.id),
    name: String(item.name),
    emoji: String(item.emoji ?? "🌱"),
    cost: typeof item.cost === "number" ? item.cost : 1,
    meaning: String(item.meaning ?? ""),
  }));
}

export function getSeedPools(economy: GamificationEconomy): SeedPoolDef[] {
  const shape = economy as unknown as EconomyShape;
  return (shape.prosocialEconomy?.pools ?? []).map((pool) => ({
    id: String(pool.id),
    name: String(pool.name),
    channel: (pool.channel === "cause" ? "cause" : "team") as SeedPoolDef["channel"],
    target: typeof pool.target === "number" ? pool.target : undefined,
  }));
}
