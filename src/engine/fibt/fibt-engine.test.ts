import { describe, expect, test } from "bun:test";
import {
  scoreFibt,
  aggregateFibt,
  validateFibtResponses,
  FibtIncompleteResponseError,
  FIBT_K_MIN,
  type FibtInstrumentDef,
  type FibtItemResponse,
} from "./fibt-engine";
import { FIBT_INSTRUMENT } from "@/mocks/fibt-mock";

// Instrumento mínimo: 3 fatores, 5 domínios, 6 itens (escala 0–4).
const DEF: FibtInstrumentDef = {
  factors: [
    { id: "padrao", name: "Padrão de Vida", domainIds: ["padrao_vida", "cultura"] },
    { id: "bem_estar", name: "Bem-Estar", domainIds: ["saude", "ambiente"] },
    { id: "empresa", name: "Satisfação com a Empresa", domainIds: ["governanca"] },
  ],
  domains: [
    { id: "padrao_vida", name: "Padrão de Vida" },
    { id: "cultura", name: "Cultura" },
    { id: "saude", name: "Saúde" },
    { id: "ambiente", name: "Meio Ambiente" },
    { id: "governanca", name: "Governança" },
  ],
  items: [
    { id: "q1", text: "casa", factorId: "padrao", domainId: "padrao_vida" },
    { id: "q2", text: "cultura", factorId: "padrao", domainId: "cultura" },
    { id: "q3", text: "saude", factorId: "bem_estar", domainId: "saude" },
    { id: "q4", text: "ambiente", factorId: "bem_estar", domainId: "ambiente" },
    { id: "q5", text: "gov1", factorId: "empresa", domainId: "governanca" },
    { id: "q6", text: "gov2", factorId: "empresa", domainId: "governanca" },
  ],
};

function resp(map: Record<string, number>): FibtItemResponse[] {
  return Object.entries(map).map(([itemId, value]) => ({ itemId, value }));
}

const TODOS = (v: number) => resp(Object.fromEntries(DEF.items.map((i) => [i.id, v])));

// ─── Escore ───────────────────────────────────────────────────────────────────

describe("scoreFibt — cálculo documentado (Furtado 2020)", () => {
  test("tudo no máximo (4) → cada Fator 4, escore bruto 12", () => {
    const r = scoreFibt(TODOS(4), DEF);
    expect(r.factors.map((f) => f.mean)).toEqual([4, 4, 4]);
    expect(r.escoreBruto).toBe(12);
  });

  test("tudo no mínimo (0) → escore bruto 0", () => {
    const r = scoreFibt(TODOS(0), DEF);
    expect(r.escoreBruto).toBe(0);
  });

  test("subíndice do Fator = média dos itens DAQUELE Fator", () => {
    const r = scoreFibt(resp({ q1: 4, q2: 2, q3: 3, q4: 3, q5: 1, q6: 1 }), DEF);
    const by = Object.fromEntries(r.factors.map((f) => [f.id, f.mean]));
    expect(by.padrao).toBe(3); // (4+2)/2
    expect(by.bem_estar).toBe(3); // (3+3)/2
    expect(by.empresa).toBe(1); // (1+1)/2
  });

  test("escore bruto = soma das médias dos Fatores, não média dos 32 itens", () => {
    // Fatores com nº de itens diferente: a diferença entre os dois métodos
    // aparece aqui. Empresa tem 2 itens, os outros 2 — desequilibro via valores.
    const r = scoreFibt(resp({ q1: 4, q2: 4, q3: 0, q4: 0, q5: 2, q6: 2 }), DEF);
    expect(r.factors.map((f) => f.mean)).toEqual([4, 0, 2]);
    expect(r.escoreBruto).toBe(6); // 4 + 0 + 2
  });

  test("leitura de Domínio = média dos itens do Domínio, com a contagem", () => {
    const r = scoreFibt(resp({ q1: 4, q2: 2, q3: 3, q4: 1, q5: 0, q6: 4 }), DEF);
    const gov = r.domains.find((d) => d.id === "governanca")!;
    expect(gov.mean).toBe(2); // (0+4)/2
    expect(gov.itemCount).toBe(2);
  });

  test("o resultado NÃO expõe índice 0–1000 nem classificação em faixas", () => {
    const r = scoreFibt(TODOS(4), DEF);
    // Regressão da FIBT-0: ambos existiam e não têm base no documento.
    expect(r).not.toHaveProperty("index");
    expect(r).not.toHaveProperty("classification");
    expect(Object.keys(r).sort()).toEqual(["domains", "escoreBruto", "factors"]);
  });

  test("nem Fator nem Domínio expõem valor normalizado", () => {
    const r = scoreFibt(TODOS(4), DEF);
    expect(r.factors[0]).not.toHaveProperty("normalized");
    expect(r.domains[0]).not.toHaveProperty("normalized");
  });
});

