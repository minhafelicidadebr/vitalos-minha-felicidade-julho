import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/app/shell/AppShell";
import { useIvo, useOrg } from "@/mocks/hooks";
import { proposeActions } from "@/engine/ai/agent-engine";
import { rankPriorities } from "@/engine/priority/priority-engine";
import { evaluateEvidence } from "@/engine/lab/evidence-engine";
import { computeSeasonOverview } from "@/engine/season/season-engine";
import { closeCycle } from "@/engine/season/cycle-close-engine";
import { FORECAST_LEVERS, pillarsFromIvo } from "@/mocks/forecast-mock";
import { ambassadorshipForPillar } from "@/mocks/priority-mock";
import { EXPERIMENT_CASES } from "@/mocks/experiment-mock";
import { ANNUAL_PLAN, CURRENT_PROGRAM_WEEK } from "@/mocks/season-mock";
import { CONSENT_CHANNELS } from "@/mocks/consent-mock";
import { formatReportDate } from "@/mocks/esg-report-mock";

export const Route = createFileRoute("/fechamento")({
  head: () => ({ meta: [{ title: "Fechamento de Ciclo · Governança — 4 Lentes VITA" }] }),
  component: FechamentoPage,
});

const INTRO = {
  eyebrow: "Fechamento de Ciclo · Razão de Evidências",
  title: "O ciclo, prestado contas",
  lead:
    "O registro auditável do trimestre: o que a FlorescerIA propôs, o que virou prova e como a " +
    "privacidade foi honrada. Atividade não é evidência — um ciclo só fecha com prova quando houve " +
    "transformação medida, dentro da fronteira ética.",
};

