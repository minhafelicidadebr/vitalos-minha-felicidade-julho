import { describe, expect, test } from "bun:test";
import { deriveLiveMissions, type LiveMissionContext } from "./live-economy";
import type { AntiGamingRules } from "./gamification-engine";

const RULES: AntiGamingRules = { xpDailyCap: 100 } as AntiGamingRules;

function ctx(over: Partial<LiveMissionContext> = {}): LiveMissionContext {
  return {
    waveOpen: true,
    waveId: "wave-1",
    waveInstrument: "PERMA+V / IVO",
    alreadyResponded: false,
    topPriorityId: "recognition",
    topPriorityLabel: "Rituais de reconhecimento",
    priorityEvidenceRecorded: false,
    recommendedPathId: "path-energy",
    recommendedPathTitle: "Energia que se Renova",
    recommendedPathCompletedModules: 0,
    recommendedPathTotalModules: 3,
    recommendedPathCompleted: false,
    ...over,
  };
}

describe("live-economy — missões derivam do laço", () => {
  test("contexto completo → 3 missões, uma por eixo", () => {
    const m = deriveLiveMissions(ctx(), RULES);
    expect(m.map((x) => x.axis)).toEqual(["mensurar", "transformar", "educar"]);
  });

  test("já respondeu → missão de Mensurar permanece como concluída", () => {
    const m = deriveLiveMissions(ctx({ alreadyResponded: true }), RULES);
    expect(m.find((x) => x.axis === "mensurar")?.status).toBe("completed");
  });

  test("onda fechada → sem missão de Mensurar", () => {
    const m = deriveLiveMissions(ctx({ waveOpen: false }), RULES);
    expect(m.some((x) => x.axis === "mensurar")).toBe(false);
  });

  test("sem prioridade/trilha → não fabrica missão", () => {
    const m = deriveLiveMissions(
      ctx({ topPriorityLabel: null, recommendedPathTitle: null }),
      RULES,
    );
    expect(m.map((x) => x.axis)).toEqual(["mensurar"]);
  });

  test("XP respeita o teto diário ético (clampXpAward)", () => {
    // Já ganhou 90 hoje, cap 100 → cada missão recebe no máximo 10.
    const m = deriveLiveMissions(ctx(), RULES, 90);
    expect(m.every((x) => x.xp <= 10)).toBe(true);
  });

  test("trilha expõe progresso real e prioridade fecha por evidência", () => {
    const missions = deriveLiveMissions(
      ctx({
        priorityEvidenceRecorded: true,
        recommendedPathCompletedModules: 2,
        recommendedPathTotalModules: 4,
      }),
      RULES,
    );

    expect(missions.find((mission) => mission.axis === "transformar")?.status).toBe("completed");
    expect(missions.find((mission) => mission.axis === "educar")?.progressPct).toBe(50);
    expect(missions.find((mission) => mission.axis === "educar")?.status).toBe("in_progress");
  });
});
