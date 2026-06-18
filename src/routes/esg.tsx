import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/app/shell/AppShell";
import { usePack } from "@/engine/pack";
import { calculateIVO } from "@/engine/index/ivo-engine";
import {
  deriveEsgReadiness,
  type EsgBand,
  type EsgReadiness,
  type FrameworkCoverage,
  type PillarScore,
} from "@/engine/esg/esg-engine";
import { ESG_MAPPING, ESG_INTRO, KIND_LABEL } from "@/mocks/esg-mock";
import { ivoCurrentCycle } from "@/mocks/ivo-mock";

export const Route = createFileRoute("/esg")({
  head: () => ({ meta: [{ title: "ESG · ODS · FIB — 4 Lentes VitalOS™" }] }),
  component: EsgPage,
});

const BAND_STYLE: Record<EsgBand, { dot: string; text: string }> = {
  em_formacao: { dot: "bg-red-500", text: "text-red-700 dark:text-red-300" },
  em_progresso: { dot: "bg-amber-500", text: "text-amber-700 dark:text-amber-300" },
  consolidando: { dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-300" },
  maduro: { dot: "bg-green-600", text: "text-green-700 dark:text-green-300" },
};

function EsgPage() {
  const { index } = usePack();

  const readiness = useMemo(() => {
    if (!index) return null;
    const result = calculateIVO(ivoCurrentCycle, index);
    const pillars: PillarScore[] = result.lenses.flatMap((l) =>
      l.pillars.map((p) => ({
        pillarId: p.pillarId,
        name: p.pillarName,
        score: p.score,
        visible: p.visible,
      })),
    );
    return deriveEsgReadiness(pillars, ESG_MAPPING);
  }, [index]);

  if (!readiness) {
    return (
      <AppShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <p className="animate-pulse text-muted-foreground">Traduzindo vitalidade em ESG…</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {ESG_INTRO.eyebrow}
          </p>
          <h1 className="mt-1 font-serif text-3xl text-foreground">{ESG_INTRO.title}</h1>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {ESG_INTRO.lead}
          </p>
        </motion.div>

        <OverviewCard readiness={readiness} />

        <div className="space-y-6">
          {readiness.frameworks.map((fw, i) => (
            <FrameworkCard key={fw.id} fw={fw} delay={0.1 + i * 0.05} />
          ))}
        </div>

        {/* Disclaimer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45, delay: 0.3 }}
          className="rounded-r-xl border-l-4 bg-amber-50/60 px-5 py-4 dark:bg-amber-950/20"
          style={{ borderLeftColor: "#C9A227" }}
          role="note"
        >
          <p className="text-xs leading-relaxed text-amber-900 dark:text-amber-300">
            {ESG_INTRO.disclaimer}
          </p>
        </motion.div>

        <p className="text-center text-xs text-muted-foreground">
          Os scores vêm do{" "}
          <Link to="/ivo" className="underline underline-offset-2 hover:text-foreground">
            IVO
          </Link>{" "}
          do ciclo corrente. Mude o IVO e o ESG se move junto.
        </p>
      </div>
    </AppShell>
  );
}

// ─── Visão geral ────────────────────────────────────────────────────────────────

function OverviewCard({ readiness }: { readiness: EsgReadiness }) {
  const overall = readiness.overallScore;
  const band = readiness.overallBand;
  const coverage = Math.round(
    (readiness.measurableDatapoints / Math.max(1, readiness.totalDatapoints)) * 100,
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.05 }}
      className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm"
    >
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-xs text-muted-foreground">Prontidão social agregada</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-serif text-5xl font-semibold leading-none text-foreground">
              {overall ?? "—"}
            </span>
            <span className="text-sm text-muted-foreground">/ 1000</span>
          </div>
          {band && (
            <span
              className={`mt-2 inline-flex items-center gap-1.5 text-sm font-medium ${BAND_STYLE[band].text}`}
            >
              <span className={`h-2 w-2 rounded-full ${BAND_STYLE[band].dot}`} aria-hidden />
              {readiness.overallBandLabel}
            </span>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Datapoints mensuráveis</p>
          <p className="font-serif text-3xl font-semibold text-foreground">
            {readiness.measurableDatapoints}
            <span className="text-base text-muted-foreground">/{readiness.totalDatapoints}</span>
          </p>
          <p className="text-xs text-muted-foreground">{coverage}% de cobertura</p>
        </div>
      </div>

      {/* Framework chips */}
      <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {readiness.frameworks.map((fw) => (
          <div
            key={fw.id}
            className="rounded-xl border border-border/60 bg-background/40 px-3 py-2.5"
          >
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-sm"
                style={{ background: fw.color }}
                aria-hidden
              />
              <span className="text-xs font-medium text-card-foreground">
                {fw.name.split(" — ")[0]}
              </span>
            </div>
            <p className="mt-1 font-serif text-xl text-foreground">{fw.score ?? "—"}</p>
            {fw.band && (
              <span className={`text-xs font-medium ${BAND_STYLE[fw.band].text}`}>
                {fw.bandLabel}
              </span>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Card por framework ──────────────────────────────────────────────────────────

function FrameworkCard({ fw, delay }: { fw: FrameworkCoverage; delay: number }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay }}
      className="rounded-2xl border border-border/70 bg-card shadow-sm"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 rounded-sm" style={{ background: fw.color }} aria-hidden />
          <div>
            <p className="font-medium text-card-foreground">{fw.name}</p>
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
              {KIND_LABEL[fw.kind]}
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="font-serif text-2xl text-foreground">{fw.score ?? "—"}</span>
          {fw.band && (
            <span className={`ml-2 text-xs font-medium ${BAND_STYLE[fw.band].text}`}>
              {fw.bandLabel}
            </span>
          )}
        </div>
      </header>

      <div className="divide-y divide-border/40">
        {fw.datapoints.map((dp) => (
          <div key={dp.code} className="px-5 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                    {dp.code}
                  </span>
                  <span className="text-sm text-card-foreground">{dp.label}</span>
                </div>
                {dp.rationale && (
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {dp.rationale}
                  </p>
                )}
                {/* Pilares de origem */}
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {dp.coveredPillars.map((p) => (
                    <span
                      key={p.pillarId}
                      className="rounded-full border border-border/50 px-2 py-0.5 text-[9px] text-muted-foreground"
                      title={`${p.name}: ${p.score}`}
                    >
                      {p.name} · {p.score}
                    </span>
                  ))}
                </div>
                {dp.hiddenPillarIds.length > 0 && (
                  <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                    {dp.hiddenPillarIds.length} pilar(es) oculto(s) por k-anonimato (n&lt;5).
                  </p>
                )}
              </div>

              <div className="shrink-0 text-right">
                {dp.score !== null && dp.band ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className={`h-2 w-2 rounded-full ${BAND_STYLE[dp.band].dot}`}
                      aria-hidden
                    />
                    <span className="font-medium tabular-nums text-foreground">{dp.score}</span>
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">não mensurável</span>
                )}
              </div>
            </div>

            {/* Barra de score */}
            {dp.score !== null && (
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(dp.score / 1000) * 100}%`, background: fw.color }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </motion.section>
  );
}
