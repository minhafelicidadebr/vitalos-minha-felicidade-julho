// Prova cross-tenant de listagem (Q1.1, escopo item 3: "listagem" e "filtros").
// listOrgWaves/listOrgCapsules são o caminho de LEITURA usado por
// adminListWaves/adminListCapsules (wave-admin.functions.ts) — o admin da
// organização A nunca pode enxergar onda/cápsula da organização B.
//
// Usa injeção de dependência (2º parâmetro `deps.client`), não
// mock.module("@/integrations/supabase/client", ...): esse especificador já
// é mockado por 6 outros arquivos de teste neste repo (pair-invite-adapter,
// practice-journal-adapter, learning-adapter, pair-directory-adapter,
// circle-sessions-adapter, participation-store) e mock.module troca a
// resolução do especificador para TODO o processo `bun test` — repetir o
// padrão aqui arriscaria o mesmo vazamento cross-file já corrigido em
// wave-admin.server.test.ts/capsule-aggregator.server.test.ts nesta sessão.

import { describe, expect, test } from "bun:test";
import { listOrgWaves, listOrgCapsules } from "./db-adapter";

const TENANT_A = "org-tenant-a";
const TENANT_B = "org-tenant-b";

const WAVE_ROWS = [
  {
    org_id: TENANT_A, id: "wave-a1", instrument: "COPSOQ", label: "Onda A",
    status: "open", invited_count: 10, closes_at: null,
    created_at: "2026-01-01T00:00:00Z", sealed_at: null,
  },
  {
    org_id: TENANT_B, id: "wave-b1", instrument: "PERMA", label: "Onda B",
    status: "open", invited_count: 8, closes_at: null,
    created_at: "2026-01-02T00:00:00Z", sealed_at: null,
  },
];

const CAPSULE_ROWS = [
  {
    org_id: TENANT_A, id: "capsule-a1", wave_id: "wave-a1", instrument: "COPSOQ",
    participant_count: 12, aggregated_at: "2026-01-05T00:00:00Z",
    dimensions: { exigencias: { mean: 3.1, high_risk_pct: 20, n: 12 } }, outcomes: null,
  },
  {
    org_id: TENANT_B, id: "capsule-b1", wave_id: "wave-b1", instrument: "PERMA",
    participant_count: 9, aggregated_at: "2026-01-06T00:00:00Z",
    dimensions: { positividade: { mean: 4.0, high_risk_pct: 5, n: 9 } }, outcomes: null,
  },
];

/** Fake mínimo: só entende .from(table).select().eq("org_id", v).order() — reflete o
 * uso real de listOrgWaves/listOrgCapsules, nada mais. Filtra pelo org_id pedido,
 * provando que a função só devolve o que pertence ao tenant solicitado. */
function fakeClient(rows: Record<string, unknown>[]) {
  return {
    from: (_table: string) => ({
      select: (_cols: string) => ({
        eq: (col: string, value: string) => ({
          order: async (_c: string, _o: unknown) => ({
            data: col === "org_id" ? rows.filter((r) => r.org_id === value) : [],
            error: null,
          }),
        }),
      }),
    }),
  };
}

describe("listOrgWaves — isolamento cross-tenant na listagem", () => {
  test("org A só recebe ondas de org A, nunca as de org B", async () => {
    const client = fakeClient(WAVE_ROWS) as never;
    const wavesA = await listOrgWaves(TENANT_A, { client });
    expect(wavesA).toHaveLength(1);
    expect(wavesA[0]!.id).toBe("wave-a1");
  });

  test("org B só recebe ondas de org B, nunca as de org A", async () => {
    const client = fakeClient(WAVE_ROWS) as never;
    const wavesB = await listOrgWaves(TENANT_B, { client });
    expect(wavesB).toHaveLength(1);
    expect(wavesB[0]!.id).toBe("wave-b1");
  });

  test("tenant sem nenhuma onda recebe lista vazia, nunca um erro nem dado alheio", async () => {
    const client = fakeClient(WAVE_ROWS) as never;
    const wavesC = await listOrgWaves("org-tenant-sem-ondas", { client });
    expect(wavesC).toEqual([]);
  });
});

describe("listOrgCapsules — isolamento cross-tenant na listagem", () => {
  test("org A só recebe cápsulas de org A, nunca as de org B", async () => {
    const client = fakeClient(CAPSULE_ROWS) as never;
    const capsulesA = await listOrgCapsules(TENANT_A, { client });
    expect(capsulesA).toHaveLength(1);
    expect(capsulesA[0]!.id).toBe("capsule-a1");
  });

  test("org B só recebe cápsulas de org B, nunca as de org A", async () => {
    const client = fakeClient(CAPSULE_ROWS) as never;
    const capsulesB = await listOrgCapsules(TENANT_B, { client });
    expect(capsulesB).toHaveLength(1);
    expect(capsulesB[0]!.id).toBe("capsule-b1");
  });

  test("cápsula de org A nunca vaza participant_count/dimensions para org B", async () => {
    const client = fakeClient(CAPSULE_ROWS) as never;
    const capsulesB = await listOrgCapsules(TENANT_B, { client });
    expect(capsulesB.find((c) => c.id === "capsule-a1")).toBeUndefined();
  });
});
