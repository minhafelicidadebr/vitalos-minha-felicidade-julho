export type OutcomeScenario = {
  reference: number;
  alternative: number;
  unitValue: number;
  actionCost: number;
};
const MAX_QUANTITY = 1_000_000;
const MAX_VALUE = 10_000_000;

export function calculateOutcomeScenario(input: OutcomeScenario) {
  const { reference, alternative, unitValue, actionCost } = input;
  const valid = (value: number, max: number) => Number.isFinite(value) && value >= 0 && value <= max;
  if (!valid(reference, MAX_QUANTITY) || !valid(alternative, MAX_QUANTITY) ||
      !valid(unitValue, MAX_VALUE) || !valid(actionCost, MAX_VALUE)) return null;
  const unitCents = Math.round(unitValue * 100);
  const actionCents = Math.round(actionCost * 100);
  const delta = alternative === reference ? 0 : reference - alternative;
  const avoidedCents = Math.round(delta * unitCents) || 0;
  return {
    delta,
    avoidedValue: avoidedCents / 100,
    netValue: (avoidedCents - actionCents) / 100,
    breakEvenUnits: unitCents > 0 ? actionCents / unitCents : null,
  };
}
