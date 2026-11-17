import { expect, test } from "bun:test";
import { chapterIndex, nearestChapter, routeIndices } from "./navigation";
import type { PresentationDeck } from "./types";

test("legacy links resolve to canonical scenes and executive paths choose the nearest scene", () => {
  const deck = {
    slides: [
      { id: "vitalidade", executive: true },
      { id: "jornada" },
      { id: "servico" },
      { id: "conversa", executive: true },
    ],
  } as PresentationDeck;
  expect(chapterIndex(deck, "#leitura")).toBe(1);
  expect(chapterIndex(deck, "#papeis")).toBe(2);
  expect(chapterIndex(deck, "#missing")).toBe(0);
  expect(routeIndices(deck, true)).toEqual([0, 3]);
  expect(nearestChapter([0, 3], 2)).toBe(3);
  expect(nearestChapter([0, 3], 1)).toBe(0);
});
