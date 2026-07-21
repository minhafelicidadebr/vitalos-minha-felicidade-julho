import { describe, expect, test } from "bun:test";
import { renderTrailSynthesisPdf } from "./trail-synthesis-pdf";
import { buildTrailSynthesis, type TrailSynthesisInput } from "@/engine/learning/trail-synthesis-engine";

const INPUT: TrailSynthesisInput = {
  trailTitle: "Voz Segura",
  mechanismLabel: "Redução do medo interpessoal",
  mechanismStatement: "Ambientes não punitivos favorecem comportamentos de aprendizagem.",
  sources: [
    {
      citation: "Edmondson, A. C. (1999).",
      note: "Associação correlacional — não causalidade, não generaliza automaticamente.",
    },
  ],
  practiced: ["Quiz adaptativo", "Simulador de decisões", "Microlearning espaçado"],
};

const META = { documentId: "sintese-1", generatedAtLabel: "21/07/2026" };

describe("renderTrailSynthesisPdf", () => {
  test("produz um jsPDF válido com pelo menos uma página", () => {
    const pdf = renderTrailSynthesisPdf(buildTrailSynthesis(INPUT), META);
    expect(pdf.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });

  test("gera bytes de PDF não vazios", () => {
    const pdf = renderTrailSynthesisPdf(buildTrailSynthesis(INPUT), META);
    const out = pdf.output("datauristring");
    expect(out.startsWith("data:application/pdf")).toBe(true);
    expect(out.length).toBeGreaterThan(100);
  });
});
