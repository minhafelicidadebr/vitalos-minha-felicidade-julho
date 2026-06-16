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

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PERSONAS.items.map((p) => {
            const Icon = landingIcon(p.icon);
            return (
              <article
                key={p.role}
                className="flex h-full flex-col rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <p className="font-serif text-lg text-card-foreground">{p.role}</p>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{p.text}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
