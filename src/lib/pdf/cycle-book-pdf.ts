// Renderiza o Livro do Ciclo em PDF premium — client-side, sob demanda. Primeira
// aplicação do kit em toda sua força: número variável de capítulos, cada um com
// tabela opcional, e uma manchete de abertura. Capítulos sem substância real
// (`hasContent: false`) são renderizados em tom discreto — nunca escondidos, nunca
// disfarçados de conteúdo real.

import type { CycleBookDocument } from "@/engine/evolucao/cycle-book-engine";
import { PremiumPdf, PDF_COLORS } from "./pdf-kit";

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

export function renderCycleBookPdf(book: CycleBookDocument): import("jspdf").jsPDF {
  const meta = book.meta;
  const kit = new PremiumPdf({
    kicker: "O Livro do Ciclo",
    title: `${meta.orgName} — ${meta.periodLabel}`,
    subtitle: meta.sectorLabel,
    documentId: meta.documentId,
    generatedAtLabel: ptBrDate(meta.generatedAt),
  });

  kit.addSectionTitle("O ano em uma frase");
  kit.addParagraph(book.headline, { size: 13, bold: true, color: PDF_COLORS.primary, gapAfter: 4 });

  for (const chapter of book.chapters) {
    kit.addSectionTitle(chapter.title);
    for (const line of chapter.body) {
      kit.addParagraph(line, chapter.hasContent ? {} : { color: PDF_COLORS.muted });
    }
    if (chapter.table) {
      kit.addTable({ head: [chapter.table.headers], body: chapter.table.rows });
    }
  }

  kit.addCallout(book.disclaimer, "muted");

  return kit.finalize();
}

export function downloadCycleBookPdf(book: CycleBookDocument, filename: string): void {
  renderCycleBookPdf(book).save(filename);
}
