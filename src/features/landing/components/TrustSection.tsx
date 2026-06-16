import { TRUST } from "../data/landing-copy";
import { landingIcon } from "./icons";

export function TrustSection() {
  return (
    <section className="border-y border-border/40 bg-muted/20 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {TRUST.eyebrow}
          </p>
          <h2 className="mt-2 font-serif text-2xl text-foreground sm:text-3xl">{TRUST.title}</h2>
        </div>

        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TRUST.points.map((p) => {
            const Icon = landingIcon(p.icon);
            return (
              <li
                key={p.title}
                className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-medium text-card-foreground">{p.title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{p.text}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
