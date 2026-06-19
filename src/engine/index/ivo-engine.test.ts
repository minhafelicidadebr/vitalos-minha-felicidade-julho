import { describe, expect, test } from "bun:test";
import { calculateIVO, K_ANONYMITY_MIN, type IVOInput } from "./ivo-engine";
import type { ProprietaryIndex } from "../pack/pack-types";

// ─── Framework mínimo (shape de ivo-framework.json) ──────────────────────────
// 2 lentes × 2 pilares. Pesos somam 1.0 no total (0.3+0.2 + 0.3+0.2).

const FRAMEWORK = {
  id: "test-ivo",
  name: "IVO Teste",
  version: "1.0.0",
  privacy: { kAnonymityMin: 5 },
  mandatoryDisclaimer: "Índice experimental — não é diagnóstico clínico.",
  lenses: [
    {
      id: "eu",
      name: "EU",
      color: "#111",
      pillars: [
        {
          id: "energia",
          name: "Energia",
          weight: 0.3,
          sampleItems: ["item A", "item B", "item C"],
        },
        { id: "proposito", name: "Propósito", weight: 0.2, sampleItems: ["item D"] },
      ],
    },
    {
      id: "nos",
      name: "NÓS",
      color: "#222",
      pillars: [
        { id: "confianca", name: "Confiança", weight: 0.3, sampleItems: ["item E"] },
        { id: "reconhecimento", name: "Reconhecimento", weight: 0.2 },
      ],
    },
  ],
  maturityLevels: [
    { min: 0, max: 399, name: "Inicial", badge: "🌱" },
    { min: 400, max: 699, name: "Em desenvolvimento", badge: "🌿" },
    { min: 700, max: 1000, name: "Maduro", badge: "🌳" },
  ],
} as unknown as ProprietaryIndex;

function input(aggregates: IVOInput["aggregates"]): IVOInput {
  return { organizationId: "org-1", cycleId: "2026-Q1", aggregates };
}

// ─── Normalização e score por pilar ──────────────────────────────────────────

describe("calculateIVO — normalização", () => {
  test("mean=5 (máximo) → normalized=1 → score=1000", () => {
    const r = calculateIVO(input([{ pillarId: "energia", mean: 5, n: 10 }]), FRAMEWORK);
    const energia = r.lenses[0]!.pillars.find((p) => p.pillarId === "energia")!;
    expect(energia.normalized).toBe(1);
    expect(energia.score).toBe(1000);
  });

  test("mean=1 (mínimo) → normalized=0 → score=0", () => {
    const r = calculateIVO(input([{ pillarId: "energia", mean: 1, n: 10 }]), FRAMEWORK);
    const energia = r.lenses[0]!.pillars.find((p) => p.pillarId === "energia")!;
    expect(energia.normalized).toBe(0);
    expect(energia.score).toBe(0);
  });

  test("mean=3 (neutro) → normalized=0.5 → score=500", () => {
    const r = calculateIVO(input([{ pillarId: "energia", mean: 3, n: 10 }]), FRAMEWORK);
    const energia = r.lenses[0]!.pillars.find((p) => p.pillarId === "energia")!;
    expect(energia.normalized).toBe(0.5);
    expect(energia.score).toBe(500);
  });

  test("respeita a escala declarada pelo framework", () => {
    const scaleFramework = {
      ...(FRAMEWORK as unknown as Record<string, unknown>),
      responseScale: { min: 0, max: 10 },
    } as unknown as ProprietaryIndex;
    const r = calculateIVO(input([{ pillarId: "energia", mean: 7.5, n: 10 }]), scaleFramework);
    const energia = r.lenses[0]!.pillars.find((p) => p.pillarId === "energia")!;

    expect(energia.normalized).toBe(0.75);
    expect(energia.score).toBe(750);
  });
});

// ─── k-anonimato ─────────────────────────────────────────────────────────────

describe("calculateIVO — k-anonimato", () => {
  test("n < kMin → não visível e usa média neutra (3.0)", () => {
    const r = calculateIVO(input([{ pillarId: "energia", mean: 5, n: 4 }]), FRAMEWORK);
    const energia = r.lenses[0]!.pillars.find((p) => p.pillarId === "energia")!;
    expect(energia.visible).toBe(false);
    // mesmo com mean=5 reportado, o efetivo é 3.0 → normalized 0.5
    expect(energia.normalized).toBe(0.5);
    expect(energia.n).toBe(4);
  });

  test("n === kMin → visível", () => {
    const r = calculateIVO(
      input([{ pillarId: "energia", mean: 5, n: K_ANONYMITY_MIN }]),
      FRAMEWORK,
    );
    const energia = r.lenses[0]!.pillars.find((p) => p.pillarId === "energia")!;
    expect(energia.visible).toBe(true);
    expect(energia.normalized).toBe(1);
  });

  test("pilar sem agregado → não visível, n=0, média neutra", () => {
    const r = calculateIVO(input([]), FRAMEWORK);
    const energia = r.lenses[0]!.pillars.find((p) => p.pillarId === "energia")!;
    expect(energia.visible).toBe(false);
    expect(energia.n).toBe(0);
    expect(energia.normalized).toBe(0.5);
  });
});

