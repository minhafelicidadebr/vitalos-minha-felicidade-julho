import { createFileRoute, Link } from "@tanstack/react-router";
import { Fragment, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppShell } from "@/app/shell/AppShell";
import { computeSeasonOverview, type ComputedSeason } from "@/engine/season/season-engine";
import {
  ANNUAL_PLAN,
  CURRENT_PROGRAM_WEEK,
  SEASON_INTRO,
  METE_GLOSSARY,
  OWNER_COLOR,
} from "@/mocks/season-mock";
import { CANONICAL_JOURNEY, JOURNEY_CAPSTONE, JOURNEY_RATIONALE } from "@/domain/journey";

export const Route = createFileRoute("/temporada")({
  head: () => ({ meta: [{ title: "Cronograma das 4 Lentes — 4 Lentes VitalOS™" }] }),
  component: TemporadaPage,
});

const PHASE_WEIGHT: Record<string, number> = {
  mensurar: 3,
  educar: 3,
  transformar: 4,
  evoluir: 3,
};

function TemporadaPage() {
  const overview = useMemo(() => computeSeasonOverview(ANNUAL_PLAN, CURRENT_PROGRAM_WEEK), []);
  const [selectedIndex, setSelectedIndex] = useState(overview.position.seasonIndex);

  const selectedSeason =
    overview.seasons.find((s) => s.index === selectedIndex) ?? overview.currentSeason;
  const isViewingCurrent = selectedIndex === overview.position.seasonIndex;

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
            {SEASON_INTRO.eyebrow}
          </p>
          <h1 className="mt-1 font-serif text-3xl text-foreground">{SEASON_INTRO.title}</h1>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {SEASON_INTRO.lead}
          </p>
        </motion.div>

        {/* Por que esta ordem — a espinha metodológica como ponto de prova */}
        <JourneySpineBanner />

        {/* Status atual em destaque */}
        <CurrentStatusStrip overview={overview} />

        {/* Timeline anual */}
        <YearTimeline
          overview={overview}
          selectedIndex={selectedIndex}
          onSelect={setSelectedIndex}
        />

        {/* Detalhe da temporada selecionada */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedSeason.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <SeasonDetailPanel
              season={selectedSeason}
              currentPhaseId={isViewingCurrent ? overview.currentPhase.id : null}
            />

            {isViewingCurrent && <ThisWeekPanel overview={overview} />}
          </motion.div>
        </AnimatePresence>

        {/* Glossário M.E.T.E. */}
        <MeteGlossary />

        <p className="text-center text-xs text-muted-foreground">
          A jornada anual encadeia{" "}
          <Link to="/sst" className="underline underline-offset-2 hover:text-foreground">
            COPSOQ/NR-1
          </Link>
          ,{" "}
          <Link to="/fibt" className="underline underline-offset-2 hover:text-foreground">
            FIB-T
          </Link>
          ,{" "}
          <Link to="/ivo" className="underline underline-offset-2 hover:text-foreground">
            IVO/PERMA
          </Link>{" "}
          e{" "}
          <Link to="/viat" className="underline underline-offset-2 hover:text-foreground">
            VIA-T
          </Link>{" "}
          até a{" "}
          <Link
            to="/relatorio-global"
            className="underline underline-offset-2 hover:text-foreground"
          >
            síntese ESG
          </Link>{" "}
          — primeiro o que protege, depois o que faz florescer.
        </p>
      </div>
    </AppShell>
  );
}

// ─── Espinha metodológica · "por que esta ordem" ─────────────────────────────

function StageChip({
  label,
  sub,
  color,
  route,
}: {
  label: string;
  sub: string;
  color: string;
  route?: string;
}) {
  const inner = (
    <span
      className="inline-flex flex-col rounded-xl border px-3 py-1.5"
      style={{ borderColor: `${color}40` }}
    >
      <span className="text-xs font-semibold" style={{ color }}>
        {label}
      </span>
      <span className="text-xs text-muted-foreground">{sub}</span>
    </span>
  );
  return route ? (
    <Link to={route} className="transition-opacity hover:opacity-75">
      {inner}
    </Link>
  ) : (
    inner
  );
}

