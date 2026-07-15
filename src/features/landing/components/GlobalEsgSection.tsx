import { Check } from "lucide-react";
import { GLOBAL_ESG } from "../data/landing-copy";
import reportCover from "@/assets/relatorio-global-esg-cover-3d.jpg";

export function GlobalEsgSection() {
  return (
    <section className="py-8 sm:py-12">
      <div className="mx-auto max-w-6xl px-6">
        <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-card to-muted/40 p-6 shadow-sm sm:p-10">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[color-mix(in_oklab,var(--color-accent)_16%,transparent)] blur-3xl"
          />
          <div className="relative grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:grid-rows-[auto_auto] lg:items-start lg:gap-x-10">
            {/* Bloco A — Eyebrow + badge (topo em ambos) */}
            <div className="order-1 lg:col-start-1 lg:row-start-1">
              <p className="text-xs uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
                {GLOBAL_ESG.eyebrow}
              </p>
              <span className="mt-2 inline-flex rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                {GLOBAL_ESG.badge}
              </span>
            </div>

            {/* Bloco B — Capa 3D. Mobile: entra logo após o badge. Desktop: coluna direita, centralizada nas duas linhas. */}
            <figure className="order-2 relative mx-auto w-full max-w-xs sm:max-w-sm lg:max-w-md lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:self-center">
              <div
                aria-hidden
                className="absolute -inset-6 rounded-[2rem] bg-[radial-gradient(circle_at_50%_40%,color-mix(in_oklab,var(--color-accent)_22%,transparent),transparent_70%)] blur-2xl"
              />
              <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-2xl ring-1 ring-black/5">
                <img
                  src={reportCover}
                  alt="Capa hardcover do Relatório Global ESG VitalOS™ — linho verde-profundo com marca em foil dourado, sobre mesa de conselho"
                  className="block h-auto w-full"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <figcaption className="mt-3 text-center text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Edição anual · Board-ready
              </figcaption>
            </figure>

            {/* Bloco C — Título + descrição + bullets */}
            <div className="order-3 lg:col-start-1 lg:row-start-2">
              <h2 className="font-serif text-2xl text-foreground sm:text-3xl">
                {GLOBAL_ESG.title}
              </h2>
              <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground">
                {GLOBAL_ESG.text}
              </p>

              <ul className="mt-6 grid gap-2.5">
                {GLOBAL_ESG.points.map((p) => (
                  <li
                    key={p}
                    className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/60 px-4 py-3 backdrop-blur"
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Check className="h-3 w-3" aria-hidden />
                    </span>
                    <span className="text-sm text-card-foreground">{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
