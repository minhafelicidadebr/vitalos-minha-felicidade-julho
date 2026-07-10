import { describe, expect, test, mock, beforeEach } from "bun:test";
import type { SeedEconomyPolicy, SeedPoolDef } from "@/engine/recognition/seed-economy-engine";

// Fake do supabaseAdmin — registra colunas e filtro de kind para provar que
// só doações team/cause saem do banco (nunca presentes pessoais/destinatário).
let rows: Array<{ pool_id: string; user_id: string; amount: number }> = [];
let selectedColumns: string | null = null;
let kindFilter: string[] | null = null;

const fakeAdmin = {
  from: (_table: string) => ({
    select: (cols: string) => {
      selectedColumns = cols;
      return {
        eq: (_c: string, _v: unknown) => ({
          in: async (_col: string, kinds: string[]) => {
            kindFilter = kinds;
            return { data: rows, error: null };
          },
        }),
      };
    },
  }),
};

mock.module("@/integrations/supabase/client.server", () => ({ supabaseAdmin: fakeAdmin }));

const { loadOrgSeedPools } = await import("./seed-pools.server");

const POLICY: SeedEconomyPolicy = {
  earning: { learning_module: 2 },
  weeklyEarnCap: 12,
  weeklyDonationBudget: 3,
  kAnonymityMin: 5,
};

const POOLS: SeedPoolDef[] = [
  { id: "pomar_equipe", name: "Pomar da Equipe", channel: "team" },
  { id: "bosque_bem_comum", name: "Bosque do Bem-Comum", channel: "cause", target: 100 },
];

beforeEach(() => {
  rows = [];
  selectedColumns = null;
  kindFilter = null;
});

describe("loadOrgSeedPools — pools coletivos reais k-anon", () => {
  test("SÓ pool_id/user_id/amount saem do banco; só doações team/cause", async () => {
    await loadOrgSeedPools("org-1", POOLS, POLICY);
    expect(selectedColumns).toBe("pool_id, user_id, amount");
    expect(selectedColumns).not.toContain("recipient");
    expect(selectedColumns).not.toContain("item");
    expect(kindFilter).toEqual(["donated_team", "donated_cause"]);
  });

  test("≥5 contribuintes únicos → visível com total; <5 → protegido", async () => {
    rows = [
      ...["u1", "u2", "u3", "u4", "u5"].map((u) => ({ pool_id: "pomar_equipe", user_id: u, amount: 2 })),
      { pool_id: "bosque_bem_comum", user_id: "u1", amount: 4 },
    ];
    const pools = await loadOrgSeedPools("org-1", POOLS, POLICY);
    const pomar = pools.find((p) => p.id === "pomar_equipe")!;
    const bosque = pools.find((p) => p.id === "bosque_bem_comum")!;
    expect(pomar.visible).toBe(true);
    expect(pomar.total).toBe(10);
    expect(pomar.uniqueContributors).toBe(5);
    expect(bosque.visible).toBe(false); // 1 < 5 — proteção, nunca o número
  });

  test("org sem doações → pools zerados protegidos, nunca erro", async () => {
    const pools = await loadOrgSeedPools("org-vazia", POOLS, POLICY);
    expect(pools).toHaveLength(2);
    expect(pools.every((p) => p.total === 0 && !p.visible)).toBe(true);
  });
});
