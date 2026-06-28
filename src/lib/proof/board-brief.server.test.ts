import { describe, expect, test } from "bun:test";
import { buildBoardBrief } from "./board-brief.server";

// Board Brief: o arco lido pelos 5 céticos, cada veredicto lastreado em dado real.

describe("buildBoardBrief — os cinco céticos (enterprise)", () => {
  const brief = buildBoardBrief("enterprise");

  test("traz exatamente os 5 céticos fundadores", () => {
    expect(brief.skeptics.map((s) => s.id).sort()).toEqual([
      "auditor",
      "cfo",
      "chro",
      "colaborador",
      "investidor",
    ]);
  });

  test("cada cético tem dúvida, resposta e métrica lastreada", () => {
    for (const s of brief.skeptics) {
      expect(s.doubt.length).toBeGreaterThan(10);
      expect(s.answer.length).toBeGreaterThan(10);
      expect(s.metric.length).toBeGreaterThan(0);
    }
  });

  test("CFO: métrica traz o custo evitado quando há ROI", () => {
    const cfo = brief.skeptics.find((s) => s.id === "cfo")!;
    if (cfo.satisfied) {
      expect(cfo.metric).toContain("R$");
      expect(cfo.metric).toContain("/ano");
    }
  });

  test("colaborador: k-anonimato é sempre satisfeito (invariante)", () => {
    const colab = brief.skeptics.find((s) => s.id === "colaborador")!;
    expect(colab.satisfied).toBe(true);
    expect(colab.metric).toContain("k-anonimato");
  });

  test("auditor: satisfação reflete a evidência de Domínio B (não declaração)", () => {
    const auditor = brief.skeptics.find((s) => s.id === "auditor")!;
    expect(auditor.metric).toContain("intervenção");
  });

  test("satisfiedCount = nº de céticos satisfeitos; headline cita o selo", () => {
    expect(brief.satisfiedCount).toBe(brief.skeptics.filter((s) => s.satisfied).length);
    expect(brief.headline).toContain(brief.sealTierLabel);
  });
});

describe("buildBoardBrief — honestidade", () => {
  test("pack sem histórico: arco em construção, céticos de evidência não satisfeitos", () => {
    const brief = buildBoardBrief("government");
    expect(brief.headline).toContain("construção");
    // colaborador (k-anon) segue satisfeito; CFO/auditor/CHRO não (sem dados).
    const cfo = brief.skeptics.find((s) => s.id === "cfo")!;
    expect(cfo.satisfied).toBe(false);
    expect(cfo.metric).toContain("R$ 0");
  });

  test("disclaimer nega causalidade e promessa", () => {
    const brief = buildBoardBrief("enterprise");
    expect(brief.disclaimer.toLowerCase()).toContain("causalidade");
    expect(brief.disclaimer).toContain("estimativas");
  });

  test("determinístico: duas chamadas produzem o mesmo brief", () => {
    const a = buildBoardBrief("enterprise");
    const b = buildBoardBrief("enterprise");
    expect(a.headline).toBe(b.headline);
    expect(a.satisfiedCount).toBe(b.satisfiedCount);
  });
});
