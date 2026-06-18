import { describe, expect, test } from "bun:test";
import {
  isAllowedSurveyValue,
  surveyProgress,
  type SurveyItem,
  type SurveyResponses,
  type SurveyScale,
} from "./survey-engine";

const ITEMS: SurveyItem[] = [
  { id: "i1", pillarId: "p1", text: "a" },
  { id: "i2", pillarId: "p1", text: "b" },
  { id: "i3", pillarId: "p2", text: "c" },
  { id: "i4", pillarId: "p2", text: "d" },
];

describe("survey — progresso", () => {
  test("vazio → 0%, primeiro item é o primeiro não-respondido", () => {
    const p = surveyProgress(ITEMS, {});
    expect(p.pct).toBe(0);
    expect(p.isComplete).toBe(false);
    expect(p.firstUnansweredId).toBe("i1");
  });

  test("parcial → conta respondidos e aponta o próximo", () => {
    const r: SurveyResponses = { i1: 4, i2: 3 };
    const p = surveyProgress(ITEMS, r);
    expect(p.answered).toBe(2);
    expect(p.pct).toBe(50);
    expect(p.firstUnansweredId).toBe("i3");
  });

  test("completo → 100%, isComplete, sem próximo", () => {
    const r: SurveyResponses = { i1: 5, i2: 5, i3: 4, i4: 3 };
    const p = surveyProgress(ITEMS, r);
    expect(p.pct).toBe(100);
    expect(p.isComplete).toBe(true);
    expect(p.firstUnansweredId).toBeNull();
  });

  test("um buraco no meio → não está completo e aponta o buraco", () => {
    const r: SurveyResponses = { i1: 5, i2: 5, i4: 3 };
    const p = surveyProgress(ITEMS, r);
    expect(p.isComplete).toBe(false);
    expect(p.firstUnansweredId).toBe("i3");
  });

  test("zero é resposta válida em instrumentos 0–4/0–10", () => {
    const p = surveyProgress(ITEMS, { i1: 0 });
    expect(p.answered).toBe(1);
    expect(p.firstUnansweredId).toBe("i2");
  });
});

describe("survey — escala injetada", () => {
  const scale: SurveyScale = {
    presentation: "buttons",
    options: [
      { value: 0, label: "Nunca" },
      { value: 2, label: "Às vezes" },
      { value: 4, label: "Sempre" },
    ],
    minLabel: "Nunca",
    maxLabel: "Sempre",
  };

  test("aceita somente valores declarados pela definição do instrumento", () => {
    expect(isAllowedSurveyValue(scale, 0)).toBe(true);
    expect(isAllowedSurveyValue(scale, 4)).toBe(true);
    expect(isAllowedSurveyValue(scale, 3)).toBe(false);
  });
});
