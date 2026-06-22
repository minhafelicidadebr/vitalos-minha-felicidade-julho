import { describe, expect, test } from "bun:test";
import {
  orderByDriverNeed,
  priorityDriverIds,
  rankDriversByNeed,
  type DriverPillarLink,
  type PillarSignal,
} from "./driver-pillar-bridge";

const LINKS: DriverPillarLink[] = [
  { driverId: "energia", pillarIds: ["energia_vitalidade"] },
  { driverId: "seguranca", pillarIds: ["seguranca_psicologica"] },
  { driverId: "proposito", pillarIds: ["proposito_significado"] },
];

const SIGNALS: PillarSignal[] = [
  { pillarId: "energia_vitalidade", name: "Energia", score: 420, visible: true },
  { pillarId: "seguranca_psicologica", name: "Segurança", score: 880, visible: true },
  { pillarId: "proposito_significado", name: "Propósito", score: 610, visible: true },
];

describe("driver-pillar-bridge — Educar dirigido pelo Medir", () => {
  test("ordena drivers por menor score do pilar endereçado", () => {
    const needs = rankDriversByNeed(LINKS, SIGNALS, { priorityCount: 2 });
    // menor → maior: energia(420), proposito(610), seguranca(880)
    expect(needs.map((n) => n.driverId)).toEqual(["energia", "proposito", "seguranca"]);
    expect(needs[0]!.lowestScore).toBe(420);
  });

  test("os N pilares de menor score viram prioridade", () => {
    const needs = rankDriversByNeed(LINKS, SIGNALS, { priorityCount: 2 });
    const ids = priorityDriverIds(needs);
    expect(ids.has("energia")).toBe(true); // 420 — entre os 2 menores
    expect(ids.has("proposito")).toBe(true); // 610 — entre os 2 menores
    expect(ids.has("seguranca")).toBe(false); // 880 — fora
  });

  test("pilar oculto por k-anon (visible:false) não gera prioridade nem match", () => {
    const masked: PillarSignal[] = [
      { pillarId: "energia_vitalidade", name: "Energia", score: 300, visible: false },
      { pillarId: "seguranca_psicologica", name: "Segurança", score: 700, visible: true },
      { pillarId: "proposito_significado", name: "Propósito", score: 650, visible: true },
    ];
    const needs = rankDriversByNeed(LINKS, masked, { priorityCount: 1 });
    const energia = needs.find((n) => n.driverId === "energia")!;
    expect(energia.matchedPillars).toEqual([]);
    expect(energia.lowestScore).toBe(1000); // sem pilar visível → vai ao fim
    expect(needs.at(-1)!.driverId).toBe("energia");
  });

  test("driver sem pilar correspondente não é prioridade e cai ao fim", () => {
    const needs = rankDriversByNeed(
      [...LINKS, { driverId: "orfao", pillarIds: ["inexistente"] }],
      SIGNALS,
      { priorityCount: 2 },
    );
    expect(needs.at(-1)!.driverId).toBe("orfao");
    expect(needs.at(-1)!.priority).toBe(false);
  });

  test("orderByDriverNeed reordena cartões preservando ordem dentro do driver", () => {
    const cards = [
      { id: "s1", card: { driverId: "seguranca" } },
      { id: "e1", card: { driverId: "energia" } },
      { id: "s2", card: { driverId: "seguranca" } },
      { id: "p1", card: { driverId: "proposito" } },
    ];
    const needs = rankDriversByNeed(LINKS, SIGNALS, { priorityCount: 2 });
    const ordered = orderByDriverNeed(cards, needs);
    // energia primeiro, depois proposito, depois seguranca (s1 antes de s2)
    expect(ordered.map((c) => c.id)).toEqual(["e1", "p1", "s1", "s2"]);
  });

  test("sem sinais visíveis, nenhuma prioridade é presumida", () => {
    const needs = rankDriversByNeed(LINKS, [], {});
    expect(priorityDriverIds(needs).size).toBe(0);
    expect(needs.every((n) => n.lowestScore === 1000)).toBe(true);
  });
});
