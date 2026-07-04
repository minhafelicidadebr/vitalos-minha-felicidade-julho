// Action-plan mock — config de domínio. Compõe priority-engine + season-engine
// para montar o QuarterlyPlan demo. Fonte única: usa os mesmos levers do
// forecast-mock e os mesmos mapeamentos do priority-mock (embaixadorias + lentes).

import { rankPriorities } from "@/engine/priority/priority-engine";
import { buildQuarterlyPlan, type ActionPlanLeverMeta } from "@/engine/action-plan/action-plan-engine";
import { FORECAST_LEVERS, pillarsFromIvo } from "./forecast-mock";
import { ambassadorshipForPillar, lensForPillar, esgUnlockedBy } from "./priority-mock";
import { computeSeasonOverview, clampProgramWeek } from "@/engine/season/season-engine";
import { ANNUAL_PLAN, CURRENT_PROGRAM_WEEK } from "./season-mock";
import { ivoCurrentCycle } from "./ivo-mock";
import { calculateIVO } from "@/engine/index/ivo-engine";
import ivoFramework from "@/domain/packs/enterprise/ivo-framework.json";
import type { ProprietaryIndex } from "@/engine/pack/pack-types";

// ─── Fila de prioridades (reusa o priority-engine) ───────────────────────────

const ivoResult = calculateIVO(ivoCurrentCycle, ivoFramework as unknown as ProprietaryIndex);
const pillars = pillarsFromIvo(ivoResult);

const PRIORITY_RESULT = rankPriorities(pillars, FORECAST_LEVERS, {
  scenario: "medio",
  quickWinCount: 3,
});

// ─── Mapeamento lever → embaixadoria + lente + esg ───────────────────────────
// Cada alavanca endereça um ou mais pilares; usamos o PRIMEIRO pilar visível
// para derivar a embaixadoria e lente representativas.

export const LEVER_META: ActionPlanLeverMeta[] = FORECAST_LEVERS.map((lever) => {
  // Primeiro pilar visível que esta alavanca endereça
  const firstPillarId = lever.targetPillarIds[0] ?? null;
  const ambRef = firstPillarId ? ambassadorshipForPillar(firstPillarId) : null;
  const lensRef = firstPillarId ? lensForPillar(firstPillarId) : null;
  const esgInfo = esgUnlockedBy(lever.targetPillarIds);

  return {
    leverId: lever.id,
    ambRef: ambRef ? { id: ambRef.id, name: ambRef.name, emoji: ambRef.emoji } : { id: null, name: null, emoji: null },
    lensId: lensRef?.id ?? null,
    lensLabel: lensRef?.label ?? null,
    lensColor: lensRef?.color ?? null,
    esgCodes: esgInfo.codes.slice(0, 3), // top 3 por clareza
  };
});

// ─── Temporada atual (fonte única: season-engine) ─────────────────────────────

const week = clampProgramWeek(ANNUAL_PLAN, CURRENT_PROGRAM_WEEK);
const overview = computeSeasonOverview(ANNUAL_PLAN, week);
const cs = overview.currentSeason;

const SEASON_NOW = {
  name: cs.name,
  color: cs.color,
  totalWeeks: ANNUAL_PLAN.weeksPerSeason,
  currentWeek: overview.position.weekInSeason,
  phaseLabel: overview.currentPhase.label,
};

// ─── Plano trimestral ─────────────────────────────────────────────────────────

export const QUARTERLY_PLAN = buildQuarterlyPlan({
  season: SEASON_NOW,
  items: PRIORITY_RESULT.items,
  leverMeta: LEVER_META,
  maxActions: 8,
});

// ─── Plano Vivo (Arco da Prova I-T1) — accountability §13 determinística ─────
// Derivada das ações REAIS do QUARTERLY_PLAN (independe de qual lever ranqueou):
// as 5 primeiras ações vêm completas (dono+prazo+métrica+CMO), a 6ª sem métrica,
// a 7ª sem dono/prazo, a 8ª sem nada — o medidor §13 conta uma história honesta
// (~62%) em vez de nascer perfeito.

import {
  enrichQuarterlyPlan,
  type ActionAccountability,
  type ControlTier,
} from "@/engine/action-plan/plan-enrichment-engine";
import type { ActionLogEvent } from "@/engine/action-plan/action-log-engine";

const OWNERS = [
  { membershipId: "mem-rh-01", displayRole: "Gestora de RH" },
  { membershipId: "mem-lider-02", displayRole: "Líder de Equipe" },
  { membershipId: "mem-sst-03", displayRole: "Profissional SST" },
  { membershipId: "mem-lider-04", displayRole: "Líder de Operações" },
  { membershipId: "mem-rh-05", displayRole: "Analista de RH" },
];

