import { METHODOLOGY } from "../data/landing-copy";

export function MethodologySection() {
  return (
    <section className="border-y border-border/40 bg-muted/20 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {METHODOLOGY.eyebrow}
          </p>
          <h2 className="mt-2 font-serif text-2xl text-foreground sm:text-3xl">
            {METHODOLOGY.title}
          </h2>
        </div>

        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {METHODOLOGY.steps.map((step, i) => (
            <li key={step.key} className="relative">
              {i < METHODOLOGY.steps.length - 1 && (
                <span
                  aria-hidden
                  className="absolute right-[-10px] top-8 hidden text-2xl text-muted-foreground/30 lg:block"
                >
                  →
                </span>
              )}
              <div className="flex h-full flex-col rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 font-mono text-sm font-semibold text-primary">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="mt-3 font-serif text-lg text-card-foreground">{step.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
