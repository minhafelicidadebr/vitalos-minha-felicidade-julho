import { afterEach, describe, expect, test } from "bun:test";
import { render, screen, waitFor, within } from "@testing-library/react";
import { ProposalPage, ProposalView } from "./ProposalPage";
import { ISG_PROPOSAL } from "@/lib/proposal/isg-content.server";

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
  document.body.innerHTML = "";
});
const fakeFetch = (status: number, body: unknown) => {
  globalThis.fetch = (async () => Response.json(body, { status })) as unknown as typeof fetch;
};

describe("proposta · leitura executiva", () => {
  test("valor visível sem abrir painel, igual no resumo, no bloco de investimento e na tabela de marcos", () => {
    const { container } = render(<ProposalView p={ISG_PROPOSAL} />);
    expect(screen.getAllByText("R$ 60.000").length).toBeGreaterThanOrEqual(3);
    expect(container.textContent).toContain("5 parcelas de R$ 12.000");
    const table = screen.getByRole("table", { name: "Parcelas por marco" });
    expect(within(table).getAllByText("R$ 12.000")).toHaveLength(5);
    // Nenhum valor só dentro de <details>.
    const summaryCard = screen.getByText("Quanto investe").closest("article")!;
    expect(summaryCard.closest("details")).toBeNull();
  });

  test("âncoras da navegação existem e o CTA sem destino confirmado leva à próxima conversa", () => {
    const { container } = render(<ProposalView p={ISG_PROPOSAL} />);
    for (const id of ["jornada", "entregas", "investimento", "proxima-conversa"])
      expect(container.querySelector(`#${id}`)).not.toBeNull();
    const cta = screen.getByRole("link", { name: /Agendar sessão de desenho da implantação/ });
    expect(cta.getAttribute("href")).toBe("#proxima-conversa");
    expect(screen.getByText(/responda à mensagem em que recebeu esta proposta/)).toBeTruthy();
  });

  test("cada etapa tem 'Como funciona' expansível e as condicionadas são identificáveis", () => {
    const { container } = render(<ProposalView p={ISG_PROPOSAL} />);
    for (const code of ["Q1", "Q2", "Q3", "Q4", "Q5"])
      expect(screen.getByText(`Como funciona o ${code}`)).toBeTruthy();
    expect(screen.getAllByText("Condicionado à liberação").length).toBeGreaterThanOrEqual(6);
    expect(container.querySelectorAll("details.proposal-details").length).toBeGreaterThanOrEqual(9);
    expect(screen.getAllByText(/Exemplo fictício/).length).toBeGreaterThanOrEqual(2);
  });

  test("um único h1 e responsabilidades em tabela", () => {
    render(<ProposalView p={ISG_PROPOSAL} />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    const t = screen.getByRole("table", { name: "Responsabilidades e esforço por parte" });
    for (const party of ["Direção", "RH", "SST", "Liderança da unidade", "Tecnologia", "Instituto"])
      expect(within(t).getByText(party)).toBeTruthy();
  });
});

describe("proposta · estados de acesso", () => {
  test("sem sessão mostra a senha e nenhum conteúdo comercial", async () => {
    fakeFetch(401, { state: "locked" });
    const { container } = render(<ProposalPage />);
    await waitFor(() => expect(screen.getByLabelText("Senha da proposta")).toBeTruthy());
    expect(container.textContent).not.toMatch(/60\.000|ISG/);
  });

  test("ambiente sem configuração mostra indisponível", async () => {
    fakeFetch(503, { state: "unavailable" });
    render(<ProposalPage />);
    await waitFor(() =>
      expect(screen.getByText("Proposta indisponível neste ambiente")).toBeTruthy(),
    );
  });

  test("sessão válida carrega a proposta", async () => {
    fakeFetch(200, { state: "ready", deck: ISG_PROPOSAL, ttlMs: 60_000 });
    render(<ProposalPage />);
    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 1 }).textContent).toContain(
        "Da escuta das equipes",
      ),
    );
  });
});
