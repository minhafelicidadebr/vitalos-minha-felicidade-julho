import { describe, expect, test } from "bun:test";
import {
  scoreFibt,
  aggregateFibt,
  classifyFibt,
  FIBT_K_MIN,
  type FibtInstrumentDef,
  type FibtItemResponse,
} from "./fibt-engine";

// Instrumento mínimo: 3 fatores, 4 domínios, 6 itens (escala 0–4).
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

// ─── Classificação ────────────────────────────────────────────────────────────

describe("classifyFibt", () => {
  test("faixas por normalizado 0–100", () => {
    expect(classifyFibt(30)).toBe("fragil");
    expect(classifyFibt(40)).toBe("em_desenvolvimento");
    expect(classifyFibt(60)).toBe("saudavel");
    expect(classifyFibt(80)).toBe("florescente");
  });
});

// ─── Scoring ──────────────────────────────────────────────────────────────────

describe("scoreFibt", () => {
  test("tudo no máximo (4) → escore bruto 12, index 1000, florescente", () => {
    const r = scoreFibt(resp({ q1: 4, q2: 4, q3: 4, q4: 4, q5: 4, q6: 4 }), DEF);
    expect(r.escoreBruto).toBe(12);
    expect(r.index).toBe(1000);
    expect(r.classification).toBe("florescente");
  });

  test("tudo no mínimo (0) → escore 0, index 0, frágil", () => {
    const r = scoreFibt(resp({}), DEF);
    expect(r.escoreBruto).toBe(0);
    expect(r.index).toBe(0);
    expect(r.classification).toBe("fragil");
  });

  test("subíndice do Fator = média dos seus itens", () => {
    // empresa: q5=2, q6=4 → média 3.0
    const r = scoreFibt(resp({ q5: 2, q6: 4 }), DEF);
    const empresa = r.factors.find((f) => f.id === "empresa")!;
    expect(empresa.mean).toBe(3.0);
    expect(empresa.normalized).toBe(75); // 3/4
  });

  test("escore bruto = soma das médias dos 3 fatores (peso igual)", () => {
    // padrao: q1=4,q2=2 → 3.0 ; bem_estar: q3=2,q4=2 → 2.0 ; empresa: q5=4,q6=4 → 4.0
    const r = scoreFibt(resp({ q1: 4, q2: 2, q3: 2, q4: 2, q5: 4, q6: 4 }), DEF);
    expect(r.escoreBruto).toBe(9.0); // 3+2+4
    expect(r.index).toBe(750); // 9/12
  });

  test("score por domínio normalizado a 0–100", () => {
    const r = scoreFibt(resp({ q3: 4 }), DEF); // saude=4 → 100
    expect(r.domains.find((d) => d.id === "saude")!.normalized).toBe(100);
  });

  test("peso igual por fator: um fator de 1 item não domina um fator de 2 itens", () => {
    // empresa tem 2 itens, saude 1 — mas cada FATOR pesa igual no bruto
    const r = scoreFibt(resp({ q5: 4, q6: 4 }), DEF); // só empresa no máximo
    // empresa mean 4, outros 0 → bruto = 4 → index round(4/12*1000)=333
    expect(r.escoreBruto).toBe(4);
    expect(r.index).toBe(333);
  });
});

// ─── Agregação k-anonimato ────────────────────────────────────────────────────

describe("aggregateFibt — k-anonimato", () => {
  const person = (v: number) => resp({ q1: v, q2: v, q3: v, q4: v, q5: v, q6: v });

  test("n < mínimo → oculto, sem resultado", () => {
    const g = aggregateFibt([person(4)], DEF, FIBT_K_MIN);
    expect(g.visible).toBe(false);
    expect(g.result).toBeNull();
  });

  test("n >= mínimo → média dos respondentes pontuada", () => {
    const people = [person(4), person(4), person(2), person(2), person(3)];
    const g = aggregateFibt(people, DEF, FIBT_K_MIN);
    expect(g.visible).toBe(true);
    // média por item = (4+4+2+2+3)/5 = 3.0 → todos fatores 3.0 → bruto 9 → index 750
    expect(g.result!.escoreBruto).toBe(9);
    expect(g.result!.index).toBe(750);
  });

  test("n exatamente no mínimo é visível", () => {
    const people = Array.from({ length: FIBT_K_MIN }, () => person(3));
    expect(aggregateFibt(people, DEF, FIBT_K_MIN).visible).toBe(true);
  });
});
