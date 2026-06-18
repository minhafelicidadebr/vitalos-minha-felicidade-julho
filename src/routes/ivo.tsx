import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef, useMemo } from "react";
import { motion, animate } from "framer-motion";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";
import type { TooltipProps } from "recharts";
import { AppShell } from "@/app/shell/AppShell";
import { usePack } from "@/engine/pack";
import type { ProprietaryIndex } from "@/engine/pack";
import {
  calculateIVO,
  type IVOResult,
  type LensResult,
  type PillarResult,
} from "@/engine/index/ivo-engine";
import { getSectorData } from "@/mocks/sector-data";

interface MaturityLevel {
  min: number;
  max: number;
  name: string;
  badge: string;
}

export const Route = createFileRoute("/ivo")({
  head: () => ({
    meta: [{ title: "IVO — Índice de Vitalidade Organizacional · 4 Lentes VitalOS™" }],
  }),
  component: IVOPage,
});

// Chart colors: design-system primary (#0B3D2E) e accent (#C9A227)
// Used as SVG attr strings for Recharts — CSS vars unreliable in SVG attrs cross-browser
const CHART_CURRENT = "#0B3D2E";
const CHART_PREV = "#C9A227";

const MATURITY_ZONE_COLORS: Record<string, string> = {
  desperta: "#d4d4d8",
  conexao: "#fde68a",
  colaborativa: "#fbbf24",
  saudavel: "#86efac",
  sustentavel: "#22c55e",
  referencia: "#059669",
  viva: "#0d9488",
};

function lensShortName(name: string) {
  return name.split(" —")[0].trim();
}

// ─── Status guard ────────────────────────────────────────────────────────────

function IVOPage() {
  const { status, index, packId } = usePack();

  if (status.state === "idle" || status.state === "loading") {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-muted-foreground animate-pulse">Carregando framework IVO…</p>
        </div>
      </AppShell>
    );
  }

  if (status.state === "error") {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
          <p className="font-serif text-xl text-foreground">Falha ao carregar o framework</p>
          <p className="text-sm text-muted-foreground">{status.error.message}</p>
          <Link to="/" className="text-sm underline text-primary">
            Voltar ao início
          </Link>
        </div>
      </AppShell>
    );
  }

  if (!index) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-muted-foreground">Framework IVO não disponível neste pack.</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <IVOContent index={index} packId={packId} />
    </AppShell>
  );
}

// ─── Main content ─────────────────────────────────────────────────────────────

