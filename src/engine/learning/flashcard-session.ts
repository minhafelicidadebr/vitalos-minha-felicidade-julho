// Sessão de revisão — reducer PURO que compõe o sm2-engine sobre uma fila de cartões.
//
// Modela uma sessão de estudo única: cartões saem da fila ao serem acertados; ao errar
// (q < 3) o cartão volta ao FIM da fila para reaprender NESTA sessão (comportamento
// clássico tipo Anki). Genérico sobre o conteúdo do cartão (T) — o motor trata o payload
// como opaco; vocabulário e ciência vivem no mock. Sem React, sem I/O, sem domain/.

import {
  reviewCard,
  SM2_PASS_THRESHOLD,
  type CardSchedule,
  type RecallQuality,
} from "./sm2-engine";

export interface SessionCard<T> {
  id: string;
  /** Conteúdo do cartão (frente/verso/citação) — opaco para o motor. */
  card: T;
  schedule: CardSchedule;
}

export interface SessionState<T> {
  /** Cartões ainda a revisar nesta sessão, na ordem da fila. */
  queue: SessionCard<T>[];
  /** Cartões já dominados nesta sessão (agendamento final salvo). */
  reviewed: SessionCard<T>[];
  /** Quantidade de cartões com que a sessão começou. */
  total: number;
  /** Revisões realizadas — inclui recaídas que voltaram à fila (≥ acertos). */
  reviewCount: number;
  /** Recaídas (q < 3) na sessão — sinal honesto de dificuldade, nunca punição. */
  lapseCount: number;
}

/** Inicia a sessão a partir de uma fila de cartões (ordem preservada). */
export function startSession<T>(cards: SessionCard<T>[]): SessionState<T> {
  return {
    queue: [...cards],
    reviewed: [],
    total: cards.length,
    reviewCount: 0,
    lapseCount: 0,
  };
}

/** Cartão no topo da fila, ou null quando a sessão terminou. */
export function currentCard<T>(state: SessionState<T>): SessionCard<T> | null {
  return state.queue[0] ?? null;
}

/**
 * Avalia o cartão atual e devolve o NOVO estado (imutável). Acerto (q ≥ 3) gradua o
 * cartão; erro (q < 3) reagenda e o recoloca no fim da fila para nova tentativa.
 * Chamar com a fila vazia é no-op (devolve o mesmo estado).
 */
export function gradeCurrent<T>(state: SessionState<T>, quality: RecallQuality): SessionState<T> {
  const current = state.queue[0];
  if (!current) return state;

  const rest = state.queue.slice(1);
  const graded: SessionCard<T> = { ...current, schedule: reviewCard(current.schedule, quality) };
  const reviewCount = state.reviewCount + 1;

  if (quality < SM2_PASS_THRESHOLD) {
    return {
      ...state,
      queue: [...rest, graded],
      reviewCount,
      lapseCount: state.lapseCount + 1,
    };
  }

  return {
    ...state,
    queue: rest,
    reviewed: [...state.reviewed, graded],
    reviewCount,
  };
}

export interface SessionProgress {
  done: number;
  remaining: number;
  total: number;
  /** Percentual concluído (0–100), arredondado. */
  pct: number;
  finished: boolean;
}

/** Progresso honesto da sessão — conta cartões dominados, não "quanto a pessoa sabe". */
export function sessionProgress<T>(state: SessionState<T>): SessionProgress {
  const done = state.reviewed.length;
  const remaining = state.queue.length;
  return {
    done,
    remaining,
    total: state.total,
    pct: state.total === 0 ? 0 : Math.round((done / state.total) * 100),
    finished: remaining === 0,
  };
}
