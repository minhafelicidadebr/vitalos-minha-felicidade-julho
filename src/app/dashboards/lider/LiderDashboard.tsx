import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { calculateIVO, K_ANONYMITY_MIN } from "@/engine/index/ivo-engine";
import type { PillarResult } from "@/engine/index/ivo-engine";
import { usePack } from "@/engine/pack";
import { buildTrend } from "@/engine/trend/trend-engine";
import { rankPriorities } from "@/engine/priority/priority-engine";
import {
  detectEarlyWarnings,
  type EarlyWarningResult,
  type RiskAlert,
} from "@/engine/ai/earlywarning-engine";
import { FORECAST_LEVERS, pillarsFromIvo } from "@/mocks/forecast-mock";
import { ambassadorshipForPillar } from "@/mocks/priority-mock";
import { STATUS_COPY, SEVERITY_COPY, SOURCE_COPY } from "@/mocks/copiloto-mock";
import {
  MOCK_LEADER,
  teamCurrentCycle,
  teamPreviousCycle,
  TEAM_CUTS,
  LEADER_MISSIONS,
  ACTION_PLAN,
  type ActionItem,
} from "@/mocks/lider-mock";

export function LiderDashboard() {
  const { index } = usePack();

  const current = useMemo(() => (index ? calculateIVO(teamCurrentCycle, index) : null), [index]);
  const previous = useMemo(() => (index ? calculateIVO(teamPreviousCycle, index) : null), [index]);

  // Alerta precoce DA EQUIPE — compõe trend + priority no escopo do líder, gateado
  // por k-anon (só pilares visíveis). Sinais comportamentais não são observáveis
  // por equipe → a divergência vira uma camada bloqueada honesta (não o dado).
  const warning = useMemo<EarlyWarningResult | null>(() => {
    if (!current || !previous) return null;
    const pillars = pillarsFromIvo(current);
    const priorities = rankPriorities(pillars, FORECAST_LEVERS, { scenario: "medio" });
    const top = priorities.items[0] ?? null;
    const owner = top?.addressedPillars[0]
      ? ambassadorshipForPillar(top.addressedPillars[0].pillarId)
      : null;

    const prevScores = new Map(
      previous.lenses.flatMap((l) => l.pillars.map((p) => [p.pillarId, p.score] as const)),
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
      .sort((a, b) => b.drop - a.drop)
      .slice(0, 3);

    const points = [previous, current].map((r) => ({
      cycleId: r.cycleId,
      label: r.cycleId,
      ivo: r.ivoScore,
      lenses: r.lenses.map((l) => ({ id: l.lensId, name: l.lensName, score: l.score })),
    }));
    const trend = buildTrend(points);

    return detectEarlyWarnings({
      trend,
      reconciliation: null,
      decliningPillars: declining,
      topMove: top
        ? {
            label: top.label,
            lift: top.expectedIvoLift,
            isQuickWin: top.isQuickWin,
            owner: owner?.name ?? null,
          }
        : null,
      observableChannels: new Set(["pulses"]),
    });
  }, [current, previous]);

  if (!current || !previous) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground animate-pulse">Carregando agregados da equipe…</p>
      </div>
    );
  }

  const delta = current.ivoScore - previous.ivoScore;

  // Flatten pillars and rank: criticals first
  const allPillars = current.lenses.flatMap((l) =>
    l.pillars.map((p) => ({ ...p, lensColor: l.color })),
  );
  const prevByPillar = new Map(
    previous.lenses.flatMap((l) => l.pillars).map((p) => [p.pillarId, p]),
  );
  const criticals = allPillars
    .filter((p) => p.visible && p.score < 500)
    .sort((a, b) => a.score - b.score);
  const strengths = allPillars
    .filter((p) => p.visible && p.score > 750)
    .sort((a, b) => b.score - a.score);

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-8 sm:px-6">
      <TeamHeader
        teamScore={current.ivoScore}
        maturityName={current.maturityLevel.name}
        delta={delta}
      />
      <PrivacyBanner />
      <CriticalPillars criticals={criticals} strengths={strengths} prevByPillar={prevByPillar} />
      <CutsCard />
      {warning && <TeamVigilanciaCard warning={warning} />}
      <ActionPlanCard items={ACTION_PLAN} />
      <LeaderMissionsCard />
      <FooterLinks />
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

