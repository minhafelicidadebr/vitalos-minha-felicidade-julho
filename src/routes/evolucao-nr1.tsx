// /evolucao-nr1 — Reavaliação NR-1: o eixo EVOLUIR da lane NR-1. Compõe o reavaliacao-engine
// (puro): a exposição COPSOQ medida ao longo de vários ciclos prova o antes/depois após o PGR.
// Compõe também o pgr-engine (plano do período) para a leitura honesta de eficácia. Honestidade:
// associação orientativa, nunca causalidade; k-anon respeitado; severidade estrutural.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowLeft, ArrowRight, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { AppShell } from "@/app/shell/AppShell";
import { buildReavaliacao, type RiskTrend } from "@/engine/nr1/reavaliacao-engine";
import { buildPgrPlan, RISK_LABEL, type RiskLevel } from "@/engine/nr1/pgr-engine";
import { NR1_CROSSWALK, DEMO_COPSOQ_EXPOSURE } from "@/mocks/nr1-crosswalk-mock";
import {
  NR1_CYCLES,
  NR1_MEASURE_MAINTENANCE,
  REAVALIACAO_INTRO,
} from "@/mocks/nr1-reavaliacao-mock";
import { PGR_MEASURES } from "@/mocks/pgr-nr1-mock";

export const Route = createFileRoute("/evolucao-nr1")({
  head: () => ({ meta: [{ title: "Reavaliação NR-1 — 4 Lentes VitalOS™" }] }),
  component: ReavaliacaoPage,
});

const RISK_TINT: Record<RiskLevel, string> = {
  critico: "border-red-400/50 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  alto: "border-orange-400/50 bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
  moderado: "border-amber-400/50 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300",
  baixo: "border-emerald-400/50 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300",
};

const TREND_META: Record<RiskTrend, { icon: typeof TrendingDown; tint: string; label: string }> = {
  melhorando: { icon: TrendingDown, tint: "text-emerald-600 dark:text-emerald-400", label: "Melhorando" },
  estavel: { icon: Minus, tint: "text-muted-foreground", label: "Estável" },
  piorando: { icon: TrendingUp, tint: "text-orange-600 dark:text-orange-400", label: "Piorando" },
};

/** Sparkline de exposição (alto = pior); cor pela tendência. */
function Sparkline({ values, trend }: { values: number[]; trend: RiskTrend }) {
  const w = 88;
  const h = 28;
  const max = 100;
  const stroke =
    trend === "melhorando" ? "#10b981" : trend === "piorando" ? "#f97316" : "currentColor";
  const pts = values.map((v, i) => {
    const x = values.length > 1 ? (i / (values.length - 1)) * (w - 4) + 2 : w / 2;
    const y = h - 2 - (v / max) * (h - 4);
    return [x, y] as const;
  });
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1]!;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="text-muted-foreground/40" aria-hidden>
      <path d={d} fill="none" stroke={stroke} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r={2.4} fill={stroke} />
    </svg>
  );
}

