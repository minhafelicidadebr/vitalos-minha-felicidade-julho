import { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useLiveEconomy } from "@/app/gamification/use-live-economy";
import { useRecognition } from "@/app/gamification/use-recognition";
import {
  hasParticipationEvidence,
  type ParticipationBadgeResult,
  type ParticipationEventKind,
  type ParticipationRecordResult,
} from "@/engine/gamification/participation-ledger";
import type { LiveMission } from "@/engine/gamification/live-economy";
import { calculateIVO } from "@/engine/index/ivo-engine";
import { getNudgeLibrary, selectNudges } from "@/engine/nudges/nudge-engine";
import { usePack } from "@/engine/pack";
import { ivoCurrentCycle } from "@/mocks/ivo-mock";
import {
  MOCK_USER,
  MOCK_KUDOS_RECEIVED,
  MOCK_SEASON,
  FLORESCERIA_SUGGESTION,
  type MockKudo,
} from "@/mocks/colaborador-mock";
import { GAMIFICATION_COPY } from "@/mocks/gamification-mock";

// ─── Entry point ──────────────────────────────────────────────────────────────

export function ColaboradorDashboard() {
  const { index } = usePack();
  const live = useLiveEconomy();
  const recognition = useRecognition();
  const ivoResult = useMemo(() => (index ? calculateIVO(ivoCurrentCycle, index) : null), [index]);
  const canRecord = Boolean(live.ledgerConfig && live.rules);
  const kudoBudget = recognition.policy?.weeklyBudget ?? live.rules?.kudosWeeklyBudget ?? 5;
  const kudoRemaining = recognition.policy ? recognition.remainingBudget : kudoBudget;

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-8 sm:px-6">
      {/* Hero */}
      <HeroCard
        greeting={greeting}
        ivoScore={ivoResult?.ivoScore}
        maturityName={ivoResult?.maturityLevel.name}
        xpToday={live.summary?.xpToday ?? 0}
        totalXp={live.summary?.totalXp ?? 0}
        dailyCap={live.rules?.xpDailyCap ?? 0}
        evidenceCount={live.summary?.eventCount ?? 0}
        kudoRemaining={kudoRemaining}
        kudoBudget={kudoBudget}
      />

      {/* Check-in */}
      <CheckInCard
        completed={hasParticipationEvidence(live.events, "check_in", live.today)}
        onComplete={() => recordEvent("check_in", live.today)}
      />

      {/* Pulse invite */}
      <PulseInviteCard completed={(live.summary?.countsByKind.pulse_completed ?? 0) > 0} />

      {/* Nudges */}
      <NudgesCard
        hasActed={(id) =>
          hasParticipationEvidence(live.events, "nudge_action", `${live.today}:${id}`)
        }
        onAct={(id) => recordEvent("nudge_action", `${live.today}:${id}`)}
      />

      {/* Missions */}
      <MissionsCard missions={live.missions} />

      {/* Kudos */}
      <KudosCard
        kudosReceived={MOCK_KUDOS_RECEIVED}
        remaining={kudoRemaining}
        budget={kudoBudget}
        sentCount={recognition.events.length}
      />

      {/* Badges */}
      <BadgesCard badges={live.summary?.badges ?? []} />

      {/* Season */}
      <SeasonCard />

      {/* FlorescerIA */}
      <FlorescerIACard />

      {/* Quick links */}
      <QuickLinksCard />
    </div>
  );

  function recordEvent(
    kind: ParticipationEventKind,
    sourceId: string,
  ): ParticipationRecordResult | null {
    if (!canRecord || !live.ledgerConfig || !live.rules) return null;
    return live.record(
      {
        id: `${kind}:${sourceId}`,
        kind,
        sourceId,
        occurredOn: live.today,
      },
      live.ledgerConfig.awards,
      live.rules,
    );
  }
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function HeroCard({
  greeting,
  ivoScore,
  maturityName,
  xpToday,
  totalXp,
  dailyCap,
  evidenceCount,
  kudoRemaining,
  kudoBudget,
}: {
  greeting: string;
  ivoScore?: number;
  maturityName?: string;
  xpToday: number;
  totalXp: number;
  dailyCap: number;
  evidenceCount: number;
  kudoRemaining: number;
  kudoBudget: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-4">
        {/* Avatar + greeting */}
        <div className="flex items-center gap-3">
          <div
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
            aria-hidden
          >
            {MOCK_USER.avatarInitials}
          </div>
          <div>
            <p className="font-serif text-xl text-card-foreground">
              {greeting}, {MOCK_USER.firstName}!
            </p>
            <p className="text-xs text-muted-foreground">
              {MOCK_USER.team} · {MOCK_USER.department}
            </p>
          </div>
        </div>

        {/* IVO snippet */}
        {ivoScore !== undefined && (
          <Link
            to="/ivo"
            className="flex flex-col items-end rounded-xl border border-border/70 bg-secondary/30 px-3 py-2 text-right hover:bg-secondary/60 transition-colors"
            title="Ver IVO completo"
          >
            <span className="font-serif text-2xl font-semibold text-foreground">{ivoScore}</span>
            <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              {maturityName ?? "IVO org"}
            </span>
          </Link>
        )}
      </div>

      {/* XP + Kudos stats */}
      <div className="mt-4 flex flex-wrap gap-3">
        <StatChip label="XP hoje" value={`${xpToday}/${dailyCap} XP`} />
        <StatChip label="XP verificado" value={`${totalXp.toLocaleString("pt-BR")} XP`} />
        <StatChip label="Evidências registradas" value={`${evidenceCount}`} />
        <StatChip label="Kudos para dar" value={`${kudoRemaining}/${kudoBudget}`} />
      </div>
    </motion.div>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col rounded-lg bg-muted/50 px-3 py-2">
      <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}

// ─── Check-in 30s ─────────────────────────────────────────────────────────────

const MOODS = [
  { emoji: "😔", label: "Difícil" },
  { emoji: "😐", label: "Ok" },
  { emoji: "🙂", label: "Bem" },
  { emoji: "😊", label: "Ótimo" },
  { emoji: "🤩", label: "Incrível" },
] as const;

const AFFIRMATIONS = [
  "Obrigado por participar. O ledger registrou a ação, não como você se sentiu.",
  "Check-in registrado. O conteúdo permanece fora da economia de XP.",
  "Feito. A participação conta; a resposta individual não fica no livro-razão.",
];

function CheckInCard({
  completed,
  onComplete,
}: {
  completed: boolean;
  onComplete: () => ParticipationRecordResult | null;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [submittedNow, setSubmittedNow] = useState(false);
  const [awardedXp, setAwardedXp] = useState<number | null>(null);
  const submitted = completed || submittedNow;

  const affirmation =
    AFFIRMATIONS[Math.floor((selected ?? 0) % AFFIRMATIONS.length)] ?? AFFIRMATIONS[0]!;

  function handleSelect(i: number) {
    if (submitted) return;
    setSelected(i);
  }

  function handleSubmit() {
    if (selected === null) return;
    const result = onComplete();
    setAwardedXp(result?.event?.xpAwarded ?? 0);
    setSubmittedNow(true);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.05 }}
      className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-card-foreground">Check-in 30s</p>
          <p className="text-xs text-muted-foreground">
            Como você está chegando hoje? (anônimo, +15 XP)
          </p>
        </div>
        {submitted && (
          <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/40 dark:text-green-300">
            {awardedXp !== null && awardedXp > 0 ? `+${awardedXp} XP` : "Registrado"}
          </span>
        )}
      </div>

      {submitted ? (
        <p className="mt-4 text-sm text-muted-foreground">{affirmation}</p>
      ) : (
        <>
          <div
            className="mt-4 flex justify-between gap-1 sm:gap-2"
            role="group"
            aria-label="Como você está hoje?"
          >
            {MOODS.map((mood, i) => (
              <button
                key={mood.label}
                onClick={() => handleSelect(i)}
                aria-pressed={selected === i}
                className={`flex flex-1 flex-col items-center gap-1 rounded-xl border py-3 text-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  selected === i
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-border/60 hover:border-border hover:bg-muted/30"
                }`}
              >
                <span aria-hidden>{mood.emoji}</span>
                <span className="text-xs text-muted-foreground">{mood.label}</span>
              </button>
            ))}
          </div>
          <button
            onClick={handleSubmit}
            disabled={selected === null}
            className="mt-3 w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            Registrar
          </button>
        </>
      )}
    </motion.div>
  );
}

