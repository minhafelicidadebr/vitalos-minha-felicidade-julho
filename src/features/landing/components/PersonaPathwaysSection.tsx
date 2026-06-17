import { PERSONAS } from "../data/landing-copy";
import { landingIcon } from "./icons";

export function PersonaPathwaysSection() {
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-6">
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
                className="group flex h-full flex-col rounded-2xl border border-border/70 bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl"
              >
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-secondary to-secondary/60 text-secondary-foreground ring-1 ring-inset ring-border/60 shadow-inner"
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
