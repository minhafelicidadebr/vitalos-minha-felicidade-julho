import { describe, expect, test } from "bun:test";
import { encodeContentRef, parseContentRef } from "@/domain/ivo/factor-content";
import { buildActionTimeline, summarizePlan, TIMELINE_NOTE } from "./action-follow-up";
import type { EfficacyItemView, FibtActionPlanView, FibtActionView } from "./ivo-views";

// Dados SINTÉTICOS identificados.
const CONTENT = { id: "TESTE-bem_estar-001", version: "0.0.1-teste" };
const action: FibtActionView = {
  id: "item-1",
  planId: "plan-1",
  rank: 1,
  title: "Rodas de conversa (sintético)",
  description: "",
  effort: "medio",
  status: "concluida",
  owner: { roleLabel: "Coordenação sintética", isCurrentUser: true },
  dueOn: "2026-10-11",
  executionMetric: { label: "Encontros", baseline: 0, target: 1, unit: "encontro" },
  source: {
    lens: "fibt", waveId: "w", cohortId: "c", cohortLabel: "Operações", factorId: "bem_estar", factorName: "Bem-Estar",
    instrumentVersion: "1.0.0", publishedAt: "2026-10-03T12:00:00.000Z",
  },
  dimension: { status: "mapping_pending", dimensionIds: [] },
  evidence: {
    execution: [{ id: "ev-exec", kind: "texto", content: "Encontro realizado", occurredOn: "2026-10-04", recordedAt: "2026-10-05T01:10:00.000Z" }],
    learning: [
      { id: "ev-learn", kind: "aprendizagem", content: encodeContentRef(CONTENT, "Pauta curta ajudou"), occurredOn: "2026-10-04", recordedAt: "2026-10-05T01:20:00.000Z" },
      { id: "ev-learn-2", kind: "aprendizagem", content: "Sem vínculo educativo", occurredOn: "2026-10-04", recordedAt: "2026-10-05T01:25:00.000Z" },
    ],
  },
  efficacy: { status: "not_evaluated", reason: "x" },
  timeline: [
    { id: "log-1", kind: "status_change", toStatus: "em_execucao", note: null, occurredAt: "2026-10-05T01:00:00.000Z" },
    { id: "log-2", kind: "evidence_recorded", toStatus: null, note: null, occurredAt: "2026-10-05T01:10:00.000Z" },
    { id: "log-3", kind: "status_change", toStatus: "concluida", note: null, occurredAt: "2026-10-05T01:30:00.000Z" },
  ],
  addedLater: null,
};
const plan: FibtActionPlanView = {
  id: "plan-1", cycleKey: "2026-T4", cycleKeyCanonical: "2026-T4", status: "active",
  createdAt: "2026-10-04T23:50:00.000Z", activatedAt: "2026-10-04T23:59:00.000Z", closedAt: null, closedByRole: null, composition: "available", missingAccountability: 0, actions: [action],
};
const emptyEfficacy = (over: Partial<EfficacyItemView> = {}): EfficacyItemView => ({
  itemId: "item-1", draft: null, registered: null, previousRevisions: 0, observations: [], verdict: null,
  state: "sem_protocolo", stateLabel: "Sem protocolo de avaliação", windowStatus: null, registrationIssues: [], assessment: null, ...over,
});

