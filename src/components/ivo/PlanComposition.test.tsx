/** @jsxImportSource react */
import { afterEach, describe, expect, mock, test } from "bun:test";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { IVO_LENS_READING_CONTRACT } from "@/engine/ivo/lens-contract";
import type { PlanActionStatus } from "@/engine/action-plan/action-log-engine";
import { EFFICACY_NOT_EVALUATED_REASON, type FibtActionPlanView, type FibtActionView, type IvoQ2View } from "@/lib/ivo/ivo-views";
import { CLOSED_PLAN_EXPLANATION, CLOSE_CONFIRMATION_EXPLANATION } from "@/lib/ivo/plan-closure";
import { FibtActionPlanSection, buttonPrimary, buttonSecondary } from "./FibtActionLoop";
import { AddActionToPlanForm, ClosedPlanNotice, ClosePlanPanel, PlanClosure, type AddActionFormInput } from "./PlanComposition";
import { publishedActionSource } from "@/lib/ivo/published-action-source";
import { Q2PracticeReview } from "./Q2PracticeReview";
import rawActivity from "@/domain/ivo/q2-learning-activity-001.json";
import { activityDescriptionPrefix } from "@/lib/ivo/learning-application";
import { encodeContentRef } from "@/lib/ivo/content-ref";
import type { EducationContentView } from "@/lib/ivo/ivo-views";

afterEach(cleanup);

const WAVE_ID = "11111111-1111-4111-8111-111111111111";
const A1 = "11111111-1111-4111-8111-1111111111a1";

const view: IvoQ2View = {
  organizationName: "Organização Fictícia Alfa",
  cycleKey: "2026-T2",
  wave: { id: WAVE_ID, label: "Onda FIB-T Alfa", status: "collecting", createdAt: "2026-04-10T12:00:00Z", closesAt: null },
  methodology: {
    instrumentId: "fib_t", instrumentName: "Escala FIB-T", waveInstrumentVersion: "1.0.0", manifestVersion: "1.0.0",
    manifestStatus: "METHODOLOGY_CONFIRMED", calculationVersion: "fibt-manifest/1.0.0", author: "FURTADO, C. A. (2020)",
    citation: "FURTADO, C. A. (2020).", kMin: 5, factorScale: { min: 0, max: 4 }, rawScoreMax: 12,
  },
  overall: "available",
  sectors: [
    {
      cohortId: A1, key: "a1", label: "Operações", group: "available", nativeState: "available", countLabel: "9", message: null,
      publishedAt: "2026-06-20T12:00:00Z",
      factors: [{ id: "padrao_de_vida", name: "Padrão de Vida", mean: 2.5 }, { id: "bem_estar", name: "Bem-Estar", mean: 2.71875 }],
      rawScore: 7.9,
    },
    {
      cohortId: "11111111-1111-4111-8111-1111111111a2", key: "a2", label: "Logística", group: "suppressed", nativeState: "insufficient_participants",
      countLabel: "<5", message: "Ainda não há participações suficientes.", publishedAt: null, factors: null, rawScore: null,
    },
  ],
  reading: {
    contractVersion: IVO_LENS_READING_CONTRACT, organizationId: "org-alfa", cycleKey: "2026-T2", quarter: "Q2", lens: "fibt",
    instrumentVersion: "1.0.0", calculationVersion: "fibt-manifest/1.0.0", cohortScope: "cohort", privacyStatus: "protected", kMin: 5,
    publicationStatus: "published", cohorts: [], evidenceReferences: [], generatedAt: "2026-06-30T15:00:00Z",
  },
  privacy: { kMin: 5, individualResponsesExposed: false, waveLevelReading: "unavailable" },
};

function action(id: string, title: string, status: PlanActionStatus, extra: Partial<FibtActionView> = {}): FibtActionView {
  return {
    id, planId: "plan-1", rank: 1, title, description: "", effort: "medio", status,
    owner: { roleLabel: "Coordenação de Operações", isCurrentUser: true }, dueOn: "2026-09-30",
    executionMetric: { label: "Encontros", baseline: 0, target: 4, unit: "encontros" },
    source: { lens: "fibt", waveId: WAVE_ID, cohortId: A1, cohortLabel: "Operações", factorId: "bem_estar", factorName: "Bem-Estar", instrumentVersion: "1.0.0", publishedAt: "2026-06-20T12:00:00Z" },
    dimension: { status: "mapping_pending", dimensionIds: [] },
    evidence: { execution: [], learning: [] },
    efficacy: { status: "not_evaluated", reason: EFFICACY_NOT_EVALUATED_REASON },
    timeline: [],
    addedLater: null,
    ...extra,
  };
}

function plan(status: FibtActionPlanView["status"], actions: FibtActionView[], extra: Partial<FibtActionPlanView> = {}): FibtActionPlanView {
  return {
    id: "plan-1", cycleKey: "2026-T2", cycleKeyCanonical: "2026-T2", status, createdAt: "2026-06-01T10:00:00Z",
    activatedAt: status === "draft" ? null : "2026-06-02T10:00:00Z", closedAt: null, closedByRole: null, composition: "available",
    missingAccountability: 0, actions, ...extra,
  };
}

