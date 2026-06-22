// Atlas Multissetorial — o portfólio de vitalidade de TODOS os packs registrados,
// computado ao vivo pelo MESMO motor. Dirigido pelo registry: um 6º pack aparece
// aqui sozinho. Prova de board/investidor da opcionalidade multissetorial.
import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/app/shell/AppShell";
import { PACK_REGISTRY } from "@/domain/packs/registry";
import type { ProprietaryIndex } from "@/engine/pack/pack-types";
import {
  buildSectorPortfolio,
  type SectorPortfolioEntry,
  type SectorPortfolioInput,
} from "@/engine/portfolio/cross-sector-engine";
import { getSectorData } from "@/mocks/sector-data";
import { MOMENTUM_COPY } from "@/mocks/trend-mock";

export const Route = createFileRoute("/atlas")({
  head: () => ({ meta: [{ title: "Atlas Multissetorial — VitalOS™" }] }),
  component: AtlasPage,
});

const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

function AtlasPage() {
  const portfolio = useMemo(() => {
    const inputs: SectorPortfolioInput[] = [];
    for (const [packId, bundle] of Object.entries(PACK_REGISTRY)) {
      if (!bundle.index) continue;
      const sector = getSectorData(packId);
      const labels = bundle.pack.labels as { index?: string } | undefined;
      inputs.push({
        packId,
        sectorLabel: bundle.sectorLabel,
        indexLabel: labels?.index ?? "—",
        orgName: sector.org.name,
        participationRate: sector.org.participationRate,
        current: sector.currentCycle,
        previous: sector.previousCycle,
        trend: sector.trendCycles,
        framework: bundle.index as ProprietaryIndex,
      });
    }
    return buildSectorPortfolio(inputs);
  }, []);

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Multissetorial · Engine ≠ Domínio
          </p>
          <h1 className="mt-1 font-serif text-3xl text-foreground sm:text-4xl">
            Atlas da Vitalidade
          </h1>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Todos os setores ativos, medidos agora pelo mesmo motor — só o framework (JSON) muda. É
            a opcionalidade de unicórnio em uma página.
          </p>
        </motion.header>

        {portfolio.count === 0 ? (
          <div className="rounded-3xl border border-dashed border-border/70 bg-card/40 p-8 text-center">
            <p className="font-serif text-xl text-foreground">Nenhum setor com índice publicado</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Registre um Domain Pack com framework para vê-lo aparecer aqui automaticamente.
            </p>
          </div>
        ) : (
          <>
            <section className="grid gap-3 sm:grid-cols-4">
              <Stat
                label="Setores ativos"
                value={`${portfolio.count}`}
                hint="um motor para todos"
              />
              <Stat label="Índice médio" value={`${portfolio.averageScore}`} hint="de 1000" />
              <Stat
                label="Dispersão"
                value={`${portfolio.spread}`}
                hint="amplitude entre setores"
              />
              <Stat
                label="Participação média"
                value={`${portfolio.averageParticipation}%`}
                hint="engajamento agregado"
              />
            </section>

            <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-center">
              <p className="text-sm font-medium text-foreground">
                {portfolio.count} setores, {portfolio.count} frameworks, zero linha de engine
                alterada.
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                <code className="rounded bg-muted px-1 py-0.5">buildSectorPortfolio(setores)</code>{" "}
                compõe <code className="rounded bg-muted px-1 py-0.5">calculateIVO</code> e{" "}
                <code className="rounded bg-muted px-1 py-0.5">buildTrend</code> por setor.
              </p>
            </div>

            <section className="space-y-3">
              {portfolio.sectors.map((entry, i) => (
                <SectorRow key={entry.packId} entry={entry} delay={0.04 * i} />
              ))}
            </section>

            {portfolio.best && portfolio.needsAttention && (
              <section className="grid gap-4 sm:grid-cols-2">
                <Highlight
                  tone="good"
                  eyebrow="Maior vitalidade"
                  title={portfolio.best.sectorLabel}
                  body={`${portfolio.best.indexLabel} ${portfolio.best.score} — ${portfolio.best.maturityName}. Força: ${portfolio.best.topLens?.name ?? "—"}.`}
                />
                <Highlight
                  tone="attention"
                  eyebrow="Onde focar primeiro"
                  title={portfolio.needsAttention.sectorLabel}
                  body={`${portfolio.needsAttention.indexLabel} ${portfolio.needsAttention.score}. Lente mais aberta: ${portfolio.needsAttention.focusLens?.name ?? "—"}.`}
                />
              </section>
            )}
          </>
        )}

        <p className="text-center text-xs text-muted-foreground">
          A mesma arquitetura serve empresa, escola, governo, condomínio e saúde — mudando apenas o
          vocabulário, nunca o motor. Dados-exemplo desta fase mock.
        </p>
      </div>
    </AppShell>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-serif text-3xl text-foreground tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function SectorRow({ entry, delay }: { entry: SectorPortfolioEntry; delay: number }) {
  const momentum = MOMENTUM_COPY[entry.momentum];
  const pct = Math.round((entry.score / 1000) * 100);

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="flex items-baseline gap-2">
          <h2 className="font-serif text-xl text-foreground">{entry.sectorLabel}</h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {entry.indexLabel}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-serif text-3xl font-semibold text-foreground tabular-nums">
            {entry.score}
          </span>
          <span className="text-xs text-muted-foreground">/ 1000</span>
          <span
            className={`text-xs font-medium ${
              entry.delta >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {signed(entry.delta)}
          </span>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span className="font-medium text-primary">{entry.maturityName}</span>
        <span className="text-muted-foreground">·</span>
        <span className={momentum?.color}>
          <span aria-hidden>{momentum?.icon}</span> {momentum?.label ?? entry.momentum}
        </span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">{entry.orgName}</span>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Força:</span> {entry.topLens?.name ?? "—"} (
          {entry.topLens?.score ?? "—"})
        </p>
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Foco:</span> {entry.focusLens?.name ?? "—"}{" "}
          ({entry.focusLens?.score ?? "—"})
        </p>
      </div>
    </motion.article>
  );
}

function Highlight({
  tone,
  eyebrow,
  title,
  body,
}: {
  tone: "good" | "attention";
  eyebrow: string;
  title: string;
  body: string;
}) {
  const cls =
    tone === "good"
      ? "border-emerald-300/50 bg-emerald-50/50 dark:bg-emerald-950/20"
      : "border-amber-300/50 bg-amber-50/50 dark:bg-amber-950/20";
  return (
    <div className={`rounded-2xl border p-5 ${cls}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {eyebrow}
      </p>
      <h3 className="mt-1 font-serif text-xl text-foreground">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