const TIER_CYCLE: ControlTier[] = ["organizacao", "eliminacao", "administrativa", "monitoramento"];

const METRICS = [
  { label: "Horas extras médias/semana", baseline: 6, target: 3, unit: "h" },
  { label: "Cobertura do ritual (semanas ativas)", baseline: 0, target: 4, unit: "sem" },
  { label: "Pausas reais registradas/semana", baseline: 2, target: 8, unit: "pausas" },
  { label: "Reuniões com pauta publicada", baseline: 40, target: 90, unit: "%" },
  { label: "Kudos trocados/semana na equipe", baseline: 3, target: 10, unit: "kudos" },
];

const DUE_DATES = ["2026-08-14", "2026-08-28", "2026-09-11", "2026-09-18", "2026-09-25"];

export const PLAN_ACCOUNTABILITY: ActionAccountability[] = QUARTERLY_PLAN.actions.map(
  (action, i) => {
    const full = i < 5;
    return {
      leverId: action.leverId,
      controlTier: TIER_CYCLE[i % TIER_CYCLE.length]!,
      owner: full || i === 5 ? OWNERS[i % OWNERS.length]! : null,
      dueOn: full || i === 5 ? DUE_DATES[i % DUE_DATES.length]! : null,
      metric: full ? METRICS[i % METRICS.length]! : null,
      cmo: full
        ? {
            context: `No contexto atual do pilar ${action.lensLabel ?? "da equipe"}`,
            mechanism: `a intervenção "${action.leverLabel}" ativa o mecanismo de mudança`,
            outcome: "esperamos mover a métrica declarada até o prazo",
          }
        : null,
    };
  },
);

export const ENRICHED_PLAN = enrichQuarterlyPlan(QUARTERLY_PLAN, PLAN_ACCOUNTABILITY);

// Eventos do Action Log — sequências VÁLIDAS de transição, chaveadas nos levers
// reais do plano. Ação 1: ciclo completo até vigilância (mantida). Ação 2: em
// execução com check-in e evidência. Ação 3: em execução. Demais: planejadas.
function logSeed(): ActionLogEvent[] {
  const [a0, a1, a2] = ENRICHED_PLAN.actions.map((a) => a.leverId);
  const events: ActionLogEvent[] = [];
  if (a0) {
    events.push(
      { id: "log-a0-1", actionKey: a0, kind: "status_change", actorRole: "Gestora de RH", occurredOn: "2026-06-01", toStatus: "em_execucao" },
      { id: "log-a0-2", actionKey: a0, kind: "evidence_recorded", actorRole: "Líder de Equipe", occurredOn: "2026-06-12", evidenceKind: "checklist", evidenceRef: "evr-demo-001" },
      { id: "log-a0-3", actionKey: a0, kind: "status_change", actorRole: "Gestora de RH", occurredOn: "2026-06-20", toStatus: "concluida" },
      { id: "log-a0-4", actionKey: a0, kind: "status_change", actorRole: "Gestora de RH", occurredOn: "2026-06-21", toStatus: "em_vigilancia" },
      { id: "log-a0-5", actionKey: a0, kind: "maintenance_check", actorRole: "Líder de Equipe", occurredOn: "2026-06-30", maintained: true },
    );
  }
  if (a1) {
    events.push(
      { id: "log-a1-1", actionKey: a1, kind: "status_change", actorRole: "Profissional SST", occurredOn: "2026-06-08", toStatus: "em_execucao" },
      { id: "log-a1-2", actionKey: a1, kind: "checkin", actorRole: "Profissional SST", occurredOn: "2026-06-15", note: "Primeira semana do protocolo rodando; adesão inicial boa." },
      { id: "log-a1-3", actionKey: a1, kind: "evidence_recorded", actorRole: "Líder de Equipe", occurredOn: "2026-06-17", evidenceKind: "foto", evidenceRef: "evr-demo-002" },
    );
  }
  if (a2) {
    events.push({ id: "log-a2-1", actionKey: a2, kind: "status_change", actorRole: "Líder de Operações", occurredOn: "2026-06-10", toStatus: "em_execucao" });
  }
  return events;
}

export const ACTION_LOG_SEED: ActionLogEvent[] = logSeed();

// ─── Copy de UI ───────────────────────────────────────────────────────────────

export const ACTION_PLAN_INTRO = {
  eyebrow: "Plano Operacional Trimestral",
  title: "Quem faz o quê — e em qual semana",
  lead:
    "A fila de prioridades vira cronograma. Cada intervenção recebe uma Embaixadoria responsável, " +
    "janela de execução na temporada corrente e um milestone de acompanhamento. " +
    "O plano respeita o esforço de cada protocolo e escalonamento de responsabilidades.",
};

export const WEEK_LABEL = (w: number) => `Semana ${w}`;
