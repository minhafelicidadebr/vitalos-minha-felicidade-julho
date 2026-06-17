import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WHY_IT_MATTERS, type CtaAction } from "../data/landing-copy";

const VARIANT: Record<string, "default" | "outline" | "ghost"> = {
  primary: "default",
  outline: "outline",
  ghost: "ghost",
};

export function WhyItMattersSection({ onAction }: { onAction: (action: CtaAction) => void }) {
  const w = WHY_IT_MATTERS;
  return (
    <section className="border-y border-border/40 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-6">
        {/* Cabeçalho */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.45 }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">{w.eyebrow}</p>
          <h2 className="mt-2 font-serif text-3xl leading-tight text-foreground sm:text-4xl">
            {w.titleA}{" "}
            <span className="bg-gradient-to-r from-amber-500 to-emerald-500 bg-clip-text text-transparent">
              {w.titleB}
            </span>
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">{w.lead}</p>
        </motion.div>

        {/* Custo ↔ Transformar ↔ Retorno */}
        <div className="mt-12 grid items-stretch gap-4 lg:grid-cols-[1fr_auto_1fr]">
          {/* Custo (dor) */}
          <div>
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-rose-600 dark:text-rose-400">
              <span className="h-2 w-2 rounded-full bg-rose-500" aria-hidden /> {w.costTitle}
            </p>
            <ul className="space-y-3">
              {w.costs.map((c, i) => (
                <motion.li
                  key={c.value}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: i * 0.05 }}
                  className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4"
                >
                  <p className="font-serif text-2xl font-semibold text-rose-600 dark:text-rose-300">
                    {c.value}
                  </p>
                  <p className="mt-0.5 text-sm text-card-foreground">{c.label}</p>
                  {c.note && <p className="mt-1 text-xs text-muted-foreground">{c.note}</p>}
                  <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground/70">
                    {c.source}
                  </p>
                </motion.li>
              ))}
            </ul>
          </div>

          {/* Conector */}
          <div className="flex flex-row items-center justify-center gap-2 lg:flex-col">
            <span className="hidden h-full w-px bg-gradient-to-b from-rose-500/30 via-border to-emerald-500/30 lg:block" />
            <motion.span
              aria-hidden
              animate={{ x: [0, 4, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-primary shadow-sm lg:rotate-90"
            >
              <ArrowRight className="h-5 w-5" />
            </motion.span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground lg:[writing-mode:vertical-rl]">
              transformar
            </span>
            <span className="hidden h-full w-px bg-gradient-to-b from-rose-500/30 via-border to-emerald-500/30 lg:block" />
          </div>

          {/* Retorno (ganho) */}
          <div>
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden /> {w.returnTitle}
            </p>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {w.returns.map((r, i) => (
                <motion.div
                  key={r.label}
                  initial={{ opacity: 0, x: 10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: i * 0.05 }}
                  className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4"
                >
                  <p className="font-serif text-2xl font-semibold text-emerald-600 dark:text-emerald-300">
                    {r.value}
                  </p>
                  <p className="text-sm text-card-foreground">{r.label}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground/70">{r.source}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Ponte: ROI + decisão */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="mt-8 grid items-center gap-6 rounded-3xl border border-border/70 bg-gradient-to-br from-card to-muted/40 p-6 shadow-sm sm:p-8 lg:grid-cols-[auto_1fr]"
        >
          <RoiDonut ratio={w.roi.ratio} unit={w.roi.unit} text={w.roi.text} source={w.roi.source} />
          <div>
            <h3 className="font-serif text-2xl text-foreground">{w.bridge.title}</h3>
            <p className="mt-2 text-base leading-relaxed text-muted-foreground">{w.bridge.text}</p>
            <Button
              size="lg"
              className="mt-4"
              variant={VARIANT[w.bridge.cta.variant ?? "primary"]}
              onClick={() => onAction(w.bridge.cta.action)}
            >
              {w.bridge.cta.label}
            </Button>
          </div>
        </motion.div>

        <p className="mt-5 text-center text-xs leading-relaxed text-muted-foreground/80">
          {w.disclaimer}
        </p>
      </div>
    </section>
  );
}

function RoiDonut({
  ratio,
  unit,
  text,
  source,
}: {
  ratio: string;
  unit: string;
  text: string;
  source: string;
}) {
  // 4:1 → 80% do anel é "retorno".
  const pct = 80;
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative h-32 w-32">
        <svg
          viewBox="0 0 120 120"
          className="h-32 w-32 -rotate-90"
          role="img"
          aria-label={`Retorno sobre investimento ${ratio}`}
        >
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.12}
            strokeWidth="12"
          />
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke="url(#roigrad)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * c} ${c}`}
          />
          <defs>
            <linearGradient id="roigrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="font-serif text-3xl font-semibold text-foreground">{ratio}</p>
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{unit}</p>
        </div>
      </div>
      <p className="mt-3 max-w-[12rem] text-xs leading-relaxed text-card-foreground">{text}</p>
      <p className="mt-1 max-w-[12rem] text-[10px] leading-relaxed text-muted-foreground/70">
        {source}
      </p>
    </div>
  );
}
