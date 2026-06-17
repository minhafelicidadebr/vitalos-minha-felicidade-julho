import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { HERO, type CtaAction } from "../data/landing-copy";

const VARIANT: Record<string, "default" | "outline" | "ghost"> = {
  primary: "default",
  outline: "outline",
  ghost: "ghost",
};

export function LandingHero({ onAction }: { onAction: (action: CtaAction) => void }) {
  return (
    <section className="relative overflow-hidden border-b border-border/40">
      {/* Glow institucional */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(70%_60%_at_50%_-5%,color-mix(in_oklab,var(--color-primary)_22%,transparent)_0%,transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-24 -z-10 h-80 w-80 rounded-full bg-[color-mix(in_oklab,var(--color-accent)_18%,transparent)] blur-3xl"
      />

      <div className="mx-auto max-w-6xl px-6 pt-16 pb-14 sm:pt-24 sm:pb-20">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <p className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
            {HERO.eyebrow}
          </p>

          <h1 className="mt-6 max-w-4xl font-serif text-4xl leading-[1.05] tracking-tight text-foreground sm:text-6xl">
            O Sistema Operacional da <span className="text-primary">Vitalidade Organizacional</span>
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {HERO.subheadline}
          </p>

          <p className="mt-4 max-w-2xl font-serif text-lg italic text-foreground/90">
            {HERO.support}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {HERO.ctas.map((cta) => (
              <Button
                key={cta.label}
                size="lg"
                variant={VARIANT[cta.variant ?? "primary"]}
                onClick={() => onAction(cta.action)}
              >
                {cta.label}
              </Button>
            ))}
          </div>

          <ul className="mt-8 flex flex-wrap gap-2" aria-label="Princípios da plataforma">
            {HERO.signals.map((s) => (
              <li
                key={s}
                className="rounded-full border border-border/60 bg-card/50 px-3 py-1 text-xs text-muted-foreground backdrop-blur"
              >
                {s}
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  );
}
