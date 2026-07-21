import { describe, expect, test } from "bun:test";
import { renderFarewellLetterPdf } from "./farewell-letter-pdf";
import { composeFarewellLetter, type FarewellLetterBlocks } from "@/engine/learning/farewell-letter-engine";

const BLOCKS: FarewellLetterBlocks = {
  title: "Carta a quem escolhe ouvir",
  greetingWithName: "Para {nome} —",
  greetingNeutral: "Para você —",
  stanzas: ["Verso um.\nVerso dois.", "Verso três.\nVerso quatro."],
  closingLine: "Fecho um.\nFecho dois.",
  signature: "— Trilha Voz Segura",
  disclaimer: "Expressão artístico-educacional, sem IA, nada persiste.",
};

const META = { documentId: "carta-1", generatedAtLabel: "21/07/2026" };

describe("renderFarewellLetterPdf", () => {
  test("produz um jsPDF válido com pelo menos uma página", () => {
    const pdf = renderFarewellLetterPdf(composeFarewellLetter(BLOCKS), META);
    expect(pdf.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });

  test("gera bytes de PDF não vazios", () => {
    const pdf = renderFarewellLetterPdf(composeFarewellLetter(BLOCKS, { name: "Marina" }), META);
    const out = pdf.output("datauristring");
    expect(out.startsWith("data:application/pdf")).toBe(true);
    expect(out.length).toBeGreaterThan(100);
  });
});
