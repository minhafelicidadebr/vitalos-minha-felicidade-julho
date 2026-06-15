import { describe, expect, test } from "bun:test";
import { getPulseConfig, getResponseLabels, selectPulseItems } from "./pulse-engine";
import type { ProprietaryIndex } from "../pack/pack-types";

const FRAMEWORK = {
  id: "test-pulse",
  name: "Pulse Teste",
  version: "1.0.0",
  pulse: { durationSeconds: 90, itemsPerPulse: 2, optOut: false },
  responseScale: { labels: ["Discordo", "Neutro", "Concordo"] },
  lenses: [
    {
      id: "eu",
      color: "#111",
      pillars: [
        { id: "energia", name: "Energia", sampleItems: ["Tenho energia no trabalho."] },
        { id: "proposito", name: "Propósito", sampleItems: ["Meu trabalho tem sentido."] },
      ],
    },
    {
      id: "nos",
      color: "#222",
      pillars: [
        { id: "confianca", name: "Confiança", sampleItems: ["Confio na equipe."] },
        { id: "semitens", name: "Sem Itens" }, // sem sampleItems → ignorado
      ],
    },
  ],
} as unknown as ProprietaryIndex;

// ─── Config ──────────────────────────────────────────────────────────────────

describe("getPulseConfig", () => {
  test("lê config do pack", () => {
    const c = getPulseConfig(FRAMEWORK);
    expect(c.durationSeconds).toBe(90);
    expect(c.itemsPerPulse).toBe(2);
    expect(c.optOut).toBe(false);
  });

  test("usa defaults quando ausente", () => {
    const c = getPulseConfig({ id: "x", name: "x", version: "1" } as ProprietaryIndex);
    expect(c.durationSeconds).toBe(60);
    expect(c.itemsPerPulse).toBe(3);
    expect(c.optOut).toBe(true);
  });
});

// ─── Labels ──────────────────────────────────────────────────────────────────

describe("getResponseLabels", () => {
  test("lê labels do pack", () => {
    expect(getResponseLabels(FRAMEWORK)).toEqual(["Discordo", "Neutro", "Concordo"]);
  });

  test("default 1–5 quando ausente", () => {
    const labels = getResponseLabels({ id: "x", name: "x", version: "1" } as ProprietaryIndex);
    expect(labels).toEqual(["1", "2", "3", "4", "5"]);
  });
});

// ─── Seleção de itens (lowest-scoring-first) ─────────────────────────────────

describe("selectPulseItems", () => {
  test("seleciona os N pilares de menor score", () => {
    const scores = new Map([
      ["energia", 200],
      ["proposito", 800],
      ["confianca", 500],
    ]);
    const items = selectPulseItems(FRAMEWORK, scores, 2);
    expect(items).toHaveLength(2);
    // menores: energia(200), confianca(500)
    expect(items.map((i) => i.pillarId)).toEqual(["energia", "confianca"]);
  });

  test("ignora pilares sem sampleItems", () => {
    const items = selectPulseItems(FRAMEWORK, new Map(), 10);
    expect(items.every((i) => i.pillarId !== "semitens")).toBe(true);
    // só 3 pilares têm itens
    expect(items).toHaveLength(3);
  });

  test("pilar sem score usa default 500", () => {
    // energia sem score (→500), proposito 100 (menor)
    const scores = new Map([["proposito", 100]]);
    const items = selectPulseItems(FRAMEWORK, scores, 1);
    expect(items[0]!.pillarId).toBe("proposito");
  });

  test("count maior que itens disponíveis retorna todos", () => {
    const items = selectPulseItems(FRAMEWORK, new Map(), 99);
    expect(items).toHaveLength(3);
  });

  test("item exposto carrega metadados da lente (sem score interno)", () => {
    const items = selectPulseItems(FRAMEWORK, new Map([["energia", 0]]), 1);
    const item = items[0]!;
    expect(item.pillarName).toBe("Energia");
    expect(item.lensId).toBe("eu");
    expect(item.lensColor).toBe("#111");
    expect(item.text).toBe("Tenho energia no trabalho.");
    expect(item).not.toHaveProperty("score");
  });

  test("count 0 retorna vazio", () => {
    expect(selectPulseItems(FRAMEWORK, new Map(), 0)).toHaveLength(0);
  });
});
