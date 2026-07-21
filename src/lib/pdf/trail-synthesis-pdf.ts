// Renderiza a síntese técnica da trilha (LD-006) em PDF premium — client-side,
// sob demanda. O engine (trail-synthesis-engine.ts) estrutura o conteúdo e
// anexa os disclaimers; este arquivo só desenha. Risco R3_HIGH: os disclaimers
// de responsabilidade técnica aparecem em destaque (callout âmbar).

import type { TrailSynthesisDocument } from "@/engine/learning/trail-synthesis-engine";
import { PremiumPdf } from "./pdf-kit";

export function renderTrailSynthesisPdf(
  synthesis: TrailSynthesisDocument,
  meta: { documentId: string; generatedAtLabel: string },
): import("jspdf").jsPDF {
  const doc = new PremiumPdf({
    kicker: "Síntese técnica · trilha educativa",
    title: synthesis.title,
    subtitle: "Mecanismo, fontes e prática — para apoiar, não substituir",
    documentId: meta.documentId,
    generatedAtLabel: meta.generatedAtLabel,
  });

  doc.addGap(4);

  doc.addSectionTitle("Mecanismo");
  doc.addParagraph(synthesis.mechanism.label, { bold: true, gapAfter: 1 });
  doc.addParagraph(synthesis.mechanism.statement, { gapAfter: 4 });

  doc.addSectionTitle("Fontes (o que autorizam afirmar)");
  for (const source of synthesis.sources) {
    doc.addParagraph(source.citation, { bold: true, gapAfter: 1 });
    doc.addParagraph(source.note, { size: 9, gapAfter: 3 });
  }

  doc.addSectionTitle("O que a trilha praticou");
  doc.addBulletList([...synthesis.practiced]);

  doc.addSectionTitle("Limites e responsabilidade técnica");
  for (const disclaimer of synthesis.disclaimers) {
    doc.addCallout(disclaimer, "amber");
  }

  return doc.finalize();
}

export function downloadTrailSynthesisPdf(
  synthesis: TrailSynthesisDocument,
  meta: { documentId: string; generatedAtLabel: string },
  filename: string,
): void {
  renderTrailSynthesisPdf(synthesis, meta).save(filename);
}
