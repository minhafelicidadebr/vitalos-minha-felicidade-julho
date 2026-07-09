import { describe, expect, test, mock, beforeEach } from "bun:test";
import type { AggregationTriggerResult } from "./capsule-aggregator.server";

// ── Fake da agregação final (isola closeWaveAsAdmin da matemática de agregação,
// já coberta em capsule-aggregator.server.test.ts e response-aggregation-engine.test.ts).
let aggregationResult: AggregationTriggerResult = {
  triggered: true,
  capsuleId: "capsule-1",
  participantCount: 12,
};
let lastAggregationArgs: unknown[] = [];
mock.module("./capsule-aggregator.server", () => ({
  triggerCapsuleAggregation: async (...args: unknown[]) => {
    lastAggregationArgs = args;
    return aggregationResult;
  },
}));

// ── Fake supabaseAdmin — waves de duas organizações distintas.
const WAVES: Record<string, { org_id: string; instrument: string; status: string }> = {
  "wave-org-a": { org_id: "org-a", instrument: "COPSOQ", status: "collecting" },
  "wave-sealed": { org_id: "org-a", instrument: "COPSOQ", status: "sealed" },
};
const waveUpdateCalls: Array<{ id: string; payload: unknown }> = [];

const fakeAdmin = {
  from: (table: string) => {
    if (table !== "waves") throw new Error(`tabela inesperada: ${table}`);
    return {
      select: (_cols: string) => ({
        eq: (_c: string, id: string) => ({
          maybeSingle: async () => ({ data: WAVES[id] ?? null }),
        }),
      }),
      update: (payload: unknown) => ({
        eq: async (_c: string, id: string) => {
          waveUpdateCalls.push({ id, payload });
          return { data: null, error: null };
        },
      }),
    };
  },
};

mock.module("@/integrations/supabase/client.server", () => ({ supabaseAdmin: fakeAdmin }));

const { closeWaveAsAdmin } = await import("./wave-admin.server");

beforeEach(() => {
  waveUpdateCalls.length = 0;
  lastAggregationArgs = [];
  aggregationResult = { triggered: true, capsuleId: "capsule-1", participantCount: 12 };
});

describe("closeWaveAsAdmin — fechamento é a ÚNICA ação que sela uma onda (P0-08)", () => {
  test("onda de outra organização: recusa sem tocar nada", async () => {
    const result = await closeWaveAsAdmin("org-atacante", "wave-org-a");
    expect(result).toEqual({ closed: false, error: "Onda não encontrada nesta organização." });
    expect(waveUpdateCalls).toHaveLength(0);
  });

  test("onda inexistente: recusa com a mesma mensagem (nunca revela se o id existe em outra org)", async () => {
    const result = await closeWaveAsAdmin("org-a", "wave-fantasma");
    expect(result).toEqual({ closed: false, error: "Onda não encontrada nesta organização." });
  });

  test("onda já selada: recusa idempotente, não tenta fechar de novo", async () => {
    const result = await closeWaveAsAdmin("org-a", "wave-sealed");
    expect(result).toEqual({ closed: false, error: "Esta onda já está selada." });
    expect(waveUpdateCalls).toHaveLength(0);
  });

  test("fechamento com participação suficiente: roda agregação final e sela com seal_outcome=published", async () => {
    const result = await closeWaveAsAdmin("org-a", "wave-org-a");
    expect(result).toEqual({ closed: true, capsulePublished: true, participantCount: 12 });
    expect(waveUpdateCalls).toHaveLength(1);
    expect(waveUpdateCalls[0]!.id).toBe("wave-org-a");
    expect(waveUpdateCalls[0]!.payload).toMatchObject({ status: "sealed", seal_outcome: "published" });
    // A agregação final é chamada com a organização JÁ autorizada (P0-04) —
    // fechar não abre uma segunda porta para agregação cross-tenant.
    // packId não viaja mais por parâmetro — o aggregator resolve da org da onda.
    expect(lastAggregationArgs).toEqual(["wave-org-a", "COPSOQ", "org-a"]);
  });

  test("fechamento com participação insuficiente: sela mesmo assim, sem cápsula, seal_outcome=insufficient_data", async () => {
    aggregationResult = { triggered: false, count: 2, reason: "below_k_anonymity" };
    const result = await closeWaveAsAdmin("org-a", "wave-org-a");
    expect(result).toEqual({ closed: true, capsulePublished: false, reason: "below_k_anonymity" });
    expect(waveUpdateCalls[0]!.payload).toMatchObject({ status: "sealed", seal_outcome: "insufficient_data" });
  });
});
