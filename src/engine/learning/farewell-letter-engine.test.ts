import { describe, expect, test } from "bun:test";
import {
  composeFarewellLetter,
  farewellLetterFilename,
  sanitizeName,
  type FarewellLetterBlocks,
} from "./farewell-letter-engine";

const BLOCKS: FarewellLetterBlocks = {
  title: "Carta de teste",
  greetingWithName: "Para {nome}, líder —",
  greetingNeutral: "Para você, líder —",
  stanzas: ["Verso um.\nVerso dois.", "Verso três."],
  closingLine: "Fecho.",
  signature: "— Assinatura",
  disclaimer: "Expressão artístico-educacional, não evidência.",
};

describe("sanitizeName", () => {
  test("apara, colapsa espaços e limita tamanho", () => {
    expect(sanitizeName("  Ana   Maria  ")).toBe("Ana Maria");
    expect(sanitizeName("x".repeat(60))).toHaveLength(40);
  });
  test("vazio/indefinido → null (nunca inventa nome)", () => {
    expect(sanitizeName(undefined)).toBeNull();
    expect(sanitizeName("   ")).toBeNull();
  });
});

describe("composeFarewellLetter — determinística", () => {
  test("sem nome usa a saudação neutra", () => {
    const letter = composeFarewellLetter(BLOCKS);
    expect(letter.greeting).toBe("Para você, líder —");
    expect(letter.stanzas).toEqual(["Verso um.\nVerso dois.", "Verso três."]);
    expect(letter.disclaimer).toContain("não evidência");
  });

  test("com nome injeta apenas na saudação", () => {
    const letter = composeFarewellLetter(BLOCKS, { name: "Marina" });
    expect(letter.greeting).toBe("Para Marina, líder —");
  });

  test("mesma entrada → exatamente a mesma carta (idempotente)", () => {
    const a = composeFarewellLetter(BLOCKS, { name: "Rui" });
    const b = composeFarewellLetter(BLOCKS, { name: "Rui" });
    expect(a).toEqual(b);
  });

  test("não muta os blocos de entrada", () => {
    const snapshot = JSON.stringify(BLOCKS);
    composeFarewellLetter(BLOCKS, { name: "Zé" });
    expect(JSON.stringify(BLOCKS)).toBe(snapshot);
  });
});

describe("farewellLetterFilename", () => {
  test("sem nome usa base neutra", () => {
    expect(farewellLetterFilename(null)).toBe("carta-voz-segura.pdf");
  });
  test("com nome gera slug ASCII seguro (sem acento, sem símbolo)", () => {
    expect(farewellLetterFilename("Ana Túlia!")).toBe("carta-voz-segura-ana-tulia.pdf");
  });
});
