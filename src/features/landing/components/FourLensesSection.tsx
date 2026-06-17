import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { LENSES, CATEGORY, type CtaAction } from "../data/landing-copy";
import { TONE_CLASS } from "./icons";
import strategyLenses from "@/assets/strategy-lenses.jpg";

export function FourLensesSection({ onAction }: { onAction: (action: CtaAction) => void }) {
  return (
    <section className="relative overflow-hidden py-16 sm:py-20">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(60%_80%_at_50%_0%,color-mix(in_oklab,var(--color-primary)_14%,transparent)_0%,transparent_70%)]"
      />
      <div className="mx-auto max-w-6xl px-6">
        {/* Nova categoria */}
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {CATEGORY.eyebrow}
          </p>
          <h2 className="mt-2 font-serif text-2xl text-foreground sm:text-3xl">{CATEGORY.title}</h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">{CATEGORY.text}</p>
        </div>

        {/* As 4 Lentes — header com imagem estratégica */}
        <div className="mt-14 grid items-center gap-8 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {LENSES.eyebrow}
            </p>
            <h3 className="mt-2 font-serif text-3xl leading-tight text-foreground sm:text-4xl">
              {LENSES.title}
            </h3>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Quatro instrumentos validados internacionalmente, orquestrados em uma única jornada
              anual — risco, ecossistema, florescimento e forças, lendo a organização inteira.
            </p>
            <div className="mt-6">
              <Button
                size="lg"
                onClick={() => onAction(LENSES.cta.action)}
                className="group relative gap-2 overflow-hidden bg-gradient-to-r from-primary via-primary to-accent text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30"
              >
                <Sparkles className="h-4 w-4" aria-hidden />
                {LENSES.cta.label}
                <span
                  aria-hidden
                  className="absolute inset-y-0 -left-10 w-10 -skew-x-12 bg-white/20 blur-md transition-transform duration-700 group-hover:translate-x-[28rem]"
                />
              </Button>
            </div>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="relative overflow-hidden rounded-3xl border border-border/60 shadow-2xl shadow-black/20"
          >
            <img
              src={strategyLenses}
              alt="Quatro lentes interconectadas representando bem-estar, ecossistema, performance e cultura"
              loading="lazy"
              width={1600}
              height={1024}
              className="h-full w-full object-cover"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-background/60 via-transparent to-transparent"
            />
          </motion.div>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {LENSES.items.map((lens) => {
            const tone = TONE_CLASS[lens.tone] ?? TONE_CLASS.sky!;
            return (
              <article
                key={lens.q}
                className={`group relative flex h-full flex-col rounded-2xl border border-border/70 bg-card p-6 shadow-sm ring-1 ring-inset ${tone.ring} transition-all hover:-translate-y-1 hover:shadow-xl`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex h-10 items-center rounded-xl px-3 font-mono text-sm font-semibold ${tone.bg} ${tone.text}`}
                  >
                    {lens.q}
                  </span>
                  <span className={`h-2.5 w-2.5 rounded-full ${tone.dot}`} aria-hidden />
                </div>
                <p className="mt-4 font-serif text-2xl text-card-foreground">{lens.instrument}</p>
                <p className={`text-xs font-medium uppercase tracking-[0.14em] ${tone.text}`}>
                  {lens.theme}
                </p>
                <p className="mt-2.5 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {lens.text}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
