// Testes DOM (happy-dom + Testing Library) do SocraticArenaCard — LDX-4
// pull-forward, LD-010 Fatia C. Cobre o roteiro inteiro (enquadramento →
// tese → antítese → evidência → revisão → síntese) e as invariantes visíveis
// na UI (sem vencedor, gating de engajamento, navegação para trás livre).

import { describe, expect, test } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import { SocraticArenaCard } from "./components/SocraticArenaCard";
import type { ArenaDilemma } from "@/engine/learning/socratic-arena-engine";

const DILEMMA: ArenaDilemma = {
  id: "dilema-dom-teste",
  title: "Dilema de teste",
  framing: "Enquadramento com regras: foque em ideias, não em pessoas; sessão privada.",
  sideALabel: "Lado A",
  sideBLabel: "Lado B",
  cards: [
    {
      id: "a1",
      side: "A",
      basis: "evidencia_empirica",
      text: "Argumento A1.",
      sourceStudyId: "TEST-001",
    },
    {
      id: "b1",
      side: "B",
      basis: "valor_operacional",
      text: "Argumento B1.",
    },
  ],
  closingSynthesis: "Síntese de trade-off honesta, sem vencedor.",
};

const resolveSourceLabel = (id: string) => `Fonte ${id}`;

function isDisabled(el: HTMLElement): boolean {
  return (el as HTMLButtonElement).disabled;
}

function renderCard() {
  return render(<SocraticArenaCard dilemma={DILEMMA} resolveSourceLabel={resolveSourceLabel} />);
}

describe("SocraticArenaCard", () => {
  test("enquadramento: exige posição inicial antes de liberar 'Começar'", () => {
    renderCard();
    expect(screen.getByText("Dilema de teste")).toBeTruthy();
    const begin = screen.getByRole("button", { name: "Começar" });
    expect(isDisabled(begin)).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Lado A" }));
    expect(isDisabled(begin)).toBe(false);
  });

  test("tese: 'Continuar' bloqueado até considerar 1 carta do Lado A", () => {
    renderCard();
    fireEvent.click(screen.getByRole("button", { name: "Ainda decidindo" }));
    fireEvent.click(screen.getByRole("button", { name: "Começar" }));

    expect(screen.getByText(/Tese · Lado A/)).toBeTruthy();
    const continueBtn = screen.getByRole("button", { name: "Continuar" });
    expect(isDisabled(continueBtn)).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: /Argumento A1\./ }));
    expect(isDisabled(continueBtn)).toBe(false);
  });

  test("percurso completo: tese → antítese → evidência → revisão → síntese sem vencedor", () => {
    renderCard();
    fireEvent.click(screen.getByRole("button", { name: "Lado A" }));
    fireEvent.click(screen.getByRole("button", { name: "Começar" }));

    fireEvent.click(screen.getByRole("button", { name: /Argumento A1\./ }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

    expect(screen.getByText(/Antítese · Lado B/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Argumento B1\./ }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

    expect(screen.getByText("Evidência considerada")).toBeTruthy();
    expect(screen.getByText(/Argumento A1\./)).toBeTruthy();
    expect(screen.getByText(/Argumento B1\./)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Continuar para a revisão" }));

    expect(screen.getByText(/Depois de considerar os dois lados/)).toBeTruthy();
    const seeSynthesis = screen.getByRole("button", { name: "Ver síntese" });
    expect(isDisabled(seeSynthesis)).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Lado B" }));
    expect(isDisabled(seeSynthesis)).toBe(false);
    fireEvent.click(seeSynthesis);

    expect(screen.getByText("Síntese de trade-off honesta, sem vencedor.")).toBeTruthy();
    expect(screen.getByText(/mudou/)).toBeTruthy(); // ladoA -> ladoB
    expect(screen.getByText(/nada aqui foi salvo ou compartilhado/)).toBeTruthy();
  });

  test("navegação para trás (stepper) é livre entre estágios já visitados", () => {
    renderCard();
    fireEvent.click(screen.getByRole("button", { name: "Lado A" }));
    fireEvent.click(screen.getByRole("button", { name: "Começar" }));
    fireEvent.click(screen.getByRole("button", { name: /Argumento A1\./ }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByText(/Antítese · Lado B/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Tese" }));
    expect(screen.getByText(/Tese · Lado A/)).toBeTruthy();

    const antiteseChip = screen.getByRole("button", { name: "Antítese" });
    expect(isDisabled(antiteseChip)).toBe(false); // já visitado

    const revisaoChip = screen.getByRole("button", { name: "Revisão" });
    expect(isDisabled(revisaoChip)).toBe(true); // nunca visitado
  });

  test("'Recomeçar' reinicia a sessão do zero", () => {
    renderCard();
    fireEvent.click(screen.getByRole("button", { name: "Lado A" }));
    fireEvent.click(screen.getByRole("button", { name: "Começar" }));
    fireEvent.click(screen.getByRole("button", { name: /Argumento A1\./ }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.click(screen.getByRole("button", { name: /Argumento B1\./ }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar para a revisão" }));
    fireEvent.click(screen.getByRole("button", { name: "Lado B" }));
    fireEvent.click(screen.getByRole("button", { name: "Ver síntese" }));

    fireEvent.click(screen.getByRole("button", { name: "Recomeçar" }));
    expect(screen.getByText("Dilema de teste")).toBeTruthy();
    expect(isDisabled(screen.getByRole("button", { name: "Começar" }))).toBe(true);
  });

  test("dilema inválido rende estado honesto de indisponibilidade", () => {
    render(
      <SocraticArenaCard
        dilemma={{ ...DILEMMA, cards: [DILEMMA.cards[0]] }} // Lado B vazio
        resolveSourceLabel={resolveSourceLabel}
      />,
    );
    expect(screen.getByText(/Arena está indisponível no momento/)).toBeTruthy();
  });

  test("invariante — nenhum texto da UI AFIRMA vencedor/lado correto", () => {
    renderCard();
    fireEvent.click(screen.getByRole("button", { name: "Lado A" }));
    fireEvent.click(screen.getByRole("button", { name: "Começar" }));
    fireEvent.click(screen.getByRole("button", { name: /Argumento A1\./ }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.click(screen.getByRole("button", { name: /Argumento B1\./ }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar para a revisão" }));
    fireEvent.click(screen.getByRole("button", { name: "Lado A" }));
    fireEvent.click(screen.getByRole("button", { name: "Ver síntese" }));

    // Mira a DECLARAÇÃO afirmativa de vencedor — não a negação honesta ("sem
    // vencedor") que a própria síntese de fechamento contém corretamente.
    // Trabalha sobre a STRING (document.body.textContent), nunca sobre um nó
    // DOM: passar um nó a um matcher que falha faz o pretty-printer do Bun
    // tentar serializar o elemento inteiro (happy-dom), o que é extremamente
    // lento — always assert on plain strings here.
    const bodyText = document.body.textContent ?? "";
    expect(bodyText).not.toMatch(
      /\b(lado a|lado b) (venceu|ganhou|é o (lado )?(certo|correto))\b/i,
    );
    expect(bodyText).not.toMatch(/a resposta certa é o lado/i);
  });
});
