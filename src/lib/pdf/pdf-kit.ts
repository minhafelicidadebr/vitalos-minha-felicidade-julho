// Kit premium de geração de PDF — a camada de apresentação compartilhada por
// TODOS os documentos exportáveis do VitalOS (Plano Vivo, dossiê GRO/PGR, e
// qualquer export futuro). Os motores (plan-document-engine.ts,
// pgr-document-engine.ts) continuam 100% agnósticos de PDF — só produzem
// documentos estruturados determinísticos; este kit só sabe desenhar, nunca
// decide o quê. Paleta e tipografia espelham os tokens de marca (CLAUDE.md):
// verde profundo #0B3D2E, dourado #C9A227, "premium corporativo humano".
//
// DECISÃO DE ARQUITETURA (ToT — ver memória do projeto): 4 ramos avaliados —
// (A) tudo desenhado à mão, zero dependência nova; (B) jspdf-autotable só
// para tabelas + resto à mão; (C) html2canvas/raster; (D) B + mini-gráficos
// vetoriais desenhados à mão. Vencedor: D. `jspdf-autotable` resolve a parte
// genuinamente arriscada de fazer à mão (paginação multi-página de tabelas
// longas) — é peer-compatível com jsPDF ^4 e mantido ativamente. Capa,
// cabeçalho corrente, rodapé, badges, barra de progresso e gráfico de barra
// empilhada são desenhados à mão com primitivos do jsPDF para controle total
// da identidade visual. Texto vetorial puro em toda parte — nunca screenshot
// de DOM (mesma doutrina já registrada em plan-document-engine.ts: o
// documento é predominantemente textual/tabular, e um PGR/dossiê legal
// precisa de texto selecionável/copiável, não de uma imagem rasterizada).

import { jsPDF } from "jspdf";
import autoTable, { type RowInput, type UserOptions } from "jspdf-autotable";

export type RgbTuple = readonly [number, number, number];

export const PDF_PAGE = {
  widthMm: 210,
  heightMm: 297,
  marginMm: 16,
  footerReserveMm: 14,
} as const;

/** Paleta de marca (CLAUDE.md) + semântica de risco (mesmos tons das classes Tailwind da UI). */
export const PDF_COLORS = {
  primary: [11, 61, 46] as RgbTuple, // #0B3D2E verde profundo
  primaryTint: [230, 238, 234] as RgbTuple,
  accent: [201, 162, 39] as RgbTuple, // #C9A227 dourado
  accentTint: [250, 244, 227] as RgbTuple,
  ink: [28, 42, 36] as RgbTuple, // #1C2A24
  muted: [111, 122, 114] as RgbTuple,
  border: [222, 224, 216] as RgbTuple,
  surface: [248, 247, 244] as RgbTuple, // #F8F7F4
  white: [255, 255, 255] as RgbTuple,
  bandSubtitle: [214, 226, 219] as RgbTuple,
} as const;

/** Mesmos tons das classes RISK_TINT/RISK_BAR da UI (Tailwind red/orange/amber/emerald). */
export const PDF_RISK_COLORS: Record<
  "critico" | "alto" | "moderado" | "baixo",
  { fg: RgbTuple; bg: RgbTuple }
> = {
  critico: { fg: [185, 28, 28], bg: [254, 242, 242] },
  alto: { fg: [194, 65, 12], bg: [255, 247, 237] },
  moderado: { fg: [180, 83, 9], bg: [255, 251, 235] },
  baixo: { fg: [4, 120, 87], bg: [236, 253, 245] },
};

/** Tons neutros para status genéricos (implementada/em andamento/planejada), mesma leitura visual. */
export const PDF_STATUS_COLORS: Record<"positivo" | "atencao" | "neutro", { fg: RgbTuple; bg: RgbTuple }> = {
  positivo: { fg: [4, 120, 87], bg: [236, 253, 245] },
  atencao: { fg: [180, 83, 9], bg: [255, 251, 235] },
  neutro: { fg: [111, 122, 114], bg: [241, 240, 236] },
};

