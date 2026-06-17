import { motion } from "framer-motion";
import { PROOF_NUMBERS } from "../data/landing-copy";
import { TONE_CLASS } from "./icons";

export function ProofNumbersSection() {
  const p = PROOF_NUMBERS;

  return (
    <section className="landing-light-grid relative overflow-hidden border-t border-border/40 bg-background py-16 sm:py-20">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklab,var(--color-border)_52%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--color-border)_42%,transparent)_1px,transparent_1px)] bg-[size:72px_72px] opacity-30"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/45 to-transparent"
      />

      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.45 }}
          className="mb-10 max-w-3xl"
        >
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">{p.eyebrow}</p>
          <h2 className="mt-3 font-serif text-2xl text-foreground sm:text-3xl">{p.title}</h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">{p.lead}</p>
        </motion.div>

        <div className="grid gap-5 lg:grid-cols-[0.82fr_1.18fr]">
          <motion.aside
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.45 }}
            className="landing-light-card relative overflow-hidden rounded-3xl p-6"
          >
            <p className="relative text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              Painel para gestores
            </p>
            <p className="relative mt-3 font-serif text-xl leading-tight text-card-foreground">
              {p.managementSignal}
            </p>

            <div className="relative mt-6 space-y-3">
              {p.layers.map((layer) => {
                const tone = TONE_CLASS[layer.color] ?? TONE_CLASS.sky!;
                return (
                  <div
                    key={layer.label}
                    className="flex gap-3 rounded-2xl border border-white/50 bg-white/42 p-3 shadow-sm backdrop-blur"
                  >
                    <span
                      className={`mt-1 h-3 w-3 shrink-0 rounded-full ${tone.dot} shadow-[0_0_18px_currentColor]`}
                      aria-hidden
                    />
                    <div>
                      <p className={`text-sm font-semibold ${tone.text}`}>{layer.label}</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {layer.note}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.aside>

          <div className="grid gap-4 sm:grid-cols-2">
            {p.outcomes.map((item, i) => {
              const tone = TONE_CLASS[item.color] ?? TONE_CLASS.sky!;
              return (
                <motion.article
                  key={item.title}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  className={`landing-light-card group relative overflow-hidden rounded-3xl p-5 ring-1 ring-inset ${tone.ring} transition-all hover:-translate-y-1 hover:shadow-xl`}
                >
                  <span
                    aria-hidden
                    className={`absolute inset-x-0 top-0 h-1 ${tone.dot} opacity-90`}
                  />
                  <div className="relative flex items-center justify-between gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${tone.bg} ${tone.text}`}
                    >
                      {item.stage}
                    </span>
                    <span className={`h-2 w-16 rounded-full ${tone.dot} opacity-50`} aria-hidden />
                  </div>
                  <h3 className="relative mt-4 font-serif text-xl text-card-foreground">
                    {item.title}
                  </h3>
                  <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">
                    {item.text}
                  </p>
                </motion.article>
              );
            })}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="landing-light-card mt-5 rounded-3xl p-5"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Artefatos que tornam o ciclo auditável
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {p.artifacts.map((artifact) => (
              <div
                key={artifact}
                className="rounded-2xl border border-amber-200/60 bg-white/42 p-4 text-sm leading-relaxed text-card-foreground shadow-sm backdrop-blur"
              >
                {artifact}
              </div>
            ))}
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="mt-6 text-xs leading-relaxed text-muted-foreground/70"
        >
          {p.disclaimer}
        </motion.p>
      </div>
    </section>
  );
}
