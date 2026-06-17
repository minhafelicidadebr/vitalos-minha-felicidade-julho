import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { AppShell } from "@/app/shell/AppShell";
import { QUARTERLY_PLAN, ACTION_PLAN_INTRO } from "@/mocks/action-plan-mock";
import { STATUS_MESSAGES } from "@/engine/action-plan/action-plan-engine";
import type { ActionItem } from "@/engine/action-plan/action-plan-engine";

export const Route = createFileRoute("/plano-acao")({
  head: () => ({ meta: [{ title: "Plano de Ação — 4 Lentes VITA" }] }),
  component: PlanoAcao,
});

// ─── Helpers visuais ─────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, string> = {
  futuro: "bg-muted/60 text-muted-foreground border-border/50",
  em_andamento: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/40",
  concluido: "bg-primary/8 text-primary border-primary/20",
};

const EFFORT_DOT: Record<string, string> = {
  baixo: "bg-emerald-500",
  medio: "bg-amber-500",
  alto: "bg-rose-500",
};

const EFFORT_LABEL: Record<string, string> = {
  baixo: "Baixo",
  medio: "Médio",
  alto: "Alto",
};

// Barra de progresso da semana dentro da temporada
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

// Régua de semanas para um ActionItem
function WeekRuler({ item, totalWeeks }: { item: ActionItem; totalWeeks: number }) {
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
              milestone
                ? "bg-accent"
                : active
                  ? "bg-primary/70"
                  : "bg-muted"
            }`}
          />
        );
      })}
    </div>
  );
}

// Card de uma ação
function ActionCard({ item, totalWeeks, index }: { item: ActionItem; totalWeeks: number; index: number }) {
  const statusStyle = STATUS_STYLE[item.status] ?? STATUS_STYLE.futuro!;
  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04 }}
      className="rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_0_rgba(0,0,0,0.02)]"
      aria-label={item.leverLabel}
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs tracking-widest text-muted-foreground">
            #{item.rank}
          </span>
          {item.isQuickWin && (
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-300">
              Vitória rápida
            </span>
          )}
        </div>
        <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${statusStyle}`}>
          {STATUS_MESSAGES[item.status]}
        </span>
      </div>

      {/* Conteúdo */}
      <p className="mt-3 font-serif text-base text-card-foreground">{item.leverLabel}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.description}</p>

      {/* Meta */}
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

      {/* Régua de semanas */}
      <div className="mt-4">
        <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Semanas {item.startWeek}–{item.endWeek} · Milestone S{item.milestoneWeek}
        </p>
        <WeekRuler item={item} totalWeeks={totalWeeks} />
      </div>

      {/* ESG tags */}
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
    </motion.article>
  );
}

// ─── Página ──────────────────────────────────────────────────────────────────

function PlanoAcao() {
  const plan = QUARTERLY_PLAN;

  return (
    <AppShell>
      {/* Hero */}
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
        {/* Cabeçalho da temporada */}
        <div className="mb-8 rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_0_rgba(0,0,0,0.02)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span
                className="h-3 w-3 rounded-full"
                style={{ background: plan.season.color }}
                aria-hidden
              />
              <div>
                <p className="font-serif text-base font-medium text-card-foreground">
                  {plan.season.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  Fase atual: {plan.season.phaseLabel}
                </p>
              </div>
            </div>

            <dl className="flex flex-wrap gap-6 text-xs">
              <div className="text-center">
                <dt className="uppercase tracking-[0.12em] text-muted-foreground">Ações no plano</dt>
                <dd className="mt-0.5 font-serif text-2xl text-foreground">
                  {plan.actions.length}
                </dd>
              </div>
              <div className="text-center">
                <dt className="uppercase tracking-[0.12em] text-muted-foreground">Vitórias rápidas</dt>
                <dd className="mt-0.5 font-serif text-2xl text-foreground">
                  {plan.quickWinCount}
                </dd>
              </div>
              <div className="text-center">
                <dt className="uppercase tracking-[0.12em] text-muted-foreground">Lift IVO total</dt>
                <dd className="mt-0.5 font-serif text-2xl text-primary">
                  +{plan.scheduledIvoLift}
                </dd>
              </div>
            </dl>
          </div>

          <div className="mt-4">
            <SeasonBar
              current={plan.season.currentWeek}
              total={plan.season.totalWeeks}
              color={plan.season.color}
            />
          </div>

          {/* Legenda da régua */}
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

        {/* Grid de ações */}
        <div className="grid gap-4 sm:grid-cols-2">
          {plan.actions.map((item, i) => (
            <ActionCard key={item.leverId} item={item} totalWeeks={plan.season.totalWeeks} index={i} />
          ))}
        </div>

        {plan.hiddenActionsCount > 0 && (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            + {plan.hiddenActionsCount} intervenções adicionais disponíveis — exibindo as {plan.actions.length} de maior alavancagem.
          </p>
        )}

        {/* Disclaimer */}
        <p className="mt-8 rounded-xl bg-muted/50 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
          {plan.disclaimer}
        </p>
      </div>
    </AppShell>
  );
}