function ReavaliacaoPage() {
  const result = useMemo(() => {
    // PGR ao fim do ciclo (semana 13) → medidas de fonte implementadas, base da eficácia.
    const pgrPlan = buildPgrPlan({
      registry: NR1_CROSSWALK,
      exposures: DEMO_COPSOQ_EXPOSURE,
      measures: PGR_MEASURES,
      generatedAt: NR1_CROSSWALK.updatedAt,
      currentWeek: 13,
      horizonWeeks: 13,
      topRisks: 5,
    });
    return buildReavaliacao({
      registry: NR1_CROSSWALK,
      cycles: NR1_CYCLES,
      pgrPlan,
      maintenanceByDriver: NR1_MEASURE_MAINTENANCE,
    });
  }, []);

  const overall = TREND_META[result.overallTrend];
  const OverallIcon = overall.icon;
  const reductionPct =
    result.meanFirst > 0 ? Math.round((-result.meanDelta / result.meanFirst) * 100) : 0;

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-7 px-4 py-8 sm:px-6">
        {/* Hero */}
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-primary">
            <OverallIcon className="h-4 w-4" aria-hidden />
            {REAVALIACAO_INTRO.eyebrow}
          </div>
          <h1 className="mt-2 font-serif text-3xl text-foreground sm:text-4xl">
            {REAVALIACAO_INTRO.title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {REAVALIACAO_INTRO.subtitle}
          </p>
        </motion.header>

        {/* Banner agregado */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08 }}
          className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className={`flex items-center gap-1.5 text-sm font-medium ${overall.tint}`}>
                <OverallIcon className="h-4 w-4" aria-hidden /> Exposição média {overall.label.toLowerCase()}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Média das dimensões COPSOQ visíveis (k ≥ 5), do primeiro ao último ciclo.
              </p>
            </div>
            <div className="flex items-end gap-4">
              <Stat label={result.cycles[0]?.label ?? "—"} value={String(result.meanFirst)} muted />
              <ArrowRight className="mb-2 h-4 w-4 text-muted-foreground" aria-hidden />
              <Stat
                label={result.cycles[result.cycles.length - 1]?.label ?? "—"}
                value={String(result.meanLast)}
                tint={overall.tint}
              />
              {reductionPct > 0 && (
                <span className="mb-1 rounded-full border border-emerald-400/50 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                  −{reductionPct}%
                </span>
              )}
            </div>
          </div>
        </motion.section>

        {/* Eficácia honesta */}
        {result.efficacy && result.efficacy.withSourceMeasure > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.12 }}
            className="rounded-2xl border border-border/60 bg-card p-5"
          >
            <p className="font-medium text-card-foreground">Leitura de eficácia</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Dos{" "}
              <span className="font-semibold text-foreground">{result.efficacy.withSourceMeasure}</span>{" "}
              drivers com medida de fonte implementada,{" "}
              <span className="font-semibold text-foreground">{result.efficacy.maintained}</span>{" "}
              seguem com a medida mantida no tempo — e desses,{" "}
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                {result.efficacy.ofWhichImproved}
              </span>{" "}
              baixaram de nível de risco. Eficácia exige hierarquia <em>e</em> manutenção (Guia MTE
              2026, 11.4.4): é associação orientativa, não prova de causalidade.
            </p>
            {result.efficacy.lapsed > 0 && (
              <p className="mt-2 flex items-start gap-1.5 rounded-xl border border-amber-400/40 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>
                  {result.efficacy.lapsed}{" "}
                  {result.efficacy.lapsed === 1 ? "medida caiu" : "medidas caíram"} em desuso e não
                  pode ser creditada como eficaz, ainda que a exposição tenha caído — a queda não é
                  atribuível a uma medida abandonada.
                </span>
              </p>
            )}
          </motion.section>
        )}

        {/* Evolução por driver */}
        <div className="space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Evolução por driver · {result.improvedCount} melhoraram
            {result.worsenedCount > 0 ? ` · ${result.worsenedCount} pioraram` : ""}
          </h2>
          {result.drivers.map((d, i) => {
            const meta = TREND_META[d.trend];
            const TrendIcon = meta.icon;
            return (
              <motion.article
                key={d.driverId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.14 + i * 0.04 }}
                className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium text-card-foreground">{d.label}</span>
                    <TrendIcon className={`h-3.5 w-3.5 shrink-0 ${meta.tint}`} aria-hidden />
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {d.macroLayer} · {d.dimensionLabel}
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 font-medium ${RISK_TINT[d.firstRisk]}`}
                    >
                      {RISK_LABEL[d.firstRisk]}
                    </span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" aria-hidden />
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 font-medium ${RISK_TINT[d.lastRisk]}`}
                    >
                      {RISK_LABEL[d.lastRisk]}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Sparkline values={d.points.map((p) => p.load)} trend={d.trend} />
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {d.firstLoad} → {d.lastLoad}
                    {d.reduction !== 0 && (
                      <span className={d.reduction > 0 ? "ml-1 text-emerald-600 dark:text-emerald-400" : "ml-1 text-orange-600 dark:text-orange-400"}>
                        ({d.reduction > 0 ? "−" : "+"}
                        {Math.abs(d.reduction)})
                      </span>
                    )}
                  </span>
                </div>
              </motion.article>
            );
          })}
        </div>

        {/* Atalhos + disclaimer */}
        <div className="flex flex-wrap items-center gap-4 print:hidden">
          <Link
            to="/plano-nr1"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden /> Voltar ao PGR (Transformar)
          </Link>
          <Link
            to="/matriz"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            Matriz de risco <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <div className="rounded-2xl border border-border/50 bg-muted/30 p-4">
          <p className="text-xs leading-relaxed text-muted-foreground">{result.disclaimer}</p>
        </div>
      </div>
    </AppShell>
  );
}

function Stat({
  label,
  value,
  tint = "text-foreground",
  muted = false,
}: {
  label: string;
  value: string;
  tint?: string;
  muted?: boolean;
}) {
  return (
    <div className="text-right">
      <p className={`font-serif text-2xl tabular-nums ${muted ? "text-muted-foreground" : tint}`}>
        {value}
      </p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
