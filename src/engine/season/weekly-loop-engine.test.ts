import { describe, expect, test } from "bun:test";
import { buildWeeklyLoop, LOOP_STEP_ORDER, DEFAULT_LOOP_POLICY } from "./weekly-loop-engine";

describe("weekly-loop-engine — proteção k-anon da equipe inteira", () => {
  test("equipe menor que o piso k-anon: loop inteiro protegido, nenhum passo revela cobertura", () => {
    const result = buildWeeklyLoop({ teamSize: 3, completedCountByStep: { aprender: 3 } });
    expect(result.visible).toBe(false);
    expect(result.steps.every((s) => s.coveragePct === null)).toBe(true);
    expect(result.steps.every((s) => s.done === false)).toBe(true);
  });

  test("equipe exatamente no piso k-anon: visível (limite inclusivo)", () => {
    const result = buildWeeklyLoop({ teamSize: 5, completedCountByStep: { aprender: 5 } });
    expect(result.visible).toBe(true);
  });
});

describe("weekly-loop-engine — cobertura e conclusão de passo", () => {
  test("cobertura abaixo do threshold: passo não concluído", () => {
    const result = buildWeeklyLoop({ teamSize: 10, completedCountByStep: { aprender: 5 } });
    expect(result.steps[0].coveragePct).toBe(50);
    expect(result.steps[0].done).toBe(false);
  });

  test("cobertura no threshold exato: concluído (limite inclusivo)", () => {
    const result = buildWeeklyLoop(
      { teamSize: 10, completedCountByStep: { aprender: 6 } },
      DEFAULT_LOOP_POLICY,
    );
    expect(result.steps[0].coveragePct).toBe(60);
    expect(result.steps[0].done).toBe(true);
  });

  test("threshold customizado pelo pack é respeitado", () => {
    const result = buildWeeklyLoop(
      { teamSize: 10, completedCountByStep: { aprender: 6 } },
      { coverageThresholdPct: 70, kAnonymityMin: 5 },
    );
    expect(result.steps[0].done).toBe(false);
  });

  test("passo sem nenhuma contagem → 0% e não concluído", () => {
    const result = buildWeeklyLoop({ teamSize: 8, completedCountByStep: {} });
    expect(result.steps[0].coveragePct).toBe(0);
    expect(result.steps[0].done).toBe(false);
  });
});

describe("weekly-loop-engine — destravamento sequencial (nunca pula passo)", () => {
  test("aprender nasce destravado; praticar só destrava quando aprender conclui", () => {
    const result = buildWeeklyLoop({
      teamSize: 10,
      completedCountByStep: { aprender: 10, praticar: 10 },
    });
    expect(result.steps[0].unlocked).toBe(true); // aprender
    expect(result.steps[1].unlocked).toBe(true); // praticar — aprender concluiu
    expect(result.steps[1].done).toBe(true);
    expect(result.steps[2].unlocked).toBe(true); // evidenciar — praticar concluiu
  });

  test("passo travado mesmo com cobertura alta, se o anterior não concluiu", () => {
    const result = buildWeeklyLoop({
      teamSize: 10,
      completedCountByStep: { aprender: 2, evidenciar: 10 }, // pula praticar de propósito
    });
    expect(result.steps[0].done).toBe(false); // aprender não concluiu (20%)
    expect(result.steps[1].unlocked).toBe(false); // praticar travado
    // evidenciar tecnicamente teria 100% de cobertura, mas está travado —
    // "done" reflete só a cobertura medida; "unlocked" é o gate de exibição.
    expect(result.steps[2].unlocked).toBe(false);
  });

  test("os 7 passos aparecem na ordem canônica sempre", () => {
    const result = buildWeeklyLoop({ teamSize: 6, completedCountByStep: {} });
    expect(result.steps.map((s) => s.id)).toEqual([...LOOP_STEP_ORDER]);
  });
});

describe("weekly-loop-engine — contagem total", () => {
  test("completedSteps conta só os concluídos, totalSteps é sempre 7", () => {
    const result = buildWeeklyLoop({
      teamSize: 10,
      completedCountByStep: { aprender: 10, praticar: 10, evidenciar: 3 },
    });
    expect(result.completedSteps).toBe(2);
    expect(result.totalSteps).toBe(7);
  });

  test("determinístico: mesma entrada → mesma saída", () => {
    const input = { teamSize: 8, completedCountByStep: { aprender: 5, praticar: 4 } };
    expect(buildWeeklyLoop(input)).toEqual(buildWeeklyLoop(input));
  });
});
