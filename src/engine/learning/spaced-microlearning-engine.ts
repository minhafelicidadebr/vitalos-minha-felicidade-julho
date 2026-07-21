// Spaced Microlearning Engine — orquestração temporal de unidades curtas
// (LD-013, LDX-2 Fatia D). Compõe o sm2-engine sobre uma trilha de
// micro-unidades que voltam ao longo dos DIAS (não só dentro de uma sessão,
// como o flashcard-session). É a "orquestração temporal" que faltava ao LD-013.
//
// Doutrina (LD-013 + invariantes §9):
// - conteúdo VERSIONADO (planVersion viaja no estado; mudou o conteúdo, bump);
// - agenda EXPLICÁVEL (toda unidade tem data de retorno legível);
// - frequência AJUSTÁVEL (cadência = piso de dias entre retornos, respeita o
//   ritmo da pessoa — nunca acelera além do escolhido);
// - SEM streak coercitivo: não há contador de "dias seguidos" que pune quem
//   falha; o resumo conta estados de agendamento, não assiduidade;
// - estado é do próprio aprendiz (persistência privada, opt-in — no store);
// - nunca alimenta desempenho/promoção (herdado do sm2-engine).
//
// Datas: strings YYYY-MM-DD (date-only), comparáveis e serializáveis sem drift
// de fuso. Engine puro: sem React, sem I/O, sem import de src/domain.

import {
  initialSchedule,
  reviewCard,
  SM2_MATURE_INTERVAL_DAYS,
  type CardSchedule,
  type RecallQuality,
} from "./sm2-engine";

// ─── Cadência (frequência ajustável) ─────────────────────────────────────────

export type MicroCadence = "diaria" | "alternada" | "semanal";

export interface CadenceSpec {
  id: MicroCadence;
  label: string;
  /** Piso de dias entre retornos de uma mesma unidade. */
  floorDays: number;
}

export const MICRO_CADENCES: readonly CadenceSpec[] = [
  { id: "diaria", label: "Diária", floorDays: 1 },
  { id: "alternada", label: "Dia sim, dia não", floorDays: 2 },
  { id: "semanal", label: "Semanal", floorDays: 7 },
];

export function cadenceFloor(cadence: MicroCadence): number {
  return MICRO_CADENCES.find((c) => c.id === cadence)?.floorDays ?? 1;
}

// ─── Conteúdo (versionado) ───────────────────────────────────────────────────

export interface MicroUnit {
  id: string;
  title: string;
  /** Ideia curta a reter (o "micro" do microlearning). */
  prompt: string;
  /** Active recall: pergunta que o aprendiz tenta responder de memória. */
  recallQuestion: string;
  /** Resposta de referência, revelada após a tentativa. */
  recallAnswer: string;
  sourceStudyId: string;
}

// ─── Estado do plano ─────────────────────────────────────────────────────────

export interface UnitProgress {
  unitId: string;
  schedule: CardSchedule;
  /** Data em que a unidade volta a ficar disponível (YYYY-MM-DD). */
  dueOn: string;
  /** Última revisão (YYYY-MM-DD) ou null se nunca revisada. */
  lastReviewedOn: string | null;
}

export interface MicroPlanState {
  planVersion: string;
  cadence: MicroCadence;
  progress: Record<string, UnitProgress>;
}

// ─── Utilitários de data (date-only, sem drift de fuso) ──────────────────────

