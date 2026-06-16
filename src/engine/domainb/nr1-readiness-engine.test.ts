import { describe, expect, test } from "bun:test";
import { summarizeNR1Readiness, type NR1Input } from "./nr1-readiness-engine";

function base(over: Partial<NR1Input> = {}): NR1Input {
  return {
    copsoqDimensions: [
      { band: "favorável" },
      { band: "favorável" },
      { band: "intermediário" },
      { band: "risco" },
    ],
    riskExposures: [
      { exposure: "baixa", actionsOpen: 0 },
      { exposure: "alta", actionsOpen: 2 },
      { exposure: "moderada", actionsOpen: 1 },
    ],
    checklist: [{ done: true }, { done: true }, { done: false }, { done: false }],
    ...over,
  };
}

describe("nr1-readiness — síntese educativa", () => {
  test("conta dimensões por faixa e identifica risco", () => {
    const r = summarizeNR1Readiness(base());
    expect(r.dimensionsByBand.favorável).toBe(2);
    expect(r.dimensionsByBand.risco).toBe(1);
    expect(r.riskDimensions).toBe(1);
  });

  test("soma ações em aberto e conta exposição alta", () => {
    const r = summarizeNR1Readiness(base());
    expect(r.openActions).toBe(3);
    expect(r.highExposureRisks).toBe(1);
  });

  test("checklist vira percentual", () => {
    const r = summarizeNR1Readiness(base());
    expect(r.checklistDone).toBe(2);
    expect(r.checklistTotal).toBe(4);
    expect(r.checklistPct).toBe(50);
  });

  test("SEMPRE remete ao profissional habilitado — nunca substitui o PGR", () => {
    const comRisco = summarizeNR1Readiness(base());
    const semRisco = summarizeNR1Readiness(
      base({ copsoqDimensions: [{ band: "favorável" }], riskExposures: [] }),
    );
    expect(comRisco.readinessNote).toContain("profissional legalmente habilitado");
    expect(semRisco.readinessNote).toContain("profissional legalmente habilitado");
  });
});
