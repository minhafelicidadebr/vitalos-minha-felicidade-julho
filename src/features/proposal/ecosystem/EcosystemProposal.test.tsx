import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { getEcosystemProposal } from "@/lib/proposal/ecosystem-content.server";
import { EcosystemProposalPage, EcosystemView, PresenterScript } from "./EcosystemProposal";

const p = getEcosystemProposal();
const originalFetch = globalThis.fetch;
// Outros arquivos deixam #slide-N na URL compartilhada do ambiente de teste.
beforeEach(() => window.history.replaceState(null, "", window.location.pathname));
afterEach(() => {
  globalThis.fetch = originalFetch;
  document.body.innerHTML = "";
  window.history.replaceState(null, "", window.location.pathname);
});
Element.prototype.scrollIntoView ??= () => {};

describe("proposta para o ecossistema · leitura", () => {
  test("seletor de versão com a original e a atual, um único h1", () => {
    render(<EcosystemView p={p} />);
    const nav = screen.getByRole("navigation", { name: "Versão da proposta" });
    expect(within(nav).getByRole("link", { name: "Proposta original" }).getAttribute("href")).toBe(
      "/proposta",
    );
    expect(
      within(nav)
        .getByRole("link", { name: "Proposta para o ecossistema" })
        .getAttribute("aria-current"),
    ).toBe("page");
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  test("percurso executivo mostra 10 cenas; completa mostra 24; impressão leva todas", () => {
    const { container } = render(<EcosystemView p={p} />);
    const visible = () =>
      container.querySelectorAll(".eco-page-scene:not(.eco-print-extra)").length;
    expect(visible()).toBe(10);
    expect(container.querySelectorAll(".eco-page-scene").length).toBe(24);
    fireEvent.click(screen.getByRole("radio", { name: "Apresentação completa" }));
    expect(visible()).toBe(24);
    expect(screen.getAllByText("Percurso executivo", { selector: ".eco-exec-badge" })).toHaveLength(
      10,
    );
  });

  test("a fala sugerida fica fora da página e da projeção", () => {
    const { container } = render(<EcosystemView p={p} />);
    for (const s of p.scenes) expect(container.textContent).not.toContain(s.speech);
  });

  test("Entenda abre com título e o conteúdo também vai para a impressão", async () => {
    const { container } = render(<EcosystemView p={p} />);
    fireEvent.click(screen.getByRole("radio", { name: "Apresentação completa" }));
    expect(container.querySelectorAll(".eco-print-understand").length).toBeGreaterThanOrEqual(12);
    fireEvent.click(screen.getByRole("button", { name: "Como o calendário será definido?" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/O calendário depende do perímetro validado/)).toBeTruthy();
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  test("demonstração: quatro passos e janela com dados fictícios", async () => {
    render(<EcosystemView p={p} />);
    const steps = screen
      .getAllByRole("button", { pressed: false })
      .filter((b) => /Registrar|Revisar|Devolver/.test(b.textContent ?? ""));
    expect(steps.length).toBe(3);
    fireEvent.click(steps[0]!);
    expect(steps[0]!.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Ver demonstração" }));
    const dialog = await screen.findByRole("dialog", { name: "Da prioridade à devolutiva" });
    expect(
      within(dialog).getByText("testar uma roda curta de escuta na reunião de equipe."),
    ).toBeTruthy();
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  test("decisão: chamada leva ao texto de apoio (sem canal externo aprovado)", () => {
    render(<EcosystemView p={p} />);
    const cta = screen.getByRole("button", { name: "Combinar sessão de desenho" });
    fireEvent.click(cta);
    expect(document.activeElement?.textContent).toContain("duas opções de data e horário");
  });

  test("Apresentar abre o palco no percurso executivo, com capítulos e roteiro separado", () => {
    render(<EcosystemView p={p} />);
    fireEvent.click(screen.getByRole("button", { name: "Apresentar" }));
    const region = screen.getByRole("region", {
      name: /Proposta para o ecossistema · Percurso executivo/,
    });
    expect(within(region).getByRole("button", { name: /Sair/ })).toBeTruthy();
    expect(within(region).getByRole("button", { name: "Capítulos" })).toBeTruthy();
    const script = within(region).getByRole("link", { name: /Roteiro do apresentador/ });
    expect(script.getAttribute("href")).toBe("/proposta/ecossistema?vista=roteiro");
  });

  test("link direto a uma cena fora do percurso executivo abre a apresentação completa", () => {
    render(<EcosystemView p={p} startAt={3} />);
    expect(screen.getByRole("region", { name: /Apresentação completa/ })).toBeTruthy();
  });
});

describe("proposta para o ecossistema · roteiro do apresentador", () => {
  test("lista as falas na ordem, com marcação do percurso executivo", () => {
    const { container } = render(<PresenterScript p={p} />);
    expect(container.querySelectorAll(".eco-script-item").length).toBe(10);
    expect(container.textContent).toContain(p.scenes[0]!.speech);
  });
});

describe("proposta para o ecossistema · acesso", () => {
  test("lê o conteúdo no endpoint próprio e envia a senha à porta comum", async () => {
    const calls: { url: string; method: string }[] = [];
    globalThis.fetch = (async (url: string, init?: RequestInit) => {
      calls.push({ url, method: init?.method ?? "GET" });
      if ((init?.method ?? "GET") === "GET") {
        const authed = calls.some((c) => c.method === "POST");
        return authed
          ? Response.json({ state: "ready", deck: p, ttlMs: 60_000 })
          : Response.json({ state: "locked" }, { status: 401 });
      }
      return Response.json({ state: "authenticated" });
    }) as unknown as typeof fetch;
    render(<EcosystemProposalPage />);
    const input = await screen.findByLabelText("Senha da proposta");
    expect(screen.getByRole("heading", { name: "Proposta para o ecossistema" })).toBeTruthy();
    fireEvent.change(input, { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: "Abrir proposta" }));
    await waitFor(() =>
      expect(screen.getByRole("navigation", { name: "Versão da proposta" })).toBeTruthy(),
    );
    expect(calls[0]).toEqual({ url: "/api/proposta/ecossistema", method: "GET" });
    expect(calls.find((c) => c.method === "POST")?.url).toBe("/api/proposta");
  });

  test("sem sessão não mostra nenhum texto da proposta", async () => {
    globalThis.fetch = (async () =>
      Response.json({ state: "locked" }, { status: 401 })) as unknown as typeof fetch;
    const { container } = render(<EcosystemProposalPage />);
    await screen.findByLabelText("Senha da proposta");
    expect(container.textContent).not.toContain(p.scenes[0]!.title);
  });
});
