import {
  coverageLabels,
  noticePrivacy,
  noticePurpose,
  reviewLabels,
  sourceLabels,
  type PrepView,
} from "@/domain/survey/q1-preparation";
import { PremiumPdf } from "./pdf-kit";

export type PreparationDocument = "comunicado" | "memoria";
const dateLabel = (iso: string) => iso.split("-").reverse().join("/");

export function renderPreparationPdf(view: PrepView, kind: PreparationDocument) {
  const { notice, controls } = view.state;
  if ((kind === "comunicado" && !notice) || (kind === "memoria" && !controls.length))
    throw new Error("Documento indisponível nesta etapa.");
  const kit = new PremiumPdf({
    kicker: "VitalOS · Q1 · Preparação",
    title: kind === "comunicado" ? "Comunicado aos trabalhadores" : "Memória de preparação",
    subtitle:
      kind === "comunicado" ? "Orientação antes da coleta" : "Registro para revisão técnica",
    documentId: view.cycle + " · revisão " + view.revision,
    generatedAtLabel: new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(
      new Date(),
    ),
  });
  kit.addParagraph(view.organization, { bold: true, size: 12, gapAfter: 5 });
  if (kind === "comunicado" && notice) {
    kit.addSectionTitle("Por que estamos preparando esta escuta");
    kit.addParagraph(noticePurpose, { gapAfter: 5 });
    kit.addSectionTitle("Como participar desta preparação");
    kit.addParagraph(noticePrivacy, { gapAfter: 5 });
    kit.addSectionTitle("Onde acompanhar");
    kit.addParagraph("Dúvidas sobre o processo", { bold: true });
    kit.addParagraph(notice.contact, { gapAfter: 4 });
    kit.addParagraph("Canal previsto para a devolutiva coletiva", { bold: true });
    kit.addParagraph(notice.returnChannel, { gapAfter: 5 });
    kit.addParagraph("Texto de preparação revisado pelo RH · modelo " + notice.template, {
      size: 8,
    });
  } else {
    kit.addCallout(
      "Pré-coleta. Esta memória registra declarações, verificações e decisões operacionais para revisão técnica. A classificação de riscos e a avaliação de eficácia exigem evidências próprias.",
    );
    for (const [index, c] of controls.entries()) {
      kit.ensureSpace(30);
      kit.addSectionTitle("Controle " + (index + 1));
      kit.addParagraph(c.label, { bold: true });
      kit.addParagraph("Recorte · " + c.scope);
      const v = c.verification,
        m = c.measure;
      if (!v) kit.addParagraph("Declarado pelo RH · cobertura a conferir.");
      if (v) {
        kit.addParagraph(coverageLabels[v.finding.coverage], { bold: true });
        kit.addParagraph(sourceLabels[v.source] + " · " + v.evidence);
        if ("gap" in v.finding) kit.addParagraph("Lacuna observada · " + v.finding.gap);
      }
      if (m) {
        kit.addParagraph("Medida planejada · " + m.action, { bold: true });
        kit.addParagraph("Função responsável · " + m.owner + " | Prazo · " + dateLabel(m.due));
        kit.addParagraph("Indicador de execução · " + m.indicator);
      }
      for (const r of c.reviews ?? []) {
        kit.addParagraph(reviewLabels[r.result.outcome] + " · " + r.evidence);
        if (r.result.outcome === "revisit")
          kit.addParagraph("Próxima revisão · " + dateLabel(r.result.nextDate));
      }
      kit.addGap(3);
    }
  }
  return kit.finalize();
}
