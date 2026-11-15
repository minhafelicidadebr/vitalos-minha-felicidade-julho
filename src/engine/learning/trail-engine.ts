// Trail Engine — mecânica pura das trilhas educacionais (Aprender → Praticar →
// Aplicar → Registrar → Evoluir).
//
// Princípios herdados do Evidence Registry:
// - todo item de quiz/cenário referencia um study_id do registro congelado
//   (a consistência é verificada por teste, não por fé);
// - errar ensina: a explicação aparece sempre, acerto ou erro;
// - indicadores da fase Evoluir são SEMPRE contagens agregadas — nunca nomes,
//   nunca conteúdo pessoal (o registro de rodada só carrega números).
//
// Engine puro: sem React, sem I/O, sem import de src/domain.

// ─── Quiz de recuperação ─────────────────────────────────────────────────────

export interface QuizOption {
  id: string;
  label: string;
}

export interface QuizItem {
  id: string;
  question: string;
  options: QuizOption[];
  correctOptionId: string;
  /** Aparece sempre — acerto ou erro. */
  explanation: string;
  sourceStudyId: string;
}

export interface QuizItemResult {
  itemId: string;
  answered: boolean;
  correct: boolean;
}

export interface QuizGrade {
  total: number;
  answeredCount: number;
  correctCount: number;
  allAnswered: boolean;
  perItem: QuizItemResult[];
}

export function gradeQuiz(items: readonly Pick<QuizItem, "id" | "correctOptionId">[], answers: Record<string, string>): QuizGrade {
  const perItem = items.map((item) => {
    const answer = answers[item.id];
    return {
      itemId: item.id,
      answered: Boolean(answer),
      correct: answer === item.correctOptionId,
    };
  });
  const answeredCount = perItem.filter((r) => r.answered).length;
  return {
    total: items.length,
    answeredCount,
    correctCount: perItem.filter((r) => r.correct).length,
    allAnswered: answeredCount === items.length && items.length > 0,
    perItem,
  };
}

// ─── Cenário ramificado ──────────────────────────────────────────────────────

export interface ScenarioChoice {
  id: string;
  label: string;
  /** Consequência provável — sempre "provável", nunca "garantida". */
  likelyConsequence: string;
  mechanismNote: string;
  commonMistake: string;
  sourceStudyId: string;
  betterAlternative?: string;
}

export interface BranchingScenario {
  id: string;
  title: string;
  setup: string;
  choices: ScenarioChoice[];
  /** A escolha mais alinhada ao mecanismo — as demais são tentadoras, não ridículas. */
  bestChoiceId: string;
}

export function resolveScenarioChoice(
  scenario: BranchingScenario,
  choiceId: string,
): { choice: ScenarioChoice; isBest: boolean } | null {
  const choice = scenario.choices.find((c) => c.id === choiceId);
  if (!choice) return null;
  return { choice, isBest: choice.id === scenario.bestChoiceId };
}

// ─── Progresso da trilha ─────────────────────────────────────────────────────

export interface TrailStepState {
  id: string;
  done: boolean;
}

export function computeTrailProgress(steps: readonly TrailStepState[]): {
  done: number;
  total: number;
  pct: number;
} {
  const done = steps.filter((s) => s.done).length;
  return {
    done,
    total: steps.length,
    pct: steps.length === 0 ? 0 : Math.round((done / steps.length) * 100),
  };
}

// ─── Registro de rodada + indicadores Evoluir (só agregados) ─────────────────

/** Registro operacional de uma rodada da missão — números e texto operacional
 * curto. NUNCA nomes, NUNCA conteúdo pessoal (mesma disciplina do ActionLog). */
export interface MissionCheckin {
  id: string;
  occurredOn: string;
  participants: number;
  risksRaised: number;
  decisionsMade: number;
  /** Dificuldade operacional observada (opcional) — vigia de efeitos adversos. */
  difficulty?: string;
}

export interface EvolveIndicators {
  roundsHeld: number;
  participantsTotal: number;
  avgParticipants: number;
  risksRaisedTotal: number;
  decisionsTotal: number;
  /** Rodadas com dificuldade registrada — alimenta a decisão continuar/ajustar. */
  roundsWithDifficulty: number;
}

export function computeEvolveIndicators(checkins: readonly MissionCheckin[]): EvolveIndicators {
  const roundsHeld = checkins.length;
  const participantsTotal = checkins.reduce((sum, c) => sum + Math.max(0, c.participants), 0);
  return {
    roundsHeld,
    participantsTotal,
    avgParticipants: roundsHeld === 0 ? 0 : Math.round((participantsTotal / roundsHeld) * 10) / 10,
    risksRaisedTotal: checkins.reduce((sum, c) => sum + Math.max(0, c.risksRaised), 0),
    decisionsTotal: checkins.reduce((sum, c) => sum + Math.max(0, c.decisionsMade), 0),
    roundsWithDifficulty: checkins.filter((c) => Boolean(c.difficulty?.trim())).length,
  };
}

export type CycleDecision = "continuar" | "ajustar" | "interromper";

/** Sugestão derivada dos indicadores — a decisão final é humana, nunca automática. */
export function suggestCycleDecision(indicators: EvolveIndicators): {
  suggestion: CycleDecision;
  rationale: string;
} {
  if (indicators.roundsHeld === 0) {
    return {
      suggestion: "ajustar",
      rationale: "Nenhuma rodada registrada — revisar o desenho ou o momento antes de continuar.",
    };
  }
  if (indicators.roundsWithDifficulty * 2 > indicators.roundsHeld) {
    return {
      suggestion: "ajustar",
      rationale:
        "Mais da metade das rodadas registrou dificuldade — ajustar o formato antes de expandir.",
    };
  }
  return {
    suggestion: "continuar",
    rationale:
      "Rodadas acontecendo e riscos sendo levantados cedo — manter o ritual e reavaliar no fim do ciclo.",
  };
}
