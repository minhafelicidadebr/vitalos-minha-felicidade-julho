import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import { AppShell } from "@/app/shell/AppShell";
import { usePack } from "@/engine/pack";
import { calculateIVO } from "@/engine/index/ivo-engine";
import { ivoCurrentCycle } from "@/mocks/ivo-mock";
import {
  CLEVEL_TREND,
  CLEVEL_PNL,
  CLEVEL_NR1_RISK,
  CLEVEL_PRIORITIES,
} from "@/mocks/executivo-mock";

export const Route = createFileRoute("/clevel")({
  head: () => ({ meta: [{ title: "Visão C-Level — 4 Lentes VITA" }] }),
  component: CLevelPage,
});

function brl(n: number) {
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

function CLevelPage() {
  const { index } = usePack();
  const result = useMemo(() => (index ? calculateIVO(ivoCurrentCycle, index) : null), [index]);

  if (!result) {
    return (
      <AppShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <p className="text-muted-foreground animate-pulse">Carregando…</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Visão C-Level · uma tela, sem rolagem infinita
          </p>
          <h1 className="mt-1 font-serif text-3xl text-foreground">
            Vitalidade como indicador de negócio
          </h1>
        </motion.div>

        {/* Row 1: IVO + tendência */}
        <div className="grid gap-4 md:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.05 }}
            className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
          >
            <p className="text-xs text-muted-foreground">IVO atual</p>
            <p className="mt-1 font-serif text-5xl font-semibold text-foreground">
              {result.ivoScore}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{result.maturityLevel.name}</p>
            <Link
              to="/ivo"
              className="mt-3 inline-block text-xs text-primary underline underline-offset-2"
            >
              Ver radar completo →
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm md:col-span-2"
          >
            <p className="text-xs text-muted-foreground">Tendência — 4 ciclos</p>
            <div className="mt-2 h-32">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={[...CLEVEL_TREND]}
                  margin={{ top: 8, right: 12, bottom: 0, left: -18 }}
                >
                  <XAxis
                    dataKey="cycle"
                    tick={{ fontSize: 10, fill: "currentColor" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[450, 700]}
                    tick={{ fontSize: 10, fill: "currentColor" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <RechartsTooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    formatter={(v: number | string) => [`${v} pts`, "IVO"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#0B3D2E"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* Row 2: P&L + risco NR-1 */}
        <div className="grid gap-4 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.15 }}
            className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
          >
            <p className="font-medium text-card-foreground">
              Vitality P&L — cenário {CLEVEL_PNL.scenario}
            </p>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Custo de turnover/ano</dt>
                <dd className="font-semibold tabular-nums text-foreground">
                  {brl(CLEVEL_PNL.turnoverCostYear)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Absenteísmo/ano</dt>
                <dd className="font-semibold tabular-nums text-foreground">
                  {brl(CLEVEL_PNL.absenteeismCostYear)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Presenteísmo/ano</dt>
                <dd className="font-semibold tabular-nums text-foreground">
                  {brl(CLEVEL_PNL.presenteeismCostYear)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-border/50 pt-2">
                <dt className="text-muted-foreground">Custo evitado (Δ IVO)</dt>
                <dd className="font-semibold tabular-nums text-green-700 dark:text-green-400">
                  {brl(CLEVEL_PNL.avoidedCostByIvoDelta)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Custo da inação (12m)</dt>
                <dd className="font-semibold tabular-nums text-red-600 dark:text-red-400">
                  {brl(CLEVEL_PNL.inactionCost12m)}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              {CLEVEL_PNL.disclaimer}
            </p>
            <Link
              to="/pnl"
              className="mt-2 inline-block text-xs text-primary underline underline-offset-2"
            >
              P&L completo com fórmulas editáveis →
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.2 }}
            className="flex flex-col rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
          >
            <p className="font-medium text-card-foreground">Risco NR-1 (educativo)</p>
            <div className="mt-3 flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-amber-500" aria-hidden />
              <p className="text-sm font-semibold text-foreground">{CLEVEL_NR1_RISK.label}</p>
            </div>
            <p className="mt-2 flex-1 text-xs leading-relaxed text-muted-foreground">
              {CLEVEL_NR1_RISK.detail}
            </p>
            <Link to="/sst" className="mt-3 text-xs text-primary underline underline-offset-2">
              Painel SST completo →
            </Link>
          </motion.div>
        </div>

        {/* Row 3: prioridades */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.25 }}
          className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
        >
          <p className="font-medium text-card-foreground">3 prioridades do trimestre</p>
          <ol className="mt-3 space-y-3">
            {CLEVEL_PRIORITIES.map((p, i) => (
              <li key={p.id} className="flex gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-medium text-card-foreground">{p.title}</p>
                  <p className="text-xs text-muted-foreground">{p.rationale}</p>
                </div>
              </li>
            ))}
          </ol>
        </motion.div>
      </div>
    </AppShell>
  );
}
