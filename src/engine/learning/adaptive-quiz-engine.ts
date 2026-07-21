// Adaptive Quiz Engine — adaptação por dificuldade PEDAGÓGICA (LD-002, LDX-2).
//
// Contrato canônico (REGISTRO_CANONICO_DINAMICAS_APRENDIZAGEM_V1 §LD-002):
// - adaptação permitida: dificuldade e revisão pedagógica — NUNCA perfil
//   psicológico nem risco individual;
// - banco de itens versionado (bankId + version viajam no estado da sessão);
// - nível derivado do desempenho na própria trilha (nada externo entra);
// - explicação para toda resposta — acerto ou erro (herdado de QuizItem);
// - tentativa reversível (undo restaura o estado anterior por completo);
// - persistência SESSION_ONLY: este engine não grava nada; o estado vive na
//   sessão do próprio usuário e NUNCA vira score para empregador — a síntese
//   é pedagógica (itens a revisar), não avaliativa.
//
// Engine puro: sem React, sem I/O, sem import de src/domain.

import type { QuizItem } from "./trail-engine";

// ─── Níveis pedagógicos ──────────────────────────────────────────────────────

/** Três níveis de dificuldade PEDAGÓGICA (não psicológica): entender o
 * mecanismo → aplicar no caso típico → transferir para contexto novo. */
export type QuizDifficulty = "fundamento" | "aplicacao" | "transferencia";

export const QUIZ_DIFFICULTY_ORDER: readonly QuizDifficulty[] = [
  "fundamento",
  "aplicacao",
  "transferencia",
];

export interface AdaptiveQuizItem extends QuizItem {
  difficulty: QuizDifficulty;
}

/** Banco versionado — a versão viaja no estado para o item respondido ser
 * sempre rastreável ao banco que o serviu. */
export interface AdaptiveQuizBank {
  id: string;
  version: string;
  items: AdaptiveQuizItem[];
}

// ─── Validação do banco ──────────────────────────────────────────────────────

/** Erros estruturais do banco — vazio quando o banco é utilizável. */
export function validateAdaptiveBank(bank: AdaptiveQuizBank): string[] {
  const errors: string[] = [];
  if (!bank.id.trim()) errors.push("banco sem id");
  if (!bank.version.trim()) errors.push("banco sem versão");
  if (bank.items.length === 0) errors.push("banco sem itens");

  const seen = new Set<string>();
  for (const item of bank.items) {
    if (seen.has(item.id)) errors.push(`item duplicado: ${item.id}`);
    seen.add(item.id);
    if (!item.explanation.trim()) {
      errors.push(`item sem explicação (errar ensina): ${item.id}`);
    }
    if (!item.options.some((o) => o.id === item.correctOptionId)) {
      errors.push(`correctOptionId fora das opções: ${item.id}`);
    }
    if (!QUIZ_DIFFICULTY_ORDER.includes(item.difficulty)) {
      errors.push(`dificuldade desconhecida em ${item.id}: ${String(item.difficulty)}`);
    }
    if (!item.sourceStudyId.trim()) {
      errors.push(`item sem sourceStudyId: ${item.id}`);
    }
  }
  return errors;
}

// ─── Estado da sessão (SESSION_ONLY) ─────────────────────────────────────────

export interface AdaptiveAnswerRecord {
  itemId: string;
  optionId: string;
  correct: boolean;
  /** Nível vigente quando o item foi respondido — para a trilha ser explicável. */
  levelAtAnswer: QuizDifficulty;
}

export interface AdaptiveQuizState {
  bankId: string;
  bankVersion: string;
  currentLevel: QuizDifficulty;
  history: AdaptiveAnswerRecord[];
}

export function startAdaptiveQuiz(bank: AdaptiveQuizBank): AdaptiveQuizState {
  return {
    bankId: bank.id,
    bankVersion: bank.version,
    currentLevel: "fundamento",
    history: [],
  };
}

// ─── Seleção determinística do próximo item ──────────────────────────────────

function answeredIds(state: AdaptiveQuizState): Set<string> {
  return new Set(state.history.map((r) => r.itemId));
}

/** Próximo item, determinístico e explicável: primeiro item não respondido do
 * nível vigente, na ordem do banco; se o nível esgotou, procura o nível MAIS
 * PRÓXIMO abaixo (reforço antes de avanço) e só então acima. Null = sessão
 * completa. */
