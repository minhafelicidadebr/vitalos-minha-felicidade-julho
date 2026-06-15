// Season engine — puro e determinístico. Traduz um plano anual (4 temporadas ×
// N semanas, cada uma com o ciclo M.E.T.E.) e a "semana de programa" corrente
// num estado operacional completo: onde a organização está, o que vem a seguir
// e quais atividades cabem a cada papel. Nunca importa de domain/.
//
// Modelo: o ano é uma trilha contígua de `seasons.length × weeksPerSeason`
// semanas. A semana de programa (1-based) é a única fonte de verdade do "hoje".

export type MetePhaseId = "mensurar" | "educar" | "transformar" | "evoluir";
export type PhaseStatus = "concluida" | "atual" | "futura";
export type SeasonStatus = "concluida" | "atual" | "futura";

// ─── Definição do plano (vem do mock/domínio, nunca hardcoded no engine) ──────

export interface MetePhaseDef {
  id: MetePhaseId;
  label: string;
  weekStart: number; // 1-based, inclusivo, dentro da temporada
  weekEnd: number; // inclusivo
  objective: string;
  instruments: string[];
  deliverable: string;
}

export interface SeasonActivity {
  week: number; // semana dentro da temporada (1-based)
  title: string;
  owner: string; // papel responsável (label)
  phaseId: MetePhaseId;
}

export interface SeasonDef {
  id: string;
  index: number; // ordem da temporada no ano (1..N)
  name: string;
  cycleId: string;
  layer: number; // camada de medição 1..4
  layerLabel: string;
  question: string; // a pergunta-guia da temporada
  primaryInstrument: string;
  color: string;
  startLabel: string; // ex.: "Jan–Mar"
  phases: MetePhaseDef[];
  activities: SeasonActivity[];
}

export interface AnnualPlan {
  year: number;
  weeksPerSeason: number;
  seasons: SeasonDef[];
}

// ─── Saídas computadas ────────────────────────────────────────────────────────

export interface ComputedPhase extends MetePhaseDef {
  status: PhaseStatus;
  progressPct: number; // progresso dentro da fase
}

export interface ComputedSeason {
  id: string;
  index: number;
  name: string;
  cycleId: string;
  layer: number;
  layerLabel: string;
  question: string;
  primaryInstrument: string;
  color: string;
  startLabel: string;
  status: SeasonStatus;
  progressPct: number; // progresso dentro da temporada
  phases: ComputedPhase[];
}

export interface NextMilestone {
  kind: "fase" | "temporada";
  label: string;
  detail: string;
  weeksAway: number;
}

export interface SeasonPosition {
  seasonIndex: number;
  weekInSeason: number;
  phaseId: MetePhaseId;
}

export interface SeasonOverview {
  year: number;
  programWeek: number;
  totalWeeks: number;
  yearProgressPct: number;
  position: SeasonPosition;
  currentSeason: ComputedSeason;
  currentPhase: ComputedPhase;
  seasons: ComputedSeason[];
  currentActivities: SeasonActivity[];
  nextMilestone: NextMilestone | null;
}

// ─── Aritmética da trilha ─────────────────────────────────────────────────────

export function totalProgramWeeks(plan: AnnualPlan): number {
  return plan.seasons.length * plan.weeksPerSeason;
}

export function clampProgramWeek(plan: AnnualPlan, week: number): number {
  const total = totalProgramWeeks(plan);
  if (week < 1) return 1;
  if (week > total) return total;
  return Math.floor(week);
}

/** Converte (temporada, semana-na-temporada) → semana de programa global. */
export function toProgramWeek(plan: AnnualPlan, seasonIndex: number, weekInSeason: number): number {
  return (seasonIndex - 1) * plan.weeksPerSeason + weekInSeason;
}

function phaseForWeek(season: SeasonDef, weekInSeason: number): MetePhaseDef {
  const found = season.phases.find((p) => weekInSeason >= p.weekStart && weekInSeason <= p.weekEnd);
  return found ?? season.phases[season.phases.length - 1]!;
}

export function resolvePosition(plan: AnnualPlan, programWeek: number): SeasonPosition {
  const wpps = plan.weeksPerSeason;
  const week = clampProgramWeek(plan, programWeek);
  const seasonIndex = Math.floor((week - 1) / wpps) + 1;
  const weekInSeason = ((week - 1) % wpps) + 1;
  const season =
    plan.seasons.find((s) => s.index === seasonIndex) ?? plan.seasons[seasonIndex - 1]!;
  return { seasonIndex, weekInSeason, phaseId: phaseForWeek(season, weekInSeason).id };
}

