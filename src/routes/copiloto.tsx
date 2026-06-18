import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppShell } from "@/app/shell/AppShell";
import { useIvo } from "@/mocks/hooks";
import { usePack } from "@/engine/pack";
import { calculateIVO } from "@/engine/index/ivo-engine";
import { proposeActions, type AgentProposal } from "@/engine/ai/agent-engine";
import { AI_GUARDRAILS } from "@/engine/ai/ai-types";
import { rankPriorities } from "@/engine/priority/priority-engine";
import { evaluateEvidence } from "@/engine/lab/evidence-engine";
import { computeSeasonOverview } from "@/engine/season/season-engine";
import { buildTrend } from "@/engine/trend/trend-engine";
import { reconcileSignals } from "@/engine/signals/signals-engine";
import { orgChannelAvailable } from "@/engine/trust/consent-engine";
import { getNudgeLibrary } from "@/engine/nudges/nudge-engine";
import { planDelivery, type DeliveryPlan } from "@/engine/nudges/orchestration-engine";
import {
  detectEarlyWarnings,
  type EarlyWarningResult,
  type RiskAlert,
  type BlockedLayer,
} from "@/engine/ai/earlywarning-engine";
import { FORECAST_LEVERS, pillarsFromIvo } from "@/mocks/forecast-mock";
import { ambassadorshipForPillar } from "@/mocks/priority-mock";
import { EXPERIMENT_CASES } from "@/mocks/experiment-mock";
import { ANNUAL_PLAN, CURRENT_PROGRAM_WEEK } from "@/mocks/season-mock";
import { PROTOCOLS } from "@/mocks/lab-mock";
import { TREND_CYCLES } from "@/mocks/trend-mock";
import { PERCEPTION_BEHAVIOR_INPUT } from "@/mocks/signals-mock";
import { CONSENT_CHANNELS } from "@/mocks/consent-mock";
import {
  URGENCY_COPY,
  KIND_COPY,
  COPILOTO_INTRO,
  VIGILANCIA_INTRO,
  STATUS_COPY,
  SEVERITY_COPY,
  SOURCE_COPY,
  LACO_INTRO,
} from "@/mocks/copiloto-mock";

interface LoopState {
  pillarName: string;
  leverLabel: string;
  lift: number;
  owner: string | null;
  plan: DeliveryPlan;
}

export const Route = createFileRoute("/copiloto")({
  head: () => ({ meta: [{ title: "FlorescerIA Proativa — 4 Lentes VitalOS™" }] }),
  component: CopilotoPage,
});

type Decision = "pending" | "approved" | "dismissed";

