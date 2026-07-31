import { describe, expect, test } from "bun:test";
import { buildFibtCohortReport, fibtInstrumentDef, type CohortAggregate } from "./fibt-cohort-report";
import { getFibtManifest } from "@/domain/instruments/fibt/fibt-instrument";

const m = getFibtManifest();
const todosItens = (v: number): Record<string, number> =>
  Object.fromEntries(m.items.map((i) => [i.id, v]));

const agg = (over: Partial<CohortAggregate>): CohortAggregate => ({
  visible: true, n: 6, countLabel: "6", kMin: 5, itemMeans: todosItens(2), ...over,
});

/** Como o banco responde abaixo do limiar apos o privacy hardening. */
const suprimido = (): CohortAggregate =>
  agg({ visible: false, n: null, countLabel: "<5", itemMeans: null, suppressionReason: "privacy_threshold" });

describe("privacy gate — supressão nunca vira número", () => {
  test("abaixo de k=5: suprimido, sem resultado", () => {
    const r = buildFibtCohortReport(suprimido());
    expect(r.status).toBe("suprimido");
    expect(r).not.toHaveProperty("resultado");
  });

  test("a mensagem NÃO revela a contagem exata — só a faixa e o limiar", () => {
    const r = buildFibtCohortReport(suprimido());
    if (r.status !== "suprimido") throw new Error("esperado suprimido");
    expect(r.countLabel).toBe("<5");
    expect(r.motivo).toContain("<5");
    expect(r.motivo).toContain("proteger");
    // Saber que sao exatamente 4 pessoas ja e informacao sobre o grupo.
    expect(r.motivo).not.toMatch(/4/);
  });

  test("o objeto suprimido não carrega campo de contagem exata", () => {
    const r = buildFibtCohortReport(suprimido());
    expect(r).not.toHaveProperty("n");
  });

  test("mesmo que o banco vaze o n exato, o cliente não o propaga", () => {
    // Contrato antigo (pre-hardening) devolvendo n=4 com visible=false.
    const r = buildFibtCohortReport(agg({ visible: false, n: 4, countLabel: null, itemMeans: null }));
    if (r.status !== "suprimido") throw new Error("esperado suprimido");
    expect(r).not.toHaveProperty("n");
    expect(r.countLabel).toBe("<5");
    expect(r.motivo).not.toMatch(/4/);
  });

  test("visible=true mas conteúdo nulo ainda é suprimido — não confia num só sinal", () => {
    const r = buildFibtCohortReport(agg({ visible: true, itemMeans: null }));
    expect(r.status).toBe("suprimido");
  });

  test("chamador sem vínculo organizacional recebe 'nao_autorizado', não 'suprimido'", () => {
    const r = buildFibtCohortReport(agg({
      visible: false, n: null, countLabel: null, itemMeans: null, suppressionReason: "not_authorized",
    }));
    expect(r.status).toBe("nao_autorizado");
  });

  test("n=6 com cobertura completa: calcula", () => {
    const r = buildFibtCohortReport(agg({ n: 6 }));
    expect(r.status).toBe("ok");
  });
});

describe("cobertura incompleta não produz escore", () => {
  test("faltando um item: incompleto, nunca imputado como 0", () => {
    const parcial = todosItens(3);
    delete parcial.q32;
    const r = buildFibtCohortReport(agg({ itemMeans: parcial }));
    expect(r.status).toBe("incompleto");
    if (r.status !== "incompleto") return;
    expect(r.itensAusentes).toContain("q32");
  });

  test("valor fora da escala 0–4 invalida o agregado", () => {
    const r = buildFibtCohortReport(agg({ itemMeans: { ...todosItens(2), q7: 9 } }));
    expect(r.status).toBe("incompleto");
    if (r.status !== "incompleto") return;
    expect(r.itensAusentes).toContain("q7");
  });

  test("agregado vazio não vira escore zero", () => {
    const r = buildFibtCohortReport(agg({ itemMeans: {} }));
    expect(r.status).toBe("incompleto");
  });
});

describe("cálculo pelo manifesto canônico", () => {
  test("todos os itens em 4 → escore bruto 12", () => {
    const r = buildFibtCohortReport(agg({ itemMeans: todosItens(4) }));
    if (r.status !== "ok") throw new Error("esperado ok");
    expect(r.resultado.escoreBruto).toBe(12);
  });

  test("todos em 2 → escore bruto 6, cada Fator 2", () => {
    const r = buildFibtCohortReport(agg({ itemMeans: todosItens(2) }));
    if (r.status !== "ok") throw new Error("esperado ok");
    expect(r.resultado.escoreBruto).toBe(6);
    expect(r.resultado.factors.map((f) => f.mean)).toEqual([2, 2, 2]);
  });

  test("o resultado não expõe índice 0–1000 nem faixa", () => {
    const r = buildFibtCohortReport(agg({}));
    if (r.status !== "ok") throw new Error("esperado ok");
    expect(r.resultado).not.toHaveProperty("index");
    expect(r.resultado).not.toHaveProperty("classification");
  });

  test("a definição usada vem do manifesto: 32 itens, 12/12/8", () => {
    const def = fibtInstrumentDef();
    expect(def.items).toHaveLength(32);
    const conta = (id: string) => def.items.filter((i) => i.factorId === id).length;
    expect(conta("padrao_de_vida")).toBe(12);
    expect(conta("bem_estar")).toBe(12);
    expect(conta("satisfacao_empresa")).toBe(8);
  });
});