export interface PdfDocumentMeta {
  /** Rótulo curto em caixa alta acima do título, ex.: "PLANO VIVO" ou "PGR PSICOSSOCIAL · NR-01". */
  kicker: string;
  title: string;
  subtitle: string;
  documentId: string;
  generatedAtLabel: string;
}

function setFill(pdf: jsPDF, c: RgbTuple) {
  pdf.setFillColor(c[0], c[1], c[2]);
}
function setDraw(pdf: jsPDF, c: RgbTuple) {
  pdf.setDrawColor(c[0], c[1], c[2]);
}
function setText(pdf: jsPDF, c: RgbTuple) {
  pdf.setTextColor(c[0], c[1], c[2]);
}

/**
 * Construtor procedural de um documento premium: encapsula o jsPDF, o cursor
 * vertical e o cabeçalho/rodapé consistentes. Cada método avança o cursor e
 * quebra página automaticamente quando necessário.
 */
export class PremiumPdf {
  readonly pdf: jsPDF;
  private y: number;
  private readonly meta: PdfDocumentMeta;
  readonly contentWidth: number;
  readonly marginMm = PDF_PAGE.marginMm;

  constructor(meta: PdfDocumentMeta) {
    this.pdf = new jsPDF({ unit: "mm", format: "a4" });
    this.meta = meta;
    this.contentWidth = PDF_PAGE.widthMm - PDF_PAGE.marginMm * 2;
    this.y = 0;
    this.drawCoverBand();
  }

  private drawCoverBand() {
    const pdf = this.pdf;
    const bandHeight = 46;
    setFill(pdf, PDF_COLORS.primary);
    pdf.rect(0, 0, PDF_PAGE.widthMm, bandHeight, "F");
    setFill(pdf, PDF_COLORS.accent);
    pdf.rect(0, bandHeight, PDF_PAGE.widthMm, 1.4, "F");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.5);
    setText(pdf, PDF_COLORS.accent);
    pdf.text(this.meta.kicker.toUpperCase(), this.marginMm, 15);

