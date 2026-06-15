import { describe, expect, test } from "bun:test";
import {
  classifyStrength,
  classifyIcuft,
  diagnosisViaXIcuft,
  scoreViat,
  aggregateViat,
  type ViatInstrumentDef,
  type ViatItemResponse,
} from "./viat-engine";

// ─── Instrumento mínimo para testes ──────────────────────────────────────────

const DEF: ViatInstrumentDef = {
  strengths: [
    { id: "curiosidade", name: "Curiosidade", virtueId: "sabedoria", itemIds: ["cur_1", "cur_2"] },
    { id: "bravura", name: "Bravura", virtueId: "coragem", itemIds: ["bra_1", "bra_2"] },
    { id: "bondade", name: "Bondade", virtueId: "humanidade", itemIds: ["bon_1"] },
    {
      id: "gratidao",
      name: "Gratidão",
      virtueId: "transcendencia",
      itemIds: ["gra_1", "gra_2"],
    },
    {
      id: "esperanca",
      name: "Esperança",
      virtueId: "transcendencia",
      itemIds: ["esp_1", "esp_2"],
    },
    {
      id: "amor_aprendizado",
      name: "Amor ao aprendizado",
      virtueId: "sabedoria",
      itemIds: ["apr_1"],
    },
  ],
  virtues: [
    { id: "sabedoria", name: "Sabedoria", strengthIds: ["curiosidade", "amor_aprendizado"] },
    { id: "coragem", name: "Coragem", strengthIds: ["bravura"] },
    { id: "humanidade", name: "Humanidade", strengthIds: ["bondade"] },
    {
      id: "transcendencia",
      name: "Transcendência",
      strengthIds: ["gratidao", "esperanca"],
    },
  ],
  icuftItems: [
    { id: "icuft_1", text: "Tenho oportunidade de usar minhas forças." },
    { id: "icuft_2", text: "Minha liderança reconhece meu talento." },
  ],
};

function responses(map: Record<string, number>): ViatItemResponse[] {
  return Object.entries(map).map(([itemId, value]) => ({ itemId, value }));
}

// ─── classifyStrength ─────────────────────────────────────────────────────────

describe("classifyStrength", () => {
  test("0 → baixa", () => expect(classifyStrength(0)).toBe("baixa"));
  test("3.9 → baixa", () => expect(classifyStrength(3.9)).toBe("baixa"));
  test("4.0 → moderada", () => expect(classifyStrength(4.0)).toBe("moderada"));
  test("6.9 → moderada", () => expect(classifyStrength(6.9)).toBe("moderada"));
  test("7.0 → alta", () => expect(classifyStrength(7.0)).toBe("alta"));
  test("8.4 → alta", () => expect(classifyStrength(8.4)).toBe("alta"));
  test("8.5 → assinatura", () => expect(classifyStrength(8.5)).toBe("assinatura"));
  test("10 → assinatura", () => expect(classifyStrength(10)).toBe("assinatura"));
});

// ─── classifyIcuft ────────────────────────────────────────────────────────────

describe("classifyIcuft", () => {
  test("4.9 → desfavoravel", () => expect(classifyIcuft(4.9)).toBe("desfavoravel"));
  test("5.0 → intermediario", () => expect(classifyIcuft(5.0)).toBe("intermediario"));
  test("7.4 → intermediario", () => expect(classifyIcuft(7.4)).toBe("intermediario"));
  test("7.5 → favoravel", () => expect(classifyIcuft(7.5)).toBe("favoravel"));
});

// ─── diagnosisViaXIcuft ───────────────────────────────────────────────────────

describe("diagnosisViaXIcuft", () => {
  test("via alto + icuft alto → florescer", () =>
    expect(diagnosisViaXIcuft(7.0, 5.0)).toBe("florescer"));
  test("via alto + icuft baixo → potencial_subutilizado", () =>
    expect(diagnosisViaXIcuft(8.0, 4.9)).toBe("potencial_subutilizado"));
  test("via baixo + icuft alto → desenvolver", () =>
    expect(diagnosisViaXIcuft(6.9, 6.0)).toBe("desenvolver"));
  test("via baixo + icuft baixo → prioridade_total", () =>
    expect(diagnosisViaXIcuft(5.0, 3.0)).toBe("prioridade_total"));
});

// ─── scoreViat — scoring básico ───────────────────────────────────────────────