function CopilotoPage() {
  const { current, previous } = useIvo();
  const { index, gamification } = usePack();

  const { proposals, warning, loop } = useMemo<{
    proposals: AgentProposal[];
    warning: EarlyWarningResult | null;
    loop: LoopState | null;
  }>(() => {
    if (!current) return { proposals: [], warning: null, loop: null };
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
      experiments,
      phaseId: season.currentPhase.id,
      seasonName: season.currentSeason.name,
    });

    // ── Vigilância · Alerta Precoce ──
    // Compõe quatro motores: trend (curva), signals (divergência), consent (gate)
    // e priority (primeiro movimento). A IA proativa agora OBSERVA, não só propõe.
    let warning: EarlyWarningResult | null = null;
    if (index) {
      const points = TREND_CYCLES.map((c) => {
        const r = calculateIVO(c, index);
        return {
          cycleId: c.cycleId,
          label: c.cycleId,
          ivo: r.ivoScore,
          lenses: r.lenses.map((l) => ({ id: l.lensId, name: l.lensName, score: l.score })),
        };
      });
      const trend = buildTrend(points);

      // Canais que a IA pode observar no agregado (consentimento coletivo, k-anon).
      const observableChannels = new Set(
        CONSENT_CHANNELS.filter((ch) => orgChannelAvailable(ch)).map((ch) => ch.id),
      );
      const reconciliation = observableChannels.has("signals")
        ? reconcileSignals([...PERCEPTION_BEHAVIOR_INPUT])
        : null;

      warning = detectEarlyWarnings({
        trend,
        reconciliation,
        decliningPillars: declining,
        topMove: top
          ? {
              label: top.label,
              lift: top.expectedIvoLift,
              isQuickWin: top.isQuickWin,
              owner: owner?.name ?? null,
            }
          : null,
        observableChannels,
      });
    }

    // ── Laço M.E.T.E.: Propor → Entregar → Medir ──
    // A prioridade #1 vira um plano de entrega concreto (nudge-engine), expondo o
    // que aguarda opt-in / está no teto de frequência. Fecha o ciclo da IA proativa.
    let loop: LoopState | null = null;
    if (top && gamification) {
      const library = getNudgeLibrary(gamification);
      const pillarHasNudge = (id?: string) => Boolean(id) && library.some((n) => n.pillarId === id);
      // Maior alavancagem que JÁ tem nudge pronto; senão, a #1 (estado-vazio honesto).
      const chosen =
        priorities.items.find((it) => pillarHasNudge(it.addressedPillars[0]?.pillarId)) ?? top;
      const chosenOwner = chosen.addressedPillars[0]
        ? ambassadorshipForPillar(chosen.addressedPillars[0].pillarId)
        : owner;
      const pillar = chosen.addressedPillars[0] ?? null;
      const plan = planDelivery(library, {
        pillarId: pillar?.pillarId ?? "",
        role: "COLABORADOR",
        optedInNudgeIds: new Set<string>(),
        deliveredThisWeek: new Map<string, number>(),
        max: 3,
      });
      loop = {
        pillarName: pillar?.name ?? chosen.label,
        leverLabel: chosen.label,
        lift: chosen.expectedIvoLift,
        owner: chosenOwner?.name ?? null,
        plan,
      };
    }

    return { proposals, warning, loop };
  }, [current, previous, index, gamification]);

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
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {COPILOTO_INTRO.eyebrow}
          </p>
          <h1 className="mt-1 font-serif text-3xl text-foreground">{COPILOTO_INTRO.title}</h1>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {COPILOTO_INTRO.lead}
          </p>
        </motion.div>

        {/* Vigilância · Alerta Precoce */}
        {warning && <VigilanciaSection warning={warning} />}

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

        {/* Laço M.E.T.E. */}
        {loop && <LacoSection loop={loop} />}

        {/* Guardrails */}
        <section className="rounded-2xl border border-border/60 bg-muted/30 p-5">
          <h2 className="mb-3 font-serif text-base text-foreground">
            Como a FlorescerIA se autolimita
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-xs uppercase tracking-[0.12em] text-red-600 dark:text-red-400">
                Nunca
              </p>
              <ul className="space-y-1">
                {AI_GUARDRAILS.never.map((g) => (
                  <li
                    key={g}
                    className="flex gap-1.5 text-xs leading-relaxed text-muted-foreground"
                  >
                    <span className="text-red-500/60" aria-hidden>
                      ✕
                    </span>
                    {g}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-1.5 text-xs uppercase tracking-[0.12em] text-emerald-600 dark:text-emerald-400">
                Sempre
              </p>
              <ul className="space-y-1">
                {AI_GUARDRAILS.always.map((g) => (
                  <li
                    key={g}
                    className="flex gap-1.5 text-xs leading-relaxed text-muted-foreground"
                  >
                    <span className="text-emerald-500/60" aria-hidden>
                      ✓
                    </span>
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

// ─── Vigilância · Alerta Precoce ──────────────────────────────────────────────

function VigilanciaSection({ warning }: { warning: EarlyWarningResult }) {
  const status = STATUS_COPY[warning.status];
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 }}
      className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
      aria-label="Vigilância e alerta precoce"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            {VIGILANCIA_INTRO.eyebrow}
          </p>
          <h2 className="mt-1 font-serif text-xl text-foreground">{VIGILANCIA_INTRO.title}</h2>
        </div>
        <span
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium"
          style={{ color: status.dot }}
        >
          <span className="h-2 w-2 rounded-full" style={{ background: status.dot }} aria-hidden />
          {status.label}
        </span>
      </div>

      <p className="mt-2 text-base leading-relaxed text-muted-foreground">{warning.headline}</p>

      {warning.alerts.length > 0 && (
        <div className="mt-4 space-y-2.5">
          {warning.alerts.map((a) => (
            <RiskAlertCard key={a.id} alert={a} />
          ))}
        </div>
      )}

      {warning.blocked.map((b) => (
        <BlockedLayerCard key={b.channel} layer={b} />
      ))}

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        Compõe{" "}
        <Link to="/evolucao" className="underline underline-offset-2 hover:text-foreground">
          Evolução
        </Link>
        ,{" "}
        <Link to="/sinais" className="underline underline-offset-2 hover:text-foreground">
          Sinais Vivos
        </Link>{" "}
        e{" "}
        <Link to="/privacidade" className="underline underline-offset-2 hover:text-foreground">
          Privacidade
        </Link>{" "}
        — só agregados (k≥5), só canais consentidos. Tendência, não promessa.
      </p>
    </motion.section>
  );
}

// ─── Laço M.E.T.E. · Propor → Entregar → Medir ────────────────────────────────

function LacoSection({ loop }: { loop: LoopState }) {
  const { plan } = loop;
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
      aria-label="Laço M.E.T.E. da proposta à prova"
    >
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
        {LACO_INTRO.eyebrow}
      </p>
      <h2 className="mt-1 font-serif text-xl text-foreground">{LACO_INTRO.title}</h2>
      <p className="mt-1.5 text-base leading-relaxed text-muted-foreground">{LACO_INTRO.lead}</p>

      <ol className="mt-4 grid gap-3 sm:grid-cols-3">
        {/* Propor */}
        <LoopStage step="01" label={LACO_INTRO.stages.propor} tone="primary">
          <p className="text-sm font-medium text-card-foreground">{loop.leverLabel}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            +{loop.lift} pts em <span className="font-medium">{loop.pillarName}</span>
            {loop.owner ? ` · ${loop.owner}` : ""}
          </p>
        </LoopStage>

        {/* Entregar */}
        <LoopStage step="02" label={LACO_INTRO.stages.entregar} tone="default">
          {plan.delivered.length > 0 ? (
            <ul className="space-y-1">
              {plan.delivered.map((d) => (
                <li key={d.nudge.id} className="flex gap-1.5 text-xs text-card-foreground">
                  <span className="text-primary" aria-hidden>
                    ✓
                  </span>
                  <span className="leading-snug">{d.nudge.copy}</span>
                </li>
              ))}
            </ul>
          ) : plan.candidateCount > 0 ? (
            <p className="text-xs leading-snug text-muted-foreground">
              Há {plan.candidateCount} nudge{plan.candidateCount > 1 ? "s" : ""} para este pilar,
              mas a entrega{" "}
              <span className="font-medium text-foreground">aguarda consentimento</span> — a IA não
              envia sem opt-in.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Sem nudge pronto para este pilar — candidato a criar no Culture Lab.
            </p>
          )}
          {(plan.optInPending > 0 || plan.capped > 0) && (
            <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
              {plan.optInPending > 0 && `${plan.optInPending} aguardando opt-in`}
              {plan.optInPending > 0 && plan.capped > 0 && " · "}
              {plan.capped > 0 && `${plan.capped} no teto da semana`}
              {" — respeitado por princípio."}
            </p>
          )}
        </LoopStage>

        {/* Medir */}
        <LoopStage step="03" label={LACO_INTRO.stages.medir} tone="default">
          <p className="text-xs text-muted-foreground">
            Virar experimento e medir o efeito real (diff-in-diff honesto).
          </p>
          <Link
            to="/experimentos"
            className="mt-2 inline-block text-xs text-primary underline underline-offset-2"
          >
            abrir a camada de evidência →
          </Link>
        </LoopStage>
      </ol>
    </motion.section>
  );
}

function LoopStage({
  step,
  label,
  tone,
  children,
}: {
  step: string;
  label: string;
  tone: "primary" | "default";
  children: React.ReactNode;
}) {
  return (
    <li
      className={`rounded-xl border p-3.5 ${
        tone === "primary" ? "border-primary/30 bg-primary/5" : "border-border/60 bg-background"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] tracking-widest text-muted-foreground">{step}</span>
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
          {label}
        </span>
      </div>
      <div className="mt-2">{children}</div>
    </li>
  );
}

function RiskAlertCard({ alert }: { alert: RiskAlert }) {
  const sev = SEVERITY_COPY[alert.severity];
  const src = SOURCE_COPY[alert.source];
  return (
    <div
      className="rounded-xl border-l-4 bg-background px-4 py-3"
      style={{ borderLeftColor: sev.dot }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-base" aria-hidden>
          {src.icon}
        </span>
        <span className="text-sm font-medium text-card-foreground">{alert.title}</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${sev.bg} ${sev.color}`}>
          {sev.label}
        </span>
        {alert.requiresChannel && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
            canal: {alert.requiresChannel}
          </span>
        )}
        <Link
          to={alert.targetRoute}
          className="ml-auto text-xs text-primary underline underline-offset-2"
        >
          ver →
        </Link>
      </div>
      <p className="mt-1.5 text-sm tabular-nums text-muted-foreground">{alert.evidence}</p>
      <p className="mt-1 text-sm leading-relaxed text-card-foreground">{alert.interpretation}</p>
      {alert.recommendedMove && (
        <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-muted/50 px-3 py-2 text-sm text-foreground">
          <span className="text-primary" aria-hidden>
            →
          </span>
          {alert.recommendedMove}
        </p>
      )}
    </div>
  );
}

function BlockedLayerCard({ layer }: { layer: BlockedLayer }) {
  return (
    <div className="mt-2.5 flex items-start gap-2.5 rounded-xl border border-dashed border-border bg-muted/20 px-4 py-3">
      <span className="mt-0.5 text-base" aria-hidden>
        🔒
      </span>
      <div>
        <p className="text-sm font-medium text-card-foreground">{layer.title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{layer.note}</p>
      </div>
    </div>
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
      <span className="ml-1.5 text-xs text-muted-foreground">{label}</span>
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
            <p className="text-xs font-medium text-card-foreground">{kind.label}</p>
            <span className={`text-xs ${urgency.color}`}>
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
      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="text-emerald-500/70" aria-hidden>
          ✓
        </span>
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
            className="ml-auto text-xs text-primary underline underline-offset-2"
          >
            ver contexto →
          </Link>
        </div>
      ) : (
        <div className="mt-4 rounded-lg bg-muted/50 px-3 py-2">
          <p className="text-xs text-muted-foreground">
            {decision === "approved" ? COPILOTO_INTRO.approvedNote : COPILOTO_INTRO.dismissedNote}
          </p>
          {decision === "approved" && (
            <Link
              to={proposal.targetRoute}
              className="mt-1 inline-block text-xs text-primary underline underline-offset-2"
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
      <span className="w-16 shrink-0 text-xs uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </span>
      <p
        className={`text-base leading-relaxed ${
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
