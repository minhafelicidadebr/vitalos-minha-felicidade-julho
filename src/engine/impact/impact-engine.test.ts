import { describe, expect, it } from "bun:test";
import { buildImpactReport, type ImpactInput } from "./impact-engine";

const BASE: ImpactInput = {
  programWeeks: 13,
  employees: 480,
  ivoScoreBefore: 520,
  ivoScoreAfter: 614,
  lensDeltas: [
    { lensId: "eu", lensLabel: "EU", before: 510, after: 598, delta: 88, direction: "alta" },
    { lensId: "nos", lensLabel: "NÓS", before: 530, after: 620, delta: 90, direction: "alta" },
  ],
  avoidedCostBRL: 780_000,
  estimatedProgramCostBRL: 240_000,
  experimentsTotal: 3,
  experimentsConfirmed: 2,
  certGranted: false,
  certTierLabel: "Em jornada",
  certEssentialMet: 3,
  certEssentialTotal: 5,
};

describe("buildImpactReport", () => {
  it("calcula delta IVO corretamente", () => {
    const r = buildImpactReport(BASE);
    expect(r.ivoOverall.delta).toBe(94);
    expect(r.ivoOverall.direction).toBe("alta");
  });

  it("delta negativo → direção queda", () => {
    const r = buildImpactReport({ ...BASE, ivoScoreAfter: 400 });
    expect(r.ivoOverall.direction).toBe("queda");
  });

  it("delta pequeno → direção estavel", () => {
    const r = buildImpactReport({ ...BASE, ivoScoreAfter: 522 });
    expect(r.ivoOverall.direction).toBe("estavel");
  });

  it("ROI calculado corretamente", () => {
    const r = buildImpactReport(BASE);
    expect(r.roi.ratio).toBeCloseTo(3.25, 1);
    expect(r.roi.label).toContain("×");
  });

  it("ROI zero quando custo de programa é zero", () => {
    const r = buildImpactReport({ ...BASE, estimatedProgramCostBRL: 0 });
    expect(r.roi.ratio).toBe(0);
  });

  it("nível de evidência robusto com 2 confirmados", () => {
    const r = buildImpactReport(BASE);
    expect(r.evidenceLevel).toBe("robusto");
  });

  it("nível referencia com score alto e 2+ confirmados", () => {
    const r = buildImpactReport({ ...BASE, ivoScoreAfter: 680, experimentsConfirmed: 2, experimentsTotal: 3 });
    expect(r.evidenceLevel).toBe("referencia");
  });

  it("nível inicial sem experimentos confirmados", () => {
    const r = buildImpactReport({ ...BASE, experimentsConfirmed: 0, ivoScoreAfter: 400 });
    expect(r.evidenceLevel).toBe("inicial");
  });

  it("maturidade ≤ 100", () => {
    const r = buildImpactReport(BASE);
    expect(r.maturity.score).toBeLessThanOrEqual(100);
    expect(r.maturity.score).toBeGreaterThan(0);
  });

  it("maturidade sobe com certificação concedida", () => {
    const rSem = buildImpactReport({ ...BASE, certGranted: false });
    const rCom = buildImpactReport({ ...BASE, certGranted: true });
    expect(rCom.maturity.score).toBeGreaterThanOrEqual(rSem.maturity.score);
  });

  it("6 seções no relatório", () => {
    const r = buildImpactReport(BASE);
    expect(r.sections.length).toBe(6);
  });

  it("proofSentence menciona delta IVO", () => {
    const r = buildImpactReport(BASE);
    expect(r.proofSentence).toContain("94");
  });

  it("lensDeltas preservados no relatório", () => {
    const r = buildImpactReport(BASE);
    expect(r.lensDeltas.length).toBe(2);
    expect(r.lensDeltas[0]!.lensId).toBe("eu");
  });

  it("disclaimer sempre presente", () => {
    const r = buildImpactReport(BASE);
    expect(r.disclaimer.length).toBeGreaterThan(0);
  });

  it("não quebra com score NaN — faixa de maturidade sempre resolve", () => {
    // Regressão: campos undefined (ex.: nome de campo errado no mock) viravam NaN
    // e a busca de faixa retornava undefined → crash em .band.
    const r = buildImpactReport({ ...BASE, ivoScoreAfter: NaN, certEssentialTotal: 0 });
    expect(r.maturity.band).toBeDefined();
    expect(Number.isFinite(r.maturity.score)).toBe(true);
  });
});
