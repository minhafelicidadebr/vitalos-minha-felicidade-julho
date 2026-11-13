// Encerramento OPERACIONAL do plano de ações (PI-13): regra pura, sem I/O.
//
// Fonte única da regra para o servidor (que a aplica antes de gravar), para a
// interface (que a antecipa) e para os testes. O banco é a autoridade final: o
// gatilho ivo_ledger.guard_plan_update repete a mesma regra sob trava da linha do
// plano (supabase/migrations/20261016120000_*). Um teste confere que a lista de
// estados de saída é a mesma nos dois lados.
//
// O que "encerrar" significa (e o que não significa):
//   · significa que o plano deixa de ser trabalhado — nenhuma ação nova, nenhuma
//     mudança de estado, nenhum registro novo de execução/aprendizagem;
//   · NÃO é avaliação de eficácia, NÃO melhora o IVO, NÃO valida método, NÃO
//     aprova o protocolo C8 e NÃO depende de parecer conclusivo;
//   · não existe reabertura (não há contrato que a defina): encerrado é terminal.
import type { PlanActionStatus } from "@/engine/action-plan/action-log-engine";
import type { FibtActionPlanView } from "./ivo-views";

/** Estados em que a ação saiu da execução (domínio: concluída, em vigilância ou interrompida). */
export const OPERATIONAL_EXIT: readonly PlanActionStatus[] = ["concluida", "em_vigilancia", "interrompida"];

export const PLAN_STATUS_LABEL: Record<PlanActionStatus, string> = {
  planejada: "planejada",
  em_execucao: "em execução",
  concluida: "concluída",
  em_vigilancia: "em vigilância",
  interrompida: "interrompida",
};

export type PlanClosureBlock = "plan_closed" | "plan_not_active" | "plan_empty" | "pending_actions";

export interface PlanClosureAssessment {
  canClose: boolean;
  block: PlanClosureBlock | null;
  total: number;
  /** Ações já em estado de saída, por estado. */
  finished: { concluida: number; em_vigilancia: number; interrompida: number };
  /** Ações que ainda impedem o encerramento. */
  pending: Array<{ id: string; title: string; status: PlanActionStatus }>;
}

export function assessPlanClosure(plan: {
  status: FibtActionPlanView["status"];
  actions: ReadonlyArray<{ id: string; title: string; status: PlanActionStatus }>;
}): PlanClosureAssessment {
  const finished = { concluida: 0, em_vigilancia: 0, interrompida: 0 };
  const pending: PlanClosureAssessment["pending"] = [];
  for (const action of plan.actions) {
    if (OPERATIONAL_EXIT.includes(action.status)) finished[action.status as keyof typeof finished] += 1;
    else pending.push({ id: action.id, title: action.title, status: action.status });
  }
  const total = plan.actions.length;
  const block: PlanClosureBlock | null =
    plan.status === "closed"
      ? "plan_closed"
      : plan.status !== "active"
        ? "plan_not_active"
        : total === 0
          ? "plan_empty"
          : pending.length > 0
            ? "pending_actions"
            : null;
  return { canClose: block === null, block, total, finished, pending };
}

/** "2 planejada(s) · 1 em execução" — contagem das pendências por estado, na ordem do ciclo. */
export function describePending(pending: PlanClosureAssessment["pending"]): string {
  // Estados pendentes = complemento de OPERATIONAL_EXIT (a fonte única que o gatilho SQL também
  // usa) sobre todos os PlanActionStatus. PLAN_STATUS_LABEL é Record<PlanActionStatus, …>: o
  // compilador exige uma chave por estado, e a ordem de declaração é a do ciclo.
  const order = (Object.keys(PLAN_STATUS_LABEL) as PlanActionStatus[]).filter((status) => !OPERATIONAL_EXIT.includes(status));
  return order
    .map((status) => ({ status, n: pending.filter((p) => p.status === status).length }))
    .filter((x) => x.n > 0)
    .map((x) => `${x.n} ${PLAN_STATUS_LABEL[x.status]}${x.status === "planejada" ? "(s)" : ""}`)
    .join(" · ");
}

/** Plano ativo sem ações: ainda não há o que encerrar. Mesmo texto no servidor (motivo `plan_empty`) e na interface. */
export const PLAN_EMPTY_MESSAGE = "Um plano sem ações não pode ser encerrado.";

/** Texto fixo que acompanha o encerramento: separa execução de aprendizagem e de avaliação. */
export const CLOSURE_NOT_EVALUATION_NOTE =
  "Encerrar o plano é um ato operacional. Não avalia eficácia, não altera o IVO, não valida o método e não aprova nenhum protocolo ou parecer de avaliação.";

/** O que muda quando o plano está encerrado: uma só fonte para a redação factual (depois) e a prospectiva (antes). */
const CLOSED_PLAN_EFFECTS =
  "não aceita novas ações, mudanças de estado nem novos registros de execução ou aprendizagem. O histórico e as evidências continuam legíveis, e a avaliação de eficácia segue independente do encerramento.";

/** DEPOIS do encerramento (aviso do plano encerrado): factual, o plano já está encerrado. */
export const CLOSED_PLAN_EXPLANATION = `Plano encerrado: ${CLOSED_PLAN_EFFECTS}`;

/** ANTES da confirmação (painel de confirmação): prospectivo, nada foi encerrado ainda. */
export const CLOSE_CONFIRMATION_EXPLANATION = `Você está prestes a encerrar este plano. Depois de encerrado, ele ${CLOSED_PLAN_EFFECTS}`;

export const CLOSED_PLAN_NO_REOPEN = "Não há reabertura nesta versão: o encerramento é definitivo.";
