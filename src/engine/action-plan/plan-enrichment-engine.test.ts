import { describe, expect, test } from "bun:test";
import type { ActionItem, QuarterlyPlan } from "./action-plan-engine";
import {
  CONTROL_TIERS,
  enrichQuarterlyPlan,
  isControlTier,
  type ActionAccountability,
} from "./plan-enrichment-engine";

function makeAction(leverId: string, rank: number): ActionItem {
  return {
    rank,
    leverId,
    leverLabel: `Alavanca ${leverId}`,
    description: "desc",
    effort: "baixo",
    expectedIvoLift: 10,
    isQuickWin: false,
    amb: { id: null, name: null, emoji: null },
    lensId: null,
    lensLabel: null,
    lensColor: null,
    esgCodes: [],
    startWeek: 1,
    endWeek: 4,
    milestoneWeek: 2,
    status: "em_andamento",
    weeksBudget: 4,
  };
}

function makePlan(leverIds: string[]): QuarterlyPlan {
  return {
    season: { name: "T3", color: "#000", totalWeeks: 13, currentWeek: 3, phaseLabel: "Transformar" },
    actions: leverIds.map((id, i) => makeAction(id, i + 1)),
    quickWinCount: 0,
    scheduledIvoLift: 10 * leverIds.length,
    hiddenActionsCount: 0,
    disclaimer: "d",
  };
}

const FULL_ACC = (leverId: string): ActionAccountability => ({
  leverId,
  controlTier: "organizacao",
  owner: { membershipId: "m-1", displayRole: "Líder de Operações" },
  dueOn: "2026-09-15",
  metric: { label: "Horas extras médias/semana", baseline: 6, target: 3, unit: "h" },
  cmo: { context: "picos de demanda", mechanism: "janela de foco protegida", outcome: "queda de sobrecarga" },
});

describe("guarda estrutural NR-01 — os únicos 4 tiers que existem", () => {
  test("os 4 tiers da hierarquia validam", () => {
    for (const tier of CONTROL_TIERS) expect(isControlTier(tier)).toBe(true);
  });

  test("ÉTICA POR CONSTRUÇÃO: 'resiliencia_individual' NÃO é um tier — o plano não consegue individualizar o risco", () => {
    expect(isControlTier("resiliencia_individual")).toBe(false);
    expect(isControlTier("mindfulness")).toBe(false);
    expect(isControlTier("")).toBe(false);
    expect(isControlTier(null)).toBe(false);
  });

  test("tier inválido vindo de dados vira null no item enriquecido, nunca passa adiante", () => {
    const acc = { ...FULL_ACC("l1"), controlTier: "resiliencia_individual" as never };
    const enriched = enrichQuarterlyPlan(makePlan(["l1"]), [acc]);
    expect(enriched.actions[0]!.controlTier).toBeNull();
  });
});

