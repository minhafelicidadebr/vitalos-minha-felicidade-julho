import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Waves, ArrowRight } from "lucide-react";
import { calculateIVO, K_ANONYMITY_MIN } from "@/engine/index/ivo-engine";
import { usePack } from "@/engine/pack";
import { ivoCurrentCycle, ivoPreviousCycle } from "@/mocks/ivo-mock";
import {
  MOCK_RH,
  HEATMAP_UNITS,
  PARTICIPATION,
  RH_ALERTS,
  GRO_KANBAN,
  SEASON_RH,
  type RHAlert,
  type KanbanColumn,
} from "@/mocks/rh-mock";
import {
  visibleSignals,
  crossPerceptionBehavior,
  SIGNALS_K_MIN,
} from "@/engine/signals/signals-engine";
import { SIGNALS, PERCEPTION_BEHAVIOR_INPUT, SIGNALS_CONSENT_NOTE } from "@/mocks/signals-mock";
import { useRealOrgSession } from "@/app/identity/useRealOrgSession";
import { CapsuleInsightsCard } from "./CapsuleInsightsCard";
import { InstitutionalModules } from "@/components/identity/EnterpriseModules";

export function RHDashboard() {
  const { org: realOrg } = useRealOrgSession();

  // Cliente real (organização provisionada) — nunca mistura com dados de
  // demonstração. Vê só o que é dele: dados reais quando existirem, e um
  // caminho claro para a primeira ação enquanto não existirem.
  if (realOrg) {
    return <RealRHDashboard org={realOrg} />;
  }

  return <DemoRHDashboard />;
}

// ─── Visão real (organização provisionada) ────────────────────────────────────

function RealRHDashboard({ org }: { org: { orgId: string; orgName: string; role: string } }) {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Visão Executiva
        </p>
        <h1 className="mt-1 font-serif text-2xl text-foreground">{org.orgName}</h1>
      </motion.div>

      {/* Dados reais: aparece quando n≥5 respondentes + capsule gerada */}
      <InstitutionalModules key={org.orgId} />
      <CapsuleInsightsCard />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.08 }}
        className="rounded-2xl border border-dashed border-primary/30 bg-primary/[0.04] p-6"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Waves className="h-5 w-5" aria-hidden />
          </span>
          <div className="flex-1">
            <p className="font-medium text-card-foreground">Comece medindo sua organização</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Crie sua primeira onda de medição e gere os links para seus colaboradores.
              Os resultados aparecem aqui automaticamente quando 5 ou mais pessoas responderem.
            </p>
            <Link
              to="/admin"
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
            >
              Criar onda de medição
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Visão de demonstração (dados-exemplo) ────────────────────────────────────

