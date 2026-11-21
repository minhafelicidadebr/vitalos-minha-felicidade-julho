import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { AppShell } from "@/app/shell/AppShell";
import {
  PROGRAMA_HERO,
  PROGRAMA_PROBLEM,
  PROGRAMA_HIERARCHY,
  PROGRAMA_JOURNEY,
  PROGRAMA_DIFFERENTIATORS,
  PROGRAMA_TIERS,
  PROGRAMA_CLOSING,
  PROGRAMA_Q1_OFFER as Q1,
  type ProgramaTier,
} from "@/mocks/programa-mock";

export const Route = createFileRoute("/programa")({
  head: () => ({ meta: [{ title: "O Programa · Metodologia — 4 Lentes VitalOS™" }] }),
  component: ProgramaPage,
});

function ProgramaPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-16 px-4 py-10 sm:px-6">
        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {PROGRAMA_HERO.eyebrow}
          </p>
          <h1 className="mx-auto mt-3 max-w-3xl font-serif text-4xl leading-tight text-foreground sm:text-5xl">
            {PROGRAMA_HERO.category}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {PROGRAMA_HERO.promise}
          </p>
          <p className="mx-auto mt-2 max-w-xl font-serif text-lg italic text-foreground/80">
            {PROGRAMA_HERO.subpromise}
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              to={PROGRAMA_HERO.primaryCta.to}
              className="rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
            >
              {PROGRAMA_HERO.primaryCta.label}
            </Link>
            <Link
              to={PROGRAMA_HERO.secondaryCta.to}
              className="rounded-xl border border-border px-6 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {PROGRAMA_HERO.secondaryCta.label}
            </Link>
          </div>
        </motion.section>

        {/* Problema (agitação) */}
        <section className="rounded-2xl border border-border/60 bg-muted/30 p-6 sm:p-8">
          <h2 className="font-serif text-2xl text-foreground">{PROGRAMA_PROBLEM.title}</h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {PROGRAMA_PROBLEM.bullets.map((b) => (
              <li key={b} className="flex gap-2 text-base leading-relaxed text-muted-foreground">
                <span className="text-red-500/60" aria-hidden>
                  ✕
                </span>
                {b}
              </li>
            ))}
          </ul>
        </section>

        {/* A jornada (o método) */}
        <section>
          <SectionTitle eyebrow="A metodologia" title="Uma jornada de 12 meses, em quatro lentes" />
          <div className="mt-6 grid gap-3 sm:grid-cols-5">
            {PROGRAMA_JOURNEY.map((j, i) => (
              <div
                key={j.q}
                className={`relative rounded-2xl border p-4 ${
                  j.q === "Q5" ? "border-primary/40 bg-primary/5" : "border-border/60 bg-card"
                }`}
              >
                {i < PROGRAMA_JOURNEY.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute right-[-9px] top-8 hidden text-muted-foreground/40 sm:block"
                  >
                    →
                  </span>
                )}
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{j.q}</p>
                <p className="mt-1 text-sm font-medium text-card-foreground">{j.lens}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{j.promise}</p>
              </div>
            ))}
          </div>
        </section>

        {/* A hierarquia corrigida */}
        <section>
          <SectionTitle eyebrow="A arquitetura" title="Cada camada no seu lugar — sem confusão" />
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            As 4 Lentes são a <strong className="text-foreground">marca</strong> (EU·NÓS·LIDERANÇA·
            ORGANIZAÇÃO). A jornada de instrumentos é a{" "}
            <strong className="text-foreground">metodologia</strong>. O IVO é o índice integrador.
          </p>
          <div className="mt-5 overflow-hidden rounded-2xl border border-border/70 bg-card">
            {PROGRAMA_HIERARCHY.map((h, i) => (
              <div
                key={h.layer}
                className={`flex flex-wrap items-baseline gap-x-4 gap-y-1 px-5 py-3.5 ${
                  i > 0 ? "border-t border-border/40" : ""
                }`}
              >
                <span className="w-36 shrink-0 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  {h.layer}
                </span>
                <span className="font-serif text-lg text-foreground">{h.value}</span>
                <span className="flex-1 text-[12px] leading-relaxed text-muted-foreground">
                  {h.note}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Diferenciação */}
        <section className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm sm:p-8">
          <h2 className="font-serif text-2xl text-foreground">O que nenhum concorrente oferece</h2>
          <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {PROGRAMA_DIFFERENTIATORS.map((d) => (
              <li key={d} className="flex gap-2 text-base leading-relaxed text-foreground">
                <span className="text-emerald-500/70" aria-hidden>
                  ✓
                </span>
                {d}
              </li>
            ))}
          </ul>
        </section>

        {/* Os 3 níveis de contratação */}
        <section>
          <SectionTitle eyebrow="Como contratar" title="Três formas de começar" />
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {PROGRAMA_TIERS.map((t) => (
              <TierCard key={t.id} tier={t} />
            ))}
          </div>
        </section>

        {/* Q1 · oferta de serviços */}
        <section aria-labelledby="q1-offer" className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{Q1.eyebrow}</p>
          <h2 id="q1-offer" className="mt-1 font-serif text-2xl text-foreground sm:text-3xl">
            {Q1.title}
          </h2>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-muted-foreground">{Q1.text}</p>
          <ul className="mt-5 grid gap-2 sm:grid-cols-2">
            {Q1.deliverables.map((d) => (
              <li key={d.label} className="flex flex-wrap items-start gap-2 rounded-lg border border-border p-3 text-sm">
                <span
                  className={
                    d.status === "available"
                      ? "rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                      : "rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                  }
                >
                  {Q1.statusLabels[d.status]}
                </span>
                <span className="min-w-0 flex-1 text-foreground">{d.label}</span>
              </li>
            ))}
          </ul>
          <p role="note" className="mt-4 rounded-lg bg-muted/60 p-3 text-sm text-foreground">
            {Q1.collectionStatus}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">{Q1.disclaimer}</p>
          <a
            href={Q1.cta.href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex min-h-11 items-center rounded-xl border border-primary/40 px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-primary/5"
          >
            {Q1.cta.label}
          </a>
        </section>

        {/* Fechamento */}
        <section className="rounded-2xl border border-primary/30 bg-primary/5 p-8 text-center">
          <h2 className="mx-auto max-w-xl font-serif text-2xl text-foreground">
            {PROGRAMA_CLOSING.title}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {PROGRAMA_CLOSING.text}
          </p>
          <Link
            to={PROGRAMA_CLOSING.cta.to}
            className="mt-6 inline-block rounded-xl bg-primary px-7 py-3 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
          >
            {PROGRAMA_CLOSING.cta.label}
          </Link>
        </section>
      </div>
    </AppShell>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{eyebrow}</p>
      <h2 className="mt-1 font-serif text-2xl text-foreground sm:text-3xl">{title}</h2>
    </div>
  );
}

function TierCard({ tier }: { tier: ProgramaTier }) {
  return (
    <div
      className={`flex flex-col rounded-2xl border p-6 shadow-sm ${
        tier.featured
          ? "border-primary/50 bg-card ring-1 ring-primary/20"
          : "border-border/70 bg-card"
      }`}
    >
      {tier.featured && (
        <span className="mb-3 w-fit rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
          Mais escolhido
        </span>
      )}
      <h3 className="font-serif text-xl text-foreground">{tier.name}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{tier.tagline}</p>
      <p className="mt-3 text-xs uppercase tracking-[0.1em] text-muted-foreground">{tier.forWho}</p>
      <ul className="mt-3 flex-1 space-y-2">
        {tier.includes.map((it) => (
          <li key={it} className="flex gap-2 text-[13px] leading-relaxed text-card-foreground">
            <span className="text-primary" aria-hidden>
              ✓
            </span>
            {it}
          </li>
        ))}
      </ul>
      <Link
        to={tier.cta.to}
        className={`mt-5 rounded-xl px-4 py-2.5 text-center text-sm font-medium transition-opacity hover:opacity-90 ${
          tier.featured
            ? "bg-primary text-primary-foreground"
            : "border border-border text-foreground hover:bg-muted"
        }`}
      >
        {tier.cta.label}
      </Link>
    </div>
  );
}
