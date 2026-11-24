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
        "Sistema Operacional da Vitalidade Organizacional",
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
    expect(within(region).getByText("Abertura · 1 / 25")).toBeTruthy();
    fireEvent.keyDown(window, { key: "ArrowRight" });
    await waitFor(() => expect(window.location.hash).toBe("#slide-2"));
    fireEvent.keyDown(window, { key: "End" });
    await waitFor(() => expect(within(region).getByText("Próximos passos · 25 / 25")).toBeTruthy());
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() =>
      expect(screen.queryByRole("region", { name: "Proposta em modo apresentação" })).toBeNull(),
    );
    await waitFor(() => expect(document.activeElement?.textContent).toContain("Apresentar"));
  });
});

describe("proposta V3 · Matriz IFT, janelas Entenda, preço e slides completos", () => {
  const landscape = () => {
    window.matchMedia = ((q: string) => ({
      matches: q.includes("min-width") || q.includes("landscape"),
      media: q,
      addEventListener() {},
      removeEventListener() {},
    })) as unknown as typeof window.matchMedia;
  };

  test("capa com a marca VitalOS e a categoria como h1; Matriz IFT com as 5 lentes", () => {
    const { container } = render(<ProposalView p={ISG_PROPOSAL} />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Sistema Operacional da Vitalidade Organizacional",
    );
    expect(screen.getAllByRole("img", { name: "VitalOS" }).length).toBeGreaterThanOrEqual(1);
    const ift = container.querySelector("#matriz-ift") as HTMLElement;
    for (const lens of ["Risco", "Bem-comum", "Florescimento", "Forças", "Síntese"])
      expect(within(ift).getByText(new RegExp(`· ${lens}$`))).toBeTruthy();
    expect(within(ift).getAllByText("Condicionado à liberação").length).toBeGreaterThanOrEqual(3);
  });

  test("janela Entenda: abre com título, Esc fecha e o foco volta ao botão", async () => {
    render(<ProposalView p={ISG_PROPOSAL} />);
    const trigger = screen.getAllByRole("button", { name: "Entenda o Q1" })[0]!;
    fireEvent.click(trigger);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/Q1 · Preparar · Risco/)).toBeTruthy();
    expect(within(dialog).getByText("Quem faz o quê")).toBeTruthy();
    expect(within(dialog).getByText(/Copenhagen Psychosocial Questionnaire/)).toBeTruthy();
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  test("cronograma e cards da jornada sem preço; ponte de valor e conta na seção própria", () => {
    const { container } = render(<ProposalView p={ISG_PROPOSAL} />);
    expect(container.querySelector("#cronograma")!.textContent).not.toMatch(/R\$/);
    expect(container.querySelector("#jornada")!.textContent).not.toMatch(/R\$/);
    const conta = container.querySelector("#conta")!.textContent!;
    for (const v of ["R$ 24.000", "R$ 12.000", "colaboração técnica"]) expect(conta).toContain(v);
    // Camada 2 no papel: o anexo de impressão traz todas as janelas.
    expect(screen.getByRole("region", { name: "Aprofundamentos" }).textContent).toContain(
      "Como chegamos ao valor de referência",
    );
  });

  test("slides com paridade: 25 slides, um por Q, capítulos navegáveis e Esc fecha só a janela", async () => {
    landscape();
    render(<ProposalView p={ISG_PROPOSAL} />);
    fireEvent.click(screen.getByRole("button", { name: /Apresentar/ }));
    const region = await screen.findByRole("region", { name: "Proposta em modo apresentação" });
    expect(within(region).getByText("Abertura · 1 / 25")).toBeTruthy();
    // G abre os capítulos; escolher "Jornada" leva ao capítulo.
    fireEvent.keyDown(window, { key: "g" });
    const menu = await screen.findByRole("dialog", { name: "Capítulos" });
    fireEvent.click(within(menu).getByRole("button", { name: /Jornada/ }));
    await waitFor(() => expect(within(region).getByText(/^Jornada · \d+ \/ 25$/)).toBeTruthy());
    // Avança até o slide do Q1 e abre a janela dele; Esc fecha a janela, não a apresentação.
    fireEvent.keyDown(window, { key: "ArrowRight" });
    fireEvent.keyDown(window, { key: "ArrowRight" });
    const entenda = await within(region).findByRole("button", { name: "Entenda o Q1" });
    fireEvent.click(entenda);
    const dialog = await screen.findByRole("dialog");
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByRole("region", { name: "Proposta em modo apresentação" })).toBeTruthy();
  });
});

describe("proposta V3 · paridade página ↔ slides", () => {
  test("cada capítulo essencial da página tem slide", async () => {
    const { slideIds } = await import("./ProposalSlides");
    const ids = slideIds(ISG_PROPOSAL);
    for (const id of [
      "capa",
      "pergunta",
      "por-que",
      "numeros",
      "ciencia",
      "contexto",
      "matriz-ift",
      "exemplo",
      "jornada",
      "etapa-q1",
      "etapa-q2",
      "etapa-q3",
      "etapa-q4",
      "etapa-q5",
      "cronograma",
      "funcionou",
      "conta",
      "investimento",
      "responsabilidades",
      "equipe",
      "proxima",
      "fontes",
    ])
      expect(ids).toContain(id);
  });
});
