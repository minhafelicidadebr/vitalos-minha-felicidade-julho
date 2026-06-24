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
    { short: "COPSOQ", expected: 41 },
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

describe("instrument-registry — instrumentos integrais", () => {
  test("PERMA+V, FIB-T, VIA-T e COPSOQ são servidos integralmente (cobertura estrutural)", () => {
    for (const short of ["PERMA+V / IVO", "FIB-T", "VIA-T", "COPSOQ"]) {
      const entry = getInstrumentEntry(INSTRUMENT_REGISTRY, short)!;
      expect(entry.isIntegralServed).toBe(true);
      const recon = reconcileInstrument(entry, getWaveSurvey("enterprise", short)!.items.length);
      expect(recon.gapToIntegral).toBe(0);
    }
  });

  test("COPSOQ tem cobertura integral (41/41) mas NUNCA alega validação NCOPSII", () => {
    // A honestidade dos dois eixos: cobertura estrutural completa (isIntegralServed)
    // é ortogonal à validação (isValidatedNCOPSII). 'Integral' ≠ 'validado'.
    const entry = getInstrumentEntry(INSTRUMENT_REGISTRY, "COPSOQ")!;
    expect(entry.isIntegralServed).toBe(true); // cobre todas as dimensões
    expect(entry.isValidatedNCOPSII).toBe(false); // redação demonstrativa, não licenciada
    expect(entry.validationStatus).toBe("demonstrativo");
    expect(assertValidatedClaim(entry)).toBe(false); // não pode alegar validação
    const recon = reconcileInstrument(entry, getWaveSurvey("enterprise", "COPSOQ")!.items.length);
    expect(recon.gapToIntegral).toBe(0);
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
