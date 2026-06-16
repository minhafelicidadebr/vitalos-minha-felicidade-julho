import { MODULES } from "../data/landing-copy";
import { landingIcon } from "./icons";

export function ProductModulesSection() {
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-6">
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

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {MODULES.items.map((m) => {
            const Icon = landingIcon(m.icon);
            return (
              <article
                key={m.title}
                className="flex h-full flex-col rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <p className="mt-3 font-serif text-lg text-card-foreground">{m.title}</p>
                <p className="mt-1 flex-1 text-sm leading-relaxed text-muted-foreground">
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
