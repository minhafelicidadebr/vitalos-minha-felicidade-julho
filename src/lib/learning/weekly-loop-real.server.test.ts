import { describe, expect, test, mock, beforeEach } from "bun:test";
import { DEFAULT_LOOP_POLICY } from "@/engine/season/weekly-loop-engine";

// Fake supabaseAdmin: cada tabela devolve linhas {user_id} filtradas pela
// query encadeada (.eq). Modela org de N membros e sinais por passo.
let members: string[] = [];
let rows: Record<string, Array<{ user_id: string; kind?: string; share_consent?: boolean }>> = {};

function makeQuery(table: string) {
  const filters: Array<[string, unknown]> = [];
  const chain: any = {
    eq: (col: string, val: unknown) => {
      if (table === "profiles") {
        // profiles.eq(org_id) — devolve os membros.
        return Promise.resolve({ data: members.map((id) => ({ id })), error: null });
      }
      filters.push([col, val]);
      return chain;
    },
    then: (resolve: (r: { data: unknown; error: null }) => void) => {
      const all = rows[table] ?? [];
      const filtered = all.filter((r) =>
        filters.every(([col, val]) => (r as Record<string, unknown>)[col] === val),
      );
      resolve({ data: filtered, error: null });
    },
  };
  return chain;
}

const fakeAdmin = {
  from: (table: string) => ({ select: (_cols: string) => makeQuery(table) }),
};

mock.module("@/integrations/supabase/client.server", () => ({ supabaseAdmin: fakeAdmin }));

const { loadRealWeeklyLoop } = await import("./weekly-loop-real.server");

const TEAM = ["u1", "u2", "u3", "u4", "u5", "u6"]; // 6 ≥ k-anon(5)

beforeEach(() => {
  members = [];
  rows = {};
});

describe("loadRealWeeklyLoop — cobertura real da org, k-anon protegido", () => {
  test("org sem membros → null (nada a agregar)", async () => {
    members = [];
    expect(await loadRealWeeklyLoop("org-1", DEFAULT_LOOP_POLICY)).toBeNull();
  });

  test("org menor que k-anon → loop montado mas invisible (nunca expõe cobertura)", async () => {
    members = ["u1", "u2", "u3"]; // 3 < 5
    const loop = await loadRealWeeklyLoop("org-1", DEFAULT_LOOP_POLICY);
    expect(loop!.visible).toBe(false);
    expect(loop!.steps.every((s) => s.coveragePct === null)).toBe(true);
  });

  test("conta DISTINCT user_id por passo; só membros da org contam", async () => {
    members = TEAM;
    rows = {
      // 5 dos 6 concluíram trilha (learning_path) → 83% ≥ 60% → aprender done.
      participation_events: [
        { user_id: "u1", kind: "learning_path" },
        { user_id: "u1", kind: "learning_path" }, // duplicado: conta 1x
        { user_id: "u2", kind: "learning_path" },
        { user_id: "u3", kind: "learning_path" },
        { user_id: "u4", kind: "learning_path" },
        { user_id: "u5", kind: "learning_path" },
        { user_id: "intruso", kind: "learning_path" }, // fora da org: ignorado
        { user_id: "u1", kind: "learning_module" },
      ],
    };
    const loop = await loadRealWeeklyLoop("org-1", DEFAULT_LOOP_POLICY);
    expect(loop!.visible).toBe(true);
    const aprender = loop!.steps.find((s) => s.id === "aprender")!;
    expect(aprender.coveragePct).toBe(83); // 5/6, u1 duplicado conta 1, intruso fora
    expect(aprender.done).toBe(true);
    // praticar: só u1 (1/6 = 17%) < 60% → não done; e destravado porque aprender done.
    const praticar = loop!.steps.find((s) => s.id === "praticar")!;
    expect(praticar.coveragePct).toBe(17);
    expect(praticar.unlocked).toBe(true);
    expect(praticar.done).toBe(false);
  });

  test("evidenciar/refletir/compartilhar vêm de practice_entries com os filtros certos", async () => {
    members = TEAM;
    rows = {
      practice_entries: [
        { user_id: "u1", kind: "texto", share_consent: true },
        { user_id: "u2", kind: "reflexao", share_consent: false },
        { user_id: "u3", kind: "reflexao", share_consent: true },
        { user_id: "u4", kind: "checklist", share_consent: false },
      ],
    };
    const loop = await loadRealWeeklyLoop("org-1", DEFAULT_LOOP_POLICY);
    const byId = Object.fromEntries(loop!.steps.map((s) => [s.id, s]));
    expect(byId.evidenciar.coveragePct).toBe(67); // 4/6 pessoas com ≥1 registro
    expect(byId.refletir.coveragePct).toBe(33); // 2/6 com kind=reflexao (u2,u3)
    expect(byId.compartilhar.coveragePct).toBe(33); // 2/6 com share_consent (u1,u3)
  });

  test("celebrar é all-or-nothing: doação de time no ciclo → org toda conta", async () => {
    members = TEAM;
    rows = { seed_events: [{ user_id: "u1", kind: "donated_team" }] };
    const withCeleb = await loadRealWeeklyLoop("org-1", DEFAULT_LOOP_POLICY);
    expect(withCeleb!.steps.find((s) => s.id === "celebrar")!.coveragePct).toBe(100);

    rows = { seed_events: [{ user_id: "u1", kind: "donated_person" }] }; // não é team
    const noCeleb = await loadRealWeeklyLoop("org-1", DEFAULT_LOOP_POLICY);
    expect(noCeleb!.steps.find((s) => s.id === "celebrar")!.coveragePct).toBe(0);
  });

  test("sem nenhum sinal: todos os passos em 0% honesto, nenhum done", async () => {
    members = TEAM;
    const loop = await loadRealWeeklyLoop("org-1", DEFAULT_LOOP_POLICY);
    expect(loop!.steps.every((s) => s.coveragePct === 0)).toBe(true);
    expect(loop!.completedSteps).toBe(0);
  });
});
