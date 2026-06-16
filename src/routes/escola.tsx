import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/app/shell/AppShell";
import { usePack } from "@/engine/pack";
import { calculateIVO, type LensResult } from "@/engine/index/ivo-engine";
import { buildTrend, type TrendPoint } from "@/engine/trend/trend-engine";
import { getSectorData } from "@/mocks/sector-data";
import { MOMENTUM_COPY } from "@/mocks/trend-mock";
import { ESCOLA_INTRO } from "@/mocks/school-mock";

export const Route = createFileRoute("/escola")({
  head: () => ({ meta: [{ title: "Painel da Direção · Vitalidade Escolar — AlegrIA" }] }),
  component: EscolaPage,
});

const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

interface LensFramework {
  id: string;
  guidingQuestion?: string;
  color?: string;
}

function EscolaPage() {
  const { status, index, packId, t } = usePack();

  const data = useMemo(() => {
    if (!index) return null;
    const sector = getSectorData(packId);
    const current = calculateIVO(sector.currentCycle, index);
    const previous = calculateIVO(sector.previousCycle, index);

    // Tendência da escola — compõe o MESMO buildTrend sobre os ciclos do setor.
    const points: TrendPoint[] = sector.trendCycles.map((c) => {
      const r = calculateIVO(c, index);
      return {
        cycleId: r.cycleId,
        label: r.cycleId,
        ivo: r.ivoScore,
        lenses: r.lenses.map((l) => ({ id: l.lensId, name: l.lensName, score: l.score })),
      };
    });
    const trend = buildTrend(points);

    // Lente de menor score visível → "onde focar" (honesto, sem expor ninguém).
    const lensFx = (index.lenses as LensFramework[]) ?? [];
    const questionFor = (id: string) => lensFx.find((l) => l.id === id)?.guidingQuestion ?? "";
    const focus = [...current.lenses].sort((a, b) => a.score - b.score)[0] ?? null;

    return { current, previous, trend, org: sector.org, questionFor, focus };
  }, [index, packId]);

  if (status.state === "loading" || status.state === "idle" || !data) {
    return (
      <AppShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <p className="animate-pulse text-muted-foreground">Lendo a vitalidade da escola…</p>
        </div>
      </AppShell>
    );
  }

  const { current, previous, trend, org, questionFor, focus } = data;
  const delta = current.ivoScore - previous.ivoScore;
  const mom = MOMENTUM_COPY[trend.momentum]!;
  const indexLabel = t("index", "IEV");

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-7 px-4 py-8 sm:px-6">
        {/* Hero */}
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {ESCOLA_INTRO.eyebrow}
          </p>
          <h1 className="mt-1 font-serif text-3xl text-foreground sm:text-4xl">
            {ESCOLA_INTRO.title}
          </h1>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {ESCOLA_INTRO.lead}
          </p>
        </motion.header>

        {/* Cabeçalho de índice */}
        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:col-span-1">
            <p className="text-xs text-muted-foreground">
              {indexLabel} · {org.name}
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-serif text-5xl font-semibold text-foreground">
                {current.ivoScore}
              </span>
              <span
                className={`text-sm font-medium ${delta >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
              >
                {signed(delta)}
              </span>
            </div>
            <p className="text-sm font-medium text-primary">{current.maturityLevel.name}</p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-5">
            <p className="text-xs text-muted-foreground">Participação</p>
            <p className="mt-1 font-serif text-3xl text-foreground">{org.participationRate}%</p>
            <p className="text-xs text-muted-foreground">da comunidade escolar</p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-5">
            <p className="text-xs text-muted-foreground">Momentum</p>
            <p className={`mt-1 font-serif text-2xl ${mom.color}`}>
              <span aria-hidden>{mom.icon}</span> {mom.label}
            </p>
            <p className="text-xs text-muted-foreground">{signed(trend.slopePerCycle)} pts/ciclo</p>
          </div>
        </section>

        {/* As 4 lentes com pergunta-guia */}
        <section>
          <h2 className="mb-3 font-serif text-xl text-foreground">As quatro lentes da escola</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {current.lenses.map((lens) => (
              <LensCard
                key={lens.lensId}
                lens={lens}
                prev={previous.lenses.find((l) => l.lensId === lens.lensId)?.score ?? lens.score}
                question={questionFor(lens.lensId)}
              />
            ))}
          </div>
        </section>

        {/* Onde focar */}
        {focus && (
          <section className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-primary">
              {ESCOLA_INTRO.focusLabel}
            </p>
            <h3 className="mt-1 font-serif text-xl text-foreground">
              {focus.lensName.split(" — ")[0]}
            </h3>
            <p className="mt-1 text-base leading-relaxed text-card-foreground">
              “{questionFor(focus.lensId)}”
            </p>
            <p className="mt-2 text-xs text-muted-foreground">{ESCOLA_INTRO.focusNote}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                to="/ivo"
                className="rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
              >
                Abrir o {indexLabel} completo
              </Link>
              <Link
                to="/evolucao"
                className="rounded-xl border border-border px-4 py-2 text-sm text-foreground transition-colors hover:bg-muted"
              >
                Ver a evolução
              </Link>
            </div>
          </section>
        )}

        {/* Honestidade */}
        <div
          className="rounded-r-xl border-l-4 border-amber-400 bg-amber-50/60 px-5 py-4 dark:bg-amber-950/20"
          role="note"
        >
          <p className="text-xs leading-relaxed text-amber-900 dark:text-amber-300">
            {current.disclaimer}
          </p>
        </div>
      </div>
    </AppShell>
  );
}

function LensCard({ lens, prev, question }: { lens: LensResult; prev: number; question: string }) {
  const diff = lens.score - prev;
  const pct = Math.round((lens.score / 1000) * 100);
  return (
    <article className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {lens.lensName.split(" — ")[0]}
          </p>
          {question && (
            <p className="mt-1 text-sm leading-snug text-card-foreground">“{question}”</p>
          )}
        </div>
        <span
          className="h-3 w-3 shrink-0 rounded-full"
          style={{ background: lens.color }}
          aria-hidden
        />
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-serif text-2xl font-semibold text-card-foreground">{lens.score}</span>
        <span
          className={`text-xs font-medium ${diff >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
        >
          {signed(diff)} vs anterior
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: lens.color }} />
      </div>
    </article>
  );
}
