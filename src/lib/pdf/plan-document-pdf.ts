// Renderiza o Plano Vivo em PDF premium — client-side, sob demanda (import
// dinâmico de jsPDF/jspdf-autotable no chamador, nunca no bundle inicial da
// rota). Consome o MESMO EnrichedQuarterlyPlan/ActionLogSummary estruturado
// que já alimenta a UI (/plano-acao) — `doc` (PlanDocument) só fornece os
// textos que o engine já decidiu (identificação, aviso legal). Tabelas e
// badges via pdf-kit.ts.

import type { PlanDocument } from "@/engine/action-plan/plan-document-engine";
import type { EnrichedActionItem, EnrichedQuarterlyPlan } from "@/engine/action-plan/plan-enrichment-engine";
import type { ActionLogSummary } from "@/engine/action-plan/action-log-engine";
import type { ActionStatus } from "@/engine/action-plan/action-plan-engine";
import { PremiumPdf, PDF_STATUS_COLORS, badgeColumnHooks, type RgbTuple } from "./pdf-kit";

const TIER_LABEL: Record<string, string> = {
  eliminacao: "Eliminação",
  organizacao: "Organização",
  administrativa: "Administrativa",
  monitoramento: "Monitoramento",
};

const STATUS_LABEL: Record<ActionStatus, string> = {
  futuro: "Futuro",
  em_andamento: "Em andamento",
  concluido: "Concluído",
};

const STATUS_TONE: Record<ActionStatus, "positivo" | "atencao" | "neutro"> = {
  concluido: "positivo",
  em_andamento: "atencao",
  futuro: "neutro",
};
const LABEL_TO_TONE: Record<string, "positivo" | "atencao" | "neutro"> = Object.fromEntries(
  (Object.keys(STATUS_LABEL) as ActionStatus[]).map((k) => [STATUS_LABEL[k], STATUS_TONE[k]]),
);

function statusColorsFromLabel(label: string): { fg: RgbTuple; bg: RgbTuple } | null {
  const tone = LABEL_TO_TONE[label];
  return tone ? PDF_STATUS_COLORS[tone] : null;
}

function actionRow(item: EnrichedActionItem): string[] {
  return [
    `#${item.rank}`,
    item.leverLabel + (item.isQuickWin ? " ⚡" : ""),
    item.owner ? item.owner.displayRole : "A definir",
    item.dueOn ?? "A definir",
    item.metric
      ? `${item.metric.label} (${item.metric.baseline}→${item.metric.target} ${item.metric.unit})`
      : "A definir",
    item.controlTier ? TIER_LABEL[item.controlTier] ?? item.controlTier : "—",
    STATUS_LABEL[item.status],
  ];
}

export function renderPlanDocumentPdf(
  doc: PlanDocument,
  plan: EnrichedQuarterlyPlan,
  logSummary: ActionLogSummary,
): import("jspdf").jsPDF {
  const meta = doc.meta;
  const kit = new PremiumPdf({
    kicker: "Transformar · Arco da Prova",
    title: "Plano Vivo — Plano de Ação e Accountability",
    subtitle: `${meta.orgName} — ${meta.cycleLabel}`,
    documentId: meta.documentId,
    generatedAtLabel: new Date(meta.generatedAt).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }),
  });

  // ── 1. Identificação ──────────────────────────────────────────────────────
  kit.addSectionTitle("1. Identificação");
  kit.addBulletList([
    `Organização: ${meta.orgName}`,
    `Ciclo: ${meta.cycleLabel}`,
    `Documento: ${meta.documentId}`,
    `Temporada: ${plan.season.name} — semana ${plan.season.currentWeek} de ${plan.season.totalWeeks} (fase ${plan.season.phaseLabel})`,
  ]);

  // ── 2. Sumário executivo ─────────────────────────────────────────────────
  kit.addSectionTitle("2. Sumário executivo");
  kit.addKeyMetrics([
    { label: "Ações no plano", value: String(plan.actions.length) },
    { label: "Vitórias rápidas", value: String(plan.quickWinCount) },
    { label: "Completude §13", value: `${plan.gauge.pct}%` },
    { label: "Concluídas", value: `${logSummary.pctConcluded}%` },
  ]);
  kit.addProgressBar(
    `Completude do §13 (Guia MTE 2026 — dono, prazo e métrica) — ${plan.gauge.compliant} de ${plan.gauge.total}`,
    plan.gauge.pct,
  );
  kit.addProgressBar(
    `Ações concluídas — ${logSummary.concludedCount} de ${logSummary.totalActions}`,
    logSummary.pctConcluded,
  );
  kit.addParagraph(
    `Lift de IVO agendado: +${plan.scheduledIvoLift} pts (estimativa, não promessa).` +
      (plan.hiddenActionsCount > 0
        ? ` ${plan.hiddenActionsCount} intervenção(ões) adicional(is) na fila não detalhada(s) neste recorte.`
        : ""),
    { gapAfter: 4 },
  );

  // ── 3. Ações e accountability ────────────────────────────────────────────
  kit.addSectionTitle("3. Ações e accountability");
  kit.addTable({
    head: [["#", "Ação", "Responsável", "Prazo", "Métrica", "Tier NR-01", "Status"]],
    body: plan.actions.map(actionRow),
    columnStyles: {
      0: { cellWidth: 9, halign: "center" },
      1: { fontStyle: "bold", cellWidth: 34 },
      6: { halign: "center" },
    },
    ...badgeColumnHooks(6, statusColorsFromLabel),
  });

  const withCmo = plan.actions.filter((a) => a.cmo);
  if (withCmo.length > 0) {
    kit.addSectionTitle("4. Hipóteses de mudança (CMO)");
    kit.addParagraph(
      "Contexto → Mecanismo → Resultado esperado (Pawson & Tilley, 1997) — a hipótese declarada por trás " +
        "de cada intervenção, testável pela camada de evidência (Culture Lab).",
      { gapAfter: 3 },
    );
    kit.addBulletList(
      withCmo.map(
        (a) =>
          `${a.leverLabel}: no contexto de ${a.cmo!.context}, o mecanismo ${a.cmo!.mechanism} deve produzir ${a.cmo!.outcome}.`,
      ),
    );
  }

  kit.addSectionTitle(withCmo.length > 0 ? "5. Aviso legal" : "4. Aviso legal");
  kit.addCallout(doc.legalNotice, "muted");

  return kit.finalize();
}

export function downloadPlanDocumentPdf(
  doc: PlanDocument,
  plan: EnrichedQuarterlyPlan,
  logSummary: ActionLogSummary,
  filename: string,
): void {
  renderPlanDocumentPdf(doc, plan, logSummary).save(filename);
}
