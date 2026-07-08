import { describe, expect, test } from "bun:test";
import type { DriverExposureNeed } from "../nr1/crosswalk-engine";
import type { DriverEvolution, ReavaliacaoEfficacy } from "../nr1/reavaliacao-engine";
import {
  assessAntagonist,
  assessBestiary,
  reductionLabel,
  selectSeasonAntagonist,
  type AntagonistDef,
} from "./expedition-engine";

const BESTIARY: AntagonistDef[] = [
  { id: "sobrecarga", name: "A Sobrecarga", tagline: "O peso que nunca alivia.", counteredBy: ["carga"] },
  { id: "desconexao", name: "A Desconexão", tagline: "Ninguém por perto.", counteredBy: ["apoio"] },
  {
    id: "injustica",
    name: "A Injustiça Percebida",
    tagline: "As regras não valem igual.",
    counteredBy: ["justica"],
  },
  { id: "cinismo", name: "O Cinismo", tagline: "Por que se importar?", counteredBy: [], finalBoss: true },
];

function need(driverId: string, score = 10, priority = true): DriverExposureNeed {
  return { driverId, label: driverId, score, topDimension: null, priority };
}

function mkDriver(driverId: string, reduction: number, improved: boolean): DriverEvolution {
  const firstLoad = 70;
  const lastLoad = firstLoad - reduction;
  return {
    driverId,
    label: `Driver ${driverId}`,
    macroLayer: "individual",
    dimensionId: `dim_${driverId}`,
    dimensionLabel: `Dimensão ${driverId}`,
    points: [
      { cycleId: "c1", label: "2025-Q3", load: firstLoad, riskLevel: "alto", riskScore: firstLoad },
      {
        cycleId: "c2",
        label: "2026-Q1",
        load: lastLoad,
        riskLevel: improved ? "moderado" : "alto",
        riskScore: lastLoad,
      },
    ],
    firstLoad,
    lastLoad,
    delta: -reduction,
    reduction,
    firstRisk: "alto",
    lastRisk: improved ? "moderado" : "alto",
    trend: reduction >= 5 ? "melhorando" : "estavel",
    improved,
  };
}

function mkEfficacy(
  driverIds: string[],
  lapsedDriverIds: string[] = [],
  ofWhichImproved = 0,
): ReavaliacaoEfficacy {
  return {
    withSourceMeasure: driverIds.length,
    maintained: driverIds.length - lapsedDriverIds.length,
    lapsed: lapsedDriverIds.length,
    ofWhichImproved,
    driverIds,
    lapsedDriverIds,
  };
}

describe("expedition-engine — selectSeasonAntagonist (nunca marketing, sempre medição)", () => {
  test("sem medição (needs vazio) → null, honestidade: sem dado, sem inimigo", () => {
    expect(selectSeasonAntagonist(BESTIARY, [])).toBeNull();
  });

  test("pula driver sem antagonista correspondente e escolhe o próximo pior combatível", () => {
    const needs = [need("clareza"), need("carga"), need("apoio")];
    const result = selectSeasonAntagonist(BESTIARY, needs);
    expect(result?.antagonist.id).toBe("sobrecarga");
    expect(result?.need.driverId).toBe("carga");
  });

  test("nenhum driver do ranking tem antagonista correspondente → null", () => {
    const needs = [need("clareza"), need("autonomia")];
    expect(selectSeasonAntagonist(BESTIARY, needs)).toBeNull();
  });

  test("nunca seleciona o chefe final, mesmo que counteredBy esteja (mal-)configurado", () => {
    const adversarial: AntagonistDef[] = [
      { id: "cinismo", name: "O Cinismo", tagline: "...", counteredBy: ["carga"], finalBoss: true },
    ];
    expect(selectSeasonAntagonist(adversarial, [need("carga")])).toBeNull();
  });

  test("determinístico: mesma entrada → mesma saída", () => {
    const needs = [need("carga")];
    expect(selectSeasonAntagonist(BESTIARY, needs)).toEqual(selectSeasonAntagonist(BESTIARY, needs));
  });
});

describe("expedition-engine — reductionLabel (honestidade, nunca infla)", () => {
  test("os 4 buckets nos limites exatos", () => {
    expect(reductionLabel(0)).toBe("recuo marginal");
    expect(reductionLabel(4.9)).toBe("recuo marginal");
    expect(reductionLabel(5)).toBe("recuo pequeno");
    expect(reductionLabel(14.9)).toBe("recuo pequeno");
    expect(reductionLabel(15)).toBe("recuo moderado");
    expect(reductionLabel(29.9)).toBe("recuo moderado");
    expect(reductionLabel(30)).toBe("recuo grande");
    expect(reductionLabel(100)).toBe("recuo grande");
  });
});

