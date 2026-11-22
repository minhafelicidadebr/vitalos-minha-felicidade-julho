import { expect, test } from "bun:test";
import { calculateOutcomeScenario } from "./outcome-scenario";

const input = { reference: 100, alternative: 75, unitValue: 300, actionCost: 6000 };

test("separa valor bruto, saldo e ponto de equilíbrio", () => {
  expect(calculateOutcomeScenario(input)).toEqual({
    delta: 25, avoidedValue: 7500, netValue: 1500, breakEvenUnits: 20,
  });
});
test("mantém perda, resultado zero e hipótese sem efeito distintos", () => {
  expect(calculateOutcomeScenario({ ...input, alternative: 105 })?.netValue).toBe(-7500);
  expect(calculateOutcomeScenario({ ...input, alternative: 80 })?.netValue).toBe(0);
  expect(calculateOutcomeScenario({ ...input, alternative: 100 })?.netValue).toBe(-6000);
});
test("distingue dados inválidos de zero e não divide por zero", () => {
  expect(calculateOutcomeScenario({ ...input, unitValue: 0 })).toEqual({
    delta: 25, avoidedValue: 0, netValue: -6000, breakEvenUnits: null,
  });
  for (const invalid of [NaN, Infinity, -1, 10_000_001]) {
    expect(calculateOutcomeScenario({ ...input, unitValue: invalid })).toBeNull();
  }
});