function JourneySpineBanner() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.08 }}
      className="rounded-2xl border border-border/70 bg-gradient-to-br from-card to-muted/30 p-5 shadow-sm"
      aria-label="Por que esta ordem"
    >
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
        Por que esta ordem
      </p>
      <p className="mt-1.5 max-w-3xl text-base leading-relaxed text-card-foreground">
        {JOURNEY_RATIONALE}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {CANONICAL_JOURNEY.map((s) => (
          <Fragment key={s.key}>
            <StageChip
              label={s.seasonName}
              sub={s.instrumentShort}
              color={s.color}
              route={s.route}
            />
            <span className="text-muted-foreground/50" aria-hidden>
              →
            </span>
          </Fragment>
        ))}
        <StageChip
          label="Síntese"
          sub="Relatório Global"
          color="#64748B"
          route={JOURNEY_CAPSTONE.route}
        />
      </div>
    </motion.section>
  );
}

// ─── Faixa de status atual ────────────────────────────────────────────────────

function CurrentStatusStrip({ overview }: { overview: ReturnType<typeof computeSeasonOverview> }) {
  const { currentSeason, currentPhase, position, yearProgressPct, nextMilestone } = overview;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.05 }}
      className="grid gap-4 rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:grid-cols-4"
    >
      <div className="sm:col-span-2">
        <p className="text-xs text-muted-foreground">Você está aqui</p>
        <div className="mt-1 flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-sm"
            style={{ background: currentSeason.color }}
            aria-hidden
          />
          <p className="font-serif text-xl text-foreground">{currentSeason.name}</p>
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Fase <span className="font-medium text-foreground">{currentPhase.label}</span> · Semana{" "}
          {position.weekInSeason} de {ANNUAL_PLAN.weeksPerSeason}
        </p>
      </div>

      <div>
        <p className="text-xs text-muted-foreground">Progresso do ano</p>
        <p className="mt-1 font-serif text-3xl text-foreground">
          {yearProgressPct}
          <span className="text-base text-muted-foreground">%</span>
        </p>
        <p className="text-xs text-muted-foreground">
          Semana {overview.programWeek} de {overview.totalWeeks}
        </p>
      </div>

      <div>
        <p className="text-xs text-muted-foreground">Próximo marco</p>
        {nextMilestone ? (
          <>
            <p className="mt-1 text-sm font-medium text-foreground">{nextMilestone.label}</p>
            <p className="text-xs text-muted-foreground">
              {nextMilestone.kind === "fase" ? "Próxima fase" : "Nova temporada"} · em{" "}
              {nextMilestone.weeksAway} {nextMilestone.weeksAway === 1 ? "semana" : "semanas"}
            </p>
          </>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">Fim do ciclo anual</p>
        )}
      </div>
    </motion.div>
  );
}

// ─── Timeline anual ───────────────────────────────────────────────────────────

function YearTimeline({
  overview,
  selectedIndex,
  onSelect,
}: {
  overview: ReturnType<typeof computeSeasonOverview>;
  selectedIndex: number;
  onSelect: (i: number) => void;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.1 }}
    >
      <h2 className="mb-3 font-serif text-xl text-foreground">A jornada anual</h2>

      <div className="relative">
        {/* Marcador "você está aqui" sobre toda a trilha */}
        <div
          className="pointer-events-none absolute -top-1 bottom-8 z-10"
          style={{ left: `${overview.yearProgressPct}%` }}
        >
          <div className="relative -translate-x-1/2">
            <div className="mx-auto h-full w-0.5 bg-foreground/70" />
            <span className="absolute -top-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full border-2 border-background bg-foreground" />
          </div>
        </div>

        {/* Trilha das 4 temporadas */}
        <div className="flex gap-1.5">
          {overview.seasons.map((season) => (
            <SeasonTrack
              key={season.id}
              season={season}
              selected={selectedIndex === season.index}
              onSelect={() => onSelect(season.index)}
            />
          ))}
        </div>
      </div>
    </motion.section>
  );
}

