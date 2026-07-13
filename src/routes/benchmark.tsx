import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppShell } from "@/app/shell/AppShell";
import { DataSourceBadge } from "@/app/shell/DataSourceBadge";
import { useIvo } from "@/mocks/hooks";
import { buildBenchmark, type BenchmarkRow } from "@/engine/benchmark/benchmark-engine";
import {
  SECTOR_COHORTS,
  orgMetricsFromIvo,
  POSITION_COPY,
  BENCHMARK_INTRO,
} from "@/mocks/benchmark-mock";

export const Route = createFileRoute("/benchmark")({
  head: () => ({ meta: [{ title: "Benchmark Setorial — 4 Lentes VitalOS™" }] }),
  component: BenchmarkPage,
});

const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

function BenchmarkPage() {
  const { current } = useIvo();
  const [cohortId, setCohortId] = useState(SECTOR_COHORTS[0]!.cohortId);

  const result = useMemo(() => {
    if (!current) return null;
    const cohort = SECTOR_COHORTS.find((c) => c.cohortId === cohortId) ?? SECTOR_COHORTS[0]!;
    return buildBenchmark(orgMetricsFromIvo(current), cohort);
  }, [current, cohortId]);

  if (!result) {
    return (
      <AppShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <p className="animate-pulse text-muted-foreground">Comparando com o setor…</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {BENCHMARK_INTRO.eyebrow}
            </p>
            <DataSourceBadge source="mock" />
          </div>
          <h1 className="mt-1 font-serif text-3xl text-foreground">{BENCHMARK_INTRO.title}</h1>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {BENCHMARK_INTRO.lead}
          </p>
        </motion.div>

        {/* Seletor de coorte */}
        <div>
          <p className="mb-1.5 text-xs uppercase tracking-[0.12em] text-muted-foreground">
            Coorte de comparação
          </p>
          <div className="flex flex-wrap gap-2">
            {SECTOR_COHORTS.map((c) => (
              <button
                key={c.cohortId}
                onClick={() => setCohortId(c.cohortId)}
                aria-pressed={cohortId === c.cohortId}
                className={`rounded-xl border px-3 py-2 text-left text-sm transition-all ${
                  cohortId === c.cohortId
                    ? "border-foreground/40 bg-card shadow-sm"
                    : "border-border/60 bg-card/50 hover:border-border"
                }`}
              >
                <span className="block font-medium text-card-foreground">
                  {c.label.split(" · ")[0]}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {c.label.split(" · ")[1]}
                </span>
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {!result.available ? (
            <ProtectedCohort key="protected" result={result} />
          ) : (
            <motion.div
              key={result.cohortId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {result.overall && <OverallHero overall={result.overall} nOrgs={result.nOrgs} />}

              {/* Lidera / fica atrás */}
              <div className="grid gap-4 sm:grid-cols-2">
                <LeadLagList
                  title="Onde você lidera"
                  rows={result.leads.slice(0, 4)}
                  empty="Ainda sem destaques acima da mediana."
                  good
                />
                <LeadLagList
                  title="Onde você fica atrás"
                  rows={result.lags.slice(0, 4)}
                  empty="Nenhum recorte abaixo da mediana."
                />
              </div>

              {/* Maior oportunidade */}
              {result.topOpportunity && (
                <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
                  <p className="text-xs uppercase tracking-[0.12em] text-primary">
                    Maior oportunidade vs. o setor
                  </p>
                  <p className="mt-1.5 text-base leading-relaxed text-foreground">
                    <span className="font-medium">{result.topOpportunity.label}</span> está{" "}
                    {Math.abs(result.topOpportunity.gapToMedian)} pts abaixo da mediana do coorte —
                    o maior ganho relativo disponível.
                  </p>
                  <Link
                    to="/prioridades"
                    className="mt-2 inline-block text-xs text-primary underline underline-offset-2"
                  >
                    priorizar esta lacuna →
                  </Link>
                </div>
              )}

              {/* Comparação por métrica */}
              <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
                <h2 className="mb-4 font-serif text-lg text-foreground">
                  Sua posição na distribuição
                </h2>
                <div className="space-y-4">
                  {result.rows
                    .filter((r) => r.kind !== "ivo")
                    .map((r) => (
                      <MetricRow key={r.metricId} row={r} />
                    ))}
                </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Honestidade */}
        <div
          className="rounded-r-xl border-l-4 border-amber-400 bg-amber-50/60 px-5 py-4 dark:bg-amber-950/20"
          role="note"
        >
          <p className="text-xs leading-relaxed text-amber-900 dark:text-amber-300">
            {BENCHMARK_INTRO.disclaimer}
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          O benchmark parte do seu{" "}
          <Link to="/ivo" className="underline underline-offset-2 hover:text-foreground">
            IVO
          </Link>{" "}
          e a oportunidade vira ação nas{" "}
          <Link to="/prioridades" className="underline underline-offset-2 hover:text-foreground">
            Prioridades
          </Link>
          .
        </p>
      </div>
    </AppShell>
  );
}

// ─── Coorte protegido (k-anon entre tenants) ──────────────────────────────────

function ProtectedCohort({ result }: { result: ReturnType<typeof buildBenchmark> }) {
  return (
    <motion.div
      key="protected"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border border-border/70 bg-card p-8 text-center shadow-sm"
    >
      <span className="text-3xl" aria-hidden>
        🔒
      </span>
      <h2 className="mt-2 font-serif text-xl text-foreground">Coorte protegido</h2>
      <p className="mx-auto mt-2 max-w-md text-base leading-relaxed text-muted-foreground">
        {BENCHMARK_INTRO.protectedNote}
      </p>
      <p className="mt-3 text-xs text-muted-foreground">
        {result.nOrgs} de {result.minOrgs} organizações mínimas neste coorte.
      </p>
    </motion.div>
  );
}

// ─── Hero geral (IVO) ─────────────────────────────────────────────────────────

function OverallHero({ overall, nOrgs }: { overall: BenchmarkRow; nOrgs: number }) {
  const pos = POSITION_COPY[overall.position]!;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground">IVO global vs. coorte</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-serif text-5xl text-foreground">{overall.score}</span>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${pos.bg} ${pos.color}`}>
              {pos.label}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Percentil ~{overall.percentile} · {signed(overall.gapToMedian)} vs. mediana · {nOrgs}{" "}
            organizações no coorte (anônimas)
          </p>
        </div>
      </div>
      <div className="mt-4">
        <DistributionBar row={overall} />
      </div>
    </motion.div>
  );
}

// ─── Lista lidera/atrás ───────────────────────────────────────────────────────

function LeadLagList({
  title,
  rows,
  empty,
  good,
}: {
  title: string;
  rows: BenchmarkRow[];
  empty: string;
  good?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <h3 className="mb-3 font-medium text-card-foreground">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.metricId} className="flex items-center justify-between gap-2">
              <span className="truncate text-sm text-card-foreground">{r.label}</span>
              <span
                className={`shrink-0 text-xs font-medium ${
                  good
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-amber-600 dark:text-amber-400"
                }`}
              >
                {signed(r.gapToMedian)} · p{r.percentile}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Linha de métrica + barra de distribuição ─────────────────────────────────

function MetricRow({ row }: { row: BenchmarkRow }) {
  const pos = POSITION_COPY[row.position]!;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-sm text-card-foreground">{row.label}</span>
        <span className={`text-xs font-medium ${pos.color}`}>
          {row.score} · {signed(row.gapToMedian)} vs. mediana
        </span>
      </div>
      <DistributionBar row={row} />
    </div>
  );
}

function DistributionBar({ row }: { row: BenchmarkRow }) {
  const lo = Math.max(0, Math.min(row.p25, row.score) - 30);
  const hi = Math.max(row.p75, row.score) + 30;
  const span = hi - lo || 1;
  const pct = (v: number) => `${((v - lo) / span) * 100}%`;
  const markColor =
    row.position === "lider"
      ? "bg-violet-500"
      : row.position === "acima"
        ? "bg-emerald-500"
        : row.position === "mediana"
          ? "bg-sky-500"
          : "bg-amber-500";

  return (
    <div className="relative h-3 overflow-hidden rounded-full bg-muted">
      {/* Faixa interquartil p25–p75 */}
      <div
        className="absolute inset-y-0 bg-foreground/15"
        style={{ left: pct(row.p25), width: `calc(${pct(row.p75)} - ${pct(row.p25)})` }}
      />
      {/* Mediana */}
      <div
        className="absolute inset-y-0 w-px bg-foreground/40"
        style={{ left: pct(row.median) }}
        aria-hidden
      />
      {/* Marcador da org */}
      <div
        className={`absolute inset-y-0 w-1.5 rounded-full ${markColor}`}
        style={{ left: `calc(${pct(row.score)} - 3px)` }}
        aria-hidden
      />
    </div>
  );
}
