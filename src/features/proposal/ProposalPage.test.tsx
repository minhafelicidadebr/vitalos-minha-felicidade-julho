import { afterEach, describe, expect, test } from "bun:test";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
    expect(screen.getAllByText("R$ 60.000").length).toBeGreaterThanOrEqual(2);
    expect(container.textContent).toContain("5 parcelas de R$ 12.000");
    const table = screen.getByRole("table", { name: "Parcelas por marco" });
    expect(within(table).getAllByText("R$ 12.000")).toHaveLength(5);
    // Nenhum valor só dentro de <details>.
    const summaryCard = screen.getByText("Quanto investe").closest("article")!;
    expect(summaryCard.closest("details")).toBeNull();
  });

  test("âncoras da navegação existem e o CTA leva à próxima conversa, com foco no título de destino", () => {
    const { container } = render(<ProposalView p={ISG_PROPOSAL} />);
    for (const id of ["jornada", "entregas", "investimento", "proxima-conversa"])
      expect(container.querySelector(`#${id}`)).not.toBeNull();
    const cta = screen.getByRole("link", { name: "Combinar a reunião de implantação" });
    expect(cta.getAttribute("href")).toBe("#proxima-conversa");
    expect(cta.getAttribute("target")).toBeNull();
    const heading = screen.getByRole("heading", { level: 2, name: "Reunião de implantação" });
    expect(heading.getAttribute("tabindex")).toBe("-1");
    Element.prototype.scrollIntoView ??= () => {};
    fireEvent.click(cta);
    expect(document.activeElement).toBe(heading);
    expect(window.location.hash).toBe("#proxima-conversa");
    expect(screen.getByText(/duas opções de data e horário/)).toBeTruthy();
    expect(screen.getByText(/não confirma a contratação nem inicia o projeto/)).toBeTruthy();
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
        "Ciência da felicidade aplicada ao trabalho",
      ),
    );
  });
});

describe("proposta V2 · seções novas e modo apresentação", () => {
  test("seções de prova, ciência, cronograma e equipe com âncoras e preço por etapa", () => {
    const { container } = render(<ProposalView p={ISG_PROPOSAL} />);
    for (const id of ["numeros", "ciencia", "cronograma", "equipe"])
      expect(container.querySelector(`#${id}`)).not.toBeNull();
    // Contadores: o valor final completo sempre está no texto acessível.
    expect(screen.getByText("+110.000")).toBeTruthy();
    expect(screen.getByText("+3.000")).toBeTruthy();
    // Cronograma: 15 meses em lista semântica, com etapas condicionadas marcadas para leitor de tela.
    const cronograma = container.querySelector("#cronograma")!;
    expect(within(cronograma as HTMLElement).getAllByText(/^Mês \d+ ·/)).toHaveLength(15);
    expect(
      within(cronograma as HTMLElement).getAllByText("Condicionado:").length,
    ).toBeGreaterThanOrEqual(2);
    // Preço: parcela em destaque, equivalente mensal e total visíveis fora de <details>.
    const inv = container.querySelector("#investimento")!;
    expect(inv.textContent).toContain("R$ 12.000");
    expect(inv.textContent).toContain("R$ 4.000 por mês");
    expect(inv.textContent).toContain("Total do programa: R$ 60.000");
    // Equipe: três retratos com nome no texto alternativo.
    expect(screen.getAllByRole("img", { name: /^Retrato de / })).toHaveLength(3);
    // Ilustrações das faixas rotuladas como geradas.
    expect(
      screen.getAllByText("Ilustração gerada · pessoas fictícias").length,
    ).toBeGreaterThanOrEqual(4);
  });

  test("Apresentar abre os slides; setas avançam, Home/End e Esc devolve o foco ao botão", async () => {
    window.matchMedia = ((q: string) => ({
      matches: q.includes("min-width") || q.includes("landscape"),
      media: q,
      addEventListener() {},
      removeEventListener() {},
    })) as unknown as typeof window.matchMedia;
    render(<ProposalView p={ISG_PROPOSAL} />);
    fireEvent.click(screen.getByRole("button", { name: /Apresentar/ }));
    const region = await screen.findByRole("region", { name: "Proposta em modo apresentação" });
    expect(within(region).getByText("1 / 11")).toBeTruthy();
    fireEvent.keyDown(window, { key: "ArrowRight" });
    await waitFor(() => expect(window.location.hash).toBe("#slide-2"));
    fireEvent.keyDown(window, { key: "End" });
    await waitFor(() => expect(within(region).getByText("11 / 11")).toBeTruthy());
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() =>
      expect(screen.queryByRole("region", { name: "Proposta em modo apresentação" })).toBeNull(),
    );
    await waitFor(() => expect(document.activeElement?.textContent).toContain("Apresentar"));
  });
});
