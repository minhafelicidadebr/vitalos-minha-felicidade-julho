import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";
import { METHODOLOGY, type CtaAction } from "../data/landing-copy";
import strategyBoardroom from "@/assets/strategy-boardroom.jpg";

export function MethodologySection({ onAction }: { onAction: (action: CtaAction) => void }) {
  return (
    <section className="relative overflow-hidden border-y border-border/40 bg-muted/20 py-16 sm:py-20">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-80 bg-[radial-gradient(60%_80%_at_50%_100%,color-mix(in_oklab,var(--color-accent)_12%,transparent)_0%,transparent_70%)]"
      />
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.05fr]">
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative overflow-hidden rounded-3xl border border-border/60 shadow-2xl shadow-black/20"
          >
            <img
              src={strategyBoardroom}
              alt="Boardroom executivo com visualizações de dados de vitalidade organizacional"
              loading="lazy"
              width={1600}
              height={1024}
              className="h-full w-full object-cover"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-background/40 via-transparent to-accent/10"
            />
          </motion.div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {METHODOLOGY.eyebrow}
            </p>
            <h2 className="mt-2 font-serif text-3xl leading-tight text-foreground sm:text-4xl">
              {METHODOLOGY.title}
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Um ciclo anual em quatro estações, fundamentado em psicometria, andragogia, behavioral
              design e gestão baseada em evidência. O que normalmente morre num relatório, aqui
              vira aprendizado vivo da organização.
            </p>
            <div className="mt-6">
              <Button
                size="lg"
                onClick={() => onAction(METHODOLOGY.cta.action)}
                className="group relative gap-2 overflow-hidden bg-gradient-to-r from-accent via-accent to-primary text-accent-foreground shadow-lg shadow-accent/20 transition-all hover:shadow-xl hover:shadow-accent/30"
              >
                <BookOpen className="h-4 w-4" aria-hidden />
                {METHODOLOGY.cta.label}
                <span
                  aria-hidden
                  className="absolute inset-y-0 -left-10 w-10 -skew-x-12 bg-white/20 blur-md transition-transform duration-700 group-hover:translate-x-[28rem]"
                />
              </Button>
            </div>
          </div>
        </div>

        <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {METHODOLOGY.steps.map((step, i) => (
            <li key={step.key} className="relative">
              {i < METHODOLOGY.steps.length - 1 && (
                <span
                  aria-hidden
                  className="absolute right-[-12px] top-10 hidden text-3xl text-muted-foreground/30 lg:block"
                >
                  →
                </span>
              )}
              <div className="flex h-full flex-col rounded-2xl border border-border/70 bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-accent/15 font-mono text-base font-semibold text-primary shadow-inner">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="mt-4 font-serif text-xl text-card-foreground">{step.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
