// Testes DOM (happy-dom + Testing Library) do TrailConclusionCard — LDX-2
// Fatia E. Cobre o campo de nome opcional (não persistido), os disclaimers
// LD-007/LD-006 e a presença dos gatilhos de PDF. A geração real do PDF é
// coberta pelos smoke tests dos renderizadores (farewell-letter-pdf,
// trail-synthesis-pdf) — aqui não disparamos jsPDF.

import { describe, expect, test } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import { TrailConclusionCard } from "./components/TrailConclusionCard";
import type { FarewellLetterBlocks } from "@/engine/learning/farewell-letter-engine";
import type { TrailSynthesisInput } from "@/engine/learning/trail-synthesis-engine";

const LETTER: FarewellLetterBlocks = {
  title: "Carta a quem escolhe ouvir",
  greetingWithName: "Para {nome} —",
  greetingNeutral: "Para você —",
  stanzas: ["Verso."],
  closingLine: "Fecho.",
  signature: "— Trilha",
  disclaimer: "Expressão artístico-educacional, não evidência.",
};

const SYNTHESIS: TrailSynthesisInput = {
  trailTitle: "Voz Segura",
  mechanismLabel: "Redução do medo interpessoal",
  mechanismStatement: "Ambientes não punitivos favorecem aprendizagem.",
  sources: [{ citation: "Edmondson (1999).", note: "Correlacional, não causal." }],
  practiced: ["Quiz adaptativo"],
};

describe("TrailConclusionCard", () => {
  test("mostra os dois gatilhos de PDF e o disclaimer LD-007 (expressão, não gravada)", () => {
    render(<TrailConclusionCard letterBlocks={LETTER} synthesisInput={SYNTHESIS} />);
    expect(screen.getByRole("button", { name: /Baixar carta-poema/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Baixar síntese técnica/ })).toBeTruthy();
    expect(screen.getByText(/não é gravado nem enviado a ninguém/)).toBeTruthy();
  });

  test("disclaimer LD-006: nega gerar PGR, conformidade e substituição de profissional", () => {
    render(<TrailConclusionCard letterBlocks={LETTER} synthesisInput={SYNTHESIS} />);
    expect(
      screen.getByText(/não gera o PGR, não atesta conformidade com a NR-1 e não substitui/),
    ).toBeTruthy();
  });

  test("campo de nome é opcional e vive só no componente (sem name/autocomplete de rede)", () => {
    render(<TrailConclusionCard letterBlocks={LETTER} synthesisInput={SYNTHESIS} />);
    const input = screen.getByPlaceholderText("Nome (opcional)") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Marina" } });
    expect(input.value).toBe("Marina");
    expect(input.getAttribute("autocomplete")).toBe("off");
    // Sem atributo name → nunca é serializado/enviado por um form.
    expect(input.getAttribute("name")).toBeNull();
  });
});