describe("linha do tempo da ação", () => {
  test("reconstrói o que foi registrado e quando, em ordem, sem duplicar evidência", () => {
    const entries = buildActionTimeline(action, plan, null, parseContentRef);
    expect(entries.map((e) => e.kind)).toEqual([
      "priority_origin", "plan_created", "plan_activated", "status_change", "execution", "learning", "learning", "status_change",
    ]);
    // o evento genérico 'evidence_recorded' do log não vira entrada própria
    expect(entries.filter((e) => e.id === "log-2")).toHaveLength(0);
    expect(entries[0]!.detail).toContain("leitura publicada em 3 de outubro de 2026");
    const exec = entries.find((e) => e.kind === "execution")!;
    expect(exec).toMatchObject({ factualDate: "2026-10-04", at: "2026-10-05T01:10:00.000Z", detail: "Encontro realizado" });
  });

  test("aprendizagem vinculada a conteúdo expõe a referência; sem vínculo fica sem referência", () => {
    const learning = buildActionTimeline(action, plan, null, parseContentRef).filter((e) => e.kind === "learning");
    expect(learning[0]).toMatchObject({ content: { contentId: "TESTE-bem_estar-001", version: "0.0.1-teste" }, detail: "Pauta curta ajudou" });
    expect(learning[1]!.content).toBeNull();
    expect(learning[1]!.detail).toBe("Sem vínculo educativo");
  });

  test("inclui protocolo, observação e parecer; parecer de governança de teste fica identificado", () => {
    const efficacy = emptyEfficacy({
      state: "meta_atingida",
      registered: {
        id: "prot-1", itemId: "item-1", revision: 1, status: "registered", supersedesId: null, createdAt: "2026-10-05T02:00:00.000Z",
        updatedAt: "2026-10-05T02:05:00.000Z", registeredAt: "2026-10-05T02:05:00.000Z", objective: "Objetivo sintético do protocolo",
        indicatorLabel: null, indicatorKind: "resultado", indicatorOrigin: "medida_da_organizacao", unit: null, direction: "aumentar",
        baselineObservedOn: null, baselinePopulation: null, baselineSource: null, baselineValue: 2, baselineRef: null, targetKind: "numerico",
        targetValue: 3, targetCriterion: null, meaningfulDifference: 0.2, windowStart: null, windowEnd: null, source: null, comparisonRule: null,
        responsibleRole: null, reviewerRole: null, limitations: [],
      },
      observations: [{ id: "obs-1", protocolId: "prot-1", observedOn: "2026-11-15", value: 3.2, ref: null, note: "", recordedAt: "2026-11-15T12:00:00.000Z" }],
      verdict: {
        id: "ver-1", protocolId: "prot-1", observationId: "obs-1", verdict: "meta_atingida", claimScope: "resultado", evidenceGrade: "pre_pos",
        observedChange: "melhorou", targetReached: true, attribution: { status: "nao_avaliada", design: null }, reason: "", limitations: [],
        reviewerRole: "Revisão sintética", governance: { decision: "D9", state: "aprovado_para_piloto", source: "teste_sintetico" }, createdAt: "2026-11-16T12:00:00.000Z",
      },
    });
    const entries = buildActionTimeline(action, plan, efficacy, parseContentRef);
    const tail = entries.slice(-3);
    expect(tail.map((e) => e.kind)).toEqual(["protocol_registered", "observation", "verdict"]);
    expect(tail[2]).toMatchObject({ label: "Parecer de eficácia: meta atingida", test: true });
    expect(tail[1]).toMatchObject({ factualDate: "2026-11-15", detail: "Valor informado: 3.2" });
  });

  test("observação de leitura publicada não mostra valor (só referência)", () => {
    const efficacy = emptyEfficacy({
      observations: [{ id: "obs-2", protocolId: "p", observedOn: "2026-11-15", value: null, ref: { cohortKey: "operacoes", cycleKey: "2026-T4", instrumentVersion: "1.0.0", calculationVersion: "c", publicationState: "published" }, note: "", recordedAt: "2026-11-15T12:00:00.000Z" }],
    });
    const obs = buildActionTimeline(action, plan, efficacy).find((e) => e.kind === "observation")!;
    expect(obs.detail).toContain("valor não copiado");
    expect(obs.detail).not.toMatch(/\d/);
  });

  test("nota fixa não sugere melhora por conclusão", () => {
    expect(TIMELINE_NOTE).toContain("não altera o IVO nem comprova melhora");
    const labels = buildActionTimeline(action, plan, null).map((e) => e.label).join(" ");
    expect(labels).not.toMatch(/melhor/i);
  });
});

describe("resumo do plano (acompanhamento e encerramento operacional)", () => {
  test("conclusão operacional coexiste com eficácia não avaliada", () => {
    const s = summarizePlan(plan, []);
    expect(s).toMatchObject({ actions: 1, executionRecords: 1, learningRecords: 2, operationallyFinished: true, evaluationsPending: 1 });
    expect(s.byStatus.concluida).toBe(1);
    expect(s.protocols).toEqual({ none: 1, draft: 0, registered: 0 });
    expect(s.evaluations.sem_protocolo).toBe(1);
    expect(s.closingNote).toContain("não é avaliação de eficácia");
  });

  test("rascunho e protocolo registrado são contados à parte; pendências aparecem", () => {
    const draftOnly = emptyEfficacy({ draft: { id: "d", itemId: "item-1", revision: 1, status: "draft", supersedesId: null, createdAt: "x", updatedAt: "x", registeredAt: null } as never });
    expect(summarizePlan(plan, [draftOnly]).protocols).toEqual({ none: 0, draft: 1, registered: 0 });
    const inconclusive = emptyEfficacy({ state: "inconclusiva", registered: { id: "r" } as never });
    const s = summarizePlan(plan, [inconclusive]);
    expect(s.protocols.registered).toBe(1);
    expect(s.evaluationsPending).toBe(0);
    expect(s.evaluations.inconclusiva).toBe(1);
  });

  test("plano com ação ainda em execução não está encerrado operacionalmente", () => {
    const running: FibtActionPlanView = { ...plan, actions: [{ ...action, status: "em_execucao", evidence: { execution: [], learning: [] } }] };
    const s = summarizePlan(running, []);
    expect(s.operationallyFinished).toBe(false);
    expect(s).toMatchObject({ actionsWithoutExecution: 1, actionsWithoutLearning: 1 });
  });
});