function IVOContent({ index, packId }: { index: ProprietaryIndex; packId: string }) {
  const data = useMemo(() => getSectorData(packId), [packId]);
  const currentResult = useMemo(() => calculateIVO(data.currentCycle, index), [data, index]);
  const previousResult = useMemo(() => calculateIVO(data.previousCycle, index), [data, index]);

  // Vocabulário do setor ativo — tudo derivado do framework/pack, nada hardcoded.
  const indexName = index.name as string;
  const maturityLevels = (index.maturityLevels as MaturityLevel[]) ?? [];
  const scaleMax = ((index.scale as { max?: number } | undefined)?.max as number) ?? 1000;

  const defaultOpenGroups = useMemo(() => {
    return new Set(
      [...currentResult.lenses]
        .sort((a, b) => a.score - b.score)
        .slice(0, 2)
        .map((l) => l.lensId),
    );
  }, [currentResult.lenses]);

  const [openGroups, setOpenGroups] = useState<Set<string>>(() => defaultOpenGroups);
  const [displayScore, setDisplayScore] = useState(0);
  const lensRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const sectionCRef = useRef<HTMLDivElement>(null);

  // Score counter animation
  useEffect(() => {
    const controls = animate(0, currentResult.ivoScore, {
      duration: 1.2,
      ease: "easeOut",
      onUpdate: (v) => setDisplayScore(Math.round(v)),
    });
    return () => controls.stop();
  }, [currentResult.ivoScore]);

  const delta = currentResult.ivoScore - previousResult.ivoScore;

  function toggleGroup(lensId: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(lensId)) next.delete(lensId);
      else next.add(lensId);
      return next;
    });
  }

  function scrollToLens(lensId: string) {
    setOpenGroups((prev) => new Set([...prev, lensId]));
    setTimeout(() => {
      lensRefs.current[lensId]?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }

  function scrollToLowest() {
    const lowest = [...currentResult.lenses].sort((a, b) => a.score - b.score)[0];
    if (!lowest) return;
    scrollToLens(lowest.lensId);
  }

  const radarData = currentResult.lenses.map((lens) => {
    const prev = previousResult.lenses.find((l) => l.lensId === lens.lensId);
    return {
      lens: lensShortName(lens.lensName),
      atual: lens.score,
      anterior: prev?.score ?? 0,
    };
  });

  return (
    <div className="mx-auto max-w-5xl space-y-16 px-4 py-10 sm:px-6 sm:py-14">
      {/* ── SEÇÃO A — Cabeçalho executivo ── */}
      <SectionA
        currentResult={currentResult}
        previousResult={previousResult}
        displayScore={displayScore}
        delta={delta}
        indexName={indexName}
        orgName={data.org.name}
        participationRate={data.org.participationRate}
        currentCycleId={data.currentCycle.cycleId}
        previousCycleId={data.previousCycle.cycleId}
        maturityLevels={maturityLevels}
        scaleMax={scaleMax}
      />

      {/* ── SEÇÃO B — Radar das 4 Lentes ── */}
      <SectionB
        currentResult={currentResult}
        previousResult={previousResult}
        radarData={radarData}
        onLensClick={scrollToLens}
        currentCycleId={data.currentCycle.cycleId}
        previousCycleId={data.previousCycle.cycleId}
      />

      {/* ── SEÇÃO C — Pilares agrupados ── */}
      <div ref={sectionCRef}>
        <SectionC
          currentResult={currentResult}
          openGroups={openGroups}
          onToggle={toggleGroup}
          lensRefs={lensRefs}
        />
      </div>

      {/* ── SEÇÃO D — Disclaimer + CTAs ── */}
      <SectionD disclaimer={currentResult.disclaimer} onExploreCritical={scrollToLowest} />
    </div>
  );
}

// ─── Section A ────────────────────────────────────────────────────────────────

function SectionA({
  currentResult,
  displayScore,
  delta,
  indexName,
  orgName,
  participationRate,
  currentCycleId,
  previousCycleId,
  maturityLevels,
  scaleMax,
}: {
  currentResult: IVOResult;
  previousResult: IVOResult;
  displayScore: number;
  delta: number;
  indexName: string;
  orgName: string;
  participationRate: number;
  currentCycleId: string;
  previousCycleId: string;
  maturityLevels: MaturityLevel[];
  scaleMax: number;
}) {
  const maturity = currentResult.maturityLevel;
  const pct = (currentResult.ivoScore / scaleMax) * 100;

  const deltaColor =
    delta > 0
      ? "text-green-600 dark:text-green-400"
      : delta < 0
        ? "text-red-500"
        : "text-amber-600";
  const deltaArrow = delta > 0 ? "↑" : delta < 0 ? "↓" : "→";

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Label */}
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{indexName}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {orgName} · Temporada {currentCycleId}
        </p>
      </div>

      {/* Score row */}
      <div className="flex flex-wrap items-end gap-6">
        <div>
          <p className="font-serif text-7xl font-semibold leading-none tracking-tight text-foreground">
            {displayScore}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">pontos</p>
        </div>

        <div className={`text-2xl font-semibold ${deltaColor}`}>
          {deltaArrow} {Math.abs(delta)} pts
          <p className="text-xs font-normal text-muted-foreground">vs {previousCycleId}</p>
        </div>

        <div className="text-2xl font-semibold text-foreground">
          {participationRate}%
          <p className="text-xs font-normal text-muted-foreground">participação</p>
        </div>

        {/* Maturity badge */}
        <div className="ml-auto">
          <span
            title={`Nível ${maturity.name}: ${maturity.min}–${maturity.max} pontos`}
            className="inline-flex cursor-help items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{
                background: MATURITY_ZONE_COLORS[maturity.badge] ?? "#86efac",
              }}
            />
            {maturity.name}
          </span>
        </div>
      </div>

      {/* Maturity progress bar */}
      <MaturityBar
        score={currentResult.ivoScore}
        pct={pct}
        maturityBadge={maturity.badge}
        levels={maturityLevels}
        scaleMax={scaleMax}
      />
    </motion.div>
  );
}

