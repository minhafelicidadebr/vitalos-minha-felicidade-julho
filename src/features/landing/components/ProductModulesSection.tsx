import { MODULES } from "../data/landing-copy";
import { landingIcon } from "./icons";

export function ProductModulesSection() {
  return (
    <section className="landing-light-grid relative overflow-hidden border-y border-border/40 bg-background py-16 sm:py-20">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklab,var(--color-border)_42%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--color-border)_34%,transparent)_1px,transparent_1px)] bg-[size:64px_64px] opacity-35"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent"
      />
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {MODULES.eyebrow}
            </p>
            <h2 className="mt-2 font-serif text-2xl text-foreground sm:text-3xl">
              {MODULES.title}
            </h2>
          </div>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MODULES.items.map((m) => {
            const Icon = landingIcon(m.icon);
            return (
              <article
                key={m.title}
                className="landing-light-card group relative flex h-full flex-col overflow-hidden rounded-2xl p-6 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl"
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
                />
                <span
                  aria-hidden
                  className="landing-light-icon relative flex h-14 w-14 items-center justify-center rounded-2xl text-primary ring-1 ring-inset ring-primary/20"
                >
                  <Icon className="h-6 w-6" />
                </span>
                <p className="mt-4 font-serif text-lg text-card-foreground">{m.title}</p>
                <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {m.desc}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
