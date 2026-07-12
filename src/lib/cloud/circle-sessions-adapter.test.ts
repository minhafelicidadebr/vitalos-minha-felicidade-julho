import { describe, expect, test, mock, beforeEach } from "bun:test";

// Fake supabase (cliente RLS): registra INSERT e devolve rows no SELECT.
let rows: Array<Record<string, unknown>> = [];
let lastInsert: Record<string, unknown> | null = null;
let insertError: { message: string } | null = null;

const fakeSupabase = {
  from: (_table: string) => ({
    select: (_c: string) => ({
      order: async (_o: string, _opts: unknown) => ({ data: rows, error: null }),
    }),
    insert: (payload: Record<string, unknown>) => {
      lastInsert = payload;
      return {
        select: (_c: string) => ({
          single: async () =>
            insertError ? { data: null, error: insertError } : { data: { id: "circ-uuid-1" }, error: null },
        }),
      };
    },
  }),
};

mock.module("@/integrations/supabase/client", () => ({ supabase: fakeSupabase }));

const { loadOrgCircleSessions, saveCircleSession } = await import("./circle-sessions-adapter");

beforeEach(() => {
  rows = [];
  lastInsert = null;
  insertError = null;
});

describe("circle-sessions-adapter — privacidade por schema (I5)", () => {
  test("load mapeia linhas do banco ao tipo do engine — só metadados", async () => {
    rows = [
      {
        id: "c1",
        facilitator_id: "u-emb",
        embassy_id: "amb-energia",
        driver_id: "energia",
        occurred_on: "2026-07-10",
        presence_count: 6,
      },
    ];
    const sessions = await loadOrgCircleSessions();
    expect(sessions).toEqual([
      {
        id: "c1",
        embassyId: "amb-energia",
        facilitatorId: "u-emb",
        driverId: "energia",
        occurredOn: "2026-07-10",
        presenceCount: 6,
      },
    ]);
    // O tipo devolvido NÃO tem campo de conteúdo nem lista de participantes.
    expect(Object.keys(sessions[0]!)).toEqual([
      "id",
      "embassyId",
      "facilitatorId",
      "driverId",
      "occurredOn",
      "presenceCount",
    ]);
  });

  test("save envia só metadados (org, facilitador, driver, presença) — nunca conteúdo", async () => {
    const { savedId } = await saveCircleSession("org-1", "u-emb", {
      id: "c-local",
      embassyId: "amb-energia",
      driverId: "energia",
      occurredOn: "2026-07-10",
      presenceCount: 6,
    });
    expect(savedId).toBe("circ-uuid-1");
    expect(lastInsert).toEqual({
      org_id: "org-1",
      facilitator_id: "u-emb",
      embassy_id: "amb-energia",
      driver_id: "energia",
      occurred_on: "2026-07-10",
      presence_count: 6,
    });
    // Nenhuma chave de conteúdo/participantes no payload.
    expect(Object.keys(lastInsert!).some((k) => /content|participant|summary|member/i.test(k))).toBe(
      false,
    );
  });

  test("falha de insert → savedId null, nunca lança", async () => {
    insertError = { message: "RLS negou" };
    const { savedId } = await saveCircleSession("org-1", "u-emb", {
      id: "c-local",
      embassyId: "amb-energia",
      driverId: "energia",
      occurredOn: "2026-07-10",
      presenceCount: 6,
    });
    expect(savedId).toBeNull();
  });
});
