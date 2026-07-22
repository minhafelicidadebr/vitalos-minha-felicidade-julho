// Testes DOM (happy-dom + Testing Library) do CodesignStudioCard — LD-009
// Fatia C. Cobre a seleção de padrão, o guardrail visível, o gate de revisão
// humana e o export rastreável. Asserção semântica (role/texto), nunca
// snapshot. Nunca passar nó DOM a matcher que pode falhar (o pretty-printer
// do happy-dom é lentíssimo) — sempre string.

import { describe, expect, test } from "bun:test";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { CodesignStudioCard } from "./components/CodesignStudioCard";
import type { InterventionPattern, Plan90dPhase } from "@/domain/evidence/intervention-patterns";

const PATTERNS: readonly InterventionPattern[] = [
  {
    pattern_id: "projeto_equipe",
    name: "Microprojeto de equipe",
    scope: "uma equipe, acordo local",
    supervision: "líder da equipe; RH informado",
  },
  {
    pattern_id: "projeto_lideranca",
    name: "Projeto de liderança",
    scope: "prática de gestão",
    supervision: "RH acompanha",
    rule: "nunca transforma o líder em profissional clínico",
  },
];

const REQUIRED = ["hypothesis", "stop_rule"] as const;
const WATCHLIST = ["intensificação do trabalho", "exclusão de quem não participa"] as const;
const PHASES: readonly Plan90dPhase[] = [{ days: "0-15", focus: "baseline e co-design" }];
const ROLES = [
  { id: "LIDER_EQUIPE", label: "Líder de Equipe" },
  { id: "RH_ADMIN", label: "RH Admin" },
];

function isDisabled(el: HTMLElement): boolean {
  return (el as HTMLButtonElement | HTMLInputElement).disabled;
}

function renderCard() {
  return render(
    <CodesignStudioCard
      patterns={PATTERNS}
      requiredFieldKeys={REQUIRED}
      adverseEffectsWatchlist={WATCHLIST}
      plan90dPhases={PHASES}
      ownerRoleOptions={ROLES}
      reviewerRole="RH_ADMIN"
      now={() => "2026-07-21T12:00:00.000Z"}
    />,
  );
}

/** "Equipe" existe como escopo E como alvo — os grupos têm aria-label próprio
 * (é o que dá contexto ao leitor de tela), então escopamos por grupo. */
function scopeChip(name: string): HTMLElement {
  return within(screen.getByRole("group", { name: "Escopo da intervenção" })).getByRole("button", {
    name,
  });
}
function targetChip(name: string): HTMLElement {
  return within(screen.getByRole("group", { name: "Alvo da medida" })).getByRole("button", { name });
}

/** Preenche tudo que falta para um rascunho válido (escopo equipe/processo). */
function fillValidDraft() {
  fireEvent.click(scopeChip("Equipe"));
  fireEvent.click(targetChip("Processo"));
  fireEvent.change(screen.getByLabelText(/Hipótese/), { target: { value: "h" } });
  fireEvent.change(screen.getByLabelText(/Stop rule/), { target: { value: "s" } });
  fireEvent.change(screen.getByLabelText("O que medir"), { target: { value: "Horas extras" } });
  fireEvent.change(screen.getByLabelText("Unidade"), { target: { value: "h" } });
  fireEvent.change(screen.getByLabelText(/Baseline/), { target: { value: "6" } });
  fireEvent.change(screen.getByLabelText("Alvo"), { target: { value: "3" } });
  fireEvent.change(screen.getByLabelText(/Dono/), { target: { value: "LIDER_EQUIPE" } });
  fireEvent.change(screen.getByLabelText("Prazo"), { target: { value: "2026-09-30" } });
  fireEvent.click(screen.getByLabelText(WATCHLIST[0]));
}