/** YYYY-MM-DD de uma Date, em UTC (determinístico). */
export function toDayString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Soma dias a uma data YYYY-MM-DD, devolvendo YYYY-MM-DD (UTC, sem DST). */
export function addDays(day: string, days: number): string {
  const base = new Date(`${day}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return toDayString(base);
}

/** Uma unidade está vencida quando sua data de retorno já chegou (≤ hoje). */
export function isUnitDue(progress: UnitProgress, today: string): boolean {
  return progress.dueOn <= today;
}

// ─── Ciclo de vida do plano ──────────────────────────────────────────────────

/** Cria um plano novo: toda unidade nasce vencida em `today` (a pessoa começa
 * podendo revisar tudo). O conteúdo carimba a versão para rastreabilidade. */
export function initMicroPlan(
  units: readonly MicroUnit[],
  planVersion: string,
  cadence: MicroCadence,
  today: string,
): MicroPlanState {
  const progress: Record<string, UnitProgress> = {};
  for (const unit of units) {
    progress[unit.id] = {
      unitId: unit.id,
      schedule: initialSchedule(),
      dueOn: today,
      lastReviewedOn: null,
    };
  }
  return { planVersion, cadence, progress };
}

/** Reconcilia um plano persistido com o conteúdo atual: adiciona unidades novas
 * (vencidas hoje) e remove progresso de unidades que saíram do conteúdo. Mantém
 * o progresso das unidades que continuam existindo. Use ao hidratar. */
export function reconcilePlan(
  plan: MicroPlanState,
  units: readonly MicroUnit[],
  planVersion: string,
  today: string,
): MicroPlanState {
  const validIds = new Set(units.map((u) => u.id));
  const progress: Record<string, UnitProgress> = {};
  for (const unit of units) {
    progress[unit.id] =
      plan.progress[unit.id] ?? {
        unitId: unit.id,
        schedule: initialSchedule(),
        dueOn: today,
        lastReviewedOn: null,
      };
  }
  // (unidades fora de validIds são descartadas por construção)
  void validIds;
  return { planVersion, cadence: plan.cadence, progress };
}

/** Ajusta a cadência. Vale para os PRÓXIMOS retornos (não reescreve o passado —
 * mantém a agenda explicável e previsível). */
export function setCadence(plan: MicroPlanState, cadence: MicroCadence): MicroPlanState {
  return { ...plan, cadence };
}

/** Registra uma revisão de unidade e reprograma seu retorno. O intervalo do
 * SM-2 é elevado ao PISO da cadência escolhida — a frequência nunca fica acima
 * do que a pessoa pediu. Unidade inexistente é no-op. */
export function reviewUnit(
  plan: MicroPlanState,
  unitId: string,
  quality: RecallQuality,
  reviewedOn: string,
): MicroPlanState {
  const current = plan.progress[unitId];
  if (!current) return plan;

  const nextSchedule = reviewCard(current.schedule, quality);
  const effectiveInterval = Math.max(nextSchedule.intervalDays, cadenceFloor(plan.cadence));

  return {
    ...plan,
    progress: {
      ...plan.progress,
      [unitId]: {
        unitId,
        schedule: { ...nextSchedule, intervalDays: effectiveInterval },
        dueOn: addDays(reviewedOn, effectiveInterval),
        lastReviewedOn: reviewedOn,
      },
    },
  };
}

// ─── Leituras (agenda explicável, sem assiduidade) ───────────────────────────

/** Unidades vencidas em `today`, mais atrasada primeiro — a fila de hoje. */
export function dueUnitIds(plan: MicroPlanState, today: string): string[] {
  return Object.values(plan.progress)
    .filter((p) => isUnitDue(p, today))
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn))
    .map((p) => p.unitId);
}

/** Próxima data de retorno entre as unidades NÃO vencidas, ou null. */
export function nextDueOn(plan: MicroPlanState, today: string): string | null {
  const upcoming = Object.values(plan.progress)
    .filter((p) => !isUnitDue(p, today))
    .map((p) => p.dueOn)
    .sort((a, b) => a.localeCompare(b));
  return upcoming[0] ?? null;
}

export interface MicroPlanSummary {
  total: number;
  /** A revisar hoje. */
  due: number;
  /** Agendadas para depois. */
  upcoming: number;
  /** Consolidadas: intervalo ≥ maturidade do SM-2. Marcador de agenda, não de mérito. */
  consolidated: number;
  /** Nunca revisadas ainda. */
  fresh: number;
  /** Próximo retorno (YYYY-MM-DD) ou null se tudo vencido/vazio. */
  nextDueOn: string | null;
}

/** Resumo honesto do plano: conta estados de AGENDAMENTO. Deliberadamente sem
 * "dias seguidos"/streak — nada aqui pune quem revisou menos. */
export function summarizeMicroPlan(plan: MicroPlanState, today: string): MicroPlanSummary {
  const all = Object.values(plan.progress);
  let due = 0;
  let consolidated = 0;
  let fresh = 0;
  for (const p of all) {
    if (isUnitDue(p, today)) due += 1;
    if (p.lastReviewedOn === null) fresh += 1;
    if (p.schedule.intervalDays >= SM2_MATURE_INTERVAL_DAYS) consolidated += 1;
  }
  return {
    total: all.length,
    due,
    upcoming: all.length - due,
    consolidated,
    fresh,
    nextDueOn: nextDueOn(plan, today),
  };
}