// ─── Pulse invite ─────────────────────────────────────────────────────────────

function PulseInviteCard({ completed }: { completed: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.08 }}
      className="flex items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4"
    >
      <div className="flex items-center gap-3">
        <span className="text-xl" aria-hidden>
          ⚡
        </span>
        <div>
          <p className="text-sm font-medium text-card-foreground">Pulse da quinzena disponível</p>
          <p className="text-xs text-muted-foreground">
            {completed
              ? "Participação registrada · respostas permanecem anônimas"
              : "3 perguntas · 60 segundos · anônimo · XP pela participação"}
          </p>
        </div>
      </div>
      <Link
        to="/pulse"
        className="shrink-0 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        {completed ? "Ver registro" : "Responder"}
      </Link>
    </motion.div>
  );
}

// ─── Nudges ───────────────────────────────────────────────────────────────────

function NudgesCard({
  hasActed,
  onAct,
}: {
  hasActed: (id: string) => boolean;
  onAct: (id: string) => ParticipationRecordResult | null;
}) {
  const { gamification } = usePack();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const deliveries = useMemo(() => {
    if (!gamification) return [];
    const library = getNudgeLibrary(gamification);
    return selectNudges(library, {
      role: MOCK_USER.role,
      // "n_desconexao" requires opt-in; Marina opted in (mirrors Trust Ledger)
      optedInNudgeIds: new Set(["n_desconexao"]),
      deliveredThisWeek: new Map(),
      max: 2,
    });
  }, [gamification]);

  const visible = deliveries.filter((d) => !dismissedIds.has(d.nudge.id));
  if (visible.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.09 }}
      className="space-y-2"
    >
      {visible.map(({ nudge }) => (
        <div
          key={nudge.id}
          className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-sm"
        >
          <span className="mt-0.5 text-lg" aria-hidden>
            💡
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-base leading-relaxed text-card-foreground">{nudge.copy}</p>
            <div className="mt-2 flex items-center gap-3">
              {hasActed(nudge.id) ? (
                <span className="text-xs text-green-600 dark:text-green-400">
                  ✓ Registrado — boa!
                </span>
              ) : (
                <button
                  onClick={() => onAct(nudge.id)}
                  className="text-xs font-medium text-primary underline underline-offset-2 hover:opacity-80"
                >
                  Fiz isso
                </button>
              )}
              <button
                onClick={() => setDismissedIds((prev) => new Set([...prev, nudge.id]))}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Dispensar
              </button>
              <span className="ml-auto text-[9px] text-muted-foreground">
                máx. {nudge.frequencyCapPerWeek}×/semana · opt-out no Trust Ledger
              </span>
            </div>
          </div>
        </div>
      ))}
    </motion.div>
  );
}

