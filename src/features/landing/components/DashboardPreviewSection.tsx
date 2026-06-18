import { Button } from "@/components/ui/button";
import { DASHBOARD_PREVIEW, type CtaAction } from "../data/landing-copy";

export function DashboardPreviewSection({ onAction }: { onAction: (action: CtaAction) => void }) {
  const d = DASHBOARD_PREVIEW;
  return (
    <section className="border-y border-border/40 bg-muted/20 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{d.eyebrow}</p>
            <h2 className="mt-2 font-serif text-2xl text-foreground sm:text-3xl">{d.title}</h2>
            <p className="mt-3 max-w-md text-base leading-relaxed text-muted-foreground">
              {d.note}
            </p>
            <Button
              size="lg"
              variant="outline"
              className="mt-6"
              onClick={() => onAction(d.cta.action)}
            >
              {d.cta.label}
            </Button>
          </div>

          {/* Mock de dashboard */}
          <DashboardMock />
        </div>
      </div>
    </section>
  );
}

function DashboardMock() {
  const d = DASHBOARD_PREVIEW;
  return (
    <div
      className="rounded-2xl border border-border/70 bg-card/80 p-5 shadow-lg backdrop-blur"
      role="img"
      aria-label="Pré-visualização ilustrativa de um dashboard de vitalidade, com dados fictícios."
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Dashboard · demonstração
        </span>
        <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
          dados fictícios
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        {d.metrics.map((m) => (
          <div key={m.label} className="rounded-xl border border-border/60 bg-background p-3">
            <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
              {m.label}
            </p>
            <p className="mt-1 font-serif text-2xl text-foreground">{m.value}</p>
            <p className="text-[10px] text-muted-foreground">{m.sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-2.5">
        {d.dimensions.map((dimension) => (
          <div key={dimension.name} className="flex items-center gap-3">
            <span className="w-28 shrink-0 text-xs font-medium text-card-foreground">
              {dimension.name}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${dimension.score}%` }}
                aria-hidden
              />
            </div>
            <span className="w-8 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
              {dimension.score}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
