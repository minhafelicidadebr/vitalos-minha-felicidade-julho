import { describe, expect, test } from "bun:test";
import {
  computeSeasonOverview,
  resolvePosition,
  clampProgramWeek,
  toProgramWeek,
  totalProgramWeeks,
  type AnnualPlan,
  type MetePhaseDef,
} from "./season-engine";

// ─── Plano mínimo: 2 temporadas × 8 semanas, fases M.E.T.E. 2/2/2/2 ──────────

const PHASES: MetePhaseDef[] = [
  {
    id: "mensurar",
    label: "Mensurar",
    weekStart: 1,
    weekEnd: 2,
    objective: "Medir",
    instruments: ["IVO"],
    deliverable: "baseline",
  },
  {
    id: "educar",
    label: "Educar",
    weekStart: 3,
    weekEnd: 4,
    objective: "Educar",
    instruments: ["Devolutiva"],
    deliverable: "workshops",
  },
  {
    id: "transformar",
    label: "Transformar",
    weekStart: 5,
    weekEnd: 6,
    objective: "Transformar",
    instruments: ["Lab"],
    deliverable: "experimentos",
  },
  {
    id: "evoluir",
    label: "Evoluir",
    weekStart: 7,
    weekEnd: 8,
    objective: "Evoluir",
    instruments: ["Pulse"],
    deliverable: "evidências",
  },
];

const PLAN: AnnualPlan = {
  year: 2026,
  weeksPerSeason: 8,
  seasons: [
    {
      id: "s1",
      index: 1,
      name: "Temporada Um",
      cycleId: "T1",
      layer: 2,
      layerLabel: "Florescimento",
      question: "Como as pessoas estão?",
      primaryInstrument: "IVO/PERMA",
      color: "#10B981",
      startLabel: "Jan–Mar",
      phases: PHASES,
      activities: [
        { week: 1, title: "Abrir IVO", owner: "RH", phaseId: "mensurar" },
        { week: 5, title: "Iniciar experimento", owner: "Líder", phaseId: "transformar" },
        { week: 5, title: "Selecionar protocolo", owner: "RH", phaseId: "transformar" },
      ],
    },
    {
      id: "s2",
      index: 2,
      name: "Temporada Dois",
      cycleId: "T2",
      layer: 3,
      layerLabel: "Forças",
      question: "Como cada um contribui?",
      primaryInstrument: "VIA-T",
      color: "#F59E0B",
      startLabel: "Abr–Jun",
      phases: PHASES,
      activities: [{ week: 1, title: "Abrir VIA-T", owner: "RH", phaseId: "mensurar" }],
    },
  ],
};

// ─── Aritmética da trilha ─────────────────────────────────────────────────────

describe("aritmética da trilha", () => {
  test("totalProgramWeeks = temporadas × semanas", () => {
    expect(totalProgramWeeks(PLAN)).toBe(16);
  });

  test("toProgramWeek converte (temporada, semana) → semana global", () => {
    expect(toProgramWeek(PLAN, 1, 1)).toBe(1);
    expect(toProgramWeek(PLAN, 1, 8)).toBe(8);
    expect(toProgramWeek(PLAN, 2, 1)).toBe(9);
    expect(toProgramWeek(PLAN, 2, 8)).toBe(16);
  });

  test("clampProgramWeek respeita limites [1, total]", () => {
    expect(clampProgramWeek(PLAN, 0)).toBe(1);
    expect(clampProgramWeek(PLAN, -5)).toBe(1);
    expect(clampProgramWeek(PLAN, 99)).toBe(16);
    expect(clampProgramWeek(PLAN, 7.8)).toBe(7);
  });
});

// ─── resolvePosition ──────────────────────────────────────────────────────────

describe("resolvePosition", () => {
  test("semana 1 → T1, semana 1, mensurar", () => {
    const p = resolvePosition(PLAN, 1);
    expect(p.seasonIndex).toBe(1);
    expect(p.weekInSeason).toBe(1);
    expect(p.phaseId).toBe("mensurar");
  });

  test("semana 5 → T1, semana 5, transformar", () => {
    const p = resolvePosition(PLAN, 5);
    expect(p.seasonIndex).toBe(1);
    expect(p.weekInSeason).toBe(5);
    expect(p.phaseId).toBe("transformar");
  });

  test("semana 9 → T2, semana 1, mensurar (boundary)", () => {
    const p = resolvePosition(PLAN, 9);
    expect(p.seasonIndex).toBe(2);
    expect(p.weekInSeason).toBe(1);
    expect(p.phaseId).toBe("mensurar");
  });

  test("semana 16 → T2, semana 8, evoluir", () => {
    const p = resolvePosition(PLAN, 16);
    expect(p.seasonIndex).toBe(2);
    expect(p.weekInSeason).toBe(8);
    expect(p.phaseId).toBe("evoluir");
  });
});

// ─── Status de temporadas ─────────────────────────────────────────────────────

