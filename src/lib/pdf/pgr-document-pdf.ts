// Renderiza o dossiê GRO/PGR em PDF premium — client-side, sob demanda (import
// dinâmico de jsPDF/jspdf-autotable no chamador, nunca no bundle inicial da
// rota). Consome o MESMO PgrPlan estruturado que já alimenta a UI (/plano-nr1)
// — nunca reconstrói dado a partir do PgrDocument serializado — e usa
// `doc.meta`/`doc.legalNotice` só para os textos que o engine já decidiu
// (identificação, aviso legal). Tabelas e badges via pdf-kit.ts.

import type { PgrDocument } from "@/engine/nr1/pgr-document-engine";
import {
  DECISION_LABEL,
  HORIZON_LABEL,
  PROBABILITY_LABEL,
  RISK_LABEL,
  SEVERITY_LABEL,
  STATUS_LABEL,
  TIER_LABEL,
  type MeasureStatus,
  type PgrPlan,
  type RiskLevel,
} from "@/engine/nr1/pgr-engine";
import type { LongitudinalReading } from "@/engine/ai/capsule-longitudinal-engine";
import { PremiumPdf, PDF_RISK_COLORS, PDF_STATUS_COLORS, badgeColumnHooks, type RgbTuple } from "./pdf-kit";

const LABEL_TO_RISK_LEVEL: Record<string, RiskLevel> = {
  [RISK_LABEL.critico]: "critico",
  [RISK_LABEL.alto]: "alto",
  [RISK_LABEL.moderado]: "moderado",
  [RISK_LABEL.baixo]: "baixo",
};

const STATUS_TONE: Record<MeasureStatus, "positivo" | "atencao" | "neutro"> = {
  implementada: "positivo",
  em_andamento: "atencao",
  planejada: "neutro",
};
const LABEL_TO_STATUS_TONE: Record<string, "positivo" | "atencao" | "neutro"> = Object.fromEntries(
  (Object.keys(STATUS_LABEL) as MeasureStatus[]).map((k) => [STATUS_LABEL[k], STATUS_TONE[k]]),
);

function riskColorsFromLabel(label: string): { fg: RgbTuple; bg: RgbTuple } | null {
  const level = LABEL_TO_RISK_LEVEL[label];
  return level ? PDF_RISK_COLORS[level] : null;
}

function statusColorsFromLabel(label: string): { fg: RgbTuple; bg: RgbTuple } | null {
  const tone = LABEL_TO_STATUS_TONE[label];
  return tone ? PDF_STATUS_COLORS[tone] : null;
}

