// Action-plan engine — puro. Traduz uma fila de prioridades (priority-engine) num
// plano de execução trimestral: cada intervenção ganha semana de início/fim,
// responsável (embaixadoria), milestone de acompanhamento e status.
//
// COMPOSIÇÃO: reusa PriorityItem (priority-engine) + SeasonDef (season-engine).
// NÃO recalcula impacto — PriorityItem já carrega expectedIvoLift validado.
// O scheduling é puramente operacional: distribui ações ao longo das 13 semanas
// respeitando esforço e evitando sobrecarga de uma mesma embaixadoria.

import type { PriorityItem } from "../priority/priority-engine";

// ─── Entradas ─────────────────────────────────────────────────────────────────

export interface ActionPlanSeason {
  name: string;
  color: string;
  totalWeeks: number; // normalmente 13
  currentWeek: number; // semana atual dentro da temporada (1-based)
  phaseLabel: string; // ex.: "Transformar"
}

export interface AmbRef {
  id: string | null;
  name: string | null;
  emoji: string | null;
}

export interface ActionPlanLeverMeta {
  leverId: string;
  ambRef: AmbRef;
  lensId: string | null;
  lensLabel: string | null;
  lensColor: string | null;
  esgCodes: string[];
}

export interface ActionPlanInput {
  season: ActionPlanSeason;
  items: PriorityItem[]; // ranqueados por expectedIvoLift desc (priority-engine output)
  leverMeta: ActionPlanLeverMeta[]; // mapeamento leverId → embaixadoria + lente + esg
  maxActions?: number; // limite de ações no plano (default 8)
}

// ─── Saídas ───────────────────────────────────────────────────────────────────

export type ActionStatus = "futuro" | "em_andamento" | "concluido";

export interface ActionItem {
  rank: number;
  leverId: string;
  leverLabel: string;
  description: string;
  effort: "baixo" | "medio" | "alto";
  expectedIvoLift: number;
  isQuickWin: boolean;
  amb: AmbRef;
  lensId: string | null;
  lensLabel: string | null;
  lensColor: string | null;
  esgCodes: string[];
  startWeek: number; // 1-based dentro da temporada
  endWeek: number;
  milestoneWeek: number; // check-in de acompanhamento
  status: ActionStatus;
  weeksBudget: number; // duração em semanas
}

export interface QuarterlyPlan {
  season: ActionPlanSeason;
  actions: ActionItem[];
  quickWinCount: number;
  scheduledIvoLift: number; // soma dos lifts das ações no plano
  hiddenActionsCount: number; // ações excluídas por maxActions
  disclaimer: string;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const EFFORT_WEEKS: Record<"baixo" | "medio" | "alto", number> = {
  baixo: 4,
  medio: 7,
  alto: 13,
};

const STATUS_MESSAGES: Record<ActionStatus, string> = {
  futuro: "Para iniciar",
  em_andamento: "Em andamento",
  concluido: "Concluído",
};
export { STATUS_MESSAGES };

// ─── Engine ───────────────────────────────────────────────────────────────────

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function deriveStatus(
  startWeek: number,
  endWeek: number,
  currentWeek: number,
): ActionStatus {
  if (currentWeek > endWeek) return "concluido";
  if (currentWeek >= startWeek) return "em_andamento";
  return "futuro";
}

export function buildQuarterlyPlan(input: ActionPlanInput): QuarterlyPlan {
  const { season, items, leverMeta, maxActions = 8 } = input;
  const metaById = new Map(leverMeta.map((m) => [m.leverId, m]));

  // Cursor de próxima semana disponível por embaixadoria (evita sobreposição total).
  const ambNextWeek = new Map<string, number>();

  const planItems = items.slice(0, maxActions + 10); // buffer para filtrar
  const actions: ActionItem[] = [];

  for (const item of planItems) {
    if (actions.length >= maxActions) break;
    if (item.expectedIvoLift <= 0) continue;

    const meta = metaById.get(item.leverId);
    const amb: AmbRef = meta?.ambRef ?? { id: null, name: null, emoji: null };
    const weeksBudget = EFFORT_WEEKS[item.effort];

    // Início: depois de semanas já ocupadas por esta embaixadoria (se há).
    const ambKey = amb.id ?? `lever-${item.leverId}`;
    const earliestStart = ambNextWeek.get(ambKey) ?? 1;
    const startWeek = clamp(earliestStart, 1, season.totalWeeks);
    const endWeek = clamp(startWeek + weeksBudget - 1, startWeek, season.totalWeeks);
    const milestoneWeek = clamp(Math.round((startWeek + endWeek) / 2), startWeek, endWeek);

    ambNextWeek.set(ambKey, endWeek + 1);

    actions.push({
      rank: item.rank,
      leverId: item.leverId,
      leverLabel: item.label,
      description: item.description,
      effort: item.effort,
      expectedIvoLift: item.expectedIvoLift,
      isQuickWin: item.isQuickWin,
      amb,
      lensId: meta?.lensId ?? null,
      lensLabel: meta?.lensLabel ?? null,
      lensColor: meta?.lensColor ?? null,
      esgCodes: meta?.esgCodes ?? [],
      startWeek,
      endWeek,
      milestoneWeek,
      status: deriveStatus(startWeek, endWeek, season.currentWeek),
      weeksBudget,
    });
  }

  const scheduledIvoLift = actions.reduce((s, a) => s + a.expectedIvoLift, 0);
  const quickWinCount = actions.filter((a) => a.isQuickWin).length;
  const hiddenActionsCount = Math.max(0, items.length - actions.length);

  return {
    season,
    actions,
    quickWinCount,
    scheduledIvoLift: Math.round(scheduledIvoLift * 10) / 10,
    hiddenActionsCount,
    disclaimer:
      "Plano operacional orientativo derivado das prioridades IVO. " +
      "A distribuição temporal é uma sugestão de execução — a equipe adapta ao contexto real. " +
      "O lift esperado é estimativa, não promessa.",
  };
}
