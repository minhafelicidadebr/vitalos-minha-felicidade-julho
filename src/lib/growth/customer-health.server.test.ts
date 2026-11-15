import { describe, expect, test } from "bun:test";
import { collectAccountHealth } from "./customer-health.server";

type QueryResult = { data?: unknown; count?: number | null; error?: unknown };

function client(
  options: {
    fail?: string;
    noCount?: string;
    inventoryError?: boolean;
    inventoryMissing?: boolean;
    noMembers?: boolean;
    zero?: boolean;
  } = {},
) {
  const calls: Array<{ table: string; orgId: string }> = [];
  const admin = {
    from(table: string) {
      let orgId = "";
      const query = {
        select() {
          return query;
        },
        order() {
          return query;
        },
        not() {
          return query;
        },
        eq(column: string, value: string) {
          if (column === "org_id") orgId = value;
          return query;
        },
        in(_column: string, ids: string[]) {
          orgId = ids[0]!.replace("member-", "");
          return query;
        },
        then<TResult1 = QueryResult, TResult2 = never>(
          resolve?: ((result: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
          reject?: ((error: unknown) => TResult2 | PromiseLike<TResult2>) | null,
        ) {
          calls.push({ table, orgId });
          let result: QueryResult;
          if (table === "organizations") {
            result = options.inventoryError
              ? { error: { message: "unavailable" } }
              : {
                  data: options.inventoryMissing
                    ? null
                    : [
                        {
                          id: "alfa",
                          name: "Alfa sintética",
                          pack_id: "enterprise",
                          plan: "enterprise",
                        },
                        {
                          id: "beta",
                          name: "Beta sintética",
                          pack_id: "enterprise",
                          plan: "enterprise",
                        },
                      ],
                };
          } else if (options.fail === `${table}:${orgId}`) {
            result = { error: { message: "unavailable" }, count: null };
          } else if (table === "profiles") {
            result = { data: options.noMembers ? [] : [{ id: `member-${orgId}` }] };
          } else {
            result = {
              count: options.noCount === `${table}:${orgId}` ? null : options.zero ? 0 : 2,
            };
          }
          return Promise.resolve(result).then(resolve, reject);
        },
      };
      return query;
    },
  };
  return { admin, calls };
}

describe("acompanhamento operacional — ausência não é falha de consulta", () => {
  test("zero confirmado produz a pontuação zero do modelo legado", async () => {
    const { admin } = client({ zero: true });
    const rows = await collectAccountHealth(admin);
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row.state).toBe("available");
      expect(row.health?.score).toBe(0);
    }
  });

  test("erro em uma contagem retém o score da conta sem impedir leitura da outra", async () => {
    const { admin } = client({ fail: "wave_capsules:alfa" });
    const rows = await collectAccountHealth(admin);
    expect(rows[0]).toMatchObject({ orgId: "alfa", state: "unavailable", health: null });
    expect(rows[1]).toMatchObject({ orgId: "beta", state: "available" });
    expect(rows[1]!.health).not.toBeNull();
  });

  test("contagem ausente sem erro explícito também não vira zero", async () => {
    const { admin } = client({ noCount: "evidence_records:alfa" });
    expect((await collectAccountHealth(admin))[0]).toMatchObject({
      state: "unavailable",
      health: null,
    });
  });

  test("falha ao consultar vínculos não é interpretada como zero eventos de aprendizagem", async () => {
    const { admin } = client({ fail: "profiles:alfa" });
    expect((await collectAccountHealth(admin))[0]).toMatchObject({
      state: "unavailable",
      health: null,
    });
  });

  test("inventário indisponível rejeita sem apresentar lista vazia como sucesso", async () => {
    for (const option of [{ inventoryError: true }, { inventoryMissing: true }]) {
      await expect(collectAccountHealth(client(option).admin)).rejects.toThrow(
        "Inventário operacional indisponível.",
      );
    }
  });

  test("toda contagem mantém escopo da empresa ou dos seus membros", async () => {
    const { admin, calls } = client();
    const rows = await collectAccountHealth(admin);
    expect(rows.every((row) => row.state === "available")).toBe(true);
    for (const call of calls.filter((call) => call.table !== "organizations")) {
      expect(["alfa", "beta"]).toContain(call.orgId);
    }
    expect(calls.filter((call) => call.table === "participation_events")).toEqual([
      { table: "participation_events", orgId: "alfa" },
      { table: "participation_events", orgId: "beta" },
    ]);
  });

  test("sem membros confirmados não consulta participação fora de escopo", async () => {
    const { admin, calls } = client({ noMembers: true });
    expect((await collectAccountHealth(admin)).every((row) => row.state === "available")).toBe(
      true,
    );
    expect(calls.some((call) => call.table === "participation_events")).toBe(false);
  });
});