// ─── Status e progresso ───────────────────────────────────────────────────────

function phaseStatusFor(
  phase: MetePhaseDef,
  seasonStatus: SeasonStatus,
  weekInSeason: number,
): PhaseStatus {
  if (seasonStatus === "concluida") return "concluida";
  if (seasonStatus === "futura") return "futura";
  if (weekInSeason > phase.weekEnd) return "concluida";
  if (weekInSeason < phase.weekStart) return "futura";
  return "atual";
}

function phaseProgressFor(phase: MetePhaseDef, status: PhaseStatus, weekInSeason: number): number {
  if (status === "concluida") return 100;
  if (status === "futura") return 0;
  const span = phase.weekEnd - phase.weekStart + 1;
  const done = weekInSeason - phase.weekStart + 1;
  return Math.round((Math.max(0, Math.min(done, span)) / span) * 100);
}

function computeSeason(
  season: SeasonDef,
  activeIndex: number,
  weekInSeason: number,
  wpps: number,
): ComputedSeason {
  const status: SeasonStatus =
    season.index < activeIndex ? "concluida" : season.index > activeIndex ? "futura" : "atual";

  const progressPct =
    status === "concluida"
      ? 100
      : status === "futura"
        ? 0
        : Math.round((weekInSeason / wpps) * 100);

  const phases: ComputedPhase[] = season.phases.map((p) => {
    const st = phaseStatusFor(p, status, weekInSeason);
    return { ...p, status: st, progressPct: phaseProgressFor(p, st, weekInSeason) };
  });

  return {
    id: season.id,
    index: season.index,
    name: season.name,
    cycleId: season.cycleId,
    layer: season.layer,
    layerLabel: season.layerLabel,
    question: season.question,
    primaryInstrument: season.primaryInstrument,
    color: season.color,
    startLabel: season.startLabel,
    status,
    progressPct,
    phases,
  };
}

function computeNextMilestone(
  plan: AnnualPlan,
  position: SeasonPosition,
  currentSeason: SeasonDef,
): NextMilestone | null {
  const { weekInSeason, seasonIndex } = position;

  // Próxima fase dentro da temporada atual?
  const nextPhase = currentSeason.phases.find((p) => p.weekStart > weekInSeason);
  if (nextPhase) {
    return {
      kind: "fase",
      label: nextPhase.label,
      detail: nextPhase.objective,
      weeksAway: nextPhase.weekStart - weekInSeason,
    };
  }

  // Senão, próxima temporada.
  const next = plan.seasons.find((s) => s.index === seasonIndex + 1);
  if (next) {
    return {
      kind: "temporada",
      label: next.name,
      detail: `Inicia a fase Mensurar com ${next.primaryInstrument}`,
      weeksAway: plan.weeksPerSeason - weekInSeason + 1,
    };
  }

  return null; // fim do programa anual
}

// ─── Orquestrador ─────────────────────────────────────────────────────────────

export function computeSeasonOverview(plan: AnnualPlan, programWeek: number): SeasonOverview {
  const week = clampProgramWeek(plan, programWeek);
  const position = resolvePosition(plan, week);
  const rawCurrent =
    plan.seasons.find((s) => s.index === position.seasonIndex) ??
    plan.seasons[position.seasonIndex - 1]!;

  const seasons = plan.seasons.map((s) =>
    computeSeason(s, position.seasonIndex, position.weekInSeason, plan.weeksPerSeason),
  );
  const currentSeason = seasons.find((s) => s.index === position.seasonIndex)!;
  const currentPhase = currentSeason.phases.find((p) => p.id === position.phaseId)!;

  let currentActivities = rawCurrent.activities.filter((a) => a.week === position.weekInSeason);
  if (currentActivities.length === 0) {
    currentActivities = rawCurrent.activities.filter((a) => a.phaseId === position.phaseId);
  }

  return {
    year: plan.year,
    programWeek: week,
    totalWeeks: totalProgramWeeks(plan),
    yearProgressPct: Math.round((week / totalProgramWeeks(plan)) * 100),
    position,
    currentSeason,
    currentPhase,
    seasons,
    currentActivities,
    nextMilestone: computeNextMilestone(plan, position, rawCurrent),
  };
}