// ─── Missions ─────────────────────────────────────────────────────────────────

function MissionsCard({ missions }: { missions: LiveMission[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.1 }}
      className="rounded-2xl border border-border/70 bg-card shadow-sm"
    >
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div>
          <p className="font-medium text-card-foreground">Missões vivas</p>
          <p className="text-xs text-muted-foreground">
            Derivadas da onda, da prioridade e da aprendizagem.
          </p>
        </div>
        <Link
          to="/missoes"
          className="text-xs font-medium text-primary underline underline-offset-2"
        >
          abrir central
        </Link>
      </div>
      {missions.length === 0 ? (
        <div className="mx-5 mb-5 rounded-xl border border-dashed border-border/60 p-4">
          <p className="text-sm font-medium text-foreground">{GAMIFICATION_COPY.emptyTitle}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {GAMIFICATION_COPY.emptyBody}
          </p>
        </div>
      ) : (
        <div className="space-y-1 px-3 pb-4">
          {missions.map((mission) => (
            <MissionRow key={mission.id} mission={mission} />
          ))}
        </div>
      )}
    </motion.div>
  );
}

const MISSION_AXIS_STYLES: Record<LiveMission["axis"], { bg: string; label: string }> = {
  mensurar: {
    bg: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
    label: "Mensurar",
  },
  educar: {
    bg: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    label: "Educar",
  },
  transformar: {
    bg: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
    label: "Transformar",
  },
};

