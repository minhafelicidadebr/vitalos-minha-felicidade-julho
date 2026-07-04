// Reconstrói uma sessão de estudo a partir do agendamento PERSISTIDO do
// usuário — motor PURO (sem I/O, sem React). A leitura/escrita real vive em
// src/lib/cloud/learning-adapter.ts; aqui só a matemática de "quais cartões
// estão vencidos agora, dado o que já foi salvo".
//
// Genérico sobre o conteúdo do cartão (T extends CardWithId) — não conhece
// Flashcard nem qualquer vocabulário de domínio (Engine ≠ Domínio).

import { initialSchedule, nextReviewDate, selectDueCards, type CardSchedule } from "./sm2-engine";
import type { SessionCard } from "./flashcard-session";

export interface CardWithId {
  id: string;
}

export interface SavedCardState {
  cardId: string;
  schedule: CardSchedule;
  /** null = nunca revisado. */
  reviewedAt: string | null;
}

/**
 * Cartão sem entrada salva é sempre vencido (mesma semântica de
 * initialSchedule(): intervalDays=0 → devido imediatamente). Os demais usam
 * nextReviewDate() — o mesmo cálculo que o resto do motor SM-2 já usa, nunca
 * uma segunda regra.
 */
export function hydrateDueSession<T extends CardWithId>(
  catalog: readonly T[],
  saved: readonly SavedCardState[],
  today: Date,
): SessionCard<T>[] {
  const byId = new Map(saved.map((s) => [s.cardId, s]));
  const scheduled = catalog.map((card) => {
    const entry = byId.get(card.id);
    const schedule: CardSchedule = entry?.schedule ?? initialSchedule();
    const dueDate = entry?.reviewedAt
      ? nextReviewDate(new Date(entry.reviewedAt), schedule.intervalDays)
      : new Date(0);
    return { card, schedule, dueDate };
  });

  return selectDueCards(scheduled, today).map(({ card, schedule }) => ({
    id: card.id,
    card,
    schedule,
  }));
}
