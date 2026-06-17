import { Check } from "lucide-react";
import { GLOBAL_ESG } from "../data/landing-copy";

export function GlobalEsgSection() {
  return (
    <section className="py-8 sm:py-12">
      <div className="mx-auto max-w-6xl px-6">
        <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-card to-muted/40 p-6 shadow-sm sm:p-10">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[color-mix(in_oklab,var(--color-accent)_16%,transparent)] blur-3xl"
          />
          <div className="relative grid gap-8 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
                {GLOBAL_ESG.eyebrow}
              </p>
              <span className="mt-2 inline-flex rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                {GLOBAL_ESG.badge}
              </span>
              <h2 className="mt-3 font-serif text-2xl text-foreground sm:text-3xl">
                {GLOBAL_ESG.title}
              </h2>
              <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground">
                {GLOBAL_ESG.text}
              </p>
            </div>

            <ul className="grid gap-2.5">
              {GLOBAL_ESG.points.map((p) => (
                <li
                  key={p}
                  className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/60 px-4 py-3 backdrop-blur"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Check className="h-3 w-3" aria-hidden />
                  </span>
                  <span className="text-sm text-card-foreground">{p}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