describe("enriquecimento §13 — dono, prazo e métrica por ação", () => {
  test("ação com accountability completa fica compliant, sem campos faltantes", () => {
    const enriched = enrichQuarterlyPlan(makePlan(["l1"]), [FULL_ACC("l1")]);
    const action = enriched.actions[0]!;
    expect(action.compliant).toBe(true);
    expect(action.missing).toEqual([]);
    expect(action.owner?.displayRole).toBe("Líder de Operações");
    expect(action.metric?.target).toBe(3);
    expect(action.cmo?.mechanism).toBe("janela de foco protegida");
  });

  test("ação SEM accountability lista os 3 campos faltantes (§13 integral)", () => {
    const enriched = enrichQuarterlyPlan(makePlan(["l1"]), []);
    const action = enriched.actions[0]!;
    expect(action.compliant).toBe(false);
    expect(action.missing).toEqual(["owner", "dueOn", "metric"]);
  });

  test("faltas parciais são nomeadas exatamente (só métrica ausente)", () => {
    const acc = { ...FULL_ACC("l1"), metric: null };
    const enriched = enrichQuarterlyPlan(makePlan(["l1"]), [acc]);
    expect(enriched.actions[0]!.missing).toEqual(["metric"]);
  });

  test("dono de fachada (membershipId em branco) NÃO conta como dono", () => {
    const acc = { ...FULL_ACC("l1"), owner: { membershipId: "  ", displayRole: "x" } };
    const enriched = enrichQuarterlyPlan(makePlan(["l1"]), [acc]);
    expect(enriched.actions[0]!.owner).toBeNull();
    expect(enriched.actions[0]!.missing).toContain("owner");
  });

  test("prazo malformado (não ISO) NÃO conta como prazo", () => {
    const acc = { ...FULL_ACC("l1"), dueOn: "15/09/2026" };
    const enriched = enrichQuarterlyPlan(makePlan(["l1"]), [acc]);
    expect(enriched.actions[0]!.dueOn).toBeNull();
    expect(enriched.actions[0]!.missing).toContain("dueOn");
  });

  test("métrica sem label ou com número não-finito NÃO conta como métrica", () => {
    const semLabel = { ...FULL_ACC("l1"), metric: { label: " ", baseline: 1, target: 2, unit: "h" } };
    expect(enrichQuarterlyPlan(makePlan(["l1"]), [semLabel]).actions[0]!.metric).toBeNull();
    const nan = { ...FULL_ACC("l1"), metric: { label: "x", baseline: Number.NaN, target: 2, unit: "h" } };
    expect(enrichQuarterlyPlan(makePlan(["l1"]), [nan]).actions[0]!.metric).toBeNull();
  });

  test("os campos originais do ActionItem são preservados (composição, não substituição)", () => {
    const enriched = enrichQuarterlyPlan(makePlan(["l1"]), [FULL_ACC("l1")]);
    const action = enriched.actions[0]!;
    expect(action.startWeek).toBe(1);
    expect(action.expectedIvoLift).toBe(10);
    expect(action.status).toBe("em_andamento");
  });

  test("não muta o plano de entrada", () => {
    const plan = makePlan(["l1"]);
    enrichQuarterlyPlan(plan, [FULL_ACC("l1")]);
    expect("compliant" in plan.actions[0]!).toBe(false);
  });
});

describe("medidor §13 — computado, nunca afirmado", () => {
  test("plano 2/4 completo → 50%, com contagem de faltas por campo", () => {
    const plan = makePlan(["l1", "l2", "l3", "l4"]);
    const acc = [
      FULL_ACC("l1"),
      FULL_ACC("l2"),
      { ...FULL_ACC("l3"), owner: null },
      { ...FULL_ACC("l4"), owner: null, dueOn: null },
    ];
    const { gauge } = enrichQuarterlyPlan(plan, acc);
    expect(gauge.total).toBe(4);
    expect(gauge.compliant).toBe(2);
    expect(gauge.pct).toBe(50);
    expect(gauge.missingByField).toEqual({ owner: 2, dueOn: 1, metric: 0 });
  });

  test("plano 100% completo → 100%", () => {
    const plan = makePlan(["l1", "l2"]);
    const { gauge } = enrichQuarterlyPlan(plan, [FULL_ACC("l1"), FULL_ACC("l2")]);
    expect(gauge.pct).toBe(100);
  });

  test("plano vazio → 0% (nada a cumprir não é cumprir)", () => {
    const { gauge } = enrichQuarterlyPlan(makePlan([]), []);
    expect(gauge.pct).toBe(0);
    expect(gauge.total).toBe(0);
  });

  test("arredondamento honesto: 1/3 → 33%", () => {
    const plan = makePlan(["l1", "l2", "l3"]);
    const { gauge } = enrichQuarterlyPlan(plan, [FULL_ACC("l1")]);
    expect(gauge.pct).toBe(33);
  });

  test("determinístico: mesma entrada, mesma saída", () => {
    const plan = makePlan(["l1", "l2"]);
    const acc = [FULL_ACC("l1")];
    expect(enrichQuarterlyPlan(plan, acc)).toEqual(enrichQuarterlyPlan(plan, acc));
  });
});
