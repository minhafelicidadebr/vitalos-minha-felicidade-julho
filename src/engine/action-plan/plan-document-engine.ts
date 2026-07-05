// Documento do Plano Vivo — engine puro. Serializa um EnrichedQuarterlyPlan +
// o sumário do Action Log num documento estruturado e portável: metadados →
// seções com título + corpo em linhas prontas para texto/Markdown → aviso
// legal obrigatório no rodapé. Mesmo idioma de pgr-document-engine.ts (que já
// segue esta forma para o dossiê GRO/PGR) — o motor nunca sabe que existe PDF,
// só produz um documento determinístico; a camada de export (jsPDF, client-
// side) é quem converte isso em arquivo.
//
// DECISÃO REGISTRADA (Fable5 §8, verificado contra o código real): o blueprint
// original (PLANO_ARCO_DA_PROVA_1.0.md §I) citava "a camada jspdf+html2canvas
// que a Academia já comprou" — auditado o repositório inteiro, NENHUMA das
// duas bibliotecas existe em nenhum sprint anterior (nem o próprio
// pgr-document-engine, o dossiê legal mais crítico do produto, tem export de
// PDF — só serializa para Markdown). Este é o PRIMEIRO pipeline de PDF do
// produto. Como o documento é predominantemente textual/tabular, a decisão foi
// usar jsPDF sozinho (texto vetorial, nítido, leve) — html2canvas (screenshot
// de DOM) fica reservado para um export visual futuro, se um dia for pedido.
//
// Engine puro: sem React, sem I/O, sem domain/. Determinístico.

import type { EnrichedActionItem, EnrichedQuarterlyPlan } from "./plan-enrichment-engine";
import type { ActionLogSummary } from "./action-log-engine";

export interface PlanDocumentMeta {
  orgName: string;
  /** Ex.: "2026-t3-fundacao-segura · Fundação Segura". */
  cycleLabel: string;
  documentId: string;
  /** ISO 8601 — hora de geração, não a hora de criação do plano. */
  generatedAt: string;
}

export interface PlanDocumentSection {
  id: string;
  title: string;
  body: string[];
}

export interface PlanDocument {
  meta: PlanDocumentMeta;
  sections: PlanDocumentSection[];
  legalNotice: string;
}

const LEGAL_NOTICE =
  "Documento operacional de gestão participativa de vitalidade organizacional. Não é o PGR oficial " +
  "(NR-01) nem substitui profissional legalmente habilitado. O lift de IVO é estimativa orientativa, " +
  "não garantia de resultado. Accountability (dono, prazo, métrica) reflete o que a própria equipe " +
  "registrou até a data de geração deste documento.";

const TIER_LABEL: Record<string, string> = {
  eliminacao: "Eliminação",
  organizacao: "Organização",
  administrativa: "Administrativa",
  monitoramento: "Monitoramento",
};

export function buildPlanDocument(
  plan: EnrichedQuarterlyPlan,
  meta: PlanDocumentMeta,
  logSummary: ActionLogSummary,
): PlanDocument {
  return {
    meta,
    sections: [
      buildIdentificationSection(plan, meta),
      buildSummarySection(plan, logSummary),
      buildActionsSection(plan),
    ],
    legalNotice: LEGAL_NOTICE,
  };
}

function buildIdentificationSection(plan: EnrichedQuarterlyPlan, meta: PlanDocumentMeta): PlanDocumentSection {
  return {
    id: "identificacao",
    title: "1. Identificação",
    body: [
      `Organização: ${meta.orgName}`,
      `Ciclo: ${meta.cycleLabel}`,
      `Documento: ${meta.documentId}`,
      `Gerado em: ${meta.generatedAt}`,
      `Temporada: ${plan.season.name} — semana ${plan.season.currentWeek} de ${plan.season.totalWeeks} (fase ${plan.season.phaseLabel})`,
    ],
  };
}

function buildSummarySection(plan: EnrichedQuarterlyPlan, logSummary: ActionLogSummary): PlanDocumentSection {
  const body = [
    `Ações no plano: ${plan.actions.length} (${plan.quickWinCount} vitória(s) rápida(s)).`,
    `Completude do §13 (Guia MTE 2026 — dono, prazo e métrica): ${plan.gauge.pct}% (${plan.gauge.compliant} de ${plan.gauge.total}).`,
    `Concluídas: ${logSummary.concludedCount} (${logSummary.pctConcluded}%).`,
    `Lift de IVO agendado: +${plan.scheduledIvoLift} pts (estimativa, não promessa).`,
  ];
  if (plan.hiddenActionsCount > 0) {
    body.push(`${plan.hiddenActionsCount} intervenção(ões) adicional(is) na fila não detalhada(s) neste recorte.`);
  }
  return { id: "sumario", title: "2. Sumário executivo", body };
}

function buildActionsSection(plan: EnrichedQuarterlyPlan): PlanDocumentSection {
  const body: string[] = [];
  for (const item of plan.actions) {
    body.push(...renderActionLines(item), "");
  }
  return { id: "acoes", title: "3. Ações e accountability", body };
}

function renderActionLines(item: EnrichedActionItem): string[] {
  const lines: string[] = [];
  lines.push(`#${item.rank} ${item.leverLabel}${item.isQuickWin ? " (vitória rápida)" : ""}`);
  if (item.description) lines.push(item.description);
  lines.push(
    `Responsável: ${item.owner ? item.owner.displayRole : "a definir"} | ` +
      `Prazo: ${item.dueOn ?? "a definir"} | ` +
      `Métrica: ${
        item.metric ? `${item.metric.label} (${item.metric.baseline}→${item.metric.target} ${item.metric.unit})` : "a definir"
      }`,
  );
  if (item.controlTier) lines.push(`Tier NR-01: ${TIER_LABEL[item.controlTier] ?? item.controlTier}`);
  if (item.cmo) lines.push(`Hipótese: ${item.cmo.context}, ${item.cmo.mechanism} — ${item.cmo.outcome}.`);
  lines.push(
    `Semanas ${item.startWeek}–${item.endWeek} (milestone S${item.milestoneWeek}) | ` +
      `Esforço: ${item.effort} | Lift esperado: +${item.expectedIvoLift}`,
  );
  return lines;
}

// ─── Serialização texto portável (base para export PDF na camada jsPDF) ─────

export function serializePlanDocumentText(doc: PlanDocument): string {
  const lines: string[] = [`Plano Vivo — ${doc.meta.orgName}`, doc.meta.cycleLabel, ""];
  for (const section of doc.sections) {
    lines.push(section.title, "");
    for (const line of section.body) lines.push(line);
    lines.push("");
  }
  lines.push("---", "", doc.legalNotice);
  return lines.join("\n");
}
