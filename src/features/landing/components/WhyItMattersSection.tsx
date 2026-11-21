import { motion } from "framer-motion";
import {
  ArrowRight,
  Cog,
  Flame,
  LogOut,
  Rocket,
  ShieldCheck,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { WHY_IT_MATTERS, type CtaAction } from "../data/landing-copy";

const VARIANT: Record<string, "default" | "outline" | "ghost"> = {
  primary: "default",
  outline: "outline",
  ghost: "ghost",
};

const RETURN_ICON: Record<string, LucideIcon> = {
  cog: Cog,
  workflow: Workflow,
  rocket: Rocket,
  users: Users,
  shield: ShieldCheck,
  "log-out": LogOut,
  flame: Flame,
};

const RETURN_TONE: Record<string, { text: string; border: string; glow: string }> = {
  emerald: {
    text: "text-emerald-600 dark:text-emerald-300",
    border: "border-emerald-500/25",
    glow: "from-emerald-500/16",
  },
  cyan: {
    text: "text-cyan-600 dark:text-cyan-300",
    border: "border-cyan-500/25",
    glow: "from-cyan-500/16",
  },
  rose: {
    text: "text-rose-600 dark:text-rose-300",
    border: "border-rose-500/25",
    glow: "from-rose-500/16",
  },
  amber: {
    text: "text-amber-600 dark:text-amber-300",
    border: "border-amber-500/25",
    glow: "from-amber-500/16",
  },
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
            <div className="mb-4">
              <p className="flex items-start gap-2 text-sm font-semibold leading-snug text-emerald-700 dark:text-emerald-300">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden />
                {w.returnTitle}
              </p>
              <p className="mt-2 pl-4 text-xs leading-relaxed text-muted-foreground">
                {w.returnSource}
              </p>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {w.returns.map((r, i) => {
                const Icon = RETURN_ICON[r.icon] ?? Cog;
                const tone = RETURN_TONE[r.tone] ?? RETURN_TONE.emerald!;
                return (
                  <motion.div
                    key={r.label}
                    initial={{ opacity: 0, x: 10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.35, delay: i * 0.05 }}
                    className={`group relative isolate min-h-[148px] overflow-hidden rounded-2xl border bg-card/55 p-4 shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-lg ${tone.border}`}
                  >
                    <span
                      aria-hidden
                      className={`absolute inset-0 -z-10 bg-gradient-to-br ${tone.glow} via-transparent to-transparent opacity-75`}
                    />
                    <Icon
                      className={`h-8 w-8 stroke-[1.7] ${tone.text} transition-transform duration-300 group-hover:scale-105`}
                      aria-hidden
                    />
                    <p className={`mt-3 font-serif text-2xl font-semibold ${tone.text}`}>
                      {r.value}
                    </p>
                    <p className="mt-0.5 text-sm leading-snug text-card-foreground">{r.label}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Ponte: ROI + decisão */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="mt-8 grid min-w-0 grid-cols-1 items-center gap-6 rounded-3xl border border-border/70 bg-gradient-to-br from-card to-muted/40 p-6 shadow-sm sm:p-8"
        >
          <div>
            <h3 className="font-serif text-2xl text-foreground">{w.bridge.title}</h3>
            <p className="mt-2 text-base leading-relaxed text-muted-foreground">{w.bridge.text}</p>
            <Button
              size="lg"
              className="mt-4 h-auto min-h-11 w-full max-w-full whitespace-normal px-4 py-3 sm:w-auto sm:px-8"
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
