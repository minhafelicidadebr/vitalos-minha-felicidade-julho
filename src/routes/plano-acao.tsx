import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarClock, ClipboardCheck, History, ShieldCheck, Target, UserRound } from "lucide-react";
import { AppShell } from "@/app/shell/AppShell";
import { usePack } from "@/engine/pack";
import {
  ACTION_LOG_SEED,
  ACTION_PLAN_INTRO,
  ENRICHED_PLAN,
} from "@/mocks/action-plan-mock";
import type { EnrichedActionItem } from "@/engine/action-plan/plan-enrichment-engine";
import {
  buildActionTimeline,
  foldActionStatus,
  summarizeActionLog,
  type ActionLogEvent,
  type PlanActionStatus,
} from "@/engine/action-plan/action-log-engine";

export const Route = createFileRoute("/plano-acao")({
  head: () => ({ meta: [{ title: "Plano de Ação — 4 Lentes VitalOS™" }] }),
  component: PlanoAcao,
});

// ─── Vocabulário via pack (cast único e contido — §6 da SKILL_MESTRA) ────────

interface ActionPlanGovernance {
  statusLabels: Record<string, string>;
  evidenceKinds: Array<{ id: string; label: string }>;
  ownerDisclaimer: string;
  section13Note: string;
}

const GOVERNANCE_FALLBACK: ActionPlanGovernance = {
  statusLabels: {
    planejada: "Planejada",
    em_execucao: "Em execução",
    concluida: "Concluída",
    em_vigilancia: "Em vigilância",
    interrompida: "Interrompida",
  },
  evidenceKinds: [],
  ownerDisclaimer: "O responsável responde pela medida, nunca pelo risco de ninguém.",
  section13Note: "Guia MTE 2026 §13: toda ação com responsável, prazo e métrica.",
};

// ─── Helpers visuais ─────────────────────────────────────────────────────────

const LIFECYCLE_STYLE: Record<PlanActionStatus, string> = {
  planejada: "bg-muted/60 text-muted-foreground border-border/50",
  em_execucao:
    "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/40",
  concluida: "bg-primary/8 text-primary border-primary/20",
  em_vigilancia:
    "bg-accent/15 text-amber-800 border-accent/30 dark:text-amber-300",
  interrompida:
    "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800/40",
};

const TIER_LABEL: Record<string, string> = {
  eliminacao: "Eliminação",
  organizacao: "Organização",
  administrativa: "Administrativa",
  monitoramento: "Monitoramento",
};

const EFFORT_DOT: Record<string, string> = {
  baixo: "bg-emerald-500",
  medio: "bg-amber-500",
  alto: "bg-rose-500",
};

const EFFORT_LABEL: Record<string, string> = { baixo: "Baixo", medio: "Médio", alto: "Alto" };

const MISSING_LABEL: Record<string, string> = {
  owner: "responsável",
  dueOn: "prazo",
  metric: "métrica",
};

const LOG_KIND_LABEL: Record<ActionLogEvent["kind"], string> = {
  status_change: "Status",
  checkin: "Check-in",
  note: "Nota",
  maintenance_check: "Vigia",
  evidence_recorded: "Evidência",
};

function SeasonBar({ current, total, color }: { current: number; total: number; color: string }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
          aria-label={`Semana ${current} de ${total}`}
        />
      </div>
      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
        S{current}/{total}
      </span>
    </div>
  );
}

function WeekRuler({ item, totalWeeks }: { item: EnrichedActionItem; totalWeeks: number }) {
  const cells = Array.from({ length: totalWeeks }, (_, i) => i + 1);
  return (
    <div className="mt-2 flex gap-px" aria-label={`Semanas ${item.startWeek} a ${item.endWeek}`}>
      {cells.map((w) => {
        const active = w >= item.startWeek && w <= item.endWeek;
        const milestone = w === item.milestoneWeek;
        return (
          <div
            key={w}
            title={milestone ? `S${w} — Milestone` : `S${w}`}
            className={`h-3 flex-1 rounded-sm transition-colors ${
              milestone ? "bg-accent" : active ? "bg-primary/70" : "bg-muted"
            }`}
          />
        );
      })}
    </div>
  );
}

