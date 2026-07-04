// Persistência pessoal de aprendizagem (Sprint S5) — agendamento SM-2 e
// eventos de participação. Modelo mais simples que db-adapter.ts de propósito:
// cada linha pertence à PRÓPRIA pessoa (auth.uid()), sem k-anonimato a
// proteger, então o cliente autenticado lê/escreve direto via RLS — nenhuma
// service role, nenhuma server function.
//
// Só chamado quando useRealOrgSession() confirma uma sessão real — a
// demonstração continua 100% efêmera (Zustand/useReducer), por design.

import { supabase } from "@/integrations/supabase/client";
import type { CardSchedule } from "@/engine/learning/sm2-engine";
import type { ParticipationLedgerEvent } from "@/engine/gamification/participation-ledger";

const db = supabase as any; // tipos resolvem pós-geração de schema pelo Lovable

// ─── Repetição espaçada (sm2_card_state) ────────────────────────────────────

export interface StoredCardState {
  cardId: string;
  schedule: CardSchedule;
  /** null = nunca revisado — o cartão está vencido desde sempre (mesma semântica de initialSchedule()). */
  reviewedAt: string | null;
}

export async function loadCardStates(userId: string): Promise<StoredCardState[]> {
  const { data } = await db
    .from("sm2_card_state")
    .select("card_id, repetition, easiness, interval_days, lapses, reviewed_at")
    .eq("user_id", userId);

  return ((data ?? []) as Array<{
    card_id: string; repetition: number; easiness: number;
    interval_days: number; lapses: number; reviewed_at: string | null;
  }>).map((row) => ({
    cardId: row.card_id,
    schedule: {
      repetition: row.repetition,
      easiness: row.easiness,
      intervalDays: row.interval_days,
      lapses: row.lapses,
    },
    reviewedAt: row.reviewed_at,
  }));
}

/** Upsert — reagendar o próprio cartão é uso legítimo, nunca recusado. */
export async function saveCardState(
  userId: string,
  cardId: string,
  schedule: CardSchedule,
  reviewedAt: string,
): Promise<void> {
  await db.from("sm2_card_state").upsert(
    {
      user_id: userId,
      card_id: cardId,
      repetition: schedule.repetition,
      easiness: schedule.easiness,
      interval_days: schedule.intervalDays,
      lapses: schedule.lapses,
      reviewed_at: reviewedAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,card_id" },
  );
}

// ─── Ledger de participação (participation_events) ──────────────────────────

export async function loadParticipationEvents(userId: string): Promise<ParticipationLedgerEvent[]> {
  const { data } = await db
    .from("participation_events")
    .select("event_id, kind, category, source_id, occurred_on, xp_awarded, capped")
    .eq("user_id", userId);

  return ((data ?? []) as Array<{
    event_id: string; kind: ParticipationLedgerEvent["kind"]; category: ParticipationLedgerEvent["category"];
    source_id: string; occurred_on: string; xp_awarded: number; capped: boolean;
  }>).map((row) => ({
    id: row.event_id,
    kind: row.kind,
    category: row.category,
    sourceId: row.source_id,
    occurredOn: row.occurred_on,
    xpAwarded: row.xp_awarded,
    capped: row.capped,
  }));
}

/**
 * INSERT-only (nunca upsert/update — participation_events não concede essas
 * policies de propósito). Um event_id repetido colide com a constraint
 * UNIQUE(user_id, event_id) — tratado como replay esperado, não como falha.
 */
export async function saveParticipationEvent(
  userId: string,
  event: ParticipationLedgerEvent,
): Promise<void> {
  const { error } = await db.from("participation_events").insert({
    user_id: userId,
    event_id: event.id,
    kind: event.kind,
    category: event.category,
    source_id: event.sourceId,
    occurred_on: event.occurredOn,
    xp_awarded: event.xpAwarded,
    capped: event.capped,
  });
  if (error && error.code !== "23505") {
    console.warn("[learning-adapter] falha ao persistir evento de participação", error.message);
  }
}
