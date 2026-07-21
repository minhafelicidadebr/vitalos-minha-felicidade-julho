import { describe, expect, test } from "bun:test";
import {
  QUIZ_DIFFICULTY_ORDER,
  answerItem,
  selectNextItem,
  startAdaptiveQuiz,
  summarizeAdaptiveSession,
  undoLastAnswer,
  validateAdaptiveBank,
  type AdaptiveQuizBank,
  type AdaptiveQuizItem,
} from "./adaptive-quiz-engine";

function item(
  id: string,
  difficulty: AdaptiveQuizItem["difficulty"],
  overrides: Partial<AdaptiveQuizItem> = {},
): AdaptiveQuizItem {
  return {
    id,
    question: `Pergunta ${id}`,
    options: [
      { id: "a", label: "A" },
      { id: "b", label: "B" },
    ],
    correctOptionId: "a",
    explanation: `Porque A (${id}).`,
    sourceStudyId: "TRU-006",
    difficulty,
    ...overrides,
  };
}

const BANK: AdaptiveQuizBank = {
  id: "banco-teste",
  version: "1.0.0",
  items: [
    item("f1", "fundamento"),
    item("f2", "fundamento"),
    item("a1", "aplicacao"),
    item("a2", "aplicacao"),
    item("t1", "transferencia"),
  ],
};

describe("validateAdaptiveBank", () => {
  test("banco válido não gera erros", () => {
    expect(validateAdaptiveBank(BANK)).toEqual([]);
  });

  test("acusa id/versão vazios e banco sem itens", () => {
    const errors = validateAdaptiveBank({ id: " ", version: "", items: [] });
    expect(errors).toContain("banco sem id");
    expect(errors).toContain("banco sem versão");
    expect(errors).toContain("banco sem itens");
  });

  test("acusa item duplicado, sem explicação, correctOptionId órfão e sem estudo", () => {
    const errors = validateAdaptiveBank({
      id: "b",
      version: "1",
      items: [
        item("x", "fundamento", { explanation: "  " }),
        item("x", "fundamento", { correctOptionId: "zzz" }),
        item("y", "fundamento", { sourceStudyId: "" }),
      ],
    });
    expect(errors).toContain("item duplicado: x");
    expect(errors).toContain("item sem explicação (errar ensina): x");
    expect(errors).toContain("correctOptionId fora das opções: x");
    expect(errors).toContain("item sem sourceStudyId: y");
  });
});

describe("startAdaptiveQuiz", () => {
  test("começa no fundamento com banco versionado rastreável", () => {
    const state = startAdaptiveQuiz(BANK);
    expect(state.currentLevel).toBe("fundamento");
    expect(state.bankId).toBe("banco-teste");
    expect(state.bankVersion).toBe("1.0.0");
    expect(state.history).toEqual([]);
  });
});

describe("answerItem — transição por desempenho na própria sessão", () => {
  test("acerto sobe um nível; erro desce; sempre com explicação", () => {
    let state = startAdaptiveQuiz(BANK);
    const up = answerItem(BANK, state, "f1", "a");
    expect(up).not.toBeNull();
    expect(up!.correct).toBe(true);
    expect(up!.explanation).toContain("Porque A");
    expect(up!.state.currentLevel).toBe("aplicacao");

    const down = answerItem(BANK, up!.state, "a1", "b");
    expect(down!.correct).toBe(false);
    expect(down!.explanation).toContain("Porque A");
    expect(down!.state.currentLevel).toBe("fundamento");
  });

  test("nível tem piso e teto (clamp nos extremos)", () => {
    let state = startAdaptiveQuiz(BANK);
    // Erro no piso: continua fundamento.
    state = answerItem(BANK, state, "f1", "b")!.state;
    expect(state.currentLevel).toBe("fundamento");
    // Dois acertos: chega em transferencia.
    state = answerItem(BANK, state, "f2", "a")!.state;
    state = answerItem(BANK, state, "a1", "a")!.state;
    expect(state.currentLevel).toBe("transferencia");
    // Acerto no teto: continua transferencia.
    state = answerItem(BANK, state, "t1", "a")!.state;
    expect(state.currentLevel).toBe("transferencia");
  });

  test("item inexistente ou já respondido devolve null (não conta duas vezes)", () => {
    const state = startAdaptiveQuiz(BANK);
    expect(answerItem(BANK, state, "nao-existe", "a")).toBeNull();
    const once = answerItem(BANK, state, "f1", "a")!;
    expect(answerItem(BANK, once.state, "f1", "b")).toBeNull();
  });
});

