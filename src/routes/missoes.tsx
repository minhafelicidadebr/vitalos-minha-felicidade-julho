import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  CircleDashed,
  Gauge,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/app/shell/AppShell";
import { useLiveEconomy } from "@/app/gamification/use-live-economy";
import type {
  ParticipationBadgeResult,
  ParticipationLedgerEvent,
  ParticipationRecordResult,
} from "@/engine/gamification/participation-ledger";
import {
  ETHICAL_XP_RULE,
  type LiveMission,
  type MissionAxis,
} from "@/engine/gamification/live-economy";
import { usePack } from "@/engine/pack";
import { GAMIFICATION_COPY } from "@/mocks/gamification-mock";

export const Route = createFileRoute("/missoes")({
  head: () => ({ meta: [{ title: "Economia Ética · Missões — VitalOS™" }] }),
  component: MissionsPage,
});

const AXIS_STYLE: Record<MissionAxis, { label: string; cls: string }> = {
  mensurar: {
    label: "Mensurar",
    cls: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  },
  educar: {
    label: "Educar",
    cls: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  },
  transformar: {
    label: "Transformar",
    cls: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  },
};

const EVENT_LABEL: Record<ParticipationLedgerEvent["kind"], string> = {
  wave_response: "Participação na Onda",
  pulse_completed: "Pulse concluído",
  check_in: "Check-in registrado",
  learning_module: "Módulo concluído",
  learning_path: "Trilha concluída",
  kudo_sent: "Reconhecimento enviado",
  nudge_action: "Microação realizada",
  mission_evidence: "Contribuição registrada",
};

function MissionsPage() {
  const { status, reload } = usePack();
  const live = useLiveEconomy();
  const [lastResult, setLastResult] = useState<ParticipationRecordResult | null>(null);

  if (status.state === "idle" || status.state === "loading") {
    return (
      <AppShell>
        <div className="mx-auto max-w-5xl space-y-5 px-4 py-8 sm:px-6" aria-busy="true">
          <div className="h-4 w-44 animate-pulse rounded bg-muted" />
          <div className="h-44 animate-pulse rounded-[2rem] bg-muted/70" />
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="h-32 animate-pulse rounded-3xl bg-muted/60" />
            <div className="h-32 animate-pulse rounded-3xl bg-muted/60" />
            <div className="h-32 animate-pulse rounded-3xl bg-muted/60" />
          </div>
        </div>
      </AppShell>
    );
  }

  if (status.state === "error" || !live.summary || !live.rules || !live.ledgerConfig) {
    return (
      <AppShell>
        <div className="mx-auto flex min-h-[55vh] max-w-xl items-center px-4 py-12 sm:px-6">
          <div className="w-full rounded-3xl border border-destructive/30 bg-card p-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-destructive">
              Economia indisponível
            </p>
            <h1 className="mt-3 font-serif text-2xl text-foreground">
              As regras éticas do pack não puderam ser carregadas.
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Nenhum XP foi presumido. Recarregue o pack para tentar novamente.
            </p>
            <button
              type="button"
              onClick={reload}
              className="mt-6 min-h-11 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  const earnedBadges = live.summary.badges.filter((badge) => badge.earned).length;
  const xpPct = Math.min(100, Math.round((live.summary.xpToday / live.rules.xpDailyCap) * 100));

  function recordMissionEvidence(mission: LiveMission) {
    if (!live.rules || !live.ledgerConfig) return;
    const result = live.record(
      {
        id: `mission-evidence:${mission.evidenceSourceId}`,
        kind: "mission_evidence",
        sourceId: mission.evidenceSourceId,
        occurredOn: live.today,
      },
      live.ledgerConfig.awards,
      live.rules,
    );
    setLastResult(result);
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-7 px-4 py-8 sm:px-6">
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-[2rem] border border-primary/20 bg-gradient-to-br from-primary/15 via-card to-accent/10 p-6 shadow-sm sm:p-8"
        >
          <div
            className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl"
            aria-hidden
          />
          <div className="relative grid gap-6 lg:grid-cols-[1fr_0.45fr] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Economia ética · participação verificável
              </p>
              <h1 className="mt-3 max-w-3xl font-serif text-3xl leading-tight text-foreground sm:text-4xl">
                Contribuição vira progresso. Desempenho nunca vira moeda.
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
                Missões nascem do ciclo real do VitalOS™. O livro-razão registra somente ações
                concluídas e aplica limites anti-gaming antes de conceder XP.
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card/75 p-4 backdrop-blur">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>XP hoje</span>
                <span className="font-semibold tabular-nums text-foreground">
                  {live.summary.xpToday}/{live.rules.xpDailyCap}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${xpPct}%` }} />
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                O teto protege a motivação intrínseca e reduz repetição artificial.
              </p>
            </div>
          </div>
        </motion.header>

        <section className="grid gap-3 sm:grid-cols-3">
          <MetricCard
            icon={Gauge}
            value={`${live.summary.totalXp} XP`}
            label="progresso verificado"
          />
          <MetricCard
            icon={BookOpenCheck}
            value={`${live.summary.eventCount}`}
            label="evidências registradas"
          />
          <MetricCard
            icon={Sparkles}
            value={`${earnedBadges}/${live.summary.badges.length}`}
            label="conquistas obtidas"
          />
        </section>

        {lastResult?.reason === "recorded_capped" && (
          <div
            className="rounded-2xl border border-amber-300/60 bg-amber-50/60 px-5 py-4 text-sm text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/20 dark:text-amber-300"
            role="status"
          >
            {GAMIFICATION_COPY.cappedNote}
          </div>
        )}

        <section>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Missões do momento
              </p>
              <h2 className="mt-1 font-serif text-2xl text-foreground">
                O próximo passo nasce do contexto
              </h2>
            </div>
            <span className="rounded-full border border-border/70 bg-card px-3 py-1.5 text-xs text-muted-foreground">
              {live.missions.length} missões derivadas
            </span>
          </div>

          {live.missions.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border/70 bg-card/40 p-9 text-center">
              <p className="font-serif text-xl text-foreground">{GAMIFICATION_COPY.emptyTitle}</p>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
                {GAMIFICATION_COPY.emptyBody}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-3">
              {live.missions.map((mission, index) => (
                <MissionCard
                  key={mission.id}
                  mission={mission}
                  delay={index * 0.05}
                  onRecord={() => recordMissionEvidence(mission)}
                />
              ))}
            </div>
          )}
        </section>

        <section className="grid gap-5 lg:grid-cols-[1fr_0.85fr]">
          <Ledger events={live.events} />
          <Badges badges={live.summary.badges} />
        </section>

        <section className="rounded-3xl border border-border/70 bg-muted/25 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span
              className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary"
              aria-hidden
            >
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-serif text-xl text-foreground">Contrato ético da economia</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {ETHICAL_XP_RULE} Não participar não gera perda, punição ou exposição. O ledger não
                armazena respostas, humor, texto de reconhecimento ou score individual.
              </p>
              <Link
                to="/confianca"
                className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-foreground underline decoration-border underline-offset-4 hover:text-primary"
              >
                Ver as permissões no Trust Ledger
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function MetricCard({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Gauge;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
      <Icon className="h-5 w-5 text-primary" aria-hidden />
      <p className="mt-3 font-serif text-2xl font-semibold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function MissionCard({
  mission,
  delay,
  onRecord,
}: {
  mission: LiveMission;
  delay: number;
  onRecord: () => void;
}) {
  const style = AXIS_STYLE[mission.axis];
  const completed = mission.status === "completed";

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className={`flex min-h-64 flex-col rounded-3xl border p-5 shadow-sm ${
        completed
          ? "border-emerald-300/50 bg-emerald-50/35 dark:bg-emerald-950/10"
          : "border-border/70 bg-card"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${style.cls}`}>
          {style.label}
        </span>
        {completed ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
        ) : (
          <CircleDashed className="h-5 w-5 text-muted-foreground" aria-hidden />
        )}
      </div>
      <h3 className="mt-5 font-serif text-xl leading-snug text-foreground">{mission.title}</h3>
      <p className="mt-2 text-xs text-muted-foreground">
        {completed
          ? "Evidência registrada"
          : mission.status === "in_progress"
            ? `${mission.progressPct}% concluída`
            : `até +${mission.xp} XP pela conclusão`}
      </p>
      {mission.axis === "transformar" && !completed && (
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          Registro leve de contribuição. Não constitui prova de impacto nem valida o resultado da
          intervenção.
        </p>
      )}
      {mission.progressPct > 0 && mission.progressPct < 100 && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${mission.progressPct}%` }}
          />
        </div>
      )}
      <div className="mt-auto pt-5">
        {mission.axis === "transformar" && !completed ? (
          <button
            type="button"
            onClick={onRecord}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
          >
            Registrar contribuição
          </button>
        ) : (
          <Link
            to={mission.route}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-input px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
          >
            {completed ? "Rever origem" : "Continuar"}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        )}
      </div>
    </motion.article>
  );
}

