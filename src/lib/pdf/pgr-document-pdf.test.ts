import { describe, expect, test } from "bun:test";
import { renderPgrDocumentPdf } from "./pgr-document-pdf";
import { buildPgrPlan } from "@/engine/nr1/pgr-engine";
import { buildPgrDocument, type PgrDocumentMeta } from "@/engine/nr1/pgr-document-engine";
import { NR1_CROSSWALK, DEMO_COPSOQ_EXPOSURE } from "@/mocks/nr1-crosswalk-mock";
import { PGR_MEASURES } from "@/mocks/pgr-nr1-mock";
import { buildLongitudinalReading } from "@/engine/ai/capsule-longitudinal-engine";
import { getCapsuleHistory } from "@/mocks/capsule-history-mock";

const META: PgrDocumentMeta = {
  orgName: "Org Teste",
  sectorLabel: "Empresa",
  periodLabel: "T3 2026 · ciclo COPSOQ/NR-1",
  responsibleRole: "SESMT / Profissional legalmente habilitado",
  documentId: "PGR-PSI-TESTE-2026-06-23",
};

function samplePlan() {
  return buildPgrPlan({
    registry: NR1_CROSSWALK,
    exposures: DEMO_COPSOQ_EXPOSURE,
    measures: PGR_MEASURES,
    generatedAt: "2026-06-23",
    currentWeek: 6,
    horizonWeeks: 13,
    topRisks: 5,
  });
}

describe("renderPgrDocumentPdf", () => {
  test("produz um jsPDF válido com pelo menos uma página", () => {
    const plan = samplePlan();
    const doc = buildPgrDocument(plan, META);
    const pdf = renderPgrDocumentPdf(doc, plan);
    expect(pdf.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });

  test("gera bytes de saída não vazios", () => {
    const plan = samplePlan();
    const doc = buildPgrDocument(plan, META);
    const pdf = renderPgrDocumentPdf(doc, plan);
    const output = pdf.output("datauristring");
    expect(output.startsWith("data:application/pdf")).toBe(true);
    expect(output.length).toBeGreaterThan(100);
  });

  test("plano sem riscos (exposição vazia) ainda produz um documento válido", () => {
    const plan = buildPgrPlan({
      registry: NR1_CROSSWALK,
      exposures: [],
      measures: PGR_MEASURES,
      generatedAt: "2026-06-23",
      currentWeek: 6,
      horizonWeeks: 13,
      topRisks: 5,
    });
    const doc = buildPgrDocument(plan, META);
    const pdf = renderPgrDocumentPdf(doc, plan);
    expect(pdf.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });

  test("com reavaliação longitudinal (≥2 ciclos), inclui a seção sem lançar erro", () => {
    const plan = samplePlan();
    const doc = buildPgrDocument(plan, META);
    const history = getCapsuleHistory("enterprise", "COPSOQ");
    const longitudinal = buildLongitudinalReading({ capsules: history });
    const reavaliacao = longitudinal.ok ? longitudinal.reading : undefined;
    expect(reavaliacao).toBeDefined();
    const pdf = renderPgrDocumentPdf(doc, plan, reavaliacao);
    expect(pdf.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });
});
