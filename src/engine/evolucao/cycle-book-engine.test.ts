import { describe, expect, test } from "bun:test";
import { buildCycleBook, type CycleBookInput } from "./cycle-book-engine";
import type { ReavaliacaoResult } from "../nr1/reavaliacao-engine";

const META = {
  orgName: "Org Teste",
  sectorLabel: "Empresa",
  periodLabel: "2026",
  documentId: "LIVRO-TESTE-2026",
  generatedAt: "2026-07-06",
};

function baseInput(overrides: Partial<CycleBookInput> = {}): CycleBookInput {
  return {
    meta: META,
    reavaliacao: null,
    cycleCount: 0,
    victories: [],
    esgSnapshots: [],
    activePlan: null,
    ...overrides,
  };
}

function sampleReavaliacao(overrides: Partial<ReavaliacaoResult> = {}): ReavaliacaoResult {
  return {
    cycles: [
      { cycleId: "c1", label: "2026-Q1", meanLoad: 60, visibleDims: 5 },
      { cycleId: "c2", label: "2026-Q3", meanLoad: 45, visibleDims: 5 },
    ],
    drivers: [
      {
        driverId: "carga",
        label: "Carga & Recuperação",
        macroLayer: "Condições",
        dimensionId: "demands_quant",
        dimensionLabel: "Exig. quantitativas",
        points: [],
        firstLoad: 70,
        lastLoad: 50,
        delta: -20,
        reduction: 20,
        firstRisk: "alto",
        lastRisk: "moderado",
        trend: "melhorando",
        improved: true,
      },
    ],
    meanFirst: 60,
    meanLast: 45,
    meanDelta: -15,
    overallTrend: "melhorando",
    improvedCount: 1,
    worsenedCount: 0,
    efficacy: null,
    disclaimer: "disclaimer da reavaliação",
    ...overrides,
  };
}

describe("cycle-book-engine — honestidade por capítulo (nunca força seção vazia)", () => {
  test("organização sem nenhum ciclo: capítulo 1 explica a ausência, nunca finge dado", () => {
    const doc = buildCycleBook(baseInput());
    const c1 = doc.chapters.find((c) => c.id === "medimos")!;
    expect(c1.hasContent).toBe(false);
    expect(c1.body[0]).toMatch(/Nenhum ciclo/);
  });

  test("com 1 ciclo apenas, capítulo 1 tem conteúdo mas capítulo 2 (evolução) não", () => {
    const doc = buildCycleBook(
      baseInput({ cycleCount: 1, reavaliacao: sampleReavaliacao({ cycles: [{ cycleId: "c1", label: "2026-Q1", meanLoad: 60, visibleDims: 5 }] }) }),
    );
    const c1 = doc.chapters.find((c) => c.id === "medimos")!;
    const c2 = doc.chapters.find((c) => c.id === "mudou")!;
    expect(c1.hasContent).toBe(true);
    expect(c2.hasContent).toBe(false);
    expect(c2.body[0]).toMatch(/pelo menos 2 ciclos/);
  });

  test("com 2+ ciclos e drivers, capítulo de evolução vem preenchido com tabela", () => {
    const doc = buildCycleBook(baseInput({ cycleCount: 2, reavaliacao: sampleReavaliacao() }));
    const c2 = doc.chapters.find((c) => c.id === "mudou")!;
    expect(c2.hasContent).toBe(true);
    expect(c2.table).toBeDefined();
    expect(c2.table!.rows).toHaveLength(1);
    expect(c2.table!.rows[0]![0]).toBe("Carga & Recuperação");
  });

  test("sem vitórias seladas, capítulo 3 explica o critério, nunca inventa uma vitória", () => {
    const doc = buildCycleBook(baseInput());
    const c3 = doc.chapters.find((c) => c.id === "vitorias")!;
    expect(c3.hasContent).toBe(false);
    expect(c3.body[0]).toMatch(/Nenhuma Ata/);
  });

  test("com vitórias, capítulo 3 lista driver/ciclo/hash truncado", () => {
    const doc = buildCycleBook(
      baseInput({
        victories: [
          { driverId: "carga", driverLabel: "Carga & Recuperação", cycleKey: "2026-q3", contentHash: "a".repeat(64), issuedAt: "2026-07-01T00:00:00Z" },
        ],
      }),
    );
    const c3 = doc.chapters.find((c) => c.id === "vitorias")!;
    expect(c3.hasContent).toBe(true);
    expect(c3.table!.rows[0]).toEqual(["Carga & Recuperação", "2026-q3", "2026-07-01", `${"a".repeat(12)}…`]);
  });

  test("sem snapshots ESG, capítulo 4 explica onde eles nascem", () => {
    const doc = buildCycleBook(baseInput());
    const c4 = doc.chapters.find((c) => c.id === "esg")!;
    expect(c4.hasContent).toBe(false);
  });

  test("com snapshots ESG, capítulo 4 lista ano/data/hash", () => {
    const doc = buildCycleBook(
      baseInput({ esgSnapshots: [{ year: 2026, contentHash: "b".repeat(64), generatedAt: "2026-06-01T00:00:00Z" }] }),
    );
    const c4 = doc.chapters.find((c) => c.id === "esg")!;
    expect(c4.hasContent).toBe(true);
    expect(c4.table!.rows[0]![0]).toBe("2026");
  });

  test("sem plano ativo, capítulo 5 é honesto sobre isso", () => {
    const doc = buildCycleBook(baseInput());
    const c5 = doc.chapters.find((c) => c.id === "plano")!;
    expect(c5.hasContent).toBe(false);
  });

  test("com plano ativo, capítulo 5 cita temporada/completude/conclusão", () => {
    const doc = buildCycleBook(
      baseInput({ activePlan: { seasonName: "Fundação Segura", totalActions: 5, compliancePct: 80, concludedPct: 40 } }),
    );
    const c5 = doc.chapters.find((c) => c.id === "plano")!;
    expect(c5.hasContent).toBe(true);
    expect(c5.body[0]).toMatch(/Fundação Segura/);
  });
});

