import { describe, expect, test } from "bun:test";
import {
  projectForecast,
  ivoFromPillars,
  maturityFor,
  CEILING,
  NATURAL_DRIFT,
  type ForecastInput,
  type ForecastLever,
  type ForecastPillar,
  type MaturityBand,
} from "./forecast-engine";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MATURITY: MaturityBand[] = [
  { min: 0, max: 499, name: "Inicial" },
  { min: 500, max: 799, name: "Saudável" },
  { min: 800, max: 1000, name: "Referência" },
];

// 4 pilares, pesos somam 1.0
function pillars(overrides: Partial<Record<string, number>> = {}): ForecastPillar[] {
  return [
    {
      pillarId: "energia",
      name: "Energia",
      weight: 0.25,
      score: overrides.energia ?? 500,
      visible: true,
    },
    {
      pillarId: "seguranca",
      name: "Segurança",
      weight: 0.25,
      score: overrides.seguranca ?? 500,
      visible: true,
    },
    {
      pillarId: "clareza",
      name: "Clareza",
      weight: 0.25,
      score: overrides.clareza ?? 500,
      visible: true,
    },
    {
      pillarId: "cultura",
      name: "Cultura",
      weight: 0.25,
      score: overrides.cultura ?? 500,
      visible: true,
    },
  ];
}

const LEVERS: ForecastLever[] = [
  {
    id: "lever_energia",
    label: "Gestão de energia",
    description: "Pausas e carga sustentável",
    targetPillarIds: ["energia"],
    pointsPerSeason: 60,
    effort: "medio",
    evidenceLevel: "rct",
  },
  {
    id: "lever_seguranca",
    label: "Segurança psicológica",
    description: "Rituais de voz",
    targetPillarIds: ["seguranca", "clareza"],
    pointsPerSeason: 40,
    effort: "alto",
    evidenceLevel: "meta-analise",
  },
];

function input(over: Partial<ForecastInput> = {}): ForecastInput {
  return {
    pillars: pillars(),
    levers: LEVERS,
    activeLeverIds: [],
    seasons: 4,
    scenario: "medio",
    maturityLevels: MATURITY,
    ...over,
  };
}

// ─── ivoFromPillars / maturityFor ────────────────────────────────────────────

describe("ivoFromPillars", () => {
  test("média ponderada dos pilares", () => {
    expect(ivoFromPillars(pillars())).toBe(500);
    expect(ivoFromPillars(pillars({ energia: 1000 }))).toBe(625); // 0.25*1000 + 0.75*500
  });
});

describe("maturityFor", () => {
  test("encontra a faixa correta", () => {
    expect(maturityFor(300, MATURITY)).toBe("Inicial");
    expect(maturityFor(600, MATURITY)).toBe("Saudável");
    expect(maturityFor(850, MATURITY)).toBe("Referência");
  });
  test("sem bandas → null", () => {
    expect(maturityFor(600)).toBeNull();
  });
});

// ─── Baseline ────────────────────────────────────────────────────────────────

describe("projectForecast — baseline", () => {
  test("baselineIvo = IVO atual dos pilares", () => {
    const r = projectForecast(input());
    expect(r.baselineIvo).toBe(500);
    expect(r.baselineMaturity).toBe("Saudável");
  });

  test("horizonte define o número de passos", () => {
    expect(projectForecast(input({ seasons: 4 })).steps).toHaveLength(4);
    expect(projectForecast(input({ seasons: 1 })).steps).toHaveLength(1);
  });

  test("horizonte mínimo de 1 temporada", () => {
    expect(projectForecast(input({ seasons: 0 })).steps).toHaveLength(1);
  });
});

// ─── Recuo natural sem alavancas ─────────────────────────────────────────────

describe("projectForecast — sem alavancas", () => {
  test("pilares visíveis recuam → IVO final < baseline", () => {
    const r = projectForecast(input({ activeLeverIds: [] }));
    expect(r.finalIvo).toBeLessThan(r.baselineIvo);
    expect(r.ivoDelta).toBeLessThan(0);
  });

  test("recuo é de NATURAL_DRIFT por temporada por pilar", () => {
    const r = projectForecast(input({ seasons: 1, activeLeverIds: [] }));
    // todos pilares 500 → 500 + (-4) = 496 ; IVO = 496
    expect(r.finalIvo).toBe(500 + NATURAL_DRIFT);
  });
});

// ─── Alavancas elevam ────────────────────────────────────────────────────────

