/** @jsxImportSource react */
import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { getGovernanceEntries } from "@/domain/ivo/methodology-governance";
import { GOVERNANCE_STATES, type GovernanceState } from "@/engine/ivo/governance-decision";
import { buildActionTimeline, summarizePlan } from "@/lib/ivo/action-follow-up";
import { parseContentRef } from "@/lib/ivo/content-ref";
import type {
  EducationCatalogView,
  EducationContentView,
  EfficacyGovernanceView,
  EfficacyItemView,
  EfficacyProtocolView,
  FibtActionPlanView,
  FibtActionView,
} from "@/lib/ivo/ivo-views";
import { ActionTimelinePanel, EducationPanel, PlanSummaryPanel } from "./ActionFollowUp";
import { EfficacyPanel, type EfficacyCallbacks } from "./EfficacyPanel";
import { IvoGovernanceView, type GovernanceView } from "./IvoGovernanceView";

afterEach(cleanup);

const action: FibtActionView = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  planId: "pppppppp-pppp-4ppp-8ppp-pppppppppppp",
  rank: 1,
  title: "Rodas de conversa sobre carga de trabalho",
  description: "Quatro encontros quinzenais.",
  effort: "medio",
  status: "em_execucao",
  owner: { roleLabel: "Coordenação de Operações", isCurrentUser: true },
  dueOn: "2026-09-30",
  executionMetric: { label: "Encontros realizados", baseline: 0, target: 4, unit: "encontros" },
  source: {
    lens: "fibt",
    waveId: "11111111-1111-4111-8111-111111111111",
    cohortId: "11111111-1111-4111-8111-1111111111a1",
    cohortLabel: "Operações",
    factorId: "bem_estar",
    factorName: "Bem-Estar",
    instrumentVersion: "1.0.0",
    publishedAt: "2026-06-20T12:00:00Z",
  },
  dimension: { status: "mapping_pending", dimensionIds: [] },
  evidence: { execution: [], learning: [] },
  efficacy: { status: "not_evaluated", reason: "Motivo estático de eficácia não avaliada." },
  addedLater: null,
  timeline: [],
};

const gateClosed: EfficacyGovernanceView = { decisionId: "D9", state: "proposta", source: "registro_canonico", conclusiveAllowed: false, reason: "D9 ainda não aprovada." };
const gateTest: EfficacyGovernanceView = { decisionId: "D9", state: "aprovado_para_piloto", source: "teste_sintetico", conclusiveAllowed: true, reason: null };

function protocol(over: Partial<EfficacyProtocolView> = {}): EfficacyProtocolView {
  return {
    id: "proto-1",
    itemId: action.id,
    revision: 1,
    status: "registered",
    supersedesId: null,
    createdAt: "2026-09-01T12:00:00Z",
    updatedAt: "2026-09-01T12:00:00Z",
    registeredAt: "2026-09-01T12:00:00Z",
    objective: "Elevar o índice fictício de carga percebida no turno",
    indicatorLabel: "Índice fictício",
    indicatorKind: "resultado",
    indicatorOrigin: "medida_da_organizacao",
    unit: "pontos",
    direction: "aumentar",
    baselineObservedOn: "2026-08-01",
    baselinePopulation: "Operações",
    baselineSource: "Pesquisa fictícia",
    baselineValue: 40,
    baselineRef: null,
    targetKind: "numerico",
    targetValue: 60,
    targetCriterion: null,
    meaningfulDifference: 5,
    windowStart: "2026-09-01",
    windowEnd: "2026-12-01",
    source: "Pesquisa fictícia (segunda rodada)",
    comparisonRule: { sameCohort: true, sameInstrumentVersion: true, sameCalculationVersion: true },
    responsibleRole: "Coordenação de Operações",
    reviewerRole: "Revisão independente de RH",
    limitations: ["Critérios fictícios."],
    ...over,
  };
}

function item(over: Partial<EfficacyItemView> = {}): EfficacyItemView {
  return {
    itemId: action.id,
    draft: null,
    registered: null,
    previousRevisions: 0,
    observations: [],
    verdict: null,
    state: "sem_protocolo",
    stateLabel: "sem protocolo",
    windowStatus: null,
    registrationIssues: [],
    assessment: null,
    ...over,
  };
}