    pdf.setFont("times", "bold");
    pdf.setFontSize(21);
    setText(pdf, PDF_COLORS.white);
    const titleLines = pdf.splitTextToSize(this.meta.title, this.contentWidth) as string[];
    let ty = 25;
    for (const line of titleLines.slice(0, 2)) {
      pdf.text(line, this.marginMm, ty);
      ty += 8;
    }

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9.5);
    setText(pdf, PDF_COLORS.bandSubtitle);
    pdf.text(this.meta.subtitle, this.marginMm, bandHeight - 6);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    const rightLabel = `${this.meta.documentId} · ${this.meta.generatedAtLabel}`;
    pdf.text(rightLabel, PDF_PAGE.widthMm - this.marginMm, bandHeight - 6, { align: "right" });

    setText(pdf, PDF_COLORS.ink);
    this.y = bandHeight + 12;
  }

  /** Cabeçalho corrente das páginas 2+ — mais discreto que a capa. */
  private drawRunningHeader() {
    const pdf = this.pdf;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    setText(pdf, PDF_COLORS.primary);
    pdf.text("4 LENTES VITALOS™", this.marginMm, 12);

    pdf.setFont("helvetica", "normal");
    setText(pdf, PDF_COLORS.muted);
    pdf.text(this.meta.title, PDF_PAGE.widthMm - this.marginMm, 12, { align: "right" });

    setDraw(pdf, PDF_COLORS.border);
    pdf.setLineWidth(0.3);
    pdf.line(this.marginMm, 15, PDF_PAGE.widthMm - this.marginMm, 15);

    setText(pdf, PDF_COLORS.ink);
    this.y = 22;
  }

  private newPage() {
    this.pdf.addPage();
    this.drawRunningHeader();
  }

  /** Garante espaço vertical restante na página; quebra para uma nova quando necessário. */
  ensureSpace(next: number) {
    if (this.y + next > PDF_PAGE.heightMm - PDF_PAGE.marginMm - PDF_PAGE.footerReserveMm) {
      this.newPage();
    }
  }

  currentY(): number {
    return this.y;
  }

  addGap(mm: number) {
    this.y += mm;
  }

  addSectionTitle(text: string) {
    this.ensureSpace(11);
    const pdf = this.pdf;
    setFill(pdf, PDF_COLORS.accent);
    pdf.rect(this.marginMm, this.y - 3.2, 3, 3, "F");
    pdf.setFont("times", "bold");
    pdf.setFontSize(13);
    setText(pdf, PDF_COLORS.ink);
    pdf.text(text, this.marginMm + 5.5, this.y);
    this.y += 2.5;
    setDraw(pdf, PDF_COLORS.border);
    pdf.setLineWidth(0.25);
    pdf.line(this.marginMm, this.y, PDF_PAGE.widthMm - this.marginMm, this.y);
    this.y += 6;
  }

  addParagraph(text: string, opts: { size?: number; bold?: boolean; color?: RgbTuple; gapAfter?: number } = {}) {
    const pdf = this.pdf;
    const size = opts.size ?? 9.5;
    pdf.setFont("helvetica", opts.bold ? "bold" : "normal");
    pdf.setFontSize(size);
    setText(pdf, opts.color ?? PDF_COLORS.ink);
    const lineHeight = size * 0.5;
    const lines = pdf.splitTextToSize(text, this.contentWidth) as string[];
    for (const line of lines) {
      this.ensureSpace(lineHeight);
      pdf.text(line, this.marginMm, this.y);
      this.y += lineHeight;
    }
    this.y += opts.gapAfter ?? 2;
    setText(pdf, PDF_COLORS.ink);
  }

  addBulletList(items: string[], opts: { size?: number } = {}) {
    const pdf = this.pdf;
    const size = opts.size ?? 9.5;
    const lineHeight = size * 0.5;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(size);
    setText(pdf, PDF_COLORS.ink);
    for (const item of items) {
      const lines = pdf.splitTextToSize(item, this.contentWidth - 5) as string[];
      lines.forEach((line, i) => {
        this.ensureSpace(lineHeight);
        if (i === 0) {
          setFill(pdf, PDF_COLORS.accent);
          pdf.circle(this.marginMm + 1, this.y - 1.2, 0.7, "F");
        }
        pdf.text(line, this.marginMm + 5, this.y);
        this.y += lineHeight;
      });
    }
    this.y += 2;
  }

  /** Cartões de estatística em linha (equivalente ao SummaryStat da web) — até 4 por linha. */
  addKeyMetrics(items: { label: string; value: string; tint?: RgbTuple }[]) {
    const pdf = this.pdf;
    const gap = 4;
    const boxH = 20;
    const boxW = (this.contentWidth - gap * (items.length - 1)) / items.length;
    this.ensureSpace(boxH + 4);
    items.forEach((item, i) => {
      const x = this.marginMm + i * (boxW + gap);
      setDraw(pdf, PDF_COLORS.border);
      pdf.setLineWidth(0.3);
      pdf.roundedRect(x, this.y, boxW, boxH, 2, 2, "S");
      pdf.setFont("times", "bold");
      pdf.setFontSize(15);
      setText(pdf, item.tint ?? PDF_COLORS.primary);
      pdf.text(item.value, x + 3.5, this.y + 10);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.5);
      setText(pdf, PDF_COLORS.muted);
      const labelLines = pdf.splitTextToSize(item.label, boxW - 7) as string[];
      pdf.text(labelLines.slice(0, 2), x + 3.5, this.y + 15);
    });
    setText(pdf, PDF_COLORS.ink);
    this.y += boxH + 6;
  }

  addProgressBar(label: string, pct: number, opts: { valueLabel?: string } = {}) {
    const pdf = this.pdf;
    const clamped = Math.max(0, Math.min(100, pct));
    this.ensureSpace(11);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    setText(pdf, PDF_COLORS.muted);
    pdf.text(label, this.marginMm, this.y);
    pdf.setFont("helvetica", "bold");
    setText(pdf, PDF_COLORS.ink);
    pdf.text(opts.valueLabel ?? `${clamped}%`, PDF_PAGE.widthMm - this.marginMm, this.y, { align: "right" });
    this.y += 2.5;
    const barH = 3;
    setFill(pdf, PDF_COLORS.primaryTint);
    pdf.roundedRect(this.marginMm, this.y, this.contentWidth, barH, 1.5, 1.5, "F");
    if (clamped > 0) {
      setFill(pdf, PDF_COLORS.primary);
      pdf.roundedRect(this.marginMm, this.y, (this.contentWidth * clamped) / 100, barH, 1.5, 1.5, "F");
    }
    this.y += barH + 6;
  }

  /** Barra horizontal empilhada + legenda — leitura de distribuição (ex.: riscos por nível). */
  addStackedBar(segments: { label: string; value: number; color: RgbTuple }[]) {
    const pdf = this.pdf;
    const total = segments.reduce((s, seg) => s + seg.value, 0);
    this.ensureSpace(16);
    const barH = 6;
    setFill(pdf, PDF_COLORS.primaryTint);
    pdf.roundedRect(this.marginMm, this.y, this.contentWidth, barH, 2, 2, "F");
    if (total > 0) {
      let x = this.marginMm;
      segments.forEach((seg) => {
        const w = (this.contentWidth * seg.value) / total;
        if (w > 0) {
          setFill(pdf, seg.color);
          pdf.rect(x, this.y, w, barH, "F");
        }
        x += w;
      });
    }
    this.y += barH + 4;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    let lx = this.marginMm;
    for (const seg of segments) {
      setFill(pdf, seg.color);
      pdf.rect(lx, this.y - 2.4, 2.4, 2.4, "F");
      setText(pdf, PDF_COLORS.muted);
      const label = `${seg.label} (${seg.value})`;
      pdf.text(label, lx + 3.5, this.y);
      lx += pdf.getTextWidth(label) + 10;
    }
    setText(pdf, PDF_COLORS.ink);
    this.y += 7;
  }

  /** Tabela temada (jspdf-autotable) — paginação e cabeçalho repetido tratados pela biblioteca. */
  addTable(options: Pick<UserOptions, "head" | "body" | "columnStyles" | "didParseCell" | "willDrawCell">) {
    autoTable(this.pdf, {
      startY: this.y,
      margin: { left: this.marginMm, right: this.marginMm, bottom: PDF_PAGE.footerReserveMm },
      theme: "plain",
      styles: {
        font: "helvetica",
        fontSize: 8.5,
        textColor: PDF_COLORS.ink as unknown as [number, number, number],
        lineColor: PDF_COLORS.border as unknown as [number, number, number],
        lineWidth: 0.15,
        cellPadding: 2.2,
        valign: "middle",
      },
      headStyles: {
        fillColor: PDF_COLORS.primary as unknown as [number, number, number],
        textColor: PDF_COLORS.white as unknown as [number, number, number],
        fontStyle: "bold",
        fontSize: 8.5,
      },
      alternateRowStyles: { fillColor: PDF_COLORS.surface as unknown as [number, number, number] },
      didDrawPage: () => this.drawRunningHeader(),
      ...options,
    });
    this.y = (this.pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? this.y;
    this.y += 6;
  }

  addCallout(text: string, tone: "muted" | "amber" = "muted") {
    const pdf = this.pdf;
    const size = 8;
    const lineHeight = size * 0.5;
    const lines = pdf.splitTextToSize(text, this.contentWidth - 8) as string[];
    const boxH = lines.length * lineHeight + 6;
    this.ensureSpace(boxH + 3);
    const bg = tone === "amber" ? ([255, 251, 235] as RgbTuple) : PDF_COLORS.surface;
    const border = tone === "amber" ? ([252, 211, 77] as RgbTuple) : PDF_COLORS.border;
    setFill(pdf, bg);
    setDraw(pdf, border);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(this.marginMm, this.y, this.contentWidth, boxH, 2, 2, "FD");
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(size);
    setText(pdf, tone === "amber" ? [146, 64, 14] : PDF_COLORS.muted);
    let ty = this.y + 4.5;
    for (const line of lines) {
      pdf.text(line, this.marginMm + 4, ty);
      ty += lineHeight;
    }
    setText(pdf, PDF_COLORS.ink);
    this.y += boxH + 5;
  }

  addSignatureBlock(role: string) {
    this.addSectionTitle("Responsável técnico");
    this.addParagraph(
      "Este documento organiza a evidência para apoiar o programa. Sua validade depende de revisão e " +
        "assinatura do profissional legalmente habilitado.",
      { gapAfter: 6 },
    );
    const pdf = this.pdf;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    setText(pdf, PDF_COLORS.muted);
    pdf.text(`Função responsável: ${role}`, this.marginMm, this.y);
    this.y += 14;
    setDraw(pdf, PDF_COLORS.ink);
    pdf.setLineWidth(0.25);
    pdf.line(this.marginMm, this.y, this.marginMm + 80, this.y);
    pdf.line(this.marginMm + 95, this.y, this.marginMm + 140, this.y);
    pdf.setFontSize(7.5);
    pdf.text("Nome / Registro", this.marginMm, this.y + 4);
    pdf.text("Data", this.marginMm + 95, this.y + 4);
    this.y += 14;
    pdf.line(this.marginMm, this.y, this.marginMm + 140, this.y);
    pdf.text("Assinatura", this.marginMm, this.y + 4);
    this.y += 10;
    setText(pdf, PDF_COLORS.ink);
  }

  /** Stampa o rodapé (paginação real) em TODAS as páginas — chamado por último. */
  finalize(): jsPDF {
    const pdf = this.pdf;
    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      setDraw(pdf, PDF_COLORS.border);
      pdf.setLineWidth(0.25);
      const footerY = PDF_PAGE.heightMm - PDF_PAGE.marginMm + 2;
      pdf.line(this.marginMm, footerY - 4, PDF_PAGE.widthMm - this.marginMm, footerY - 4);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.5);
      setText(pdf, PDF_COLORS.muted);
      pdf.text(`${this.meta.documentId} · ${this.meta.title}`, this.marginMm, footerY);
      pdf.text(`Página ${i} de ${totalPages}`, PDF_PAGE.widthMm - this.marginMm, footerY, { align: "right" });
    }
    return pdf;
  }
}

