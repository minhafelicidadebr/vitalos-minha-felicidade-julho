import { expect, test } from "bun:test";
import { projectForecast } from "./forecast-engine";
import { compareForecastScenarios } from "./scenario-comparison";

const input = {
  pillars: [{ pillarId: "a", name: "A", score: 500, weight: 1, visible: true }],
  levers: [{ id: "trial", label: "Ação", description: "Hipótese", targetPillarIds: ["a"],
    pointsPerSeason: 45, effort: "baixo", evidenceLevel: "observacional" }] as const,
  seasons: 2,
  scenario: "medio" as const,
};

test("a hipótese sem efeito repete a base apesar da deriva do motor legado", () => {
  const forecast = projectForecast({ ...input, levers: [], activeLeverIds: [] });
  expect(forecast.finalIvo).toBe(492);
  expect(compareForecastScenarios(forecast).map((row) => row.alternative)).toEqual([500, 500, 500]);
});

test("a alternativa usa o cenário escolhido e a referência continua estável", () => {
  const [lever] = input.levers;
  const forecast = projectForecast({
    ...input, levers: [{ ...lever, targetPillarIds: [...lever.targetPillarIds] }], activeLeverIds: ["trial"],
  });
  const rows = compareForecastScenarios(forecast);
  expect(rows[1]).toEqual({ season: 1, reference: 500, alternative: 520 });
  expect(rows[2]?.alternative).toBe(forecast.finalIvo);
  expect(Object.keys(rows[1]!)).toEqual(["season", "reference", "alternative"]);
});
