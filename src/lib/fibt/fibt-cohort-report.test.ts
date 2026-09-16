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

describe("fail-closed de manifesto e versao do instrumento", () => {
  test("versao diferente do manifesto NAO produz escore", () => {
    const r = buildFibtCohortReport(agg({}), "0.9.0");
    expect(r.status).toBe("versao_incompativel");
    expect(r).not.toHaveProperty("resultado");
  });

  test("a mensagem diz qual versao veio e qual esta carregada", () => {
    const r = buildFibtCohortReport(agg({}), "0.9.0");
    if (r.status !== "versao_incompativel") throw new Error("esperado versao_incompativel");
    expect(r.recebida).toBe("0.9.0");
    expect(r.esperada).toBe(m.instrument_version);
  });

  test("versao igual a do manifesto calcula normalmente", () => {
    const r = buildFibtCohortReport(agg({}), m.instrument_version);
    expect(r.status).toBe("ok");
  });

  test("sem versao declarada, segue calculando (onda antiga sem o campo)", () => {
    expect(buildFibtCohortReport(agg({}), null).status).toBe("ok");
    expect(buildFibtCohortReport(agg({})).status).toBe("ok");
  });

  test("a supressao acontece ANTES da checagem de versao", () => {
    // Proteger quem respondeu nao pode depender de a versao bater.
    const r = buildFibtCohortReport(suprimido(), "0.9.0");
    expect(r.status).toBe("suprimido");
  });

  test("factor_scores e domain_means sao derivados AQUI, nao no SQL", () => {
    const r = buildFibtCohortReport(agg({}));
    if (r.status !== "ok") throw new Error("esperado ok");
    expect(r.resultado.factors).toHaveLength(3);
    expect(r.resultado.domains).toHaveLength(9);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Motivos de supressão da Task 10.1 (correção do defeito D2 da macro-onda 10.2)
// ═══════════════════════════════════════════════════════════════════════════
//
// Antes, TODO motivo diferente de `not_authorized` caía no ramo único de
// supressão e a mensagem afirmava "menos de 5 respostas (<5)" — falso para uma
// coorte de 9 ou 40 respostas retida por lote ou por supressão complementar.

const semRotulo = (reason: string): CohortAggregate =>
  agg({ visible: false, n: null, countLabel: null, itemMeans: null, suppressionReason: reason });

describe("motivos de supressão introduzidos pela Task 10.1", () => {
  test("awaiting_batched_release NÃO é 'menos de 5'", () => {
    const r = buildFibtCohortReport(semRotulo("awaiting_batched_release"));
    expect(r.status).toBe("aguardando_lote");
    if (r.status !== "aguardando_lote") return;
    expect(r.motivo).not.toContain("menos de");
    expect(r.motivo).not.toContain("<5");
    expect(r.motivo).toContain("lote protegido");
    expect(r).not.toHaveProperty("countLabel");
    expect(r).not.toHaveProperty("n");
  });

  test("differential_inference_risk é supressão complementar, não falta de gente", () => {
    const r = buildFibtCohortReport(semRotulo("differential_inference_risk"));
    expect(r.status).toBe("supressao_complementar");
    if (r.status !== "supressao_complementar") return;
    expect(r.motivo).not.toContain("menos de");
    expect(r.motivo).toContain("subtracao");
    expect(r.motivo).toContain("Nao e falha tecnica");
  });

  test("item_level_insufficient_contributors fala de itens, não de respondentes", () => {
    const r = buildFibtCohortReport(semRotulo("item_level_insufficient_contributors"));
    expect(r.status).toBe("aguardando_cobertura_itens");
    if (r.status !== "aguardando_cobertura_itens") return;
    expect(r.motivo).not.toContain("menos de");
    expect(r.motivo).toContain("item");
    expect(r.motivo).toContain("zero");
  });

  test("motivo desconhecido é retido fail-closed, sem inventar faixa", () => {
    const r = buildFibtCohortReport(semRotulo("motivo_que_ainda_nao_existe"));
    expect(r.status).toBe("retido");
    if (r.status !== "retido") return;
    expect(r.motivo).not.toContain("menos de");
    expect(r.motivo).not.toContain("<5");
    expect(r).not.toHaveProperty("countLabel");
  });

  test("privacy_threshold continua sendo a única supressão que cita a faixa", () => {
    const r = buildFibtCohortReport(
      agg({
        visible: false,
        n: null,
        countLabel: "<5",
        itemMeans: null,
        suppressionReason: "privacy_threshold",
      }),
    );
    expect(r.status).toBe("suprimido");
    if (r.status !== "suprimido") return;
    expect(r.motivo).toContain("menos de 5");
  });

  test("rótulo numérico com conteúdo suprimido não é apresentado como faixa falsa", () => {
    // Estado anômalo: banco diz visible=true mas não manda médias.
    const r = buildFibtCohortReport(agg({ visible: true, countLabel: "6", itemMeans: null }));
    expect(r.status).toBe("suprimido");
    if (r.status !== "suprimido") return;
    // Nem afirma "<5" (seria falso), nem devolve o 6 como se fosse publicável.
    expect(r.countLabel).toBe("protegida");
    expect(r.motivo).not.toContain("menos de");
  });
});
