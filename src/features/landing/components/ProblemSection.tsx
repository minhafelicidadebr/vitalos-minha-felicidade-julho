import { PROBLEM } from "../data/landing-copy";
import { landingIcon } from "./icons";

export function ProblemSection() {
  return (
    <section className="landing-light-grid relative overflow-hidden border-b border-border/40 bg-background py-16 sm:py-20">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklab,var(--color-border)_42%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--color-border)_34%,transparent)_1px,transparent_1px)] bg-[size:64px_64px] opacity-35"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-destructive/35 to-transparent"
      />
      <div className="relative mx-auto max-w-6xl px-6">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          {PROBLEM.eyebrow}
        </p>
        <h2 className="mt-2 max-w-3xl font-serif text-2xl text-foreground sm:text-3xl">
          {PROBLEM.title}
        </h2>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
          {PROBLEM.text}
        </p>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PROBLEM.cards.map((c) => {
            const Icon = landingIcon(c.icon);
            return (
              <li
                key={c.title}
                className="landing-light-card group flex items-start gap-4 rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:border-destructive/40 hover:shadow-xl"
              >
                <span
                  aria-hidden
                  className="landing-light-icon relative mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-destructive ring-1 ring-inset ring-destructive/20"
                >
                  <span className="absolute inset-0 rounded-2xl bg-destructive/0 transition-colors group-hover:bg-destructive/5" />
                  <Icon className="relative h-5 w-5" />
                </span>
                <p className="text-sm font-medium leading-snug text-card-foreground">{c.title}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
