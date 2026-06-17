import { describe, expect, it } from "bun:test";
import { buildQuarterlyPlan, type ActionPlanInput, type ActionPlanSeason } from "./action-plan-engine";
import type { PriorityItem } from "../priority/priority-engine";

const SEASON: ActionPlanSeason = {
  name: "T1 — Florescimento",
  color: "#16A34A",
  totalWeeks: 13,
  currentWeek: 4,
  phaseLabel: "Transformar",
};

const makeItem = (id: string, lift: number, effort: "baixo" | "medio" | "alto", isQuickWin = false): PriorityItem => ({
  rank: 1,
  leverId: id,
  label: `Alavanca ${id}`,
  description: `Desc ${id}`,
  expectedIvoLift: lift,
  impactPerEffort: lift,
  isQuickWin,
  effort,
  evidenceLevel: "rct",
  addressedPillars: [],
  hiddenTargetCount: 0,
});

const META = [
  { leverId: "A", ambRef: { id: "amb-energia", name: "Guardiões da Energia", emoji: "⚡" }, lensId: "eu", lensLabel: "EU", lensColor: "#2563EB", esgCodes: ["ODS 3"] },
  { leverId: "B", ambRef: { id: "amb-equilibrio", name: "Defensores do Equilíbrio", emoji: "⚖️" }, lensId: "nos", lensLabel: "NÓS", lensColor: "#16A34A", esgCodes: [] },
  { leverId: "C", ambRef: { id: "amb-energia", name: "Guardiões da Energia", emoji: "⚡" }, lensId: "eu", lensLabel: "EU", lensColor: "#2563EB", esgCodes: [] },
  { leverId: "D", ambRef: { id: null, name: null, emoji: null }, lensId: null, lensLabel: null, lensColor: null, esgCodes: [] },
];

function makeInput(items: PriorityItem[], maxActions = 8): ActionPlanInput {
  return { season: SEASON, items, leverMeta: META, maxActions };
}

describe("buildQuarterlyPlan", () => {
  it("gera plano com ações ordenadas por rank", () => {
    const items = [makeItem("A", 30, "baixo", true), makeItem("B", 20, "medio"), makeItem("D", 10, "alto")];
    const plan = buildQuarterlyPlan(makeInput(items));
    expect(plan.actions.length).toBe(3);
    expect(plan.actions[0]!.leverId).toBe("A");
    expect(plan.actions[1]!.leverId).toBe("B");
  });

  it("conta vitórias rápidas corretamente", () => {
    const items = [makeItem("A", 30, "baixo", true), makeItem("B", 20, "medio", true), makeItem("D", 10, "alto")];
    const plan = buildQuarterlyPlan(makeInput(items));
    expect(plan.quickWinCount).toBe(2);
  });

  it("resposta esforço baixo = 4 semanas", () => {
    const plan = buildQuarterlyPlan(makeInput([makeItem("A", 30, "baixo")]));
    const a = plan.actions[0]!;
    expect(a.endWeek - a.startWeek + 1).toBe(4);
  });

  it("resposta esforço medio = 7 semanas", () => {
    const plan = buildQuarterlyPlan(makeInput([makeItem("B", 20, "medio")]));
    const a = plan.actions[0]!;
    expect(a.endWeek - a.startWeek + 1).toBe(7);
  });

  it("resposta esforço alto = 13 semanas (clamped ao total)", () => {
    const plan = buildQuarterlyPlan(makeInput([makeItem("D", 10, "alto")]));
    const a = plan.actions[0]!;
    expect(a.endWeek).toBeLessThanOrEqual(SEASON.totalWeeks);
  });

  it("escalonamento: mesma embaixadoria não começa na mesma semana", () => {
    // A e C compartilham amb-energia
    const items = [makeItem("A", 30, "baixo"), makeItem("C", 25, "baixo")];
    const plan = buildQuarterlyPlan(makeInput(items));
    const [first, second] = plan.actions;
    // C começa depois que A termina
    expect(second!.startWeek).toBeGreaterThan(first!.endWeek);
  });

  it("ação sem embaixadoria (null) não bloqueia outras sem embaixadoria", () => {
    const items = [makeItem("D", 30, "baixo"), makeItem("D", 25, "baixo")];
    // dois levers sem amb — não devem travar o plano
    const plan = buildQuarterlyPlan(makeInput(items, 2));
    expect(plan.actions.length).toBe(2);
  });

  it("status em_andamento quando currentWeek dentro do intervalo", () => {
    // currentWeek = 4; ação baixo (1-4) → em_andamento
    const plan = buildQuarterlyPlan(makeInput([makeItem("A", 30, "baixo")]));
    expect(plan.actions[0]!.status).toBe("em_andamento");
  });

  it("status futuro quando ação começa depois da semana atual", () => {
    // C começa depois de A (semana 5+), currentWeek=4 → futuro
    const items = [makeItem("A", 30, "baixo"), makeItem("C", 20, "baixo")];
    const plan = buildQuarterlyPlan(makeInput(items));
    expect(plan.actions[1]!.status).toBe("futuro");
  });

  it("status concluido quando endWeek < currentWeek", () => {
    const earlySeasonFuture: ActionPlanSeason = { ...SEASON, currentWeek: 10 };
    const plan = buildQuarterlyPlan({ ...makeInput([makeItem("A", 30, "baixo")]), season: earlySeasonFuture });
    expect(plan.actions[0]!.status).toBe("concluido");
  });

  it("exclui ações com lift zero ou negativo", () => {
    const items = [makeItem("A", 0, "baixo"), makeItem("B", -1, "medio"), makeItem("D", 10, "alto")];
    const plan = buildQuarterlyPlan(makeInput(items));
    expect(plan.actions.length).toBe(1);
    expect(plan.actions[0]!.leverId).toBe("D");
  });

  it("resposta scheduledIvoLift = soma dos lifts do plano", () => {
    const items = [makeItem("A", 30, "baixo"), makeItem("B", 20, "medio")];
    const plan = buildQuarterlyPlan(makeInput(items));
    expect(plan.scheduledIvoLift).toBeCloseTo(50, 1);
  });

  it("respeita maxActions", () => {
    const items = Array.from({ length: 10 }, (_, i) => makeItem(String(i), 10, "baixo"));
    const plan = buildQuarterlyPlan(makeInput(items, 3));
    expect(plan.actions.length).toBe(3);
    expect(plan.hiddenActionsCount).toBeGreaterThan(0);
  });

  it("milestone está entre start e end", () => {
    const plan = buildQuarterlyPlan(makeInput([makeItem("A", 30, "medio")]));
    const a = plan.actions[0]!;
    expect(a.milestoneWeek).toBeGreaterThanOrEqual(a.startWeek);
    expect(a.milestoneWeek).toBeLessThanOrEqual(a.endWeek);
  });
});
