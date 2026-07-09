import { describe, expect, test, mock, beforeEach } from "bun:test";
import type { IdentityBoundaryStatus } from "@/engine/identity/authorization-engine";

const mockBoundary = mock<() => IdentityBoundaryStatus>(() => ({
  requestedMode: "cloud",
  state: "cloud",
  realAuthentication: true,
  serverEnforced: true,
  reason: "cloud_ready",
}));

mock.module("@/lib/identity/identity-boundary.server", () => ({
  readIdentityBoundaryStatus: mockBoundary,
}));

let insertRows: Array<Record<string, unknown>> = [];
let insertShouldThrow = false;
let listRows: Array<Record<string, unknown>> = [];

const fakeAdmin = {
  from: (_table: string) => ({
    insert: async (row: Record<string, unknown>) => {
      if (insertShouldThrow) throw new Error("banco fora do ar");
      insertRows.push(row);
      return { error: null };
    },
    select: (_c: string) => ({
      eq: (_col: string, _v: string) => ({
        order: (_o: string, _opts: unknown) => ({
          limit: async (_n: number) => ({ data: listRows }),
        }),
      }),
    }),
  }),
};

mock.module("@/integrations/supabase/client.server", () => ({ supabaseAdmin: fakeAdmin }));

const { emitOpsEvent, listOpsEventsForOrg } = await import("./ops-events.server");

// O emissor é fire-and-forget: dá um tick para a escrita em background terminar.
const flush = () => new Promise((r) => setTimeout(r, 10));

beforeEach(() => {
  insertRows = [];
  insertShouldThrow = false;
  listRows = [];
  mockBoundary.mockImplementation(() => ({
    requestedMode: "cloud",
    state: "cloud",
    realAuthentication: true,
    serverEnforced: true,
    reason: "cloud_ready",
  }));
});

describe("emitOpsEvent — as três leis", () => {
  test("cloud: grava evento com org/onda/motivo — nunca conteúdo", async () => {
    emitOpsEvent("wave_created", {
      orgId: "org-1",
      waveId: "wave-1",
      context: { instrument: "COPSOQ", inviteCount: 10 },
    });
    await flush();
    expect(insertRows).toHaveLength(1);
    expect(insertRows[0]).toEqual({
      event: "wave_created",
      org_id: "org-1",
      wave_id: "wave-1",
      reason: null,
      context: { instrument: "COPSOQ", inviteCount: 10 },
    });
  });

  test("NUNCA lança: banco fora do ar vira só console.warn, o fluxo segue", async () => {
    insertShouldThrow = true;
    expect(() => emitOpsEvent("response_submit_rejected", { reason: "unknown_wave" })).not.toThrow();
    await flush();
    expect(insertRows).toHaveLength(0);
  });

  test("demo/blocked: no-op silencioso — não há operação real para observar", async () => {
    mockBoundary.mockImplementation(() => ({
      requestedMode: "demo",
      state: "demo",
      realAuthentication: false,
      serverEnforced: false,
      reason: "demo_isolated",
    }));
    emitOpsEvent("capsule_published", { orgId: "org-1" });
    await flush();
    expect(insertRows).toHaveLength(0);
  });

  test("campos ausentes viram null explícito (nunca undefined solto no banco)", async () => {
    emitOpsEvent("authorization_denied", { reason: "not_admin" });
    await flush();
    expect(insertRows[0]).toMatchObject({ org_id: null, wave_id: null, reason: "not_admin" });
  });
});

describe("listOpsEventsForOrg — leitor org-scoped", () => {
  test("mapeia linhas do banco para o shape do cliente", async () => {
    listRows = [
      { event: "wave_closed", wave_id: "w1", reason: "published", occurred_at: "2026-07-08T12:00:00Z" },
      { event: "response_submit_rejected", wave_id: null, reason: "unknown_wave", occurred_at: "2026-07-08T11:00:00Z" },
    ];
    const events = await listOpsEventsForOrg("org-1");
    expect(events).toEqual([
      { event: "wave_closed", waveId: "w1", reason: "published", occurredAt: "2026-07-08T12:00:00Z" },
      { event: "response_submit_rejected", waveId: null, reason: "unknown_wave", occurredAt: "2026-07-08T11:00:00Z" },
    ]);
  });

  test("banco vazio → lista vazia, nunca erro", async () => {
    expect(await listOpsEventsForOrg("org-sem-eventos")).toEqual([]);
  });
});
