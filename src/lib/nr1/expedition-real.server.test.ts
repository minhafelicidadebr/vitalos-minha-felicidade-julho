import { describe, expect, test, mock, beforeEach } from "bun:test";
import { getCapsuleHistory } from "@/mocks/capsule-history-mock";
import type { PgrPlan } from "@/engine/nr1/pgr-engine";

// Fixture REAL (mesmo shape que o Cofre de Ciclos devolve) — a mesma usada
// nos testes do Board Brief real (S8 fatia 3). Nunca inventar o formato.
const FULL_HISTORY = getCapsuleHistory("enterprise", "COPSOQ");

let mockHistory: ReturnType<typeof getCapsuleHistory> = [];
let mockPlan: PgrPlan | null = null;
let pgrPlanCalls: Array<{ orgId: string; exposures: unknown }> = [];
let historyOptions: unknown[] = [];
let historyError: Error | null = null;

mock.module("@/lib/evolucao/cycle-history.server", () => ({
  loadOrgCycleHistory: async (_orgId: string, _instrument: string, options?: unknown) => {
    historyOptions.push(options);
    if (historyError) throw historyError;
    return mockHistory;
  },
}));

mock.module("@/lib/evolucao/pgr-from-plan.server", () => ({
  loadRealPgrPlan: async (orgId: string, exposures: unknown) => {
    pgrPlanCalls.push({ orgId, exposures });
    return mockPlan;
  },
}));

const { loadRealExpeditionState } = await import("./expedition-real.server");

beforeEach(() => {
  mockHistory = [];
  mockPlan = null;
  pgrPlanCalls = [];
  historyOptions = [];
  historyError = null;
});

describe("loadRealExpeditionState — honestidade por estágio de medição", () => {
  test("pack sem collectiveNarrative → null (UI esconde a seção)", async () => {
    mockHistory = FULL_HISTORY;
    expect(await loadRealExpeditionState("org-1", "government")).toBeNull();
  });

  test("0 ciclos: sem seleção, sem avaliação, nunca inventa antagonista", async () => {
    mockHistory = [];
    const state = await loadRealExpeditionState("org-1", "enterprise");
    expect(state).toEqual({
      cycleCount: 0,
      hasActivePlan: false,
      selection: null,
      assessments: [],
      suppressed: false,
    });
    // Nem PGR real é consultado sem nenhuma medição — honestidade cedo.
    expect(pgrPlanCalls).toHaveLength(0);
  });

  test("1 ciclo: seleção da temporada já é real, mas SEM leitura longitudinal", async () => {
    mockHistory = FULL_HISTORY.slice(0, 1);
    const state = await loadRealExpeditionState("org-1", "enterprise");
    expect(state!.cycleCount).toBe(1);
    expect(state!.hasActivePlan).toBe(false);
    // Sem 2º ciclo, o PGR real nem é consultado — não há reavaliação a fazer.
    expect(pgrPlanCalls).toHaveLength(0);
    // Todo antagonista não-chefe cai em "dominando" (efficacy null, drivers vazio).
    const nonBoss = state!.assessments.filter((a) => a.antagonistId !== "cinismo");
    expect(nonBoss.every((a) => a.status === "dominando")).toBe(true);
  });

  test("≥2 ciclos SEM Plano Vivo ativo: reavaliação real, efficacy null — nunca 'derrotado' sem prova", async () => {
    mockHistory = FULL_HISTORY;
    mockPlan = null;
    const state = await loadRealExpeditionState("org-1", "enterprise");
    expect(state!.cycleCount).toBe(FULL_HISTORY.length);
    expect(state!.hasActivePlan).toBe(false);
    expect(pgrPlanCalls).toHaveLength(1);
    // Sem efficacy, nenhum antagonista (exceto pela regra própria do Cinismo,
    // que também exige efficacy) é derrotado.
    expect(state!.assessments.every((a) => a.status !== "derrotado")).toBe(true);
  });

  test("≥2 ciclos COM Plano Vivo ativo: hasActivePlan true, efficacy alimenta a avaliação", async () => {
    mockHistory = FULL_HISTORY;
    mockPlan = {
      generatedAt: "2026-07-10",
      currentWeek: 1,
      horizonWeeks: 13,
      hiddenRiskCount: 0,
      summary: "fixture",
      disclaimer: "fixture",
      risks: [
        {
          driverId: "carga",
          level: "alto" as any,
          probability: 70,
          severity: 3,
          measures: [{ id: "m1", tier: "organizacao", status: "implementada", description: "x" } as any],
        },
      ],
    } as unknown as PgrPlan;
    const state = await loadRealExpeditionState("org-1", "enterprise");
    expect(state!.hasActivePlan).toBe(true);
    expect(pgrPlanCalls[0]!.orgId).toBe("org-1");
  });

  test("seleção da temporada nunca é fabricada — deriva do driver pior-medido real", async () => {
    mockHistory = FULL_HISTORY;
    const state = await loadRealExpeditionState("org-1", "enterprise");
    // A seleção (se houver) tem que citar um driver real do registro canônico.
    if (state!.selection) {
      expect(state!.selection.need.driverId.length).toBeGreaterThan(0);
      expect(state!.selection.antagonist.counteredBy).toContain(state!.selection.need.driverId);
    }
  });

  test("determinístico: duas chamadas com o mesmo histórico produzem o mesmo estado", async () => {
    mockHistory = FULL_HISTORY;
    const a = await loadRealExpeditionState("org-1", "enterprise");
    const b = await loadRealExpeditionState("org-1", "enterprise");
    expect(a).toEqual(b);
  });
});

describe("loadRealExpeditionState — falha e supressão não viram 'sem exposição'", () => {
  test("pede o histórico em modo failClosed e propaga a falha de leitura", async () => {
    historyError = new Error("cycle_history_unavailable");
    await expect(loadRealExpeditionState("org-1", "enterprise")).rejects.toThrow(
      "cycle_history_unavailable",
    );
    expect(historyOptions).toEqual([{ failClosed: true }]);
  });

  test("ciclo com todas as dimensões abaixo de n ≥ 5: suppressed, sem seleção nem avaliação", async () => {
    const latest = FULL_HISTORY[0]!;
    mockHistory = [{ ...latest, dimensions: latest.dimensions.map((d) => ({ ...d, visible: false })) }];
    const state = await loadRealExpeditionState("org-1", "enterprise");
    expect(state).toMatchObject({ cycleCount: 1, suppressed: true, selection: null, assessments: [] });
    expect(pgrPlanCalls).toHaveLength(0);
  });

  test("0 ciclos e ciclos visíveis seguem suppressed: false", async () => {
    expect((await loadRealExpeditionState("org-1", "enterprise"))?.suppressed).toBe(false);
    mockHistory = FULL_HISTORY;
    expect((await loadRealExpeditionState("org-1", "enterprise"))?.suppressed).toBe(false);
  });
});
