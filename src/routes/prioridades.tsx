import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Target, TrendingUp } from "lucide-react";
import { AppShell } from "@/app/shell/AppShell";
import { usePack } from "@/engine/pack";
import { calculateIVO } from "@/engine/index/ivo-engine";
import { rankPriorities, type PriorityItem } from "@/engine/priority/priority-engine";
import { ivoCurrentCycle } from "@/mocks/ivo-mock";
import { FORECAST_LEVERS, pillarsFromIvo } from "@/mocks/forecast-mock";
import {
  ambassadorshipForPillar,
  lensForPillar,
  esgUnlockedBy,
  PRIORITY_INTRO,
  EFFORT_COPY,
  EVIDENCE_COPY,
} from "@/mocks/priority-mock";

export const Route = createFileRoute("/prioridades")({
  head: () => ({ meta: [{ title: "Diagnóstico Integrado — 4 Lentes VitalOS™" }] }),
  component: PrioridadesPage,
});

type Mode = "impacto" | "rapidas";

function PrioridadesPage() {
  const { index } = usePack();

  const result = useMemo(() => {
    if (!index) return null;
    const pillars = pillarsFromIvo(calculateIVO(ivoCurrentCycle, index));
    return rankPriorities(pillars, FORECAST_LEVERS, { scenario: "medio" });
  }, [index]);

  const [mode, setMode] = useState<Mode>("impacto");

  if (!result) {
    return (
      <AppShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <p className="animate-pulse text-muted-foreground">Priorizando intervenções…</p>
        </div>
      </AppShell>
    );
  }

  const ordered =
    mode === "impacto"
      ? result.items
      : [...result.items].sort((a, b) => b.impactPerEffort - a.impactPerEffort);

  const hero = result.items[0]!;
  const listItems = mode === "impacto" ? result.items.slice(1) : ordered;

  const quickWins = result.items.filter((i) => i.isQuickWin).length;
  const totalLift = result.items.reduce((s, i) => s + i.expectedIvoLift, 0);
  const pillarsMoved = new Set(result.items.flatMap((i) => i.addressedPillars.map((p) => p.pillarId))).size;

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
            {PRIORITY_INTRO.eyebrow}
          </p>
          <h1 className="mt-1 font-serif text-3xl text-foreground">{PRIORITY_INTRO.title}</h1>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {PRIORITY_INTRO.lead}
          </p>
        </motion.div>

        {/* Faixa de destaques numéricos */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }}
          className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-border/60 bg-border/40"
        >
          {[
            { icon: Target, label: "Intervenções rankeadas", value: result.items.length, tint: "text-primary" },
            { icon: Zap, label: "Vitórias rápidas", value: quickWins, tint: "text-amber-600 dark:text-amber-400" },
            { icon: TrendingUp, label: "Alavancagem total (pts IVO)", value: `+${totalLift}`, tint: "text-emerald-600 dark:text-emerald-400" },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="flex flex-col gap-1 bg-card px-4 py-3.5">
                <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <Icon className={`h-3.5 w-3.5 ${s.tint}`} aria-hidden /> {s.label}
                </span>
                <span className={`font-serif text-2xl leading-none tabular-nums ${s.tint}`}>{s.value}</span>
              </div>
            );
          })}
        </motion.div>

        {/* Hero — prioridade #1 */}
        <HeroPriority item={hero} pillarsMoved={pillarsMoved} />

        {/* Toggle de modo */}
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-serif text-xl text-foreground">Fila de prioridades</h2>
          <div className="flex gap-1 rounded-xl border border-border/60 bg-muted/40 p-1">
            {(
              [
                ["impacto", "Por impacto"],
                ["rapidas", "Vitórias rápidas"],
              ] as const
            ).map(([m, label]) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                  mode === m
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Lista */}
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-3"
          >
            {listItems.map((item, i) => (
              <PriorityRow key={item.leverId} item={item} mode={mode} position={i} />
            ))}
          </motion.div>
        </AnimatePresence>

        {/* Honestidade */}
        <div
          className="rounded-r-xl border-l-4 border-amber-400 bg-amber-50/60 px-5 py-4 dark:bg-amber-950/20"
          role="note"
        >
          <p className="text-xs leading-relaxed text-amber-900 dark:text-amber-300">
            {PRIORITY_INTRO.disclaimer}
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Simule este plano no{" "}
          <Link to="/trajetoria" className="underline underline-offset-2 hover:text-foreground">
            Simulador de Trajetória
          </Link>{" "}
          e ative no{" "}
          <Link to="/lab" className="underline underline-offset-2 hover:text-foreground">
            Culture Lab
          </Link>
          .
        </p>
      </div>
    </AppShell>
  );
}

// ─── Composição narrativa de um item ──────────────────────────────────────────

function useComposition(item: PriorityItem) {
  const lead = item.addressedPillars[0] ?? null;
  const amb = lead ? ambassadorshipForPillar(lead.pillarId) : null;
  const lens = lead ? lensForPillar(lead.pillarId) : null;
  const esg = esgUnlockedBy(item.addressedPillars.map((p) => p.pillarId));
  return { lead, amb, lens, esg };
}

// ─── Hero (prioridade #1) ─────────────────────────────────────────────────────