// ─── Score IVO agregado e contribuição ───────────────────────────────────────

describe("calculateIVO — score agregado", () => {
  test("todos pilares neutros → IVO = 500", () => {
    const r = calculateIVO(input([]), FRAMEWORK); // tudo neutro
    expect(r.ivoScore).toBe(500);
  });

  test("todos pilares no máximo → IVO = 1000", () => {
    const r = calculateIVO(
      input([
        { pillarId: "energia", mean: 5, n: 10 },
        { pillarId: "proposito", mean: 5, n: 10 },
        { pillarId: "confianca", mean: 5, n: 10 },
        { pillarId: "reconhecimento", mean: 5, n: 10 },
      ]),
      FRAMEWORK,
    );
    expect(r.ivoScore).toBe(1000);
  });

  test("contribuição = weight × normalized", () => {
    const r = calculateIVO(input([{ pillarId: "energia", mean: 5, n: 10 }]), FRAMEWORK);
    const energia = r.lenses[0]!.pillars.find((p) => p.pillarId === "energia")!;
    // weight 0.3 × normalized 1 = 0.3
    expect(energia.contribution).toBeCloseTo(0.3, 5);
  });
});

// ─── Score por lente ─────────────────────────────────────────────────────────

describe("calculateIVO — score por lente", () => {
  test("lente usa peso relativo dos pilares internos", () => {
    // EU: energia(0.3, mean 5→norm 1) + proposito(0.2, mean 1→norm 0)
    // relWeight energia = 0.3/0.5 = 0.6 ; proposito = 0.4
    // lensNorm = 0.6×1 + 0.4×0 = 0.6 → score 600
    const r = calculateIVO(
      input([
        { pillarId: "energia", mean: 5, n: 10 },
        { pillarId: "proposito", mean: 1, n: 10 },
      ]),
      FRAMEWORK,
    );
    expect(r.lenses[0]!.score).toBe(600);
  });
});

// ─── Maturidade ──────────────────────────────────────────────────────────────

describe("calculateIVO — maturidade", () => {
  test("IVO 500 → faixa 'Em desenvolvimento'", () => {
    const r = calculateIVO(input([]), FRAMEWORK);
    expect(r.maturityLevel.name).toBe("Em desenvolvimento");
  });

  test("IVO máximo → faixa 'Maduro'", () => {
    const r = calculateIVO(
      input([
        { pillarId: "energia", mean: 5, n: 10 },
        { pillarId: "proposito", mean: 5, n: 10 },
        { pillarId: "confianca", mean: 5, n: 10 },
        { pillarId: "reconhecimento", mean: 5, n: 10 },
      ]),
      FRAMEWORK,
    );
    expect(r.maturityLevel.name).toBe("Maduro");
  });
});

// ─── Metadados ───────────────────────────────────────────────────────────────

describe("calculateIVO — metadados", () => {
  test("totalRespondents = maior n entre pilares visíveis", () => {
    const r = calculateIVO(
      input([
        { pillarId: "energia", mean: 4, n: 12 },
        { pillarId: "proposito", mean: 4, n: 30 },
        { pillarId: "confianca", mean: 4, n: 3 }, // oculto, não conta
      ]),
      FRAMEWORK,
    );
    expect(r.totalRespondents).toBe(30);
  });

  test("propaga disclaimer e identificadores do input", () => {
    const r = calculateIVO(input([]), FRAMEWORK);
    expect(r.disclaimer).toContain("experimental");
    expect(r.organizationId).toBe("org-1");
    expect(r.cycleId).toBe("2026-Q1");
  });

  test("sampleItems limitado a 2 itens", () => {
    const r = calculateIVO(input([{ pillarId: "energia", mean: 4, n: 10 }]), FRAMEWORK);
    const energia = r.lenses[0]!.pillars.find((p) => p.pillarId === "energia")!;
    expect(energia.sampleItems).toHaveLength(2);
  });
});