function callbacks(): EfficacyCallbacks & { [K in keyof EfficacyCallbacks]: ReturnType<typeof mock> } {
  const ok = async () => ({ ok: true, message: "ok" });
  return {
    saveDraft: mock(ok),
    startRevision: mock(ok),
    register: mock(ok),
    observe: mock(ok),
    verdict: mock(ok),
  } as never;
}

const renderPanel = (it: EfficacyItemView | null, cb: EfficacyCallbacks, gate = gateClosed) =>
  render(<EfficacyPanel action={action} item={it} governance={gate} busy={false} today="2026-09-22" callbacks={cb} />);

describe("EfficacyPanel · protocolo em rascunho", () => {
  test("sem protocolo mostra 'não avaliada' com o motivo e só oferece preparar o protocolo", () => {
    renderPanel(null, callbacks());
    expect(screen.getByText("Eficácia: não avaliada")).toBeTruthy();
    expect(screen.getByText("Motivo estático de eficácia não avaliada.")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Preparar protocolo de avaliação/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Emitir parecer" })).toBeNull();
  });

  test("protocolo incompleto é salvo como rascunho (campos vazios seguem nulos, nada é inventado)", async () => {
    const cb = callbacks();
    renderPanel(null, cb);
    fireEvent.click(screen.getByRole("button", { name: /Preparar protocolo de avaliação/ }));
    fireEvent.change(screen.getByLabelText("Objetivo da avaliação"), { target: { value: "Rascunho inicial ainda incompleto" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar rascunho" }));
    await waitFor(() => expect(cb.saveDraft).toHaveBeenCalledTimes(1));
    const [itemId, fields, useSource] = (cb.saveDraft as ReturnType<typeof mock>).mock.calls[0] as unknown as [string, Record<string, unknown>, boolean];
    expect(itemId).toBe(action.id);
    expect(useSource).toBe(false);
    expect(fields.objective).toBe("Rascunho inicial ainda incompleto");
    expect(fields.indicatorLabel).toBeNull();
    expect(fields.baselineValue).toBeNull();
    expect(fields.targetValue).toBeNull();
    expect(fields.meaningfulDifference).toBeNull();
    expect(cb.register).not.toHaveBeenCalled();
  });

  test("rascunho persistido lista o que falta em português e segue sem valer como protocolo", () => {
    const draft = protocol({ status: "draft", registeredAt: null, objective: "Rascunho inicial ainda incompleto", indicatorLabel: null, baselineValue: null, targetValue: null });
    renderPanel(item({ draft, registrationIssues: ["indicador_sem_nome", "baseline_sem_valor"] }), callbacks());
    expect(screen.getByText("Eficácia: não avaliada")).toBeTruthy();
    const note = screen.getByText("Para registrar, falta:").closest("div")!;
    expect(within(note).getAllByRole("listitem").length).toBe(2);
    expect(within(note).getByText(/permanece em rascunho/)).toBeTruthy();
    expect((screen.getByLabelText("Objetivo da avaliação") as HTMLTextAreaElement).value).toBe("Rascunho inicial ainda incompleto");
  });

  test("registrar primeiro salva o rascunho e só então registra", async () => {
    const cb = callbacks();
    renderPanel(item({ draft: protocol({ status: "draft", registeredAt: null }) }), cb);
    fireEvent.click(screen.getByRole("button", { name: "Registrar protocolo" }));
    await waitFor(() => expect(cb.register).toHaveBeenCalledTimes(1));
    expect(cb.saveDraft).toHaveBeenCalledTimes(1);
  });

  test("falha do servidor mantém o texto e mostra o erro junto do formulário", async () => {
    const cb = callbacks();
    cb.saveDraft = mock(async () => ({ ok: false, message: "O protocolo não pôde ser salvo." })) as never;
    renderPanel(item({ draft: protocol({ status: "draft", registeredAt: null }) }), cb);
    fireEvent.change(screen.getByLabelText("Objetivo da avaliação"), { target: { value: "Texto que não pode ser perdido" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar rascunho" }));
    expect((await screen.findByRole("alert")).textContent).toContain("O protocolo não pôde ser salvo.");
    expect((screen.getByLabelText("Objetivo da avaliação") as HTMLTextAreaElement).value).toBe("Texto que não pode ser perdido");
  });

  test("valor que não é número é recusado no cliente antes de enviar", () => {
    const cb = callbacks();
    renderPanel(item({ draft: protocol({ status: "draft", registeredAt: null, baselineValue: null }) }), cb);
    fireEvent.change(screen.getByLabelText("Valor da linha de base"), { target: { value: "muito" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar rascunho" }));
    expect(screen.getByRole("alert").textContent).toContain("apenas números");
    expect(cb.saveDraft).not.toHaveBeenCalled();
  });

  test("leitura publicada não pede valor: só referência, e as três regras de comparação ficam fixas", () => {
    const draft = protocol({ status: "draft", registeredAt: null, indicatorOrigin: "leitura_publicada", baselineValue: null, baselineRef: null });
    renderPanel(item({ draft }), callbacks());
    expect(screen.queryByLabelText("Valor da linha de base")).toBeNull();
    expect(screen.getByText(/O valor protegido não é copiado/)).toBeTruthy();
    for (const label of ["Mesmo recorte (setor)", "Mesma versão do instrumento", "Mesma versão do cálculo"]) {
      const box = screen.getByLabelText(label) as HTMLInputElement;
      expect(box.checked).toBe(true);
      expect(box.disabled).toBe(true);
    }
  });
});

describe("EfficacyPanel · protocolo registrado, observação e parecer", () => {
  const registered = item({ registered: protocol(), state: "aguardando_observacao", stateLabel: "aguardando observação", windowStatus: "aberta" });

  test("mostra o protocolo registrado, separa execução de eficácia e oferece nova revisão (não edição)", () => {
    renderPanel(registered, callbacks());
    expect(screen.getByText("Eficácia: aguardando observação")).toBeTruthy();
    expect(screen.getByText(/não comprova melhora do indicador nem causalidade, e não altera o IVO/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Iniciar nova revisão do protocolo/ })).toBeTruthy();
    expect(screen.queryByLabelText("Objetivo da avaliação")).toBeNull();
  });

  test("com D9 em proposta, só o parecer inconclusivo é selecionável e o motivo aparece", () => {
    renderPanel(registered, callbacks(), gateClosed);
    const select = screen.getByLabelText("Parecer") as HTMLSelectElement;
    const byValue = Object.fromEntries([...select.options].map((o) => [o.value, o.disabled]));
    expect(byValue).toEqual({ inconclusiva: false, meta_atingida: true, meta_nao_atingida: true });
    expect(screen.getByText(/Parecer conclusivo indisponível: a decisão D9 está em/)).toBeTruthy();
  });

  test("com D9 de teste sintético, conclusivos ficam liberados e o ambiente de teste é anunciado", () => {
    renderPanel(registered, callbacks(), gateTest);
    const select = screen.getByLabelText("Parecer") as HTMLSelectElement;
    expect([...select.options].every((o) => !o.disabled)).toBe(true);
    expect(screen.getByText(/TESTE SINTÉTICO \(ambiente local\)/)).toBeTruthy();
  });

  test("emitir parecer envia só a decisão do revisor (o cálculo é do servidor)", async () => {
    const cb = callbacks();
    renderPanel(registered, cb, gateTest);
    fireEvent.change(screen.getByLabelText("Parecer"), { target: { value: "meta_atingida" } });
    fireEvent.click(screen.getByRole("button", { name: "Emitir parecer" }));
    await waitFor(() => expect(cb.verdict).toHaveBeenCalledTimes(1));
    const [, input] = (cb.verdict as ReturnType<typeof mock>).mock.calls[0] as unknown as [string, Record<string, unknown>];
    expect(input).toMatchObject({ verdict: "meta_atingida", evidenceGrade: "descritiva", attribution: { status: "nao_avaliada" }, qualitativeTargetReached: null });
    expect(Object.keys(input).sort()).toEqual(["attribution", "evidenceGrade", "limitations", "qualitativeTargetReached", "reason", "verdict"]);
  });

  test("observação sobre leitura publicada de outro ciclo mostra que a resolução ainda não existe", () => {
    const published = item({ registered: protocol({ indicatorOrigin: "leitura_publicada", baselineValue: null, baselineRef: { cohortKey: "operacoes", cycleKey: "2026-T2", instrumentVersion: "1.0.0", calculationVersion: "fibt-manifest/1.0.0", publicationState: "published" } as never }), state: "aguardando_observacao", stateLabel: "aguardando observação" });
    renderPanel(published, callbacks());
    expect(screen.getByText(/resolução protegida do valor não foi implementada/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Registrar observação" })).toBeNull();
  });

  test("parecer registrado é exibido com escopo, atribuição 'não avaliada' e marca de teste; novos registros ficam recolhidos", () => {
    const withVerdict = item({
      registered: protocol(),
      state: "meta_atingida",
      stateLabel: "meta atingida",
      observations: [{ id: "o1", protocolId: "proto-1", observedOn: "2026-09-20", value: 62, ref: null, note: "", recordedAt: "2026-09-20T12:00:00Z" }],
      verdict: {
        id: "v1",
        protocolId: "proto-1",
        observationId: "o1",
        verdict: "meta_atingida",
        claimScope: "resultado",
        evidenceGrade: "pre_pos",
        observedChange: "melhorou",
        targetReached: true,
        attribution: { status: "nao_avaliada", design: null },
        reason: "Critérios fictícios.",
        limitations: [],
        reviewerRole: "Revisão independente de RH",
        governance: { decision: "D9", state: "aprovado_para_piloto", source: "teste_sintetico" },
        createdAt: "2026-09-21T12:00:00Z",
      },
    });
    renderPanel(withVerdict, callbacks(), gateTest);
    const group = screen.getByRole("group", { name: "Parecer de eficácia" });
    expect(within(group).getByText(/Parecer: Meta atingida/)).toBeTruthy();
    expect(within(group).getByText(/TESTE SINTÉTICO — critérios fictícios/)).toBeTruthy();
    expect(within(group).getByText(/Atribuição causal: não avaliada/)).toBeTruthy();
    const more = screen.getByText("Registrar nova observação ou novo parecer").closest("details")!;
    expect(more.hasAttribute("open")).toBe(false);
  });
});

describe("Acompanhamento da ação (resumo, linha do tempo, educação)", () => {
  const plan: FibtActionPlanView = {
    id: action.planId,
    cycleKey: "2026-T2",
    cycleKeyCanonical: "2026-T2",
    status: "active",
    createdAt: "2026-09-01T10:00:00Z",
    activatedAt: "2026-09-02T10:00:00Z",
    closedAt: null,
    closedByRole: null,
    composition: "available",
    missingAccountability: 0,
    actions: [
      {
        ...action,
        evidence: {
          execution: [{ id: "e1", kind: "texto", content: "Ata do primeiro encontro", occurredOn: "2026-09-10", recordedAt: "2026-09-11T10:00:00Z" }],
          learning: [{ id: "l1", kind: "aprendizagem", content: "[conteudo:TESTE-bem_estar-001@0.0.1-teste] Pauta curta ajudou", occurredOn: "2026-09-12", recordedAt: "2026-09-12T10:00:00Z" }],
        },
        timeline: [{ id: "t1", kind: "status_change", toStatus: "em_execucao", note: null, occurredAt: "2026-09-03T10:00:00Z" }],
      },
    ],
  };

  test("resumo separa encerramento operacional de eficácia e aponta mapeamento pendente", () => {
    const summary = summarizePlan(plan, []);
    render(<PlanSummaryPanel summary={summary} cycle="2026-T2" />);
    const region = screen.getByRole("region", { name: "Resumo de acompanhamento do plano 2026-T2" });
    expect(within(region).getByText(/Há ações ainda em andamento/)).toBeTruthy();
    expect(within(region).getByText(/Encerramento operacional não é avaliação de eficácia/)).toBeTruthy();
    expect(within(region).getByText(/mapeamento pendente — nenhuma dimensão recebe valor/)).toBeTruthy();
    expect(within(region).getByText(/0 registrado\(s\) · 0 em rascunho · 1 sem protocolo/)).toBeTruthy();
    expect(within(region).getByRole("link", { name: "Ver governança metodológica" }).getAttribute("href")).toBe("/ivo-integral/governanca");
  });

  test("linha do tempo mostra o vínculo educativo de TESTE e a data do fato separada do registro", () => {
    const entries = buildActionTimeline(plan.actions[0]!, plan, null, parseContentRef);
    render(<ActionTimelinePanel entries={entries} contentTitle={(id) => (id === "TESTE-bem_estar-001" ? "[TESTE] Pauta curta" : null)} />);
    const learning = screen.getByText("Aprendizagem registrada").closest("li")!;
    expect(within(learning).getByText("teste sintético")).toBeTruthy();
    expect(within(learning).getByText(/Conteúdo estudado: \[TESTE\] Pauta curta \(0\.0\.1-teste\)/)).toBeTruthy();
    expect(within(learning).getByText(/fato em 12\/09\/2026/)).toBeTruthy();
    expect(screen.getByText(/Concluir tarefas não altera o IVO nem comprova melhora/)).toBeTruthy();
  });

  const catalog: EducationCatalogView = { curationStatus: "pendente", curationDecision: "D10", approvedCount: 0, testVisible: false };
  const testContent: EducationContentView = {
    contentId: "TESTE-bem_estar-001",
    factorId: "bem_estar",
    status: "TESTE",
    version: "0.0.1-teste",
    title: "[TESTE] Pauta curta",
    objective: "Exercitar o fluxo de vínculo.",
    audience: "gestores",
    format: "microlearning",
    estimatedMinutes: 5,
    body: ["Texto de teste."],
    evidenceCodes: [],
    safeClaimIds: [],
  };

  test("sem conteúdo aprovado mostra 'curadoria pendente' e nunca uma recomendação", () => {
    render(<EducationPanel factorName="Bem-Estar" content={[]} catalog={catalog} />);
    expect(screen.getByText(/Curadoria pendente: nenhum conteúdo educativo aprovado para o fator Bem-Estar \(D10\)/)).toBeTruthy();
    expect(screen.getByText(/nem altera escores/)).toBeTruthy();
  });

  test("conteúdo de TESTE é identificado como não aprovado", () => {
    render(<EducationPanel factorName="Bem-Estar" content={[testContent]} catalog={{ ...catalog, testVisible: true }} />);
    expect(screen.getByText("conteúdo de TESTE — não é recomendação aprovada")).toBeTruthy();
    expect(screen.queryByText("conteúdo aprovado")).toBeNull();
    expect(screen.getByText(/Curadoria pendente: nenhum conteúdo educativo aprovado/)).toBeTruthy();
  });
});

describe("IvoGovernanceView", () => {
  const entries = getGovernanceEntries().map((e) => JSON.parse(JSON.stringify(e)));
  const counts = Object.fromEntries(GOVERNANCE_STATES.map((s) => [s, entries.filter((e) => e.state === s).length])) as Record<GovernanceState, number>;
  const base: GovernanceView = {
    ok: true,
    registryVersion: "0.1.0",
    authorityPolicy: "Política de autoridade de teste.",
    entries,
    counts,
    authority: { configured: false, canApprove: false, reason: "Nenhuma autoridade metodológica está configurada neste ambiente. A aprovação permanece indisponível." },
    efficacyGate: gateClosed,
  };
  const noop = async () => ({ ok: false as const, category: "backend" as const, error: "não chamado" });

  test("lista D10 aprovado com escopo restrito e conserva as pendências de mapeamento e eficácia", () => {
    render(<IvoGovernanceView view={base} onPrepare={noop} />);
    expect(screen.getByText("16 de 16 entradas.")).toBeTruthy();
    expect(screen.queryByText(/Nenhuma decisão ou mapeamento foi aprovado/)).toBeNull();
    expect(screen.getByText(/As aprovações valem somente no escopo documentado/)).toBeTruthy();
    expect(screen.getByText("O que cada estado significa")).toBeTruthy();
    expect(screen.getByText(/Não é validação científica/)).toBeTruthy();
  });

  test("filtros por tipo e por estado atualizam a contagem", () => {
    render(<IvoGovernanceView view={base} onPrepare={noop} />);
    fireEvent.change(screen.getByLabelText("Mostrar"), { target: { value: "mapping" } });
    expect(screen.getByText("6 de 16 entradas.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Estado"), { target: { value: "aprovado_para_piloto" } });
    expect(screen.getByText("0 de 16 entradas.")).toBeTruthy();
    expect(screen.getByText("Nenhuma entrada neste filtro.")).toBeTruthy();
  });

  test("sem autoridade, 'Preparar decisão' fica indisponível com o motivo explícito", () => {
    render(<IvoGovernanceView view={base} onPrepare={noop} />);
    expect(screen.getByText(/O papel de administrador de uma organização vale só dentro dela e não aprova método global/)).toBeTruthy();
    expect(screen.getByText(/Aprovação indisponível: Nenhuma autoridade metodológica está configurada/)).toBeTruthy();
    const d9 = screen.getByText("D9", { selector: "summary span" }).closest("details")!;
    const button = within(d9).getByRole("button", { name: /Preparar decisão/, hidden: true });
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect(within(d9).queryByRole("form", { hidden: true })).toBeNull();
  });

  test("mostra o efeito da pendência de D9 sobre o parecer conclusivo", () => {
    render(<IvoGovernanceView view={base} onPrepare={noop} />);
    const section = screen.getByRole("region", { name: "Parâmetros de eficácia (D9)" });
    expect(within(section).getByText("Proposta")).toBeTruthy();
    expect(within(section).getByText("D9 ainda não aprovada.")).toBeTruthy();
  });

  test("com autoridade, o formulário prepara a decisão e mostra o resultado como NÃO gravado", async () => {
    const onPrepare = mock(async () => ({
      ok: true as const,
      accepted: true as const,
      entry: { ...entries[8], state: "em_revisao" },
      audit: { entryId: "D9", from: "proposta" as const, to: "em_revisao" as const, by: "u1", at: "2026-09-22", test: true },
      note: "Nada foi gravado. Este é o registro resultante para revisão humana e commit no repositório.",
    }));
    render(<IvoGovernanceView view={{ ...base, authority: { configured: true, canApprove: true, reason: null } }} onPrepare={onPrepare as never} />);
    const d9 = screen.getByText("D9", { selector: "summary span" }).closest("details")!;
    const form = within(d9).getByRole("form", { name: "Preparar decisão de D9", hidden: true });
    fireEvent.change(within(form).getByLabelText("Responsável metodológico"), { target: { value: "Responsável fictício" } });
    fireEvent.change(within(form).getByLabelText("Revisor independente"), { target: { value: "Revisor fictício" } });
    fireEvent.click(within(form).getByRole("button", { name: "Preparar decisão", hidden: true }));
    await waitFor(() => expect(onPrepare).toHaveBeenCalledTimes(1));
    const [input] = onPrepare.mock.calls[0] as unknown as [Record<string, unknown>];
    expect(input).toMatchObject({ entryId: "D9", toState: "em_revisao", owner: "Responsável fictício", reviewer: "Revisor fictício", evidence: [], criteriaMet: [] });
    expect(await within(d9).findByText(/Decisão preparada \(não gravada\)/)).toBeTruthy();
    expect(within(d9).getByText(/Nada foi gravado/)).toBeTruthy();
  });

  test("recusa do servidor é mostrada com os motivos em português", async () => {
    const onPrepare = mock(async () => ({
      ok: true as const,
      accepted: false as const,
      reason: "decision_invalid",
      message: "Informe o revisor.",
      errors: ["revisor_ausente"],
    }));
    render(<IvoGovernanceView view={{ ...base, authority: { configured: true, canApprove: true, reason: null } }} onPrepare={onPrepare as never} />);
    const d9 = screen.getByText("D9", { selector: "summary span" }).closest("details")!;
    fireEvent.click(within(d9).getByRole("button", { name: "Preparar decisão", hidden: true }));
    const alert = await within(d9).findByRole("alert", { hidden: true });
    expect(alert.textContent).toContain("Informe o revisor.");
  });
});
