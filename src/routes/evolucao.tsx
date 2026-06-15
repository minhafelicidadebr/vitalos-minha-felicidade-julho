import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import { AppShell } from "@/app/shell/AppShell";
import { usePack } from "@/engine/pack";
import { calculateIVO } from "@/engine/index/ivo-engine";
import { buildTrend, type TrendPoint, type LensTrend } from "@/engine/trend/trend-engine";
import { TREND_CYCLES, MOMENTUM_COPY, TREND_INTRO } from "@/mocks/trend-mock";

export const Route = createFileRoute("/evolucao")({
  head: () => ({ meta: [{ title: "Evolução · Curva Longitudinal — 4 Lentes VITA" }] }),
  component: EvolucaoPage,
});

const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

function EvolucaoPage() {
  const { index } = usePack();

  const trend = useMemo(() => {
    if (!index) return null;
    // Compõe o motor IVO sobre cada ciclo histórico.
    const points: TrendPoint[] = TREND_CYCLES.map((cycle) => {
      const r = calculateIVO(cycle, index);
      return {
        cycleId: r.cycleId,
        label: r.cycleId,
        ivo: r.ivoScore,
        lenses: r.lenses.map((l) => ({
          id: l.lensId,
          name: l.lensName.split(" — ")[0] ?? l.lensName,
          score: l.score,
        })),
      };
    });
    return buildTrend(points);
  }, [index]);

  if (!trend || trend.lastIvo === null) {
    return (
      <AppShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <p className="animate-pulse text-muted-foreground">Traçando a curva…</p>
        </div>
      </AppShell>
    );
  }

  const mom = MOMENTUM_COPY[trend.momentum]!;
  const chartData = trend.points.map((p) => ({ label: p.label, ivo: p.ivo }));

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {TREND_INTRO.eyebrow}
          </p>
          <h1 className="mt-1 font-serif text-3xl text-foreground">{TREND_INTRO.title}</h1>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {TREND_INTRO.lead}
          </p>
        </motion.div>

        {/* Resumo */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
            <p className="text-xs text-muted-foreground">Momentum</p>
            <p className={`mt-1 font-serif text-2xl ${mom.color}`}>
              <span aria-hidden>{mom.icon}</span> {mom.label}
            </p>
            <p className="text-xs text-muted-foreground">
              {signed(trend.slopePerCycle)} pts/ciclo em média
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card p-5">
            <p className="text-xs text-muted-foreground">IVO no período</p>
            <p className="mt-1 flex items-baseline gap-2">
              <span className="font-serif text-3xl text-foreground">{trend.lastIvo}</span>
              <span
                className={`text-sm font-medium ${trend.totalDelta >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
              >
                {signed(trend.totalDelta)}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">de {trend.firstIvo} no 1º ciclo</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card p-5">
            <p className="text-xs text-muted-foreground">Tendência do próximo ciclo</p>
            <p className="mt-1 font-serif text-3xl text-foreground">~{trend.projectedNext}</p>
            <p className="text-xs text-muted-foreground">extrapolação linear (não promessa)</p>
          </div>
        </div>

        {/* Gráfico longitudinal */}
        <section className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-6">
          <h2 className="mb-2 font-serif text-lg text-foreground">A curva do IVO</h2>
          <div
            role="img"
            aria-label={`Gráfico de linha: o IVO evoluiu de ${trend.firstIvo} para ${trend.lastIvo} ao longo de ${trend.points.length} ciclos (${signed(trend.totalDelta)} pts), momentum ${mom.label.toLowerCase()}.`}
          >
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 4, left: -8 }}>
                <CartesianGrid stroke="currentColor" strokeOpacity={0.08} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "currentColor" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 1000]}
                  tick={{ fontSize: 11, fill: "currentColor" }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                />
                <ReferenceLine
                  y={trend.firstIvo ?? 0}
                  stroke="currentColor"
                  strokeOpacity={0.25}
                  strokeDasharray="4 4"
                />
                <Line
                  dataKey="ivo"
                  stroke="#16A34A"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#16A34A" }}
                  isAnimationActive={false}
                />
                <RechartsTooltip
                  content={({ payload, label }) => {
                    if (!payload?.length) return null;
                    return (
                      <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md">
                        <p className="text-xs font-medium text-foreground">{label}</p>
                        <p className="text-sm tabular-nums text-muted-foreground">
                          IVO {payload[0]?.value}
                        </p>
                      </div>
                    );
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Tendência por lente */}
        <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
          <h2 className="mb-1 font-serif text-lg text-foreground">O que mais mudou</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Onde a evolução foi mais forte — e onde menos — entre o 1º e o último ciclo.
          </p>
          <div className="space-y-3">
            {trend.lensTrends.map((l) => (
              <LensRow key={l.id} lens={l} />
            ))}
          </div>
          {trend.bestLens && trend.worstLens && trend.bestLens.id !== trend.worstLens.id && (
            <p className="mt-3 text-xs text-muted-foreground">
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                {trend.bestLens.name}
              </span>{" "}
              liderou a evolução ({signed(trend.bestLens.delta)}); {trend.worstLens.name} foi a que
              menos avançou ({signed(trend.worstLens.delta)}).
            </p>
          )}
        </section>

        {/* Honestidade */}
        <div
          className="rounded-r-xl border-l-4 border-amber-400 bg-amber-50/60 px-5 py-4 dark:bg-amber-950/20"
          role="note"
        >
          <p className="text-xs leading-relaxed text-amber-900 dark:text-amber-300">
            {TREND_INTRO.disclaimer}
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          O histórico mede o que aconteceu; o{" "}
          <Link to="/trajetoria" className="underline underline-offset-2 hover:text-foreground">
            Simulador de Trajetória
          </Link>{" "}
          projeta o que pode acontecer com as alavancas certas.
        </p>
      </div>
    </AppShell>
  );
}

function LensRow({ lens }: { lens: LensTrend }) {
  const up = lens.delta >= 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-36 shrink-0 truncate text-sm text-card-foreground">{lens.name}</span>
      <div className="flex flex-1 items-center gap-2">
        <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
          {lens.first}
        </span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full ${up ? "bg-emerald-500" : "bg-red-500"}`}
            style={{ width: `${(lens.last / 1000) * 100}%` }}
          />
        </div>
        <span className="w-10 text-xs tabular-nums text-foreground">{lens.last}</span>
      </div>
      <span
        className={`w-12 shrink-0 text-right text-xs font-medium tabular-nums ${up ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
      >
        {signed(lens.delta)}
      </span>
    </div>
  );
}
