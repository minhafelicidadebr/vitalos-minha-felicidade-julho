import { motion } from "framer-motion";
import { FileCheck2, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NR1, type CtaAction } from "../data/landing-copy";
import { landingIcon } from "./icons";

const VARIANT: Record<string, "default" | "outline" | "ghost"> = {
  primary: "default",
  outline: "outline",
  ghost: "ghost",
};

export function Nr1Section({ onAction }: { onAction: (action: CtaAction) => void }) {
  const n = NR1;
  return (
    <section className="py-8 sm:py-12">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.45 }}
          className="relative overflow-hidden rounded-3xl border border-sky-500/25 bg-gradient-to-br from-sky-500/[0.07] to-card p-6 shadow-sm sm:p-10"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-sky-500/10 blur-3xl"
          />
          <div className="relative grid gap-8 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-sky-700 dark:text-sky-300">
                {n.eyebrow}
              </p>
              <h2 className="mt-2 font-serif text-3xl text-foreground">{n.title}</h2>
              <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground">
                {n.text}
              </p>
              <ul className="mt-5 space-y-2.5">
                {n.bullets.map((b) => {
                  const Icon = landingIcon(b.icon);
                  return (
                    <li key={b.text} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-700 dark:text-sky-300">
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="text-sm text-card-foreground">{b.text}</span>
                    </li>
                  );
                })}
              </ul>
              <Button
                size="lg"
                variant={VARIANT[n.cta.variant ?? "outline"]}
                className="mt-6"
                onClick={() => onAction(n.cta.action)}
              >
                {n.cta.label}
              </Button>
              <p className="mt-4 max-w-xl text-[11px] leading-relaxed text-muted-foreground/80">
                {n.disclaimer}
              </p>
            </div>

            {/* Mock visual de relatório educativo + chatbot */}
            <div className="relative">
              <div className="rounded-2xl border border-border/70 bg-background p-5 shadow-md">
                <div className="flex items-center gap-2 border-b border-border/50 pb-3">
                  <FileCheck2 className="h-5 w-5 text-sky-600 dark:text-sky-400" aria-hidden />
                  <p className="text-sm font-medium text-card-foreground">
                    Relatório educativo NR-1 · COPSOQ II (demonstração)
                  </p>
                  <span className="ml-auto rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                    PDF
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  {[
                    { dim: "Carga & ritmo de trabalho", band: "risco", w: 78 },
                    { dim: "Reconhecimento & justiça", band: "intermediário", w: 55 },
                    { dim: "Apoio social & liderança", band: "favorável", w: 34 },
                    { dim: "Clareza de papel", band: "favorável", w: 28 },
                  ].map((d) => (
                    <div key={d.dim}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{d.dim}</span>
                        <span className="capitalize text-card-foreground">{d.band}</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full ${
                            d.band === "risco"
                              ? "bg-rose-500"
                              : d.band === "intermediário"
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                          }`}
                          style={{ width: `${d.w}%` }}
                          aria-hidden
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3 flex items-start gap-2.5 rounded-2xl border border-border/70 bg-card p-3.5 shadow-sm">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Bot className="h-4 w-4" aria-hidden />
                </span>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  <span className="font-medium text-foreground">FlorescerIA:</span> “Carga &amp;
                  ritmo está em faixa de risco. Sugiro um plano de ação preparatório — para
                  validação do profissional habilitado.”
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
