// Testes DOM (happy-dom + Testing Library) do SpacedMicrolearningCard —
// LDX-2 Fatia D. Cobre o opt-in, o ciclo de recall, a cadência e o
// apagar-do-aparelho. O store é singleton de módulo: reset entre casos.

import { beforeEach, describe, expect, test } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import { SpacedMicrolearningCard } from "./components/SpacedMicrolearningCard";
import { useSpacedMicrolearning } from "@/engine/learning/spaced-microlearning-store";
import type { MicroUnit } from "@/engine/learning/spaced-microlearning-engine";

const UNITS: readonly MicroUnit[] = [
  {
    id: "mu1",
    title: "Unidade Um",
    prompt: "Ideia um curta o suficiente para o teste passar.",
    recallQuestion: "Pergunta de recall um?",
    recallAnswer: "Resposta de recall um, com corpo suficiente.",
    sourceStudyId: "TRU-006",
  },
  {
    id: "mu2",
    title: "Unidade Dois",
    prompt: "Ideia dois curta o suficiente para o teste passar.",
    recallQuestion: "Pergunta de recall dois?",
    recallAnswer: "Resposta de recall dois, com corpo suficiente.",
    sourceStudyId: "LDR-007",
  },
];

const resolveSourceLabel = (id: string) => `Fonte ${id}`;

function renderCard() {
  return render(
    <SpacedMicrolearningCard
      units={UNITS}
      planVersion="1.0.0"
      resolveSourceLabel={resolveSourceLabel}
    />,
  );
}

beforeEach(() => {
  useSpacedMicrolearning.setState({ enabled: false, plan: null });
  localStorage.clear();
});

describe("SpacedMicrolearningCard", () => {
  test("antes do opt-in: convite honesto, nada ativado", () => {
    renderCard();
    expect(screen.getByText(/Fixar o essencial com revisão espaçada/)).toBeTruthy();
    expect(screen.getByText(/O acompanhamento fica salvo só/)).toBeTruthy();
    expect(screen.getByText(/não notificação por push/)).toBeTruthy();
    expect(useSpacedMicrolearning.getState().enabled).toBe(false);
    expect(useSpacedMicrolearning.getState().plan).toBeNull();
  });

  test("opt-in cria plano e revela a primeira unidade vencida", () => {
    renderCard();
    fireEvent.click(screen.getByRole("button", { name: "Acompanhar neste aparelho" }));
    expect(useSpacedMicrolearning.getState().enabled).toBe(true);
    expect(screen.getByText("Revisar agora")).toBeTruthy();
    expect(screen.getByText("Pergunta de recall um?")).toBeTruthy();
  });

  test("revelar mostra resposta + fonte; avaliar reprograma e serve a próxima", () => {
    renderCard();
    fireEvent.click(screen.getByRole("button", { name: "Acompanhar neste aparelho" }));
    fireEvent.click(screen.getByRole("button", { name: /mostrar resposta/ }));
    expect(screen.getByText(/Resposta de recall um/)).toBeTruthy();
    expect(screen.getByText(/Fonte TRU-006/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Fácil/ }));
    // mu1 saiu da fila (agendada adiante); mu2 continua vencida hoje.
    expect(screen.getByText("Pergunta de recall dois?")).toBeTruthy();
  });

  test("cadência ajustável reflete a escolha (aria-pressed)", () => {
    renderCard();
    fireEvent.click(screen.getByRole("button", { name: "Acompanhar neste aparelho" }));
    const semanal = screen.getByRole("button", { name: "Semanal" });
    fireEvent.click(semanal);
    expect(semanal.getAttribute("aria-pressed")).toBe("true");
    expect(useSpacedMicrolearning.getState().plan?.cadence).toBe("semanal");
  });

  test("'Parar e apagar' volta ao convite e limpa o estado privado", () => {
    renderCard();
    fireEvent.click(screen.getByRole("button", { name: "Acompanhar neste aparelho" }));
    fireEvent.click(screen.getByRole("button", { name: /Parar e apagar deste aparelho/ }));
    expect(useSpacedMicrolearning.getState().enabled).toBe(false);
    expect(useSpacedMicrolearning.getState().plan).toBeNull();
    expect(screen.getByText(/Fixar o essencial com revisão espaçada/)).toBeTruthy();
  });

  test("microcopy anti-coerção: revisão ajuda, não cobra — sem streak", () => {
    renderCard();
    fireEvent.click(screen.getByRole("button", { name: "Acompanhar neste aparelho" }));
    // Avalia as duas unidades para chegar ao estado "tudo em dia".
    fireEvent.click(screen.getByRole("button", { name: /mostrar resposta/ }));
    fireEvent.click(screen.getByRole("button", { name: /Fácil/ }));
    fireEvent.click(screen.getByRole("button", { name: /mostrar resposta/ }));
    fireEvent.click(screen.getByRole("button", { name: /Fácil/ }));
    expect(screen.getByText(/Tudo em dia por aqui/)).toBeTruthy();
    expect(screen.getByText(/sem sequência a manter/)).toBeTruthy();
    expect(screen.queryByText(/dias seguidos|streak/i)).toBeNull();
  });
});
