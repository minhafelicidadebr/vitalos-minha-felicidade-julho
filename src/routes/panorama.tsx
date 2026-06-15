import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/app/shell/AppShell";
import { useIvo, useOrg } from "@/mocks/hooks";
import { projectForecast } from "@/engine/forecast/forecast-engine";
import { calculatePnL, DEFAULT_INPUTS } from "@/engine/pnl/pnl-engine";
import { deriveEsgReadiness, type PillarScore } from "@/engine/esg/esg-engine";
import { rankPriorities } from "@/engine/priority/priority-engine";
import { evaluateEvidence } from "@/engine/lab/evidence-engine";
import { computeSeasonOverview } from "@/engine/season/season-engine";
import { buildPanorama, type PanoramaMetric } from "@/engine/panorama/panorama-engine";
import { FORECAST_LEVERS, MATURITY_BANDS, pillarsFromIvo } from "@/mocks/forecast-mock";
import { ESG_MAPPING } from "@/mocks/esg-mock";
import { ambassadorshipForPillar } from "@/mocks/priority-mock";
import { EXPERIMENT_CASES } from "@/mocks/experiment-mock";
import { ANNUAL_PLAN, CURRENT_PROGRAM_WEEK } from "@/mocks/season-mock";

export const Route = createFileRoute("/panorama")({
  head: () => ({ meta: [{ title: "Panorama Executivo — 4 Lentes VITA" }] }),
  component: PanoramaPage,
});

const DEFAULT_PLAN = ["energia_carga", "reconhecimento"];

