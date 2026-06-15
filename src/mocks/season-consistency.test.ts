import { describe, expect, test } from "bun:test";
import { computeSeasonOverview } from "@/engine/season/season-engine";
import { ANNUAL_PLAN, CURRENT_PROGRAM_WEEK } from "./season-mock";
import { MOCK_SEASON } from "./colaborador-mock";

// Trava a FONTE ÚNICA: o card de temporada do colaborador (MOCK_SEASON) deriva
// do season-engine. Estes testes garantem que ele nunca volte a divergir da
// rota /temporada — ambos leem o MESMO overview sobre o MESMO plano/semana.

const overview = computeSeasonOverview(ANNUAL_PLAN, CURRENT_PROGRAM_WEEK);

describe("MOCK_SEASON ↔ season-engine (fonte única)", () => {
  test("semana e fase batem com o overview", () => {
    expect(MOCK_SEASON.weekNumber).toBe(overview.position.weekInSeason);
    expect(MOCK_SEASON.phaseLabel).toBe(overview.currentPhase.label);
    expect(MOCK_SEASON.cycleId).toBe(overview.currentSeason.cycleId);
    expect(MOCK_SEASON.progressPct).toBe(overview.currentSeason.progressPct);
  });

  test("exatamente uma fase 'current' e o mapeamento done/current é consistente", () => {
    const current = MOCK_SEASON.phases.filter((p) => p.current);
    expect(current).toHaveLength(1);
    expect(current[0]!.label).toBe(overview.currentPhase.label);
    // done e current são mutuamente exclusivos
    expect(MOCK_SEASON.phases.every((p) => !(p.done && p.current))).toBe(true);
  });

  test("o número de fases reflete o M.E.T.E. da temporada", () => {
    expect(MOCK_SEASON.phases).toHaveLength(overview.currentSeason.phases.length);
    expect(MOCK_SEASON.totalWeeks).toBe(ANNUAL_PLAN.weeksPerSeason);
  });
});
