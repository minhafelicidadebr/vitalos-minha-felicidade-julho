/** @jsxImportSource react */
import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import type { ManagerAnalytics } from "@/lib/fibt/fibt-manager-control-center";
import type { FibtManagerSnapshot } from "@/lib/fibt/fibt-manager-control-center.server";
import { AnalyticsState, FibtManagerControlCenter } from "./FibtManagerControlCenter";

afterEach(cleanup);

const available: ManagerAnalytics = {
  state: "available",
  countLabel: "7",
  n: 7,
  publishedAt: "2026-09-15T12:00:00.000Z",
  finalUpdateWithheld: false,
  result: {
    escoreBruto: 9,
    factors: [
      { id: "f1", name: "Fator 1", mean: 3, domains: [] },
      { id: "f2", name: "Fator 2", mean: 3, domains: [] },
      { id: "f3", name: "Fator 3", mean: 3, domains: [] },
    ],
    domains: [],
  },
};

const protectedStates: ManagerAnalytics[] = [
  {
    state: "insufficient_participants",
    countLabel: "<5",
    kMin: 5,
    message: "Ainda nao ha participacoes suficientes para publicar com seguranca (minimo de 5).",
  },
  {
    state: "awaiting_batched_release",
    countLabel: "protegida",
    kMin: 5,
    message: "Ha participacoes suficientes, mas a publicacao acontece em lote protegido.",
  },
  {
    state: "complementary_suppression",
    countLabel: "protegida",
    kMin: 5,
    message: "Leitura retida para proteger recortes pequenos desta onda.",
  },
  {
    state: "awaiting_item_coverage",
    countLabel: "protegida",
    kMin: 5,
    message: "A leitura publicada ainda nao cobre os 32 itens.",
  },
  {
    state: "withheld_on_close",
    countLabel: "protegida",
    kMin: 5,
    message: "A onda foi fechada e nenhuma leitura pode ser publicada com seguranca.",
  },
];

