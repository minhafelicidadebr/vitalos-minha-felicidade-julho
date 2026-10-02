/** @jsxImportSource react */
import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { IVO_LENS_READING_CONTRACT } from "@/engine/ivo/lens-contract";
import { EFFICACY_NOT_EVALUATED_REASON, type FibtActionPlanView, type IvoQ2View } from "@/lib/ivo/ivo-views";
import { IvoQ2Detail } from "./IvoQ2Detail";
import { FibtActionPlanSection, PriorityPlanner } from "./FibtActionLoop";
import { IvoAccessNotice } from "./IvoAccessNotice";

afterEach(cleanup);

const view: IvoQ2View = {
  organizationName: "Organização Fictícia Alfa",
  cycleKey: "2026-T2",
  wave: { id: "11111111-1111-4111-8111-111111111111", label: "Onda FIB-T Alfa", status: "collecting", createdAt: "2026-04-10T12:00:00Z", closesAt: null },
  methodology: {
    instrumentId: "fib_t",
    instrumentName: "Escala FIB-T",
    waveInstrumentVersion: "1.0.0",
    manifestVersion: "1.0.0",
    manifestStatus: "METHODOLOGY_CONFIRMED",
    calculationVersion: "fibt-manifest/1.0.0",
    author: "FURTADO, C. A. (2020)",
    citation: "FURTADO, C. A. (2020).",
    kMin: 5,
    factorScale: { min: 0, max: 4 },
    rawScoreMax: 12,
  },
  overall: "available",
  sectors: [
    {
      cohortId: "11111111-1111-4111-8111-1111111111a1",
      key: "a1",
      label: "Operações",
      group: "available",
      nativeState: "available",
      countLabel: "9",
      message: null,
      publishedAt: "2026-06-20T12:00:00Z",
      factors: [
        { id: "padrao_de_vida", name: "Padrão de Vida", mean: 2.5 },
        { id: "bem_estar", name: "Bem-Estar", mean: 2.71875 },
      ],
      rawScore: 7.9,
    },
    {
      cohortId: "11111111-1111-4111-8111-1111111111a2",
      key: "a2",
      label: "Logística",
      group: "suppressed",
      nativeState: "insufficient_participants",
      countLabel: "<5",
      message: "Ainda não há participações suficientes para publicar com segurança.",
      publishedAt: null,
      factors: null,
      rawScore: null,
    },
    {
      cohortId: "11111111-1111-4111-8111-1111111111a4",
      key: "a4",
      label: "Atendimento",
      group: "pending_publication",
      nativeState: "awaiting_batched_release",
      countLabel: "protegida",
      message: "A publicação acontece em lote protegido.",
      publishedAt: null,
      factors: null,
      rawScore: null,
    },
  ],
  reading: {
    contractVersion: IVO_LENS_READING_CONTRACT,
    organizationId: "org-alfa",
    cycleKey: "2026-T2",
    quarter: "Q2",
    lens: "fibt",
    instrumentVersion: "1.0.0",
    calculationVersion: "fibt-manifest/1.0.0",
    cohortScope: "cohort",
    privacyStatus: "protected",
    kMin: 5,
    publicationStatus: "published",
    cohorts: [],
    evidenceReferences: [],
    generatedAt: "2026-06-30T15:00:00Z",
  },
  privacy: { kMin: 5, individualResponsesExposed: false, waveLevelReading: "unavailable" },
};

describe("IvoQ2Detail", () => {
  test("mostra fatores só do setor publicado; protegidos aparecem como estado e motivo", () => {
    render(<IvoQ2Detail view={view} />);
    const published = screen.getByRole("article", { name: "Operações" });
    expect(within(published).getByText("Resultado publicado")).toBeTruthy();
    expect(within(published).getByText("2,72")).toBeTruthy();

    const suppressed = screen.getByRole("article", { name: "Logística" });
    expect(within(suppressed).getByText("Protegido")).toBeTruthy();
    expect(within(suppressed).getByText("Participação: <5")).toBeTruthy();
    expect(within(suppressed).queryByRole("table")).toBeNull();

    const pending = screen.getByRole("article", { name: "Atendimento" });
    expect(within(pending).getByText("Publicação pendente")).toBeTruthy();
    expect(within(pending).queryByRole("table")).toBeNull();
  });

  test("identidade metodológica e link para o centro de controle FIB-T", () => {
    render(<IvoQ2Detail view={view} />);
    expect(screen.getByText(/fibt-manifest\/1\.0\.0/)).toBeTruthy();
    expect(screen.getByText(/mínimo de 5 participações/)).toBeTruthy();
    const panel = screen.getByRole("link", { name: /centro de controle FIB-T/ });
    expect(panel.getAttribute("href")).toBe(`/fibt-piloto?wave=${view.wave.id}`);
  });

  test("cada fator publicado leva à definição de prioridade com nome acessível único", () => {
    render(<IvoQ2Detail view={view} />);
    const link = screen.getByRole("link", { name: "Definir prioridade para Bem-Estar em Operações" });
    expect(link.getAttribute("href")).toContain("fator=bem_estar");
    expect(link.getAttribute("href")).toContain(`setor=${view.sectors[0]!.cohortId}`);
  });
});