function DemoRHDashboard() {
  const { index } = usePack();
  const current = useMemo(() => (index ? calculateIVO(ivoCurrentCycle, index) : null), [index]);
  const previous = useMemo(() => (index ? calculateIVO(ivoPreviousCycle, index) : null), [index]);

  if (!current || !previous) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground animate-pulse">Carregando visão executiva…</p>
      </div>
    );
  }

  const delta = current.ivoScore - previous.ivoScore;
  const lensMeta = current.lenses.map((l) => ({
    lensId: l.lensId,
    short: l.lensName.split(" —")[0].trim(),
    color: l.color,
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <ExecHeader
        ivoScore={current.ivoScore}
        maturityName={current.maturityLevel.name}
        delta={delta}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <HeatmapCard lensMeta={lensMeta} />
          <SignalsCard />
          <KanbanCard columns={GRO_KANBAN} />
        </div>
        <div className="space-y-6">
          <ParticipationCard />
          <AlertsCard alerts={RH_ALERTS} />
          <SeasonCard />
        </div>
      </div>
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

function ExecHeader({
  ivoScore,
  maturityName,
  delta,
}: {
  ivoScore: number;
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
      className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
    >
      <div className="flex items-center gap-3">
        <div
          className="grid h-11 w-11 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
          aria-hidden
        >
          {MOCK_RH.avatarInitials}
        </div>
        <div>
          <p className="font-serif text-xl text-card-foreground">
            Visão Executiva — {MOCK_RH.firstName}
          </p>
          <p className="text-xs text-muted-foreground">
            CHRO · TechCorp Ltda · {SEASON_RH.cycleId}
          </p>
        </div>
      </div>

      <div className="flex items-end gap-6">
        <div className="text-right">
          <p className="font-serif text-4xl font-semibold leading-none text-foreground">
            {ivoScore}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{maturityName}</p>
        </div>
        <div className={`text-lg font-semibold ${deltaColor}`}>
          {delta > 0 ? "↑" : delta < 0 ? "↓" : "→"} {Math.abs(delta)}
          <p className="text-xs font-normal text-muted-foreground">vs T4/2025</p>
        </div>
        <Link
          to="/ivo"
          className="rounded-lg border border-input bg-background px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted/50"
        >
          Radar completo →
        </Link>
      </div>
    </motion.div>
  );
}

// ─── Heatmap ──────────────────────────────────────────────────────────────────

function heatColor(score: number): string {
  if (score < 500) return "bg-red-100 text-red-900 dark:bg-red-950/50 dark:text-red-300";
  if (score < 650) return "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300";
  if (score < 800) return "bg-green-100 text-green-900 dark:bg-green-950/40 dark:text-green-300";
  return "bg-emerald-200 text-emerald-950 dark:bg-emerald-900/50 dark:text-emerald-200";
}

function HeatmapCard({
  lensMeta,
}: {
  lensMeta: { lensId: string; short: string; color: string }[];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.05 }}
      className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="font-medium text-card-foreground">Heatmap por unidade</p>
          <p className="text-xs text-muted-foreground">
            Score por lente · recortes com n &lt; {K_ANONYMITY_MIN} ficam ocultos
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] border-separate border-spacing-1">
          <thead>
            <tr>
              <th className="px-2 py-1 text-left text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Unidade
              </th>
              {lensMeta.map((l) => (
                <th
                  key={l.lensId}
                  className="px-2 py-1 text-center text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground"
                >
                  <span className="inline-flex items-center gap-1">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: l.color }}
                      aria-hidden
                    />
                    {l.short}
                  </span>
                </th>
              ))}
              <th className="px-2 py-1 text-right text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                n
              </th>
            </tr>
          </thead>
          <tbody>
            {HEATMAP_UNITS.map((row) => {
              const hidden = row.n < K_ANONYMITY_MIN;
              return (
                <tr key={row.unitId}>
                  <td className="rounded-lg px-2 py-2 text-sm text-card-foreground">
                    {row.unitLabel}
                  </td>
                  {hidden ? (
                    <td
                      colSpan={4}
                      className="rounded-lg border border-dashed border-border/60 px-3 py-2 text-center text-xs text-muted-foreground"
                    >
                      🔒 Menos de {K_ANONYMITY_MIN} respostas — oculto para proteger a privacidade
                    </td>
                  ) : (
                    row.cells.map((cell) => (
                      <td
                        key={cell.lensId}
                        className={`rounded-lg px-2 py-2 text-center text-sm font-semibold tabular-nums ${cell.score !== null ? heatColor(cell.score) : ""}`}
                      >
                        {cell.score}
                      </td>
                    ))
                  )}
                  <td className="px-2 py-2 text-right text-xs tabular-nums text-muted-foreground">
                    {row.n}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded bg-red-200 dark:bg-red-950" /> &lt;500 crítico
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded bg-amber-200 dark:bg-amber-950" /> 500–649
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded bg-green-200 dark:bg-green-950" /> 650–799
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded bg-emerald-300 dark:bg-emerald-900" /> ≥800
        </span>
      </div>
    </motion.div>
  );
}

// ─── Sinais Vivos ─────────────────────────────────────────────────────────────

function SignalsCard() {
  const signals = visibleSignals(SIGNALS);
  const hiddenCount = SIGNALS.length - signals.length;
  const pairs = crossPerceptionBehavior([...PERCEPTION_BEHAVIOR_INPUT]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.08 }}
      className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
    >
      <div className="mb-4">
        <p className="font-medium text-card-foreground">
          Sinais Vivos™ — percepção × comportamento
        </p>
        <p className="text-xs text-muted-foreground">
          O que as pessoas dizem (IVO) cruzado com o que o sistema mostra (eventos da plataforma)
        </p>
      </div>

      {/* Signal bars */}
      <div className="space-y-2.5">
        {signals.map((s) => (
          <div key={s.signalId}>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{s.label}</span>
              <span className="tabular-nums">
                <span className="font-medium text-foreground">{s.value}%</span>{" "}
                <span
                  className={
                    s.deltaVsPrev >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"
                  }
                >
                  {s.deltaVsPrev >= 0 ? "↑" : "↓"}
                  {Math.abs(s.deltaVsPrev)}
                </span>
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${s.value}%` }} />
            </div>
          </div>
        ))}
        {hiddenCount > 0 && (
          <p className="rounded-lg border border-dashed border-border/60 px-3 py-2 text-xs text-muted-foreground">
            🔒 {hiddenCount} sinal(is) oculto(s) — recortes com menos de {SIGNALS_K_MIN} pessoas
            ficam invisíveis para proteger a privacidade.
          </p>
        )}
      </div>

      {/* Perception × behavior crossing */}
      <div className="mt-5 space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Leituras cruzadas
        </p>
        {pairs.map((p) => (
          <div
            key={p.pillarId}
            className={`rounded-xl border px-3.5 py-2.5 ${
              p.reading === "divergente"
                ? "border-amber-300/60 bg-amber-50/50 dark:border-amber-800/50 dark:bg-amber-950/20"
                : "border-border/50"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-card-foreground">{p.pillarName}</p>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-medium ${
                  p.reading === "divergente"
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                    : "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                }`}
              >
                {p.reading}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Percepção {p.perceptionScore} · Comportamento {p.behaviorValue}% — {p.note}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        🔒 {SIGNALS_CONSENT_NOTE}
      </p>
    </motion.div>
  );
}

// ─── Participation ────────────────────────────────────────────────────────────

function ParticipationCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.1 }}
      className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
    >
      <p className="font-medium text-card-foreground">Participação</p>
      <div className="mt-3 flex items-end gap-3">
        <p className="font-serif text-4xl font-semibold leading-none text-foreground">
          {PARTICIPATION.overallPct}%
        </p>
        <p className="text-xs text-green-600 dark:text-green-400">
          ↑ +{PARTICIPATION.deltaVsPrevPct} p.p.
        </p>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {PARTICIPATION.respondents} de {PARTICIPATION.invited} pessoas
      </p>

      <div className="mt-4 space-y-2">
        {PARTICIPATION.byRole.map((r) => (
          <div key={r.label}>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{r.label}</span>
              <span className="font-medium text-foreground tabular-nums">{r.pct}%</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${r.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

const SEVERITY_STYLE: Record<RHAlert["severity"], { dot: string; label: string }> = {
  high: { dot: "bg-red-500", label: "Alta" },
  medium: { dot: "bg-amber-500", label: "Média" },
  info: { dot: "bg-blue-500", label: "Info" },
};

function AlertsCard({ alerts }: { alerts: RHAlert[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.15 }}
      className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
    >
      <p className="mb-3 font-medium text-card-foreground">Alertas</p>
      <div className="space-y-3">
        {alerts.map((a) => {
          const sv = SEVERITY_STYLE[a.severity];
          return (
            <div key={a.id} className="rounded-xl border border-border/50 p-3">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 shrink-0 rounded-full ${sv.dot}`} aria-hidden />
                <p className="text-xs font-medium text-card-foreground">{a.title}</p>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{a.detail}</p>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Alertas apontam padrões agregados — nunca pessoas. Este indicador mostra caminhos, não
        culpados.
      </p>
    </motion.div>
  );
}

// ─── Kanban GRO-ready ─────────────────────────────────────────────────────────

const EVIDENCE_STYLE: Record<string, string> = {
  pendente: "bg-muted text-muted-foreground",
  anexada: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  aprovada: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
};

function KanbanCard({ columns }: { columns: KanbanColumn[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.2 }}
      className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
    >
      <div className="mb-4">
        <p className="font-medium text-card-foreground">Plano de ação — GRO-ready</p>
        <p className="text-xs text-muted-foreground">
          Responsável · prazo · evidência — trilha documental exportável para o PGR (educativo)
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {columns.map((col) => (
          <div key={col.id} className="rounded-xl bg-muted/30 p-2">
            <p className="mb-2 px-1 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {col.label} ({col.items.length})
            </p>
            <div className="space-y-2">
              {col.items.map((item) => (
                <div key={item.id} className="rounded-lg border border-border/50 bg-card p-3">
                  <p
                    className={`text-xs ${col.id === "done" ? "text-muted-foreground line-through" : "text-card-foreground"}`}
                  >
                    {item.title}
                  </p>
                  <p className="mt-1.5 text-xs text-muted-foreground">{item.pillarName}</p>
                  <div className="mt-2 flex items-center justify-between gap-1">
                    <span className="text-xs text-muted-foreground">{item.ownerName}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${EVIDENCE_STYLE[item.evidence]}`}
                    >
                      {item.evidence}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">⏱ {item.dueLabel}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Season ───────────────────────────────────────────────────────────────────

function SeasonCard() {
  const s = SEASON_RH;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.25 }}
      className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
    >
      <p className="font-medium text-card-foreground">{s.name}</p>
      <p className="text-xs text-muted-foreground">
        Semana {s.weekNumber}/{s.totalWeeks}
      </p>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${s.progressPct}%` }}
          role="progressbar"
          aria-valuenow={s.progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

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
              className={`text-[9px] ${"current" in phase && phase.current ? "font-semibold text-primary" : "text-muted-foreground"}`}
            >
              {phase.label}
            </span>
          </div>
        ))}
      </div>

      <ul className="mt-4 space-y-1.5">
        {s.highlights.map((h) => (
          <li key={h} className="flex items-start gap-2 text-xs text-muted-foreground">
            <span className="mt-0.5 text-primary" aria-hidden>
              •
            </span>
            {h}
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
