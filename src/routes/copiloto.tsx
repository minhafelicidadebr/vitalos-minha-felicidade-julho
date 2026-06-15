import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppShell } from "@/app/shell/AppShell";
import { useIvo } from "@/mocks/hooks";
import { proposeActions, type AgentProposal } from "@/engine/ai/agent-engine";
import { AI_GUARDRAILS } from "@/engine/ai/ai-types";
import { rankPriorities } from "@/engine/priority/priority-engine";
import { evaluateEvidence } from "@/engine/lab/evidence-engine";
import { computeSeasonOverview } from "@/engine/season/season-engine";
import { FORECAST_LEVERS, pillarsFromIvo } from "@/mocks/forecast-mock";
import { ambassadorshipForPillar } from "@/mocks/priority-mock";
import { EXPERIMENT_CASES } from "@/mocks/experiment-mock";
import { ANNUAL_PLAN, CURRENT_PROGRAM_WEEK } from "@/mocks/season-mock";
import { PROTOCOLS } from "@/mocks/lab-mock";
import { URGENCY_COPY, KIND_COPY, COPILOTO_INTRO } from "@/mocks/copiloto-mock";

export const Route = createFileRoute("/copiloto")({
  head: () => ({ meta: [{ title: "FlorescerIA Proativa — 4 Lentes VITA" }] }),
  component: CopilotoPage,
});

type Decision = "pending" | "approved" | "dismissed";