describe("expedition-engine — assessAntagonist (a derrota exige prova)", () => {
  const SOBRECARGA = BESTIARY[0]!; // counteredBy: ["carga"]

  test("sem reavaliação medida do driver que o combate → dominando, sem número a citar", () => {
    const result = assessAntagonist(SOBRECARGA, [], null);
    expect(result.status).toBe("dominando");
    expect(result.bestReduction).toBeNull();
  });

  test("combatentes medidos mas nenhum melhorou → dominando, cita a melhor redução medida", () => {
    const drivers = [mkDriver("carga", -3, false)]; // piorou (reduction negativa)
    const result = assessAntagonist(SOBRECARGA, drivers, null);
    expect(result.status).toBe("dominando");
    expect(result.bestReduction).toBe(-3);
  });

  test("melhora medida mas sem eficácia (efficacy null) → recuando, nunca derrotado sem prova", () => {
    const drivers = [mkDriver("carga", 10, true)];
    const result = assessAntagonist(SOBRECARGA, drivers, null);
    expect(result.status).toBe("recuando");
  });

  test("melhora medida mas o driver está fora de efficacy.driverIds → recuando", () => {
    const drivers = [mkDriver("carga", 10, true)];
    const efficacy = mkEfficacy(["outro_driver"]);
    const result = assessAntagonist(SOBRECARGA, drivers, efficacy);
    expect(result.status).toBe("recuando");
  });

  test("melhora medida mas a medida de fonte caiu em desuso (lapsed) → recuando, nunca derrotado", () => {
    const drivers = [mkDriver("carga", 10, true)];
    const efficacy = mkEfficacy(["carga"], ["carga"]);
    const result = assessAntagonist(SOBRECARGA, drivers, efficacy);
    expect(result.status).toBe("recuando");
  });

  test("melhora + eficácia plena (implementada e mantida) → derrotado, evidência cita o driver e a redução", () => {
    const drivers = [mkDriver("carga", 10, true)];
    const efficacy = mkEfficacy(["carga"]);
    const result = assessAntagonist(SOBRECARGA, drivers, efficacy);
    expect(result.status).toBe("derrotado");
    expect(result.evidenceNote).toContain("recuo pequeno");
    expect(result.bestReduction).toBe(10);
  });

  test("múltiplos combatentes: só derrota quando ALGUM deles tem eficácia plena, cita o correto", () => {
    const antagonist: AntagonistDef = {
      id: "multi",
      name: "Multi",
      tagline: "...",
      counteredBy: ["carga", "apoio"],
    };
    const drivers = [mkDriver("carga", 6, true), mkDriver("apoio", 20, true)];
    // só "apoio" tem eficácia plena; "carga" melhorou mas não tem medida de fonte.
    const efficacy = mkEfficacy(["apoio"]);
    const result = assessAntagonist(antagonist, drivers, efficacy);
    expect(result.status).toBe("derrotado");
    expect(result.evidenceNote).toContain("Driver apoio");
    expect(result.bestReduction).toBe(20); // maior redução entre os combatentes, independente de qual derrotou
  });
});

describe("expedition-engine — O Cinismo (chefe final, sem driver, só cai com ciclo fechado)", () => {
  const CINISMO = BESTIARY[3]!;

  test("sem ciclo fechado e sem melhora medida em lugar nenhum → dominando", () => {
    const result = assessAntagonist(CINISMO, [], null);
    expect(result.status).toBe("dominando");
  });

  test("há melhora medida em algum driver, mas nenhum ciclo fechou com eficácia plena → recuando", () => {
    const drivers = [mkDriver("carga", 10, true)];
    const result = assessAntagonist(CINISMO, drivers, null);
    expect(result.status).toBe("recuando");
  });

  test("ciclo fechado com evidência (ofWhichImproved ≥ 1) → derrotado", () => {
    const efficacy = mkEfficacy(["carga"], [], 1);
    const result = assessAntagonist(CINISMO, [], efficacy);
    expect(result.status).toBe("derrotado");
  });

  test("eficácia existe mas ofWhichImproved = 0 → ainda não derrotado", () => {
    const efficacy = mkEfficacy(["carga"], [], 0);
    const result = assessAntagonist(CINISMO, [], efficacy);
    expect(result.status).not.toBe("derrotado");
  });
});

describe("expedition-engine — assessBestiary (estado dos 8 de uma vez, determinístico)", () => {
  test("mapeia o bestiário inteiro, na mesma ordem do pack", () => {
    const drivers = [mkDriver("carga", 10, true)];
    const efficacy = mkEfficacy(["carga"]);
    const result = assessBestiary(BESTIARY, drivers, efficacy);
    expect(result.map((r) => r.antagonistId)).toEqual(["sobrecarga", "desconexao", "injustica", "cinismo"]);
    expect(result[0]!.status).toBe("derrotado"); // sobrecarga, combatido por "carga"
    expect(result[1]!.status).toBe("dominando"); // desconexao, sem dado de "apoio"
  });

  test("determinístico: mesma entrada → mesma saída", () => {
    const drivers = [mkDriver("carga", 10, true)];
    const efficacy = mkEfficacy(["carga"]);
    expect(assessBestiary(BESTIARY, drivers, efficacy)).toEqual(assessBestiary(BESTIARY, drivers, efficacy));
  });
});