describe("estados de leitura do painel FIB-T", () => {
  test("disponível renderiza os três fatores canônicos e a contagem publicada", () => {
    render(<AnalyticsState analytics={available} />);
    const box = screen.getByTestId("analytics-available");
    expect(box.textContent).toContain("Fator 1");
    expect(box.textContent).toContain("Fator 2");
    expect(box.textContent).toContain("Fator 3");
    expect(box.textContent).toContain("9 / 12");
    expect(box.textContent).toContain("7 participações");
  });

  test("cada estado protegido tem título e testid próprios — nenhum colapsa nos outros", () => {
    const titles = new Set<string>();
    for (const analytics of protectedStates) {
      const { unmount } = render(<AnalyticsState analytics={analytics} />);
      const box = screen.getByTestId(`analytics-${analytics.state}`);
      const title = box.querySelector("p")!.textContent!;
      titles.add(title);
      expect(box.textContent).not.toContain("0");
      unmount();
    }
    expect(titles.size).toBe(protectedStates.length);
  });

  test("privacidade NUNCA usa a linguagem visual de falha", () => {
    for (const analytics of protectedStates) {
      const { unmount } = render(<AnalyticsState analytics={analytics} />);
      // Sem role="alert": não é incidente técnico, é proteção funcionando.
      expect(screen.queryByRole("alert")).toBeNull();
      unmount();
    }
  });

  test("espera por lote não afirma 'menos de 5' nem mostra zero", () => {
    render(<AnalyticsState analytics={protectedStates[1]!} />);
    const box = screen.getByTestId("analytics-awaiting_batched_release");
    expect(box.textContent).toContain("lote protegido");
    expect(box.textContent).not.toContain("menos de 5");
    expect(box.textContent).not.toMatch(/\b0\b/);
    expect(box.textContent).toContain("Aguardando publicação em lote protegido");
  });

  test("supressão complementar é distinta de participantes insuficientes", () => {
    render(<AnalyticsState analytics={protectedStates[2]!} />);
    expect(screen.getByTestId("analytics-complementary_suppression").textContent).toContain(
      "Retido por supressão complementar",
    );
    expect(screen.queryByTestId("analytics-insufficient_participants")).toBeNull();
  });

  test("ausência de dados é distinta de supressão e de erro", () => {
    render(
      <AnalyticsState
        analytics={{ state: "no_data", countLabel: "0", message: "Nenhuma participacao valida." }}
      />,
    );
    expect(screen.getByTestId("analytics-no_data").textContent).toContain("Sem dados agregados");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  test("falha metodológica e falha técnica são anunciadas como alerta, com títulos distintos", () => {
    const { unmount } = render(
      <AnalyticsState
        analytics={{
          state: "methodology_error",
          countLabel: "Indisponível",
          message: "Agregado incompleto.",
        }}
      />,
    );
    const metodologia = screen.getByRole("alert");
    expect(metodologia.textContent).toContain("Leitura não calculável");
    unmount();

    render(
      <AnalyticsState
        analytics={{
          state: "technical_error",
          countLabel: "Indisponível",
          message: "Backend indisponível.",
        }}
      />,
    );
    expect(screen.getByRole("alert").textContent).toContain("Falha técnica na leitura");
  });

  test("leitura da onda declara que a publicação é por setor, sem número", () => {
    render(
      <AnalyticsState
        analytics={{
          state: "wave_reading_unavailable",
          countLabel: "protegida",
          message:
            "A publicacao protegida da FIB-T acontece por setor: nao existe leitura publicada no nivel da onda.",
        }}
      />,
    );
    const box = screen.getByTestId("analytics-wave_reading_unavailable");
    expect(box.textContent).toContain("Publicação acontece por setor");
    expect(box.textContent).not.toMatch(/\d+ \/ 12/);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  test("retenção da atualização final aparece junto da leitura publicada", () => {
    render(<AnalyticsState analytics={{ ...available, finalUpdateWithheld: true }} />);
    const nota = screen.getByTestId("analytics-final-update-withheld");
    expect(nota.textContent).toContain("última leitura publicada");
    expect(nota.textContent).toContain("retida por proteção de privacidade");
  });
});

// ─── Painel completo ─────────────────────────────────────────────────────────

function snapshotFixture(over: Partial<FibtManagerSnapshot> = {}): FibtManagerSnapshot {
  return {
    campaign: {
      waveId: "wave-a",
      organizationName: "ISG Sintetica",
      label: "Validacao controlada",
      instrument: "FIB_T",
      instrumentVersion: "1.0.0",
      status: "collecting",
      sealOutcome: null,
      createdAt: "2026-09-01T00:00:00.000Z",
      closesAt: null,
      environment: "hml_staging",
      hmlAttested: true,
    },
    participation: { countLabel: "12", publishedCohorts: 1, totalCohorts: 2 },
    waveAnalytics: {
      state: "wave_reading_unavailable",
      countLabel: "protegida",
      message: "A publicacao protegida da FIB-T acontece por setor.",
    },
    sectors: [
      {
        id: "cohort-a",
        key: "A",
        label: "Setor A",
        operationalState: "collecting",
        participationState: "available",
        participationLabel: "7",
        readingPublished: true,
        analytics: available,
        links: [
          {
            id: "link-a",
            state: "active",
            expiresAt: "2026-09-30T00:00:00.000Z",
            createdAt: "2026-09-01T00:00:00.000Z",
          },
        ],
      },
      {
        id: "cohort-b",
        key: "B",
        label: "Setor B",
        operationalState: "collecting",
        participationState: "awaiting_batched_release",
        participationLabel: "protegida",
        readingPublished: false,
        analytics: protectedStates[1]!,
        links: [
          {
            id: "link-b",
            state: "active",
            expiresAt: "2026-09-30T00:00:00.000Z",
            createdAt: "2026-09-02T00:00:00.000Z",
          },
        ],
      },
    ],
    factorComparison: [],
    readiness: {
      state: "ready",
      operational: true,
      blockers: [],
      nextAction: "Seguir com a coleta: a leitura é liberada em lote protegido.",
    },
    telemetry: [],
    privacy: { kMin: 5, individualResponsesExposed: false, rawTokensExposed: false },
    ...over,
  };
}

describe("centro de controle completo", () => {
  test("mostra leituras publicadas, não 'resultados publicáveis'", () => {
    render(<FibtManagerControlCenter snapshot={snapshotFixture()} onReload={() => undefined} />);
    expect(screen.getByText("Leituras publicadas")).toBeDefined();
    expect(screen.queryByText("Resultados publicaveis")).toBeNull();
  });

  test("a legenda não promete que n≥5 basta para publicar", () => {
    const { container } = render(
      <FibtManagerControlCenter snapshot={snapshotFixture()} onReload={() => undefined} />,
    );
    const text = container.textContent ?? "";
    expect(text).toContain("Publicação protegida");
    expect(text).toContain("lote de 5 novas participações");
    expect(text).not.toContain("Publicação mínima n=5");
    expect(text).not.toContain("Coortes abaixo de n=5 protegidas");
  });

  test("cada setor mostra o seu estado, e o retido não vira número", () => {
    render(<FibtManagerControlCenter snapshot={snapshotFixture()} onReload={() => undefined} />);
    expect(screen.getByTestId("sector-A").textContent).toContain("Participação 7");
    const b = screen.getByTestId("sector-B");
    expect(b.textContent).toContain("Participação protegida");
    expect(b.textContent).toContain("Aguardando publicação em lote protegido");
  });

  test("banner de fechamento retido aparece só quando o desfecho é esse", () => {
    const { unmount } = render(
      <FibtManagerControlCenter snapshot={snapshotFixture()} onReload={() => undefined} />,
    );
    expect(screen.queryByTestId("seal-outcome-withheld")).toBeNull();
    unmount();

    const sealed = snapshotFixture();
    sealed.campaign.status = "sealed";
    sealed.campaign.sealOutcome = "withheld_for_privacy";
    render(<FibtManagerControlCenter snapshot={sealed} onReload={() => undefined} />);
    const banner = screen.getByTestId("seal-outcome-withheld");
    expect(banner.textContent).toContain("atualização retida");
    expect(banner.textContent).toContain("nada foi apagado nem estimado");
  });

  test("o payload renderizado não contém resposta individual nem token", () => {
    const { container } = render(
      <FibtManagerControlCenter snapshot={snapshotFixture()} onReload={() => undefined} />,
    );
    const html = container.innerHTML;
    expect(html).not.toContain("answers");
    expect(html).not.toContain("token_hash");
  });

  test("controles operacionais permanecem alcançáveis por teclado (alvo mínimo de 44px)", () => {
    const { container } = render(
      <FibtManagerControlCenter snapshot={snapshotFixture()} onReload={() => undefined} />,
    );
    const interactive = [...container.querySelectorAll("button, select, a[href]")];
    expect(interactive.length).toBeGreaterThan(0);
    for (const element of interactive) {
      const className = element.getAttribute("class") ?? "";
      expect(/min-h-11|h-11/.test(className)).toBe(true);
      expect(element.getAttribute("tabindex")).not.toBe("-1");
    }
  });

  test("o cabeçalho e as seções permanecem navegáveis por leitor de tela", () => {
    render(<FibtManagerControlCenter snapshot={snapshotFixture()} onReload={() => undefined} />);
    expect(screen.getByRole("heading", { name: "Validacao controlada" })).toBeDefined();
    // Regiões rotuladas: o operador consegue pular direto para elas.
    expect(screen.getByLabelText("Resumo da campanha")).toBeDefined();
    expect(screen.getByRole("complementary", { name: "Próxima ação" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Setores, participação e links" })).toBeDefined();
  });

  test("layout móvel: o container usa grade responsiva, sem largura fixa", () => {
    const { container } = render(
      <FibtManagerControlCenter snapshot={snapshotFixture()} onReload={() => undefined} />,
    );
    const root = screen.getByTestId("manager-control-center");
    expect(root.getAttribute("class")).toContain("max-w-7xl");
    expect(container.innerHTML).toContain("sm:grid-cols-2");
    expect(container.innerHTML).toContain("lg:grid-cols-2");
  });
});
