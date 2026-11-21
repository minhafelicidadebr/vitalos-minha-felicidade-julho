import { describe, expect, test } from "bun:test";
import ref from "./copsoq-ii-br-short-2021.reference.json";
import served from "./copsoq-instrument-manifest.json";

const dims = ref.domains.flatMap((d) => d.dimensions);
const items = dims.flatMap((d) => d.items);

describe("Q1 · referência COPSOQ II-Br curta (2021) × manifesto servido", () => {
  test("referência íntegra: 40 questões, 7 domínios, 11 dimensões, ids únicos", () => {
    expect(items).toHaveLength(ref.questionCount);
    expect(new Set(items).size).toBe(40);
    expect(ref.domains).toHaveLength(7);
    expect(dims).toHaveLength(11);
    expect(ref.scoring.reversedItems.every((i) => items.includes(i))).toBe(true);
  });

  test("divergências estruturais comprovadas (coleta deve seguir bloqueada)", () => {
    const divergences = {
      itemCount: served.item_count !== ref.questionCount,
      dimensionCount: served.dimension_count !== dims.length,
      reversedCount: served.reversed_items.length !== ref.scoring.reversedItems.length,
      aggregation: !/soma/.test(served.scoring.aggregation) ,
      authoredTexts: served.validation_status === "demonstrativo",
    };
    expect(divergences).toEqual({ itemCount: true, dimensionCount: true, reversedCount: true, aggregation: true, authoredTexts: true });
  });
});
