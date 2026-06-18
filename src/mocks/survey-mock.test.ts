import { describe, expect, test } from "bun:test";
import { ENTERPRISE_WAVES, SCHOOL_WAVES, getActiveWave } from "./campaign-mock";
import { getRegisteredWaveSurveyKeys, getWaveSurvey } from "./survey-mock";
import { isAllowedSurveyValue } from "@/engine/survey/survey-engine";

describe("survey-mock — toda onda jogável tem definição", () => {
  test("as quatro ondas da empresa possuem itens, escala e disclaimer", () => {
    for (const wave of ENTERPRISE_WAVES) {
      const survey = getWaveSurvey("enterprise", wave.instrumentShort);
      expect(survey).not.toBeNull();
      expect(survey!.items.length).toBeGreaterThan(0);
      expect(survey!.scale.options.length).toBeGreaterThan(1);
      expect(survey!.intro.disclaimer.length).toBeGreaterThan(40);
    }
  });

  test("a onda escolar ativa resolve um questionário IEV próprio", () => {
    const wave = getActiveWave("school");
    const survey = getWaveSurvey("school", wave.instrumentShort);
    expect(SCHOOL_WAVES).toHaveLength(1);
    expect(survey?.instrumentShort).toBe("IEV");
    expect(survey?.items).toHaveLength(16);
    expect(survey?.items.some((item) => item.pillarId === "pertencimento_escolar")).toBe(true);
    expect(survey?.items.some((item) => item.pillarId === "clima_escolar")).toBe(true);
  });

  test("registro não fabrica fallback para instrumento desconhecido", () => {
    expect(getWaveSurvey("enterprise", "INEXISTENTE")).toBeNull();
    expect(getRegisteredWaveSurveyKeys()).not.toContain("enterprise:INEXISTENTE");
  });
});

describe("survey-mock — escalas preservam os instrumentos", () => {
  test("FIB-T aceita zero e rejeita cinco", () => {
    const scale = getWaveSurvey("enterprise", "FIB-T")!.scale;
    expect(isAllowedSurveyValue(scale, 0)).toBe(true);
    expect(isAllowedSurveyValue(scale, 4)).toBe(true);
    expect(isAllowedSurveyValue(scale, 5)).toBe(false);
  });

  test("VIA-T usa escala 0–10 e apresentação por slider", () => {
    const survey = getWaveSurvey("enterprise", "VIA-T")!;
    const scale = survey.scale;
    expect(scale.presentation).toBe("slider");
    expect(isAllowedSurveyValue(scale, 0)).toBe(true);
    expect(isAllowedSurveyValue(scale, 10)).toBe(true);
    expect(survey.completionRoute).toBe("/viat");
  });

  test("COPSOQ mantém o disclaimer obrigatório do Domínio B", () => {
    const survey = getWaveSurvey("enterprise", "COPSOQ")!;
    expect(survey.intro.disclaimer).toContain("profissional legalmente habilitado");
    expect(survey.intro.disclaimer).toContain("não para substituí-lo");
  });
});