function FechamentoPage() {
  const { current, previous } = useIvo();
  const org = useOrg();

  const report = useMemo(() => {
    if (!current) return null;
    const pillars = pillarsFromIvo(current);
    const priorities = rankPriorities(pillars, FORECAST_LEVERS, { scenario: "medio" });
    const top = priorities.items[0] ?? null;
    const owner = top?.addressedPillars[0]
      ? ambassadorshipForPillar(top.addressedPillars[0].pillarId)
      : null;

    const prevScores = new Map(
      (previous?.lenses ?? []).flatMap((l) => l.pillars.map((p) => [p.pillarId, p.score] as const)),
    );
    const declining = current.lenses
      .flatMap((l) => l.pillars)
      .filter((p) => p.visible && prevScores.has(p.pillarId))
      .map((p) => ({
        pillarId: p.pillarId,
        name: p.pillarName,
        score: p.score,
        drop: (prevScores.get(p.pillarId) ?? p.score) - p.score,
      }))
      .filter((d) => d.drop >= 6)
      .slice(0, 2);

    const concluded = EXPERIMENT_CASES.filter((c) => c.status === "concluido" && c.observed);
    const verdicts = concluded.map((c) => evaluateEvidence(c.observed!));
    const confirmed = verdicts.filter(
      (v) => v.verdict === "confirmado" || v.verdict === "superou",
    ).length;

    const season = computeSeasonOverview(ANNUAL_PLAN, CURRENT_PROGRAM_WEEK);

    const proposals = proposeActions({
      topPriority: top
        ? {
            leverId: top.leverId,
            label: top.label,
            owner: owner?.name ?? null,
            lift: top.expectedIvoLift,
            isQuickWin: top.isQuickWin,
          }
        : null,
      decliningPillars: declining,
      experiments: verdicts.map((v, i) => ({
        id: concluded[i]!.id,
        name: concluded[i]!.id,
        verdict: v.verdict,
        netEffect: v.netEffect,
        reportable: v.reportable,
      })),
      phaseId: season.currentPhase.id,
      seasonName: season.currentSeason.name,
    });

    const consentCoverage = CONSENT_CHANNELS.find((c) => c.id === "pulses")?.orgConsentPct ?? 0;

    return closeCycle({
      seasonName: season.currentSeason.name,
      phaseLabel: season.currentPhase.label,
      cycleId: season.currentSeason.cycleId ?? "ciclo atual",
      proposalsGenerated: proposals.length,
      experimentsConcluded: verdicts.length,
      experimentsConfirmed: confirmed,
      consentCoveragePct: consentCoverage,
      kAnonRespected: true,
      domainSeparated: true,
    });
  }, [current, previous]);

  if (!report) {
    return (
      <AppShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <p className="animate-pulse text-muted-foreground">Prestando contas do ciclo…</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 print:py-0">
        {/* Timbre institucional — só na impressão */}
        <div className="print-only mb-4 border-b border-border pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded bg-primary font-serif text-sm text-primary-foreground">
                4
              </span>
              <span className="text-sm font-medium text-foreground">4 Lentes VITA™</span>
            </div>
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Ata de Fechamento de Ciclo
            </span>
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            {org.name} · {report.period} · Emitido em {formatReportDate()}
          </p>
        </div>

        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="flex flex-wrap items-start justify-between gap-3"
        >
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {INTRO.eyebrow}
            </p>
            <h1 className="mt-1 font-serif text-3xl text-foreground">{INTRO.title}</h1>
            <p className="mt-1 text-xs text-muted-foreground">{report.period}</p>
          </div>
          <button
            onClick={() => window.print()}
            title="Na caixa de impressão, escolha “Salvar como PDF” em tamanho A4."
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground print:hidden"
          >
            <span aria-hidden>⤓</span> Exportar a ata
          </button>
        </motion.header>

        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">{INTRO.lead}</p>

        {/* Veredito */}
        <section
          className={`rounded-2xl border p-5 ${
            report.proven
              ? "border-emerald-300/60 bg-emerald-50/50 dark:border-emerald-800/50 dark:bg-emerald-950/20"
              : "border-amber-300/60 bg-amber-50/50 dark:border-amber-800/50 dark:bg-amber-950/20"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg" aria-hidden>
              {report.proven ? "✓" : "○"}
            </span>
            <p className="font-serif text-lg text-foreground">{report.headline}</p>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-card-foreground">{report.verdict}</p>
        </section>

        {/* Métricas */}
        <section className="grid gap-3 sm:grid-cols-4">
          {report.metrics.map((m) => (
            <div key={m.label} className="rounded-2xl border border-border/60 bg-card p-4">
              <p className="font-serif text-2xl text-foreground">{m.value}</p>
              <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{m.label}</p>
            </div>
          ))}
        </section>

        {/* Atestações de governança */}
        <section className="rounded-2xl border border-border/70 bg-card shadow-sm">
          <header className="border-b border-border/50 px-5 py-4">
            <h2 className="font-serif text-lg text-foreground">Atestações de governança</h2>
            <p className="text-xs text-muted-foreground">
              A fronteira ética do ciclo — cada linha é auditável.
            </p>
          </header>
          <div className="divide-y divide-border/40">
            {report.attestations.map((a) => (
              <div key={a.label} className="flex items-start gap-3 px-5 py-3.5">
                <span
                  className={`mt-0.5 shrink-0 text-base ${a.ok ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}
                  aria-hidden
                >
                  {a.ok ? "✓" : "⚠"}
                </span>
                <div>
                  <p className="text-sm font-medium text-card-foreground">{a.label}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{a.note}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <p className="text-center text-xs text-muted-foreground print:hidden">
          Compõe{" "}
          <Link to="/copiloto" className="underline underline-offset-2 hover:text-foreground">
            FlorescerIA
          </Link>
          ,{" "}
          <Link to="/experimentos" className="underline underline-offset-2 hover:text-foreground">
            Evidência
          </Link>
          ,{" "}
          <Link to="/temporada" className="underline underline-offset-2 hover:text-foreground">
            Temporada
          </Link>{" "}
          e{" "}
          <Link to="/privacidade" className="underline underline-offset-2 hover:text-foreground">
            Privacidade
          </Link>
          .
        </p>

        {/* Rodapé institucional — só na impressão */}
        <div className="print-only mt-4 border-t border-border pt-3">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Confidencial — uso interno do conselho. Dados agregados (k≥5).</span>
            <span>Gerado pelo 4 Lentes VITA™ · VitalOS</span>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