describe("computeSeasonOverview — status de temporada", () => {
  test("na T1: T1 atual, T2 futura", () => {
    const o = computeSeasonOverview(PLAN, 5);
    expect(o.seasons[0]!.status).toBe("atual");
    expect(o.seasons[1]!.status).toBe("futura");
  });

  test("na T2: T1 concluída, T2 atual", () => {
    const o = computeSeasonOverview(PLAN, 10);
    expect(o.seasons[0]!.status).toBe("concluida");
    expect(o.seasons[1]!.status).toBe("atual");
  });

  test("temporada concluída → progresso 100, futura → 0", () => {
    const o = computeSeasonOverview(PLAN, 10);
    expect(o.seasons[0]!.progressPct).toBe(100);
    // T2 semana 2 de 8 → 25
    expect(o.seasons[1]!.progressPct).toBe(25);
  });
});

// ─── Status de fases ──────────────────────────────────────────────────────────

describe("computeSeasonOverview — status de fase", () => {
  test("na semana 5 (transformar): mensurar/educar concluídas, transformar atual, evoluir futura", () => {
    const o = computeSeasonOverview(PLAN, 5);
    const phases = o.currentSeason.phases;
    expect(phases.find((p) => p.id === "mensurar")!.status).toBe("concluida");
    expect(phases.find((p) => p.id === "educar")!.status).toBe("concluida");
    expect(phases.find((p) => p.id === "transformar")!.status).toBe("atual");
    expect(phases.find((p) => p.id === "evoluir")!.status).toBe("futura");
  });

  test("fase concluída → progresso 100, futura → 0", () => {
    const o = computeSeasonOverview(PLAN, 5);
    const phases = o.currentSeason.phases;
    expect(phases.find((p) => p.id === "mensurar")!.progressPct).toBe(100);
    expect(phases.find((p) => p.id === "evoluir")!.progressPct).toBe(0);
  });

  test("fase atual com progresso parcial", () => {
    // semana 5 = primeira semana de transformar (5–6) → 1 de 2 → 50%
    const o = computeSeasonOverview(PLAN, 5);
    expect(o.currentPhase.id).toBe("transformar");
    expect(o.currentPhase.progressPct).toBe(50);
  });

  test("temporada futura tem todas as fases futuras", () => {
    const o = computeSeasonOverview(PLAN, 5);
    expect(o.seasons[1]!.phases.every((p) => p.status === "futura")).toBe(true);
  });
});

// ─── Próximo marco ────────────────────────────────────────────────────────────

describe("computeSeasonOverview — próximo marco", () => {
  test("dentro da temporada → próxima fase", () => {
    const o = computeSeasonOverview(PLAN, 5); // transformar (5-6), próxima evoluir (7)
    expect(o.nextMilestone?.kind).toBe("fase");
    expect(o.nextMilestone?.label).toBe("Evoluir");
    expect(o.nextMilestone?.weeksAway).toBe(2); // 7 - 5
  });

  test("na última fase → próxima temporada", () => {
    const o = computeSeasonOverview(PLAN, 7); // evoluir (7-8), última da T1
    expect(o.nextMilestone?.kind).toBe("temporada");
    expect(o.nextMilestone?.label).toBe("Temporada Dois");
    expect(o.nextMilestone?.weeksAway).toBe(2); // 8 - 7 + 1
  });

  test("fim do programa → sem próximo marco", () => {
    const o = computeSeasonOverview(PLAN, 16); // última semana da última temporada
    expect(o.nextMilestone).toBeNull();
  });
});

// ─── Atividades da semana ─────────────────────────────────────────────────────

describe("computeSeasonOverview — atividades", () => {
  test("retorna atividades da semana corrente", () => {
    const o = computeSeasonOverview(PLAN, 5); // semana 5 da T1: 2 atividades
    expect(o.currentActivities).toHaveLength(2);
    expect(o.currentActivities.map((a) => a.owner)).toEqual(["Líder", "RH"]);
  });

  test("fallback para atividades da fase quando a semana não tem nenhuma", () => {
    const o = computeSeasonOverview(PLAN, 6); // semana 6 = transformar, sem atividade na semana 6
    // fallback: todas atividades da fase transformar (week 5)
    expect(o.currentActivities.length).toBeGreaterThan(0);
    expect(o.currentActivities.every((a) => a.phaseId === "transformar")).toBe(true);
  });
});

// ─── Progresso do ano e metadados ────────────────────────────────────────────

describe("computeSeasonOverview — ano", () => {
  test("yearProgressPct = semana / total", () => {
    const o = computeSeasonOverview(PLAN, 8); // 8 de 16 → 50%
    expect(o.yearProgressPct).toBe(50);
  });

  test("clampa semana fora do intervalo", () => {
    const o = computeSeasonOverview(PLAN, 999);
    expect(o.programWeek).toBe(16);
    expect(o.position.seasonIndex).toBe(2);
  });

  test("propaga ano e total de semanas", () => {
    const o = computeSeasonOverview(PLAN, 1);
    expect(o.year).toBe(2026);
    expect(o.totalWeeks).toBe(16);
  });
});