// ─── Fail-closed: resposta ausente ou fora da escala ──────────────────────────

describe("scoreFibt — missing data é recusado, nunca imputado", () => {
  test("item faltando lança em vez de contar como 0 ('discordo totalmente')", () => {
    expect(() => scoreFibt(resp({ q1: 4, q2: 4, q3: 4, q4: 4, q5: 4 }), DEF)).toThrow(
      FibtIncompleteResponseError,
    );
  });

  test("o erro diz exatamente qual item faltou", () => {
    try {
      scoreFibt(resp({ q1: 4, q2: 4, q3: 4, q4: 4, q5: 4 }), DEF);
      throw new Error("deveria ter lançado");
    } catch (e) {
      expect(e).toBeInstanceOf(FibtIncompleteResponseError);
      expect((e as FibtIncompleteResponseError).missingItemIds).toEqual(["q6"]);
    }
  });

  test("valor fora da escala 0–4 é recusado", () => {
    expect(() => scoreFibt(resp({ q1: 7, q2: 4, q3: 4, q4: 4, q5: 4, q6: 4 }), DEF)).toThrow(
      FibtIncompleteResponseError,
    );
    expect(() => scoreFibt(resp({ q1: -1, q2: 4, q3: 4, q4: 4, q5: 4, q6: 4 }), DEF)).toThrow(
      FibtIncompleteResponseError,
    );
  });

  test("validateFibtResponses relata sem lançar, para a UI checar antes", () => {
    const v = validateFibtResponses(resp({ q1: 4, q2: 9 }), DEF);
    expect(v.complete).toBe(false);
    expect(v.missingItemIds).toEqual(["q3", "q4", "q5", "q6"]);
    expect(v.invalidItemIds).toEqual(["q2"]);
  });

  test("conjunto completo e válido passa", () => {
    expect(validateFibtResponses(TODOS(2), DEF).complete).toBe(true);
  });
});

// ─── Agregação e k-anonimato ─────────────────────────────────────────────────

describe("aggregateFibt — k-anonimato e integridade", () => {
  test(`abaixo de n=${FIBT_K_MIN} o resultado é suprimido`, () => {
    const g = aggregateFibt(Array.from({ length: FIBT_K_MIN - 1 }, () => TODOS(3)), DEF);
    expect(g.visible).toBe(false);
    expect(g.result).toBeNull();
  });

  test(`a partir de n=${FIBT_K_MIN} o resultado aparece`, () => {
    const g = aggregateFibt(Array.from({ length: FIBT_K_MIN }, () => TODOS(3)), DEF);
    expect(g.visible).toBe(true);
    expect(g.result!.escoreBruto).toBe(9); // 3 + 3 + 3
  });

  test("uma pessoa com resposta incompleta invalida a agregação", () => {
    const pessoas = [TODOS(3), TODOS(3), TODOS(3), TODOS(3), resp({ q1: 3 })];
    expect(() => aggregateFibt(pessoas, DEF)).toThrow(FibtIncompleteResponseError);
  });

  test("supressão vem antes da validação — grupo pequeno não vaza erro de conteúdo", () => {
    const g = aggregateFibt([resp({ q1: 3 })], DEF);
    expect(g.visible).toBe(false);
  });
});

// ─── Instrumento real: 32 itens, 12/12/8 ─────────────────────────────────────

describe("instrumento canônico ligado ao engine", () => {
  test("o mock deriva os 32 itens do manifesto", () => {
    expect(FIBT_INSTRUMENT.items).toHaveLength(32);
    expect(FIBT_INSTRUMENT.factors).toHaveLength(3);
    expect(FIBT_INSTRUMENT.domains).toHaveLength(9);
  });

  test("Fator 2 tem 12 itens e Fator 3 tem 8 — o item 5 no lugar certo", () => {
    const count = (id: string) => FIBT_INSTRUMENT.items.filter((i) => i.factorId === id).length;
    expect(count("padrao_de_vida")).toBe(12);
    expect(count("bem_estar")).toBe(12);
    expect(count("satisfacao_empresa")).toBe(8);
  });

  test("respostas máximas no instrumento real dão escore bruto 12", () => {
    const todas = FIBT_INSTRUMENT.items.map((i) => ({ itemId: i.id, value: 4 }));
    expect(scoreFibt(todas, FIBT_INSTRUMENT).escoreBruto).toBe(12);
  });

  test("o escore bruto real fica na faixa 0–12", () => {
    const meio = FIBT_INSTRUMENT.items.map((i) => ({ itemId: i.id, value: 2 }));
    const r = scoreFibt(meio, FIBT_INSTRUMENT);
    expect(r.escoreBruto).toBeGreaterThanOrEqual(0);
    expect(r.escoreBruto).toBeLessThanOrEqual(12);
    expect(r.escoreBruto).toBe(6);
  });
});
