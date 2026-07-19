// "Continue aprofundando" (Onda LDX-1, doc §7.8) — só recursos internos e do
// Evidence Registry nesta onda; nunca link externo sem curadoria e direitos
// verificados. Status de evidência é sempre passado pelo chamador já
// derivado de buildPassport() — este componente nunca digita confiança.

export type ComplementaryResourceType =
  | "VERIFIED_EVIDENCE"
  | "APPLIED_INTERPRETATION"
  | "CURATED_INSPIRATION"
  | "ARTISTIC_EXPRESSION"
  | "PRACTICE_TOOL";

const TYPE_LABEL: Record<ComplementaryResourceType, string> = {
  VERIFIED_EVIDENCE: "Evidência verificada",
  APPLIED_INTERPRETATION: "Interpretação aplicada",
  CURATED_INSPIRATION: "Inspiração curada",
  ARTISTIC_EXPRESSION: "Expressão artística",
  PRACTICE_TOOL: "Ferramenta de prática",
};

export interface ComplementaryResource {
  title: string;
  type: ComplementaryResourceType;
  origin: string;
  author?: string;
  year?: string;
  durationLabel?: string;
  whyItMatters: string;
  /** Derivado de buildPassport() pelo chamador — nunca digitado aqui. */
  evidenceStatus?: string;
  /** Só rota interna nesta onda (doc §7.8: "não preencher com links arbitrários"). */
  internalHref?: string;
  onOpen?: () => void;
}

export function ComplementaryResources({ resources }: { resources: ComplementaryResource[] }) {
  if (resources.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Continue aprofundando
      </p>
      <div className="mt-3 space-y-3">
        {resources.map((r) => (
          <div key={r.title} className="rounded-xl border border-border/60 bg-background p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">{r.title}</p>
              <span className="inline-flex items-center rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {TYPE_LABEL[r.type]}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {[r.author, r.origin, r.year, r.durationLabel].filter(Boolean).join(" · ")}
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-card-foreground">{r.whyItMatters}</p>
            {r.evidenceStatus && (
              <p className="mt-1 text-[11px] text-muted-foreground">Status: {r.evidenceStatus}</p>
            )}
            {r.internalHref && r.onOpen && (
              <button
                type="button"
                onClick={r.onOpen}
                className="mt-2 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                Abrir
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
