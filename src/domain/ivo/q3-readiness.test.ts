import { describe, expect, test } from "bun:test";
import { moduleSchema } from "@/lib/identity/module-contract";
import { ivoLensCatalog } from "./lens-catalog";
import { Q3_PRECONDITIONS, isQ3Activatable, type Q3Precondition } from "./q3-readiness";

describe("Q3 · PERMA+V — fundação neutra", () => {
  test("com pré-condições pendentes, o Q3 não é ativável", () => {
    expect(Q3_PRECONDITIONS.some((p) => p.status === "pending")).toBe(true);
    expect(isQ3Activatable()).toBe(false);
  });

  test("decisão sem registro não conta; lista vazia não ativa", () => {
    const semRegistro: Q3Precondition[] = Q3_PRECONDITIONS.map((p) => ({ ...p, status: "decided", decisionRecord: null }));
    expect(isQ3Activatable(semRegistro)).toBe(false);
    expect(isQ3Activatable([])).toBe(false);
    const todas: Q3Precondition[] = Q3_PRECONDITIONS.map((p) => ({ ...p, status: "decided", decisionRecord: `docs/vitalos/decisions/${p.id}.md` }));
    expect(isQ3Activatable(todas)).toBe(true);
  });

  test("enquanto não ativável, o catálogo mantém perma_v planejada, sem versão e sem rota", () => {
    const q3 = ivoLensCatalog().find((l) => l.id === "perma_v");
    expect(q3).toMatchObject({ quarter: "Q3", availability: "planned", instrumentVersion: null, route: null });
  });

  test("não existe módulo Q3 no contrato de habilitação até a decisão Q3-06", () => {
    expect(moduleSchema.options).toEqual(["Q1", "Q2"]);
  });

  test("ids únicos e responsáveis por papel, nunca nome de pessoa", () => {
    expect(new Set(Q3_PRECONDITIONS.map((p) => p.id)).size).toBe(Q3_PRECONDITIONS.length);
    for (const p of Q3_PRECONDITIONS) expect(["responsável metodológico", "operador", "operador e responsável metodológico"]).toContain(p.owner);
  });
});
