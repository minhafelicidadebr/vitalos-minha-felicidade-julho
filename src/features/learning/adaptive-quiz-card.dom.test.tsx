// Testes DOM (happy-dom + Testing Library) do AdaptiveQuizCard — LDX-2
// Fatia B. Mesmo padrão da LDX-1: asserção semântica (role, texto,
// callback), não snapshot. O fluxo completo na rota /voz-segura foi
// verificado via NAVEGADOR REAL nesta sessão (dev server + leitura de DOM):
// acerto sobe nível, erro desce com fallback, undo restaura, síntese
// pedagógica e marco da trilha. Aqui cobrimos o comportamento isolado.

import { describe, expect, test } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import { AdaptiveQuizCard } from "./components/AdaptiveQuizCard";
import type { AdaptiveQuizBank } from "@/engine/learning/adaptive-quiz-engine";

const BANK: AdaptiveQuizBank = {
  id: "banco-dom",
  version: "1.0.0",
  items: [
    {
      id: "d-f1",
      difficulty: "fundamento",
      question: "Pergunta de fundamento?",
      options: [
        { id: "a", label: "Opção certa" },
        { id: "b", label: "Opção errada" },
      ],
      correctOptionId: "a",
      explanation: "Explicação do fundamento.",
      sourceStudyId: "TRU-006",
    },
    {
      id: "d-a1",
      difficulty: "aplicacao",
      question: "Pergunta de aplicação?",
      options: [
        { id: "a", label: "Aplicação certa" },
        { id: "b", label: "Aplicação errada" },
      ],
      correctOptionId: "a",
      explanation: "Explicação da aplicação.",
      sourceStudyId: "TRU-006",
    },
  ],
};

const resolveSourceLabel = (id: string) => `Fonte ${id}`;

describe("AdaptiveQuizCard", () => {
  test("começa no fundamento e mostra explicação + fonte após responder", () => {
    render(<AdaptiveQuizCard bank={BANK} resolveSourceLabel={resolveSourceLabel} />);
    expect(screen.getByText("Pergunta de fundamento?")).toBeTruthy();
    expect(screen.getByText(/Nível: Fundamento/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Opção certa" }));
    expect(screen.getByText(/Explicação do fundamento\./)).toBeTruthy();
    expect(screen.getByText(/Fonte TRU-006/)).toBeTruthy();
    expect(screen.getByText(/\(sua resposta\)/)).toBeTruthy();
  });

  test("desfazer devolve a mesma pergunta; continuar avança de nível", () => {
    render(<AdaptiveQuizCard bank={BANK} resolveSourceLabel={resolveSourceLabel} />);
    fireEvent.click(screen.getByRole("button", { name: "Opção certa" }));

    fireEvent.click(screen.getByRole("button", { name: "Desfazer resposta" }));
    expect(screen.getByText("Pergunta de fundamento?")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Opção certa" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByText("Pergunta de aplicação?")).toBeTruthy();
    expect(screen.getByText(/Nível: Aplicação/)).toBeTruthy();
  });

  test("sessão completa: síntese por nível, fila de revisão e nota de privacidade — sem placar único", () => {
    render(<AdaptiveQuizCard bank={BANK} resolveSourceLabel={resolveSourceLabel} />);
    fireEvent.click(screen.getByRole("button", { name: "Opção certa" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.click(screen.getByRole("button", { name: "Aplicação errada" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

    expect(screen.getByText(/Trilha de perguntas concluída/)).toBeTruthy();
    expect(screen.getByText(/Fundamento \(entender o mecanismo\): 1 de 1/)).toBeTruthy();
    expect(screen.getByText(/Para revisar com calma:/)).toBeTruthy();
    expect(screen.getByText(/não é gravado nem vira indicador para a organização/)).toBeTruthy();
    // Invariante: nenhum placar percentual único na síntese.
    expect(screen.queryByText(/%/)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Refazer do início" }));
    expect(screen.getByText("Pergunta de fundamento?")).toBeTruthy();
  });

  test("banco inválido rende estado honesto de indisponibilidade", () => {
    render(
      <AdaptiveQuizCard
        bank={{ id: "x", version: "", items: [] }}
        resolveSourceLabel={resolveSourceLabel}
      />,
    );
    expect(screen.getByText(/Quiz indisponível no momento/)).toBeTruthy();
  });

  test("onSummaryChange reporta completude para o progresso da trilha", () => {
    const completeFlags: boolean[] = [];
    render(
      <AdaptiveQuizCard
        bank={BANK}
        resolveSourceLabel={resolveSourceLabel}
        onSummaryChange={(s) => {
          completeFlags.push(s.complete);
        }}
      />,
    );
    expect(completeFlags.at(-1)).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Opção certa" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.click(screen.getByRole("button", { name: "Aplicação certa" }));
    expect(completeFlags.at(-1)).toBe(true);
  });
});