function CopilotoPage() {
  const { current, previous } = useIvo();

  const proposals = useMemo(() => {
    if (!current) return [];
    const pillars = pillarsFromIvo(current);

    // Prioridade #1 + dono
    const priorities = rankPriorities(pillars, FORECAST_LEVERS, { scenario: "medio" });
    const top = priorities.items[0] ?? null;
    const owner = top?.addressedPillars[0]
      ? ambassadorshipForPillar(top.addressedPillars[0].pillarId)
      : null;

    // Pilares em queda vs. ciclo anterior (visíveis)
    const prevScores = new Map(
      (previous?.lenses ?? []).flatMap((l) => l.pillars.map((p) => [p.pillarId, p.score] as const)),
    );
    const declining = current.lenses
      .flatMap((l) => l.pillars)
      .filter((p) => p.visible && prevScores.has(p.pillarId))
      .map((p) => ({ p, drop: (prevScores.get(p.pillarId) ?? p.score) - p.score }))
      .filter(({ drop }) => drop >= 6)
      .sort((a, b) => b.drop - a.drop)
      .slice(0, 2)
      .map(({ p, drop }) => ({
        pillarId: p.pillarId,
        name: p.pillarName,
        score: p.score,
        drop,
      }));

    // Experimentos concluídos → veredito
    const experiments = EXPERIMENT_CASES.filter((c) => c.status === "concluido" && c.observed).map(
      (c) => {
        const v = evaluateEvidence(c.observed!);
        const name = c.protocolId
          ? (PROTOCOLS.find((pr) => pr.id === c.protocolId)?.name ?? c.id)
          : c.id;
        return {
          id: c.id,
          name,
          verdict: v.verdict,
          netEffect: v.netEffect,
          reportable: v.reportable,
        };
      },
    );

    const season = computeSeasonOverview(ANNUAL_PLAN, CURRENT_PROGRAM_WEEK);

    return proposeActions({
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
      experiments,
      phaseId: season.currentPhase.id,
      seasonName: season.currentSeason.name,
    });
  }, [current, previous]);

  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const decide = (id: string, d: Decision) => setDecisions((prev) => ({ ...prev, [id]: d }));

  const pending = proposals.filter((p) => (decisions[p.id] ?? "pending") === "pending");
  const approvedCount = Object.values(decisions).filter((d) => d === "approved").length;
  const dismissedCount = Object.values(decisions).filter((d) => d === "dismissed").length;

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {COPILOTO_INTRO.eyebrow}
          </p>
          <h1 className="mt-1 font-serif text-3xl text-foreground">{COPILOTO_INTRO.title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {COPILOTO_INTRO.lead}
          </p>
        </motion.div>

        {/* Trilha de auditoria */}
        <div className="flex flex-wrap gap-3">
          <AuditChip label="Pendentes" value={pending.length} />
          <AuditChip label="Aprovadas" value={approvedCount} tone="emerald" />
          <AuditChip label="Dispensadas" value={dismissedCount} tone="muted" />
        </div>

        {/* Propostas */}
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {proposals.map((p) => (
              <ProposalCard
                key={p.id}
                proposal={p}
                decision={decisions[p.id] ?? "pending"}
                onDecide={(d) => decide(p.id, d)}
              />
            ))}
          </AnimatePresence>

          {proposals.length === 0 && (
            <div className="rounded-2xl border border-border/60 bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Nenhuma proposta no momento — a vitalidade está estável e sem sinais de ação
                urgente.
              </p>
            </div>
          )}
        </div>

        {/* Guardrails */}
        <section className="rounded-2xl border border-border/60 bg-muted/30 p-5">
          <h2 className="mb-3 font-serif text-base text-foreground">
            Como a FlorescerIA se autolimita
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-[10px] uppercase tracking-[0.12em] text-red-600 dark:text-red-400">
                Nunca
              </p>
              <ul className="space-y-1">
                {AI_GUARDRAILS.never.map((g) => (
                  <li
                    key={g}
                    className="flex gap-1.5 text-[11px] leading-relaxed text-muted-foreground"
                  >
                    <span className="text-red-500/60">✕</span>
                    {g}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-1.5 text-[10px] uppercase tracking-[0.12em] text-emerald-600 dark:text-emerald-400">
                Sempre
              </p>
              <ul className="space-y-1">
                {AI_GUARDRAILS.always.map((g) => (
                  <li
                    key={g}
                    className="flex gap-1.5 text-[11px] leading-relaxed text-muted-foreground"
                  >
                    <span className="text-emerald-500/60">✓</span>
                    {g}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <p className="text-center text-xs text-muted-foreground">
          As propostas derivam de{" "}
          <Link to="/prioridades" className="underline underline-offset-2 hover:text-foreground">
            Prioridades
          </Link>
          ,{" "}
          <Link to="/experimentos" className="underline underline-offset-2 hover:text-foreground">
            Evidência
          </Link>{" "}
          e do{" "}
          <Link to="/panorama" className="underline underline-offset-2 hover:text-foreground">
            Panorama
          </Link>{" "}
          — a FlorescerIA não inventa, ela lê os motores.
        </p>
      </div>
    </AppShell>
  );
}

function AuditChip({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "emerald" | "muted";
}) {
  const color =
    tone === "emerald"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "muted"
        ? "text-muted-foreground"
        : "text-foreground";
  return (
    <div className="rounded-xl border border-border/60 bg-card px-3 py-2">
      <span className={`font-serif text-lg ${color}`}>{value}</span>
      <span className="ml-1.5 text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
}

// ─── Cartão de proposta ───────────────────────────────────────────────────────

function ProposalCard({
  proposal,
  decision,
  onDecide,
}: {
  proposal: AgentProposal;
  decision: Decision;
  onDecide: (d: Decision) => void;
}) {
  const urgency = URGENCY_COPY[proposal.urgency];
  const kind = KIND_COPY[proposal.kind];
  const decided = decision !== "pending";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className={`rounded-2xl border bg-card p-5 shadow-sm transition-colors ${
        decision === "approved"
          ? "border-emerald-300/60 dark:border-emerald-800/50"
          : decision === "dismissed"
            ? "border-border/40 opacity-70"
            : "border-border/70"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-lg" aria-hidden>
            {kind.icon}
          </span>
          <div>
            <p className="text-[11px] font-medium text-card-foreground">{kind.label}</p>
            <span className={`text-[10px] ${urgency.color}`}>
              urgência {urgency.label.toLowerCase()}
            </span>
          </div>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${urgency.bg} ${urgency.color}`}
        >
          {urgency.label}
        </span>
      </div>

      {/* O que observei / sugiro / por quê */}
      <div className="mt-3 space-y-2">
        <Line label="Observei" text={proposal.trigger} />
        <Line label="Sugiro" text={proposal.recommendation} strong />
        <Line label="Porquê" text={proposal.rationale} muted />
      </div>

      {/* Guardrail + human-in-the-loop */}
      <p className="mt-3 flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <span className="text-emerald-500/70">✓</span>
        Apenas agregados · requer sua aprovação
      </p>

      {/* Ação */}
      {!decided ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={() => onDecide("approved")}
            className="rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            {kind.cta}
          </button>
          <button
            onClick={() => onDecide("dismissed")}
            className="rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Dispensar
          </button>
          <Link
            to={proposal.targetRoute}
            className="ml-auto text-[11px] text-primary underline underline-offset-2"
          >
            ver contexto →
          </Link>
        </div>
      ) : (
        <div className="mt-4 rounded-lg bg-muted/50 px-3 py-2">
          <p className="text-[11px] text-muted-foreground">
            {decision === "approved" ? COPILOTO_INTRO.approvedNote : COPILOTO_INTRO.dismissedNote}
          </p>
          {decision === "approved" && (
            <Link
              to={proposal.targetRoute}
              className="mt-1 inline-block text-[11px] text-primary underline underline-offset-2"
            >
              ir para o próximo passo →
            </Link>
          )}
        </div>
      )}
    </motion.div>
  );
}

function Line({
  label,
  text,
  strong,
  muted,
}: {
  label: string;
  text: string;
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex gap-2">
      <span className="w-16 shrink-0 text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </span>
      <p
        className={`text-sm leading-relaxed ${
          strong
            ? "font-medium text-card-foreground"
            : muted
              ? "text-muted-foreground"
              : "text-card-foreground"
        }`}
      >
        {text}
      </p>
    </div>
  );
}
