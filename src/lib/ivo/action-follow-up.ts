// Acompanhamento das ações FIB-T (R7): linha do tempo e resumo do plano.
// Módulo PURO (sem I/O), seguro para o cliente. Trabalha sobre as visões que o
// servidor JÁ devolve (ledger + C8): não grava, não duplica evidência em outro
// armazenamento e não calcula nenhum índice.
//
// Princípios:
//   · a linha do tempo diz o que foi registrado e QUANDO — nunca sugere melhora;
//   · concluir uma ação (estado operacional) coexiste com eficácia não avaliada;
//   · cada entrada traz a data do fato (quando aconteceu) separada do instante
//     do registro (quando foi gravado);
//   · conteúdo de teste e parecer de governança de teste ficam identificados.
import type { PlanActionStatus } from "@/engine/action-plan/action-log-engine";
import type { EfficacyState } from "@/engine/ivo/efficacy-protocol";
import type { EfficacyItemView, FibtActionPlanView, FibtActionView } from "./ivo-views";
import { isTestContentId } from "./content-ref";
import { formatIsoDateLong, todayInSaoPaulo } from "./local-date";

export const TIMELINE_NOTE =
  "A linha do tempo registra o que foi feito e quando. Concluir tarefas não altera o IVO nem comprova melhora.";

export type TimelineKind =
  | "priority_origin"
  | "plan_created"
  | "plan_activated"
  | "status_change"
  | "note"
  | "execution"
  | "learning"
  | "protocol_draft"
  | "protocol_registered"
  | "observation"
  | "verdict";

export interface TimelineEntry {
  id: string;
  /** Instante do REGISTRO (ISO). */
  at: string;
  kind: TimelineKind;
  label: string;
  detail: string | null;
  /** Data do FATO (AAAA-MM-DD), quando difere do registro. */
  factualDate: string | null;
  /** Vínculo educativo (aprendizagem). */
  content: { contentId: string; version: string } | null;
  /** Identifica dados/decisões de teste. */
  test: boolean;
}

const STATUS_LABEL: Record<PlanActionStatus, string> = {
  planejada: "Planejada",
  em_execucao: "Em execução",
  concluida: "Concluída",
  em_vigilancia: "Em vigilância",
  interrompida: "Interrompida",
};

const ORDER: Record<TimelineKind, number> = {
  priority_origin: 0,
  plan_created: 1,
  plan_activated: 2,
  status_change: 3,
  note: 3,
  execution: 4,
  learning: 4,
  protocol_draft: 5,
  protocol_registered: 6,
  observation: 7,
  verdict: 8,
};

export type ContentRefParser = (contentRef: string) => { contentId: string; version: string; text: string } | null;

const VERDICT_LABEL = { meta_atingida: "meta atingida", meta_nao_atingida: "meta não atingida", inconclusiva: "inconclusiva" } as const;

export function buildActionTimeline(
  action: FibtActionView,
  plan: Pick<FibtActionPlanView, "createdAt" | "activatedAt" | "cycleKeyCanonical" | "cycleKey">,
  efficacy: EfficacyItemView | null,
  parseContentRef: ContentRefParser = () => null,
): TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  const add = (e: Omit<TimelineEntry, "detail" | "factualDate" | "content" | "test"> & Partial<Pick<TimelineEntry, "detail" | "factualDate" | "content" | "test">>) =>
    entries.push({ detail: null, factualDate: null, content: null, test: false, ...e });

  add({
    id: `${action.id}:origin`,
    at: plan.createdAt,
    kind: "priority_origin",
    label: "Prioridade definida a partir de leitura publicada",
    detail: `FIB-T ${action.source.instrumentVersion} · ${action.source.cohortLabel ?? "setor"} · fator ${action.source.factorName} · leitura publicada em ${formatIsoDateLong(todayInSaoPaulo(new Date(action.source.publishedAt)))}`,
  });
  add({ id: `${action.id}:plan`, at: plan.createdAt, kind: "plan_created", label: `Plano do ciclo ${plan.cycleKeyCanonical ?? plan.cycleKey} criado em rascunho` });
  if (plan.activatedAt) add({ id: `${action.id}:activated`, at: plan.activatedAt, kind: "plan_activated", label: "Plano ativado" });

  for (const t of action.timeline) {
    if (t.kind === "evidence_recorded") continue; // o próprio registro de evidência aparece abaixo, com o conteúdo
    if (t.kind === "status_change" && t.toStatus) {
      add({ id: t.id, at: t.occurredAt, kind: "status_change", label: `Estado da ação: ${STATUS_LABEL[t.toStatus]}`, detail: t.note });
    } else {
      add({ id: t.id, at: t.occurredAt, kind: "note", label: t.kind === "note" ? "Nota registrada" : `Registro: ${t.kind}`, detail: t.note });
    }
  }

  for (const [scope, list] of [["execution", action.evidence.execution], ["learning", action.evidence.learning]] as const) {
    for (const e of list) {
      const ref = scope === "learning" ? parseContentRef(e.content) : null;
      add({
        id: e.id,
        at: e.recordedAt,
        kind: scope,
        label: scope === "execution" ? "Execução registrada" : "Aprendizagem registrada",
        detail: ref ? ref.text : e.content,
        factualDate: e.occurredOn,
        content: ref ? { contentId: ref.contentId, version: ref.version } : null,
        test: ref ? isTestContentId(ref.contentId) : false,
      });
    }
  }

  if (efficacy) {
    const protocols = [efficacy.registered, efficacy.draft].filter((p): p is NonNullable<typeof p> => !!p);
    for (const p of protocols) {
      if (p.status === "draft") {
        add({ id: p.id, at: p.updatedAt, kind: "protocol_draft", label: `Protocolo de avaliação em rascunho (revisão ${p.revision})`, detail: "Rascunho não vale como protocolo até ser registrado." });
      } else {
        add({ id: p.id, at: p.registeredAt ?? p.updatedAt, kind: "protocol_registered", label: `Protocolo de avaliação registrado (revisão ${p.revision})`, detail: p.objective });
      }
    }
    for (const o of efficacy.observations) {
      add({ id: o.id, at: o.recordedAt, kind: "observation", label: "Observação registrada", detail: o.value !== null ? `Valor informado: ${o.value}` : "Referência a leitura publicada (valor não copiado)", factualDate: o.observedOn });
    }
    if (efficacy.verdict) {
      const v = efficacy.verdict;
      add({
        id: v.id,
        at: v.createdAt,
        kind: "verdict",
        label: `Parecer de eficácia: ${VERDICT_LABEL[v.verdict]}`,
        detail: v.reason || null,
        test: v.governance.source === "teste_sintetico",
      });
    }
  }

  // Ordena pelo INSTANTE (não pelo texto): o banco devolve formatos diferentes (Z, +00:00, microssegundos).
  const ms = (iso: string): number => {
    const v = Date.parse(iso);
    return Number.isNaN(v) ? 0 : v;
  };
  return entries.sort((a, b) => ms(a.at) - ms(b.at) || ORDER[a.kind] - ORDER[b.kind] || a.id.localeCompare(b.id));
}

