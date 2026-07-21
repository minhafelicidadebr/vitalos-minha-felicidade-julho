// Testes DOM (happy-dom + Testing Library) do ScenarioSimulator — LDX-2
// Fatia C. Asserção semântica (role, texto, callback). O fluxo na rota
// /voz-segura foi verificado via NAVEGADOR REAL nesta sessão.

import { describe, expect, test } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import { ScenarioSimulator } from "./components/ScenarioSimulator";
import type { BranchingScenario } from "@/engine/learning/trail-engine";

const SCENARIOS: readonly BranchingScenario[] = [
  {
    id: "s1",
    title: "Cenário Um",
    setup: "Situação um.",
    bestChoiceId: "s1-c2",
    choices: [
      {
        id: "s1-c1",
        label: "Escolha tentadora",
        likelyConsequence: "Consequência provável tentadora que passa dos vinte caracteres.",
        mechanismNote: "Mecanismo explicado com mais de vinte caracteres aqui.",
        commonMistake: "Erro comum um.",
        sourceStudyId: "TRU-006",
        betterAlternative: "Alternativa melhor um.",
      },
      {
        id: "s1-c2",
        label: "Escolha alinhada",
        likelyConsequence: "Consequência provável alinhada que passa dos vinte caracteres.",
        mechanismNote: "Mecanismo alinhado com mais de vinte caracteres aqui.",
        commonMistake: "Erro comum dois.",
        sourceStudyId: "LDR-007",
      },
    ],
  },
  {
    id: "s2",
    title: "Cenário Dois",
    setup: "Situação dois.",
    bestChoiceId: "s2-c1",
    choices: [
      {
        id: "s2-c1",
        label: "Única escolha dois",
        likelyConsequence: "Consequência provável do cenário dois com mais de vinte caracteres.",
        mechanismNote: "Mecanismo do cenário dois com mais de vinte caracteres.",
        commonMistake: "Erro comum três.",
        sourceStudyId: "TRU-006",
      },
    ],
  },
];

const resolveSourceLabel = (id: string) => `Fonte ${id}`;

describe("ScenarioSimulator", () => {
  test("mostra o primeiro cenário e revela feedback governado ao escolher", () => {
    render(<ScenarioSimulator scenarios={SCENARIOS} resolveSourceLabel={resolveSourceLabel} />);
    expect(screen.getByText("Cenário Um")).toBeTruthy();
    expect(screen.getByText("Situação um.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Escolha alinhada" }));
    expect(screen.getByText(/Escolha mais alinhada ao mecanismo/)).toBeTruthy();
    expect(screen.getByText(/Consequência provável alinhada/)).toBeTruthy();
    expect(screen.getByText(/Fonte LDR-007/)).toBeTruthy();
  });

  test("escolha tentadora recebe rótulo de custo, não de acerto", () => {
    render(<ScenarioSimulator scenarios={SCENARIOS} resolveSourceLabel={resolveSourceLabel} />);
    fireEvent.click(screen.getByRole("button", { name: "Escolha tentadora" }));
    expect(screen.getByText(/Escolha tentadora — veja o custo provável/)).toBeTruthy();
    expect(screen.getByText("Alternativa melhor:")).toBeTruthy();
    expect(screen.getByText(/Alternativa melhor um\./)).toBeTruthy();
  });

  test("navega entre cenários e conta os explorados", () => {
    render(<ScenarioSimulator scenarios={SCENARIOS} resolveSourceLabel={resolveSourceLabel} />);
    fireEvent.click(screen.getByRole("button", { name: "Escolha alinhada" }));
    expect(screen.getByText(/1 de 2 explorados/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Cenário 2/ }));
    expect(screen.getByText("Situação dois.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Única escolha dois" }));
    expect(screen.getByText(/2 de 2 explorados/)).toBeTruthy();
  });

  test("'Tentar outra resposta' limpa a escolha e reabre o cenário", () => {
    render(<ScenarioSimulator scenarios={SCENARIOS} resolveSourceLabel={resolveSourceLabel} />);
    fireEvent.click(screen.getByRole("button", { name: "Escolha alinhada" }));
    fireEvent.click(screen.getByRole("button", { name: "Tentar outra resposta" }));
    expect(screen.queryByText(/Escolha mais alinhada ao mecanismo/)).toBeNull();
    expect(screen.getByText(/0 de 2 explorados/)).toBeTruthy();
  });

  test("reporta a contagem de explorados para o progresso da trilha", () => {
    const counts: number[] = [];
    render(
      <ScenarioSimulator
        scenarios={SCENARIOS}
        resolveSourceLabel={resolveSourceLabel}
        onExploredChange={(n) => counts.push(n)}
      />,
    );
    expect(counts.at(-1)).toBe(0);
    fireEvent.click(screen.getByRole("button", { name: "Escolha alinhada" }));
    expect(counts.at(-1)).toBe(1);
  });

  test("declara explicitamente que não pontua liderança nem avalia desempenho", () => {
    render(<ScenarioSimulator scenarios={SCENARIOS} resolveSourceLabel={resolveSourceLabel} />);
    expect(
      screen.getByText(/não pontuam liderança nem viram avaliação de desempenho/),
    ).toBeTruthy();
  });

  test("lista vazia rende estado honesto, sem quebrar", () => {
    render(<ScenarioSimulator scenarios={[]} resolveSourceLabel={resolveSourceLabel} />);
    expect(screen.getByText(/Nenhum cenário disponível/)).toBeTruthy();
  });
});