function MaturityBar({
  score,
  pct,
  maturityBadge,
  levels,
  scaleMax,
}: {
  score: number;
  pct: number;
  maturityBadge: string;
  levels: MaturityLevel[];
  scaleMax: number;
}) {
  // Zonas derivadas do framework do setor ativo — sem rótulos hardcoded de empresa.
  const zones = levels.map((l) => ({
    badge: l.badge,
    label: l.name,
    width: ((l.max - l.min + 1) / scaleMax) * 100,
  }));
  const ticks = [...levels.map((l) => l.min), scaleMax];

  return (
    <div className="space-y-2">
      <div
        className="relative h-4 w-full overflow-hidden rounded-full"
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={scaleMax}
        aria-label={`Score do índice: ${score} de ${scaleMax}`}
      >
        <div className="flex h-full w-full">
          {zones.map((z) => (
            <div
              key={z.badge}
              title={z.label}
              style={{
                width: `${z.width}%`,
                background: MATURITY_ZONE_COLORS[z.badge] ?? "#86efac",
                opacity: z.badge === maturityBadge ? 1 : 0.45,
              }}
              className="h-full transition-opacity"
            />
          ))}
        </div>
        {/* Marker */}
        <div
          className="absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-2 border-background bg-foreground shadow-md transition-all"
          style={{ left: `${pct}%`, transform: "translate(-50%, -50%)" }}
        />
      </div>
      {/* Zone labels */}
      <div className="flex justify-between px-0.5 text-[9px] uppercase tracking-widest text-muted-foreground">
        {ticks.map((t, i) => (
          <span key={`${t}-${i}`}>{t}</span>
        ))}
      </div>
    </div>
  );
}

// ─── Section B ────────────────────────────────────────────────────────────────

interface RadarDataPoint {
  lens: string;
  atual: number;
  anterior: number;
}

function CustomRadarTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const atual = payload.find((p) => p.dataKey === "atual")?.value ?? 0;
  const anterior = payload.find((p) => p.dataKey === "anterior")?.value ?? 0;
  const diff = (atual as number) - (anterior as number);
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-card-foreground">{label}</p>
      <p className="text-foreground">
        Atual:{" "}
        <span className="font-semibold" style={{ color: CHART_CURRENT }}>
          {atual} pts
        </span>
      </p>
      <p className="text-muted-foreground">
        Anterior:{" "}
        <span className="font-medium" style={{ color: CHART_PREV }}>
          {anterior} pts
        </span>
      </p>
      <p className={diff >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}>
        {diff >= 0 ? "↑" : "↓"} {Math.abs(diff)} pts
      </p>
    </div>
  );
}

