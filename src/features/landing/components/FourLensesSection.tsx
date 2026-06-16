import { LENSES, CATEGORY } from "../data/landing-copy";
import { TONE_CLASS } from "./icons";

export function FourLensesSection() {
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-6">
        {/* Nova categoria (banda de transição) */}
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {CATEGORY.eyebrow}
          </p>
          <h2 className="mt-2 font-serif text-2xl text-foreground sm:text-3xl">{CATEGORY.title}</h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">{CATEGORY.text}</p>
        </div>

        {/* As 4 Lentes */}
        <div className="mt-12 text-center">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {LENSES.eyebrow}
          </p>
          <h3 className="mt-2 font-serif text-2xl text-foreground sm:text-3xl">{LENSES.title}</h3>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {LENSES.items.map((lens) => {
            const tone = TONE_CLASS[lens.tone] ?? TONE_CLASS.sky!;
            return (
              <article
                key={lens.q}
                className={`group relative flex h-full flex-col rounded-2xl border border-border/70 bg-card p-5 shadow-sm ring-1 ring-inset ${tone.ring} transition-transform hover:-translate-y-0.5`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex h-8 items-center rounded-lg px-2.5 font-mono text-xs font-semibold ${tone.bg} ${tone.text}`}
                  >
                    {lens.q}
                  </span>
                  <span className={`h-2 w-2 rounded-full ${tone.dot}`} aria-hidden />
                </div>
                <p className="mt-3 font-serif text-xl text-card-foreground">{lens.instrument}</p>
                <p className={`text-xs font-medium uppercase tracking-[0.12em] ${tone.text}`}>
                  {lens.theme}
                </p>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {lens.text}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