const activePlan = plan("active", [action("a1", "Rodas de conversa", "em_execucao"), action("a2", "Pausas ativas", "concluida")]);

type Submit = (planId: string, input: AddActionFormInput) => Promise<{ ok: boolean; message: string }>;

describe("Revisar a aplicação Q2", () => {
  const content: EducationContentView = {
    contentId: rawActivity.contentId, factorId: "bem_estar", version: rawActivity.contentVersion,
    title: "Aprender com dificuldades de trabalho", status: "APROVADO", audience: "RH",
    objective: "Aprender com a equipe", format: "leitura", estimatedMinutes: 3, body: [],
    evidenceCodes: rawActivity.evidenceCodes, safeClaimIds: rawActivity.safeClaimIds,
    activity: rawActivity,
  };
  const original = action("10000000-0000-4000-8000-000000000001", "Acordo para pedir ajuda", "concluida", {
    description: encodeContentRef({ id: content.contentId, version: content.version }, activityDescriptionPrefix(rawActivity) + "Acordo de equipe."),
  });
  const active = plan("active", [original]);

  function openReview() {
    const toggle = screen.getByText("Revisar a aplicação");
    (toggle.closest("details") as HTMLDetailsElement).open = true;
  }

  test("exercício e espera não escrevem; ajuste envia só a síntese confirmada na origem correta", async () => {
    const onConfirm = mock(async (_input: AddActionFormInput) => ({ ok: true, message: "Ajuste planejado." }));
    render(<Q2PracticeReview action={original} plan={active} content={content} view={view} busy={false} onConfirm={onConfirm} />);
    openReview();
    fireEvent.click(screen.getByRole("button", { name: "Ver o novo caso" }));
    fireEvent.click(screen.getByRole("radio", { name: "Repetir a orientação a todos." }));
    expect(screen.getByText(/Investigue o que impede a resposta/)).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: "Ainda não houve oportunidade de aplicar" }));
    expect(screen.getByText(/A próxima revisão fica para quando houver oportunidade/)).toBeTruthy();
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("radio", { name: "Ajustar e preparar uma nova aplicação" }));
    fireEvent.change(screen.getByLabelText("Título da nova ação"), { target: { value: "Ajustar troca de turno" } });
    const summary = "Pactuar responsáveis na troca de turno e revisar a cobertura.";
    fireEvent.change(screen.getByLabelText("Síntese coletiva da revisão"), { target: { value: summary } });
    fillAccountability();
    expect(screen.getByText("O que ficará visível no plano")).toBeTruthy();
    expect(within(screen.getByRole("region", { name: "Prévia da síntese compartilhada" })).getByText(summary)).toBeTruthy();
    expect(onConfirm).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Confirmar síntese e incluir ajuste" }));
    });
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    expect(onConfirm.mock.calls[0]?.[0]).toMatchObject({ cohortId: A1, factorId: "bem_estar", description: summary });
    expect(JSON.stringify(onConfirm.mock.calls[0])).not.toContain("Repetir a orientação");
  });

  test("sem origem publicada ou com plano encerrado, só permite consulta e exercício", () => {
    const onConfirm = mock(async () => ({ ok: true, message: "ok" }));
    const { rerender } = render(<Q2PracticeReview action={original} plan={active} content={content} view={null} busy={false} onConfirm={onConfirm} />);
    openReview();
    fireEvent.click(screen.getByRole("radio", { name: "Ajustar e preparar uma nova aplicação" }));
    expect(screen.getByText(/Carregue a leitura publicada da origem/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Confirmar síntese e incluir ajuste" })).toBeNull();
    rerender(<Q2PracticeReview action={original} plan={plan("closed", [original])} content={content} view={view} busy={false} onConfirm={onConfirm} />);
    expect(screen.getByText(/Revisão disponível para consulta/)).toBeTruthy();
    expect(screen.queryByRole("radio", { name: "Ajustar e preparar uma nova aplicação" })).toBeNull();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  test("releitura mostra o ajuste vinculado, evitando links para outra ação ou plano", () => {
    const followUp = action("10000000-0000-4000-8000-000000000002", "Orientação na troca de turno", "planejada", {
      description: encodeContentRef({ id: content.contentId, version: content.version }, activityDescriptionPrefix(rawActivity) + `[revisao:${original.id}] Pactuar como receber o pedido.`),
    });
    render(<Q2PracticeReview action={original} plan={plan("active", [original, followUp])} content={content} view={view} busy={false} onConfirm={mock(async () => ({ ok: true, message: "ok" }))} />);
    openReview();
    expect(screen.getByRole("link", { name: followUp.title }).getAttribute("href")).toBe(`#acao-${followUp.id}`);
    expect(screen.queryByRole("radio", { name: "Repetir a orientação a todos." })).toBeNull();
  });
});

function fillAccountability() {
  fireEvent.change(screen.getByLabelText("Responsável (função que executa)"), { target: { value: "Gestão de pessoas" } });
  fireEvent.change(screen.getByLabelText("Prazo"), { target: { value: "2026-12-15" } });
  fireEvent.change(screen.getByLabelText("Indicador de execução"), { target: { value: "Oficinas realizadas" } });
  fireEvent.change(screen.getByLabelText("Meta"), { target: { value: "2" } });
}

// ═══════════════════════════════════════════════════════════════════════════
// Incluir ação
// ═══════════════════════════════════════════════════════════════════════════

describe("AddActionToPlanForm", () => {
  test("origem do link mantém Bem-Estar no plano existente sem assumir o primeiro fator", () => {
    const initialSource = publishedActionSource(view, { cohortId: A1, factorId: "bem_estar" });
    render(<AddActionToPlanForm plan={activePlan} view={view} busy={false} initialSource={initialSource} onSubmit={async () => ({ ok: true, message: "ok" })} />);
    expect((screen.getByLabelText("Fator FIB-T") as HTMLSelectElement).value).toBe("bem_estar");
    expect((screen.getByLabelText("Setor com leitura publicada") as HTMLSelectElement).value).toBe(A1);
  });
  test("preferência incompleta, alheia ou de setor protegido não é origem elegível", () => {
    for (const preferred of [{ cohortId: A1 }, { factorId: "bem_estar" }, { cohortId: A1, factorId: "inventado" }, { cohortId: "other-org", factorId: "bem_estar" }, { cohortId: view.sectors[1]!.cohortId, factorId: "bem_estar" }]) {
      expect(publishedActionSource(view, preferred)).toBeUndefined();
    }
    expect(publishedActionSource(null, { cohortId: A1, factorId: "bem_estar" })).toBeUndefined();
  });
  test("mostra o plano de destino e o estado ANTES de confirmar, e só oferece setores publicados", () => {
    render(<AddActionToPlanForm plan={activePlan} view={view} busy={false} onSubmit={async () => ({ ok: true, message: "ok" })} />);
    const destination = screen.getByRole("group", { name: "Destino da nova ação" });
    expect(destination.textContent).toContain("plano do ciclo 2026-T2");
    expect(destination.textContent).toContain("Ativo");
    expect(destination.textContent).toContain("2 ações");
    expect(destination.textContent).toMatch(/Plano ativo: a nova ação já precisa de responsável, prazo e indicador/);
    const sector = screen.getByLabelText("Setor com leitura publicada") as HTMLSelectElement;
    expect([...sector.options].map((o) => o.textContent)).toEqual(["Operações"]);
    expect(screen.getByRole("button", { name: "Incluir ação no plano do ciclo 2026-T2" })).toBeTruthy();
    // Instrução curta: nada do resultado é copiado e as ações atuais não mudam.
    expect(screen.getByText(/Nenhum valor do resultado é copiado/)).toBeTruthy();
  });

  test("plano ativo pede responsável, prazo e indicador; sem eles não envia e explica ao lado", () => {
    const onSubmit = mock<Submit>(async () => ({ ok: true, message: "ok" }));
    render(<AddActionToPlanForm plan={activePlan} view={view} busy={false} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText("Título da nova ação"), { target: { value: "Oficina de pausas" } });
    fireEvent.submit(screen.getByRole("button", { name: /^Incluir ação/ }).closest("form")!);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toMatch(/Plano ativo: informe responsável, prazo e indicador/);

    fillAccountability();
    fireEvent.submit(screen.getByRole("button", { name: /^Incluir ação/ }).closest("form")!);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const [planId, input] = onSubmit.mock.calls[0]!;
    expect(planId).toBe("plan-1");
    expect(input).toMatchObject({
      waveId: WAVE_ID, cohortId: A1, factorId: "padrao_de_vida", title: "Oficina de pausas", effort: "medio",
      accountability: { ownerRoleLabel: "Gestão de pessoas", dueOn: "2026-12-15", executionMetric: { label: "Oficinas realizadas", baseline: 0, target: 2 } },
    });
    expect(input.requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    // Nenhum valor publicado (média, contagem) vai no pedido.
    expect(JSON.stringify(input)).not.toContain("2.71875");
  });

  test("plano em rascunho não pede accountability agora e explica que vem depois", () => {
    render(<AddActionToPlanForm plan={plan("draft", activePlan.actions)} view={view} busy={false} onSubmit={async () => ({ ok: true, message: "ok" })} />);
    expect(screen.queryByLabelText("Responsável (função que executa)")).toBeNull();
    expect(screen.getByRole("group", { name: "Destino da nova ação" }).textContent).toMatch(/Rascunho/);
    expect(screen.getByRole("group", { name: "Destino da nova ação" }).textContent).toMatch(/definidos depois/);
  });

  test("falha aparece junto do formulário, mantém o que foi digitado e reenvia com a MESMA chave", async () => {
    const onSubmit = mock<Submit>(async () => ({ ok: false, message: "Não foi possível incluir agora." }));
    render(<AddActionToPlanForm plan={plan("draft", activePlan.actions)} view={view} busy={false} onSubmit={onSubmit} />);
    const title = screen.getByLabelText("Título da nova ação") as HTMLInputElement;
    fireEvent.change(title, { target: { value: "Oficina de pausas" } });
    fireEvent.change(screen.getByLabelText("O que será feito (opcional)"), { target: { value: "Duas oficinas por mês" } });
    const button = screen.getByRole("button", { name: /^Incluir ação/ });
    fireEvent.click(button);
    expect((await screen.findByRole("alert")).textContent).toContain("Não foi possível incluir agora.");
    expect(title.value).toBe("Oficina de pausas");
    expect((screen.getByLabelText("O que será feito (opcional)") as HTMLTextAreaElement).value).toBe("Duas oficinas por mês");
    fireEvent.click(button);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));
    expect(onSubmit.mock.calls[1]![1].requestId).toBe(onSubmit.mock.calls[0]![1].requestId);
  });

  test("sucesso é anunciado no próprio formulário, limpa o que foi enviado e a próxima tentativa usa chave nova", async () => {
    const onSubmit = mock<Submit>(async () => ({ ok: true, message: "Ação incluída no plano." }));
    render(<AddActionToPlanForm plan={plan("draft", activePlan.actions)} view={view} busy={false} onSubmit={onSubmit} />);
    const title = screen.getByLabelText("Título da nova ação") as HTMLInputElement;
    fireEvent.change(title, { target: { value: "Oficina de pausas" } });
    fireEvent.click(screen.getByRole("button", { name: /^Incluir ação/ }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("Ação incluída no plano."));
    expect(title.value).toBe("");
    fireEvent.change(title, { target: { value: "Outra oficina" } });
    fireEvent.click(screen.getByRole("button", { name: /^Incluir ação/ }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));
    expect(onSubmit.mock.calls[1]![1].requestId).not.toBe(onSubmit.mock.calls[0]![1].requestId);
  });

  describe("aviso de sucesso ligado ao pedido que o gerou", () => {
    const draft = plan("draft", activePlan.actions);
    const otherWave = { ...view, wave: { ...view.wave, id: "22222222-2222-4222-8222-222222222222" } };
    const ok: Submit = async () => ({ ok: true, message: "Ação incluída no plano." });

    async function includeOne() {
      fireEvent.change(screen.getByLabelText("Título da nova ação"), { target: { value: "Oficina de pausas" } });
      fireEvent.click(screen.getByRole("button", { name: /^Incluir ação/ }));
      await waitFor(() => expect(screen.getByRole("status").textContent).toContain("Ação incluída no plano."));
    }

    test("some quando OUTRA operação da página começa (ex.: mudar o estado de uma ação) e não volta quando ela termina", async () => {
      const tree = (busy: boolean) => <AddActionToPlanForm plan={draft} view={view} busy={busy} onSubmit={ok} />;
      const { rerender } = render(tree(false));
      await includeOne();
      rerender(tree(true));
      expect(screen.getByRole("status").textContent).toBe("");
      rerender(tree(false));
      expect(screen.getByRole("status").textContent).toBe("");
    });

    test("a operação do próprio formulário (a página marca busy durante o envio) não apaga o aviso dele", async () => {
      function Page() {
        const [busy, setBusy] = useState(false);
        return (
          <AddActionToPlanForm
            plan={draft}
            view={view}
            busy={busy}
            onSubmit={async () => {
              setBusy(true); // como a rota: busy sobe com o envio...
              await new Promise((resolve) => setTimeout(resolve, 0));
              setBusy(false); // ...e desce antes de devolver o desfecho ao formulário
              return { ok: true, message: "Ação incluída no plano." };
            }}
          />
        );
      }
      render(<Page />);
      await includeOne();
      await new Promise((resolve) => setTimeout(resolve, 25)); // tempo para qualquer efeito tardio
      expect(screen.getByRole("status").textContent).toContain("Ação incluída no plano.");
    });

    test("não vale em outro contexto (outra onda ou outro plano) e não reaparece quando o contexto volta", async () => {
      const tree = (p: FibtActionPlanView, v: IvoQ2View) => <AddActionToPlanForm plan={p} view={v} busy={false} onSubmit={ok} />;
      const { rerender } = render(tree(draft, view));
      await includeOne();
      rerender(tree(draft, otherWave));
      expect(screen.getByRole("status").textContent).toBe("");
      rerender(tree(draft, view));
      expect(screen.getByRole("status").textContent).toBe("");

      await includeOne();
      rerender(tree({ ...draft, id: "plan-2" }, view));
      expect(screen.getByRole("status").textContent).toBe("");
      rerender(tree(draft, view));
      expect(screen.getByRole("status").textContent).toBe("");
    });

    test("a falha não é apagada por outra operação: ela descreve o rascunho mantido, e o texto digitado fica", async () => {
      const fail: Submit = async () => ({ ok: false, message: "Não foi possível incluir agora." });
      const tree = (busy: boolean) => <AddActionToPlanForm plan={draft} view={view} busy={busy} onSubmit={fail} />;
      const { rerender } = render(tree(false));
      fireEvent.change(screen.getByLabelText("Título da nova ação"), { target: { value: "Oficina de pausas" } });
      fireEvent.click(screen.getByRole("button", { name: /^Incluir ação/ }));
      expect((await screen.findByRole("alert")).textContent).toContain("Não foi possível incluir agora.");
      rerender(tree(true));
      expect(screen.getByRole("alert").textContent).toContain("Não foi possível incluir agora.");
      expect((screen.getByLabelText("Título da nova ação") as HTMLInputElement).value).toBe("Oficina de pausas");
    });
  });

  test("envio pendente não duplica (clique duplo e submit), mantém o foco no botão e o rótulo muda", async () => {
    let finish: (r: { ok: boolean; message: string }) => void = () => {};
    const onSubmit = mock<Submit>(() => new Promise((resolve) => (finish = resolve)));
    render(<AddActionToPlanForm plan={plan("draft", activePlan.actions)} view={view} busy={false} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText("Título da nova ação"), { target: { value: "Oficina de pausas" } });
    const button = screen.getByRole("button", { name: /^Incluir ação/ });
    button.focus();
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.submit(button.closest("form")!);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect(button.textContent).toBe("Incluindo ação…");
    expect(document.activeElement).toBe(button);
    finish({ ok: true, message: "Ação incluída no plano." });
    await waitFor(() => expect(button.getAttribute("aria-disabled")).toBe("false"));
  });

  test("todos os campos têm nome acessível por rótulo visível", () => {
    render(<AddActionToPlanForm plan={activePlan} view={view} busy={false} onSubmit={async () => ({ ok: true, message: "ok" })} />);
    for (const label of [
      "Setor com leitura publicada", "Fator FIB-T", "Título da nova ação", "Esforço", "O que será feito (opcional)",
      "Responsável (função que executa)", "Prazo", "Indicador de execução", "Linha de base", "Meta", "Unidade",
    ]) {
      expect(screen.getByLabelText(label)).toBeTruthy();
    }
    expect(screen.getByRole("group", { name: /Responsável, prazo e indicador de execução \(obrigatórios no plano ativo\)/ })).toBeTruthy();
  });

  test("leitura de outro ciclo, ausência de leitura ou banco sem a migration não oferecem o envio", () => {
    const other = { ...view, cycleKey: "2026-T3" };
    const { unmount } = render(<AddActionToPlanForm plan={activePlan} view={other} busy={false} onSubmit={async () => ({ ok: true, message: "ok" })} />);
    expect(screen.getByRole("note").textContent).toMatch(/leitura carregada é do ciclo 2026-T3, e este plano é do ciclo 2026-T2/);
    expect(screen.queryByRole("button", { name: /^Incluir ação/ })).toBeNull();
    unmount();

    const none = render(<AddActionToPlanForm plan={activePlan} view={null} busy={false} onSubmit={async () => ({ ok: true, message: "ok" })} />);
    expect(screen.getByRole("note").textContent).toMatch(/não está carregada/);
    none.unmount();

    render(<AddActionToPlanForm plan={{ ...activePlan, composition: "unavailable" }} view={view} busy={false} onSubmit={async () => ({ ok: true, message: "ok" })} />);
    expect(screen.getByRole("note").textContent).toMatch(/atualização do banco de dados não foi aplicada/);
    expect(screen.queryByRole("button", { name: /^Incluir ação/ })).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Encerrar plano
// ═══════════════════════════════════════════════════════════════════════════

describe("ClosePlanPanel", () => {
  const finishedPlan = plan("active", [action("a1", "Rodas de conversa", "concluida"), action("a2", "Pausas ativas", "em_vigilancia"), action("a3", "Mural", "interrompida")]);

  test("com ações em andamento explica a pendência, lista quais e não abre a confirmação", () => {
    const onClose = mock(async () => ({ ok: true, message: "ok" }));
    render(<ClosePlanPanel plan={activePlan} busy={false} onClose={onClose} />);
    const note = screen.getByRole("note");
    expect(note.textContent).toMatch(/Ainda não é possível encerrar: 1 ação está em andamento \(1 em execução\)/);
    expect(note.textContent).toContain("Rodas de conversa — em execução");
    const trigger = screen.getByRole("button", { name: /^Revisar encerramento/ });
    expect(trigger.getAttribute("aria-disabled")).toBe("true");
    // O id da nota de pendências não muda (quem o referencia continua valendo).
    expect(note.id).toBe("close-plan-1-pending");
    expect(trigger.getAttribute("aria-describedby")).toBe(note.id);
    fireEvent.click(trigger);
    expect(screen.queryByRole("group", { name: /Confirmar o encerramento/ })).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });

  test("plano ativo SEM ações explica o bloqueio: nota visível, ligada ao botão por aria-describedby, e o botão não aciona", () => {
    const onClose = mock(async () => ({ ok: true, message: "ok" }));
    render(<ClosePlanPanel plan={plan("active", [])} busy={false} onClose={onClose} />);
    const note = screen.getByRole("note");
    expect(note.textContent).toContain("Um plano sem ações não pode ser encerrado.");
    expect(note.textContent).toContain("Inclua ao menos uma ação neste plano e volte aqui.");
    // Não reaproveita a nota de pendências: não há ação em andamento para listar.
    expect(note.textContent).not.toMatch(/em andamento/);
    const trigger = screen.getByRole("button", { name: /^Revisar encerramento/ });
    expect(trigger.getAttribute("aria-disabled")).toBe("true");
    const describedBy = trigger.getAttribute("aria-describedby");
    expect(describedBy).toBe(note.id);
    expect(document.getElementById(describedBy!)).toBe(note);
    // Id próprio: a nota de plano vazio não reaproveita o id da nota de pendências.
    expect(note.id).toBe("close-plan-1-empty");
    expect(document.getElementById("close-plan-1-pending")).toBeNull();
    fireEvent.click(trigger);
    expect(screen.queryByRole("group", { name: /Confirmar o encerramento/ })).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });

  test("com tudo em estado de saída mostra o efeito do encerramento ANTES de confirmar e move o foco para ele", () => {
    render(<ClosePlanPanel plan={finishedPlan} busy={false} onClose={async () => ({ ok: true, message: "ok" })} />);
    expect(screen.queryByRole("note")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /^Revisar encerramento/ }));
    const group = screen.getByRole("group", { name: /Confirmar o encerramento do plano do ciclo 2026-T2/ });
    expect(group.textContent).toContain("3 ações: 1 concluída(s), 1 em vigilância, 1 interrompida(s).");
    expect(group.textContent).toMatch(/não aceita novas ações, mudanças de estado nem novos registros/);
    expect(group.textContent).toContain("Não há reabertura nesta versão");
    expect(group.textContent).toMatch(/Não avalia eficácia, não altera o IVO, não valida o método/);
    expect(document.activeElement?.id).toContain("confirm-title");
    expect(within(group).getByRole("button", { name: "Confirmar encerramento" })).toBeTruthy();
  });

  test("ANTES de confirmar o texto é prospectivo (o plano ainda não está encerrado); a redação factual fica para depois do sucesso", () => {
    render(<ClosePlanPanel plan={finishedPlan} busy={false} onClose={async () => ({ ok: true, message: "ok" })} />);
    fireEvent.click(screen.getByRole("button", { name: /^Revisar encerramento/ }));
    const group = screen.getByRole("group", { name: /Confirmar o encerramento/ });
    const items = within(group).getAllByRole("listitem").map((li) => li.textContent);
    expect(items[1]).toBe(CLOSE_CONFIRMATION_EXPLANATION);
    expect(items[1]).toMatch(
      /^Você está prestes a encerrar este plano\. Depois de encerrado, ele não aceita novas ações, mudanças de estado nem novos registros de execução ou aprendizagem\./,
    );
    // Nada na confirmação afirma que o encerramento já aconteceu.
    expect(group.textContent).not.toContain(CLOSED_PLAN_EXPLANATION);
    expect(group.textContent).not.toMatch(/Plano encerrado/);
    // O que muda depois do encerramento é o mesmo nas duas redações (fonte única): futuro antes, fato depois.
    expect(CLOSE_CONFIRMATION_EXPLANATION.endsWith(CLOSED_PLAN_EXPLANATION.replace(/^Plano encerrado: /, ""))).toBe(true);
    // Reabertura, separação entre encerramento e eficácia e a contagem seguem como estavam.
    expect(items[0]).toBe("3 ações: 1 concluída(s), 1 em vigilância, 1 interrompida(s).");
    expect(items[2]).toBe("Não há reabertura nesta versão: o encerramento é definitivo.");
    expect(items[3]).toMatch(/^Encerrar o plano é um ato operacional\. Não avalia eficácia, não altera o IVO, não valida o método/);
  });

  test("a confirmação é explícita: abrir a revisão, Enter no resumo e Cancelar não encerram; só 'Confirmar encerramento' chama o encerramento", async () => {
    const onClose = mock(async (_planId: string) => ({ ok: true, message: "ok" }));
    render(<ClosePlanPanel plan={finishedPlan} busy={false} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: /^Revisar encerramento/ }));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByRole("group", { name: /Confirmar o encerramento/ }), { key: "Enter" });
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /^Revisar encerramento/ }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar encerramento" }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onClose.mock.calls[0]![0]).toBe("plan-1");
  });

  test("confirmar chama o encerramento UMA vez, mesmo com clique duplo, e sinaliza o envio", async () => {
    let finish: (r: { ok: boolean; message: string }) => void = () => {};
    const onClose = mock((_planId: string) => new Promise<{ ok: boolean; message: string }>((resolve) => (finish = resolve)));
    render(<ClosePlanPanel plan={finishedPlan} busy={false} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: /^Revisar encerramento/ }));
    const confirm = screen.getByRole("button", { name: "Confirmar encerramento" });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onClose.mock.calls[0]![0]).toBe("plan-1");
    expect(confirm.getAttribute("aria-disabled")).toBe("true");
    expect(confirm.textContent).toBe("Encerrando…");
    finish({ ok: true, message: "Plano encerrado." });
    await waitFor(() => expect(confirm.getAttribute("aria-disabled")).toBe("false"));
  });

  test("falha aparece na própria confirmação e permite tentar de novo", async () => {
    const onClose = mock(async () => ({ ok: false, message: "Ainda há ações em andamento." }));
    render(<ClosePlanPanel plan={finishedPlan} busy={false} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: /^Revisar encerramento/ }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar encerramento" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Ainda há ações em andamento.");
    expect(screen.getByRole("group", { name: /Confirmar o encerramento/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar encerramento" }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(2));
  });

  test("cancelar e Escape fecham a confirmação sem encerrar e devolvem o foco ao botão de origem", async () => {
    const onClose = mock(async () => ({ ok: true, message: "ok" }));
    render(<ClosePlanPanel plan={finishedPlan} busy={false} onClose={onClose} />);
    const trigger = screen.getByRole("button", { name: /^Revisar encerramento/ });
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("group", { name: /Confirmar o encerramento/ })).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: /^Revisar encerramento/ })));

    fireEvent.click(screen.getByRole("button", { name: /^Revisar encerramento/ }));
    fireEvent.keyDown(screen.getByRole("group", { name: /Confirmar o encerramento/ }), { key: "Escape" });
    expect(screen.queryByRole("group", { name: /Confirmar o encerramento/ })).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });

  test("rascunho, plano encerrado e banco sem a migration não mostram o painel", () => {
    for (const p of [plan("draft", finishedPlan.actions), plan("closed", finishedPlan.actions), { ...finishedPlan, composition: "unavailable" as const }]) {
      const { container, unmount } = render(<ClosePlanPanel plan={p} busy={false} onClose={async () => ({ ok: true, message: "ok" })} />);
      expect(container.textContent).toBe("");
      unmount();
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Plano encerrado e integração na seção do plano
// ═══════════════════════════════════════════════════════════════════════════

describe("plano encerrado", () => {
  const closed = plan(
    "closed",
    [
      action("a1", "Rodas de conversa", "concluida", { evidence: { execution: [{ id: "e1", kind: "texto", content: "Ata do encontro", occurredOn: "2026-06-10", recordedAt: "2026-06-11T10:00:00Z" }], learning: [] } }),
      action("a2", "Pausas ativas", "em_vigilancia", { addedLater: { at: "2026-06-15T13:00:00Z", byRole: "RH_ADMIN" } }),
    ],
    { closedAt: "2026-10-14T02:30:00Z", closedByRole: "RH_ADMIN" },
  );

  test("o aviso usa a data CIVIL do fuso do produto, diz quem encerrou e explica o que não está disponível", () => {
    render(<ClosedPlanNotice plan={closed} />);
    const notice = screen.getByRole("note", { name: "Plano encerrado" });
    // 14/10/2026 02:30Z é 13/10/2026 23:30 em São Paulo.
    expect(notice.textContent).toContain("13 de outubro de 2026");
    expect(notice.querySelector("time")?.getAttribute("datetime")).toBe("2026-10-14T02:30:00Z");
    expect(notice.textContent).toContain("por RH_ADMIN");
    expect(notice.textContent).toMatch(/não aceita novas ações, mudanças de estado nem novos registros/);
    expect(notice.textContent).toContain("Não há reabertura nesta versão");
    expect(notice.textContent).toMatch(/Não avalia eficácia/);
  });

  test("DEPOIS do encerramento a redação é factual: o plano está encerrado, sem o texto prospectivo da confirmação", () => {
    render(<ClosedPlanNotice plan={closed} />);
    const notice = screen.getByRole("note", { name: "Plano encerrado" });
    expect(notice.textContent).toMatch(/^Plano encerrado em 13 de outubro de 2026 por RH_ADMIN/);
    expect(notice.textContent).toContain(CLOSED_PLAN_EXPLANATION);
    expect(notice.textContent).not.toMatch(/prestes a encerrar/);
  });

  test("não aparece em plano ativo", () => {
    const { container } = render(<ClosedPlanNotice plan={activePlan} />);
    expect(container.textContent).toBe("");
  });

  test("na seção: nada de mudar estado ou registrar execução, histórico legível, inclusão explicada e eficácia separada", () => {
    render(
      <FibtActionPlanSection
        plan={closed}
        busy={false}
        today="2026-10-14"
        onActivate={() => {}}
        callbacks={{ onAccountability: () => {}, onStatus: () => {}, onEvidence: () => {} }}
        enhancements={{ planClosure: <ClosedPlanNotice plan={closed} /> }}
      />,
    );
    expect(screen.getByText("Encerrado")).toBeTruthy();
    expect(screen.queryByText("Mudar estado")).toBeNull();
    expect(screen.queryByRole("button", { name: /^Registrar execução/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Registrar aprendizagem/ })).toBeNull();
    // Histórico preservado e legível.
    expect(within(screen.getByRole("region", { name: /Evidência de execução — Rodas/ })).getByText(/Ata do encontro/)).toBeTruthy();
    // Por que a edição não está disponível, em cada ação.
    expect(screen.getAllByText(/Plano encerrado: o estado e os registros de execução e aprendizagem desta ação estão somente para leitura/)).toHaveLength(2);
    // Ação incluída depois: quando e por quem.
    expect(screen.getByText(/incluída depois da criação do plano, em/).parentElement?.textContent).toContain("por RH_ADMIN");
    // A eficácia segue uma decisão à parte.
    expect(screen.getAllByText("Eficácia: não avaliada")).toHaveLength(2);
  });

  test("a seção posiciona o painel de encerramento antes das ações e o formulário de inclusão depois delas", () => {
    render(
      <FibtActionPlanSection
        plan={activePlan}
        busy={false}
        today="2026-06-30"
        onActivate={() => {}}
        callbacks={{ onAccountability: () => {}, onStatus: () => {}, onEvidence: () => {} }}
        enhancements={{
          planClosure: <p>PAINEL-ENCERRAR</p>,
          planAddAction: <p>FORM-INCLUIR</p>,
        }}
      />,
    );
    const firstCard = screen.getByRole("article", { name: "Rodas de conversa" });
    const lastCard = screen.getByRole("article", { name: "Pausas ativas" });
    expect(screen.getByText("PAINEL-ENCERRAR").compareDocumentPosition(firstCard) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(lastCard.compareDocumentPosition(screen.getByText("FORM-INCLUIR")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Foco depois de encerrar (WCAG 2.4.3)
// ═══════════════════════════════════════════════════════════════════════════

describe("PlanClosure — foco depois de encerrar", () => {
  const finished = plan("active", [action("a1", "Rodas de conversa", "concluida"), action("a2", "Pausas ativas", "em_vigilancia")]);
  const closedNow = plan("closed", finished.actions, { closedAt: "2026-10-14T12:00:00Z", closedByRole: "RH_ADMIN" });
  const noop = async () => ({ ok: true, message: "ok" });

  /** Imita a rota: o sucesso do encerramento troca o plano (ativo → encerrado) na MESMA montagem. */
  function Closing() {
    const [current, setCurrent] = useState(finished);
    return (
      <PlanClosure
        plan={current}
        busy={false}
        onClose={async () => {
          setCurrent(closedNow);
          return { ok: true, message: "Plano encerrado." };
        }}
      />
    );
  }

  test("após encerrar com sucesso o foco vai para o aviso (o botão que o tinha saiu de cena)", async () => {
    render(<Closing />);
    fireEvent.click(screen.getByRole("button", { name: /^Revisar encerramento/ }));
    const confirm = screen.getByRole("button", { name: "Confirmar encerramento" });
    act(() => confirm.focus());
    expect(document.activeElement).toBe(confirm);
    fireEvent.click(confirm);
    const notice = await screen.findByRole("note", { name: "Plano encerrado" });
    await waitFor(() => expect(document.activeElement).toBe(notice));
    // Papel e rótulo preservados; focável só por programa (fora da ordem do Tab); o painel saiu de cena.
    expect(notice.getAttribute("tabindex")).toBe("-1");
    expect(screen.queryByRole("button", { name: "Confirmar encerramento" })).toBeNull();
  });

  test("do pedido ao sucesso: a confirmação é prospectiva; depois do sucesso só o aviso factual permanece", async () => {
    render(<Closing />);
    expect(screen.queryByRole("note", { name: "Plano encerrado" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /^Revisar encerramento/ }));
    expect(screen.getByText(/Você está prestes a encerrar este plano/)).toBeTruthy();
    expect(screen.queryByRole("note", { name: "Plano encerrado" })).toBeNull(); // nada de "encerrado" antes de confirmar
    fireEvent.click(screen.getByRole("button", { name: "Confirmar encerramento" }));
    const notice = await screen.findByRole("note", { name: "Plano encerrado" });
    expect(notice.textContent).toContain("Plano encerrado: não aceita novas ações");
    expect(screen.queryByText(/Você está prestes a encerrar/)).toBeNull();
  });

  test("montar com o plano já encerrado não move o foco", async () => {
    render(<PlanClosure plan={closedNow} busy={false} onClose={noop} />);
    expect(screen.getByRole("note", { name: "Plano encerrado" })).toBeTruthy();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.activeElement).toBe(document.body);
  });

  test("a passagem a encerrado por outro caminho não tira o foco de quem está em outro campo", async () => {
    const tree = (p: FibtActionPlanView) => (
      <>
        <input aria-label="Outro campo" />
        <PlanClosure plan={p} busy={false} onClose={noop} />
      </>
    );
    const { rerender } = render(tree(finished));
    const other = screen.getByLabelText("Outro campo");
    act(() => other.focus());
    rerender(tree(closedNow));
    expect(screen.getByRole("note", { name: "Plano encerrado" })).toBeTruthy();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.activeElement).toBe(other);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Estilos de bloqueio e de foco dos botões
// ═══════════════════════════════════════════════════════════════════════════

describe("buttonPrimary e buttonSecondary — bloqueio e foco", () => {
  // O bloqueio é por aria-disabled (o foco fica no botão), então `disabled:` nunca vale: o estilo vem de
  // `aria-disabled:`. O anel de foco ganha o afastamento do fundo, como nos demais botões do loop.
  for (const [name, classes] of [["buttonPrimary", buttonPrimary], ["buttonSecondary", buttonSecondary]] as const) {
    test(`${name} sinaliza o bloqueio por aria-disabled e afasta o anel de foco do fundo`, () => {
      const tokens = classes.split(/\s+/);
      for (const cls of ["aria-disabled:cursor-not-allowed", "aria-disabled:opacity-60", "focus-visible:ring-offset-2", "focus-visible:ring-offset-background"]) {
        expect(tokens).toContain(cls);
      }
    });
  }
});
