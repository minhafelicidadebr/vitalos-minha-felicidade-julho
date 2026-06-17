import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { INSTITUTE } from "../data/landing-copy";
import instituteLogoTransparent from "@/assets/instituto-felicidade-para-todos-logo-transparent.png";

export function InstituteSection() {
  const inst = INSTITUTE;
  return (
    <section className="border-t border-border/40 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.45 }}
          className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-card via-background to-muted/30 p-6 shadow-sm sm:p-10"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklab,var(--color-border)_42%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--color-border)_34%,transparent)_1px,transparent_1px)] bg-[size:56px_56px] opacity-25"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/70 to-transparent"
          />
          <div className="relative grid gap-8 lg:grid-cols-[1.08fr_1fr] lg:items-center">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]">
                {inst.eyebrow}
              </p>

              <div className="mt-5 inline-flex max-w-full items-center">
                <img
                  src={instituteLogoTransparent}
                  alt={inst.name}
                  width={600}
                  height={219}
                  loading="lazy"
                  className="h-auto max-h-28 w-auto max-w-full object-contain drop-shadow-[0_12px_28px_rgba(11,61,46,0.14)] sm:max-h-32"
                />
              </div>

              <p className="mt-4 font-serif text-lg text-foreground">{inst.tagline}</p>
              <p className="mt-2 max-w-xl text-base leading-relaxed text-muted-foreground">
                {inst.text}
              </p>

              <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent-foreground">
                <Trophy className="h-3.5 w-3.5 text-accent" aria-hidden />
                Recorde Mundial · Pesquisa de Felicidade Interna Bruta (FIB)
              </span>
            </div>

            {/* Estatísticas de impacto */}
            <div className="rounded-3xl border border-border/70 bg-card/70 p-4 shadow-sm backdrop-blur">
              <p className="px-1 pb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Evidências institucionais
              </p>
              <div className="grid grid-cols-2 gap-3">
                {inst.stats.map((s, i) => (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, scale: 0.96 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.35, delay: i * 0.06 }}
                    className="relative overflow-hidden rounded-2xl border border-border/70 bg-background/70 p-5 text-center shadow-sm"
                  >
                    <span
                      aria-hidden
                      className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-accent to-emerald-500"
                    />
                    <p className="bg-gradient-to-br from-primary to-accent bg-clip-text font-serif text-3xl font-semibold text-transparent">
                      {s.value}
                    </p>
                    <p className="mt-1 text-xs leading-snug text-muted-foreground">{s.label}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