function compactBRL(v: number): string {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1).replace(".", ",")} mi`;
  if (v >= 1_000) return `R$ ${Math.round(v / 1_000)} mil`;
  return `R$ ${Math.round(v)}`;
}

const TONE_STYLE: Record<string, { dot: string; text: string; bg: string }> = {
  avancando: {
    dot: "bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
  },
  estavel: {
    dot: "bg-sky-500",
    text: "text-sky-700 dark:text-sky-300",
    bg: "bg-sky-50 dark:bg-sky-950/30",
  },
  atencao: {
    dot: "bg-amber-500",
    text: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-50 dark:bg-amber-950/30",
  },
  risco: {
    dot: "bg-red-500",
    text: "text-red-700 dark:text-red-300",
    bg: "bg-red-50 dark:bg-red-950/30",
  },
};

function PanoramaPage() {
  const { current, previous, delta } = useIvo();
  const org = useOrg();

  const panorama = useMemo(() => {
    if (!current) return null;

    const pillars = pillarsFromIvo(current);

    // Projetar (mesmo plano-base de /trajetoria)
    const forecast = projectForecast({
      pillars,
      levers: FORECAST_LEVERS,
      activeLeverIds: DEFAULT_PLAN,
      seasons: 4,
      scenario: "medio",
      maturityLevels: MATURITY_BANDS,
    });
    const avoided = calculatePnL(
      DEFAULT_INPUTS,
      Math.max(0, forecast.ivoDelta),
      "médio",
    ).avoidedCost;

    // ESG agora × projetado
    const toScore = (p: (typeof pillars)[number]): PillarScore => ({
      pillarId: p.pillarId,
      name: p.name,
      score: p.score,
      visible: p.visible,
    });
    const esgNow = deriveEsgReadiness(pillars.map(toScore), ESG_MAPPING).overallScore;
    const esgNext = deriveEsgReadiness(
      forecast.projectedPillars.map(toScore),
      ESG_MAPPING,
    ).overallScore;

    // Agir (prioridade #1)
    const priorities = rankPriorities(pillars, FORECAST_LEVERS, { scenario: "medio" });
    const top = priorities.items[0] ?? null;
    const topLeadPillar = top?.addressedPillars[0]?.pillarId;
    const owner = topLeadPillar ? ambassadorshipForPillar(topLeadPillar) : null;

    // Provar (experimentos)
    const concludedCases = EXPERIMENT_CASES.filter((c) => c.status === "concluido" && c.observed);
    const verdicts = concludedCases.map((c) => evaluateEvidence(c.observed!));
    const confirmed = verdicts.filter(
      (v) => v.verdict === "confirmado" || v.verdict === "superou",
    ).length;

    // Ritmo
    const season = computeSeasonOverview(ANNUAL_PLAN, CURRENT_PROGRAM_WEEK);

    return buildPanorama({
      ivoScore: current.ivoScore,
      ivoDelta: delta,
      maturityName: current.maturityLevel.name,
      respondents: current.totalRespondents,
      participationPct: org.participationPct,
      topPriorityLabel: top?.label ?? null,
      topPriorityOwner: owner?.name ?? null,
      topPriorityLift: top?.expectedIvoLift ?? 0,
      projectedIvo: forecast.finalIvo,
      projectedDelta: forecast.ivoDelta,
      avoidedCostLabel: compactBRL(avoided),
      esgNow,
      esgNext,
      experimentsConcluded: verdicts.length,
      experimentsConfirmed: confirmed,
      seasonName: season.currentSeason.name,
      phaseLabel: season.currentPhase.label,
    });
  }, [current, previous, delta, org.participationPct]);

  if (!panorama) {
    return (
      <AppShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <p className="animate-pulse text-muted-foreground">Sintetizando o panorama…</p>
        </div>
      </AppShell>
    );
  }

  const tone = TONE_STYLE[panorama.tone]!;
  const today = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
        {/* Cabeçalho */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="flex flex-wrap items-start justify-between gap-3"
        >
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Panorama Executivo · {org.name}
            </p>
            <h1 className="mt-1 font-serif text-3xl text-foreground">Vitalidade em uma página</h1>
            <p className="mt-1 text-xs text-muted-foreground">{today}</p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${tone.bg} ${tone.text}`}
            >
              <span className={`h-2 w-2 rounded-full ${tone.dot}`} aria-hidden />
              {panorama.toneLabel}
            </span>
            <button
              onClick={() => window.print()}
              className="rounded-xl border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Imprimir
            </button>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45, delay: 0.05 }}
          className="font-serif text-xl leading-snug text-foreground"
        >
          {panorama.headline}
        </motion.p>

        {/* Métricas-herói */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {panorama.heroMetrics.map((m, i) => (
            <HeroMetric key={m.id} metric={m} delay={0.1 + i * 0.04} />
          ))}
        </div>

        {/* Arco medir → agir → projetar → provar */}
        <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
          <h2 className="mb-4 font-serif text-lg text-foreground">O ciclo, de ponta a ponta</h2>
          <div className="grid gap-3 sm:grid-cols-4">
            {panorama.arc.map((step, i) => (
              <div key={step.id} className="relative">
                {i < panorama.arc.length - 1 && (
                  <span className="absolute right-[-10px] top-6 hidden text-muted-foreground/40 sm:block">
                    →
                  </span>
                )}
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {step.label}
                </p>
                <p className="mt-1 font-medium text-card-foreground">{step.headline}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  {step.detail}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Narrativa */}
        <section className="rounded-2xl border border-border/60 bg-muted/30 p-5">
          <h2 className="mb-2 font-serif text-base text-foreground">Leitura para a diretoria</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{panorama.narrative}</p>
        </section>

        {/* Próxima ação + prova */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
            <p className="text-[10px] uppercase tracking-[0.12em] text-primary">Próxima ação</p>
            <p className="mt-1.5 text-sm leading-relaxed text-foreground">{panorama.nextAction}</p>
            <Link
              to="/prioridades"
              className="mt-3 inline-block text-[11px] text-primary underline underline-offset-2"
            >
              ver a fila de prioridades →
            </Link>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card p-5">
            <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              Prova acumulada
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-foreground">{panorama.proofLine}</p>
            <Link
              to="/experimentos"
              className="mt-3 inline-block text-[11px] text-primary underline underline-offset-2"
            >
              ver os experimentos →
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Cada número desta página é derivado e auditável — vem dos motores de{" "}
          <Link to="/ivo" className="underline underline-offset-2 hover:text-foreground">
            IVO
          </Link>
          ,{" "}
          <Link to="/trajetoria" className="underline underline-offset-2 hover:text-foreground">
            Trajetória
          </Link>{" "}
          e{" "}
          <Link to="/experimentos" className="underline underline-offset-2 hover:text-foreground">
            Evidência
          </Link>
          .
        </p>
      </div>
    </AppShell>
  );
}

function HeroMetric({ metric, delay }: { metric: PanoramaMetric; delay: number }) {
  const trendIcon = metric.trend === "up" ? "▲" : metric.trend === "down" ? "▼" : "";
  const trendColor =
    metric.trend === "up"
      ? "text-emerald-600 dark:text-emerald-400"
      : metric.trend === "down"
        ? "text-red-600 dark:text-red-400"
        : "text-muted-foreground";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="rounded-2xl border border-border/60 bg-card p-4"
    >
      <p className="text-[11px] text-muted-foreground">{metric.label}</p>
      <p className="mt-1 flex items-baseline gap-1.5 font-serif text-3xl text-foreground">
        {metric.value}
        {trendIcon && <span className={`text-xs ${trendColor}`}>{trendIcon}</span>}
      </p>
      {metric.sub && (
        <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{metric.sub}</p>
      )}
    </motion.div>
  );
}