describe("PriorityPlanner", () => {
  test("só oferece setores publicados e não cria plano sem prioridade escolhida", () => {
    const onCreate = mock(() => {});
    render(<PriorityPlanner view={view} preselect={{}} busy={false} onCreate={onCreate} />);
    const select = screen.getByLabelText("Setor com leitura publicada") as HTMLSelectElement;
    expect([...select.options].map((o) => o.textContent)).toEqual(["Operações"]);
    expect(screen.queryByRole("button", { name: /Criar plano/ })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Adicionar prioridade" }));
    fireEvent.click(screen.getByRole("button", { name: "Criar plano do ciclo 2026-T2" }));
    expect(onCreate).toHaveBeenCalledTimes(1);
    const [priorities] = onCreate.mock.calls[0] as unknown as [Array<Record<string, unknown>>];
    expect(priorities).toHaveLength(1);
    expect(priorities[0]).toMatchObject({ cohortId: view.sectors[0]!.cohortId, factorId: "padrao_de_vida", effort: "medio" });
    // A prioridade enviada não carrega valor do resultado.
    expect(JSON.stringify(priorities)).not.toContain("2.5");
  });

  test("sem setor publicado explica que proteção não é resultado ruim nem zero", () => {
    const protectedOnly = { ...view, sectors: view.sectors.slice(1) };
    render(<PriorityPlanner view={protectedOnly} preselect={{}} busy={false} onCreate={() => {}} />);
    expect(screen.getByText(/não significa resultado ruim nem zero/)).toBeTruthy();
  });
});

const plan: FibtActionPlanView = {
  id: "plan-1",
  cycleKey: "2026-T2",
  cycleKeyCanonical: "2026-T2",
  status: "active",
  createdAt: "2026-06-30T15:00:00Z",
  activatedAt: "2026-06-30T15:10:00Z",
  missingAccountability: 0,
  actions: [
    {
      id: "item-1",
      planId: "plan-1",
      rank: 1,
      title: "Rodas de conversa",
      description: "Quatro encontros.",
      effort: "medio",
      status: "em_execucao",
      owner: { roleLabel: "Coordenação de Operações", isCurrentUser: true },
      dueOn: "2026-09-30",
      executionMetric: { label: "Encontros realizados", baseline: 0, target: 4, unit: "encontros" },
      source: {
        lens: "fibt",
        waveId: "w",
        cohortId: "c",
        cohortLabel: "Operações",
        factorId: "bem_estar",
        factorName: "Bem-Estar",
        instrumentVersion: "1.0.0",
        publishedAt: "2026-06-20T12:00:00Z",
      },
      dimension: { status: "mapping_pending", dimensionIds: [] },
      evidence: {
        execution: [{ id: "e1", kind: "texto", content: "Ata do 1º encontro", occurredOn: "2026-06-12", recordedAt: "" }],
        learning: [{ id: "e2", kind: "aprendizagem", content: "Horário após o turno funcionou", occurredOn: "2026-06-26", recordedAt: "" }],
      },
      efficacy: { status: "not_evaluated", reason: EFFICACY_NOT_EVALUATED_REASON },
      timeline: [],
    },
  ],
};

describe("FibtActionPlanSection", () => {
  test("separa execução, aprendizagem e eficácia; dimensão pendente explícita", () => {
    render(
      <FibtActionPlanSection
        plan={plan}
        busy={false}
        today="2026-06-30"
        onActivate={() => {}}
        callbacks={{ onAccountability: () => {}, onStatus: () => {}, onEvidence: () => {} }}
      />,
    );
    expect(within(screen.getByRole("region", { name: /Evidência de execução — Rodas/ })).getByText(/Ata do 1º encontro/)).toBeTruthy();
    expect(within(screen.getByRole("region", { name: /Aprendizagem — Rodas/ })).getByText(/Horário após o turno/)).toBeTruthy();
    expect(screen.getByText("Eficácia: não avaliada")).toBeTruthy();
    expect(screen.getByText(/mapeamento pendente/)).toBeTruthy();
    expect(screen.getByText(/FIB-T 1\.0\.0 · Operações · fator Bem-Estar/)).toBeTruthy();
  });

  test("transições oferecidas seguem a máquina de estados do ledger", () => {
    const onStatus = mock(() => {});
    render(
      <FibtActionPlanSection
        plan={plan}
        busy={false}
        today="2026-06-30"
        onActivate={() => {}}
        callbacks={{ onAccountability: () => {}, onStatus, onEvidence: () => {} }}
      />,
    );
    // em_execucao → concluida | interrompida
    expect(screen.getByRole("button", { name: "Concluída — Rodas de conversa" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Interrompida — Rodas de conversa" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Em vigilância/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Concluída — Rodas de conversa" }));
    expect(onStatus).toHaveBeenCalledWith("item-1", "concluida");
  });

  test("plano em rascunho com pendências não pode ser ativado", () => {
    const draft: FibtActionPlanView = { ...plan, status: "draft", missingAccountability: 1 };
    render(
      <FibtActionPlanSection
        plan={draft}
        busy={false}
        today="2026-06-30"
        onActivate={() => {}}
        callbacks={{ onAccountability: () => {}, onStatus: () => {}, onEvidence: () => {} }}
      />,
    );
    expect((screen.getByRole("button", { name: "Ativar plano" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByLabelText("Responsável (função que executa)")).toBeTruthy();
    expect(screen.getByLabelText("Prazo")).toBeTruthy();
  });
});

describe("IvoAccessNotice", () => {
  test("recusa de autorização não é erro técnico; falha técnica oferece repetir", () => {
    const { rerender } = render(<IvoAccessNotice category="forbidden" message="Sem permissão." redirectTo="/ivo-integral" />);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText("Acesso não autorizado")).toBeTruthy();

    rerender(<IvoAccessNotice category="unauthenticated" message="Entre." redirectTo="/ivo-integral/q2" />);
    expect(screen.getByRole("link", { name: "Entrar" }).getAttribute("href")).toBe("/entrar?redirect=%2Fivo-integral%2Fq2");

    const retry = mock(() => {});
    rerender(<IvoAccessNotice category="backend" message="Falhou." redirectTo="/ivo-integral" onRetry={retry} />);
    expect(screen.getByRole("alert")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(retry).toHaveBeenCalled();
  });
});
