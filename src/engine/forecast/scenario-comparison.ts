import type { ForecastResult } from "./forecast-engine";

/** Two conditional paths over the same synthetic starting point. */
export function compareForecastScenarios(forecast: ForecastResult) {
  const reference = forecast.baselineIvo;
  const hasActions = forecast.activeLeverIds.length > 0;
  return [
    { season: 0, reference, alternative: reference },
    ...forecast.steps.map(({ season, ivo }) => ({
      season,
      reference,
      alternative: hasActions ? ivo : reference,
    })),
  ];
}
