import { describe, expect, test } from "bun:test";
import { rankPriorities, EFFORT_WEIGHT, DEFAULT_TARGET } from "./priority-engine";
import type { ForecastLever, ForecastPillar } from "../forecast/forecast-engine";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function pillars(over: Partial<Record<string, number>> = {}): ForecastPillar[] {
  return [
    {
      pillarId: "energia",
      name: "Energia",
      weight: 0.25,
      score: over.energia ?? 500,
      visible: true,
    },
    {
      pillarId: "seguranca",
      name: "Segurança",
      weight: 0.25,
      score: over.seguranca ?? 500,
      visible: true,
    },
    {
      pillarId: "clareza",
      name: "Clareza",
      weight: 0.25,
      score: over.clareza ?? 500,
      visible: true,
    },
    {
      pillarId: "cultura",
      name: "Cultura",
      weight: 0.25,
      score: over.cultura ?? 500,
      visible: true,
    },
  ];
}

const LEVERS: ForecastLever[] = [
  {
    id: "forte",
    label: "Alavanca forte",
    description: "Alto ganho",
    targetPillarIds: ["energia"],
    pointsPerSeason: 80,
    effort: "alto",
    evidenceLevel: "meta-analise",
  },
  {
    id: "barata",
    label: "Alavanca barata",
    description: "Ganho médio, esforço baixo",
    targetPillarIds: ["seguranca"],
    pointsPerSeason: 40,
    effort: "baixo",
    evidenceLevel: "rct",
  },
  {
    id: "fraca",
    label: "Alavanca fraca",
    description: "Baixo ganho",
    targetPillarIds: ["clareza"],
    pointsPerSeason: 10,
    effort: "medio",
    evidenceLevel: "observacional",
  },
];

// ─── Ranking ──────────────────────────────────────────────────────────────────

describe("rankPriorities — ranking", () => {
  test("ordena por alavancagem (expectedIvoLift) decrescente", () => {
    const r = rankPriorities(pillars(), LEVERS);
    const lifts = r.items.map((i) => i.expectedIvoLift);
    for (let i = 1; i < lifts.length; i++) expect(lifts[i - 1]!).toBeGreaterThanOrEqual(lifts[i]!);
  });

  test("rank começa em 1 e é sequencial", () => {
    const r = rankPriorities(pillars(), LEVERS);
    expect(r.items.map((i) => i.rank)).toEqual([1, 2, 3]);
  });

  test("alavanca mais forte fica em primeiro", () => {
    const r = rankPriorities(pillars(), LEVERS);
    expect(r.items[0]!.leverId).toBe("forte");
  });
});

// ─── Impacto por esforço / vitórias rápidas ──────────────────────────────────

describe("rankPriorities — impacto/esforço", () => {
  test("impactPerEffort = lift / peso de esforço", () => {
    const r = rankPriorities(pillars(), LEVERS);
    const forte = r.items.find((i) => i.leverId === "forte")!;
    expect(forte.impactPerEffort).toBeCloseTo(forte.expectedIvoLift / EFFORT_WEIGHT.alto, 1);
  });

  test("a alavanca barata (esforço baixo) entra nas vitórias rápidas", () => {
    const r = rankPriorities(pillars(), LEVERS);
    expect(r.quickWinIds).toContain("barata");
    expect(r.items.find((i) => i.leverId === "barata")!.isQuickWin).toBe(true);
  });

  test("quickWinCount limita o número de vitórias rápidas", () => {
    const r = rankPriorities(pillars(), LEVERS, { quickWinCount: 1 });
    expect(r.quickWinIds).toHaveLength(1);
  });
});

// ─── Lacuna (gap) ────────────────────────────────────────────────────────────

describe("rankPriorities — lacuna", () => {
  test("gap = max(0, target − score)", () => {
    const r = rankPriorities(pillars({ energia: 300 }), LEVERS, { target: 800 });
    const forte = r.items.find((i) => i.leverId === "forte")!;
    expect(forte.addressedPillars[0]!.gap).toBe(500);
  });

  test("pilar acima do alvo tem gap 0", () => {
    const r = rankPriorities(pillars({ energia: 900 }), LEVERS, { target: 800 });
    const forte = r.items.find((i) => i.leverId === "forte")!;
    expect(forte.addressedPillars[0]!.gap).toBe(0);
  });

  test("target padrão é 800", () => {
    expect(DEFAULT_TARGET).toBe(800);
  });
});

// ─── k-anonimato ─────────────────────────────────────────────────────────────

describe("rankPriorities — k-anonimato", () => {
  test("pilar-alvo oculto reduz lift e é contado", () => {
    const hidden = pillars();
    hidden[0] = { ...hidden[0]!, visible: false }; // energia oculto
    const r = rankPriorities(hidden, LEVERS);
    const forte = r.items.find((i) => i.leverId === "forte")!;
    expect(forte.expectedIvoLift).toBe(0);
    expect(forte.hiddenTargetCount).toBe(1);
    expect(forte.addressedPillars).toHaveLength(0);
  });
});

// ─── Cenário e bordas ────────────────────────────────────────────────────────

describe("rankPriorities — cenário e bordas", () => {
  test("cenário otimista eleva as alavancagens vs conservador", () => {
    const cons = rankPriorities(pillars(), LEVERS, { scenario: "conservador" });
    const otim = rankPriorities(pillars(), LEVERS, { scenario: "otimista" });
    const consTop = cons.items[0]!.expectedIvoLift;
    const otimTop = otim.items.find((i) => i.leverId === cons.items[0]!.leverId)!.expectedIvoLift;
    expect(otimTop).toBeGreaterThan(consTop);
  });

  test("lista de alavancas vazia → resultado vazio", () => {
    const r = rankPriorities(pillars(), []);
    expect(r.items).toHaveLength(0);
    expect(r.quickWinIds).toHaveLength(0);
  });

  test("propaga target e cenário escolhidos", () => {
    const r = rankPriorities(pillars(), LEVERS, { target: 700, scenario: "otimista" });
    expect(r.target).toBe(700);
    expect(r.scenario).toBe("otimista");
  });
});
