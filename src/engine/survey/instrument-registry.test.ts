import { describe, expect, test } from "bun:test";
import {
  assertValidatedClaim,
  checkRegistryIntegrity,
  getInstrumentEntry,
  reconcileInstrument,
} from "./instrument-registry";
import { INSTRUMENT_REGISTRY } from "@/mocks/instrument-registry-mock";
import { getWaveSurvey } from "@/mocks/survey-mock";

describe("instrument-registry — integridade interna", () => {
  test("o registro é íntegro (toda entrada tem fonte, contagens coerentes, rótulos honestos)", () => {
    expect(checkRegistryIntegrity(INSTRUMENT_REGISTRY)).toEqual([]);
  });

  test("todo instrumento declara ao menos uma fonte citável", () => {
    for (const entry of INSTRUMENT_REGISTRY) {
      expect(entry.sources.length).toBeGreaterThan(0);
      expect(entry.sources[0]!.citation.length).toBeGreaterThan(8);
    }
  });

  test("um instrumento demonstrativo não pode ser declarado validado", () => {
    const violations = checkRegistryIntegrity([
      {
        ...getInstrumentEntry(INSTRUMENT_REGISTRY, "COPSOQ")!,
        isValidatedNCOPSII: true, // contradição deliberada
      },
    ]);
    expect(violations.some((v) => v.rule === "validated_claim")).toBe(true);
  });
});

describe("instrument-registry — reconciliação documentado === ativo", () => {
  // Esta é a espinha da assertividade: o registro precisa bater com o que o runtime
  // realmente aplica. Se alguém mexer nos itens sem atualizar o registro, isto falha.
  const cases: Array<{ short: string; expected: number }> = [
    { short: "PERMA+V / IVO", expected: 15 },
    { short: "FIB-T", expected: 32 },
    { short: "VIA-T", expected: 48 },
    { short: "COPSOQ", expected: 9 },
  ];

  for (const { short, expected } of cases) {
    test(`${short}: registro e SurveyDefinition concordam (${expected} itens)`, () => {
      const entry = getInstrumentEntry(INSTRUMENT_REGISTRY, short)!;
      const survey = getWaveSurvey("enterprise", short)!;
      expect(survey.items).toHaveLength(expected);
      const recon = reconcileInstrument(entry, survey.items.length);
      expect(recon.ok).toBe(true);
    });
  }
});

describe("instrument-registry — instrumentos integrais vs subconjunto", () => {
  test("PERMA+V, FIB-T e VIA-T são servidos integralmente", () => {
    for (const short of ["PERMA+V / IVO", "FIB-T", "VIA-T"]) {
      const entry = getInstrumentEntry(INSTRUMENT_REGISTRY, short)!;
      expect(entry.isIntegralServed).toBe(true);
      const recon = reconcileInstrument(entry, getWaveSurvey("enterprise", short)!.items.length);
      expect(recon.gapToIntegral).toBe(0);
    }
  });

  test("COPSOQ é um subconjunto honesto (9 de 41), com lacuna rastreável", () => {
    const entry = getInstrumentEntry(INSTRUMENT_REGISTRY, "COPSOQ")!;
    expect(entry.isIntegralServed).toBe(false);
    expect(entry.isValidatedNCOPSII).toBe(false);
    const recon = reconcileInstrument(entry, getWaveSurvey("enterprise", "COPSOQ")!.items.length);
    expect(recon.gapToIntegral).toBe(32); // 41 integral − 9 servidos
  });
});

describe("instrument-registry — linguagem de validação permitida", () => {
  test("PERMA+V (validado_adaptado) e FIB-T (validado) podem alegar validação", () => {
    expect(assertValidatedClaim(getInstrumentEntry(INSTRUMENT_REGISTRY, "PERMA+V / IVO")!)).toBe(
      true,
    );
    expect(assertValidatedClaim(getInstrumentEntry(INSTRUMENT_REGISTRY, "FIB-T")!)).toBe(true);
  });

  test("VIA-T (exploratório) e COPSOQ (demonstrativo) NUNCA podem alegar validação", () => {
    expect(assertValidatedClaim(getInstrumentEntry(INSTRUMENT_REGISTRY, "VIA-T")!)).toBe(false);
    expect(assertValidatedClaim(getInstrumentEntry(INSTRUMENT_REGISTRY, "COPSOQ")!)).toBe(false);
  });
});