describe("scoreViat — scoring", () => {
  test("média de 2 itens para uma força", () => {
    const r = scoreViat(responses({ cur_1: 8, cur_2: 6 }), DEF);
    const curiosidade = r.strengths.find((s) => s.id === "curiosidade")!;
    expect(curiosidade.score).toBe(7.0);
  });

  test("força com 1 item usa valor direto", () => {
    const r = scoreViat(responses({ bon_1: 9 }), DEF);
    const bondade = r.strengths.find((s) => s.id === "bondade")!;
    expect(bondade.score).toBe(9.0);
  });

  test("item ausente conta como 0", () => {
    const r = scoreViat(responses({}), DEF);
    expect(r.global).toBe(0);
  });

  test("virtude = média das forças da virtude", () => {
    // sabedoria tem: curiosidade e amor_aprendizado
    const r = scoreViat(responses({ cur_1: 8, cur_2: 8, apr_1: 6 }), DEF);
    const sabedoria = r.virtues.find((v) => v.id === "sabedoria")!;
    // curiosidade=8, amor_aprendizado=6 → média=7
    expect(sabedoria.score).toBe(7.0);
  });

  test("global = média de todas as forças", () => {
    const r = scoreViat(
      responses({
        cur_1: 10,
        cur_2: 10,
        bra_1: 0,
        bra_2: 0,
        bon_1: 10,
        gra_1: 0,
        gra_2: 0,
        esp_1: 0,
        esp_2: 0,
        apr_1: 10,
      }),
      DEF,
    );
    // curiosidade=10, bravura=0, bondade=10, gratidao=0, esperanca=0, amor_aprendizado=10
    // global = (10+0+10+0+0+10)/6 = 30/6 = 5.0
    expect(r.global).toBe(5.0);
  });
});

// ─── scoreViat — Top 5 ───────────────────────────────────────────────────────

describe("scoreViat — Top 5", () => {
  test("top5 tem exatamente 5 itens (quando há ≥5 forças)", () => {
    const r = scoreViat(responses({}), DEF);
    expect(r.top5.length).toBe(Math.min(5, DEF.strengths.length));
  });

  test("top5 ordenado por score decrescente", () => {
    const r = scoreViat(
      responses({
        cur_1: 9,
        cur_2: 9,
        gra_1: 8,
        gra_2: 8,
        bon_1: 7,
        esp_1: 6,
        esp_2: 6,
        bra_1: 5,
        bra_2: 5,
        apr_1: 4,
      }),
      DEF,
    );
    const scores = r.top5.map((s) => s.score);
    expect(scores[0]).toBeGreaterThanOrEqual(scores[1]!);
    expect(scores[1]).toBeGreaterThanOrEqual(scores[2]!);
  });

  test("isTop5 marcado corretamente", () => {
    const r = scoreViat(
      responses({
        cur_1: 9,
        cur_2: 9,
        gra_1: 9,
        gra_2: 9,
        bon_1: 9,
        esp_1: 9,
        esp_2: 9,
        bra_1: 1,
        bra_2: 1,
        apr_1: 9,
      }),
      DEF,
    );
    const bravura = r.strengths.find((s) => s.id === "bravura")!;
    expect(bravura.isTop5).toBe(false);
  });
});

// ─── scoreViat — ICUFT ───────────────────────────────────────────────────────

describe("scoreViat — ICUFT", () => {
  test("icuft score = média dos itens ICUFT", () => {
    const r = scoreViat(responses({ icuft_1: 8, icuft_2: 6 }), DEF);
    expect(r.icuft.score).toBe(7.0);
    expect(r.icuft.classification).toBe("intermediario");
  });

  test("icuft favoravel quando ≥ 7.5", () => {
    const r = scoreViat(responses({ icuft_1: 8, icuft_2: 8 }), DEF);
    expect(r.icuft.classification).toBe("favoravel");
  });
});

// ─── aggregateViat — k-anonimato ─────────────────────────────────────────────

describe("aggregateViat — k-anonimato", () => {
  const makeResult = (score: number) =>
    scoreViat(
      responses({
        cur_1: score,
        cur_2: score,
        bra_1: score,
        bra_2: score,
        bon_1: score,
        gra_1: score,
        gra_2: score,
        esp_1: score,
        esp_2: score,
        apr_1: score,
        icuft_1: score,
        icuft_2: score,
      }),
      DEF,
    );

  test("n < minN → todas as forças ocultas e scores null", () => {
    const results = [makeResult(7)]; // n=1, minN=5
    const group = aggregateViat(results, DEF, 5);
    expect(group.strengths.every((s) => !s.visible)).toBe(true);
    expect(group.globalAvg).toBeNull();
    expect(group.icuftAvg).toBeNull();
    expect(group.alerts).toHaveLength(0);
  });

  test("n >= minN → forças visíveis e scores calculados", () => {
    const results = Array.from({ length: 5 }, () => makeResult(8));
    const group = aggregateViat(results, DEF, 5);
    expect(group.strengths.every((s) => s.visible)).toBe(true);
    expect(group.globalAvg).toBe(8);
    expect(group.icuftAvg).toBe(8);
  });

  test("top10 contém apenas forças visíveis", () => {
    const results = Array.from({ length: 5 }, () => makeResult(6));
    const group = aggregateViat(results, DEF, 5);
    expect(group.top10.every((s) => s.visible)).toBe(true);
  });
});
