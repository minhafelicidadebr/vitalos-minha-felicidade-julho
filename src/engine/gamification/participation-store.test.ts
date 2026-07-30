import { describe, expect, test, mock, beforeEach } from "bun:test";
import type { ParticipationAwardRule } from "./participation-ledger";
import type { AntiGamingRules } from "./gamification-engine";
import { fakeSupabase, fakeSupabaseState, waitForNextInsert } from "@/lib/cloud/learning-adapter.fake-client";

// Mocka na camada do cliente Supabase (não o módulo learning-adapter inteiro),
// reusando o MESMO fake compartilhado de learning-adapter.test.ts — ver o
// comentário em learning-adapter.fake-client.ts para o porquê: bun:test
// mantém o registro de mock.module() global ao processo, e learning-adapter.ts
// é um singleton cujo `supabase` importado se vincula, de forma permanente,
// ao mock que estava ativo na primeira vez que o módulo foi avaliado — seja
// esse "primeiro disparo" vindo daqui (via record() → import dinâmico) ou de
// learning-adapter.test.ts. Um fake distinto aqui correria o risco de "vencer
// a corrida" e deixar o outro arquivo com um cliente incompleto.
mock.module("@/integrations/supabase/client", () => ({ supabase: fakeSupabase }));

const { useParticipationLedger } = await import("./participation-store");

const AWARD_RULES: ParticipationAwardRule[] = [
  { kind: "learning_module", category: "learning", xp: 10, maxPerDay: 999 },
];
const ANTI_GAMING: AntiGamingRules = { xpDailyCap: 999, kudosWeeklyBudget: 5, duplicateMissionCooldownHours: 20 };

beforeEach(() => {
  useParticipationLedger.setState({ events: [], syncUserId: null });
  fakeSupabaseState.lastInsert = null;
});

// `record()` dispara a persistência (import dinâmico + saveParticipationEvent)
// como fire-and-forget de propósito — não devolve a promise, para nunca
// bloquear a experiência local (ver comentário em participation-store.ts).
// Um teste não pode "adivinhar" quantos ticks essa promise leva para resolver:
// sob carga (rodada cheia, centenas de arquivos competindo pelo event loop) o
// import dinâmico pode não ter terminado ainda quando a asserção roda — falha
// só sob carga, nunca isolado (TEST-STAB-1). `waitForNextInsert()` resolve
// exatamente quando o insert acontece: nem cedo demais (corrida), nem tarde
// demais (teste lento à toa). Só é chamado nos casos em que o código sob
// teste realmente entra no ramo de sincronização (syncUserId definido E
// evento de fato registrado) — nos demais, a ausência de insert é
// consequência de um `if` síncrono, então a asserção roda sem esperar nada.

describe("useParticipationLedger — sincronização real (Sprint S5)", () => {
  test("sem syncUserId (demo): grava local, NUNCA chama o adaptador de backend", () => {
    useParticipationLedger.getState().record(
      { id: "ev-1", kind: "learning_module", sourceId: "trilha:mod-1", occurredOn: "2026-07-03" },
      AWARD_RULES,
      ANTI_GAMING,
    );
    // syncUserId é null: record() nem entra no ramo assíncrono (ver o `if
    // (userId && result.event)` em participation-store.ts) — nada a esperar.
    expect(useParticipationLedger.getState().events).toHaveLength(1);
    expect(fakeSupabaseState.lastInsert).toBeNull();
  });

  test("com syncUserId (sessão real): grava local E persiste no backend", async () => {
    useParticipationLedger.getState().setSyncUserId("user-a");
    const inserted = waitForNextInsert();
    useParticipationLedger.getState().record(
      { id: "ev-2", kind: "learning_module", sourceId: "trilha:mod-2", occurredOn: "2026-07-03" },
      AWARD_RULES,
      ANTI_GAMING,
    );
    const payload = await inserted;
    expect(useParticipationLedger.getState().events).toHaveLength(1);
    expect(payload).toMatchObject({ user_id: "user-a", event_id: "ev-2", source_id: "trilha:mod-2" });
    expect(fakeSupabaseState.lastInsert).toMatchObject({ user_id: "user-a", event_id: "ev-2", source_id: "trilha:mod-2" });
  });

  test("evento duplicado (mesmo id) não persiste de novo — nem local nem backend", async () => {
    useParticipationLedger.getState().setSyncUserId("user-a");
    const firstInsert = waitForNextInsert();
    useParticipationLedger.getState().record(
      { id: "ev-3", kind: "learning_module", sourceId: "trilha:mod-3", occurredOn: "2026-07-03" },
      AWARD_RULES,
      ANTI_GAMING,
    );
    // Espera o PRIMEIRO insert de fato acontecer antes de seguir — sem isso,
    // a promise fire-and-forget da primeira chamada pode resolver depois
    // deste teste já ter terminado e vazar `lastInsert` para o próximo teste
    // do arquivo (ou, sob mock.module compartilhado, de learning-adapter.test.ts).
    await firstInsert;
    fakeSupabaseState.lastInsert = null;

    const secondResult = useParticipationLedger.getState().record(
      { id: "ev-3", kind: "learning_module", sourceId: "trilha:mod-3", occurredOn: "2026-07-03" },
      AWARD_RULES,
      ANTI_GAMING,
    );
    // Duplicata: recordParticipationEvent devolve reason "duplicate" de forma
    // síncrona, e o `if (result.reason === "recorded" || "recorded_capped")`
    // em participation-store.ts nem entra no ramo assíncrono — nada a esperar.
    expect(secondResult.reason).toBe("duplicate");
    expect(useParticipationLedger.getState().events).toHaveLength(1);
    expect(fakeSupabaseState.lastInsert).toBeNull();
  });

  test("hydrate substitui o estado local pelos eventos já persistidos", () => {
    useParticipationLedger.getState().hydrate([
      { id: "ev-remoto", kind: "learning_path", category: "learning", sourceId: "trilha-1", occurredOn: "2026-07-01", xpAwarded: 30, capped: false },
    ]);
    expect(useParticipationLedger.getState().events).toHaveLength(1);
    expect(useParticipationLedger.getState().events[0]!.id).toBe("ev-remoto");
  });

  test("setSyncUserId(null) desliga a sincronização — volta ao comportamento demo", () => {
    useParticipationLedger.getState().setSyncUserId("user-a");
    useParticipationLedger.getState().setSyncUserId(null);
    useParticipationLedger.getState().record(
      { id: "ev-4", kind: "learning_module", sourceId: "trilha:mod-4", occurredOn: "2026-07-03" },
      AWARD_RULES,
      ANTI_GAMING,
    );
    // syncUserId já é null quando record() lê get().syncUserId — mesmo
    // motivo do primeiro teste: ramo assíncrono nunca é iniciado.
    expect(fakeSupabaseState.lastInsert).toBeNull();
  });
});