export function selectNextItem(
  bank: AdaptiveQuizBank,
  state: AdaptiveQuizState,
): AdaptiveQuizItem | null {
  const done = answeredIds(state);
  const currentIdx = QUIZ_DIFFICULTY_ORDER.indexOf(state.currentLevel);

  // Ordem de busca: nível vigente, depois distâncias crescentes — abaixo antes de acima.
  const searchOrder: QuizDifficulty[] = [state.currentLevel];
  for (let dist = 1; dist < QUIZ_DIFFICULTY_ORDER.length; dist++) {
    const below = QUIZ_DIFFICULTY_ORDER[currentIdx - dist];
    const above = QUIZ_DIFFICULTY_ORDER[currentIdx + dist];
    if (below) searchOrder.push(below);
    if (above) searchOrder.push(above);
  }

  for (const level of searchOrder) {
    const item = bank.items.find((i) => i.difficulty === level && !done.has(i.id));
    if (item) return item;
  }
  return null;
}

// ─── Resposta e transição de nível ───────────────────────────────────────────

function shiftLevel(level: QuizDifficulty, delta: -1 | 1): QuizDifficulty {
  const idx = QUIZ_DIFFICULTY_ORDER.indexOf(level) + delta;
  const clamped = Math.min(QUIZ_DIFFICULTY_ORDER.length - 1, Math.max(0, idx));
  return QUIZ_DIFFICULTY_ORDER[clamped];
}

export interface AnswerOutcome {
  state: AdaptiveQuizState;
  correct: boolean;
  /** Sempre presente — acerto ou erro (invariante "errar ensina"). */
  explanation: string;
}

/** Responde um item. Acerto sobe um nível (com teto), erro desce um nível
 * (com piso) — derivação exclusivamente do desempenho nesta sessão. Retorna
 * null para item inexistente ou já respondido (tentativa não conta duas vezes). */
export function answerItem(
  bank: AdaptiveQuizBank,
  state: AdaptiveQuizState,
  itemId: string,
  optionId: string,
): AnswerOutcome | null {
  const item = bank.items.find((i) => i.id === itemId);
  if (!item) return null;
  if (answeredIds(state).has(itemId)) return null;

  const correct = optionId === item.correctOptionId;
  const record: AdaptiveAnswerRecord = {
    itemId,
    optionId,
    correct,
    levelAtAnswer: state.currentLevel,
  };
  return {
    state: {
      ...state,
      currentLevel: shiftLevel(state.currentLevel, correct ? 1 : -1),
      history: [...state.history, record],
    },
    correct,
    explanation: item.explanation,
  };
}

/** Tentativa reversível: desfaz a última resposta, restaurando o nível vigente
 * no momento dela. Sem histórico, devolve o estado como está. */
export function undoLastAnswer(state: AdaptiveQuizState): AdaptiveQuizState {
  const last = state.history[state.history.length - 1];
  if (!last) return state;
  return {
    ...state,
    currentLevel: last.levelAtAnswer,
    history: state.history.slice(0, -1),
  };
}

// ─── Síntese pedagógica (nunca score para empregador) ────────────────────────

export interface LevelProgress {
  level: QuizDifficulty;
  answered: number;
  correct: number;
  totalInBank: number;
}

/** Síntese da sessão em termos PEDAGÓGICOS: progresso por nível e itens a
 * revisar. Deliberadamente NÃO existe nota única 0–100 — o registro canônico
 * proíbe score para empregador; o que sai daqui orienta revisão, não avaliação. */
export interface AdaptiveSessionSummary {
  bankId: string;
  bankVersion: string;
  perLevel: LevelProgress[];
  answeredCount: number;
  correctCount: number;
  totalInBank: number;
  complete: boolean;
  /** Itens errados, na ordem em que foram respondidos — fila de revisão pedagógica. */
  reviewItemIds: string[];
}

export function summarizeAdaptiveSession(
  bank: AdaptiveQuizBank,
  state: AdaptiveQuizState,
): AdaptiveSessionSummary {
  const perLevel = QUIZ_DIFFICULTY_ORDER.map((level) => {
    const records = state.history.filter((r) => {
      const item = bank.items.find((i) => i.id === r.itemId);
      return item?.difficulty === level;
    });
    return {
      level,
      answered: records.length,
      correct: records.filter((r) => r.correct).length,
      totalInBank: bank.items.filter((i) => i.difficulty === level).length,
    };
  });
  const answeredCount = state.history.length;
  return {
    bankId: state.bankId,
    bankVersion: state.bankVersion,
    perLevel,
    answeredCount,
    correctCount: state.history.filter((r) => r.correct).length,
    totalInBank: bank.items.length,
    complete: answeredCount === bank.items.length && bank.items.length > 0,
    reviewItemIds: state.history.filter((r) => !r.correct).map((r) => r.itemId),
  };
}