function Ledger({ events }: { events: ParticipationLedgerEvent[] }) {
  const ordered = [...events].reverse();

  return (
    <section className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {GAMIFICATION_COPY.ledgerTitle}
      </p>
      <h2 className="mt-2 font-serif text-xl text-foreground">O que realmente contou</h2>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {GAMIFICATION_COPY.ledgerNote}
      </p>

      {ordered.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-border/60 p-5 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhuma evidência registrada nesta demonstração.
          </p>
        </div>
      ) : (
        <ol className="mt-5 space-y-2">
          {ordered.map((event) => (
            <li
              key={event.id}
              className="flex items-center gap-3 rounded-2xl border border-border/55 bg-background/50 px-4 py-3"
            >
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                  event.capped ? "bg-amber-100 text-amber-700" : "bg-primary/10 text-primary"
                }`}
                aria-hidden
              >
                {event.capped ? "≈" : "✓"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{EVENT_LABEL[event.kind]}</p>
                <p className="text-[11px] text-muted-foreground">{event.occurredOn}</p>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-primary">
                +{event.xpAwarded} XP
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function Badges({ badges }: { badges: ParticipationBadgeResult[] }) {
  return (
    <section className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Conquistas
      </p>
      <h2 className="mt-2 font-serif text-xl text-foreground">Marcos, não ranking</h2>
      <div className="mt-5 grid grid-cols-2 gap-3">
        {badges.map((badge) => (
          <div
            key={badge.id}
            className={`rounded-2xl border p-4 ${
              badge.earned
                ? "border-primary/25 bg-primary/5"
                : "border-dashed border-border/60 bg-muted/15"
            }`}
          >
            <span className={`text-2xl ${badge.earned ? "" : "grayscale opacity-45"}`} aria-hidden>
              {badge.emoji}
            </span>
            <p className="mt-2 text-sm font-medium text-foreground">{badge.name}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {badge.earned ? "Conquistada" : `${badge.progress}/${badge.threshold} evidências`}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
