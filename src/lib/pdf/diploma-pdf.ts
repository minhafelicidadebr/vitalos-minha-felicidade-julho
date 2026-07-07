// Diploma Vivo — renderer PDF premium (I2, Academia Viva 2.0). Reusa o kit
// compartilhado (pdf-kit.ts): o diploma-engine produz o documento estruturado;
// aqui só se desenha. O disclaimer verbatim do pack SEMPRE aparece — o schema
// Ajv o exige e este renderer o recebe como parâmetro obrigatório.

import type { jsPDF } from "jspdf";
import { PremiumPdf, PDF_COLORS } from "./pdf-kit";
import type { DiplomaAward } from "@/engine/academia/diploma-engine";

export function renderDiplomaPdf(
  award: DiplomaAward,
  verificationCode: string,
  disclaimer: string,
): jsPDF {
  const doc = new PremiumPdf({
    kicker: award.credentialTitle,
    title: award.recipientName,
    subtitle: `${award.driverLabel} · ${award.pathTitle}`,
    documentId: verificationCode,
    generatedAtLabel: award.awardedOn,
  });

  doc.addGap(2);
  doc.addParagraph(
    `${award.issuerName} reconhece que ${award.recipientName} demonstrou aprendizagem ` +
      `aplicada no driver "${award.driverLabel}" — com trilha concluída, retenção comprovada ` +
      "por revisão espaçada e prática registrada. Este diploma certifica prática, não presença.",
    { size: 10.5, gapAfter: 6 },
  );

  doc.addSectionTitle("As três provas");
  doc.addKeyMetrics(
    award.criteria.map((c) => ({
      label: c.label,
      value: c.status === "cumprido" ? "Cumprida" : "Pendente",
      tint: c.status === "cumprido" ? PDF_COLORS.primaryTint : undefined,
    })),
  );
  for (const criterion of award.criteria) {
    doc.addParagraph(`${criterion.label}: ${criterion.value} (alvo: ${criterion.target}).`, {
      size: 8.5,
      color: PDF_COLORS.muted,
      gapAfter: 1.5,
    });
  }

  doc.addGap(4);
  doc.addSectionTitle("Verificação");
  doc.addParagraph(
    `Código de verificação: ${verificationCode}. Este código deriva do conteúdo da credencial — ` +
      "qualquer alteração no documento produz um código diferente. A verificação pública " +
      "online (com status de revogação) chega em versão futura; nesta versão o código " +
      "garante integridade por recomputação.",
    { size: 8.5, color: PDF_COLORS.muted, gapAfter: 4 },
  );

  doc.addCallout(disclaimer, "muted");

  return doc.finalize();
}

export function downloadDiplomaPdf(
  award: DiplomaAward,
  verificationCode: string,
  disclaimer: string,
  filename: string,
) {
  renderDiplomaPdf(award, verificationCode, disclaimer).save(filename);
}