function HeroPriority({ item, pillarsMoved }: { item: PriorityItem; pillarsMoved: number }) {
  const { amb, lens, esg } = useComposition(item);
  const effort = EFFORT_COPY[item.effort]!;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.05 }}
      className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm"
      style={{ borderTopColor: lens?.color ?? "#0B3D2E", borderTopWidth: 3 }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4 px-6 pt-5">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
            1º
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {lens && (
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-medium"
                  style={{ background: `${lens.color}1A`, color: lens.color }}
                >
                  {lens.label}
                </span>
              )}
              {item.isQuickWin && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  Vitória rápida
                </span>
              )}
            </div>
            <h3 className="mt-1 font-serif text-2xl text-foreground">{item.label}</h3>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">{item.description}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Alavancagem</p>
          <p className="font-serif text-4xl text-emerald-600 dark:text-emerald-400">
            +{item.expectedIvoLift}
          </p>
          <p className="text-xs text-muted-foreground">pts de IVO / temporada</p>
        </div>
      </div>

      {/* Pilares endereçados */}
      <div className="mt-4 px-6">
        <p className="mb-2 text-xs uppercase tracking-[0.12em] text-muted-foreground">
          Pilares que esta intervenção move
        </p>
        <div className="space-y-2.5">
          {item.addressedPillars.map((p) => {
            const pillarLens = lensForPillar(p.pillarId);
            const barColor = pillarLens?.color ?? "#0B3D2E";
            return (
              <div key={p.pillarId} className="flex items-center gap-3">
                <span className="w-44 shrink-0 truncate text-sm text-card-foreground">{p.name}</span>
                <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${(p.score / 1000) * 100}%`, background: barColor, opacity: 0.55 }}
                  />
                  {/* Gap visual — o que falta para 1000 */}
                  <div
                    className="absolute right-0 top-0 h-full rounded-r-full"
                    style={{ width: `${(p.gap / 1000) * 100}%`, background: barColor, opacity: 0.18 }}
                  />
                </div>
                <span className="w-28 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                  {p.score} <span className="opacity-50">·</span> <span className="text-red-500/70">−{p.gap}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Faixa de composição */}
      <div className="mt-5 grid gap-px overflow-hidden border-t border-border/50 bg-border/50 sm:grid-cols-3">
        <CompositionCell label="Quem executa">
          {amb ? (
            <span className="text-sm font-medium text-card-foreground">
              {amb.emoji} {amb.name}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">A definir</span>
          )}
        </CompositionCell>
        <CompositionCell label="Esforço · evidência">
          <span className="text-sm font-medium" style={{ color: effort.color }}>
            {effort.label}
          </span>
          <span className="ml-2 text-xs text-muted-foreground">
            {EVIDENCE_COPY[item.evidenceLevel]}
          </span>
        </CompositionCell>
        <CompositionCell label="Destrava em ESG">
          <span className="text-sm font-medium text-card-foreground">{esg.count} indicadores</span>
          <span className="ml-2 text-xs text-muted-foreground">
            {esg.codes.slice(0, 3).join(" · ")}
          </span>
        </CompositionCell>
      </div>

      {/* CTAs */}
      <div className="flex flex-wrap gap-2 px-6 py-4">
        <Link
          to="/trajetoria"
          className="rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          Simular impacto →
        </Link>
        <Link
          to="/lab"
          className="rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          Ativar no Culture Lab
        </Link>
      </div>
    </motion.section>
  );
}

function CompositionCell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="bg-card px-5 py-3">
      <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
      <div className="mt-1 flex flex-wrap items-baseline">{children}</div>
    </div>
  );
}

// ─── Linha da fila ────────────────────────────────────────────────────────────

function PriorityRow({
  item,
  mode,
  position,
}: {
  item: PriorityItem;
  mode: Mode;
  position: number;
}) {
  const { amb, lens, esg } = useComposition(item);
  const effort = EFFORT_COPY[item.effort]!;
  const headline = mode === "impacto" ? `+${item.expectedIvoLift}` : `${item.impactPerEffort}`;
  const headlineSub = mode === "impacto" ? "pts IVO" : "pts / esforço";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: position * 0.04 }}
      className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm"
    >
      <div className="flex items-start gap-4">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
          {item.rank}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {lens && (
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: lens.color }}
                aria-hidden
              />
            )}
            <span className="font-medium text-card-foreground">{item.label}</span>
            {item.isQuickWin && (
              <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                vitória rápida
              </span>
            )}
          </div>

          {/* Chips de composição */}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {amb && (
              <span className="rounded-full border border-border/60 px-2 py-0.5 text-xs text-muted-foreground">
                {amb.emoji} {amb.name}
              </span>
            )}
            <span
              className="rounded-full px-2 py-0.5 text-xs"
              style={{ background: `${effort.color}1A`, color: effort.color }}
            >
              {effort.label}
            </span>
            <span className="rounded-full border border-border/60 px-2 py-0.5 text-xs text-muted-foreground">
              {esg.count} ESG
            </span>
            {item.addressedPillars[0] && (
              <span className="rounded-full border border-border/60 px-2 py-0.5 text-xs text-muted-foreground">
                {item.addressedPillars.length} pilar(es) · lacuna {item.addressedPillars[0].gap}
              </span>
            )}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p className="font-serif text-2xl text-foreground">{headline}</p>
          <p className="text-xs text-muted-foreground">{headlineSub}</p>
        </div>
      </div>
    </motion.div>
  );
}
