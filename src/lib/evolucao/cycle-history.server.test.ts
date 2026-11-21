import { describe, expect, test, mock, beforeEach } from "bun:test";

// Supabase falso: a consulta ao Cofre de Ciclos devolve erro ou nenhuma linha.
let registryResult: { data: unknown; error: unknown } = { data: [], error: null };

function query(table: string) {
  const chain: Record<string, unknown> = {};
  chain.select = () => chain;
  chain.eq = () => chain;
  chain.maybeSingle = async () => ({ data: { pack_id: "enterprise" }, error: null });
  chain.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(table === "org_cycle_registry" ? registryResult : { data: null, error: null }).then(
      resolve,
      reject,
    );
  return chain;
}

mock.module("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { from: (table: string) => query(table) },
}));

const { loadOrgCycleHistory } = await import("./cycle-history.server");

beforeEach(() => {
  registryResult = { data: [], error: null };
});

describe("loadOrgCycleHistory · failClosed", () => {
  test("erro de leitura com failClosed: lança, nunca devolve 'nenhum ciclo'", async () => {
    registryResult = { data: null, error: { message: "boom" } };
    await expect(loadOrgCycleHistory("org-1", "COPSOQ", { failClosed: true })).rejects.toThrow(
      "cycle_history_unavailable",
    );
  });

  test("sem failClosed, o comportamento anterior é preservado ([])", async () => {
    registryResult = { data: null, error: { message: "boom" } };
    expect(await loadOrgCycleHistory("org-1", "COPSOQ")).toEqual([]);
  });

  test("leitura ok e vazia com failClosed: []", async () => {
    expect(await loadOrgCycleHistory("org-1", "COPSOQ", { failClosed: true })).toEqual([]);
  });
});