// Medidor §13 — o critério de aceite do S6 como número COMPUTADO, nunca afirmado.
function Section13Gauge({
  gauge,
  note,
}: {
  gauge: (typeof ENRICHED_PLAN)["gauge"];
  note: string;
}) {
  const missing = Object.entries(gauge.missingByField).filter(([, count]) => count > 0);
  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary" aria-hidden>
            <ClipboardCheck className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Medidor §13
            </p>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted-foreground">{note}</p>
          </div>
        </div>
        <div className="text-right">
          <p
            className="font-serif text-4xl font-semibold tabular-nums text-primary"
            role="meter"
            aria-valuenow={gauge.pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Completude do plano segundo o §13: ${gauge.pct}%`}
          >
            {gauge.pct}%
          </p>
          <p className="text-xs text-muted-foreground">
            {gauge.compliant} de {gauge.total} ações completas
          </p>
        </div>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${gauge.pct}%` }} />
      </div>
      {missing.length > 0 && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Faltando:{" "}
          {missing
            .map(([field, count]) => `${count} sem ${MISSING_LABEL[field] ?? field}`)
            .join(" · ")}
        </p>
      )}
    </div>
  );
}

// Card de uma ação enriquecida (§13 + ciclo de vida por fold do Action Log)
function ActionCard({
  item,
  totalWeeks,
  index,
  lifecycle,
  timeline,
  statusLabels,
}: {
  item: EnrichedActionItem;
  totalWeeks: number;
  index: number;
  lifecycle: PlanActionStatus;
  timeline: ActionLogEvent[];
  statusLabels: Record<string, string>;
}) {
  const [showLog, setShowLog] = useState(false);
  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04 }}
      className="rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_0_rgba(0,0,0,0.02)]"
      aria-label={item.leverLabel}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs tracking-widest text-muted-foreground">#{item.rank}</span>
          {item.isQuickWin && (
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-300">
              Vitória rápida
            </span>
          )}
          {item.controlTier && (
            <span className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
              NR-01 · {TIER_LABEL[item.controlTier]}
            </span>
          )}
        </div>
        <span
          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${LIFECYCLE_STYLE[lifecycle]}`}
        >
          {statusLabels[lifecycle] ?? lifecycle}
        </span>
      </div>

      <p className="mt-3 font-serif text-base text-card-foreground">{item.leverLabel}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.description}</p>

      {/* Accountability §13 — presença honesta, falta nomeada */}
      <div className="mt-4 grid gap-2 rounded-xl border border-border/50 bg-background/40 p-3 text-xs sm:grid-cols-3">
        <div className="flex items-start gap-2">
          <UserRound className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
          <div>
            <p className="uppercase tracking-[0.12em] text-muted-foreground">Responsável</p>
            <p className="mt-0.5 text-card-foreground">
              {item.owner ? item.owner.displayRole : <span className="text-amber-700 dark:text-amber-300">a definir</span>}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <CalendarClock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
          <div>
            <p className="uppercase tracking-[0.12em] text-muted-foreground">Prazo</p>
            <p className="mt-0.5 text-card-foreground">
              {item.dueOn ?? <span className="text-amber-700 dark:text-amber-300">a definir</span>}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
          <div>
            <p className="uppercase tracking-[0.12em] text-muted-foreground">Métrica</p>
            <p className="mt-0.5 text-card-foreground">
              {item.metric ? (
                <>
                  {item.metric.label}{" "}
                  <span className="tabular-nums text-muted-foreground">
                    ({item.metric.baseline}→{item.metric.target} {item.metric.unit})
                  </span>
                </>
              ) : (
                <span className="text-amber-700 dark:text-amber-300">a definir</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {item.cmo && (
        <p className="mt-2 rounded-lg bg-muted/40 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">Hipótese:</span> {item.cmo.context},{" "}
          {item.cmo.mechanism} — {item.cmo.outcome}.
        </p>
      )}

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
        <div>
          <dt className="uppercase tracking-[0.12em] text-muted-foreground">Lift IVO</dt>
          <dd className="mt-0.5 font-serif text-lg font-semibold tabular-nums text-primary">
            +{item.expectedIvoLift}
          </dd>
        </div>
        <div>
          <dt className="uppercase tracking-[0.12em] text-muted-foreground">Esforço</dt>
          <dd className="mt-0.5 flex items-center gap-1.5 text-sm text-card-foreground">
            <span className={`h-2 w-2 rounded-full ${EFFORT_DOT[item.effort]}`} aria-hidden />
            {EFFORT_LABEL[item.effort]}
          </dd>
        </div>
        {item.amb.name && (
          <div>
            <dt className="uppercase tracking-[0.12em] text-muted-foreground">Embaixadoria</dt>
            <dd className="mt-0.5 text-sm text-card-foreground" title={item.amb.name}>
              {item.amb.emoji} {item.amb.name}
            </dd>
          </div>
        )}
        {item.lensLabel && (
          <div>
            <dt className="uppercase tracking-[0.12em] text-muted-foreground">Lente</dt>
            <dd
              className="mt-0.5 rounded px-1.5 py-0.5 text-xs font-semibold text-white"
              style={{ background: item.lensColor ?? "var(--color-primary)" }}
            >
              {item.lensLabel}
            </dd>
          </div>
        )}
      </dl>

      <div className="mt-4">
        <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Semanas {item.startWeek}–{item.endWeek} · Milestone S{item.milestoneWeek}
        </p>
        <WeekRuler item={item} totalWeeks={totalWeeks} />
      </div>

      {item.esgCodes.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Indicadores ESG desbloqueados">
          {item.esgCodes.map((c) => (
            <span
              key={c}
              className="rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground"
            >
              {c}
            </span>
          ))}
        </div>
      )}

      {/* Timeline do Action Log — status é fold de eventos, nunca opinião */}
      {timeline.length > 0 && (
        <div className="mt-4 border-t border-border/50 pt-3">
          <button
            type="button"
            onClick={() => setShowLog((v) => !v)}
            aria-expanded={showLog}
            className="inline-flex min-h-9 items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            <History className="h-3.5 w-3.5" aria-hidden />
            {showLog ? "Ocultar registro" : `Registro da ação (${timeline.length} eventos)`}
          </button>
          {showLog && (
            <ol className="mt-2 space-y-1.5">
              {timeline.map((event) => (
                <li key={event.id} className="flex items-start gap-2 text-[11px] text-muted-foreground">
                  <span className="mt-0.5 shrink-0 rounded bg-muted px-1.5 py-0.5 font-medium">
                    {LOG_KIND_LABEL[event.kind]}
                  </span>
                  <span>
                    {event.occurredOn} · {event.actorRole}
                    {event.kind === "status_change" && event.toStatus
                      ? ` → ${statusLabels[event.toStatus] ?? event.toStatus}`
                      : ""}
                    {event.kind === "maintenance_check"
                      ? event.maintained
                        ? " — medida segue em funcionamento"
                        : " — medida em desuso (crédito de eficácia retirado)"
                      : ""}
                    {event.kind === "evidence_recorded" && event.evidenceKind
                      ? ` — ${event.evidenceKind} (ref. ${event.evidenceRef ?? "—"})`
                      : ""}
                    {event.note ? ` — ${event.note}` : ""}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </motion.article>
  );
}

// ─── Página ──────────────────────────────────────────────────────────────────

function PlanoAcao() {
  const { pack } = usePack();
  const governance =
    ((pack as { actionPlanGovernance?: ActionPlanGovernance } | null)?.actionPlanGovernance ??
      GOVERNANCE_FALLBACK);

  const plan = ENRICHED_PLAN;
  const { lifecycleByAction, timelineByAction, logSummary } = useMemo(() => {
    const keys = plan.actions.map((a) => a.leverId);
    return {
      lifecycleByAction: new Map(
        keys.map((key) => [key, foldActionStatus(ACTION_LOG_SEED, key)]),
      ),
      timelineByAction: new Map(keys.map((key) => [key, buildActionTimeline(ACTION_LOG_SEED, key)])),
      logSummary: summarizeActionLog(ACTION_LOG_SEED, keys),
    };
  }, [plan.actions]);

  return (
    <AppShell>
      <section className="border-b border-border/40">
        <div className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {ACTION_PLAN_INTRO.eyebrow}
            </p>
            <h1 className="mt-3 font-serif text-3xl text-foreground sm:text-4xl">
              {ACTION_PLAN_INTRO.title}
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
              {ACTION_PLAN_INTRO.lead}
            </p>
          </motion.div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-6">
          <Section13Gauge gauge={plan.gauge} note={governance.section13Note} />
        </div>

        <div className="mb-8 rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_0_rgba(0,0,0,0.02)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full" style={{ background: plan.season.color }} aria-hidden />
              <div>
                <p className="font-serif text-base font-medium text-card-foreground">
                  {plan.season.name}
                </p>
                <p className="text-xs text-muted-foreground">Fase atual: {plan.season.phaseLabel}</p>
              </div>
            </div>

            <dl className="flex flex-wrap gap-6 text-xs">
              <div className="text-center">
                <dt className="uppercase tracking-[0.12em] text-muted-foreground">Ações no plano</dt>
                <dd className="mt-0.5 font-serif text-2xl text-foreground">{plan.actions.length}</dd>
              </div>
              <div className="text-center">
                <dt className="uppercase tracking-[0.12em] text-muted-foreground">Concluídas</dt>
                <dd className="mt-0.5 font-serif text-2xl text-foreground">
                  {logSummary.concludedCount}
                  <span className="text-sm text-muted-foreground"> ({logSummary.pctConcluded}%)</span>
                </dd>
              </div>
              <div className="text-center">
                <dt className="uppercase tracking-[0.12em] text-muted-foreground">Vitórias rápidas</dt>
                <dd className="mt-0.5 font-serif text-2xl text-foreground">{plan.quickWinCount}</dd>
              </div>
              <div className="text-center">
                <dt className="uppercase tracking-[0.12em] text-muted-foreground">Lift IVO total</dt>
                <dd className="mt-0.5 font-serif text-2xl text-primary">+{plan.scheduledIvoLift}</dd>
              </div>
            </dl>
          </div>

          <div className="mt-4">
            <SeasonBar current={plan.season.currentWeek} total={plan.season.totalWeeks} color={plan.season.color} />
          </div>

          <div className="mt-3 flex flex-wrap gap-4 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-4 rounded-sm bg-primary/70" aria-hidden />
              Janela de execução
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-4 rounded-sm bg-accent" aria-hidden />
              Milestone de acompanhamento
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-4 rounded-sm bg-muted" aria-hidden />
              Fora do escopo desta ação
            </span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {plan.actions.map((item, i) => (
            <ActionCard
              key={item.leverId}
              item={item}
              totalWeeks={plan.season.totalWeeks}
              index={i}
              lifecycle={lifecycleByAction.get(item.leverId) ?? "planejada"}
              timeline={timelineByAction.get(item.leverId) ?? []}
              statusLabels={governance.statusLabels}
            />
          ))}
        </div>

        {plan.hiddenActionsCount > 0 && (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            + {plan.hiddenActionsCount} intervenções adicionais disponíveis — exibindo as{" "}
            {plan.actions.length} de maior alavancagem.
          </p>
        )}

        <div className="mt-8 space-y-3">
          <p className="rounded-xl bg-muted/50 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
            {plan.disclaimer} Demonstração: accountability e registro de eventos são dados de
            exemplo e não são persistidos.
          </p>
          <p className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            {governance.ownerDisclaimer}
          </p>
        </div>
      </div>
    </AppShell>
  );
}
