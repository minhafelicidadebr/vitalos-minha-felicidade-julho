import { describe, expect, test } from "bun:test";
import {
  bestDriverForLever,
  buildLeverToDriverMap,
  matchDriversForLever,
} from "./lever-driver-bridge";

const DRIVERS = [
  { driverId: "carga", pillarIds: ["condicoes_carga", "energia_vitalidade"] },
  { driverId: "autonomia", pillarIds: ["equilibrio_autonomia"] },
  { driverId: "lideranca", pillarIds: ["cuidado_ativo", "clareza_direcao"] },
];

describe("matchDriversForLever", () => {
  test("ranqueia por maior sobreposição de pilares", () => {
    const lever = {
      leverId: "energia_carga",
      pillarIds: ["energia_vitalidade", "condicoes_carga", "equilibrio_autonomia"],
    };
    const matches = matchDriversForLever(lever, DRIVERS);
    expect(matches[0]!.driverId).toBe("carga");
    expect(matches[0]!.overlapCount).toBe(2);
    expect(matches[1]!.driverId).toBe("autonomia");
    expect(matches[1]!.overlapCount).toBe(1);
  });

  test("driver sem nenhum pilar em comum não aparece", () => {
    const lever = { leverId: "x", pillarIds: ["energia_vitalidade"] };
    const matches = matchDriversForLever(lever, DRIVERS);
    expect(matches.some((m) => m.driverId === "lideranca")).toBe(false);
  });

  test("lever sem nenhum pilar em comum com nada retorna array vazio", () => {
    const lever = { leverId: "x", pillarIds: ["pilar_inexistente"] };
    expect(matchDriversForLever(lever, DRIVERS)).toEqual([]);
  });

  test("empate de sobreposição é resolvido por ordem alfabética do driverId", () => {
    const tiedDrivers = [
      { driverId: "zulu", pillarIds: ["a"] },
      { driverId: "alfa", pillarIds: ["a"] },
    ];
    const matches = matchDriversForLever({ leverId: "x", pillarIds: ["a"] }, tiedDrivers);
    expect(matches.map((m) => m.driverId)).toEqual(["alfa", "zulu"]);
  });
});

describe("bestDriverForLever", () => {
  test("retorna o driver de maior sobreposição", () => {
    const lever = { leverId: "energia_carga", pillarIds: ["energia_vitalidade", "condicoes_carga"] };
    expect(bestDriverForLever(lever, DRIVERS)).toBe("carga");
  });

  test("retorna null quando não há pilar em comum — nunca força um match", () => {
    const lever = { leverId: "x", pillarIds: ["pilar_inexistente"] };
    expect(bestDriverForLever(lever, DRIVERS)).toBeNull();
  });
});

describe("buildLeverToDriverMap", () => {
  test("mapeia múltiplos levers de uma vez", () => {
    const levers = [
      { leverId: "energia_carga", pillarIds: ["condicoes_carga"] },
      { leverId: "autonomia_flex", pillarIds: ["equilibrio_autonomia"] },
      { leverId: "sem_match", pillarIds: ["nao_existe"] },
    ];
    const map = buildLeverToDriverMap(levers, DRIVERS);
    expect(map.get("energia_carga")).toBe("carga");
    expect(map.get("autonomia_flex")).toBe("autonomia");
    expect(map.get("sem_match")).toBeNull();
  });

  test("array vazio de levers produz mapa vazio", () => {
    expect(buildLeverToDriverMap([], DRIVERS).size).toBe(0);
  });
});
