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
  test("valor visível no bloco de investimento e na tabela de marcos", () => {
    const { container } = render(<ProposalView p={ISG_PROPOSAL} />);
    expect(screen.getAllByText("R$ 60.000").length).toBeGreaterThanOrEqual(1);
    expect(container.textContent).toContain("5 parcelas de R$ 12.000");
    const table = screen.getByRole("table", { name: "Parcelas por marco" });
    expect(within(table).getAllByText("R$ 12.000")).toHaveLength(5);
    expect(screen.queryByText("Quanto investe")).toBeNull();
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
    expect(screen.getAllByText("Etapa seguinte da implantação").length).toBeGreaterThanOrEqual(6);
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
        "Da felicidade da cidade à vitalidade das organizações",
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
      screen.getAllByText(/Ilustração gerada · pessoas fictícias/).length,
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
    expect(within(region).getByText("Abertura · 1 / 37")).toBeTruthy();
    fireEvent.keyDown(window, { key: "ArrowRight" });
    await waitFor(() => expect(window.location.hash).toBe("#slide-2"));
    fireEvent.keyDown(window, { key: "End" });
    await waitFor(() => expect(within(region).getByText("Próximos passos · 37 / 37")).toBeTruthy());
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
      "Da felicidade da cidade à vitalidade das organizações",
    );
    expect(screen.getAllByRole("img", { name: "VitalOS" }).length).toBeGreaterThanOrEqual(1);
    const ift = container.querySelector("#matriz-ift") as HTMLElement;
    for (const lens of ["Risco", "Bem-comum", "Florescimento", "Forças", "Síntese"])
      expect(within(ift).getByText(new RegExp(`· ${lens}$`))).toBeTruthy();
    expect(within(ift).getAllByText("Referência metodológica")).toHaveLength(2);
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

  test("slides com paridade: 37 slides, um por Q, capítulos navegáveis e Esc fecha só a janela", async () => {
    landscape();
    render(<ProposalView p={ISG_PROPOSAL} />);
    fireEvent.click(screen.getByRole("button", { name: /Apresentar/ }));
    const region = await screen.findByRole("region", { name: "Proposta em modo apresentação" });
    expect(within(region).getByText("Abertura · 1 / 37")).toBeTruthy();
    // G abre os capítulos; escolher "Jornada" leva ao capítulo.
    fireEvent.keyDown(window, { key: "g" });
    const menu = await screen.findByRole("dialog", { name: "Capítulos" });
    fireEvent.click(within(menu).getByRole("button", { name: /Jornada/ }));
    await waitFor(() => expect(within(region).getByText(/^Jornada · \d+ \/ 37$/)).toBeTruthy());
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
      "isg-mapa",
      "por-que",
      "numeros",
      "ciencia",
      "contexto",
      "matriz-ift",
      "ivo",
      "lentes",
      "exemplo",
      "cenario-economico",
      "evidencias",
      "brasilia",
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

test("a lente selecionada muda a ação e a hipótese muda o custo estimado", () => {
  render(<ProposalView p={ISG_PROPOSAL} />);
  const vias = screen.getByRole("button", { name: /Q4 · VIA-T/ });
  fireEvent.click(vias);
  expect(vias.getAttribute("aria-pressed")).toBe("true");
  const activePanel = document.getElementById(vias.getAttribute("aria-controls")!)!;
  expect(within(activePanel).getByText("Criar um roteiro individual para experimentar uma força em uma atividade.")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Devolver" }));
  expect(screen.getByText("A equipe vê o que foi feito, o que ficou pendente e a data do próximo retorno.", { selector: "p" })).toBeTruthy();
  const select = screen.getByLabelText("Dias de ausência no cenário") as HTMLSelectElement;
  fireEvent.change(select, { target: { value: "110" } });
  expect(screen.getByText(/R\$\s*29[.]700/)).toBeTruthy();
});

describe("proposta V5", () => {
  test("custo por dia padrão é R$ 270 e a variação do cenário de 90 dias é −R$ 2.700", () => {
    render(<ProposalView p={ISG_PROPOSAL} />);
    expect((screen.getByLabelText(/Custo por dia/) as HTMLInputElement).value).toBe("270");
    expect(screen.getByText(/R\$\s*27[.]000/)).toBeTruthy();
    expect(screen.getByText(/R\$\s*24[.]300/)).toBeTruthy();
  });

  test("slide 2 'A pergunta' saiu; infográfico da ISG traz só o que o site declara", async () => {
    const { slideIds } = await import("./ProposalSlides");
    const ids = slideIds(ISG_PROPOSAL);
    expect(ids).not.toContain("pergunta");
    expect(ids.indexOf("isg-mapa")).toBe(1);
    render(<ProposalView p={ISG_PROPOSAL} />);
    const map = screen.getByRole("figure", { name: /O que a ISG comunica e faz/ });
    for (const t of ["Tecnologia", "Gestão", "Educação", "Pessoas", "6 unidades de negócio", "Consultado em 24/11/2026"]) expect(map.textContent).toContain(t);
    expect(map.textContent).not.toMatch(/bilh|colaboradores|fundada/i);
  });

  test("alerta NR-1 não traz valores de multa", () => {
    render(<ProposalView p={ISG_PROPOSAL} />);
    const alert = screen.getByRole("figure", { name: /NR-1: riscos psicossociais e fiscalização/ });
    expect(alert.textContent).toMatch(/NR-28/);
    expect(alert.textContent).not.toMatch(/R\$|\d+\s?mil/);
  });
});

describe("proposta V4 · lote de conteúdo e fontes", () => {
  test("evidências: números da OMS/OIT em destaque, grupos com seleção reconhecível sem cor e Gallup como associação", async () => {
    render(<ProposalView p={ISG_PROPOSAL} />);
    const who = screen.getByRole("group", { name: "Estimativa da OMS e da OIT" });
    expect(who.textContent).toContain("12 bilhões");
    expect(who.textContent).toContain("US$ 1 trilhão");
    const tabs = screen.getByRole("group", { name: "Temas de decisão" });
    const buttons = within(tabs).getAllByRole("button");
    expect(buttons).toHaveLength(3);
    expect(buttons[0]!.getAttribute("aria-pressed")).toBe("true");
    expect(buttons[0]!.textContent).toContain("Selecionado"); // texto, não só cor
    fireEvent.click(buttons[1]!);
    expect(buttons[1]!.textContent).toContain("Selecionado");
    expect(buttons[0]!.textContent).not.toContain("Selecionado");
    // Onde há só pergunta de gestão, não há percentual inventado.
    fireEvent.click(buttons[2]!);
    const panel = document.getElementById(buttons[2]!.getAttribute("aria-controls")!)!;
    expect(panel.textContent).not.toMatch(/%/);
    expect(document.body.textContent).toMatch(/associações agregadas/);
  });

  test("Q1: NR-1 sem prescrever o COPSOQ; janela da fiscalização sem multa projetada nem exemplo não verificado", async () => {
    render(<ProposalView p={ISG_PROPOSAL} />);
    expect(document.body.textContent).toMatch(/A NR-1 não prescreve o COPSOQ como instrumento obrigatório/);
    const open = screen.getAllByRole("button", { name: "Como funciona a fiscalização?" })[0]!;
    fireEvent.click(open);
    const dialog = await screen.findByRole("dialog");
    expect(dialog.textContent).toMatch(/Em resumo/);
    expect(dialog.textContent).toMatch(/não projeta penalidade para a ISG/);
    expect(dialog.textContent).toMatch(/pendente de validação/);
    expect(dialog.textContent).not.toMatch(/R\$ ?\d|multa de/i);
    expect(within(dialog).getByRole("link", { name: "NR-1" })).toBeTruthy();
    expect(within(dialog).getByRole("link", { name: "NR-28" })).toBeTruthy();
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  test("Q2: demonstração é o caminho principal; dashboard institucional é secundário, com pré-requisitos", async () => {
    render(<ProposalView p={ISG_PROPOSAL} />);
    const demo = screen.getAllByRole("button", { name: "Ver demonstração" })[0]!;
    const dash = screen.getAllByRole("button", { name: "Entrar com conta autorizada" })[0]!;
    expect(demo.className).toMatch(/primary/);
    expect(dash.className).toMatch(/secondary/);
    fireEvent.click(demo);
    const dialog = await screen.findByRole("dialog");
    const order = ["Leitura coletiva", "Prioridade", "Ação", "Responsável", "Evidência", "Reavaliação"];
    const text = dialog.textContent!;
    let last = -1;
    for (const w of order) {
      const i = text.indexOf(w, last + 1);
      expect(i).toBeGreaterThan(last);
      last = i;
    }
    expect(text).toMatch(/Leitura Q2 da organização/);
    expect(text).toMatch(/Exemplo sintético/);
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  test("Q5: card do plano do próximo ano com capa ilustrativa, S e G; cronograma e aceite sincronizados", () => {
    const { container } = render(<ProposalView p={ISG_PROPOSAL} />);
    const q5 = container.querySelector("#q5-plano")!;
    expect(q5.textContent).toContain("Do primeiro ciclo ao plano do próximo ano");
    expect(q5.textContent).toMatch(/Social/);
    expect(q5.textContent).toMatch(/Governança/);
    expect(q5.textContent).toMatch(/Dados ambientais entram só onde a metodologia prevê/);
    expect(within(q5 as HTMLElement).getByRole("img", { name: /Capa ilustrativa/ })).toBeTruthy();
    expect(q5.textContent).toMatch(/Capa ilustrativa\. O relatório mostrado é demonstrativo/);
    const q5Stage = ISG_PROPOSAL.journey.stages.find((s) => s.id === "q5")!;
    expect(q5Stage.acceptance.join(" ")).toMatch(/Plano do próximo ano com prioridades, responsáveis, prazos, indicadores e data de revisão/);
    const last = ISG_PROPOSAL.schedule.stages.find((s) => s.id === "q5")!.months[2]!;
    expect(last.milestone).toMatch(/síntese executiva e plano do próximo ano/);
  });

  test("Brasília: transição antes do próximo passo, três movimentos, ONU em 20 de março e sem data local inventada", async () => {
    const { container } = render(<ProposalView p={ISG_PROPOSAL} />);
    const band = container.querySelector(".proposal-brasilia-band")!;
    const section = container.querySelector("#brasilia")!;
    expect(band.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const text = section.textContent!;
    for (const m of ["Mensurar novamente", "Educar", "Transformar Brasília"]) expect(text).toContain(m);
    expect(text).toMatch(/20 de março/);
    expect(text).not.toMatch(/22 de março/);
    expect(text).toMatch(/dependem de confirmação da agenda do Instituto/);
    fireEvent.click(screen.getAllByRole("button", { name: "Como a ISG pode contribuir?" })[0]!);
    const dialog = await screen.findByRole("dialog");
    for (const k of ["Exemplos de apoio", "Entregas possíveis", "O que dependeria de um novo acordo", "separadamente da implantação do VitalOS"])
      expect(dialog.textContent).toContain(k);
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  test("tom executivo: sem vocabulário de licenciamento ou liberação de instrumentos nos textos novos", () => {
    render(<ProposalView p={ISG_PROPOSAL} />);
    const t = document.body.textContent!;
    expect(t).not.toMatch(/licenciamento|liberação do instrumento|permissão de uso|ficha oficial|aditivo/i);
  });
});
