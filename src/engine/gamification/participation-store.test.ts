import { describe, expect, test, mock, beforeEach } from "bun:test";
import type { ParticipationAwardRule } from "./participation-ledger";
import type { AntiGamingRules } from "./gamification-engine";
import { fakeSupabase, fakeSupabaseState } from "@/lib/cloud/learning-adapter.fake-client";

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

// Espera um microtask (o import dinâmico + .then() dentro de record()) resolver.
async function flush() {
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));
}

describe("useParticipationLedger — sincronização real (Sprint S5)", () => {
  test("sem syncUserId (demo): grava local, NUNCA chama o adaptador de backend", async () => {
    useParticipationLedger.getState().record(
      { id: "ev-1", kind: "learning_module", sourceId: "trilha:mod-1", occurredOn: "2026-07-03" },
      AWARD_RULES,
      ANTI_GAMING,
    );
    await flush();
    expect(useParticipationLedger.getState().events).toHaveLength(1);
    expect(fakeSupabaseState.lastInsert).toBeNull();
  });

  test("com syncUserId (sessão real): grava local E persiste no backend", async () => {
    useParticipationLedger.getState().setSyncUserId("user-a");
    useParticipationLedger.getState().record(
      { id: "ev-2", kind: "learning_module", sourceId: "trilha:mod-2", occurredOn: "2026-07-03" },
      AWARD_RULES,
      ANTI_GAMING,
    );
    await flush();
    expect(useParticipationLedger.getState().events).toHaveLength(1);
    expect(fakeSupabaseState.lastInsert).toMatchObject({ user_id: "user-a", event_id: "ev-2", source_id: "trilha:mod-2" });
  });

  test("evento duplicado (mesmo id) não persiste de novo — nem local nem backend", async () => {
    useParticipationLedger.getState().setSyncUserId("user-a");
    useParticipationLedger.getState().record(
      { id: "ev-3", kind: "learning_module", sourceId: "trilha:mod-3", occurredOn: "2026-07-03" },
      AWARD_RULES,
      ANTI_GAMING,
    );
    await flush();
    fakeSupabaseState.lastInsert = null;

    const secondResult = useParticipationLedger.getState().record(
      { id: "ev-3", kind: "learning_module", sourceId: "trilha:mod-3", occurredOn: "2026-07-03" },
      AWARD_RULES,
      ANTI_GAMING,
    );
    await flush();
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

  test("setSyncUserId(null) desliga a sincronização — volta ao comportamento demo", async () => {
    useParticipationLedger.getState().setSyncUserId("user-a");
    useParticipationLedger.getState().setSyncUserId(null);
    useParticipationLedger.getState().record(
      { id: "ev-4", kind: "learning_module", sourceId: "trilha:mod-4", occurredOn: "2026-07-03" },
      AWARD_RULES,
      ANTI_GAMING,
    );
    await flush();
    expect(fakeSupabaseState.lastInsert).toBeNull();
  });
});
