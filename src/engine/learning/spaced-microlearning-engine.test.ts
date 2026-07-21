import { describe, expect, test } from "bun:test";
import {
  MICRO_CADENCES,
  addDays,
  cadenceFloor,
  dueUnitIds,
  initMicroPlan,
  isUnitDue,
  nextDueOn,
  reconcilePlan,
  reviewUnit,
  setCadence,
  summarizeMicroPlan,
  toDayString,
  type MicroUnit,
} from "./spaced-microlearning-engine";

const UNITS: MicroUnit[] = [
  {
    id: "u1",
    title: "Unidade 1",
    prompt: "Ideia 1",
    recallQuestion: "Pergunta 1?",
    recallAnswer: "Resposta 1.",
    sourceStudyId: "TRU-006",
  },
  {
    id: "u2",
    title: "Unidade 2",
    prompt: "Ideia 2",
    recallQuestion: "Pergunta 2?",
    recallAnswer: "Resposta 2.",
    sourceStudyId: "LDR-007",
  },
];

const TODAY = "2026-07-21";

describe("utilitários de data", () => {
  test("addDays soma sem drift de fuso (UTC)", () => {
    expect(addDays("2026-07-21", 1)).toBe("2026-07-22");
    expect(addDays("2026-07-31", 1)).toBe("2026-08-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  test("toDayString devolve só a data", () => {
    expect(toDayString(new Date("2026-07-21T15:30:00Z"))).toBe("2026-07-21");
  });
});

describe("initMicroPlan", () => {
  test("toda unidade nasce vencida hoje, com versão carimbada", () => {
    const plan = initMicroPlan(UNITS, "1.0.0", "diaria", TODAY);
    expect(plan.planVersion).toBe("1.0.0");
    expect(plan.cadence).toBe("diaria");
    expect(Object.keys(plan.progress)).toEqual(["u1", "u2"]);
    expect(dueUnitIds(plan, TODAY)).toEqual(["u1", "u2"]);
    expect(plan.progress.u1.lastReviewedOn).toBeNull();
  });
});

describe("reviewUnit — reprograma respeitando a cadência", () => {
  test("acerto agenda o retorno pelo menos ao piso da cadência", () => {
    const plan = initMicroPlan(UNITS, "1.0.0", "semanal", TODAY);
    const after = reviewUnit(plan, "u1", 5, TODAY);
    // SM-2 daria 1 dia na 1ª repetição; a cadência semanal eleva o piso a 7.
    expect(after.progress.u1.dueOn).toBe(addDays(TODAY, 7));
    expect(after.progress.u1.lastReviewedOn).toBe(TODAY);
    expect(isUnitDue(after.progress.u1, TODAY)).toBe(false);
  });

  test("cadência diária não infla o intervalo natural do SM-2", () => {
    const plan = initMicroPlan(UNITS, "1.0.0", "diaria", TODAY);
    const after = reviewUnit(plan, "u1", 5, TODAY);
    expect(after.progress.u1.dueOn).toBe(addDays(TODAY, 1));
  });

  test("errar não pune além de reaprender (volta em 1 dia, respeitado o piso)", () => {
    const plan = initMicroPlan(UNITS, "1.0.0", "alternada", TODAY);
    const after = reviewUnit(plan, "u1", 1, TODAY);
    // SM-2 volta em 1 dia ao errar; cadência alternada eleva a 2.
    expect(after.progress.u1.dueOn).toBe(addDays(TODAY, 2));
    expect(after.progress.u1.schedule.lapses).toBe(1);
  });

  test("unidade inexistente é no-op", () => {
    const plan = initMicroPlan(UNITS, "1.0.0", "diaria", TODAY);
    expect(reviewUnit(plan, "nao-existe", 5, TODAY)).toBe(plan);
  });
});

describe("setCadence", () => {
  test("troca a cadência sem reescrever o passado", () => {
    const plan = reviewUnit(initMicroPlan(UNITS, "1.0.0", "diaria", TODAY), "u1", 5, TODAY);
    const dueBefore = plan.progress.u1.dueOn;
    const changed = setCadence(plan, "semanal");
    expect(changed.cadence).toBe("semanal");
    expect(changed.progress.u1.dueOn).toBe(dueBefore); // retorno já agendado é mantido
  });
});

describe("leituras de agenda", () => {
  test("dueUnitIds ordena da mais atrasada; nextDueOn olha as futuras", () => {
    let plan = initMicroPlan(UNITS, "1.0.0", "semanal", TODAY);
    plan = reviewUnit(plan, "u1", 5, TODAY); // u1 sai para +7
    expect(dueUnitIds(plan, TODAY)).toEqual(["u2"]);
    expect(nextDueOn(plan, TODAY)).toBe(addDays(TODAY, 7));
  });

  test("summarizeMicroPlan conta estados de agenda — e NÃO expõe streak", () => {
    let plan = initMicroPlan(UNITS, "1.0.0", "diaria", TODAY);
    plan = reviewUnit(plan, "u1", 5, TODAY);
    const summary = summarizeMicroPlan(plan, TODAY);
    expect(summary.total).toBe(2);
    expect(summary.due).toBe(1); // u2 ainda vencida
    expect(summary.upcoming).toBe(1); // u1 agendada
    expect(summary.fresh).toBe(1); // u2 nunca revisada
    expect(summary.nextDueOn).toBe(addDays(TODAY, 1));
    // invariante anti-coerção: nenhuma noção de assiduidade/streak no resumo.
    expect("streak" in summary).toBe(false);
    expect("diasSeguidos" in summary).toBe(false);
  });
});

describe("reconcilePlan — hidratação segura contra conteúdo novo", () => {
  test("preserva progresso existente, adiciona unidade nova vencida, descarta removida", () => {
    let plan = initMicroPlan(UNITS, "1.0.0", "diaria", TODAY);
    plan = reviewUnit(plan, "u1", 5, TODAY);

    const NEW_UNITS: MicroUnit[] = [
      UNITS[0], // u1 permanece (progresso preservado)
      {
        id: "u3",
        title: "Unidade 3",
        prompt: "Ideia 3",
        recallQuestion: "Pergunta 3?",
        recallAnswer: "Resposta 3.",
        sourceStudyId: "TRU-006",
      },
    ];
    const reconciled = reconcilePlan(plan, NEW_UNITS, "1.1.0", TODAY);
    expect(reconciled.planVersion).toBe("1.1.0");
    expect(Object.keys(reconciled.progress).sort()).toEqual(["u1", "u3"]);
    expect(reconciled.progress.u1.lastReviewedOn).toBe(TODAY); // preservado
    expect(reconciled.progress.u3.lastReviewedOn).toBeNull(); // novo, vencido hoje
    expect(isUnitDue(reconciled.progress.u3, TODAY)).toBe(true);
  });
});

describe("cadências", () => {
  test("catálogo cobre os três ritmos com pisos crescentes", () => {
    expect(MICRO_CADENCES.map((c) => c.id)).toEqual(["diaria", "alternada", "semanal"]);
    expect(cadenceFloor("diaria")).toBe(1);
    expect(cadenceFloor("alternada")).toBe(2);
    expect(cadenceFloor("semanal")).toBe(7);
  });
});