function TeamHeader({
  teamScore,
  maturityName,
  delta,
}: {
  teamScore: number;
  maturityName: string;
  delta: number;
}) {
  const deltaColor =
    delta > 0
      ? "text-green-600 dark:text-green-400"
      : delta < 0
        ? "text-red-500"
        : "text-amber-600";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
    >
      <div className="flex items-center gap-3">
        <div
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
          aria-hidden
        >
          {MOCK_LEADER.avatarInitials}
        </div>
        <div className="flex-1">
          <p className="font-serif text-xl text-card-foreground">Olá, {MOCK_LEADER.firstName}</p>
          <p className="text-xs text-muted-foreground">
            Liderança · {MOCK_LEADER.team} ({MOCK_LEADER.teamSize} pessoas)
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-end gap-6">
        <div>
          <p className="font-serif text-5xl font-semibold leading-none tabular-nums text-foreground">
            {teamScore}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">IVO da equipe · {maturityName}</p>
        </div>
        <div className={`text-xl font-semibold tabular-nums ${deltaColor}`}>
          {delta > 0 ? "↑" : delta < 0 ? "↓" : "→"} {Math.abs(delta)} pts
          <p className="text-xs font-normal text-muted-foreground">vs T4/2025</p>
        </div>
        <div className="text-xl font-semibold tabular-nums text-foreground">
          {MOCK_LEADER.teamRespondents}/{MOCK_LEADER.teamSize}
          <p className="text-xs font-normal text-muted-foreground">respondentes</p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Privacy banner (n>=5 enforcement, always visible) ──────────────────────

function PrivacyBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.05 }}
      className="flex items-start gap-3 rounded-xl border border-border/60 bg-secondary/30 px-4 py-3"
      role="note"
    >
      <span className="mt-0.5 text-base" aria-hidden>
        🔒
      </span>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Você vê <strong className="text-foreground">apenas médias agregadas</strong> da sua equipe,
        e somente com {K_ANONYMITY_MIN}+ respondentes. Respostas individuais são invisíveis para
        todos — inclusive para você. Este indicador mostra caminhos, não culpados.
      </p>
    </motion.div>
  );
}

// ─── Critical pillars ─────────────────────────────────────────────────────────

