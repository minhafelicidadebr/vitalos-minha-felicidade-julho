import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ComposedChart,
  Area,
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
import { projectForecast, type ForecastScenario } from "@/engine/forecast/forecast-engine";
import {
  calculatePnL,
  DEFAULT_INPUTS,
  type Scenario as PnlScenario,
} from "@/engine/pnl/pnl-engine";
import { deriveEsgReadiness, type PillarScore } from "@/engine/esg/esg-engine";
import { ivoCurrentCycle } from "@/mocks/ivo-mock";
import { ESG_MAPPING } from "@/mocks/esg-mock";
import {
  FORECAST_LEVERS,
  MATURITY_BANDS,
  pillarsFromIvo,
  EFFORT_LABEL,
  EVIDENCE_LABEL,
  SCENARIO_LABEL,
  FORECAST_INTRO,
} from "@/mocks/forecast-mock";

export const Route = createFileRoute("/trajetoria")({
  head: () => ({ meta: [{ title: "Simulador de Trajetória — 4 Lentes VitalOS™" }] }),
  component: TrajetoriaPage,
});

const HORIZONS = [
  { seasons: 2, label: "6 meses" },
  { seasons: 4, label: "1 ano" },
  { seasons: 8, label: "2 anos" },
];

const SCENARIO_TO_PNL: Record<ForecastScenario, PnlScenario> = {
  conservador: "conservador",
  medio: "médio",
  otimista: "otimista",
};

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

function TrajetoriaPage() {
  const { index } = usePack();

  const currentPillars = useMemo(() => {
    if (!index) return null;
    return pillarsFromIvo(calculateIVO(ivoCurrentCycle, index));
  }, [index]);

  const [activeLeverIds, setActiveLeverIds] = useState<string[]>([
    "energia_carga",
    "reconhecimento",
  ]);
  const [scenario, setScenario] = useState<ForecastScenario>("medio");
  const [seasons, setSeasons] = useState(4);

  const forecast = useMemo(() => {
    if (!currentPillars) return null;
    return projectForecast({
      pillars: currentPillars,
      levers: FORECAST_LEVERS,
      activeLeverIds,
      seasons,
      scenario,
      maturityLevels: MATURITY_BANDS,
    });
  }, [currentPillars, activeLeverIds, scenario, seasons]);

  // Composição com P&L e ESG
  const composed = useMemo(() => {
    if (!forecast || !currentPillars) return null;
    const ivoDelta = Math.max(0, forecast.ivoDelta);
    const pnl = calculatePnL(DEFAULT_INPUTS, ivoDelta, SCENARIO_TO_PNL[scenario]);

    const toPillarScore = (p: (typeof currentPillars)[number]): PillarScore => ({
      pillarId: p.pillarId,
      name: p.name,
      score: p.score,
      visible: p.visible,
    });
    const esgNow = deriveEsgReadiness(currentPillars.map(toPillarScore), ESG_MAPPING);
    const esgNext = deriveEsgReadiness(forecast.projectedPillars.map(toPillarScore), ESG_MAPPING);
    return { pnl, esgNow, esgNext };
  }, [forecast, currentPillars, scenario]);

  if (!forecast || !composed) {
    return (
      <AppShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <p className="animate-pulse text-muted-foreground">Projetando trajetórias…</p>
        </div>
      </AppShell>
    );
  }

  const toggleLever = (id: string) =>
    setActiveLeverIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-7 px-4 py-8 sm:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {FORECAST_INTRO.eyebrow}
          </p>
          <h1 className="mt-1 font-serif text-3xl text-foreground">{FORECAST_INTRO.title}</h1>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {FORECAST_INTRO.lead}
          </p>
        </motion.div>

        {/* Controles: cenário + horizonte */}
        <div className="flex flex-wrap items-center gap-4">
          <SegmentedControl
            label="Cenário"
            options={(["conservador", "medio", "otimista"] as const).map((s) => ({
              value: s,
              label: SCENARIO_LABEL[s]!.label,
            }))}
            value={scenario}
            onChange={(v) => setScenario(v as ForecastScenario)}
          />
          <SegmentedControl
            label="Horizonte"
            options={HORIZONS.map((h) => ({ value: String(h.seasons), label: h.label }))}
            value={String(seasons)}
            onChange={(v) => setSeasons(Number(v))}
          />
        </div>

        {/* Gráfico de trajetória */}
        <TrajectoryChart forecast={forecast} />

        {/* Cartões de impacto */}
        <div className="grid gap-4 sm:grid-cols-3">
          <IvoImpactCard forecast={forecast} />
          <PnlImpactCard avoidedCost={composed.pnl.avoidedCost} ivoDelta={forecast.ivoDelta} />
          <EsgImpactCard now={composed.esgNow.overallScore} next={composed.esgNext.overallScore} />
        </div>

        {/* Alavancas */}
        <section>
          <h2 className="mb-1 font-serif text-xl text-foreground">Alavancas de intervenção</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Cada alavanca vem do Playbook e movimenta pilares específicos do IVO. Ligue e veja o
            efeito na trajetória.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {FORECAST_LEVERS.map((lever) => (
              <LeverCard
                key={lever.id}
                lever={lever}
                active={activeLeverIds.includes(lever.id)}
                onToggle={() => toggleLever(lever.id)}
              />
            ))}
          </div>
        </section>

        {/* Movimento por pilar */}
        <PillarShiftsPanel forecast={forecast} />

        {/* Premissas + disclaimer */}
        <section className="rounded-2xl border border-border/60 bg-muted/30 p-5">
          <h3 className="mb-2 font-serif text-base text-foreground">
            Como esta projeção é calculada
          </h3>
          <ul className="space-y-1.5">
            {forecast.assumptions.map((a, i) => (
              <li key={i} className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
                <span className="text-foreground/40">•</span>
                {a}
              </li>
            ))}
          </ul>
        </section>

        <div
          className="rounded-r-xl border-l-4 border-amber-400 bg-amber-50/60 px-5 py-4 dark:bg-amber-950/20"
          role="note"
        >
          <p className="text-xs leading-relaxed text-amber-900 dark:text-amber-300">
            {FORECAST_INTRO.disclaimer}
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          A trajetória parte do{" "}
          <Link to="/ivo" className="underline underline-offset-2 hover:text-foreground">
            IVO
          </Link>{" "}
          atual e conversa com o{" "}
          <Link to="/pnl" className="underline underline-offset-2 hover:text-foreground">
            P&amp;L da Vitalidade
          </Link>{" "}
          e o{" "}
          <Link to="/esg" className="underline underline-offset-2 hover:text-foreground">
            ESG
          </Link>
          .
        </p>
      </div>
    </AppShell>
  );
}