/** Resolve a cor de um badge de risco/status para uso em célula de tabela (willDrawCell/didParseCell). */
export function riskBadgeColors(level: "critico" | "alto" | "moderado" | "baixo") {
  return PDF_RISK_COLORS[level];
}

/**
 * Fábrica de hooks (didParseCell + willDrawCell) que transforma uma coluna de tabela num badge
 * colorido — mesma leitura visual dos chips da web (RISK_TINT/STATUS_TINT). `resolve` mapeia o
 * valor bruto da célula para as cores; `null` deixa a célula sem estilo especial.
 */
export function badgeColumnHooks(
  columnIndex: number,
  resolve: (raw: string) => { fg: RgbTuple; bg: RgbTuple } | null,
): Pick<UserOptions, "didParseCell" | "willDrawCell"> {
  return {
    didParseCell: (data) => {
      if (data.column.index !== columnIndex || data.section !== "body") return;
      const colors = resolve(String(data.cell.raw ?? ""));
      if (!colors) return;
      data.cell.styles.textColor = [...colors.fg] as [number, number, number];
      data.cell.styles.fontStyle = "bold";
      data.cell.styles.halign = "center";
    },
    willDrawCell: (data) => {
      if (data.column.index !== columnIndex || data.section !== "body") return;
      const colors = resolve(String(data.cell.raw ?? ""));
      if (!colors) return;
      const { x, y, width, height } = data.cell;
      const pad = 1;
      const doc = data.doc as unknown as jsPDF;
      doc.setFillColor(colors.bg[0], colors.bg[1], colors.bg[2]);
      doc.roundedRect(x + pad, y + pad, width - pad * 2, height - pad * 2, 1.2, 1.2, "F");
    },
  };
}

export type { RowInput };
