import { describe, expect, test, mock, beforeEach } from "bun:test";
import type { AggregationTriggerResult } from "./capsule-aggregator.server";

// ── Fake da agregação final (isola closeWaveAsAdmin da matemática de agregação,
// já coberta em capsule-aggregator.server.test.ts e response-aggregation-engine.test.ts).
//
// Injetado DIRETAMENTE via o parâmetro `deps` de closeWaveAsAdmin — nunca
// mock.module("./capsule-aggregator.server", ...). mock.module() troca a
// resolução do especificador para TODO o processo `bun test`, não só para
// este arquivo; foi exatamente isso que fez capsule-aggregator.server.test.ts
// falhar deterministicamente no CI (sempre devolvendo
// capsule-1/12/triggered:true, não importa o cenário), mesmo com o mock
// restaurado num afterAll — a restauração não é síncrona o suficiente
// contra o agendamento de testes do bun em todos os ambientes. Injeção de
// dependência elimina o problema por construção: nenhum módulo global é
// tocado, então não há nada para vazar.
let aggregationResult: AggregationTriggerResult = {
  triggered: true,
  capsuleId: "capsule-1",
  participantCount: 12,
};
let lastAggregationArgs: unknown[] = [];
const fakeTriggerCapsuleAggregation = async (...args: [string, string, string?]) => {
  lastAggregationArgs = args;
  return aggregationResult;
};

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
  const deps = { triggerCapsuleAggregation: fakeTriggerCapsuleAggregation, moduleAccess: async () => ({ ok: true as const }) };

  test("onda de outra organização: recusa sem tocar nada", async () => {
    const result = await closeWaveAsAdmin("org-atacante", "wave-org-a", deps);
    expect(result).toEqual({ closed: false, error: "Onda não encontrada nesta organização." });
    expect(waveUpdateCalls).toHaveLength(0);
  });

  test("onda inexistente: recusa com a mesma mensagem (nunca revela se o id existe em outra org)", async () => {
    const result = await closeWaveAsAdmin("org-a", "wave-fantasma", deps);
    expect(result).toEqual({ closed: false, error: "Onda não encontrada nesta organização." });
  });

  test("onda já selada: recusa idempotente, não tenta fechar de novo", async () => {
    const result = await closeWaveAsAdmin("org-a", "wave-sealed", deps);
    expect(result).toEqual({ closed: false, error: "Esta onda já está selada." });
    expect(waveUpdateCalls).toHaveLength(0);
  });

  test("fechamento com participação suficiente: roda agregação final e sela com seal_outcome=published", async () => {
    const result = await closeWaveAsAdmin("org-a", "wave-org-a", deps);
    expect(result).toEqual({ closed: true, capsulePublished: true, participantCount: 12 });
    expect(waveUpdateCalls).toHaveLength(1);
    expect(waveUpdateCalls[0]!.id).toBe("wave-org-a");
    expect(waveUpdateCalls[0]!.payload).toMatchObject({ status: "sealed", seal_outcome: "published" });
    // A agregação final é chamada com a organização JÁ autorizada (P0-04) —
    // fechar não abre uma segunda porta para agregação cross-tenant.
    // packId não viaja mais por parâmetro — o aggregator resolve da org da onda.
    // TASK 10.1 §C: NUNCA um 4º argumento/flag que force a republicação —
    // o fechamento roda EXATAMENTE a mesma chamada que o gatilho automático,
    // sujeita ao mesmo lote de supressão diferencial.
    expect(lastAggregationArgs).toEqual(["wave-org-a", "COPSOQ", "org-a"]);
  });

  test("fechamento com participação insuficiente (n<k_min): sela mesmo assim, sem cápsula, seal_outcome=insufficient_data", async () => {
    aggregationResult = { triggered: false, count: 2, reason: "below_k_anonymity" };
    const result = await closeWaveAsAdmin("org-a", "wave-org-a", deps);
    expect(result).toEqual({ closed: true, capsulePublished: false, reason: "below_k_anonymity" });
    expect(waveUpdateCalls[0]!.payload).toMatchObject({ status: "sealed", seal_outcome: "insufficient_data" });
  });

  // ── TASK 10.1 §C — red-team de diferenciação na publicação final ──────────
  //
  // Prova adversarial de que o FECHAMENTO nunca força uma republicação que
  // permitiria a um observador com as duas cápsulas (a última publicada e a
  // "final") calcular o valor exato de um grupo menor que k_min de novos
  // respondentes. closeWaveAsAdmin não decide isso sozinho — ele só REPASSA
  // o resultado real de triggerCapsuleAggregation (aqui, o fake). O que este
  // bloco prova é que closeWaveAsAdmin NUNCA pede (via um parâmetro de
  // "forçar") para ignorar essa proteção, e que ele representa
  // corretamente, sem inventar dado, o caso em que ela se aplica.
  describe("nenhum cenário de fechamento força a republicação (delta<k_min permanece retido)", () => {
    const cenarios = [
      { anterior: 5, final: 6, delta: 1 },
      { anterior: 10, final: 11, delta: 1 },
      { anterior: 10, final: 12, delta: 2 },
      { anterior: 10, final: 14, delta: 4 },
    ];

    for (const c of cenarios) {
      test(`anterior N=${c.anterior} → fechamento N=${c.final} (delta=${c.delta} < k_min=5): retido, cápsula anterior preservada`, async () => {
        // O fake representa o que a IMPLEMENTAÇÃO REAL de
        // triggerCapsuleAggregation faz para este delta (provado
        // separadamente e adversarialmente em
        // capsule-aggregator.server.test.ts): como delta<k_min, ela devolve
        // triggered:true COM withheldForPrivacy:true, participantCount=N
        // real, mas SEM publicar um snapshot novo.
        aggregationResult = {
          triggered: true,
          capsuleId: "capsule-anterior",
          participantCount: c.final,
          withheldForPrivacy: true,
        };
        const result = await closeWaveAsAdmin("org-a", "wave-org-a", deps);

        // closeWaveAsAdmin NUNCA transforma isso em capsulePublished:true —
        // seria reportar ao gestor um relatório final que não foi de fato
        // publicado com dados novos, e esconderia do gestor que o motivo é
        // privacidade, não falta de participação.
        expect(result).toEqual({
          closed: true,
          capsulePublished: false,
          reason: "withheld_for_privacy",
        });
        // A onda ainda sela — fechamento é uma decisão humana sobre PARAR de
        // coletar, não uma isenção de privacidade nem uma recusa de fechar.
        expect(waveUpdateCalls).toHaveLength(1);
        expect(waveUpdateCalls[0]!.payload).toMatchObject({
          status: "sealed",
          seal_outcome: "withheld_for_privacy",
        });
        // Nunca chamado com um 4º parâmetro que pediria para ignorar o lote.
        expect(lastAggregationArgs).toHaveLength(3);
      });
    }

    test("anterior N=10 → fechamento N=15 (delta=5 == k_min): publica normalmente, não é retido", async () => {
      aggregationResult = {
        triggered: true,
        capsuleId: "capsule-nova",
        participantCount: 15,
      };
      const result = await closeWaveAsAdmin("org-a", "wave-org-a", deps);
      expect(result).toEqual({ closed: true, capsulePublished: true, participantCount: 15 });
      expect(waveUpdateCalls[0]!.payload).toMatchObject({ status: "sealed", seal_outcome: "published" });
    });
  });
});

describe("isolamento — este arquivo nunca toca o cache global de módulos de capsule-aggregator.server", () => {
  test("capsule-aggregator.server continua importável normalmente depois deste arquivo (módulo real, não substituído)", async () => {
    // Diferente da versão anterior desta correção (mock.module + afterAll),
    // este arquivo NUNCA chama mock.module("./capsule-aggregator.server", ...)
    // — não há nada a restaurar porque nada foi trocado. Esta importação real,
    // rodando na mesma suíte que os testes de closeWaveAsAdmin acima (que já
    // usaram o fake via injeção de dependência, nunca mock.module), prova
    // isso: devolve a função de verdade, não um fake preso no cache global.
    const real = await import("./capsule-aggregator.server");
    expect(typeof real.triggerCapsuleAggregation).toBe("function");
    expect(real.triggerCapsuleAggregation).not.toBe(fakeTriggerCapsuleAggregation);
  });
});