function SectionB({
  currentResult,
  previousResult,
  radarData,
  onLensClick,
  currentCycleId,
  previousCycleId,
}: {
  currentResult: IVOResult;
  previousResult: IVOResult;
  radarData: RadarDataPoint[];
  onLensClick: (lensId: string) => void;
  currentCycleId: string;
  previousCycleId: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
      className="space-y-8"
    >
      <h2 className="font-serif text-2xl text-foreground">Radar das 4 Lentes</h2>

      {/* Radar */}
      <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-6">
        <ResponsiveContainer width="100%" height={380}>
          <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
            <PolarGrid gridType="polygon" stroke="currentColor" strokeOpacity={0.15} />
            <PolarAngleAxis
              dataKey="lens"
              tick={{ fontSize: 13, fontWeight: 600, fill: "currentColor" }}
            />
            <PolarRadiusAxis domain={[0, 1000]} tick={false} axisLine={false} />
            <Radar
              name={currentCycleId}
              dataKey="atual"
              stroke={CHART_CURRENT}
              fill={CHART_CURRENT}
              fillOpacity={0.12}
              strokeWidth={2.5}
            />
            <Radar
              name={previousCycleId}
              dataKey="anterior"
              stroke={CHART_PREV}
              fill="transparent"
              strokeDasharray="4 4"
              strokeWidth={1.5}
            />
            <RechartsTooltip content={<CustomRadarTooltip />} />
            <Legend
              formatter={(value: string) => (
                <span className="text-xs text-muted-foreground">{value}</span>
              )}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Lens cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {currentResult.lenses.map((lens) => {
          const prev = previousResult.lenses.find((l) => l.lensId === lens.lensId);
          const diff = lens.score - (prev?.score ?? 0);
          const barPct = Math.round((lens.score / 1000) * 100);
          return (
            <button
              key={lens.lensId}
              onClick={() => onLensClick(lens.lensId)}
              className="group flex flex-col gap-2 rounded-xl border border-border/70 bg-card p-4 text-left transition-all hover:border-border hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`${lensShortName(lens.lensName)}: ${lens.score} pts — explorar pilares`}
            >
              <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
                {lensShortName(lens.lensName)}
              </p>
              <p className="font-serif text-2xl font-semibold text-card-foreground">
                {lens.score}
                <span className="text-sm font-normal text-muted-foreground"> pts</span>
              </p>
              {/* Colored bar */}
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${barPct}%`,
                    background: lens.color,
                  }}
                />
              </div>
              <p
                className={`text-xs font-medium ${diff >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}
              >
                {diff >= 0 ? "↑" : "↓"} {Math.abs(diff)} vs anterior
              </p>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── Section C ────────────────────────────────────────────────────────────────

function SectionC({
  currentResult,
  openGroups,
  onToggle,
  lensRefs,
}: {
  currentResult: IVOResult;
  openGroups: Set<string>;
  onToggle: (lensId: string) => void;
  lensRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.25 }}
      className="space-y-4"
    >
      <h2 className="font-serif text-2xl text-foreground">Pilares por Lente</h2>

      {currentResult.lenses.map((lens) => {
        const isOpen = openGroups.has(lens.lensId);
        return (
          <div
            key={lens.lensId}
            ref={(el) => {
              lensRefs.current[lens.lensId] = el;
            }}
            className="rounded-2xl border border-border/70 bg-card overflow-hidden"
          >
            {/* Group header */}
            <button
              onClick={() => onToggle(lens.lensId)}
              className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              aria-expanded={isOpen}
            >
              <div className="flex items-center gap-3">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ background: lens.color }}
                  aria-hidden
                />
                <span className="font-medium text-card-foreground">{lens.lensName}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-card-foreground">{lens.score} pts</span>
                <span
                  className="text-muted-foreground transition-transform duration-200"
                  style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                  aria-hidden
                >
                  ▾
                </span>
              </div>
            </button>

            {/* Pillars list */}
            {isOpen && (
              <div className="border-t border-border/50 px-5 py-3 space-y-2">
                {lens.pillars.map((pillar) => (
                  <PillarRow key={pillar.pillarId} pillar={pillar} lensColor={lens.color} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </motion.div>
  );
}

function PillarRow({ pillar, lensColor }: { pillar: PillarResult; lensColor: string }) {
  if (!pillar.visible) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 px-4 py-3 text-sm text-muted-foreground">
        <span className="mr-2">🔒</span>
        Este recorte tem menos de 5 respostas e fica oculto para proteger a privacidade.
      </div>
    );
  }

  const isCritical = pillar.score < 500;
  const isStrong = pillar.score > 750;
  const barPct = Math.round((pillar.score / 1000) * 100);
  const tooltip = `${pillar.score} pts · Peso IVO: ${(pillar.weight * 100).toFixed(0)}%${pillar.sampleItems[0] ? " · " + pillar.sampleItems[0] : ""}`;

  return (
    <div
      className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
        isCritical ? "bg-amber-50/60 dark:bg-amber-950/20" : "hover:bg-muted/20"
      }`}
      title={tooltip}
    >
      {/* Badge */}
      <span className="w-5 shrink-0 text-center text-base leading-none" aria-hidden>
        {isCritical ? "⚠" : isStrong ? "✦" : ""}
      </span>

      {/* Name */}
      <span
        className={`flex-1 text-sm ${isCritical ? "font-medium text-amber-800 dark:text-amber-300" : "text-card-foreground"}`}
      >
        {pillar.pillarName}
      </span>

      {/* Progress bar */}
      <div className="hidden h-1.5 w-28 overflow-hidden rounded-full bg-muted sm:block">
        <div
          className="h-full rounded-full"
          style={{ width: `${barPct}%`, background: lensColor }}
        />
      </div>

      {/* Score */}
      <span
        className={`w-16 shrink-0 text-right text-sm font-semibold tabular-nums ${
          isCritical
            ? "text-amber-700 dark:text-amber-400"
            : isStrong
              ? "text-green-700 dark:text-green-400"
              : "text-card-foreground"
        }`}
      >
        {pillar.score} pts
      </span>
    </div>
  );
}

// ─── Section D ────────────────────────────────────────────────────────────────

function SectionD({
  disclaimer,
  onExploreCritical,
}: {
  disclaimer: string;
  onExploreCritical: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.35 }}
      className="space-y-6"
    >
      {/* Disclaimer — always visible, never behind toggle */}
      <div
        className="rounded-r-xl border-l-4 bg-amber-50/60 px-5 py-4 dark:bg-amber-950/20"
        style={{ borderLeftColor: "#C9A227" }}
        role="note"
        aria-label="Aviso importante sobre o IVO"
      >
        <p className="flex items-start gap-2 text-base leading-relaxed text-amber-900 dark:text-amber-300">
          <span className="mt-0.5 shrink-0 text-base" aria-hidden>
            ℹ
          </span>
          {disclaimer}
        </p>
      </div>

      {/* CTAs */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          disabled
          title="Em breve"
          className="inline-flex h-9 cursor-not-allowed items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-muted-foreground opacity-50"
        >
          Ver plano de ação
        </button>

        <button
          onClick={onExploreCritical}
          className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          Explorar pilares críticos
        </button>
      </div>
    </motion.div>
  );
}
