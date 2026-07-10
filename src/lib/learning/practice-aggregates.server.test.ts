import { describe, expect, test, mock, beforeEach } from "bun:test";
import { DEFAULT_JOURNAL_POLICY } from "@/engine/learning/practice-journal-engine";

// Fake do supabaseAdmin — registra as COLUNAS pedidas para provar que o
// conteúdo reflexivo (summary) nunca é selecionado pelo caminho de agregado.
let rows: Array<{ driver_id: string; user_id: string }> = [];
let selectedColumns: string | null = null;

const fakeAdmin = {
  from: (_table: string) => ({
    select: (cols: string) => {
      selectedColumns = cols;
      return {
        eq: (_c: string, _v: unknown) => ({
          eq: async (_c2: string, _v2: unknown) => ({ data: rows, error: null }),
        }),
      };
    },
  }),
};

mock.module("@/integrations/supabase/client.server", () => ({ supabaseAdmin: fakeAdmin }));

const { loadOrgPracticeAggregates } = await import("./practice-aggregates.server");

beforeEach(() => {
  rows = [];
  selectedColumns = null;
});

describe("loadOrgPracticeAggregates — coletivo real k-anon", () => {
  test("NUNCA seleciona summary — só driver_id e user_id saem do banco", async () => {
    await loadOrgPracticeAggregates("org-1", DEFAULT_JOURNAL_POLICY);
    expect(selectedColumns).toBe("driver_id, user_id");
    expect(selectedColumns).not.toContain("summary");
  });

  test("≥5 praticantes únicos consentidos → visível; <5 → protegido", async () => {
    rows = [
      ...["u1", "u2", "u3", "u4", "u5"].map((u) => ({ driver_id: "energia", user_id: u })),
      { driver_id: "clareza", user_id: "u1" },
      { driver_id: "clareza", user_id: "u2" },
    ];
    const aggregates = await loadOrgPracticeAggregates("org-1", DEFAULT_JOURNAL_POLICY);
    const energia = aggregates.find((a) => a.driverId === "energia")!;
    const clareza = aggregates.find((a) => a.driverId === "clareza")!;
    expect(energia.visible).toBe(true);
    expect(energia.uniquePractitioners).toBe(5);
    expect(clareza.visible).toBe(false); // 2 < 5 — proteção aparece, número não
  });

  test("mesma pessoa com vários registros conta UMA vez no k-anon", async () => {
    rows = Array.from({ length: 10 }, () => ({ driver_id: "energia", user_id: "u1" }));
    const aggregates = await loadOrgPracticeAggregates("org-1", DEFAULT_JOURNAL_POLICY);
    expect(aggregates[0]!.uniquePractitioners).toBe(1);
    expect(aggregates[0]!.visible).toBe(false);
  });

  test("org sem registros consentidos → lista vazia, nunca erro", async () => {
    expect(await loadOrgPracticeAggregates("org-vazia", DEFAULT_JOURNAL_POLICY)).toEqual([]);
  });
});