function MissionRow({ mission }: { mission: LiveMission }) {
  const { bg, label } = MISSION_AXIS_STYLES[mission.axis];

  return (
    <Link
      to={mission.route}
      className="flex flex-col gap-2 rounded-xl px-3 py-3 transition-colors hover:bg-muted/20"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${bg}`}>{label}</span>
            <span className="text-xs text-muted-foreground">até +{mission.xp} XP</span>
          </div>
          <p className="text-sm text-card-foreground">{mission.title}</p>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {mission.status === "completed"
            ? "Concluída"
            : mission.status === "in_progress"
              ? "Em andamento"
              : "Aberta"}
        </span>
      </div>
      {mission.progressPct > 0 && mission.progressPct < 100 && (
        <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${mission.progressPct}%` }}
            role="progressbar"
            aria-valuenow={mission.progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      )}
    </Link>
  );
}

// ─── Kudos ────────────────────────────────────────────────────────────────────

function KudosCard({
  kudosReceived,
  remaining,
  budget,
  sentCount,
}: {
  kudosReceived: MockKudo[];
  remaining: number;
  budget: number;
  sentCount: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.15 }}
      className="rounded-2xl border border-border/70 bg-card shadow-sm"
    >
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div>
          <p className="font-medium text-card-foreground">Kudos</p>
          <p className="text-xs text-muted-foreground">
            {remaining}/{budget} disponíveis esta semana
          </p>
        </div>
        <Link
          to="/reconhecimento"
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {remaining > 0 ? "Dar um Kudo" : "Ver reconhecimentos"}
        </Link>
      </div>

      <div className="mx-3 mb-3 rounded-xl border border-border/60 bg-muted/20 p-4">
        <p className="text-sm font-medium text-card-foreground">
          Reconhecimento com privacidade por desenho
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Mensagens são transitórias; o ledger guarda apenas pessoa, categoria, visibilidade e data.
          Publicação exige consentimento.
        </p>
        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>{sentCount} enviados nesta demonstração</span>
          <Link
            to="/reconhecimento"
            className="font-medium text-foreground underline decoration-border underline-offset-4 hover:text-primary"
          >
            Abrir central
          </Link>
        </div>
      </div>

      {/* Received kudos */}
      {kudosReceived.length > 0 && (
        <div className="border-t border-border/50 px-3 pb-4 pt-3 space-y-2">
          <p className="px-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Recebidos esta semana
          </p>
          {kudosReceived.map((k) => (
            <KudoReceivedRow key={k.id} kudo={k} />
          ))}
        </div>
      )}
    </motion.div>
  );
}

