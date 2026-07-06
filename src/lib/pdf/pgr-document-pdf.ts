// Renderiza um PgrDocument (dossiê GRO/PGR) em PDF — client-side, sob demanda
// (import dinâmico de jsPDF no chamador, nunca no bundle inicial da rota).
// Texto vetorial puro, mesmo idioma de plan-document-pdf.ts (S6.5): sem
// screenshot de DOM, documento predominantemente textual/tabular.

import { jsPDF } from "jspdf";
import type { PgrDocument } from "@/engine/nr1/pgr-document-engine";

const MARGIN_MM = 15;
const PAGE_WIDTH_MM = 210; // A4
const PAGE_HEIGHT_MM = 297;
const CONTENT_WIDTH_MM = PAGE_WIDTH_MM - MARGIN_MM * 2;
const LINE_HEIGHT_MM = 5.2;

export function renderPgrDocumentPdf(doc: PgrDocument): jsPDF {
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

  writeLine(`Programa de Gerenciamento de Riscos Psicossociais (NR-01)`, { size: 15, bold: true, gapAfter: 1 });
  writeLine(`${doc.meta.orgName} — ${doc.meta.sectorLabel}`, { size: 10, gapAfter: 3 });

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

export function downloadPgrDocumentPdf(doc: PgrDocument, filename: string): void {
  renderPgrDocumentPdf(doc).save(filename);
}
