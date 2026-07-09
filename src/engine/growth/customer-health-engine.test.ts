import { describe, expect, test } from "bun:test";
import {
  computeCustomerHealth,
  type AccountSignals,
} from "./customer-health-engine";

const ZERO: AccountSignals = {
  wavesCreated: 0,
  capsulesPublished: 0,
  learningEvents: 0,
  actionPlans: 0,
  actionsWithOwner: 0,
  evidenceRecords: 0,
  cyclesRegistered: 0,
};

const FULL: AccountSignals = {
  wavesCreated: 4,
  capsulesPublished: 3,
  learningEvents: 40,
  actionPlans: 1,
  actionsWithOwner: 6,
  evidenceRecords: 4,
  cyclesRegistered: 2,
};

describe("customer-health-engine — bandas honestas", () => {
  test("conta sem nenhuma atividade → score 0, banda nascente", () => {
    const result = computeCustomerHealth(ZERO);
    expect(result.score).toBe(0);
    expect(result.band).toBe("nascente");
    expect(result.northStarMet).toBe(false);
  });

  test("conta percorrendo o arco completo → score 100, banda florescendo", () => {
    const result = computeCustomerHealth(FULL);
    expect(result.score).toBe(100);
    expect(result.band).toBe("florescendo");
  });

  test("as 4 dimensões somam exatamente o score total", () => {
    const result = computeCustomerHealth({ ...FULL, learningEvents: 5, evidenceRecords: 1 });
    const sum = result.dimensions.reduce((s, d) => s + d.score, 0);
    expect(result.score).toBe(sum);
  });

  test("só medir (sem aprender/transformar/evoluir) fica em ativando, nunca operando", () => {
    const result = computeCustomerHealth({ ...ZERO, wavesCreated: 2, capsulesPublished: 2 });
    expect(result.dimensions.find((d) => d.id === "medir")!.score).toBe(25);
    expect(result.band).toBe("ativando"); // 25 pts — medir sozinho não opera vitalidade
  });
});

describe("customer-health-engine — North Star (nunca inflado)", () => {
  test("North Star exige ≥2 ciclos E ≥1 evidência — só ciclos não basta", () => {
    expect(
      computeCustomerHealth({ ...FULL, evidenceRecords: 0 }).northStarMet,
    ).toBe(false);
    expect(
      computeCustomerHealth({ ...FULL, cyclesRegistered: 1 }).northStarMet,
    ).toBe(false);
    expect(computeCustomerHealth(FULL).northStarMet).toBe(true);
  });
});

describe("customer-health-engine — próxima melhor ação (número sem caminho é vaidade)", () => {
  test("conta zerada aponta para a primeira onda", () => {
    const result = computeCustomerHealth(ZERO);
    expect(result.nextBestAction).toContain("primeira onda");
  });

  test("mediu mas não publicou → aponta para o n≥5", () => {
    const result = computeCustomerHealth({ ...ZERO, wavesCreated: 1 });
    const medir = result.dimensions.find((d) => d.id === "medir")!;
    expect(medir.nextAction).toContain("n≥5");
  });

  test("plano sem donos → aponta para o Guia MTE §13", () => {
    const result = computeCustomerHealth({ ...FULL, actionsWithOwner: 0, actionPlans: 1 });
    const transformar = result.dimensions.find((d) => d.id === "transformar")!;
    expect(transformar.nextAction).toContain("§13");
  });

  test("a próxima melhor ação da CONTA vem da dimensão mais fraca", () => {
    // Tudo pleno exceto evoluir → a ação da conta é a de evoluir.
    const result = computeCustomerHealth({ ...FULL, evidenceRecords: 0, cyclesRegistered: 0 });
    expect(result.nextBestAction).toContain("evidência");
  });

  test("cada dimensão declara a evidência com os números reais contados", () => {
    const result = computeCustomerHealth({ ...ZERO, wavesCreated: 3, capsulesPublished: 1 });
    const medir = result.dimensions.find((d) => d.id === "medir")!;
    expect(medir.evidence).toContain("3 onda(s)");
    expect(medir.evidence).toContain("1 leitura(s)");
  });
});

describe("customer-health-engine — determinismo e fronteiras", () => {
  test("mesma entrada → mesma saída", () => {
    expect(computeCustomerHealth(FULL)).toEqual(computeCustomerHealth({ ...FULL }));
  });

  test("degrau honesto: 1 unidade nunca vale o pleno da dimensão", () => {
    const one = computeCustomerHealth({ ...ZERO, learningEvents: 1 });
    const many = computeCustomerHealth({ ...ZERO, learningEvents: 20 });
    const dimOne = one.dimensions.find((d) => d.id === "aprender")!.score;
    const dimMany = many.dimensions.find((d) => d.id === "aprender")!.score;
    expect(dimOne).toBeGreaterThan(0);
    expect(dimOne).toBeLessThan(dimMany);
    expect(dimMany).toBe(25);
  });

  test("score nunca passa de 100 nem de 25 por dimensão, mesmo com contagens absurdas", () => {
    const absurd = computeCustomerHealth({
      wavesCreated: 999,
      capsulesPublished: 999,
      learningEvents: 99999,
      actionPlans: 99,
      actionsWithOwner: 999,
      evidenceRecords: 999,
      cyclesRegistered: 99,
    });
    expect(absurd.score).toBe(100);
    for (const d of absurd.dimensions) expect(d.score).toBeLessThanOrEqual(25);
  });
});