describe("selectNextItem — determinístico e explicável", () => {
  test("serve o primeiro não respondido do nível vigente, na ordem do banco", () => {
    const state = startAdaptiveQuiz(BANK);
    expect(selectNextItem(BANK, state)?.id).toBe("f1");
  });

  test("nível esgotado: reforço abaixo antes de avanço acima", () => {
    // Sobe até transferencia e esgota o nível — próximo deve vir de aplicacao (abaixo).
    let state = startAdaptiveQuiz(BANK);
    state = answerItem(BANK, state, "f1", "a")!.state; // → aplicacao
    state = answerItem(BANK, state, "a1", "a")!.state; // → transferencia
    state = answerItem(BANK, state, "t1", "a")!.state; // teto, esgotou transferencia
    expect(selectNextItem(BANK, state)?.id).toBe("a2");
  });

  test("fundamento esgotado sem itens abaixo: busca acima", () => {
    let state = startAdaptiveQuiz(BANK);
    state = answerItem(BANK, state, "f1", "b")!.state; // erro, piso
    state = answerItem(BANK, state, "f2", "b")!.state; // erro, piso — fundamento esgotado
    expect(selectNextItem(BANK, state)?.id).toBe("a1");
  });

  test("banco todo respondido devolve null (sessão completa)", () => {
    let state = startAdaptiveQuiz(BANK);
    for (const i of BANK.items) {
      state = answerItem(BANK, state, i.id, "a")!.state;
    }
    expect(selectNextItem(BANK, state)).toBeNull();
  });
});

describe("undoLastAnswer — tentativa reversível", () => {
  test("desfaz resposta e restaura o nível vigente daquela tentativa", () => {
    let state = startAdaptiveQuiz(BANK);
    state = answerItem(BANK, state, "f1", "a")!.state; // → aplicacao
    const afterTwo = answerItem(BANK, state, "a1", "b")!.state; // → fundamento
    const undone = undoLastAnswer(afterTwo);
    expect(undone.currentLevel).toBe("aplicacao");
    expect(undone.history.map((r) => r.itemId)).toEqual(["f1"]);
    // O item desfeito volta a ser selecionável.
    expect(selectNextItem(BANK, undone)?.id).toBe("a1");
  });

  test("sem histórico devolve o estado como está", () => {
    const state = startAdaptiveQuiz(BANK);
    expect(undoLastAnswer(state)).toBe(state);
  });
});

describe("summarizeAdaptiveSession — síntese pedagógica, nunca score de RH", () => {
  test("conta por nível, lista itens a revisar e marca completude", () => {
    let state = startAdaptiveQuiz(BANK);
    state = answerItem(BANK, state, "f1", "a")!.state;
    state = answerItem(BANK, state, "a1", "b")!.state;
    const summary = summarizeAdaptiveSession(BANK, state);

    expect(summary.answeredCount).toBe(2);
    expect(summary.correctCount).toBe(1);
    expect(summary.totalInBank).toBe(5);
    expect(summary.complete).toBe(false);
    expect(summary.reviewItemIds).toEqual(["a1"]);
    expect(summary.bankVersion).toBe("1.0.0");

    const fundamento = summary.perLevel.find((l) => l.level === "fundamento")!;
    expect(fundamento).toEqual({ level: "fundamento", answered: 1, correct: 1, totalInBank: 2 });
  });

  test("a síntese não expõe nota única 0-100 (invariante sem-score-para-empregador)", () => {
    const summary = summarizeAdaptiveSession(BANK, startAdaptiveQuiz(BANK));
    expect("score" in summary).toBe(false);
    expect("grade" in summary).toBe(false);
    expect("pct" in summary).toBe(false);
  });

  test("sessão vazia: zero em tudo, sem NaN", () => {
    const summary = summarizeAdaptiveSession(BANK, startAdaptiveQuiz(BANK));
    expect(summary.answeredCount).toBe(0);
    expect(summary.correctCount).toBe(0);
    expect(summary.complete).toBe(false);
    expect(summary.perLevel.every((l) => Number.isFinite(l.answered))).toBe(true);
  });

  test("os três níveis canônicos aparecem na síntese na ordem pedagógica", () => {
    const summary = summarizeAdaptiveSession(BANK, startAdaptiveQuiz(BANK));
    expect(summary.perLevel.map((l) => l.level)).toEqual([...QUIZ_DIFFICULTY_ORDER]);
  });
});