function CriticalPillars({
  criticals,
  strengths,
  prevByPillar,
}: {
  criticals: (PillarResult & { lensColor: string })[];
  strengths: (PillarResult & { lensColor: string })[];
  prevByPillar: Map<string, PillarResult>;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.1 }}
      className="space-y-3"
    >
      {/* Criticals */}
      <div className="rounded-2xl border border-border/70 bg-card shadow-sm">
        <div className="px-5 pt-5 pb-2">
          <p className="font-medium text-card-foreground">⚠ Pilares que pedem atenção</p>
          <p className="text-xs text-muted-foreground">Score abaixo de 500 — zona crítica</p>
        </div>
        <div className="space-y-1 px-3 pb-4">
          {criticals.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              Nenhum pilar em zona crítica. Continue sustentando o que funciona.
            </p>
          ) : (
            criticals.map((p) => {
              const prev = prevByPillar.get(p.pillarId);
              const d = prev ? p.score - prev.score : 0;
              return (
                <div
                  key={p.pillarId}
                  className="flex items-center gap-3 rounded-xl bg-amber-50/60 px-4 py-3 dark:bg-amber-950/20"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: p.lensColor }}
                    aria-hidden
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-amber-900 dark:text-amber-300">
                      {p.pillarName}
                    </p>
                    <p className="text-xs text-muted-foreground">n = {p.n} respondentes</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums text-amber-800 dark:text-amber-400">
                      {p.score} pts
                    </p>
                    <p
                      className={`text-xs ${d >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}
                    >
                      {d >= 0 ? "↑" : "↓"} {Math.abs(d)} vs anterior
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Strengths */}
      {strengths.length > 0 && (
        <div className="rounded-2xl border border-border/70 bg-card shadow-sm">
          <div className="px-5 pt-5 pb-2">
            <p className="font-medium text-card-foreground">✦ Forças da equipe</p>
            <p className="text-xs text-muted-foreground">Score acima de 750 — sustente e celebre</p>
          </div>
          <div className="space-y-1 px-3 pb-4">
            {strengths.map((p) => (
              <div
                key={p.pillarId}
                className="flex items-center gap-3 rounded-xl px-4 py-2.5 hover:bg-muted/20 transition-colors"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: p.lensColor }}
                  aria-hidden
                />
                <p className="flex-1 text-sm text-card-foreground">{p.pillarName}</p>
                <p className="text-sm font-semibold tabular-nums text-green-700 dark:text-green-400">
                  {p.score} pts
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── Cuts (k-anonymity demo) ──────────────────────────────────────────────────

function CutsCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.15 }}
      className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
    >
      <p className="mb-3 font-medium text-card-foreground">Recortes da equipe</p>
      <div className="space-y-2">
        {TEAM_CUTS.map((cut) =>
          cut.visible ? (
            <div
              key={cut.id}
              className="flex items-center justify-between rounded-xl border border-border/50 px-4 py-3"
            >
              <span className="text-sm text-card-foreground">{cut.label}</span>
              <span className="text-xs text-muted-foreground">n = {cut.n} · visível</span>
            </div>
          ) : (
            <div
              key={cut.id}
              className="rounded-xl border border-dashed border-border/60 px-4 py-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{cut.label}</span>
                <span className="text-xs text-muted-foreground">🔒 oculto</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Este recorte tem menos de {K_ANONYMITY_MIN} respostas e fica oculto para proteger a
                privacidade.
              </p>
            </div>
          ),
        )}
      </div>
    </motion.div>
  );
}

// ─── Copiloto do Líder · Vigilância da equipe (early-warning composto) ─────────

function TeamVigilanciaCard({ warning }: { warning: EarlyWarningResult }) {
  const status = STATUS_COPY[warning.status];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.2 }}
      className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span aria-hidden>✨</span>
          <p className="text-sm font-medium text-card-foreground">
            Copiloto do Líder · Vigilância da equipe
          </p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-0.5 text-xs font-medium ${status.color}`}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: status.dot }}
            aria-hidden
          />
          {status.label}
        </span>
      </div>

      <p className="text-base leading-relaxed text-muted-foreground">{warning.headline}</p>

      {warning.alerts.length > 0 && (
        <div className="mt-3 space-y-2">
          {warning.alerts.map((a) => (
            <TeamAlertRow key={a.id} alert={a} />
          ))}
        </div>
      )}

      {warning.blocked.map((b) => (
        <div
          key={b.channel}
          className="mt-2 flex items-start gap-2 rounded-xl border border-dashed border-border bg-muted/20 px-3 py-2"
        >
          <span className="mt-0.5 text-sm" aria-hidden>
            🔒
          </span>
          <p className="text-xs leading-relaxed text-muted-foreground">{b.note}</p>
        </div>
      ))}

      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          to="/lab"
          className="rounded-lg border border-input px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/50"
        >
          Levar ao Culture Lab
        </Link>
        <Link
          to="/prioridades"
          className="rounded-lg border border-input px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/50"
        >
          Ver prioridades
        </Link>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Lê os motores (tendência + prioridades) só no agregado k≥{K_ANONYMITY_MIN}. Tendência, não
        promessa.
      </p>
    </motion.div>
  );
}

