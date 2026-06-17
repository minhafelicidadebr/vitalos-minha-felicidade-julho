import { motion } from "framer-motion";
import { PROOF_NUMBERS } from "../data/landing-copy";

const COLOR_MAP: Record<string, { text: string; bg: string; border: string }> = {
  emerald: {
    text: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-800/40",
  },
  primary: {
    text: "text-primary",
    bg: "bg-primary/5",
    border: "border-primary/20",
  },
  amber: {
    text: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800/40",
  },
  sky: {
    text: "text-sky-700 dark:text-sky-300",
    bg: "bg-sky-50 dark:bg-sky-950/30",
    border: "border-sky-200 dark:border-sky-800/40",
  },
  violet: {
    text: "text-violet-700 dark:text-violet-300",
    bg: "bg-violet-50 dark:bg-violet-950/30",
    border: "border-violet-200 dark:border-violet-800/40",
  },
  slate: {
    text: "text-slate-600 dark:text-slate-300",
    bg: "bg-slate-50 dark:bg-slate-900/30",
    border: "border-slate-200 dark:border-slate-700/40",
  },
};

export function ProofNumbersSection() {
  const p = PROOF_NUMBERS;
  return (
    <section className="border-t border-border/40 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.45 }}
          className="mb-10 max-w-2xl"
        >
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">
            {p.eyebrow}
          </p>
          <h2 className="mt-3 font-serif text-2xl text-foreground sm:text-3xl">{p.title}</h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">{p.lead}</p>
        </motion.div>

        {/* Grid de números */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {p.items.map((item, i) => {
            const colors = COLOR_MAP[item.color] ?? COLOR_MAP.slate!;
            return (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className={`rounded-2xl border p-5 ${colors.bg} ${colors.border}`}
              >
                <p className={`font-serif text-3xl font-semibold tabular-nums ${colors.text}`}>
                  {item.value}
                </p>
                <p className="mt-2 font-medium text-sm text-foreground">{item.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.note}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Disclaimer */}
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
