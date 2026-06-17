import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { HERO, type CtaAction } from "../data/landing-copy";
import heroInstitutionalGrid from "@/assets/hero-institutional-grid-background.jpg";

const VARIANT: Record<string, "default" | "outline" | "ghost"> = {
  primary: "default",
  outline: "outline",
  ghost: "ghost",
};

const CTA_CLASS: Record<string, string> = {
  primary:
    "bg-accent text-accent-foreground shadow-lg shadow-accent/20 hover:bg-accent/90 hover:shadow-xl hover:shadow-accent/25",
  outline:
    "border-accent/70 bg-accent text-accent-foreground shadow-lg shadow-accent/25 hover:bg-accent/90 hover:text-accent-foreground hover:shadow-xl hover:shadow-accent/30",
  ghost: "text-white/70 hover:bg-white/10 hover:text-white",
};

export function LandingHero({ onAction }: { onAction: (action: CtaAction) => void }) {
  return (
    <section className="relative isolate overflow-hidden border-b border-white/10 bg-[#03100f] text-white">
      <div
        aria-hidden
        className="absolute inset-0 -z-30 bg-cover bg-center opacity-95"
        style={{ backgroundImage: `url(${heroInstitutionalGrid})` }}
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-20 bg-[linear-gradient(90deg,#03100f_0%,rgba(3,16,15,0.94)_30%,rgba(3,16,15,0.68)_58%,rgba(3,16,15,0.42)_100%)]"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:88px_88px] opacity-80 [mask-image:linear-gradient(90deg,black_0%,black_54%,transparent_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 -z-10 h-full w-[58%] bg-[radial-gradient(circle_at_25%_20%,rgba(201,162,39,0.16)_0%,transparent_34%),radial-gradient(circle_at_70%_86%,rgba(0,180,150,0.14)_0%,transparent_42%)]"
      />

      <div className="mx-auto grid min-h-[680px] max-w-6xl items-center gap-10 px-6 pt-16 pb-14 sm:pt-24 sm:pb-20 lg:grid-cols-[0.95fr_1.05fr]">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="max-w-3xl"
        >
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-white/70 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
            {HERO.eyebrow}
          </p>

          <h1 className="mt-6 max-w-4xl font-serif text-4xl leading-[1.05] tracking-tight text-white sm:text-6xl">
            O Sistema Operacional da{" "}
            <span className="bg-gradient-to-r from-accent via-[#d9f66f] to-emerald-300 bg-clip-text text-transparent drop-shadow-[0_0_18px_rgba(201,162,39,0.28)]">
              Vitalidade Organizacional
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/[0.72] sm:text-lg">
            {HERO.subheadline}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {HERO.ctas.map((cta) => (
              <Button
                key={cta.label}
                size="lg"
                variant={VARIANT[cta.variant ?? "primary"]}
                className={CTA_CLASS[cta.variant ?? "primary"]}
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
                className="rounded-full border border-white/15 bg-white/[0.07] px-3 py-1 text-xs text-white/[0.65] backdrop-blur"
              >
                {s}
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.16 }}
          className="hidden justify-self-end lg:block"
        >
          <div className="w-[360px] rounded-2xl border border-accent/30 bg-accent/[0.08] p-5 shadow-2xl shadow-black/35 backdrop-blur-md">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent drop-shadow-[0_0_10px_rgba(201,162,39,0.35)]">
              Inovação e Compliance
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {["Ciência da felicidade", "IA aplicada", "ESG & ODS", "NR-1 & ISO 45003"].map(
                (item) => (
                  <span
                    key={item}
                    className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs text-white/[0.72]"
                  >
                    {item}
                  </span>
                ),
              )}
            </div>
            <div className="mt-5 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
            <p className="mt-4 font-serif text-xl leading-tight text-white">{HERO.support}</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
