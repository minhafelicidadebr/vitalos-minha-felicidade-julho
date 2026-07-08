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
import { defineOffer, type InstitutionalOffer, type PortaAbertaResource } from "../vitrine/vitrine-offer-engine";
import {
  DEFAULT_JOURNAL_POLICY,
  PRACTICE_EVIDENCE_KINDS,
  type PracticeEvidenceKind,
  type PracticeJournalPolicy,
} from "../learning/practice-journal-engine";
import {
  DEFAULT_LOOP_POLICY,
  LOOP_STEP_ORDER,
  type LoopStepId,
  type WeeklyLoopPolicy,
} from "../season/weekly-loop-engine";
import { DEFAULT_CIRCLE_POLICY, type CircleSessionPolicy } from "../embaixadorias/circle-engine";

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
  vitrine?: {
    categories?: Array<{ id?: string; label?: string }>;
    collectiveOffers?: Array<Record<string, unknown>>;
    portaAberta?: { id?: string; title?: string; description?: string; howToAccess?: string };
  };
  credentials?: {
    credentialTitle?: string;
    issuerName?: string;
    disclaimer?: string;
  };
  practiceJournal?: {
    enabledKinds?: string[];
    kindLabels?: Record<string, string>;
    summaryMaxChars?: number;
    kAnonymityMin?: number;
  };
  weeklyLoop?: {
    stepLabels?: Record<string, string>;
    coverageThresholdPct?: number;
    kAnonymityMin?: number;
    cadence?: string;
  };
  circles?: {
    label?: string;
    minPresence?: number;
    maxPresence?: number;
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

export interface PracticeJournalConfig {
  policy: PracticeJournalPolicy;
  /** Rótulos por tipo — vocabulário do pack, nunca do engine. */
  kindLabels: Record<PracticeEvidenceKind, string>;
}

/** null quando o pack não declara o Diário de Prática — a UI esconde a seção. */
export function getPracticeJournalConfig(
  economy: GamificationEconomy,
): PracticeJournalConfig | null {
  const shape = economy as unknown as EconomyShape;
  const config = shape.practiceJournal;
  if (!config?.enabledKinds?.length) return null;

  const enabledKinds = config.enabledKinds.filter((k): k is PracticeEvidenceKind =>
    (PRACTICE_EVIDENCE_KINDS as readonly string[]).includes(k),
  );
  if (enabledKinds.length === 0) return null;

  const kindLabels = {} as Record<PracticeEvidenceKind, string>;
  for (const kind of PRACTICE_EVIDENCE_KINDS) {
    kindLabels[kind] = config.kindLabels?.[kind] ?? kind;
  }

  return {
    policy: {
      enabledKinds,
      summaryMaxChars: config.summaryMaxChars ?? DEFAULT_JOURNAL_POLICY.summaryMaxChars,
      kAnonymityMin: config.kAnonymityMin ?? DEFAULT_JOURNAL_POLICY.kAnonymityMin,
    },
    kindLabels,
  };
}

export interface WeeklyLoopConfig {
  policy: WeeklyLoopPolicy;
  cadence: "semanal" | "quinzenal";
  /** Rótulos por passo — vocabulário do pack, nunca do engine. */
  stepLabels: Record<LoopStepId, string>;
}

/** null quando o pack não declara o Loop Vivo — a UI esconde a seção. */
export function getWeeklyLoopConfig(economy: GamificationEconomy): WeeklyLoopConfig | null {
  const shape = economy as unknown as EconomyShape;
  const config = shape.weeklyLoop;
  if (!config?.stepLabels || !config.coverageThresholdPct || !config.kAnonymityMin) return null;

  const stepLabels = {} as Record<LoopStepId, string>;
  for (const step of LOOP_STEP_ORDER) {
    const label = config.stepLabels[step];
    if (!label) return null; // pack incompleto: falta rótulo de um passo canônico
    stepLabels[step] = label;
  }

  return {
    policy: {
      coverageThresholdPct: config.coverageThresholdPct ?? DEFAULT_LOOP_POLICY.coverageThresholdPct,
      kAnonymityMin: config.kAnonymityMin ?? DEFAULT_LOOP_POLICY.kAnonymityMin,
    },
    cadence: config.cadence === "quinzenal" ? "quinzenal" : "semanal",
    stepLabels,
  };
}

export interface CirclesConfig {
  label: string;
  policy: CircleSessionPolicy;
}

/** null quando o pack não declara Círculos Vivos — a UI esconde a seção. */
export function getCirclesConfig(economy: GamificationEconomy): CirclesConfig | null {
  const shape = economy as unknown as EconomyShape;
  const config = shape.circles;
  if (!config?.label || !config.minPresence || !config.maxPresence) return null;
  return {
    label: config.label,
    policy: {
      minPresence: config.minPresence ?? DEFAULT_CIRCLE_POLICY.minPresence,
      maxPresence: config.maxPresence ?? DEFAULT_CIRCLE_POLICY.maxPresence,
    },
  };
}

export interface CredentialsConfig {
  credentialTitle: string;
  issuerName: string;
  /** Disclaimer verbatim do verso — obrigatório no schema, nunca omitido do documento. */
  disclaimer: string;
}

/** null quando o pack não declara credenciais — a UI esconde o Diploma Vivo inteiro. */
export function getCredentialsConfig(economy: GamificationEconomy): CredentialsConfig | null {
  const shape = economy as unknown as EconomyShape;
  const config = shape.credentials;
  if (!config?.credentialTitle || !config.issuerName || !config.disclaimer) return null;
  return {
    credentialTitle: config.credentialTitle,
    issuerName: config.issuerName,
    disclaimer: config.disclaimer,
  };
}

export interface VitrineCategoryDef {
  id: string;
  label: string;
}

export interface VitrineConfig {
  categories: VitrineCategoryDef[];
  offers: InstitutionalOffer[];
  portaAberta: PortaAbertaResource;
}

/** null quando o pack não declara a Vitrine — a UI esconde a seção inteira. */
export function getVitrineConfig(economy: GamificationEconomy): VitrineConfig | null {
  const shape = economy as unknown as EconomyShape;
  const config = shape.vitrine;
  if (!config?.portaAberta || !config.collectiveOffers) return null;

  const offers: InstitutionalOffer[] = [];
  for (const raw of config.collectiveOffers) {
    // defineOffer valida de novo aqui (pack é JSON solto, sem tipos do TS protegendo) — uma
    // oferta malformada é OMITIDA, nunca aceita por acidente sem contrapartida/categoria válida.
    const result = defineOffer({
      id: String(raw.id),
      category: String(raw.category),
      title: String(raw.title ?? ""),
      description: String(raw.description ?? ""),
      provider: raw.provider === "partner" ? "partner" : "institution",
      accessMode: (raw.accessMode as InstitutionalOffer["accessMode"]) ?? "collective",
      mirroredPledge: String(raw.mirroredPledge ?? ""),
      capacity: typeof raw.capacity === "number" ? raw.capacity : undefined,
    });
    if (result.ok) offers.push(result.offer);
  }

  return {
    categories: (config.categories ?? []).map((c) => ({
      id: String(c.id),
      label: String(c.label ?? c.id),
    })),
    offers,
    portaAberta: {
      id: String(config.portaAberta.id),
      title: String(config.portaAberta.title ?? "Porta Aberta"),
      description: String(config.portaAberta.description ?? ""),
      howToAccess: String(config.portaAberta.howToAccess ?? ""),
    },
  };
}
