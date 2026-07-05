// Renderiza um PlanDocument em PDF — client-side, sob demanda (import dinâmico
// de jsPDF no chamador, nunca no bundle inicial da rota). Texto vetorial puro:
// sem screenshot de DOM (html2canvas) — ver nota de decisão em
// engine/action-plan/plan-document-engine.ts sobre por que isso é suficiente
// para um documento predominantemente textual/tabular.

import { jsPDF } from "jspdf";
import type { PlanDocument } from "@/engine/action-plan/plan-document-engine";

const MARGIN_MM = 15;
const PAGE_WIDTH_MM = 210; // A4
const PAGE_HEIGHT_MM = 297;
const CONTENT_WIDTH_MM = PAGE_WIDTH_MM - MARGIN_MM * 2;
const LINE_HEIGHT_MM = 5.2;

export function renderPlanDocumentPdf(doc: PlanDocument): jsPDF {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN_MM;

  function ensureSpace(next: number) {
    if (y + next > PAGE_HEIGHT_MM - MARGIN_MM) {
      pdf.addPage();
      y = MARGIN_MM;
    }
  }

  function writeLine(text: string, opts: { size?: number; bold?: boolean; gapAfter?: number } = {}) {
    const size = opts.size ?? 10;
    pdf.setFontSize(size);
    pdf.setFont("helvetica", opts.bold ? "bold" : "normal");
    const wrapped = pdf.splitTextToSize(text, CONTENT_WIDTH_MM) as string[];
    for (const line of wrapped) {
      ensureSpace(LINE_HEIGHT_MM);
      pdf.text(line, MARGIN_MM, y);
      y += LINE_HEIGHT_MM;
    }
    y += opts.gapAfter ?? 0;
  }

  writeLine(`Plano Vivo — ${doc.meta.orgName}`, { size: 16, bold: true, gapAfter: 1 });
  writeLine(doc.meta.cycleLabel, { size: 10, gapAfter: 3 });

  for (const section of doc.sections) {
    ensureSpace(10);
    writeLine(section.title, { size: 12, bold: true, gapAfter: 1 });
    for (const line of section.body) {
      if (!line) {
        y += LINE_HEIGHT_MM / 2;
        continue;
      }
      writeLine(line, { size: 9.5 });
    }
    y += 3;
  }

  ensureSpace(14);
  pdf.setDrawColor(180);
  pdf.line(MARGIN_MM, y, PAGE_WIDTH_MM - MARGIN_MM, y);
  y += 4;
  writeLine(doc.legalNotice, { size: 7.5 });

  return pdf;
}

export function downloadPlanDocumentPdf(doc: PlanDocument, filename: string): void {
  renderPlanDocumentPdf(doc).save(filename);
}