function ptBrDate(iso: string): string {
  try {
    return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function renderPgrDocumentPdf(doc: PgrDocument, plan: PgrPlan, reavaliacao?: LongitudinalReading): import("jspdf").jsPDF {
  const meta = doc.meta;
  const kit = new PremiumPdf({
    kicker: "Transformar · Domínio B · NR-01",
    title: "Programa de Gerenciamento de Riscos Psicossociais",
    subtitle: `${meta.orgName} — ${meta.sectorLabel}`,
    documentId: meta.documentId,
    generatedAtLabel: ptBrDate(plan.generatedAt),
  });

  // ── 1. Identificação ──────────────────────────────────────────────────────
  kit.addSectionTitle("1. Identificação");
  kit.addBulletList([
    `Organização: ${meta.orgName}`,
    `Setor / recorte: ${meta.sectorLabel}`,
    `Período de referência: ${meta.periodLabel}`,
    `Responsável técnico: ${meta.responsibleRole}`,
    `Documento: ${meta.documentId}`,
    `Horizonte do plano: ${plan.horizonWeeks} semanas (semana atual ${plan.currentWeek})`,
  ]);

  // ── 2. Sumário executivo (visual: métricas + barras) ────────────────────────
  kit.addSectionTitle("2. Sumário executivo");
  const coveragePct = Math.round(plan.summary.coverage * 100);
  kit.addKeyMetrics([
    { label: "Riscos priorizados", value: String(plan.summary.total) },
    { label: "Críticos / Altos", value: `${plan.summary.critico} / ${plan.summary.alto}` },
    { label: "Medidas de controle", value: String(plan.summary.measuresTotal) },
    { label: "Execução do ciclo", value: `${coveragePct}%` },
  ]);
  kit.addProgressBar(
    `Execução do ciclo — ${plan.summary.measuresImplemented} de ${plan.summary.measuresTotal} medidas implementadas`,
    coveragePct,
  );
  if (plan.summary.total > 0) {
    kit.addStackedBar([
      { label: "Crítico", value: plan.summary.critico, color: PDF_RISK_COLORS.critico.fg },
      { label: "Alto", value: plan.summary.alto, color: PDF_RISK_COLORS.alto.fg },
      { label: "Moderado", value: plan.summary.moderado, color: PDF_RISK_COLORS.moderado.fg },
      { label: "Baixo", value: plan.summary.baixo, color: PDF_RISK_COLORS.baixo.fg },
    ]);
  }
  kit.addParagraph(
    `Maior risco residual remanescente: ${RISK_LABEL[plan.summary.topResidual]}. ` +
      `Riscos que ainda exigem ação: ${plan.summary.requiresActionCount}; toleráveis: ${plan.summary.tolerableCount}.` +
      (plan.hiddenRiskCount > 0
        ? ` ${plan.hiddenRiskCount} driver(es) com exposição registrada não detalhados neste recorte.`
        : ""),
    { gapAfter: 4 },
  );

  // ── 3. Classificação de risco (critério de gestão NR-01 — transformação VitalOS) ────
  kit.addSectionTitle("3. Classificação de risco (critério de gestão NR-01 — transformação VitalOS)");
  kit.addParagraph(
    "A exposição por dimensão vem da bateria estruturada nas dimensões do COPSOQ II (ver o manifesto " +
      "do instrumento). A classificação abaixo — matriz probabilidade × severidade (Guia MTE 2026) — " +
      "é um CRITÉRIO DE GESTÃO DE RISCO NR-01: uma transformação VitalOS sobre essa exposição, não " +
      "uma métrica nativa nem parte oficial do instrumento COPSOQ II.",
    { gapAfter: 3 },
  );
  if (plan.risks.length === 0) {
    kit.addCallout("Nenhuma dimensão COPSOQ visível atingiu nível que exija plano de controle neste ciclo.");
  } else {
    kit.addTable({
      head: [["Fator de risco", "Camada", "Nível", "Prob.×Sev.", "Prazo legal", "Decisão", "Residual"]],
      body: plan.risks.map((r) => [
        r.label,
        r.macroLayer,
        RISK_LABEL[r.riskLevel],
        `${PROBABILITY_LABEL[r.probability]}×${SEVERITY_LABEL[r.severity]} (${r.riskScore})`,
        r.deadlineLabel,
        DECISION_LABEL[r.decision],
        RISK_LABEL[r.residual],
      ]),
      columnStyles: { 0: { fontStyle: "bold" }, 2: { halign: "center" }, 6: { halign: "center" } },
      ...badgeColumnHooks(2, riskColorsFromLabel),
    });

    // ── 4. Medidas de controle ────────────────────────────────────────────────
    kit.addSectionTitle("4. Medidas de controle (hierarquia NR-01)");
    kit.addParagraph(
      "Hierarquia de controle NR-01 — precedência: a fonte/organização do trabalho antes do indivíduo. " +
        "Medida que isola/culpa a pessoa nunca é a primeira linha.",
      { gapAfter: 3 },
    );
    const measureRows: string[][] = [];
    for (const r of plan.risks) {
      for (const m of r.measures) {
        measureRows.push([
          r.label,
          TIER_LABEL[m.tier],
          m.action,
          m.responsible,
          `${HORIZON_LABEL[m.horizon]} · sem. ${m.dueWeek}`,
          STATUS_LABEL[m.status],
        ]);
      }
    }
    if (measureRows.length > 0) {
      kit.addTable({
        head: [["Risco", "Tier", "Ação", "Responsável", "Prazo", "Status"]],
        body: measureRows,
        columnStyles: { 0: { fontStyle: "bold", cellWidth: 26 }, 2: { cellWidth: "auto" }, 5: { halign: "center" } },
        ...badgeColumnHooks(5, statusColorsFromLabel),
      });
    }
  }

  // ── 5. Reavaliação longitudinal (evidência de eficácia) ─────────────────────
  if (reavaliacao && reavaliacao.comparableDimensions > 0) {
    kit.addSectionTitle("5. Reavaliação longitudinal (evidência de eficácia)");
    const trendWord =
      reavaliacao.overallDirection === "melhorando"
        ? "redução agregada de exposição"
        : reavaliacao.overallDirection === "piorando"
          ? "aumento agregado de exposição"
          : "estabilidade agregada";
    kit.addParagraph(
      `Comparação entre ${reavaliacao.cycleCount} ciclos (${reavaliacao.cycleLabels.join(" → ")}): ${trendWord}. ` +
        `${reavaliacao.improvedCount} dimensões melhoraram, ${reavaliacao.worsenedCount} pioraram.`,
      { gapAfter: 3 },
    );
    kit.addTable({
      head: [["Dimensão", "1º ciclo", "Último ciclo", "Variação", "Tendência"]],
      body: reavaliacao.exposures.map((e) => [
        e.label,
        String(e.firstLoad),
        String(e.lastLoad),
        `${e.improvement > 0 ? "−" : e.improvement < 0 ? "+" : "±"}${Math.abs(e.improvement)}`,
        e.direction,
      ]),
      columnStyles: { 0: { fontStyle: "bold" } },
    });
    kit.addParagraph(reavaliacao.disclaimer, { size: 8, color: [111, 122, 114], gapAfter: 4 });
  }

  // ── 6. Conclusão ─────────────────────────────────────────────────────────────
  kit.addSectionTitle(reavaliacao ? "6. Conclusão e próximos passos" : "5. Conclusão e próximos passos");
  const verdict =
    plan.summary.requiresActionCount === 0
      ? "Todos os riscos inventariados estão em patamar tolerável com as medidas em curso."
      : `${plan.summary.requiresActionCount} risco(s) ainda exige(m) ação prioritária — ver prazos no inventário.`;
  kit.addParagraph(verdict, { gapAfter: 2 });
  kit.addParagraph(
    "O programa será reavaliado ao fim do próximo ciclo de medição (Matriz IFT), comparando a exposição " +
      "agregada para aferir a eficácia das medidas implementadas.",
    { gapAfter: 2 },
  );
  kit.addParagraph(plan.disclaimer, { size: 8, color: [111, 122, 114], gapAfter: 4 });

  // ── 7. Responsável técnico ────────────────────────────────────────────────
  kit.addSignatureBlock(meta.responsibleRole);

  kit.addCallout(doc.legalNotice, "muted");

  return kit.finalize();
}

export function downloadPgrDocumentPdf(
  doc: PgrDocument,
  plan: PgrPlan,
  reavaliacao: LongitudinalReading | undefined,
  filename: string,
): void {
  renderPgrDocumentPdf(doc, plan, reavaliacao).save(filename);
}
