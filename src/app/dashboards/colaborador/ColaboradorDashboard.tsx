import { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { calculateIVO } from "@/engine/index/ivo-engine";
import { usePack } from "@/engine/pack";
import { ivoCurrentCycle } from "@/mocks/ivo-mock";
import {
  MOCK_USER,
  MOCK_MISSIONS,
  MOCK_KUDOS_RECEIVED,
  MOCK_BADGES,
  MOCK_SEASON,
  MOCK_COLLEAGUES,
  MOCK_KUDOS_PILLARS,
  FLORESCERIA_SUGGESTION,
  type MockMission,
  type MockKudo,
  type MockBadge,
} from "@/mocks/colaborador-mock";

// ─── Entry point ──────────────────────────────────────────────────────────────

export function ColaboradorDashboard() {
  const { index } = usePack();
  const ivoResult = useMemo(
    () => (index ? calculateIVO(ivoCurrentCycle, index) : null),
    [index],
  );

  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-8 sm:px-6">
      {/* Hero */}
      <HeroCard greeting={greeting} ivoScore={ivoResult?.ivoScore} maturityName={ivoResult?.maturityLevel.name} />

      {/* Check-in */}
      <CheckInCard />

      {/* Missions */}
      <MissionsCard missions={MOCK_MISSIONS} />

      {/* Kudos */}
      <KudosCard kudosReceived={MOCK_KUDOS_RECEIVED} />

      {/* Badges */}
      <BadgesCard badges={MOCK_BADGES} />

      {/* Season */}
      <SeasonCard />

      {/* FlorescerIA */}
      <FlorescerIACard />

      {/* Quick links */}
      <QuickLinksCard />
    </div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function HeroCard({
  greeting,
  ivoScore,
  maturityName,
}: {
  greeting: string;
  ivoScore?: number;
  maturityName?: string;
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
            <span className="font-serif text-2xl font-semibold text-foreground">
              {ivoScore}
            </span>
            <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {maturityName ?? "IVO org"}
            </span>
          </Link>
        )}
      </div>

      {/* XP + Kudos stats */}
      <div className="mt-4 flex flex-wrap gap-3">
        <StatChip label="XP esta semana" value={`${MOCK_USER.xpWeek.toLocaleString("pt-BR")} XP`} />
        <StatChip label="Kudos para dar" value={`${MOCK_USER.kudosBalanceWeek}/5`} />
        <StatChip label="Kudos recebidos" value={`${MOCK_USER.kudosReceivedWeek} esta semana`} />
      </div>
    </motion.div>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col rounded-lg bg-muted/50 px-3 py-2">
      <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
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
  "Obrigado por participar. Sua voz constrói uma organização mais viva.",
  "Check-in registrado. Seus dados são invisíveis individualmente — só agregados chegam ao painel.",
  "Feito! Cada check-in alimenta o IVO de forma anônima e segura.",
];

function CheckInCard() {
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const affirmation = AFFIRMATIONS[Math.floor((selected ?? 0) % AFFIRMATIONS.length)] ?? AFFIRMATIONS[0]!;

  function handleSelect(i: number) {
    if (submitted) return;
    setSelected(i);
  }

  function handleSubmit() {
    if (selected === null) return;
    setSubmitted(true);
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
            +15 XP
          </span>
        )}
      </div>

      {submitted ? (
        <p className="mt-4 text-sm text-muted-foreground">{affirmation}</p>
      ) : (
        <>
          <div className="mt-4 flex justify-between gap-1 sm:gap-2" role="group" aria-label="Como você está hoje?">
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
                <span className="text-[10px] text-muted-foreground">{mood.label}</span>
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

// ─── Missions ─────────────────────────────────────────────────────────────────

function MissionsCard({ missions }: { missions: MockMission[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.1 }}
      className="rounded-2xl border border-border/70 bg-card shadow-sm"
    >
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <p className="font-medium text-card-foreground">Missões Ativas</p>
        <span className="text-xs text-muted-foreground">{missions.length} em andamento</span>
      </div>
      <div className="space-y-1 px-3 pb-4">
        {missions.map((m) => (
          <MissionRow key={m.id} mission={m} />
        ))}
      </div>
    </motion.div>
  );
}

const MISSION_TYPE_STYLES: Record<MockMission["type"], { bg: string; label: string }> = {
  micro: { bg: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300", label: "Micro" },
  macro: { bg: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300", label: "Macro" },
  legendary: { bg: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300", label: "Lendária" },
};

function MissionRow({ mission }: { mission: MockMission }) {
  const { bg, label } = MISSION_TYPE_STYLES[mission.type];
  const reward = mission.xp ? `+${mission.xp} XP` : `+${mission.impact ?? 0} Impacto`;

  return (
    <div className="flex flex-col gap-2 rounded-xl px-3 py-3 hover:bg-muted/20 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${bg}`}>{label}</span>
            <span className="text-[10px] text-muted-foreground">{reward}</span>
          </div>
          <p className="text-sm text-card-foreground">{mission.title}</p>
          <p className="text-[10px] text-muted-foreground">{mission.pillarName}</p>
        </div>
        <span className="shrink-0 text-[10px] text-muted-foreground">{mission.daysLeft}d</span>
      </div>
      {mission.progressPct > 0 && (
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
    </div>
  );
}

// ─── Kudos ────────────────────────────────────────────────────────────────────

function KudosCard({ kudosReceived }: { kudosReceived: MockKudo[] }) {
  const [showForm, setShowForm] = useState(false);
  const [toId, setToId] = useState("");
  const [pillarId, setPillarId] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  function handleSend() {
    if (!toId || !pillarId) return;
    setSent(true);
    setShowForm(false);
    setToId("");
    setPillarId("");
    setMessage("");
  }

  const remaining = MOCK_USER.kudosBalanceWeek - (sent ? 1 : 0);

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
            {remaining}/5 disponíveis esta semana
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            disabled={remaining === 0}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            Dar um Kudo
          </button>
        )}
      </div>

      {/* Give Kudos form */}
      {showForm && (
        <div className="mx-3 mb-3 rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
          <p className="text-sm font-medium text-card-foreground">Reconheça um colega</p>
          <select
            value={toId}
            onChange={(e) => setToId(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            aria-label="Selecionar colega"
          >
            <option value="">Selecionar colega…</option>
            {MOCK_COLLEAGUES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.team})
              </option>
            ))}
          </select>
          <select
            value={pillarId}
            onChange={(e) => setPillarId(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            aria-label="Selecionar pilar relacionado"
          >
            <option value="">Pilar relacionado…</option>
            {MOCK_KUDOS_PILLARS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Mensagem opcional (público ou privado)"
            rows={2}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSend}
              disabled={!toId || !pillarId}
              className="flex-1 rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              Enviar Kudo
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-input px-3 py-2 text-sm text-muted-foreground hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {sent && (
        <div className="mx-3 mb-3 flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800 dark:bg-green-900/30 dark:text-green-300">
          <span>✓</span> Kudo enviado! Obrigado por reconhecer um colega.
        </div>
      )}

      {/* Received kudos */}
      {kudosReceived.length > 0 && (
        <div className="border-t border-border/50 px-3 pb-4 pt-3 space-y-2">
          <p className="px-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
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
          <span className="text-[10px] text-muted-foreground">{kudo.date}</span>
        </div>
        <span className="text-[10px] text-muted-foreground">{kudo.pillarName}</span>
        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{kudo.message}</p>
      </div>
    </div>
  );
}

// ─── Badges ───────────────────────────────────────────────────────────────────

function BadgesCard({ badges }: { badges: MockBadge[] }) {
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
            title={b.earned ? `Conquistado em ${b.earnedAt}` : "Em progresso — continue participando!"}
            className={`flex cursor-help flex-col items-center gap-1 rounded-xl border px-3 py-2.5 transition-opacity ${
              b.earned
                ? "border-border/70 bg-card"
                : "border-dashed border-border/40 opacity-40 grayscale"
            }`}
          >
            <span className="text-2xl" aria-hidden>{b.emoji}</span>
            <span className="text-[10px] text-center text-muted-foreground max-w-[5rem] leading-tight">
              {b.name}
            </span>
            {b.earned && b.earnedAt && (
              <span className="text-[9px] text-muted-foreground">{b.earnedAt}</span>
            )}
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
        Próximo evento: <span className="font-medium text-foreground">{s.nextEvent}</span> · {s.nextEventDate}
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
          <span className="text-base" aria-hidden>✨</span>
          <p className="text-sm font-medium text-card-foreground">FlorescerIA</p>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
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
      <p className="text-sm leading-relaxed text-muted-foreground">
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
        <span className="text-xl" aria-hidden>📊</span>
        <p className="text-sm font-medium text-card-foreground">IVO Completo</p>
        <p className="text-[10px] text-muted-foreground">Radar das 4 Lentes</p>
      </Link>

      <div
        className="flex flex-col gap-1 rounded-2xl border border-dashed border-border/50 bg-card/60 p-4 opacity-60"
        title="Em breve — Bloco 8"
      >
        <span className="text-xl" aria-hidden>🔒</span>
        <p className="text-sm font-medium text-card-foreground">Trust Ledger</p>
        <p className="text-[10px] text-muted-foreground">Em breve</p>
      </div>

      <div
        className="flex flex-col gap-1 rounded-2xl border border-dashed border-border/50 bg-card/60 p-4 opacity-60 col-span-2 sm:col-span-1"
        title="Em breve — Bloco 13"
      >
        <span className="text-xl" aria-hidden>🎓</span>
        <p className="text-sm font-medium text-card-foreground">Academia</p>
        <p className="text-[10px] text-muted-foreground">Em breve</p>
      </div>
    </motion.div>
  );
}
