import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { INSTITUTE } from "../data/landing-copy";

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
          className="overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-card to-muted/30 p-6 shadow-sm sm:p-10"
        >
          <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">
                {inst.eyebrow}
              </p>

              {/* Logo do Instituto (em painel claro para legibilidade em qualquer tema) */}
              <div className="mt-3 inline-flex items-center rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-black/5">
                <img
                  src={inst.logoLight}
                  alt={inst.name}
                  width={220}
                  height={88}
                  loading="lazy"
                  className="h-12 w-auto object-contain sm:h-14"
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
            <div className="grid grid-cols-2 gap-3">
              {inst.stats.map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, scale: 0.96 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: i * 0.06 }}
                  className="rounded-2xl border border-border/70 bg-card p-5 text-center shadow-sm"
                >
                  <p className="bg-gradient-to-br from-primary to-accent bg-clip-text font-serif text-3xl font-semibold text-transparent">
                    {s.value}
                  </p>
                  <p className="mt-1 text-xs leading-snug text-muted-foreground">{s.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