describe("cycle-book-engine — capítulo opcional de eficácia", () => {
  test("sem efficacy (null), capítulo de eficácia não existe (nunca aparece vazio)", () => {
    const doc = buildCycleBook(baseInput({ cycleCount: 2, reavaliacao: sampleReavaliacao() }));
    expect(doc.chapters.find((c) => c.id === "eficacia")).toBeUndefined();
  });

  test("com efficacy.withSourceMeasure=0, capítulo de eficácia não aparece", () => {
    const doc = buildCycleBook(
      baseInput({
        cycleCount: 2,
        reavaliacao: sampleReavaliacao({
          efficacy: { withSourceMeasure: 0, maintained: 0, lapsed: 0, ofWhichImproved: 0, driverIds: [], lapsedDriverIds: [] },
        }),
      }),
    );
    expect(doc.chapters.find((c) => c.id === "eficacia")).toBeUndefined();
  });

  test("com efficacy real, capítulo de eficácia aparece com os números certos", () => {
    const doc = buildCycleBook(
      baseInput({
        cycleCount: 2,
        reavaliacao: sampleReavaliacao({
          efficacy: { withSourceMeasure: 3, maintained: 2, lapsed: 1, ofWhichImproved: 1, driverIds: ["carga"], lapsedDriverIds: [] },
        }),
      }),
    );
    const eff = doc.chapters.find((c) => c.id === "eficacia")!;
    expect(eff).toBeDefined();
    expect(eff.body[0]).toMatch(/3 driver/);
    expect(eff.body[0]).toMatch(/2 seguem/);
    expect(eff.body[0]).toMatch(/1 baixaram/);
  });
});

describe("cycle-book-engine — headline (manchete honesta)", () => {
  test("zero ciclos → manchete de livro vazio", () => {
    const doc = buildCycleBook(baseInput());
    expect(doc.headline).toMatch(/vazio/);
  });

  test("1 ciclo → manchete de fundação", () => {
    const doc = buildCycleBook(baseInput({ cycleCount: 1 }));
    expect(doc.headline).toMatch(/Fundação lançada/);
  });

  test("2+ ciclos sem melhora → manchete de histórico comparável", () => {
    const doc = buildCycleBook(baseInput({ cycleCount: 2, reavaliacao: sampleReavaliacao({ improvedCount: 0 }) }));
    expect(doc.headline).toMatch(/histórico comparável/);
  });

  test("melhora sem vitória selada → manchete cita quantos drivers melhoraram", () => {
    const doc = buildCycleBook(baseInput({ cycleCount: 2, reavaliacao: sampleReavaliacao() }));
    expect(doc.headline).toMatch(/1 driver\(es\) de risco melhoraram/);
  });

  test("vitória selada tem prioridade máxima na manchete", () => {
    const doc = buildCycleBook(
      baseInput({
        cycleCount: 2,
        reavaliacao: sampleReavaliacao(),
        victories: [
          { driverId: "carga", driverLabel: "Carga & Recuperação", cycleKey: "2026-q3", contentHash: "c".repeat(64), issuedAt: "2026-07-01" },
        ],
      }),
    );
    expect(doc.headline).toMatch(/vitória\(s\) selada\(s\)/);
    expect(doc.headline).toMatch(/Carga & Recuperação/);
  });
});

describe("cycle-book-engine — disclaimer e determinismo", () => {
  test("disclaimer sempre presente e menciona k-anonimato + honestidade causal", () => {
    const doc = buildCycleBook(baseInput());
    expect(doc.disclaimer).toMatch(/k-anonimato ≥ 5/);
    expect(doc.disclaimer).toMatch(/nunca prova de causalidade/);
  });

  test("determinístico: mesma entrada → mesma saída", () => {
    const input = baseInput({ cycleCount: 2, reavaliacao: sampleReavaliacao() });
    const a = buildCycleBook(input);
    const b = buildCycleBook(input);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  test("meta é repassada sem alteração", () => {
    const doc = buildCycleBook(baseInput());
    expect(doc.meta).toEqual(META);
  });
});
