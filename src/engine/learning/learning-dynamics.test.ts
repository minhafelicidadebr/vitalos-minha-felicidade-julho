import { describe, expect, test } from "bun:test";
import {
  dynamicsByAxis,
  dynamicsForRoute,
  getDynamic,
  groupByAxis,
  type LearningDynamic,
} from "./learning-dynamics";

const CATALOG: LearningDynamic[] = [
  {
    id: "D1",
    kind: "quiz",
    title: "Quiz",
    tagline: "x",
    axis: "educar",
    pedagogyPt: "x",
    citation: "x",
    enrichesRoute: "/academia",
  },
  {
    id: "D2",
    kind: "flashcard",
    title: "Flashcards",
    tagline: "x",
    axis: "educar",
    pedagogyPt: "x",
    citation: "x",
    enrichesRoute: "/academia",
  },
  {
    id: "X1",
    kind: "scenario",
    title: "Simulador",
    tagline: "x",
    axis: "transformar",
    pedagogyPt: "x",
    citation: "x",
    enrichesRoute: "/trajetoria",
  },
];

describe("learning-dynamics — organização por eixo M.E.T.E.", () => {
  test("getDynamic é tolerante a caixa e espaços", () => {
    expect(getDynamic(CATALOG, " d2 ")?.title).toBe("Flashcards");
    expect(getDynamic(CATALOG, "inexistente")).toBeUndefined();
  });

  test("dynamicsByAxis preserva a ordem do catálogo", () => {
    expect(dynamicsByAxis(CATALOG, "educar").map((d) => d.id)).toEqual(["D1", "D2"]);
    expect(dynamicsByAxis(CATALOG, "medir")).toEqual([]);
  });

  test("dynamicsForRoute reúne dinâmicas que enriquecem a mesma superfície", () => {
    expect(dynamicsForRoute(CATALOG, "/academia").map((d) => d.id)).toEqual(["D1", "D2"]);
    expect(dynamicsForRoute(CATALOG, "/trajetoria").map((d) => d.id)).toEqual(["X1"]);
  });

  test("groupByAxis devolve eixos na ordem do ciclo e omite os vazios", () => {
    const groups = groupByAxis(CATALOG);
    expect(groups.map((g) => g.axis)).toEqual(["educar", "transformar"]);
    expect(groups[0]!.dynamics.map((d) => d.id)).toEqual(["D1", "D2"]);
  });
});
