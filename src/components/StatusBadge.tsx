// Selo de status do dado/funcionalidade — nunca deixa uma superfície implicar
// mais maturidade do que ela tem (doutrina REAL/PARCIAL/DEMO/ROADMAP do CLAUDE.md).

export type ProductStatus = "REAL" | "PARCIAL" | "DEMO" | "ROADMAP";

const STYLE: Record<ProductStatus, string> = {
  REAL: "border-primary/40 bg-primary/10 text-primary",
  PARCIAL: "border-amber-400/50 bg-amber-50/60 text-amber-900 dark:bg-amber-950/20 dark:text-amber-300",
  DEMO: "border-border/70 bg-muted/50 text-muted-foreground",
  ROADMAP: "border-dashed border-border/70 bg-transparent text-muted-foreground",
};

const LABEL: Record<ProductStatus, string> = {
  REAL: "Real",
  PARCIAL: "Parcial",
  DEMO: "Demo",
  ROADMAP: "Roadmap",
};

export function StatusBadge({ status, title }: { status: ProductStatus; title?: string }) {
  return (
    <span
      title={title}
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${STYLE[status]}`}
    >
      {LABEL[status]}
    </span>
  );
}
