import { describe, expect, test } from "bun:test";
import {
  buildAssessmentTrend,
  canRetake,
  scorePersonalAssessment,
  type PersonalAssessmentRecord,
  type PersonalBandDef,
  type PersonalFactorDef,
} from "./personal-assessment-engine";

// Definições INJETADAS — o motor não conhece "PERMA"; provamos com uma bateria
// genérica de 2 fatores (engine ≠ domínio).
const FACTORS: PersonalFactorDef[] = [
  { id: "f1", name: "Fator Um", itemIds: ["i1", "i2", "i3"], pillarIds: ["pilar_a"] },
  { id: "f2", name: "Fator Dois", itemIds: ["i4", "i5"], pillarIds: ["pilar_b", "pilar_c"] },
];

const BANDS: PersonalBandDef[] = [
  { id: "atencao", label: "Pede atenção", min: 1 },
  { id: "cultivando", label: "Cultivando", min: 3 },
  { id: "florescendo", label: "Florescendo", min: 4.2 },
];

const SCALE = { min: 1, max: 5 };
const TODAY = "2026-07-04";

describe("scorePersonalAssessment — faixas honestas sobre bateria injetada", () => {
  test("média por fator com 1 decimal e faixa = maior piso alcançado", () => {
    const result = scorePersonalAssessment(
      { i1: 4, i2: 5, i3: 4, i4: 3, i5: 3 },
      FACTORS,
      BANDS,
      SCALE,
      TODAY,
    );
    const [f1, f2] = result.factors;
    expect(f1!.score).toBe(4.3);
    expect(f1!.bandId).toBe("florescendo");
    expect(f2!.score).toBe(3);
    expect(f2!.bandId).toBe("cultivando");
  });

  test("fronteira exata de faixa: score igual ao piso entra na faixa de cima", () => {
    const result = scorePersonalAssessment({ i4: 3, i5: 3 }, FACTORS, BANDS, SCALE, TODAY);
    expect(result.factors[1]!.bandId).toBe("cultivando"); // 3.0 >= min 3
  });

  test("item não respondido sai da média e a completude reporta com honestidade", () => {
    const result = scorePersonalAssessment({ i1: 5, i4: 4, i5: 4 }, FACTORS, BANDS, SCALE, TODAY);
    expect(result.factors[0]!.score).toBe(5); // só i1
    expect(result.factors[0]!.answered).toBe(1);
    expect(result.completeness).toBe(60); // 3 de 5 itens
  });

  test("fator sem NENHUM item respondido → score null e faixa null (nunca zero)", () => {
    const result = scorePersonalAssessment({ i4: 2, i5: 2 }, FACTORS, BANDS, SCALE, TODAY);
    expect(result.factors[0]!.score).toBeNull();
    expect(result.factors[0]!.bandId).toBeNull();
  });

  test("valor fora da escala (0, 6) ou NaN é tratado como não respondido", () => {
    const result = scorePersonalAssessment(
      { i1: 0, i2: 6, i3: Number.NaN, i4: 5, i5: 5 },
      FACTORS,
      BANDS,
      SCALE,
      TODAY,
    );
    expect(result.factors[0]!.score).toBeNull();
    expect(result.factors[0]!.answered).toBe(0);
    expect(result.factors[1]!.score).toBe(5);
  });

  test("global = média dos fatores COM dados; tudo vazio → global null e completude 0", () => {
    const partial = scorePersonalAssessment({ i4: 4, i5: 4 }, FACTORS, BANDS, SCALE, TODAY);
    expect(partial.global).toBe(4); // só f2
    const empty = scorePersonalAssessment({}, FACTORS, BANDS, SCALE, TODAY);
    expect(empty.global).toBeNull();
    expect(empty.globalBandId).toBeNull();
    expect(empty.completeness).toBe(0);
  });

  test("pillarIds do fator viajam no resultado (alimentam a Bússola)", () => {
    const result = scorePersonalAssessment({ i4: 3, i5: 3 }, FACTORS, BANDS, SCALE, TODAY);
    expect(result.factors[1]!.pillarIds).toEqual(["pilar_b", "pilar_c"]);
  });

  test("determinístico: mesma entrada, mesma saída", () => {
    const responses = { i1: 3, i2: 4, i3: 5, i4: 2, i5: 3 };
    expect(scorePersonalAssessment(responses, FACTORS, BANDS, SCALE, TODAY)).toEqual(
      scorePersonalAssessment(responses, FACTORS, BANDS, SCALE, TODAY),
    );
  });
});

function record(takenAt: string, global: number | null): PersonalAssessmentRecord {
  return {
    assessmentId: `a-${takenAt}`,
    instrument: "perma_personal",
    instrumentVersion: "1",
    engineVersion: "1.0.0",
    takenAt,
    result: {
      factors: [],
      global,
      globalBandId: null,
      globalBandLabel: null,
      completeness: 100,
      takenAt,
    },
  };
}

describe("buildAssessmentTrend — a linha do tempo pessoal (INSERT-only)", () => {
  test("ordena por data e computa o delta da última leitura", () => {
    const trend = buildAssessmentTrend(
      [record("2026-06-01", 3.2), record("2026-04-01", 2.8)],
      "perma_personal",
    );
    expect(trend.points.map((p) => p.takenAt)).toEqual(["2026-04-01", "2026-06-01"]);
    expect(trend.lastDelta).toBe(0.4);
    expect(trend.direction).toBe("melhorando");
  });

  test("delta pequeno (±0.2) é 'estavel' — nunca infla melhora nem alarma queda", () => {
    const up = buildAssessmentTrend([record("2026-04-01", 3), record("2026-06-01", 3.2)], "perma_personal");
    expect(up.direction).toBe("estavel");
    const down = buildAssessmentTrend([record("2026-04-01", 3), record("2026-06-01", 2.5)], "perma_personal");
    expect(down.direction).toBe("atencao");
  });

  test("uma única leitura → sem delta, sem direção (honesto)", () => {
    const trend = buildAssessmentTrend([record("2026-06-01", 3)], "perma_personal");
    expect(trend.lastDelta).toBeNull();
    expect(trend.direction).toBeNull();
  });

  test("filtra por instrumento — VIA-T e PERMA nunca se misturam na mesma linha", () => {
    const viat = { ...record("2026-05-01", 9), instrument: "viat" };
    const trend = buildAssessmentTrend([record("2026-04-01", 3), viat], "perma_personal");
    expect(trend.points).toHaveLength(1);
  });
});

describe("canRetake — guarda de cadência (anti re-testagem obsessiva)", () => {
  test("sem leitura anterior → sempre permitido", () => {
    expect(canRetake(null, TODAY, 28)).toEqual({ allowed: true, daysRemaining: 0 });
  });

  test("antes da cadência mínima → bloqueado com dias restantes", () => {
    const gate = canRetake("2026-06-20", TODAY, 28);
    expect(gate.allowed).toBe(false);
    expect(gate.daysRemaining).toBe(14);
  });

  test("na fronteira exata da cadência → permitido", () => {
    expect(canRetake("2026-06-06", TODAY, 28).allowed).toBe(true);
  });
});