describe("projectForecast — com alavancas", () => {
  test("alavanca ativa eleva pilar-alvo → IVO sobe", () => {
    const r = projectForecast(input({ activeLeverIds: ["lever_energia"] }));
    expect(r.finalIvo).toBeGreaterThan(r.baselineIvo);
    const energia = r.pillarShifts.find((p) => p.pillarId === "energia")!;
    expect(energia.delta).toBeGreaterThan(0);
  });

  test("pilares não-alvo recuam enquanto o alvo sobe", () => {
    const r = projectForecast(input({ seasons: 2, activeLeverIds: ["lever_energia"] }));
    const cultura = r.pillarShifts.find((p) => p.pillarId === "cultura")!;
    expect(cultura.delta).toBeLessThan(0);
  });

  test("alavanca multi-pilar eleva todos os seus alvos", () => {
    const r = projectForecast(input({ activeLeverIds: ["lever_seguranca"] }));
    expect(r.pillarShifts.find((p) => p.pillarId === "seguranca")!.delta).toBeGreaterThan(0);
    expect(r.pillarShifts.find((p) => p.pillarId === "clareza")!.delta).toBeGreaterThan(0);
  });

  test("pillarShifts ordenado por delta decrescente", () => {
    const r = projectForecast(input({ activeLeverIds: ["lever_energia", "lever_seguranca"] }));
    const deltas = r.pillarShifts.map((p) => p.delta);
    for (let i = 1; i < deltas.length; i++) {
      expect(deltas[i - 1]!).toBeGreaterThanOrEqual(deltas[i]!);
    }
  });
});

// ─── Retornos decrescentes ───────────────────────────────────────────────────

describe("projectForecast — retornos decrescentes", () => {
  test("pilar baixo ganha mais que pilar alto com a mesma alavanca", () => {
    const low = projectForecast(
      input({ pillars: pillars({ energia: 200 }), seasons: 1, activeLeverIds: ["lever_energia"] }),
    );
    const high = projectForecast(
      input({ pillars: pillars({ energia: 800 }), seasons: 1, activeLeverIds: ["lever_energia"] }),
    );
    const lowGain = low.pillarShifts.find((p) => p.pillarId === "energia")!.delta;
    const highGain = high.pillarShifts.find((p) => p.pillarId === "energia")!.delta;
    expect(lowGain).toBeGreaterThan(highGain);
  });

  test("pilar não ultrapassa o teto de 1000", () => {
    const r = projectForecast(
      input({ pillars: pillars({ energia: 995 }), seasons: 8, activeLeverIds: ["lever_energia"] }),
    );
    const energia = r.projectedPillars.find((p) => p.pillarId === "energia")!;
    expect(energia.score).toBeLessThanOrEqual(1000);
  });
});

// ─── Cenários ────────────────────────────────────────────────────────────────

describe("projectForecast — cenários", () => {
  test("otimista > médio > conservador em ganho", () => {
    const base = { activeLeverIds: ["lever_energia"], seasons: 3 };
    const cons = projectForecast(input({ ...base, scenario: "conservador" })).ivoDelta;
    const med = projectForecast(input({ ...base, scenario: "medio" })).ivoDelta;
    const otim = projectForecast(input({ ...base, scenario: "otimista" })).ivoDelta;
    expect(otim).toBeGreaterThan(med);
    expect(med).toBeGreaterThan(cons);
  });
});

// ─── k-anonimato ─────────────────────────────────────────────────────────────

describe("projectForecast — k-anonimato", () => {
  test("pilar oculto não é projetado (permanece constante)", () => {
    const withHidden = pillars();
    withHidden[0] = { ...withHidden[0]!, visible: false, score: 500 };
    const r = projectForecast(
      input({ pillars: withHidden, seasons: 3, activeLeverIds: ["lever_energia"] }),
    );
    const energia = r.projectedPillars.find((p) => p.pillarId === "energia")!;
    expect(energia.score).toBe(500); // inalterado apesar da alavanca
    // e não aparece em pillarShifts (só visíveis)
    expect(r.pillarShifts.find((p) => p.pillarId === "energia")).toBeUndefined();
  });
});

// ─── Banda de confiança ──────────────────────────────────────────────────────

describe("projectForecast — banda de confiança", () => {
  test("banda alarga com o horizonte", () => {
    const r = projectForecast(input({ activeLeverIds: ["lever_energia"], seasons: 4 }));
    const w1 = r.steps[0]!.ivoHigh - r.steps[0]!.ivoLow;
    const w4 = r.steps[3]!.ivoHigh - r.steps[3]!.ivoLow;
    expect(w4).toBeGreaterThan(w1);
  });

  test("banda respeita limites [0,1000]", () => {
    const r = projectForecast(
      input({
        pillars: pillars({ energia: 990, seguranca: 990, clareza: 990, cultura: 990 }),
        activeLeverIds: ["lever_energia"],
      }),
    );
    for (const step of r.steps) {
      expect(step.ivoHigh).toBeLessThanOrEqual(1000);
      expect(step.ivoLow).toBeGreaterThanOrEqual(0);
    }
  });
});

// ─── Metadados ───────────────────────────────────────────────────────────────

describe("projectForecast — metadados", () => {
  test("expõe alavancas ativas, cenário e premissas honestas", () => {
    const r = projectForecast(input({ activeLeverIds: ["lever_energia"], scenario: "otimista" }));
    expect(r.activeLeverIds).toEqual(["lever_energia"]);
    expect(r.scenario).toBe("otimista");
    expect(r.assumptions.length).toBeGreaterThanOrEqual(3);
    expect(r.assumptions.join(" ")).toContain("estimativa");
  });

  test("CEILING aplicado de forma coerente", () => {
    expect(CEILING).toBe(900);
  });
});
