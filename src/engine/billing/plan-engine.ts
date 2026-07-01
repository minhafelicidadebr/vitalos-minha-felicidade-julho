// Motor de planos e limites de uso — setor-agnóstico, sem vocabulário de pack.
// Define os tiers comerciais (pilot/growth/enterprise) e impõe limites de uso
// ANTES de qualquer ação que tenha custo (criar onda, convidar, agregar).
// Puro — sem I/O. A checagem real de uso (contagem no banco) acontece no
// chamador (.server.ts), que injeta os números aqui.

export type PlanId = "pilot" | "growth" | "enterprise";

export interface PlanLimits {
  planId: PlanId;
  label: string;
  maxWavesPerMonth: number; // Infinity = ilimitado
  maxInvitesPerWave: number;
  maxAdminSeats: number;
  allowedInstruments: readonly string[];
  capsuleRetentionMonths: number;
}

export const PLAN_CATALOG: Record<PlanId, PlanLimits> = {
  pilot: {
    planId: "pilot",
    label: "Piloto",
    maxWavesPerMonth: 1,
    maxInvitesPerWave: 50,
    maxAdminSeats: 1,
    allowedInstruments: ["COPSOQ"],
    capsuleRetentionMonths: 3,
  },
  growth: {
    planId: "growth",
    label: "Crescimento",
    maxWavesPerMonth: 4,
    maxInvitesPerWave: 500,
    maxAdminSeats: 5,
    allowedInstruments: ["COPSOQ", "PERMA", "VIA_T"],
    capsuleRetentionMonths: 12,
  },
  enterprise: {
    planId: "enterprise",
    label: "Enterprise",
    maxWavesPerMonth: Infinity,
    maxInvitesPerWave: Infinity,
    maxAdminSeats: Infinity,
    allowedInstruments: ["COPSOQ", "PERMA", "VIA_T"],
    capsuleRetentionMonths: Infinity,
  },
};

export function getPlanLimits(planId: string): PlanLimits {
  return PLAN_CATALOG[planId as PlanId] ?? PLAN_CATALOG.pilot;
}

export type LimitCheckReason =
  | "ok"
  | "wave_quota_exceeded"
  | "invite_quota_exceeded"
  | "seat_quota_exceeded"
  | "instrument_not_allowed"
  | "unknown_plan";

export interface LimitCheckResult {
  allowed: boolean;
  reason: LimitCheckReason;
  limit: number;
  current: number;
}

function check(allowed: boolean, reason: LimitCheckReason, limit: number, current: number): LimitCheckResult {
  return { allowed, reason, limit, current };
}

/** Onda nova: soma à contagem do mês corrente da org. */
export function checkWaveQuota(planId: string, wavesThisMonth: number): LimitCheckResult {
  const plan = getPlanLimits(planId);
  const allowed = wavesThisMonth < plan.maxWavesPerMonth;
  return check(allowed, allowed ? "ok" : "wave_quota_exceeded", plan.maxWavesPerMonth, wavesThisMonth);
}

/** Convites de uma onda específica não podem ultrapassar o teto do plano. */
export function checkInviteQuota(planId: string, requestedInviteCount: number): LimitCheckResult {
  const plan = getPlanLimits(planId);
  const allowed = requestedInviteCount <= plan.maxInvitesPerWave;
  return check(allowed, allowed ? "ok" : "invite_quota_exceeded", plan.maxInvitesPerWave, requestedInviteCount);
}

/** Assentos de administração (perfis com role administrativo) da org. */
export function checkSeatQuota(planId: string, currentAdminSeats: number): LimitCheckResult {
  const plan = getPlanLimits(planId);
  const allowed = currentAdminSeats < plan.maxAdminSeats;
  return check(allowed, allowed ? "ok" : "seat_quota_exceeded", plan.maxAdminSeats, currentAdminSeats);
}

/** Instrumento (COPSOQ/PERMA/VIA_T) precisa estar liberado no plano da org. */
export function checkInstrumentAllowed(planId: string, instrument: string): LimitCheckResult {
  const plan = getPlanLimits(planId);
  const allowed = plan.allowedInstruments.includes(instrument);
  return check(allowed, allowed ? "ok" : "instrument_not_allowed", plan.allowedInstruments.length, 0);
}

const UPGRADE_MESSAGE: Record<Exclude<LimitCheckReason, "ok">, string> = {
  wave_quota_exceeded: "Limite de ondas do mês atingido. Faça upgrade de plano para criar mais ondas.",
  invite_quota_exceeded: "Número de convites excede o limite do plano atual. Reduza a quantidade ou faça upgrade.",
  seat_quota_exceeded: "Limite de administradores do plano atingido. Faça upgrade para adicionar mais pessoas.",
  instrument_not_allowed: "Este instrumento não está disponível no plano atual. Faça upgrade para desbloqueá-lo.",
  unknown_plan: "Plano não reconhecido.",
};

export function describeLimitViolation(reason: LimitCheckReason): string | null {
  if (reason === "ok") return null;
  return UPGRADE_MESSAGE[reason];
}
