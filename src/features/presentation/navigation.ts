import type { PresentationDeck } from "./types";

// Preserve links shared from previous editions without retaining their editorial layers.
const aliases: Record<string, string> = {
  desafios: "valor",
  playbook: "ciencia",
  "caso-brasil": "caso",
  leitura: "jornada",
  aplicacao: "transformacao",
  evolucao: "transformacao",
  confianca: "servico",
  inicio: "servico",
  papeis: "servico",
};
export function chapterIndex(deck: PresentationDeck, hash: string): number {
  const id = hash.replace(/^#/, "");
  return Math.max(
    0,
    deck.slides.findIndex((s) => s.id === (aliases[id] ?? id)),
  );
}
export function routeIndices(deck: PresentationDeck, executive: boolean): number[] {
  const indices = deck.slides.flatMap((s, i) => (!executive || s.executive ? [i] : []));
  return indices.length ? indices : deck.slides.map((_, i) => i);
}
export function nearestChapter(indices: number[], index: number): number {
  return indices.reduce(
    (a, b) => (Math.abs(b - index) < Math.abs(a - index) ? b : a),
    indices[0] ?? 0,
  );
}
