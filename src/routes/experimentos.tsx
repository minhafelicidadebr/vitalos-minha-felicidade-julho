import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/app/shell/AppShell";
import { usePack } from "@/engine/pack";
import { calculateIVO } from "@/engine/index/ivo-engine";
import {
  evaluateEvidence,
  designExperimentFromLever,
  type EvidenceVerdict,
  type ExperimentDesign,
} from "@/engine/lab/evidence-engine";
import { rankPriorities, type PriorityItem } from "@/engine/priority/priority-engine";
import type { ForecastLever } from "@/engine/forecast/forecast-engine";
import type { ProtocolDef } from "@/engine/lab/lab-types";
import { ivoCurrentCycle } from "@/mocks/ivo-mock";
import { FORECAST_LEVERS, pillarsFromIvo } from "@/mocks/forecast-mock";
import { PROTOCOLS } from "@/mocks/lab-mock";
import { ambassadorshipForPillar, type AmbassadorshipRef } from "@/mocks/priority-mock";
import {
  EXPERIMENT_CASES,
  VERDICT_COPY,
  STATUS_COPY,
  EXPERIMENT_INTRO,
  type ExperimentCase,
} from "@/mocks/experiment-mock";

export const Route = createFileRoute("/experimentos")({
  head: () => ({ meta: [{ title: "Culture Lab · Evidência — 4 Lentes VITA" }] }),
  component: ExperimentosPage,
});

interface CaseVM {
  case: ExperimentCase;
  lever?: ForecastLever;
  protocol?: ProtocolDef;
  design: ExperimentDesign | null;
  amb: AmbassadorshipRef | null;
  verdict?: EvidenceVerdict;
}

function ExperimentosPage() {
  const { index } = usePack();

  const vm = useMemo(() => {
    if (!index) return null;
    const pillars = pillarsFromIvo(calculateIVO(ivoCurrentCycle, index));

    const cases: CaseVM[] = EXPERIMENT_CASES.map((c) => {
      const lever = FORECAST_LEVERS.find((l) => l.id === c.leverId);
      const protocol = c.protocolId ? PROTOCOLS.find((p) => p.id === c.protocolId) : undefined;
      const design = lever ? designExperimentFromLever(pillars, lever) : null;
      const leadPillarId = protocol?.targetPillarId ?? design?.leadPillarId;
      const amb = leadPillarId ? ambassadorshipForPillar(leadPillarId) : null;
      const verdict = c.observed ? evaluateEvidence(c.observed) : undefined;
      return { case: c, lever, protocol, design, amb, verdict };
    });

    // "A iniciar": prioridades vivas ainda sem experimento.
    const used = new Set(EXPERIMENT_CASES.map((c) => c.leverId));
    const priorities = rankPriorities(pillars, FORECAST_LEVERS, { scenario: "medio" });
    const planned = priorities.items
      .filter((i) => !used.has(i.leverId))
      .slice(0, 3)
      .map((item) => {
        const lever = FORECAST_LEVERS.find((l) => l.id === item.leverId)!;
        const design = designExperimentFromLever(pillars, lever);
        const amb = design ? ambassadorshipForPillar(design.leadPillarId) : null;
        return { item, design, amb };
      });

    return { cases, planned };
  }, [index]);

  if (!vm) {
    return (
      <AppShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <p className="animate-pulse text-muted-foreground">Avaliando evidências…</p>
        </div>
      </AppShell>
    );
  }

  const concluded = vm.cases.filter((c) => c.case.status === "concluido");
  const running = vm.cases.filter((c) => c.case.status === "em_curso");
  const confirmedCount = concluded.filter(
    (c) => c.verdict && (c.verdict.verdict === "confirmado" || c.verdict.verdict === "superou"),
  ).length;

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-7 px-4 py-8 sm:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {EXPERIMENT_INTRO.eyebrow}
          </p>
          <h1 className="mt-1 font-serif text-3xl text-foreground">{EXPERIMENT_INTRO.title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {EXPERIMENT_INTRO.lead}
          </p>
        </motion.div>

        {/* Resumo */}
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard value={concluded.length} label="Experimentos concluídos" />
          <StatCard value={confirmedCount} label="Hipóteses confirmadas ou superadas" accent />
          <StatCard value={running.length} label="Em curso" />
        </div>

        {/* Concluídos — a prova */}
        <section className="space-y-4">
          <h2 className="font-serif text-xl text-foreground">Comprovados</h2>
          {concluded.map((c) => (
            <ConcludedCard key={c.case.id} vm={c} />
          ))}
        </section>

        {/* Em curso */}
        {running.length > 0 && (
          <section className="space-y-4">
            <h2 className="font-serif text-xl text-foreground">Em curso</h2>
            {running.map((c) => (
              <RunningCard key={c.case.id} vm={c} />
            ))}
          </section>
        )}

        {/* A iniciar (das prioridades) */}
        {vm.planned.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-serif text-xl text-foreground">A iniciar — das prioridades</h2>
            {vm.planned.map((p) => (
              <PlannedRow key={p.item.leverId} item={p.item} design={p.design} amb={p.amb} />
            ))}
          </section>
        )}

        {/* Honestidade */}
        <div
          className="rounded-r-xl border-l-4 border-amber-400 bg-amber-50/60 px-5 py-4 dark:bg-amber-950/20"
          role="note"
        >
          <p className="text-xs leading-relaxed text-amber-900 dark:text-amber-300">
            {EXPERIMENT_INTRO.disclaimer}
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          As hipóteses vêm das{" "}
          <Link to="/prioridades" className="underline underline-offset-2 hover:text-foreground">
            Prioridades
          </Link>
          , os protocolos do{" "}
          <Link to="/lab" className="underline underline-offset-2 hover:text-foreground">
            Culture Lab
          </Link>{" "}
          e a prova alimenta os{" "}
          <Link to="/relatorios" className="underline underline-offset-2 hover:text-foreground">
            Relatórios
          </Link>
          .
        </p>
      </div>
    </AppShell>
  );
}

