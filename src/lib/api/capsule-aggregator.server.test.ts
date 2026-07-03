import { describe, expect, test, mock, beforeEach } from "bun:test";
import { getWaveSurvey } from "@/mocks/survey-mock";

// ── Fake supabaseAdmin — estado controlável, registra toda chamada de escrita
// para provar o que NUNCA deveria acontecer (P0-08: agregação não sela onda).
const survey = getWaveSurvey("enterprise", "COPSOQ")!;

function buildRawResponses(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `resp-${i}`,
    answers: Object.fromEntries(survey.items.map((item) => [item.id, 3])),
  }));
}

let responseCount = 5;
let rawResponses = buildRawResponses(5);
let waveOrgId = "org-real";
const upsertCalls: unknown[] = [];
const wavesUpdateCalls: unknown[] = [];

const fakeAdmin = {
  rpc: async (name: string) => {
    if (name === "count_wave_responses") return { data: responseCount };
    return { data: null };
  },
  from: (table: string) => {
    if (table === "waves") {
      return {
        select: (_cols: string) => ({
          eq: (_c: string, _v: string) => ({
            maybeSingle: async () => ({ data: { org_id: waveOrgId, instrument: "COPSOQ" } }),
            single: async () => ({ data: { org_id: waveOrgId, instrument: "COPSOQ" } }),
          }),
        }),
        update: (payload: unknown) => {
          wavesUpdateCalls.push(payload);
          return { eq: async () => ({ data: null, error: null }) };
        },
      };
    }
    if (table === "wave_responses") {
      return {
        select: (_cols: string) => ({
          eq: async (_c: string, _v: string) => ({ data: rawResponses, error: null }),
        }),
      };
    }
    if (table === "wave_capsules") {
      return {
        upsert: (payload: unknown, _opts: unknown) => {
          upsertCalls.push(payload);
          return {
            select: (_c: string) => ({
              single: async () => ({ data: { id: "capsule-1" }, error: null }),
            }),
          };
        },
      };
    }
    return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) };
  },
};

mock.module("@/integrations/supabase/client.server", () => ({ supabaseAdmin: fakeAdmin }));

const { triggerCapsuleAggregation } = await import("./capsule-aggregator.server");

beforeEach(() => {
  responseCount = 5;
  rawResponses = buildRawResponses(5);
  waveOrgId = "org-real";
  upsertCalls.length = 0;
  wavesUpdateCalls.length = 0;
});

describe("triggerCapsuleAggregation — k-anon publica, NUNCA sela a onda (P0-08)", () => {
  test("n < 5: recusa por below_k_anonymity e não escreve nada", async () => {
    responseCount = 3;
    const result = await triggerCapsuleAggregation("wave-1", "COPSOQ", "enterprise");
    expect(result).toEqual({ triggered: false, count: 3, reason: "below_k_anonymity" });
    expect(upsertCalls).toHaveLength(0);
  });

  test("n >= 5: agrega e faz UPSERT em wave_capsules — nunca UPDATE em waves", async () => {
    const result = await triggerCapsuleAggregation("wave-1", "COPSOQ", "enterprise");
    expect(result.triggered).toBe(true);
    expect(upsertCalls).toHaveLength(1);
    // A prova central do P0-08: agregação bem-sucedida NUNCA toca a tabela waves.
    expect(wavesUpdateCalls).toHaveLength(0);
  });

  test("chamar de novo com MAIS respostas atualiza a cápsula (upsert), não recusa como 'already_aggregated'", async () => {
    await triggerCapsuleAggregation("wave-1", "COPSOQ", "enterprise");
    responseCount = 12;
    rawResponses = buildRawResponses(12);

    const second = await triggerCapsuleAggregation("wave-1", "COPSOQ", "enterprise");
    expect(second.triggered).toBe(true);
    if (second.triggered) expect(second.participantCount).toBe(12);
    expect(upsertCalls).toHaveLength(2); // duas chamadas, nenhuma recusada
    expect(wavesUpdateCalls).toHaveLength(0); // onda continua intocada
  });

  test("cada upsert usa onConflict wave_id — uma cápsula por onda, sempre atualizada", async () => {
    await triggerCapsuleAggregation("wave-1", "COPSOQ", "enterprise");
    // A chamada de upsert precisa carregar o wave_id para o onConflict funcionar.
    expect(upsertCalls[0]).toMatchObject({ wave_id: "wave-1" });
  });

  test("authorizedOrgId divergente do dono real da onda: nega ANTES de ler qualquer resposta (P0-04)", async () => {
    waveOrgId = "org-real";
    const result = await triggerCapsuleAggregation("wave-1", "COPSOQ", "enterprise", "org-atacante");
    expect(result).toEqual({ triggered: false, count: 0, reason: "cross_tenant_denied" });
    expect(upsertCalls).toHaveLength(0);
  });

  test("authorizedOrgId correto: prossegue normalmente", async () => {
    waveOrgId = "org-real";
    const result = await triggerCapsuleAggregation("wave-1", "COPSOQ", "enterprise", "org-real");
    expect(result.triggered).toBe(true);
  });
});