function KudoReceivedRow({ kudo }: { kudo: MockKudo }) {
  return (
    <div className="flex gap-3 rounded-xl px-3 py-3 hover:bg-muted/20 transition-colors">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
        {kudo.fromInitials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-card-foreground">{kudo.fromName}</span>
          <span className="text-xs text-muted-foreground">{kudo.date}</span>
        </div>
        <span className="text-xs text-muted-foreground">{kudo.pillarName}</span>
        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{kudo.message}</p>
      </div>
    </div>
  );
}

// ─── Badges ───────────────────────────────────────────────────────────────────

function BadgesCard({ badges }: { badges: ParticipationBadgeResult[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.2 }}
      className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
    >
      <p className="mb-3 font-medium text-card-foreground">Conquistas</p>
      <div className="flex flex-wrap gap-3">
        {badges.map((b) => (
          <div
            key={b.id}
            title={
              b.earned
                ? `Conquistado com ${b.progress} evidência(s) verificadas`
                : `${b.progress}/${b.threshold} evidências verificadas`
            }
            className={`flex cursor-help flex-col items-center gap-1 rounded-xl border px-3 py-2.5 transition-opacity ${
              b.earned
                ? "border-border/70 bg-card"
                : "border-dashed border-border/40 opacity-40 grayscale"
            }`}
          >
            <span className="text-2xl" aria-hidden>
              {b.emoji}
            </span>
            <span className="text-xs text-center text-muted-foreground max-w-[5rem] leading-tight">
              {b.name}
            </span>
            <span className="text-[9px] text-muted-foreground">
              {b.earned ? "Conquistada" : `${b.progress}/${b.threshold}`}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Season ───────────────────────────────────────────────────────────────────

function SeasonCard() {
  const s = MOCK_SEASON;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.25 }}
      className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-card-foreground">{s.name}</p>
          <p className="text-xs text-muted-foreground">
            Semana {s.weekNumber} de {s.totalWeeks} · Fase: {s.phaseLabel}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
          {s.cycleId}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${s.progressPct}%` }}
          role="progressbar"
          aria-valuenow={s.progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Temporada: ${s.progressPct}% concluída`}
        />
      </div>

      {/* METE phases */}
      <div className="mt-3 flex justify-between">
        {s.phases.map((phase) => (
          <div key={phase.id} className="flex flex-col items-center gap-1">
            <div
              className={`h-2.5 w-2.5 rounded-full border-2 ${
                phase.done
                  ? "border-primary bg-primary"
                  : "current" in phase && phase.current
                    ? "border-primary bg-background"
                    : "border-muted-foreground/30 bg-muted/30"
              }`}
              aria-hidden
            />
            <span
              className={`text-[9px] ${
                "current" in phase && phase.current
                  ? "font-semibold text-primary"
                  : "text-muted-foreground"
              }`}
            >
              {phase.label}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Próximo evento: <span className="font-medium text-foreground">{s.nextEvent}</span> ·{" "}
        {s.nextEventDate}
      </p>
    </motion.div>
  );
}

// ─── FlorescerIA ──────────────────────────────────────────────────────────────

function FlorescerIACard() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const parts = FLORESCERIA_SUGGESTION.text.split(/\*\*(.+?)\*\*/g);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.3 }}
      className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base" aria-hidden>
            ✨
          </span>
          <p className="text-sm font-medium text-card-foreground">FlorescerIA</p>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            mockada · Bloco 12
          </span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dispensar sugestão"
        >
          ✕
        </button>
      </div>
      <p className="text-base leading-relaxed text-muted-foreground">
        {parts.map((part, i) =>
          i % 2 === 1 ? (
            <strong key={i} className="text-foreground">
              {part}
            </strong>
          ) : (
            <span key={i}>{part}</span>
          ),
        )}
      </p>
    </motion.div>
  );
}

// ─── Quick links ──────────────────────────────────────────────────────────────

function QuickLinksCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.35 }}
      className="grid grid-cols-2 gap-3 sm:grid-cols-3"
    >
      <Link
        to="/ivo"
        className="flex flex-col gap-1 rounded-2xl border border-border/70 bg-card p-4 transition-all hover:border-border hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="text-xl" aria-hidden>
          📊
        </span>
        <p className="text-sm font-medium text-card-foreground">IVO Completo</p>
        <p className="text-xs text-muted-foreground">Radar das 4 Lentes</p>
      </Link>

      <Link
        to="/confianca"
        className="flex flex-col gap-1 rounded-2xl border border-border/70 bg-card p-4 transition-all hover:border-border hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="text-xl" aria-hidden>
          🔒
        </span>
        <p className="text-sm font-medium text-card-foreground">Trust Ledger</p>
        <p className="text-xs text-muted-foreground">Quem vê o quê sobre você</p>
      </Link>

      <Link
        to="/academia"
        className="flex flex-col gap-1 rounded-2xl border border-border/70 bg-card p-4 transition-all hover:border-border hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring col-span-2 sm:col-span-1"
      >
        <span className="text-xl" aria-hidden>
          🎓
        </span>
        <p className="text-sm font-medium text-card-foreground">Academia</p>
        <p className="text-xs text-muted-foreground">Trilhas de 5–8 min</p>
      </Link>

      <Link
        to="/missoes"
        className="col-span-2 flex flex-col gap-1 rounded-2xl border border-border/70 bg-card p-4 transition-all hover:border-border hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:col-span-3"
      >
        <span className="text-xl" aria-hidden>
          ✦
        </span>
        <p className="text-sm font-medium text-card-foreground">Economia ética</p>
        <p className="text-xs text-muted-foreground">
          Missões, XP verificado, conquistas e livro-razão.
        </p>
      </Link>
    </motion.div>
  );
}
