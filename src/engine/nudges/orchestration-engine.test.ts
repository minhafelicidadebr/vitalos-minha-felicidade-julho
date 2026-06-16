import { describe, expect, test } from "bun:test";
import { planDelivery } from "./orchestration-engine";
import type { NudgeDef } from "./nudge-engine";

const LIB: NudgeDef[] = [
  {
    id: "n1",
    pillarId: "reconhecimento_pares",
    copy: "a",
    channel: "in_app",
    frequencyCapPerWeek: 1,
    optInRequired: false,
  },
  {
    id: "n2",
    pillarId: "reconhecimento_pares",
    copy: "b",
    channel: "in_app",
    frequencyCapPerWeek: 1,
    optInRequired: true,
  },
  {
    id: "n3",
    pillarId: "reconhecimento_pares",
    copy: "c",
    channel: "in_app",
    frequencyCapPerWeek: 1,
    optInRequired: false,
  },
  {
    id: "n4",
    pillarId: "energia_vitalidade",
    copy: "d",
    channel: "in_app",
    frequencyCapPerWeek: 1,
    optInRequired: false,
  },
];

function base(over: Partial<Parameters<typeof planDelivery>[1]> = {}) {
  return planDelivery(LIB, {
    pillarId: "reconhecimento_pares",
    role: "COLABORADOR",
    optedInNudgeIds: new Set<string>(),
    deliveredThisWeek: new Map<string, number>(),
    max: 5,
    ...over,
  });
}

describe("orchestration — plano de entrega", () => {
  test("filtra a biblioteca pelo pilar-alvo", () => {
    const plan = base();
    expect(plan.candidateCount).toBe(3); // n1,n2,n3 — n4 é de outro pilar
    expect(plan.delivered.every((d) => d.nudge.pillarId === "reconhecimento_pares")).toBe(true);
  });

  test("nudge que exige opt-in não concedido NÃO é entregue e conta como pendente", () => {
    const plan = base();
    expect(plan.delivered.some((d) => d.nudge.id === "n2")).toBe(false);
    expect(plan.optInPending).toBe(1);
  });

  test("conceder o opt-in libera o nudge", () => {
    const plan = base({ optedInNudgeIds: new Set(["n2"]) });
    expect(plan.delivered.some((d) => d.nudge.id === "n2")).toBe(true);
    expect(plan.optInPending).toBe(0);
  });

  test("teto de frequência semanal bloqueia e é contado", () => {
    const plan = base({ deliveredThisWeek: new Map([["n1", 1]]) });
    expect(plan.delivered.some((d) => d.nudge.id === "n1")).toBe(false);
    expect(plan.capped).toBe(1);
  });

  test("pilar sem nudges → plano vazio honesto", () => {
    const plan = base({ pillarId: "inexistente" });
    expect(plan.candidateCount).toBe(0);
    expect(plan.delivered).toHaveLength(0);
  });
});
