import { describe, expect, test } from "bun:test";
import {
  computeEvolveIndicators,
  computeTrailProgress,
  gradeQuiz,
  resolveScenarioChoice,
  suggestCycleDecision,
  type BranchingScenario,
  type MissionCheckin,
  type QuizItem,
} from "./trail-engine";

const ITEMS: QuizItem[] = [
  {
    id: "q1",
    question: "Pergunta 1",
    options: [
      { id: "a", label: "A" },
      { id: "b", label: "B" },
    ],
    correctOptionId: "a",
    explanation: "Porque A.",
    sourceStudyId: "TRU-006",
  },
  {
    id: "q2",
    question: "Pergunta 2",
    options: [
      { id: "a", label: "A" },
      { id: "b", label: "B" },
    ],
    correctOptionId: "b",
    explanation: "Porque B.",
    sourceStudyId: "LDR-007",
  },
];

describe("gradeQuiz", () => {
  test("conta acertos e respondidas separadamente", () => {
    const grade = gradeQuiz(ITEMS, { q1: "a" });
    expect(grade.correctCount).toBe(1);
    expect(grade.answeredCount).toBe(1);
    expect(grade.allAnswered).toBe(false);
  });

  test("tudo respondido e correto", () => {
    const grade = gradeQuiz(ITEMS, { q1: "a", q2: "b" });
    expect(grade.correctCount).toBe(2);
    expect(grade.allAnswered).toBe(true);
  });

  test("quiz vazio nunca conta como completo", () => {
    expect(gradeQuiz([], {}).allAnswered).toBe(false);
  });
});

describe("resolveScenarioChoice", () => {
  const scenario: BranchingScenario = {
    id: "s1",
    title: "Cenário",
    setup: "Situação",
    bestChoiceId: "c2",
    choices: [
      {
        id: "c1",
        label: "Punir",
        likelyConsequence: "Silêncio",
        mechanismNote: "Medo sobe",
        commonMistake: "Atacar o mensageiro",
        sourceStudyId: "TRU-006",
        betterAlternative: "Agradecer o aviso",
      },
      {
        id: "c2",
        label: "Conter e aprender",
        likelyConsequence: "Aviso cedo vale a pena",
        mechanismNote: "Medo desce",
        commonMistake: "—",
        sourceStudyId: "TRU-006",
      },
    ],
  };

  test("resolve escolha e marca a melhor", () => {
    expect(resolveScenarioChoice(scenario, "c2")?.isBest).toBe(true);
    expect(resolveScenarioChoice(scenario, "c1")?.isBest).toBe(false);
  });

  test("escolha inexistente → null", () => {
    expect(resolveScenarioChoice(scenario, "zzz")).toBeNull();
  });
});

describe("computeTrailProgress", () => {
  test("progresso arredondado", () => {
    expect(
      computeTrailProgress([
        { id: "a", done: true },
        { id: "b", done: false },
        { id: "c", done: false },
      ]),
    ).toEqual({ done: 1, total: 3, pct: 33 });
  });
});

describe("computeEvolveIndicators (só agregados, nunca nomes)", () => {
  const checkins: MissionCheckin[] = [
    { id: "r1", occurredOn: "2026-07-01", participants: 6, risksRaised: 3, decisionsMade: 1 },
    {
      id: "r2",
      occurredOn: "2026-07-08",
      participants: 5,
      risksRaised: 2,
      decisionsMade: 2,
      difficulty: "pouco tempo",
    },
  ];

  test("agrega contagens e médias", () => {
    const ind = computeEvolveIndicators(checkins);
    expect(ind.roundsHeld).toBe(2);
    expect(ind.participantsTotal).toBe(11);
    expect(ind.avgParticipants).toBe(5.5);
    expect(ind.risksRaisedTotal).toBe(5);
    expect(ind.decisionsTotal).toBe(3);
    expect(ind.roundsWithDifficulty).toBe(1);
  });

  test("números negativos não corrompem o agregado", () => {
    const ind = computeEvolveIndicators([
      { id: "x", occurredOn: "2026-07-01", participants: -3, risksRaised: -1, decisionsMade: 0 },
    ]);
    expect(ind.participantsTotal).toBe(0);
    expect(ind.risksRaisedTotal).toBe(0);
  });
});

describe("suggestCycleDecision (sugere, nunca decide)", () => {
  test("sem rodadas → ajustar", () => {
    expect(suggestCycleDecision(computeEvolveIndicators([])).suggestion).toBe("ajustar");
  });

  test("maioria das rodadas com dificuldade → ajustar", () => {
    const ind = computeEvolveIndicators([
      { id: "1", occurredOn: "d", participants: 4, risksRaised: 1, decisionsMade: 0, difficulty: "x" },
      { id: "2", occurredOn: "d", participants: 4, risksRaised: 1, decisionsMade: 0, difficulty: "y" },
      { id: "3", occurredOn: "d", participants: 4, risksRaised: 1, decisionsMade: 0 },
    ]);
    expect(suggestCycleDecision(ind).suggestion).toBe("ajustar");
  });

  test("rodadas saudáveis → continuar", () => {
    const ind = computeEvolveIndicators([
      { id: "1", occurredOn: "d", participants: 5, risksRaised: 2, decisionsMade: 1 },
      { id: "2", occurredOn: "d", participants: 6, risksRaised: 1, decisionsMade: 1 },
    ]);
    expect(suggestCycleDecision(ind).suggestion).toBe("continuar");
  });
});
