// Sementes Vivas — motor PURO da economia pró-social (Academia Viva 2.0, inovação I1).
//
// A inversão da loja convencional: o catálogo é composto de coisas que você DÁ,
// nunca de auto-consumo. Fundamento: gasto pró-social gera mais bem-estar que gasto
// pessoal (Dunn, Aknin & Norton 2008, Science; Aknin et al. 2013, JPSP — universal
// em 136 países). A decisão de design mais importante vem da SDT (Deci & Ryan):
// doar NUNCA rende XP nem sementes de volta — recompensar o dar corromperia o
// motivo pró-social (overjustification). Este engine é estruturalmente incapaz
// de conceder XP: não existe caminho de código que retorne pontos por doação.
//
// COMPOSIÇÃO (Fable 5 §5.1): herda o idioma do recognition-engine (semana
// determinística, orçamento semanal, no-self, k-anon) e deriva TODO ganho dos
// kinds do participation-ledger — nenhuma torneira nova de farming; se o ledger
// é anti-gaming, a carteira herda.
//
// ÉTICA POR CONSTRUÇÃO (lista "nunca" do PLANO_ACADEMIA_VIVA_2.0 §E3): sem
// ranking de doadores, sem total individual público (a agregação só sai por
// buildSeedPools, k≥5), sem conversão material. Engine puro: sem React, sem I/O,
// sem domain/ — moeda, catálogo, verbos e tetos chegam por parâmetro (pack).

import { recognitionWeekKey } from "./recognition-engine";

export type SeedChannel = "person" | "team" | "cause";

export type SeedWalletEventKind =
  | "earned"
  | "donated_person"
  | "donated_team"
  | "donated_cause";

export interface SeedEconomyPolicy {
  /** kind do participation-ledger → sementes concedidas (ausente = não gera). */
  earning: Record<string, number>;
  /** Teto de sementes ganhas por semana (semana determinística, segunda-feira). */
  weeklyEarnCap: number;
  /** Nº de doações por semana, somando os três canais (espelho do kudos 5/semana). */
  weeklyDonationBudget: number;
  /** Pool coletivo só é visível com ≥ este nº de contribuintes únicos. */
  kAnonymityMin: number;
}

/** Item doável do catálogo (canal person). Vocabulário 100% do pack. */
export interface SeedCatalogItem {
  id: string;
  name: string;
  emoji: string;
  cost: number;
  /** O que este presente reconhece — microcopy do pack, nunca do engine. */
  meaning: string;
}

export interface SeedWalletEvent {
  id: string;
  kind: SeedWalletEventKind;
  /** Sempre positivo; o sinal deriva do kind no fold do saldo. */
  amount: number;
  /** earned: qual kind do ledger originou. */
  sourceKind?: string;
  /** donated_person. */
  itemId?: string;
  recipientId?: string;
  /** donated_team | donated_cause. */
  poolId?: string;
  occurredOn: string;
}

// ─── Ganho ───────────────────────────────────────────────────────────────────

export interface SeedEarnRequest {
  id: string;
  /** kind do participation-ledger que acabou de ser registrado. */
  sourceKind: string;
  occurredOn: string;
}

export type SeedEarnReason = "recorded" | "duplicate" | "no_rule" | "cap_reached" | "invalid_request";

export interface SeedEarnResult {
  events: SeedWalletEvent[];
  event: SeedWalletEvent | null;
  reason: SeedEarnReason;
  /** True quando o teto semanal reduziu o valor concedido (parcial, honesto). */
  capped: boolean;
  balance: number;
}

/** Saldo = fold puro dos eventos (event sourcing; nunca estado mutável). */
export function seedBalance(events: readonly SeedWalletEvent[]): number {
  return events.reduce(
    (sum, event) => sum + (event.kind === "earned" ? event.amount : -event.amount),
    0,
  );
}

export function weeklySeedsEarned(
  events: readonly SeedWalletEvent[],
  occurredOn: string,
): number {
  const week = recognitionWeekKey(occurredOn);
  return events
    .filter((e) => e.kind === "earned" && recognitionWeekKey(e.occurredOn) === week)
    .reduce((sum, e) => sum + e.amount, 0);
}

export function recordSeedEarn(
  existing: readonly SeedWalletEvent[],
  request: SeedEarnRequest,
  policy: SeedEconomyPolicy,
): SeedEarnResult {
  const finish = (
    reason: SeedEarnReason,
    events: SeedWalletEvent[] = [...existing],
    event: SeedWalletEvent | null = null,
    capped = false,
  ): SeedEarnResult => ({ events, event, reason, capped, balance: seedBalance(events) });

  if (!request.id.trim() || !request.sourceKind.trim()) return finish("invalid_request");
  if (existing.some((e) => e.id === request.id)) return finish("duplicate");

  const configured = policy.earning[request.sourceKind] ?? 0;
  if (configured <= 0) return finish("no_rule");

  const earnedThisWeek = weeklySeedsEarned(existing, request.occurredOn);
  const remaining = Math.max(0, policy.weeklyEarnCap - earnedThisWeek);
  if (remaining === 0) return finish("cap_reached");

  const amount = Math.min(configured, remaining);
  const event: SeedWalletEvent = {
    id: request.id,
    kind: "earned",
    amount,
    sourceKind: request.sourceKind,
    occurredOn: request.occurredOn,
  };
  return finish("recorded", [...existing, event], event, amount < configured);
}

