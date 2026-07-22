import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Shield, Split, Scale, Sigma, Lock, type LucideIcon } from "lucide-react";
import { AppShell } from "@/app/shell/AppShell";
import { EvidenceExplorerCard } from "@/app/evidence/EvidenceExplorerCard";
import {
  CANONICAL_JOURNEY,
  JOURNEY_CAPSTONE,
  JOURNEY_SPINE,
  JOURNEY_RATIONALE,
} from "@/domain/journey";
import { EVIDENCE_REGISTRY } from "@/domain/evidence/registries";
import { METE_GLOSSARY } from "@/mocks/season-mock";
import { METHODOLOGY } from "@/mocks/esg-report-mock";
import {
  METODOLOGIA_HERO,
  SECTIONS,
  GUARDRAILS,
  METODOLOGIA_CLOSING,
} from "@/mocks/metodologia-mock";

export const Route = createFileRoute("/metodologia")({
  head: () => ({ meta: [{ title: "Metodologia · A Ciência da Vitalidade — 4 Lentes VitalOS™" }] }),
  component: MetodologiaPage,
});

const GUARDRAIL_ICON: Record<string, LucideIcon> = {
  shield: Shield,
  split: Split,
  scale: Scale,
  sigma: Sigma,
  lock: Lock,
};

function MetodologiaPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-12 px-4 py-10 sm:px-6">
        {/* Hero */}
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {METODOLOGIA_HERO.eyebrow}
          </p>
          <h1 className="mt-2 font-serif text-3xl leading-tight text-foreground sm:text-4xl">
            {METODOLOGIA_HERO.title}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {METODOLOGIA_HERO.lead}
          </p>
        </motion.header>

        {/* 1 · Jornada (compõe CANONICAL_JOURNEY) */}
        <Section title={SECTIONS.jornada.title} lead={SECTIONS.jornada.lead}>
          <p className="mb-5 inline-flex rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            {JOURNEY_SPINE}
          </p>
          <div className="space-y-3">
            {CANONICAL_JOURNEY.map((s, i) => (
              <article
                key={s.key}
                className="flex gap-4 rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-serif text-base font-semibold text-white"
                  style={{ background: s.color }}
                  aria-hidden
                >
                  {i + 1}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <h3 className="font-serif text-lg text-foreground">{s.seasonName}</h3>
                    <span className="text-xs font-medium" style={{ color: s.color }}>
                      {s.instrument}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm font-medium text-card-foreground">
                    “{s.guidingQuestion}”
                  </p>
                  <p className="mt-1.5 text-base leading-relaxed text-muted-foreground">
                    {s.rationale}
                  </p>
                </div>
              </article>
            ))}
            {/* Capstone */}
            <article className="flex gap-4 rounded-2xl border border-dashed border-border bg-muted/30 p-5">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-serif text-base font-semibold text-white"
                style={{ background: "#64748B" }}
                aria-hidden
              >
                ✓
              </div>
              <div>
                <h3 className="font-serif text-lg text-foreground">{JOURNEY_CAPSTONE.name}</h3>
                <p className="mt-1.5 text-base leading-relaxed text-muted-foreground">
                  {JOURNEY_CAPSTONE.description}
                </p>
              </div>
            </article>
          </div>
        </Section>

        {/* 2 · Ciclo M.E.T.E. (compõe METE_GLOSSARY) */}
        <Section title={SECTIONS.mete.title} lead={SECTIONS.mete.lead}>
          <ol className="grid gap-3 sm:grid-cols-2">
            {METE_GLOSSARY.map((phase, i) => (
              <li
                key={phase.id}
                className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="font-serif text-lg text-foreground">{phase.label}</h3>
                </div>
                <p className="mt-1.5 text-base leading-relaxed text-muted-foreground">
                  {phase.gist}
                </p>
              </li>
            ))}
          </ol>
        </Section>

        {/* 3 · Ciência por instrumento (compõe METHODOLOGY) */}
        <Section title={SECTIONS.ciencia.title} lead={SECTIONS.ciencia.lead}>
          <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
            {METHODOLOGY.map((m, i) => (
              <div
                key={m.instrument}
                className={`grid gap-1 p-5 sm:grid-cols-[180px_1fr] sm:gap-4 ${
                  i > 0 ? "border-t border-border/60" : ""
                }`}
              >
                <p className="font-serif text-base text-foreground">{m.instrument}</p>
                <div>
                  <p className="text-sm text-card-foreground">{m.measures}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{m.science}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* 4 · Corpus de evidência (LD-005, Fatia B — compõe evidence-explorer-engine) */}
        <Section title={SECTIONS.evidencias.title} lead={SECTIONS.evidencias.lead}>
          <EvidenceExplorerCard registry={EVIDENCE_REGISTRY} />
        </Section>

        {/* 5 · Compromissos éticos (GUARDRAILS — a doutrina como feature) */}
        <Section title={SECTIONS.etica.title} lead={SECTIONS.etica.lead}>
          <div className="grid gap-3 sm:grid-cols-2">
            {GUARDRAILS.map((g) => {
              const Icon = GUARDRAIL_ICON[g.icon] ?? Shield;
              return (
                <article
                  key={g.title}
                  className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <h3 className="font-serif text-base text-foreground">{g.title}</h3>
                  </div>
                  <p className="mt-2 text-base leading-relaxed text-muted-foreground">{g.desc}</p>
                </article>
              );
            })}
          </div>
        </Section>

        {/* Fechamento */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="rounded-2xl border border-border/70 bg-gradient-to-br from-card to-muted/30 p-6 text-center shadow-sm"
        >
          <h2 className="font-serif text-2xl text-foreground">{METODOLOGIA_CLOSING.title}</h2>
          <p className="mx-auto mt-2 max-w-xl text-base leading-relaxed text-muted-foreground">
            {METODOLOGIA_CLOSING.lead}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              to="/temporada"
              className="rounded-xl bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              Ver a jornada na prática
            </Link>
            <Link
              to="/relatorio-global"
              className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Ver a prova do ano
            </Link>
          </div>
        </motion.section>
      </div>
    </AppShell>
  );
}

function Section({
  title,
  lead,
  children,
}: {
  title: string;
  lead: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.4 }}
    >
      <h2 className="font-serif text-2xl text-foreground">{title}</h2>
      <p className="mt-1.5 max-w-2xl text-base leading-relaxed text-muted-foreground">{lead}</p>
      <div className="mt-5">{children}</div>
    </motion.section>
  );
}
