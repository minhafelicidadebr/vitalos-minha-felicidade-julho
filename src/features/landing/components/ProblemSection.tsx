import { PROBLEM } from "../data/landing-copy";
import { landingIcon } from "./icons";

export function ProblemSection() {
  return (
    <section className="border-b border-border/40 bg-muted/20 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-6">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          {PROBLEM.eyebrow}
        </p>
        <h2 className="mt-2 max-w-3xl font-serif text-2xl text-foreground sm:text-3xl">
          {PROBLEM.title}
        </h2>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
          {PROBLEM.text}
        </p>

        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PROBLEM.cards.map((c) => {
            const Icon = landingIcon(c.icon);
            return (
              <li
                key={c.title}
                className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-[0_1px_0_rgba(0,0,0,0.02)]"
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <p className="text-sm font-medium text-card-foreground">{c.title}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
