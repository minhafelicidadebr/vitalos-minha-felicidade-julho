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

        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TRUST.points.map((p) => {
            const Icon = landingIcon(p.icon);
            return (
              <li
                key={p.title}
                className="group flex items-start gap-4 rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-500/40 hover:shadow-lg"
              >
                <span
                  aria-hidden
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-transparent text-emerald-600 ring-1 ring-inset ring-emerald-500/25 shadow-inner dark:text-emerald-400"
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-card-foreground">{p.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{p.text}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