// ─── Doação ──────────────────────────────────────────────────────────────────

export interface SeedDonationRequest {
  id: string;
  channel: SeedChannel;
  /** Dono da carteira (a sessão) — necessário para o no-self do canal person. */
  donorId: string;
  /** person. */
  recipientId?: string;
  itemId?: string;
  /** team | cause. */
  poolId?: string;
  amount?: number;
  occurredOn: string;
}

export type SeedDonationReason =
  | "recorded"
  | "duplicate"
  | "invalid_request"
  | "self_donation"
  | "unknown_item"
  | "insufficient_balance"
  | "budget_exhausted";

export interface SeedDonationResult {
  events: SeedWalletEvent[];
  event: SeedWalletEvent | null;
  reason: SeedDonationReason;
  balance: number;
  remainingDonationBudget: number;
}

export function donationBudgetRemaining(
  events: readonly SeedWalletEvent[],
  occurredOn: string,
  policy: SeedEconomyPolicy,
): number {
  const week = recognitionWeekKey(occurredOn);
  const used = events.filter(
    (e) => e.kind !== "earned" && recognitionWeekKey(e.occurredOn) === week,
  ).length;
  return Math.max(0, policy.weeklyDonationBudget - used);
}

const DONATION_KIND: Record<SeedChannel, SeedWalletEventKind> = {
  person: "donated_person",
  team: "donated_team",
  cause: "donated_cause",
};

/**
 * Registra uma doação. NUNCA retorna XP, sementes de volta ou qualquer
 * recompensa ao doador — por construção, não por política (SDT: o motivo
 * pró-social não se compra).
 */
export function recordSeedDonation(
  existing: readonly SeedWalletEvent[],
  request: SeedDonationRequest,
  policy: SeedEconomyPolicy,
  catalog: readonly SeedCatalogItem[],
): SeedDonationResult {
  const budget = donationBudgetRemaining(existing, request.occurredOn, policy);
  const finish = (
    reason: SeedDonationReason,
    events: SeedWalletEvent[] = [...existing],
    event: SeedWalletEvent | null = null,
  ): SeedDonationResult => ({
    events,
    event,
    reason,
    balance: seedBalance(events),
    remainingDonationBudget:
      event === null ? budget : donationBudgetRemaining(events, request.occurredOn, policy),
  });

  if (!request.id.trim() || !request.donorId.trim()) return finish("invalid_request");
  if (existing.some((e) => e.id === request.id)) return finish("duplicate");

  let amount: number;
  if (request.channel === "person") {
    if (!request.recipientId?.trim() || !request.itemId?.trim()) return finish("invalid_request");
    if (request.recipientId === request.donorId) return finish("self_donation");
    const item = catalog.find((c) => c.id === request.itemId);
    if (!item) return finish("unknown_item");
    amount = item.cost;
  } else {
    if (!request.poolId?.trim()) return finish("invalid_request");
    if (typeof request.amount !== "number" || request.amount <= 0) return finish("invalid_request");
    amount = request.amount;
  }

  if (budget <= 0) return finish("budget_exhausted");
  if (amount > seedBalance(existing)) return finish("insufficient_balance");

  const event: SeedWalletEvent = {
    id: request.id,
    kind: DONATION_KIND[request.channel],
    amount,
    itemId: request.channel === "person" ? request.itemId : undefined,
    recipientId: request.channel === "person" ? request.recipientId : undefined,
    poolId: request.channel === "person" ? undefined : request.poolId,
    occurredOn: request.occurredOn,
  };
  return finish("recorded", [...existing, event], event);
}

// ─── Pools coletivos (k-anon no engine, não na UI) ──────────────────────────

export interface SeedPoolDef {
  id: string;
  name: string;
  channel: Exclude<SeedChannel, "person">;
  /** Meta opcional (canal cause: o compromisso CSR declarado pela empresa). */
  target?: number;
}

export interface PoolContribution {
  poolId: string;
  contributorId: string;
  amount: number;
}

export interface SeedPoolAggregate {
  id: string;
  name: string;
  channel: Exclude<SeedChannel, "person">;
  total: number;
  uniqueContributors: number;
  /** False sob k-anon: a UI mostra microcopy de proteção, nunca o número. */
  visible: boolean;
  target: number | null;
  /** 0..100, null sem meta. Clampado — pool acima da meta reporta 100. */
  pctOfTarget: number | null;
}

export function buildSeedPools(
  contributions: readonly PoolContribution[],
  pools: readonly SeedPoolDef[],
  policy: SeedEconomyPolicy,
): SeedPoolAggregate[] {
  return pools.map((pool) => {
    const mine = contributions.filter((c) => c.poolId === pool.id && c.amount > 0);
    const total = mine.reduce((sum, c) => sum + c.amount, 0);
    const uniqueContributors = new Set(mine.map((c) => c.contributorId)).size;
    const target = pool.target ?? null;
    return {
      id: pool.id,
      name: pool.name,
      channel: pool.channel,
      total,
      uniqueContributors,
      visible: uniqueContributors >= policy.kAnonymityMin,
      target,
      pctOfTarget:
        target && target > 0 ? Math.min(100, Math.round((total / target) * 100)) : null,
    };
  });
}