function SeasonTrack({
  season,
  selected,
  onSelect,
}: {
  season: ComputedSeason;
  selected: boolean;
  onSelect: () => void;
}) {
  const dim = season.status === "futura";

  return (
    <button
      onClick={onSelect}
      aria-pressed={selected}
      className={`group flex-1 rounded-xl border p-2 text-left transition-all ${
        selected
          ? "border-foreground/40 bg-card shadow-sm"
          : "border-border/50 bg-card/40 hover:border-border"
      }`}
      style={{ flexBasis: `${ANNUAL_PLAN.weeksPerSeason}%` }}
    >
      {/* Cabeçalho da temporada */}
      <div className="mb-1.5 flex items-center justify-between gap-1 px-1">
        <span className="text-xs font-semibold text-muted-foreground">{season.cycleId}</span>
        <StatusDot status={season.status} color={season.color} />
      </div>

      {/* Barra de fases M.E.T.E. */}
      <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full">
        {season.phases.map((phase) => {
          const filled =
            phase.status === "concluida" ? 100 : phase.status === "atual" ? phase.progressPct : 0;
          return (
            <div
              key={phase.id}
              className="relative h-full overflow-hidden rounded-sm bg-muted"
              style={{ flexGrow: PHASE_WEIGHT[phase.id] ?? 1 }}
              title={`${phase.label} — ${phase.status}`}
            >
              <div
                className="h-full rounded-sm transition-all"
                style={{
                  width: `${filled}%`,
                  background: season.color,
                  opacity: dim ? 0.35 : 1,
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Nome + mês */}
      <div className="mt-1.5 px-1">
        <p
          className={`truncate text-xs font-medium ${selected ? "text-foreground" : "text-muted-foreground"}`}
        >
          {season.name}
        </p>
        <p className="text-[9px] text-muted-foreground">{season.startLabel}</p>
      </div>
    </button>
  );
}

function StatusDot({ status, color }: { status: string; color: string }) {
  if (status === "concluida")
    return <span className="text-[9px] font-medium text-emerald-600 dark:text-emerald-400">✓</span>;
  if (status === "atual")
    return (
      <span className="relative flex h-2 w-2">
        <span
          className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
          style={{ background: color }}
        />
        <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: color }} />
      </span>
    );
  return <span className="h-2 w-2 rounded-full bg-muted-foreground/30" aria-hidden />;
}

// ─── Detalhe da temporada ─────────────────────────────────────────────────────

function SeasonDetailPanel({
  season,
  currentPhaseId,
}: {
  season: ComputedSeason;
  currentPhaseId: string | null;
}) {
  return (
    <section
      className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm"
      style={{ borderTopColor: season.color, borderTopWidth: 3 }}
    >
      {/* Cabeçalho */}
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border/50 px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
              {season.layerLabel}
            </span>
            <StatusBadge status={season.status} />
          </div>
          <h3 className="mt-1 font-serif text-2xl text-foreground">{season.name}</h3>
          <p className="mt-1 text-sm italic text-muted-foreground">“{season.question}”</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Instrumento âncora</p>
          <p
            className="rounded-lg px-2.5 py-1 text-sm font-medium"
            style={{ background: `${season.color}1A`, color: season.color }}
          >
            {season.primaryInstrument}
          </p>
        </div>
      </header>

      {/* Ciclo M.E.T.E. */}
      <div className="divide-y divide-border/40">
        {season.phases.map((phase, i) => {
          const isCurrent = phase.id === currentPhaseId;
          return (
            <div
              key={phase.id}
              className={`flex gap-4 px-5 py-4 ${isCurrent ? "bg-muted/40" : ""}`}
            >
              {/* Conector vertical */}
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                    phase.status === "concluida"
                      ? "text-background"
                      : phase.status === "atual"
                        ? "ring-2 ring-offset-2 ring-offset-card"
                        : "bg-muted text-muted-foreground"
                  }`}
                  style={
                    phase.status === "concluida"
                      ? { background: season.color }
                      : phase.status === "atual"
                        ? { color: season.color }
                        : undefined
                  }
                >
                  {phase.status === "concluida" ? "✓" : i + 1}
                </div>
                {i < season.phases.length - 1 && (
                  <div className="mt-1 w-0.5 flex-1 bg-border" aria-hidden />
                )}
              </div>

              {/* Conteúdo da fase */}
              <div className="flex-1 pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-medium text-card-foreground">{phase.label}</h4>
                  <span className="text-xs text-muted-foreground">
                    semanas {phase.weekStart}–{phase.weekEnd}
                  </span>
                  {isCurrent && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[9px] font-medium text-background"
                      style={{ background: season.color }}
                    >
                      AGORA · {phase.progressPct}%
                    </span>
                  )}
                </div>
                <p className="mt-1 text-base leading-relaxed text-muted-foreground">
                  {phase.objective}
                </p>

                {/* Instrumentos + entregável */}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {phase.instruments.map((inst) => (
                    <span
                      key={inst}
                      className="rounded-full border border-border/60 px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      {inst}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Entrega:</span> {phase.deliverable}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    concluida: {
      label: "Concluída",
      cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    },
    atual: { label: "Em curso", cls: "bg-primary/10 text-primary" },
    futura: { label: "Planejada", cls: "bg-muted text-muted-foreground" },
  };
  const s = map[status] ?? map.futura!;
  return (
    <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${s.cls}`}>{s.label}</span>
  );
}

// ─── Esta semana ──────────────────────────────────────────────────────────────

function ThisWeekPanel({ overview }: { overview: ReturnType<typeof computeSeasonOverview> }) {
  const { currentActivities, currentPhase } = overview;

  return (
    <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg text-foreground">O que fazer esta semana</h3>
        <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
          Fase {currentPhase.label}
        </span>
      </div>

      <div className="mt-4 space-y-2.5">
        {currentActivities.map((activity, i) => {
          const ownerColor = OWNER_COLOR[activity.owner] ?? "#6B7280";
          return (
            <motion.div
              key={`${activity.week}-${i}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.06 }}
              className="flex items-start gap-3 rounded-xl border border-border/50 bg-background/40 px-3.5 py-3"
            >
              <span
                className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                style={{ background: ownerColor }}
                aria-hidden
              />
              <div className="flex-1">
                <p className="text-sm text-card-foreground">{activity.title}</p>
                <span
                  className="mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium"
                  style={{ background: `${ownerColor}1A`, color: ownerColor }}
                >
                  {activity.owner}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Cada atividade tem um responsável claro. É assim que o dado vira ação — e a ação vira
        evidência para o Selo Empresa Viva.
      </p>
    </section>
  );
}

// ─── Glossário M.E.T.E. ───────────────────────────────────────────────────────

function MeteGlossary() {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, delay: 0.15 }}
      className="rounded-2xl border border-border/60 bg-muted/30 p-5"
    >
      <h3 className="mb-3 font-serif text-lg text-foreground">O ciclo M.E.T.E.</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {METE_GLOSSARY.map((m, i) => (
          <div key={m.id} className="rounded-xl border border-border/50 bg-card p-3">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {i + 1}
              </span>
              <p className="text-sm font-medium text-card-foreground">{m.label}</p>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{m.gist}</p>
          </div>
        ))}
      </div>
    </motion.section>
  );
}
