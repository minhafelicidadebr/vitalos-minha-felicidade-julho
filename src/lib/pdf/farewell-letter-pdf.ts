// Renderiza a carta-poema (LD-007) em PDF premium — client-side, sob demanda
// (jsPDF importado dinamicamente pelo chamador, nunca no bundle inicial).
//
// A carta é expressão artístico-educacional: o engine
// (farewell-letter-engine.ts) compõe o texto de forma determinística; este
// arquivo só desenha. Texto vetorial selecionável, disclaimer explícito.

import type { ComposedLetter } from "@/engine/learning/farewell-letter-engine";
import { PremiumPdf } from "./pdf-kit";

export function renderFarewellLetterPdf(
  letter: ComposedLetter,
  meta: { documentId: string; generatedAtLabel: string },
): import("jspdf").jsPDF {
  const doc = new PremiumPdf({
    kicker: "Carta pedagógica · Voz Segura",
    title: letter.title,
    subtitle: "Uma lembrança da sua jornada de liderança",
    documentId: meta.documentId,
    generatedAtLabel: meta.generatedAtLabel,
  });

  doc.addGap(4);
  doc.addParagraph(letter.greeting, { size: 11, bold: true, gapAfter: 5 });

  // Cada estrofe é um bloco; as quebras internas (\n) viram versos separados.
  for (const stanza of letter.stanzas) {
    for (const verse of stanza.split("\n")) {
      doc.addParagraph(verse, { size: 10.5, gapAfter: 0 });
    }
    doc.addGap(4);
  }

  for (const verse of letter.closingLine.split("\n")) {
    doc.addParagraph(verse, { size: 10.5, gapAfter: 0 });
  }
  doc.addGap(3);
  doc.addParagraph(letter.signature, { size: 10, bold: true, gapAfter: 6 });

  doc.addCallout(letter.disclaimer, "muted");

  return doc.finalize();
}

export function downloadFarewellLetterPdf(
  letter: ComposedLetter,
  meta: { documentId: string; generatedAtLabel: string },
  filename: string,
): void {
  renderFarewellLetterPdf(letter, meta).save(filename);
}
