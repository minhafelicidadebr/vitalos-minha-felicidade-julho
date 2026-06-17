import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { HERO, type CtaAction } from "../data/landing-copy";
import heroHologram from "@/assets/hero-hologram.png";

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

      <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 pt-16 pb-14 sm:pt-24 sm:pb-20 lg:grid-cols-[1.15fr_1fr]">
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

        {/* Holograma premium */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: "easeOut", delay: 0.1 }}
          className="relative mx-auto hidden aspect-square w-full max-w-[520px] lg:block"
        >
          {/* Halo cintilante */}
          <div
            aria-hidden
            className="absolute inset-[12%] -z-10 rounded-full bg-[radial-gradient(circle_at_center,color-mix(in_oklab,var(--color-primary)_38%,transparent)_0%,transparent_60%)] blur-3xl"
          />
          <div
            aria-hidden
            className="absolute inset-[28%] -z-10 rounded-full bg-[radial-gradient(circle_at_center,color-mix(in_oklab,var(--color-accent)_28%,transparent)_0%,transparent_55%)] blur-2xl"
          />
          {/* Anéis orbitais */}
          <motion.span
            aria-hidden
            initial={{ rotate: 0 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 32, repeat: Infinity, ease: "linear" }}
            className="absolute inset-[8%] rounded-full border border-dashed border-primary/30"
          />
          <motion.span
            aria-hidden
            initial={{ rotate: 0 }}
            animate={{ rotate: -360 }}
            transition={{ duration: 48, repeat: Infinity, ease: "linear" }}
            className="absolute inset-[18%] rounded-full border border-accent/25"
          />
          {/* Pontos cintilantes */}
          {[0, 1, 2, 3].map((i) => (
            <motion.span
              key={i}
              aria-hidden
              className="absolute h-2 w-2 rounded-full bg-accent shadow-[0_0_12px_var(--color-accent)]"
              style={{
                top: `${20 + i * 18}%`,
                left: `${i % 2 === 0 ? "8%" : "88%"}`,
              }}
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
              transition={{ duration: 2.4 + i * 0.4, repeat: Infinity, ease: "easeInOut" }}
            />
          ))}
          {/* Imagem holograma */}
          <motion.img
            src={heroHologram}
            alt="Pessoas representadas como holograma — a vitalidade organizacional ganhando forma"
            width={1024}
            height={1024}
            className="relative z-10 h-full w-full object-contain drop-shadow-[0_24px_60px_rgba(0,180,140,0.35)]"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Scanline sutil */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-20 rounded-3xl bg-[repeating-linear-gradient(0deg,transparent_0px,transparent_3px,rgba(255,255,255,0.04)_3px,rgba(255,255,255,0.04)_4px)] mix-blend-overlay"
          />
        </motion.div>
      </div>
    </section>
  );
}
