import { PERSONAS } from "../data/landing-copy";
import { landingIcon } from "./icons";

export function PersonaPathwaysSection() {
  return (
    <section className="landing-light-grid relative overflow-hidden border-y border-border/40 bg-background py-16 sm:py-20">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklab,var(--color-border)_42%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--color-border)_34%,transparent)_1px,transparent_1px)] bg-[size:64px_64px] opacity-35"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-secondary/60 to-transparent"
      />
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {PERSONAS.eyebrow}
          </p>
          <h2 className="mt-2 font-serif text-2xl text-foreground sm:text-3xl">{PERSONAS.title}</h2>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PERSONAS.items.map((p) => {
            const Icon = landingIcon(p.icon);
            return (
              <article
                key={p.role}
                className="landing-light-card group flex h-full flex-col rounded-2xl p-6 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl"
              >
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className="landing-light-icon flex h-12 w-12 items-center justify-center rounded-2xl text-primary ring-1 ring-inset ring-primary/20"
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <p className="font-serif text-xl text-card-foreground">{p.role}</p>
                </div>
                <p className="mt-3.5 text-sm leading-relaxed text-muted-foreground">{p.text}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
