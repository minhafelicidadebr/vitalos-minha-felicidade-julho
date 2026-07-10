import { describe, expect, test, mock, beforeEach } from "bun:test";
import { fakeSupabase, fakeSupabaseState } from "./learning-adapter.fake-client";

// MESMO fake compartilhado do S5 (lição documentada: dois arquivos de teste
// nunca registram fakes DIFERENTES para o mesmo módulo singleton).
mock.module("@/integrations/supabase/client", () => ({ supabase: fakeSupabase }));

const { loadOwnPracticeEntries, savePracticeEntry, deleteOwnPracticeEntry } = await import(
  "./practice-journal-adapter"
);

const ENTRY = {
  id: "pj-local-1",
  authorId: "user-1",
  driverId: "energia",
  kind: "texto" as const,
  summary: "Apliquei a pausa de 5 minutos com a equipe.",
  shareConsent: true,
  occurredOn: "2026-07-09",
};

beforeEach(() => {
  fakeSupabaseState.practiceRows = {};
  fakeSupabaseState.lastInsert = null;
  fakeSupabaseState.lastDelete = null;
  fakeSupabaseState.insertError = null;
  fakeSupabaseState.nextInsertedId = "uuid-real-1";
});

describe("practice-journal-adapter — persistência pessoal (I7 real)", () => {
  test("save envia o shape do banco e devolve o uuid REAL da linha", async () => {
    const { savedId } = await savePracticeEntry("user-1", "org-1", ENTRY);
    expect(savedId).toBe("uuid-real-1");
    expect(fakeSupabaseState.lastInsert).toEqual({
      user_id: "user-1",
      org_id: "org-1",
      driver_id: "energia",
      kind: "texto",
      summary: ENTRY.summary,
      share_consent: true,
      occurred_on: "2026-07-09",
    });
  });

  test("falha de insert → savedId null, nunca lança (best-effort)", async () => {
    fakeSupabaseState.insertError = { code: "42501", message: "RLS negou" };
    const { savedId } = await savePracticeEntry("user-1", "org-1", ENTRY);
    expect(savedId).toBeNull();
  });

  test("load mapeia linhas do banco para PracticeEntry com authorId do dono", async () => {
    fakeSupabaseState.practiceRows["user-1"] = [
      {
        id: "uuid-a",
        driver_id: "clareza",
        kind: "reflexao",
        summary: "Reescrevi o objetivo do sprint.",
        share_consent: false,
        occurred_on: "2026-07-08",
      },
    ];
    const entries = await loadOwnPracticeEntries("user-1");
    expect(entries).toEqual([
      {
        id: "uuid-a",
        authorId: "user-1",
        driverId: "clareza",
        kind: "reflexao",
        summary: "Reescrevi o objetivo do sprint.",
        shareConsent: false,
        occurredOn: "2026-07-08",
      },
    ]);
  });

  test("delete filtra por user_id E id — nunca apaga além da própria linha", async () => {
    const ok = await deleteOwnPracticeEntry("user-1", "uuid-a");
    expect(ok).toBe(true);
    expect(fakeSupabaseState.lastDelete).toEqual({
      table: "practice_entries",
      filters: [
        ["user_id", "user-1"],
        ["id", "uuid-a"],
      ],
    });
  });
});
