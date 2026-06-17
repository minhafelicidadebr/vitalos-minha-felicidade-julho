import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { TriangleAlert, TrendingUp } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { CALCULATOR } from "../data/landing-copy";
import {
  computeCost,
  computeRoi,
  DEFAULT_PARAMS,
  SLIDERS,
  formatBRL,
  formatInt,
  OMS_BENCHMARK,
  type ImpactParams,
} from "../data/impact-calc";

type Tab = "cost" | "roi";

function fmt(value: number, cfg: (typeof SLIDERS)[number]): string {
  if (cfg.format === "brl") return formatBRL(value);
  if (cfg.suffix) return `${formatInt(value)}${cfg.suffix}`;
  return formatInt(value);
}

export function ImpactCalculatorSection() {
  const c = CALCULATOR;
  const [params, setParams] = useState<ImpactParams>(DEFAULT_PARAMS);
  const [tab, setTab] = useState<Tab>("cost");

  const cost = useMemo(() => computeCost(params), [params]);
  const roi = useMemo(() => computeRoi(cost, params), [cost, params]);
  const set = (key: keyof ImpactParams, v: number) => setParams((p) => ({ ...p, [key]: v }));

  return (
    <section className="landing-light-grid relative overflow-hidden border-b border-border/40 bg-background py-16 sm:py-20">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklab,var(--color-border)_42%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--color-border)_34%,transparent)_1px,transparent_1px)] bg-[size:64px_64px] opacity-35"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent"
      />
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">{c.eyebrow}</p>
          <h2 className="mt-2 font-serif text-3xl leading-tight text-foreground sm:text-4xl">
            {c.titleA} <span className="text-primary">{c.titleB}</span>
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">{c.lead}</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.45 }}
          className="landing-light-card mt-10 overflow-hidden rounded-3xl"
        >
          {/* Cabeçalho do card + abas */}
          <div className="border-b border-border/50 p-5 sm:p-6">
            <p className="font-serif text-xl text-card-foreground">{c.cardTitle}</p>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{c.cardLead}</p>
            <div
              className="mt-4 inline-flex rounded-xl border border-primary/15 bg-white/45 p-1 shadow-inner backdrop-blur"
              role="tablist"
              aria-label="Modo da calculadora"
            >
              <TabButton
                active={tab === "cost"}
                onClick={() => setTab("cost")}
                icon={<TriangleAlert className="h-3.5 w-3.5" />}
              >
                {c.tabs.cost}
              </TabButton>
              <TabButton
                active={tab === "roi"}
                onClick={() => setTab("roi")}
                icon={<TrendingUp className="h-3.5 w-3.5" />}
              >
                {c.tabs.roi}
              </TabButton>
            </div>
          </div>

          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
            {/* Parâmetros */}
            <div className="border-b border-border/50 p-5 sm:p-6 lg:border-b-0 lg:border-r">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Parâmetros
              </p>
              <div className="mt-4 space-y-5">
                {SLIDERS.map((cfg) => (
                  <div key={cfg.key}>
                    <div className="flex items-center justify-between">
                      <label htmlFor={`calc-${cfg.key}`} className="text-sm text-card-foreground">
                        {cfg.label}
                      </label>
                      <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                        {fmt(params[cfg.key], cfg)}
                      </span>
                    </div>
                    <Slider
                      id={`calc-${cfg.key}`}
                      className="mt-2"
                      value={[params[cfg.key]]}
                      min={cfg.min}
                      max={cfg.max}
                      step={cfg.step}
                      onValueChange={([v]) => set(cfg.key, v ?? cfg.min)}
                      aria-label={cfg.label}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Resultado */}
            <div className="p-5 sm:p-6">
              {tab === "cost" ? <CostPanel cost={cost} /> : <RoiPanel roi={roi} />}
            </div>
          </div>

          <p className="border-t border-border/50 px-5 py-3 text-[11px] leading-relaxed text-muted-foreground sm:px-6">
            {tab === "roi" ? `${c.disclaimer} · Benchmark OMS ${OMS_BENCHMARK}.` : c.disclaimer}
          </p>
        </motion.div>
      </div>
    </section>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        active
          ? "bg-foreground text-background shadow-sm"
          : "text-muted-foreground hover:bg-muted/50"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function CostPanel({ cost }: { cost: ReturnType<typeof computeCost> }) {
  const max = Math.max(...cost.lines.map((l) => l.value), 1);
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-600 dark:text-rose-400">
        {CALCULATOR.costHeader}
      </p>
      <ul className="mt-3 space-y-2.5">
        {cost.lines.map((l) => (
          <li
            key={l.id}
            className="rounded-xl border border-amber-200/60 bg-white/45 p-3.5 shadow-sm backdrop-blur"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-card-foreground">{l.label}</p>
              <p className="font-mono text-sm font-semibold tabular-nums text-rose-600 dark:text-rose-300">
                {formatBRL(l.value)}
              </p>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-rose-500/70 transition-all duration-300"
                style={{ width: `${(l.value / max) * 100}%` }}
                aria-hidden
              />
            </div>
            <p className="mt-1.5 font-mono text-[10px] text-muted-foreground/80">{l.formula}</p>
          </li>
        ))}
      </ul>

      <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/5 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-600 dark:text-rose-400">
          {CALCULATOR.totalLabel}
        </p>
        <p className="mt-1 font-serif text-4xl font-semibold tabular-nums text-rose-600 dark:text-rose-300">
          {formatBRL(cost.total)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {formatBRL(cost.perMonth)}/mês · {formatBRL(cost.perEmployee)}/colaborador
        </p>
      </div>
    </div>
  );
}

function RoiPanel({ roi }: { roi: ReturnType<typeof computeRoi> }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">
        {CALCULATOR.roiHeader}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <div className="rounded-xl border border-emerald-200/70 bg-white/45 p-4 shadow-sm backdrop-blur">
          <p className="text-xs text-muted-foreground">Investimento sugerido</p>
          <p className="mt-1 font-serif text-2xl font-semibold tabular-nums text-foreground">
            {formatBRL(roi.investment)}
          </p>
          <p className="text-[10px] text-muted-foreground">≈ 2% da massa salarial</p>
        </div>
        <div className="rounded-xl border border-emerald-200/70 bg-white/45 p-4 shadow-sm backdrop-blur">
          <p className="text-xs text-muted-foreground">Recuperação estimada</p>
          <p className="mt-1 font-serif text-2xl font-semibold tabular-nums text-foreground">
            {formatBRL(roi.recovery)}
          </p>
          <p className="text-[10px] text-muted-foreground">35% dos custos (conservador)</p>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">
          {CALCULATOR.netGainLabel}
        </p>
        <p className="mt-1 font-serif text-4xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-300">
          {formatBRL(roi.netGain)}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            <TrendingUp className="h-3 w-3" aria-hidden /> ROI {roi.roiRatio.toFixed(1)}:1
          </span>
          <span className="text-xs text-muted-foreground">vs. benchmark OMS {OMS_BENCHMARK}</span>
        </div>
      </div>
    </div>
  );
}