function TeamAlertRow({ alert }: { alert: RiskAlert }) {
  const sev = SEVERITY_COPY[alert.severity];
  const src = SOURCE_COPY[alert.source];
  return (
    <div
      className="rounded-xl border-l-4 bg-background px-3 py-2"
      style={{ borderLeftColor: sev.dot }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm" aria-hidden>
          {src.icon}
        </span>
        <span className="text-sm font-medium text-card-foreground">{alert.title}</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${sev.bg} ${sev.color}`}>
          {sev.label}
        </span>
      </div>
      <p className="mt-1 text-xs tabular-nums text-muted-foreground">{alert.evidence}</p>
      {alert.recommendedMove && (
        <p className="mt-1.5 flex items-start gap-1.5 rounded-lg bg-muted/50 px-2.5 py-1.5 text-xs text-foreground">
          <span className="text-primary" aria-hidden>
            →
          </span>
          {alert.recommendedMove}
        </p>
      )}
    </div>
  );
}

// ─── Action plan ──────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<ActionItem["status"], { label: string; cls: string }> = {
  todo: { label: "A fazer", cls: "bg-muted text-muted-foreground" },
  doing: {
    label: "Em andamento",
    cls: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  },
  done: {
    label: "Concluído",
    cls: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  },
};

function ActionPlanCard({ items }: { items: ActionItem[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.25 }}
      className="rounded-2xl border border-border/70 bg-card shadow-sm"
    >
      <div className="px-5 pt-5 pb-2">
        <p className="font-medium text-card-foreground">Plano de ação local</p>
        <p className="text-xs text-muted-foreground">Ações da equipe ligadas aos pilares</p>
      </div>
      <div className="space-y-1 px-3 pb-4">
        {items.map((item) => {
          const st = STATUS_STYLE[item.status];
          return (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-muted/20 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm ${item.status === "done" ? "text-muted-foreground line-through" : "text-card-foreground"}`}
                >
                  {item.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.pillarName} · {item.dueLabel}
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${st.cls}`}>
                {st.label}
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── Leader missions ──────────────────────────────────────────────────────────

function LeaderMissionsCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.3 }}
      className="rounded-2xl border border-border/70 bg-card shadow-sm"
    >
      <div className="px-5 pt-5 pb-2">
        <p className="font-medium text-card-foreground">Missões de liderança</p>
      </div>
      <div className="space-y-1 px-3 pb-4">
        {LEADER_MISSIONS.map((m) => (
          <div
            key={m.id}
            className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-muted/20 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm text-card-foreground">{m.title}</p>
              <p className="text-xs text-muted-foreground">
                {m.pillarName} · +{m.xp} XP
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                m.status === "in_progress"
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {m.status === "in_progress" ? "Em andamento" : "Pendente"}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Footer links ─────────────────────────────────────────────────────────────

function FooterLinks() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.35 }}
      className="grid grid-cols-2 gap-3"
    >
      <Link
        to="/ivo"
        className="flex flex-col gap-1 rounded-2xl border border-border/70 bg-card p-4 transition-all hover:border-border hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="text-xl" aria-hidden>
          📊
        </span>
        <p className="text-sm font-medium text-card-foreground">IVO da Organização</p>
        <p className="text-xs text-muted-foreground">Radar das 4 Lentes</p>
      </Link>
      <Link
        to="/lab"
        className="flex flex-col gap-1 rounded-2xl border border-border/70 bg-card p-4 transition-all hover:border-border hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="text-xl" aria-hidden>
          🧪
        </span>
        <p className="text-sm font-medium text-card-foreground">Culture Lab</p>
        <p className="text-xs text-muted-foreground">Protocolos e experimentos</p>
      </Link>
    </motion.div>
  );
}