// ─── Resumo do plano (acompanhamento e encerramento OPERACIONAL) ──────────────
export interface PlanFollowUp {
  actions: number;
  byStatus: Record<PlanActionStatus, number>;
  executionRecords: number;
  learningRecords: number;
  actionsWithoutExecution: number;
  actionsWithoutLearning: number;
  protocols: { none: number; draft: number; registered: number };
  evaluations: Record<EfficacyState, number>;
  /** Ações com avaliação ainda não conclusiva (atingida/não atingida/inconclusiva). */
  evaluationsPending: number;
  /** Toda ação está em estado operacional de saída (concluída, em vigilância ou interrompida). */
  operationallyFinished: boolean;
  /** Sempre presente: separa encerramento operacional de eficácia. */
  closingNote: string;
}

const OPERATIONAL_EXIT: readonly PlanActionStatus[] = ["concluida", "em_vigilancia", "interrompida"];

export function summarizePlan(plan: FibtActionPlanView, efficacy: readonly EfficacyItemView[]): PlanFollowUp {
  const byStatus: Record<PlanActionStatus, number> = { planejada: 0, em_execucao: 0, concluida: 0, em_vigilancia: 0, interrompida: 0 };
  const evaluations: Record<EfficacyState, number> = {
    sem_protocolo: 0, aguardando_observacao: 0, em_avaliacao: 0, meta_atingida: 0, meta_nao_atingida: 0, inconclusiva: 0,
  };
  const protocols = { none: 0, draft: 0, registered: 0 };
  let execution = 0;
  let learning = 0;
  let withoutExecution = 0;
  let withoutLearning = 0;
  for (const action of plan.actions) {
    byStatus[action.status] += 1;
    execution += action.evidence.execution.length;
    learning += action.evidence.learning.length;
    if (action.evidence.execution.length === 0) withoutExecution += 1;
    if (action.evidence.learning.length === 0) withoutLearning += 1;
    const e = efficacy.find((x) => x.itemId === action.id) ?? null;
    if (!e) {
      protocols.none += 1;
      evaluations.sem_protocolo += 1;
    } else {
      evaluations[e.state] += 1;
      if (e.registered) protocols.registered += 1;
      else if (e.draft) protocols.draft += 1;
      else protocols.none += 1;
    }
  }
  const conclusive = evaluations.meta_atingida + evaluations.meta_nao_atingida + evaluations.inconclusiva;
  const total = plan.actions.length;
  return {
    actions: total,
    byStatus,
    executionRecords: execution,
    learningRecords: learning,
    actionsWithoutExecution: withoutExecution,
    actionsWithoutLearning: withoutLearning,
    protocols,
    evaluations,
    evaluationsPending: total - conclusive,
    operationallyFinished: total > 0 && plan.actions.every((a) => OPERATIONAL_EXIT.includes(a.status)),
    closingNote:
      "Encerramento operacional não é avaliação de eficácia: uma ação pode estar concluída enquanto a eficácia segue não avaliada, e nada aqui altera o IVO.",
  };
}
