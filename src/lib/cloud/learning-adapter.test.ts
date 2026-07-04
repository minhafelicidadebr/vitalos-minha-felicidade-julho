import { describe, expect, test, mock } from "bun:test";
import { fakeSupabase, fakeSupabaseState } from "./learning-adapter.fake-client";

// Sem service role, sem RPC — ver learning-adapter.fake-client.ts para por
// que o fake é compartilhado com participation-store.test.ts.
fakeSupabaseState.cardRows["user-a"] = [
  { card_id: "fc-seguranca-1", repetition: 2, easiness: 2.6, interval_days: 6, lapses: 0, reviewed_at: "2026-06-20T00:00:00.000Z" },
];
fakeSupabaseState.eventRows["user-a"] = [
  { event_id: "learning-module:trilha-1:mod-1", kind: "learning_module", category: "learning", source_id: "trilha-1:mod-1", occurred_on: "2026-07-01", xp_awarded: 10, capped: false },
];

mock.module("@/integrations/supabase/client", () => ({ supabase: fakeSupabase }));

const {
  loadCardStates,
  saveCardState,
  loadParticipationEvents,
  saveParticipationEvent,
} = await import("./learning-adapter");

describe("learning-adapter — repetição espaçada (sm2_card_state)", () => {
  test("mapeia snake_case do banco para o shape camelCase do engine SM-2", async () => {
    const states = await loadCardStates("user-a");
    expect(states).toEqual([
      {
        cardId: "fc-seguranca-1",
        schedule: { repetition: 2, easiness: 2.6, intervalDays: 6, lapses: 0 },
        reviewedAt: "2026-06-20T00:00:00.000Z",
      },
    ]);
  });

  test("usuário sem cartões salvos ainda recebe lista vazia (nunca erro)", async () => {
    const states = await loadCardStates("user-sem-historico");
    expect(states).toEqual([]);
  });

  test("saveCardState envia upsert com onConflict user_id,card_id — nunca duplica a linha", async () => {
    await saveCardState("user-a", "fc-energia-1", { repetition: 1, easiness: 2.5, intervalDays: 1, lapses: 0 }, "2026-07-03T00:00:00.000Z");
    expect(fakeSupabaseState.lastUpsert).toMatchObject({
      user_id: "user-a",
      card_id: "fc-energia-1",
      repetition: 1,
      interval_days: 1,
      reviewed_at: "2026-07-03T00:00:00.000Z",
    });
  });
});

describe("learning-adapter — ledger de participação (participation_events)", () => {
  test("mapeia eventos persistidos de volta para o shape ParticipationLedgerEvent", async () => {
    const events = await loadParticipationEvents("user-a");
    expect(events).toEqual([
      {
        id: "learning-module:trilha-1:mod-1",
        kind: "learning_module",
        category: "learning",
        sourceId: "trilha-1:mod-1",
        occurredOn: "2026-07-01",
        xpAwarded: 10,
        capped: false,
      },
    ]);
  });

  test("saveParticipationEvent grava via INSERT puro — nunca upsert (não pode reescrever histórico)", async () => {
    fakeSupabaseState.insertError = null;
    await saveParticipationEvent("user-a", {
      id: "learning-path:trilha-1",
      kind: "learning_path",
      category: "learning",
      sourceId: "trilha-1",
      occurredOn: "2026-07-03",
      xpAwarded: 30,
      capped: false,
    });
    expect(fakeSupabaseState.lastInsert).toMatchObject({ user_id: "user-a", event_id: "learning-path:trilha-1", xp_awarded: 30 });
  });

  test("colisão de event_id repetido (replay) é absorvida silenciosamente, não propaga erro", async () => {
    fakeSupabaseState.insertError = { code: "23505", message: "duplicate key value violates unique constraint" };
    await expect(
      saveParticipationEvent("user-a", {
        id: "learning-module:trilha-1:mod-1",
        kind: "learning_module",
        category: "learning",
        sourceId: "trilha-1:mod-1",
        occurredOn: "2026-07-01",
        xpAwarded: 10,
        capped: false,
      }),
    ).resolves.toBeUndefined();
    fakeSupabaseState.insertError = null;
  });
});