// ─── Resumo ───────────────────────────────────────────────────────────────────

function StatCard({ value, label, accent }: { value: number; label: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <p
        className={`font-serif text-4xl ${accent ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

// ─── Cartão concluído (hipótese vs observado + veredito) ──────────────────────

function ConcludedCard({ vm }: { vm: CaseVM }) {
  const v = vm.verdict!;
  const copy = VERDICT_COPY[v.verdict];
  const design = vm.design;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${copy.bg} ${copy.color}`}
            >
              {copy.icon} {copy.label}
            </span>
            {vm.amb && (
              <span className="text-[11px] text-muted-foreground">
                {vm.amb.emoji} {vm.amb.name}
              </span>
            )}
          </div>
          <h3 className="mt-1.5 font-medium text-card-foreground">
            {vm.protocol?.name ?? vm.lever?.label ?? vm.case.id}
          </h3>
          <p className="text-[11px] text-muted-foreground">
            {vm.case.pilotTeams.join(" · ")} · {vm.case.startedLabel} · n={v.n}
          </p>
        </div>
        {v.reportable && (
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              Efeito líquido
            </p>
            <p className={`font-serif text-3xl ${copy.color}`}>
              {v.netEffect >= 0 ? "+" : ""}
              {v.netEffect}
            </p>
            <p className="text-[10px] text-muted-foreground">pts no pilar</p>
          </div>
        )}
      </div>

      {/* Hipótese vs observado */}
      {v.reportable && design && (
        <HypothesisBar band={design.expectedLiftBand} observed={v.netEffect} />
      )}

      {/* Nota honesta computada */}
      <p className="mt-3 rounded-lg bg-muted/50 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
        {v.note}
      </p>

      {vm.protocol && (
        <p className="mt-2 text-[10px] text-muted-foreground">
          Base científica: {vm.protocol.scientificBasis}
        </p>
      )}
    </motion.div>
  );
}

function HypothesisBar({
  band,
  observed,
}: {
  band: { low: number; high: number };
  observed: number;
}) {
  const max = Math.max(band.high, observed, 1) * 1.25;
  const pct = (v: number) => `${Math.max(0, Math.min(100, (v / max) * 100))}%`;
  const over = observed > band.high;
  const within = observed >= band.low && observed <= band.high;
  const markColor = over ? "bg-violet-500" : within ? "bg-emerald-500" : "bg-amber-500";

  return (
    <div className="mt-4">
      <div className="mb-1 flex justify-between text-[10px] text-muted-foreground">
        <span>
          Hipótese: +{band.low} a +{band.high} pts
        </span>
        <span>observado +{observed}</span>
      </div>
      <div className="relative h-3 overflow-hidden rounded-full bg-muted">
        {/* faixa da hipótese */}
        <div
          className="absolute inset-y-0 bg-foreground/15"
          style={{ left: pct(band.low), width: `calc(${pct(band.high)} - ${pct(band.low)})` }}
        />
        {/* marcador do observado */}
        <div
          className={`absolute inset-y-0 w-1 ${markColor}`}
          style={{ left: pct(observed) }}
          aria-hidden
        />
      </div>
    </div>
  );
}

// ─── Cartão em curso ──────────────────────────────────────────────────────────

function RunningCard({ vm }: { vm: CaseVM }) {
  const pct = Math.round((vm.case.weeksElapsed / vm.case.durationWeeks) * 100);
  const status = STATUS_COPY[vm.case.status];
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-medium ${status.color}`}>● {status.label}</span>
            {vm.amb && (
              <span className="text-[11px] text-muted-foreground">
                {vm.amb.emoji} {vm.amb.name}
              </span>
            )}
          </div>
          <h3 className="mt-1.5 font-medium text-card-foreground">
            {vm.protocol?.name ?? vm.lever?.label}
          </h3>
          <p className="text-[11px] text-muted-foreground">{vm.case.pilotTeams.join(" · ")}</p>
        </div>
        {vm.design && (
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              Hipótese
            </p>
            <p className="font-serif text-2xl text-foreground">
              +{vm.design.expectedLiftBand.low}–{vm.design.expectedLiftBand.high}
            </p>
            <p className="text-[10px] text-muted-foreground">pts esperados</p>
          </div>
        )}
      </div>
      <div className="mt-3">
        <div className="mb-1 flex justify-between text-[10px] text-muted-foreground">
          <span>
            Semana {vm.case.weeksElapsed} de {vm.case.durationWeeks}
          </span>
          <span>{pct}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-sky-500" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

// ─── Linha "a iniciar" ────────────────────────────────────────────────────────

function PlannedRow({
  item,
  design,
  amb,
}: {
  item: PriorityItem;
  design: ExperimentDesign | null;
  amb: AmbassadorshipRef | null;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-border/60 bg-card/50 p-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-card-foreground">{item.label}</span>
          {item.isQuickWin && (
            <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              vitória rápida
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {amb ? `${amb.emoji} ${amb.name}` : "Responsável a definir"}
          {design ? ` · ~${design.recommendedDurationWeeks} semanas · n≥${design.minN}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-3">
        {design && (
          <span className="text-right">
            <span className="block font-serif text-lg text-foreground">
              +{design.expectedLiftBand.low}–{design.expectedLiftBand.high}
            </span>
            <span className="text-[10px] text-muted-foreground">pts (hipótese)</span>
          </span>
        )}
        <Link
          to="/prioridades"
          className="rounded-xl border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          Desenhar →
        </Link>
      </div>
    </div>
  );
}