// ─── Controle segmentado ──────────────────────────────────────────────────────

function SegmentedControl({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="mb-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <div className="flex gap-1 rounded-xl border border-border/60 bg-muted/40 p-1">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            aria-pressed={value === opt.value}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
              value === opt.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Gráfico de trajetória ────────────────────────────────────────────────────

function TrajectoryChart({ forecast }: { forecast: ReturnType<typeof projectForecast> }) {
  const data = useMemo(() => {
    const head = {
      label: "Hoje",
      ivo: forecast.baselineIvo,
      low: forecast.baselineIvo,
      bandRange: 0,
    };
    const rest = forecast.steps.map((s) => ({
      label: `T+${s.season}`,
      ivo: s.ivo,
      low: s.ivoLow,
      bandRange: s.ivoHigh - s.ivoLow,
    }));
    return [head, ...rest];
  }, [forecast]);

  const up = forecast.ivoDelta >= 0;
  const lineColor = up ? "#16A34A" : "#DC2626";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.05 }}
      className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-6"
    >
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="font-serif text-lg text-foreground">Trajetória projetada do IVO</h2>
        <span className="text-xs text-muted-foreground">escala 0–1000 · banda de confiança</span>
      </div>
      <div
        role="img"
        aria-label={`Gráfico de linha: IVO projetado parte de ${forecast.baselineIvo} hoje e chega a ${forecast.finalIvo} ao final do horizonte (${forecast.ivoDelta >= 0 ? "+" : ""}${forecast.ivoDelta} pontos), com banda de confiança que alarga ao longo do tempo.`}
      >
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -8 }}>
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
            {/* Banda de confiança (low transparente + range colorido empilhado) */}
            <Area
              dataKey="low"
              stackId="band"
              stroke="none"
              fill="transparent"
              isAnimationActive={false}
            />
            <Area
              dataKey="bandRange"
              stackId="band"
              stroke="none"
              fill={lineColor}
              fillOpacity={0.1}
              isAnimationActive={false}
            />
            {/* Linha do IVO projetado */}
            <Line
              dataKey="ivo"
              stroke={lineColor}
              strokeWidth={2.5}
              dot={{ r: 3, fill: lineColor }}
              isAnimationActive={false}
            />
            <ReferenceLine
              y={forecast.baselineIvo}
              stroke="currentColor"
              strokeOpacity={0.3}
              strokeDasharray="4 4"
            />
            <RechartsTooltip
              content={({ payload, label }) => {
                if (!payload?.length) return null;
                const row = payload[0]?.payload as { ivo: number; low: number; bandRange: number };
                return (
                  <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md">
                    <p className="text-xs font-medium text-foreground">{label}</p>
                    <p className="text-sm tabular-nums text-muted-foreground">IVO {row.ivo}</p>
                    <p className="text-xs tabular-nums text-muted-foreground">
                      faixa {row.low}–{row.low + row.bandRange}
                    </p>
                  </div>
                );
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

// ─── Cartões de impacto ───────────────────────────────────────────────────────

function IvoImpactCard({ forecast }: { forecast: ReturnType<typeof projectForecast> }) {
  const up = forecast.ivoDelta >= 0;
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <p className="text-xs text-muted-foreground">IVO projetado</p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-serif text-4xl text-foreground">{forecast.finalIvo}</span>
        <span
          className={`text-sm font-medium ${up ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
        >
          {up ? "+" : ""}
          {forecast.ivoDelta}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        de <span className="tabular-nums">{forecast.baselineIvo}</span> hoje
      </p>
      {forecast.finalMaturity && (
        <span className="mt-2 inline-block rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
          {forecast.finalMaturity}
        </span>
      )}
      {forecast.finalMaturity !== forecast.baselineMaturity && forecast.baselineMaturity && (
        <p className="mt-1.5 text-xs text-muted-foreground">
          Sobe de “{forecast.baselineMaturity}”
        </p>
      )}
    </div>
  );
}

function PnlImpactCard({ avoidedCost, ivoDelta }: { avoidedCost: number; ivoDelta: number }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <p className="text-xs text-muted-foreground">Custo evitável / ano</p>
      <p className="mt-1 font-serif text-3xl text-foreground">{brl.format(avoidedCost)}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        derivado de Δ IVO {ivoDelta >= 0 ? "+" : ""}
        {ivoDelta} pts
      </p>
      <Link
        to="/pnl"
        className="mt-2 inline-block text-xs text-primary underline underline-offset-2"
      >
        ver memória de cálculo →
      </Link>
    </div>
  );
}

function EsgImpactCard({ now, next }: { now: number | null; next: number | null }) {
  const delta = now !== null && next !== null ? next - now : null;
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <p className="text-xs text-muted-foreground">Prontidão ESG (social)</p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-serif text-3xl text-foreground">{next ?? "—"}</span>
        {delta !== null && (
          <span
            className={`text-sm font-medium ${delta >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
          >
            {delta >= 0 ? "+" : ""}
            {delta}
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        de <span className="tabular-nums">{now ?? "—"}</span> hoje · ESRS/ODS/GRI/FIB
      </p>
      <Link
        to="/esg"
        className="mt-2 inline-block text-xs text-primary underline underline-offset-2"
      >
        ver tradução ESG →
      </Link>
    </div>
  );
}

// ─── Alavanca ─────────────────────────────────────────────────────────────────

function LeverCard({
  lever,
  active,
  onToggle,
}: {
  lever: (typeof FORECAST_LEVERS)[number];
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={active}
      className={`rounded-2xl border p-4 text-left transition-all ${
        active
          ? "border-primary/50 bg-primary/5 shadow-sm"
          : "border-border/60 bg-card hover:border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h3 className="font-medium text-card-foreground">{lever.label}</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{lever.description}</p>
        </div>
        {/* Switch visual */}
        <span
          className={`mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors ${
            active ? "bg-primary" : "bg-muted"
          }`}
          aria-hidden
        >
          <span
            className={`h-4 w-4 rounded-full bg-background shadow-sm transition-transform ${
              active ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </span>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <span className="rounded-full border border-border/60 px-2 py-0.5 text-[9px] text-muted-foreground">
          {EFFORT_LABEL[lever.effort]}
        </span>
        <span className="rounded-full border border-border/60 px-2 py-0.5 text-[9px] text-muted-foreground">
          {EVIDENCE_LABEL[lever.evidenceLevel]}
        </span>
        <span className="rounded-full border border-border/60 px-2 py-0.5 text-[9px] text-muted-foreground">
          +{lever.pointsPerSeason} pts/temp · {lever.targetPillarIds.length} pilares
        </span>
      </div>
    </button>
  );
}

// ─── Movimento por pilar ──────────────────────────────────────────────────────

function PillarShiftsPanel({ forecast }: { forecast: ReturnType<typeof projectForecast> }) {
  const movers = forecast.pillarShifts.filter((p) => p.delta !== 0);
  if (movers.length === 0) {
    return (
      <section className="rounded-2xl border border-border/60 bg-card p-5">
        <h2 className="font-serif text-lg text-foreground">Movimento por pilar</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Sem alavancas ativas, os pilares apenas recuam levemente. Ligue alguma alavanca acima.
        </p>
      </section>
    );
  }

  const maxAbs = Math.max(...movers.map((m) => Math.abs(m.delta)), 1);

  return (
    <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
      <h2 className="mb-4 font-serif text-lg text-foreground">Movimento por pilar</h2>
      <div className="space-y-2.5">
        {movers.map((p) => {
          const up = p.delta >= 0;
          const widthPct = (Math.abs(p.delta) / maxAbs) * 100;
          return (
            <div key={p.pillarId} className="flex items-center gap-3">
              <span className="w-44 shrink-0 truncate text-sm text-card-foreground">{p.name}</span>
              <div className="relative flex-1">
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${up ? "bg-emerald-500" : "bg-red-500"}`}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </div>
              <span
                className={`w-16 shrink-0 text-right text-xs font-medium tabular-nums ${up ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
              >
                {up ? "+" : ""}
                {p.delta}
                <span className="ml-1 text-xs text-muted-foreground">→{p.to}</span>
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
