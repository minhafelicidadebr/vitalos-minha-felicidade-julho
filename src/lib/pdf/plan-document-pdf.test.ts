import { describe, expect, test } from "bun:test";
import { renderPlanDocumentPdf } from "./plan-document-pdf";
import { buildPlanDocument } from "@/engine/action-plan/plan-document-engine";
import type { EnrichedActionItem, EnrichedQuarterlyPlan } from "@/engine/action-plan/plan-enrichment-engine";
import type { ActionLogSummary } from "@/engine/action-plan/action-log-engine";

function samplePlan(): EnrichedQuarterlyPlan {
  const item: EnrichedActionItem = {
    rank: 1,
    leverId: "lever-1",
    leverLabel: "Gestão de energia e carga",
    description: "Pausas reais e redistribuição de carga.",
    effort: "medio",
    expectedIvoLift: 4,
    isQuickWin: true,
    amb: { id: "amb-1", name: "Guardiões da Energia", emoji: "⚡" },
    lensId: "eu",
    lensLabel: "EU",
    lensColor: "#123456",
    esgCodes: ["ESRS S1-11"],
    startWeek: 1,
    endWeek: 7,
    milestoneWeek: 4,
    status: "em_andamento",
    weeksBudget: 7,
    controlTier: "organizacao",
    owner: { membershipId: "mem-1", displayRole: "Gestora de RH" },
    dueOn: "2026-08-14",
    metric: { label: "Horas extras/semana", baseline: 6, target: 3, unit: "h" },
    cmo: { context: "no contexto atual", mechanism: "ativa o mecanismo", outcome: "esperamos mover a métrica" },
    compliant: true,
    missing: [],
  };
  return {
    season: { name: "Fundação Segura", color: "#0B3D2E", totalWeeks: 13, currentWeek: 8, phaseLabel: "Transformar" },
    actions: [item],
    quickWinCount: 1,
    scheduledIvoLift: 4,
    hiddenActionsCount: 0,
    disclaimer: "Plano operacional orientativo.",
    gauge: { total: 1, compliant: 1, pct: 100, missingByField: { owner: 0, dueOn: 0, metric: 0 } },
  };
}

const LOG_SUMMARY: ActionLogSummary = {
  totalActions: 1,
  concludedCount: 0,
  pctConcluded: 0,
  evidenceCountByAction: {},
  maintenanceByAction: {},
};

describe("renderPlanDocumentPdf", () => {
  test("produz um jsPDF válido com pelo menos uma página", () => {
    const doc = buildPlanDocument(
      samplePlan(),
      { orgName: "Org Teste", cycleLabel: "2026-t3", documentId: "doc-1", generatedAt: "2026-07-05T00:00:00.000Z" },
      LOG_SUMMARY,
    );
    const pdf = renderPlanDocumentPdf(doc, samplePlan(), LOG_SUMMARY);
    expect(pdf.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });

  test("gera bytes de saída não vazios", () => {
    const doc = buildPlanDocument(
      samplePlan(),
      { orgName: "Org Teste", cycleLabel: "2026-t3", documentId: "doc-1", generatedAt: "2026-07-05T00:00:00.000Z" },
      LOG_SUMMARY,
    );
    const pdf = renderPlanDocumentPdf(doc, samplePlan(), LOG_SUMMARY);
    const output = pdf.output("datauristring");
    expect(output.startsWith("data:application/pdf")).toBe(true);
    expect(output.length).toBeGreaterThan(100);
  });

  test("quebra em múltiplas páginas quando há muitas ações", () => {
    const base = samplePlan();
    const manyActions = Array.from({ length: 20 }, (_, i) => ({
      ...base.actions[0]!,
      rank: i + 1,
      leverId: `lever-${i}`,
      leverLabel: `Ação número ${i + 1} com um título razoavelmente longo para ocupar espaço`,
    }));
    const bigPlan = { ...base, actions: manyActions };
    const doc = buildPlanDocument(
      bigPlan,
      { orgName: "Org Teste", cycleLabel: "2026-t3", documentId: "doc-1", generatedAt: "2026-07-05T00:00:00.000Z" },
      LOG_SUMMARY,
    );
    const pdf = renderPlanDocumentPdf(doc, bigPlan, LOG_SUMMARY);
    expect(pdf.getNumberOfPages()).toBeGreaterThan(1);
  });
});
