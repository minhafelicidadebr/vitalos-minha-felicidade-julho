// Prova de RENDERIZACAO dos quatro estados do painel de dados reais.
//
// Renderiza o mesmo componente de apresentacao que a rota usa, alimentado
// pelos relatorios que a camada de dados produz. O foco e o que a pessoa ve
// -- em especial: abaixo do limiar a tela mostra "<5" e NUNCA o numero exato.

import { describe, expect, test } from "bun:test";
import { render, screen } from "@testing-library/react";
import { buildFibtCohortReport, type CohortAggregate } from "@/lib/fibt/fibt-cohort-report";
import { getFibtManifest } from "@/domain/instruments/fibt/fibt-instrument";
import { CohortCard, EstadoCarregando, EstadoVazio, EstadoErro } from "./fibt-piloto";

const m = getFibtManifest();
const todosItens = (v: number) => Object.fromEntries(m.items.map((i) => [i.id, v]));

const visivel: CohortAggregate = {
  visible: true, n: 6, countLabel: "6", kMin: 5, itemMeans: todosItens(3),
};
const suprimida: CohortAggregate = {
  visible: false, n: null, countLabel: "<5", kMin: 5, itemMeans: null,
  suppressionReason: "privacy_threshold",
};
/** Contrato antigo, que ainda devolvia o n exato abaixo do limiar. */
const suprimidaLegado: CohortAggregate = {
  visible: false, n: 4, countLabel: null, kMin: 5, itemMeans: null,
};

describe("estado 1 — carregando", () => {
  test("anuncia progresso com role=status", () => {
    render(<EstadoCarregando />);
    expect(screen.getByRole("status").textContent).toContain("Carregando");
  });
});

describe("estado 2 — coorte visivel", () => {
  test("mostra escore bruto, os 3 Fatores e a contagem", () => {
    render(<CohortCard chave="alfa" rotulo="Coorte Alfa" relatorio={buildFibtCohortReport(visivel)} />);
    expect(screen.getByTestId("escore-bruto").textContent).toContain("9");
    // "Padrao de Vida" e' Fator E Dominio -- escopo explicito na lista de
    // Fatores, ja que agora o nome aparece duas vezes na tela (fator + dominio).
    const fatores = screen.getByTestId("lista-fatores");
    expect(fatores.textContent).toContain("Padrao de Vida");
    expect(fatores.textContent).toContain("Bem-Estar");
    expect(fatores.textContent).toContain("Satisfacao com a Empresa");
    expect(fatores.querySelectorAll("li")).toHaveLength(3);
    expect(screen.getByTestId("contagem-visivel").textContent).toContain("6");
  });

  test("nao exibe indice 0-1000 nem faixa interpretativa", () => {
    const { container } = render(
      <CohortCard chave="alfa" rotulo="Coorte Alfa" relatorio={buildFibtCohortReport(visivel)} />,
    );
    const texto = (container.textContent ?? "").toLowerCase();
    expect(texto).not.toContain("1000");
    expect(texto).not.toContain("florescente");
    expect(texto).not.toContain("saudavel");
  });

  // Regressao: a validacao visual da FIBT-1 encontrou que o card so mostrava
  // os 3 Fatores -- as 9 leituras descritivas de Dominio nunca apareciam na
  // tela, apesar de o engine ja calcula-las. buildFibtCohortReport sempre
  // devolveu os 9 dominios; a lacuna era so na apresentacao.
  test("mostra as 9 leituras descritivas de dominio, nao so os 3 fatores", () => {
    render(<CohortCard chave="alfa" rotulo="Coorte Alfa" relatorio={buildFibtCohortReport(visivel)} />);
    const lista = screen.getByTestId("lista-dominios");
    const itens = lista.querySelectorAll("li");
    expect(itens).toHaveLength(9);
    for (const nome of ["Padrao de Vida", "Educacao", "Cultura", "Bem-Estar Emocional",
      "Saude", "Uso do Tempo", "Vitalidade Comunitaria", "Meio Ambiente", "Governanca"]) {
      expect(lista.textContent).toContain(nome);
    }
  });

  test("cada dominio mostra media na escala 0-4 e contagem de itens", () => {
    render(<CohortCard chave="alfa" rotulo="Coorte Alfa" relatorio={buildFibtCohortReport(visivel)} />);
    const lista = screen.getByTestId("lista-dominios");
    expect(lista.textContent).toMatch(/\/\s*4/);
    expect(lista.textContent).toMatch(/item/);
  });
});

describe("estado 3 — coorte suprimida", () => {
  test('mostra "<5" no lugar da contagem', () => {
    render(<CohortCard chave="beta" rotulo="Coorte Beta" relatorio={buildFibtCohortReport(suprimida)} />);
    expect(screen.getByTestId("contagem-suprimida").textContent).toBe("<5");
  });

  test("o numero exato NAO aparece em lugar nenhum da tela", () => {
    const { container } = render(
      <CohortCard chave="beta" rotulo="Coorte Beta" relatorio={buildFibtCohortReport(suprimida)} />,
    );
    expect(container.textContent ?? "").not.toMatch(/\b4\b/);
  });

  test("mesmo com o contrato antigo (n=4 no payload), a tela nao revela o numero", () => {
    const { container } = render(
      <CohortCard chave="beta" rotulo="Coorte Beta" relatorio={buildFibtCohortReport(suprimidaLegado)} />,
    );
    expect(screen.getByTestId("contagem-suprimida").textContent).toBe("<5");
    expect(container.textContent ?? "").not.toMatch(/\b4\b/);
  });

  test("nenhum escore, fator ou media de dominio vaza no card suprimido", () => {
    render(<CohortCard chave="beta" rotulo="Coorte Beta" relatorio={buildFibtCohortReport(suprimida)} />);
    expect(screen.queryByTestId("escore-bruto")).toBeNull();
    expect(screen.queryByText("Padrao de Vida")).toBeNull();
  });

  test("explica a supressao como protecao, sem culpar quem participou", () => {
    render(<CohortCard chave="beta" rotulo="Coorte Beta" relatorio={buildFibtCohortReport(suprimida)} />);
    const texto = screen.getByTestId("suprimido").textContent ?? "";
    expect(texto).toContain("proteger");
    expect(texto.toLowerCase()).not.toContain("insuficiente");
  });
});

describe("estado 4 — falha do backend", () => {
  test("usa role=alert e diz que nenhum dado de demonstracao foi exibido", () => {
    render(<EstadoErro motivo="conexao recusada" />);
    const alerta = screen.getByRole("alert");
    expect(alerta.textContent).toContain("conexao recusada");
    expect(alerta.textContent).toContain("Nenhum dado de demonstracao");
  });

  test("erro nao renderiza nenhum numero de resultado", () => {
    const { container } = render(<EstadoErro motivo="timeout" />);
    expect(container.textContent ?? "").not.toMatch(/\d+\s*\/\s*12/);
  });
});

describe("estado vazio", () => {
  test("orienta sem parecer erro", () => {
    render(<EstadoVazio motivo="Informe a onda para carregar." />);
    expect(screen.getByText("Informe a onda para carregar.")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("responsividade", () => {
  test("o card empilha em telas estreitas e alinha em largas", () => {
    const { container } = render(
      <CohortCard chave="alfa" rotulo="Coorte Alfa" relatorio={buildFibtCohortReport(visivel)} />,
    );
    // Mobile-first: sem largura fixa, sem overflow horizontal forcado.
    const html = container.innerHTML;
    expect(html).not.toMatch(/w-\[\d+px\]/);
    expect(html).not.toContain("overflow-x-scroll");
  });
});