describe("CodesignStudioCard — seleção de padrão", () => {
  test("lista os padrões com escopo, supervisão e a regra quando existe", () => {
    renderCard();
    expect(screen.getByText("Microprojeto de equipe")).toBeTruthy();
    expect(screen.getByText(/uma equipe, acordo local/)).toBeTruthy();
    expect(screen.getByText(/nunca transforma o líder em profissional clínico/)).toBeTruthy();
  });

  test("escolher um padrão abre a composição e permite trocar", () => {
    renderCard();
    fireEvent.click(screen.getByRole("button", { name: /Microprojeto de equipe/ }));
    expect(screen.getByText("Escopo e alvo")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Trocar padrão" }));
    expect(screen.getByText("Microprojeto de equipe")).toBeTruthy();
  });
});

describe("CodesignStudioCard — GUARDRAIL visível", () => {
  test("escopo organizacional + alvo indivíduo mostra BLOQUEIO e trava o fechamento", () => {
    renderCard();
    fireEvent.click(screen.getByRole("button", { name: /Microprojeto de equipe/ }));
    fillValidDraft();
    // Tudo válido até aqui: o gate de revisão libera.
    const reviewCheckbox = screen.getByRole("checkbox", { name: /Revisei esta composição/ });
    expect(isDisabled(reviewCheckbox)).toBe(false);

    // Agora viola o guardrail.
    fireEvent.click(scopeChip("Organizacional"));
    fireEvent.click(targetChip("Indivíduo"));

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText(/não admite medida individualizante/)).toBeTruthy();
    expect(isDisabled(screen.getByRole("checkbox", { name: /Revisei esta composição/ }))).toBe(true);
    expect(isDisabled(screen.getByRole("button", { name: "Fechar composição" }))).toBe(true);
  });

  test("escopo organizacional com alvo de processo NÃO bloqueia", () => {
    renderCard();
    fireEvent.click(screen.getByRole("button", { name: /Microprojeto de equipe/ }));
    fillValidDraft();
    fireEvent.click(scopeChip("Organizacional"));
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("CodesignStudioCard — gate de revisão humana e export", () => {
  test("sem campos preenchidos, revisão e fechamento ficam travados", () => {
    renderCard();
    fireEvent.click(screen.getByRole("button", { name: /Microprojeto de equipe/ }));
    expect(isDisabled(screen.getByRole("checkbox", { name: /Revisei esta composição/ }))).toBe(true);
    expect(isDisabled(screen.getByRole("button", { name: "Fechar composição" }))).toBe(true);
    expect(screen.getByText(/Faltam \d+ item\(ns\) para poder revisar/)).toBeTruthy();
  });

  test("rascunho válido + revisão confirmada produz o export rastreável", () => {
    renderCard();
    fireEvent.click(screen.getByRole("button", { name: /Microprojeto de equipe/ }));
    fillValidDraft();

    // Ainda travado enquanto a revisão não é confirmada (gate humano).
    expect(isDisabled(screen.getByRole("button", { name: "Fechar composição" }))).toBe(true);
    fireEvent.click(screen.getByRole("checkbox", { name: /Revisei esta composição/ }));
    fireEvent.click(screen.getByRole("button", { name: "Fechar composição" }));

    expect(screen.getByText("Intervenção composta")).toBeTruthy();
    expect(screen.getByText(/Revisado por: RH_ADMIN/)).toBeTruthy();
    expect(screen.getByText(/em 2026-07-21/)).toBeTruthy();
    expect(screen.getByText(/nada foi salvo/)).toBeTruthy();
  });

  test("'Compor outra' reinicia do zero", () => {
    renderCard();
    fireEvent.click(screen.getByRole("button", { name: /Microprojeto de equipe/ }));
    fillValidDraft();
    fireEvent.click(screen.getByRole("checkbox", { name: /Revisei esta composição/ }));
    fireEvent.click(screen.getByRole("button", { name: "Fechar composição" }));

    fireEvent.click(screen.getByRole("button", { name: "Compor outra" }));
    expect(screen.getByText("Microprojeto de equipe")).toBeTruthy();
  });
});

describe("CodesignStudioCard — dono é papel, nunca texto livre", () => {
  test("o dono é um SELECT de papéis do pack (sem input de texto)", () => {
    renderCard();
    fireEvent.click(screen.getByRole("button", { name: /Microprojeto de equipe/ }));
    const owner = screen.getByLabelText(/Dono/);
    expect(owner.tagName).toBe("SELECT");
    expect(screen.getByRole("option", { name: "Líder de Equipe" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "RH Admin" })).toBeTruthy();
  });
});
