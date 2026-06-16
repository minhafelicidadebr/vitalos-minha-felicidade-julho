import { describe, expect, test } from "bun:test";
import { deriveLiveMissions, type LiveMissionContext } from "./live-economy";
import type { AntiGamingRules } from "./gamification-engine";

const RULES: AntiGamingRules = { xpDailyCap: 100 } as AntiGamingRules;

function ctx(over: Partial<LiveMissionContext> = {}): LiveMissionContext {
  return {
    waveOpen: true,
    waveInstrument: "PERMA+V / IVO",
    alreadyResponded: false,
    topPriorityLabel: "Rituais de reconhecimento",
    recommendedPathTitle: "Energia que se Renova",
    ...over,
  };
}

describe("live-economy — missões derivam do laço", () => {
  test("contexto completo → 3 missões, uma por eixo", () => {
    const m = deriveLiveMissions(ctx(), RULES);
    expect(m.map((x) => x.axis)).toEqual(["mensurar", "transformar", "educar"]);
  });

  test("já respondeu → sem missão de Mensurar", () => {
    const m = deriveLiveMissions(ctx({ alreadyResponded: true }), RULES);
    expect(m.some((x) => x.axis === "mensurar")).toBe(false);
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
});
