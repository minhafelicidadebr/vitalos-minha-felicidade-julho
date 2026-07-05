import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Download,
  History,
  Loader2,
  Rocket,
  Settings2,
  ShieldCheck,
  Target,
  UserRound,
} from "lucide-react";
import { AppShell } from "@/app/shell/AppShell";
import { usePack } from "@/engine/pack";
import { useRealOrgSession } from "@/app/identity/useRealOrgSession";
import { supabase } from "@/integrations/supabase/client";
import { isCloudReady } from "@/lib/cloud/supabase-client";
import {
  ACTION_LOG_SEED,
  ACTION_PLAN_INTRO,
  ENRICHED_PLAN,
  QUARTERLY_PLAN,
  SEASON_NOW,
} from "@/mocks/action-plan-mock";
import {
  enrichQuarterlyPlan,
  type ControlTier,
  type EnrichedActionItem,
  type EnrichedQuarterlyPlan,
} from "@/engine/action-plan/plan-enrichment-engine";
import {
  buildActionTimeline,
  canTransition,
  foldActionStatus,
  summarizeActionLog,
  type ActionLogEvent,
  type ActionLogSummary,
  type PlanActionStatus,
} from "@/engine/action-plan/action-log-engine";
import {
  activateActionPlan,
  createActionPlan,
  loadActionPlan,
  recordActionEvent,
  recordEvidence,
  setActionItemAccountability,
} from "@/lib/api/action-plan.functions";
import {
  toAccountability,
  toActionLogEvents,
  toQuarterlyPlan,
  type LoadedActionPlan,
} from "@/lib/api/action-plan-shapes";

export const Route = createFileRoute("/plano-acao")({
  head: () => ({ meta: [{ title: "Plano de Ação — 4 Lentes VitalOS™" }] }),
  component: PlanoAcao,
});

// A organização não vem mais do cliente (P0-04) — o servidor resolve quem é
// o admin de verdade a partir do access_token da própria sessão.
async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

const DIACRITICS_RE = new RegExp("[\\u0300-\\u036f]", "g");

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(DIACRITICS_RE, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Motivos crus das RPCs (migration 20260705100000) traduzidos para copy humana.
const REASON_LABEL: Record<string, string> = {
  cycle_already_planned: "Já existe um plano para esta temporada.",
  item_not_found: "Ação não encontrada — atualize a página.",
  plan_not_editable: "O plano já foi ativado — accountability não pode mais ser alterada.",
  plan_not_found: "Plano não encontrado — atualize a página.",
  plan_not_draft: "O plano já foi ativado.",
  incomplete_section_13: "Ainda há ações sem responsável, prazo ou métrica.",
  invalid_request: "Dados inválidos para este registro.",
  invalid_transition: "Essa mudança de status não é permitida a partir do estado atual.",
  cloud_not_ready: "Lovable Cloud não está ativo.",
  db_error: "Erro ao salvar. Tente novamente.",
};

function describeReason(reason: string | null | undefined): string {
  if (!reason) return "Erro desconhecido.";
  return REASON_LABEL[reason] ?? reason;
}

type EvidenceKind = "texto" | "foto" | "checklist" | "metrica";

interface AccountabilityFormValues {
  ownerRoleLabel: string;
  dueOn: string;
  metricLabel: string;
  metricBaseline: string;
  metricTarget: string;
  metricUnit: string;
  cmoContext: string;
  cmoMechanism: string;
  cmoOutcome: string;
  controlTier: ControlTier | "";
}

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

const CONTROL_TIER_OPTIONS: ControlTier[] = [
  "eliminacao",
  "organizacao",
  "administrativa",
  "monitoramento",
];

const ALL_STATUSES: PlanActionStatus[] = [
  "planejada",
  "em_execucao",
  "concluida",
  "em_vigilancia",
  "interrompida",
];

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

const inputCls =
  "w-full rounded-lg border border-border/60 bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50";

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

// Painel de gestão real de UMA ação — só existe quando há sessão de org real.
// Accountability só é editável enquanto o plano está em draft (o banco recusa
// depois disso); ciclo de vida (status/vigia/check-in/evidência) segue sempre.
function ManagementPanel({
  itemId,
  item,
  lifecycle,
  planEditable,
  busy,
  statusLabels,
  onSaveAccountability,
  onTransition,
  onMaintenanceCheck,
  onCheckin,
  onRecordEvidence,
}: {
  itemId: string;
  item: EnrichedActionItem;
  lifecycle: PlanActionStatus;
  planEditable: boolean;
  busy: boolean;
  statusLabels: Record<string, string>;
  onSaveAccountability: (itemId: string, values: AccountabilityFormValues) => Promise<void>;
  onTransition: (itemId: string, toStatus: PlanActionStatus) => Promise<void>;
  onMaintenanceCheck: (itemId: string, maintained: boolean) => Promise<void>;
  onCheckin: (itemId: string, note: string) => Promise<void>;
  onRecordEvidence: (itemId: string, kind: EvidenceKind, contentRef: string, occurredOn: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<AccountabilityFormValues>({
    ownerRoleLabel: item.owner?.displayRole ?? "",
    dueOn: item.dueOn ?? "",
    metricLabel: item.metric?.label ?? "",
    metricBaseline: item.metric ? String(item.metric.baseline) : "",
    metricTarget: item.metric ? String(item.metric.target) : "",
    metricUnit: item.metric?.unit ?? "",
    cmoContext: item.cmo?.context ?? "",
    cmoMechanism: item.cmo?.mechanism ?? "",
    cmoOutcome: item.cmo?.outcome ?? "",
    controlTier: item.controlTier ?? "",
  });
  const [note, setNote] = useState("");
  const [evidenceKind, setEvidenceKind] = useState<EvidenceKind>("texto");
  const [evidenceRef, setEvidenceRef] = useState("");
  const [evidenceDate, setEvidenceDate] = useState(() => new Date().toISOString().slice(0, 10));

  const nextStatuses = ALL_STATUSES.filter((s) => canTransition(lifecycle, s));

  function set<K extends keyof AccountabilityFormValues>(key: K, v: AccountabilityFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  return (
    <div className="mt-4 border-t border-border/50 pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex min-h-9 items-center gap-1.5 text-xs font-medium text-primary hover:underline"
      >
        <Settings2 className="h-3.5 w-3.5" aria-hidden />
        {open ? "Ocultar gestão" : "Gerenciar esta ação"}
      </button>

      {open && (
        <div className="mt-3 space-y-4 rounded-xl border border-border/50 bg-background/40 p-3">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Responsável, prazo e métrica (§13)
            </p>
            {!planEditable && (
              <p className="mb-2 text-[11px] text-amber-700 dark:text-amber-300">
                Plano ativo — accountability já não pode ser editada, só o ciclo de vida abaixo.
              </p>
            )}
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                className={inputCls}
                placeholder="Papel do responsável (ex.: Gestora de RH)"
                value={values.ownerRoleLabel}
                disabled={!planEditable}
                onChange={(e) => set("ownerRoleLabel", e.target.value)}
              />
              <input
                type="date"
                className={inputCls}
                value={values.dueOn}
                disabled={!planEditable}
                onChange={(e) => set("dueOn", e.target.value)}
              />
              <input
                className={inputCls}
                placeholder="Métrica (ex.: Horas extras/semana)"
                value={values.metricLabel}
                disabled={!planEditable}
                onChange={(e) => set("metricLabel", e.target.value)}
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  className={inputCls}
                  placeholder="Base"
                  inputMode="decimal"
                  value={values.metricBaseline}
                  disabled={!planEditable}
                  onChange={(e) => set("metricBaseline", e.target.value)}
                />
                <input
                  className={inputCls}
                  placeholder="Meta"
                  inputMode="decimal"
                  value={values.metricTarget}
                  disabled={!planEditable}
                  onChange={(e) => set("metricTarget", e.target.value)}
                />
                <input
                  className={inputCls}
                  placeholder="Unid."
                  value={values.metricUnit}
                  disabled={!planEditable}
                  onChange={(e) => set("metricUnit", e.target.value)}
                />
              </div>
              <select
                className={inputCls}
                value={values.controlTier}
                disabled={!planEditable}
                onChange={(e) => set("controlTier", e.target.value as ControlTier | "")}
              >
                <option value="">Tier NR-01 (opcional)</option>
                {CONTROL_TIER_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {TIER_LABEL[t]}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              <input
                className={inputCls}
                placeholder="Contexto (hipótese CMO)"
                value={values.cmoContext}
                disabled={!planEditable}
                onChange={(e) => set("cmoContext", e.target.value)}
              />
              <input
                className={inputCls}
                placeholder="Mecanismo"
                value={values.cmoMechanism}
                disabled={!planEditable}
                onChange={(e) => set("cmoMechanism", e.target.value)}
              />
              <input
                className={inputCls}
                placeholder="Resultado esperado"
                value={values.cmoOutcome}
                disabled={!planEditable}
                onChange={(e) => set("cmoOutcome", e.target.value)}
              />
            </div>
            {planEditable && (
              <button
                type="button"
                disabled={busy}
                onClick={() => onSaveAccountability(itemId, values)}
                className="mt-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-40"
              >
                {busy ? "Salvando…" : "Salvar accountability"}
              </button>
            )}
          </div>

          {nextStatuses.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Mover status
              </p>
              <div className="flex flex-wrap gap-2">
                {nextStatuses.map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={busy}
                    onClick={() => onTransition(itemId, s)}
                    className="rounded-lg border border-border/60 bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:border-primary/40 disabled:opacity-40"
                  >
                    → {statusLabels[s] ?? s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {lifecycle === "em_vigilancia" && (
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Vigia de manutenção — a medida segue em funcionamento?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onMaintenanceCheck(itemId, true)}
                  className="rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-800 disabled:opacity-40 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-300"
                >
                  Sim, mantida
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onMaintenanceCheck(itemId, false)}
                  className="rounded-lg border border-rose-300 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-800 disabled:opacity-40 dark:border-rose-800/40 dark:bg-rose-950/30 dark:text-rose-300"
                >
                  Caiu em desuso
                </button>
              </div>
            </div>
          )}

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Registrar observação
            </p>
            <div className="flex gap-2">
              <input
                className={inputCls}
                placeholder="O que aconteceu?"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <button
                type="button"
                disabled={busy || !note.trim()}
                onClick={async () => {
                  await onCheckin(itemId, note.trim());
                  setNote("");
                }}
                className="shrink-0 rounded-lg border border-border/60 bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/40 disabled:opacity-40"
              >
                Registrar
              </button>
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Registrar evidência
            </p>
            <div className="grid gap-2 sm:grid-cols-4">
              <select
                className={inputCls}
                value={evidenceKind}
                onChange={(e) => setEvidenceKind(e.target.value as EvidenceKind)}
              >
                <option value="texto">Texto</option>
                <option value="foto">Foto</option>
                <option value="checklist">Checklist</option>
                <option value="metrica">Métrica</option>
              </select>
              <input
                className={`${inputCls} sm:col-span-2`}
                placeholder="Referência/descrição"
                value={evidenceRef}
                onChange={(e) => setEvidenceRef(e.target.value)}
              />
              <input
                type="date"
                className={inputCls}
                value={evidenceDate}
                onChange={(e) => setEvidenceDate(e.target.value)}
              />
            </div>
            <button
              type="button"
              disabled={busy || !evidenceRef.trim()}
              onClick={async () => {
                await onRecordEvidence(itemId, evidenceKind, evidenceRef.trim(), evidenceDate);
                setEvidenceRef("");
              }}
              className="mt-2 rounded-lg border border-border/60 bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/40 disabled:opacity-40"
            >
              Registrar evidência
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface ActionCardManagement {
  itemId: string;
  planEditable: boolean;
  busy: boolean;
  onSaveAccountability: (itemId: string, values: AccountabilityFormValues) => Promise<void>;
  onTransition: (itemId: string, toStatus: PlanActionStatus) => Promise<void>;
  onMaintenanceCheck: (itemId: string, maintained: boolean) => Promise<void>;
  onCheckin: (itemId: string, note: string) => Promise<void>;
  onRecordEvidence: (itemId: string, kind: EvidenceKind, contentRef: string, occurredOn: string) => Promise<void>;
}

// Card de uma ação enriquecida (§13 + ciclo de vida por fold do Action Log)
function ActionCard({
  item,
  totalWeeks,
  index,
  lifecycle,
  timeline,
  statusLabels,
  management,
}: {
  item: EnrichedActionItem;
  totalWeeks: number;
  index: number;
  lifecycle: PlanActionStatus;
  timeline: ActionLogEvent[];
  statusLabels: Record<string, string>;
  management?: ActionCardManagement;
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

      {management && (
        <ManagementPanel
          itemId={management.itemId}
          item={item}
          lifecycle={lifecycle}
          planEditable={management.planEditable}
          busy={management.busy}
          statusLabels={statusLabels}
          onSaveAccountability={management.onSaveAccountability}
          onTransition={management.onTransition}
          onMaintenanceCheck={management.onMaintenanceCheck}
          onCheckin={management.onCheckin}
          onRecordEvidence={management.onRecordEvidence}
        />
      )}
    </motion.article>
  );
}

// ─── Seção de dados reais — só existe quando há sessão de org (Cloud) ───────

function RealPlanSection({
  orgLoading,
  cloudLoading,
  cloudError,
  cloudPlan,
  cloudEnrichedPlan,
  lifecycleByAction,
  timelineByAction,
  logSummary,
  itemIdByLeverId,
  governance,
  generating,
  activating,
  activateIncomplete,
  busyItemId,
  actorRoleLabel,
  onActorRoleLabelChange,
  onGeneratePlan,
  onActivate,
  onSaveAccountability,
  onTransition,
  onMaintenanceCheck,
  onCheckin,
  onRecordEvidence,
  downloadingPdf,
  onDownloadPdf,
}: {
  orgLoading: boolean;
  cloudLoading: boolean;
  cloudError: string | null;
  cloudPlan: LoadedActionPlan | null;
  cloudEnrichedPlan: EnrichedQuarterlyPlan | null;
  lifecycleByAction: Map<string, PlanActionStatus>;
  timelineByAction: Map<string, ActionLogEvent[]>;
  logSummary: ReturnType<typeof summarizeActionLog>;
  itemIdByLeverId: Map<string, string>;
  governance: ActionPlanGovernance;
  generating: boolean;
  activating: boolean;
  activateIncomplete: number | null;
  busyItemId: string | null;
  actorRoleLabel: string;
  onActorRoleLabelChange: (v: string) => void;
  onGeneratePlan: () => void;
  onActivate: () => void;
  onSaveAccountability: (itemId: string, values: AccountabilityFormValues) => Promise<void>;
  onTransition: (itemId: string, toStatus: PlanActionStatus) => Promise<void>;
  onMaintenanceCheck: (itemId: string, maintained: boolean) => Promise<void>;
  onCheckin: (itemId: string, note: string) => Promise<void>;
  onRecordEvidence: (itemId: string, kind: EvidenceKind, contentRef: string, occurredOn: string) => Promise<void>;
  downloadingPdf: boolean;
  onDownloadPdf: () => void;
}) {
  if (orgLoading || (cloudLoading && !cloudPlan)) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-border/60 bg-card py-16 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Carregando plano da organização…
      </div>
    );
  }

  if (!cloudPlan) {
    return (
      <div className="rounded-2xl border border-border/70 bg-card p-8 text-center">
        <Rocket className="mx-auto h-8 w-8 text-primary" aria-hidden />
        <p className="mt-3 font-serif text-lg text-card-foreground">
          Nenhum plano ativo ainda para {SEASON_NOW.name}
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Gere o plano inicial a partir da fila de prioridades atual. É um ponto de partida —
          revise responsável, prazo e métrica de cada ação antes de ativar.
        </p>
        {cloudError && <p className="mt-3 text-xs text-destructive">{cloudError}</p>}
        <button
          type="button"
          disabled={generating}
          onClick={onGeneratePlan}
          className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 font-serif text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {generating ? "Gerando…" : "Gerar plano desta temporada"}
        </button>
      </div>
    );
  }

  const plan = cloudEnrichedPlan;
  if (!plan) return null;

  return (
    <>
      <div className="mb-6">
        <Section13Gauge gauge={plan.gauge} note={governance.section13Note} />
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <UserRound className="h-3.5 w-3.5 text-primary" aria-hidden />
          <label htmlFor="actor-role-label">Seu papel neste registro:</label>
          <input
            id="actor-role-label"
            value={actorRoleLabel}
            onChange={(e) => onActorRoleLabelChange(e.target.value)}
            placeholder="ex.: Gestora de RH"
            className="rounded-lg border border-border/60 bg-background px-2 py-1 text-xs text-foreground focus:border-primary/50 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={downloadingPdf}
            onClick={onDownloadPdf}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/40 disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            {downloadingPdf ? "Gerando…" : "Baixar PDF"}
          </button>
          {cloudPlan.status === "draft" ? (
            <>
              {activateIncomplete !== null && (
                <span className="text-xs text-amber-700 dark:text-amber-300">
                  {activateIncomplete} ação(ões) incompleta(s)
                </span>
              )}
              <button
                type="button"
                disabled={activating}
                onClick={onActivate}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 disabled:opacity-40"
              >
                {activating ? "Ativando…" : "Ativar plano"}
              </button>
            </>
          ) : (
            <span className="flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Plano ativo desde{" "}
              {cloudPlan.activatedAt?.slice(0, 10)}
            </span>
          )}
        </div>
      </div>

      {cloudError && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
          <p className="text-sm text-destructive">{cloudError}</p>
        </div>
      )}

      <div className="mb-8 rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_0_rgba(0,0,0,0.02)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full" style={{ background: plan.season.color }} aria-hidden />
            <div>
              <p className="font-serif text-base font-medium text-card-foreground">{plan.season.name}</p>
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
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {plan.actions.map((item, i) => {
          const itemId = itemIdByLeverId.get(item.leverId) ?? "";
          return (
            <ActionCard
              key={item.leverId}
              item={item}
              totalWeeks={plan.season.totalWeeks}
              index={i}
              lifecycle={lifecycleByAction.get(item.leverId) ?? "planejada"}
              timeline={timelineByAction.get(item.leverId) ?? []}
              statusLabels={governance.statusLabels}
              management={{
                itemId,
                planEditable: cloudPlan.status === "draft",
                busy: busyItemId === itemId,
                onSaveAccountability,
                onTransition,
                onMaintenanceCheck,
                onCheckin,
                onRecordEvidence,
              }}
            />
          );
        })}
      </div>

      <p className="mt-8 rounded-xl bg-muted/50 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        {plan.disclaimer} Dados reais desta organização — cada ação vira um pedido de
        accountability real; a plataforma não observa quem cumpriu, só o registro que a própria
        equipe insere.
      </p>
    </>
  );
}

// ─── Página ──────────────────────────────────────────────────────────────────

function PlanoAcao() {
  const { pack } = usePack();
  const governance =
    ((pack as { actionPlanGovernance?: ActionPlanGovernance } | null)?.actionPlanGovernance ??
      GOVERNANCE_FALLBACK);

  const cloudActive = isCloudReady();
  const { loading: orgLoading, org: realOrg } = useRealOrgSession();
  const isRealMode = cloudActive && !!realOrg;

  // ─── Demo (mock-first, inalterado) ─────────────────────────────────────────
  const demoPlan = ENRICHED_PLAN;
  const { lifecycleByAction: demoLifecycle, timelineByAction: demoTimeline, logSummary: demoLogSummary } = useMemo(() => {
    const keys = demoPlan.actions.map((a) => a.leverId);
    return {
      lifecycleByAction: new Map(
        keys.map((key) => [key, foldActionStatus(ACTION_LOG_SEED, key)]),
      ),
      timelineByAction: new Map(keys.map((key) => [key, buildActionTimeline(ACTION_LOG_SEED, key)])),
      logSummary: summarizeActionLog(ACTION_LOG_SEED, keys),
    };
  }, [demoPlan.actions]);

  // ─── Dados reais da organização (Lovable Cloud) ────────────────────────────
  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudPlan, setCloudPlan] = useState<LoadedActionPlan | null>(null);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [activating, setActivating] = useState(false);
  const [activateIncomplete, setActivateIncomplete] = useState<number | null>(null);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [actorRoleLabel, setActorRoleLabel] = useState("");
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    if (realOrg && !actorRoleLabel) setActorRoleLabel(realOrg.role);
  }, [realOrg, actorRoleLabel]);

  const fetchPlan = useCallback(async () => {
    if (!isRealMode) return;
    setCloudLoading(true);
    setCloudError(null);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setCloudError("Sessão expirada. Faça login novamente.");
        return;
      }
      const result = await loadActionPlan({ data: { accessToken } });
      if (!result.cloudReady) {
        setCloudError("Lovable Cloud não está ativo.");
        return;
      }
      if ("error" in result) {
        setCloudError(result.error);
        return;
      }
      setCloudPlan(result.plan);
    } catch {
      setCloudError("Erro ao carregar o plano. Verifique a conexão com o Cloud.");
    } finally {
      setCloudLoading(false);
    }
  }, [isRealMode]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  const cloudEnrichedPlan = useMemo(() => {
    if (!cloudPlan) return null;
    const quarterly = toQuarterlyPlan(cloudPlan, SEASON_NOW);
    return enrichQuarterlyPlan(quarterly, toAccountability(cloudPlan));
  }, [cloudPlan]);

  const cloudLogEvents = useMemo(() => (cloudPlan ? toActionLogEvents(cloudPlan) : []), [cloudPlan]);

  const { lifecycleByAction: cloudLifecycle, timelineByAction: cloudTimeline, logSummary: cloudLogSummary } = useMemo(() => {
    if (!cloudEnrichedPlan) {
      return {
        lifecycleByAction: new Map<string, PlanActionStatus>(),
        timelineByAction: new Map<string, ActionLogEvent[]>(),
        logSummary: summarizeActionLog([], []),
      };
    }
    const keys = cloudEnrichedPlan.actions.map((a) => a.leverId);
    return {
      lifecycleByAction: new Map(keys.map((key) => [key, foldActionStatus(cloudLogEvents, key)])),
      timelineByAction: new Map(keys.map((key) => [key, buildActionTimeline(cloudLogEvents, key)])),
      logSummary: summarizeActionLog(cloudLogEvents, keys),
    };
  }, [cloudEnrichedPlan, cloudLogEvents]);

  const itemIdByLeverId = useMemo(() => {
    if (!cloudPlan) return new Map<string, string>();
    return new Map(cloudPlan.items.map((i) => [i.leverId, i.id]));
  }, [cloudPlan]);

  async function withBusy(itemId: string, fn: () => Promise<void>) {
    setBusyItemId(itemId);
    try {
      await fn();
    } finally {
      setBusyItemId(null);
    }
  }

  async function handleGeneratePlan() {
    if (!isRealMode || generating) return;
    setGenerating(true);
    setCloudError(null);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setCloudError("Sessão expirada. Faça login novamente.");
        return;
      }
      const result = await createActionPlan({
        data: {
          accessToken,
          cycleKey: slugify(SEASON_NOW.name),
          seasonName: SEASON_NOW.name,
          sourceCapsuleId: null,
          items: QUARTERLY_PLAN.actions.map((action) => ({
            rank: action.rank,
            leverId: action.leverId,
            title: action.leverLabel,
            description: action.description,
            effort: action.effort,
            expectedIvoLift: action.expectedIvoLift,
            isQuickWin: action.isQuickWin,
            amb: action.amb,
            lensId: action.lensId,
            lensLabel: action.lensLabel,
            lensColor: action.lensColor,
            esgCodes: action.esgCodes,
            startWeek: action.startWeek,
            endWeek: action.endWeek,
            milestoneWeek: action.milestoneWeek,
            weeksBudget: action.weeksBudget,
            controlTier: null,
          })),
        },
      });
      if (!result.accepted) {
        setCloudError(describeReason(result.reason));
        return;
      }
      await fetchPlan();
    } catch {
      setCloudError("Erro ao gerar o plano. Tente novamente.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleActivate() {
    if (!cloudPlan || activating) return;
    setActivating(true);
    setCloudError(null);
    setActivateIncomplete(null);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setCloudError("Sessão expirada. Faça login novamente.");
        return;
      }
      const result = await activateActionPlan({ data: { accessToken, planId: cloudPlan.id } });
      if (!result.accepted) {
        setCloudError(describeReason(result.reason));
        if (result.reason === "incomplete_section_13") setActivateIncomplete(result.incompleteCount);
        return;
      }
      await fetchPlan();
    } catch {
      setCloudError("Erro ao ativar o plano.");
    } finally {
      setActivating(false);
    }
  }

  async function handleSaveAccountability(itemId: string, values: AccountabilityFormValues) {
    await withBusy(itemId, async () => {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setCloudError("Sessão expirada. Faça login novamente.");
        return;
      }
      const baseline = Number(values.metricBaseline);
      const target = Number(values.metricTarget);
      const hasMetric =
        values.metricLabel.trim().length > 0 &&
        values.metricUnit.trim().length > 0 &&
        Number.isFinite(baseline) &&
        Number.isFinite(target);
      const hasCmo =
        values.cmoContext.trim().length > 0 &&
        values.cmoMechanism.trim().length > 0 &&
        values.cmoOutcome.trim().length > 0;
      const result = await setActionItemAccountability({
        data: {
          accessToken,
          itemId,
          ownerRoleLabel: values.ownerRoleLabel.trim() || null,
          dueOn: values.dueOn || null,
          metric: hasMetric
            ? { label: values.metricLabel.trim(), baseline, target, unit: values.metricUnit.trim() }
            : null,
          cmo: hasCmo
            ? {
                context: values.cmoContext.trim(),
                mechanism: values.cmoMechanism.trim(),
                outcome: values.cmoOutcome.trim(),
              }
            : null,
          controlTier: values.controlTier || null,
        },
      });
      if (!result.accepted) {
        setCloudError(describeReason(result.reason));
        return;
      }
      await fetchPlan();
    });
  }

  async function handleTransition(itemId: string, toStatus: PlanActionStatus) {
    await withBusy(itemId, async () => {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setCloudError("Sessão expirada. Faça login novamente.");
        return;
      }
      const result = await recordActionEvent({
        data: {
          accessToken,
          itemId,
          kind: "status_change",
          actorRoleLabel: actorRoleLabel.trim() || "Administrador",
          toStatus,
        },
      });
      if (!result.accepted) {
        setCloudError(describeReason(result.reason));
        return;
      }
      await fetchPlan();
    });
  }

  async function handleMaintenanceCheck(itemId: string, maintained: boolean) {
    await withBusy(itemId, async () => {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setCloudError("Sessão expirada. Faça login novamente.");
        return;
      }
      const result = await recordActionEvent({
        data: {
          accessToken,
          itemId,
          kind: "maintenance_check",
          actorRoleLabel: actorRoleLabel.trim() || "Administrador",
          maintained,
        },
      });
      if (!result.accepted) {
        setCloudError(describeReason(result.reason));
        return;
      }
      await fetchPlan();
    });
  }

  async function handleCheckin(itemId: string, note: string) {
    await withBusy(itemId, async () => {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setCloudError("Sessão expirada. Faça login novamente.");
        return;
      }
      const result = await recordActionEvent({
        data: {
          accessToken,
          itemId,
          kind: "checkin",
          actorRoleLabel: actorRoleLabel.trim() || "Administrador",
          note,
        },
      });
      if (!result.accepted) {
        setCloudError(describeReason(result.reason));
        return;
      }
      await fetchPlan();
    });
  }

  async function handleRecordEvidence(
    itemId: string,
    kind: EvidenceKind,
    contentRef: string,
    occurredOn: string,
  ) {
    await withBusy(itemId, async () => {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setCloudError("Sessão expirada. Faça login novamente.");
        return;
      }
      const result = await recordEvidence({
        data: {
          accessToken,
          itemId,
          evidenceKind: kind,
          contentRef,
          sourceKind: "direct",
          consentRef: null,
          occurredOn,
          actorRoleLabel: actorRoleLabel.trim() || "Administrador",
        },
      });
      if (!result.accepted) {
        setCloudError(describeReason(result.reason));
        return;
      }
      await fetchPlan();
    });
  }

  async function handleDownloadPdf(
    enrichedPlan: EnrichedQuarterlyPlan,
    summary: ActionLogSummary,
    orgName: string,
    cycleLabel: string,
    documentId: string,
  ) {
    if (downloadingPdf) return;
    setDownloadingPdf(true);
    try {
      const [{ buildPlanDocument }, { downloadPlanDocumentPdf }] = await Promise.all([
        import("@/engine/action-plan/plan-document-engine"),
        import("@/lib/pdf/plan-document-pdf"),
      ]);
      const doc = buildPlanDocument(
        enrichedPlan,
        { orgName, cycleLabel, documentId, generatedAt: new Date().toISOString() },
        summary,
      );
      downloadPlanDocumentPdf(doc, `plano-vivo-${documentId}.pdf`);
    } finally {
      setDownloadingPdf(false);
    }
  }

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
        {isRealMode ? (
          <RealPlanSection
            orgLoading={orgLoading}
            cloudLoading={cloudLoading}
            cloudError={cloudError}
            cloudPlan={cloudPlan}
            cloudEnrichedPlan={cloudEnrichedPlan}
            lifecycleByAction={cloudLifecycle}
            timelineByAction={cloudTimeline}
            logSummary={cloudLogSummary}
            itemIdByLeverId={itemIdByLeverId}
            governance={governance}
            generating={generating}
            activating={activating}
            activateIncomplete={activateIncomplete}
            busyItemId={busyItemId}
            actorRoleLabel={actorRoleLabel}
            onActorRoleLabelChange={setActorRoleLabel}
            onGeneratePlan={handleGeneratePlan}
            onActivate={handleActivate}
            onSaveAccountability={handleSaveAccountability}
            onTransition={handleTransition}
            onMaintenanceCheck={handleMaintenanceCheck}
            onCheckin={handleCheckin}
            onRecordEvidence={handleRecordEvidence}
            downloadingPdf={downloadingPdf}
            onDownloadPdf={() =>
              cloudEnrichedPlan &&
              cloudPlan &&
              handleDownloadPdf(
                cloudEnrichedPlan,
                cloudLogSummary,
                realOrg?.orgName ?? "Organização",
                `${cloudPlan.cycleKey} · ${cloudPlan.seasonName}`,
                cloudPlan.id,
              )
            }
          />
        ) : (
          <>
            <div className="mb-6">
              <Section13Gauge gauge={demoPlan.gauge} note={governance.section13Note} />
            </div>

            <div className="mb-8 rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_0_rgba(0,0,0,0.02)]">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full" style={{ background: demoPlan.season.color }} aria-hidden />
                  <div>
                    <p className="font-serif text-base font-medium text-card-foreground">
                      {demoPlan.season.name}
                    </p>
                    <p className="text-xs text-muted-foreground">Fase atual: {demoPlan.season.phaseLabel}</p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={downloadingPdf}
                  onClick={() =>
                    handleDownloadPdf(
                      demoPlan,
                      demoLogSummary,
                      "Organização demonstração",
                      `${demoPlan.season.name} · demonstração`,
                      "demo-plano-vivo",
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/40 disabled:opacity-40"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden />
                  {downloadingPdf ? "Gerando…" : "Baixar PDF"}
                </button>

                <dl className="flex flex-wrap gap-6 text-xs">
                  <div className="text-center">
                    <dt className="uppercase tracking-[0.12em] text-muted-foreground">Ações no plano</dt>
                    <dd className="mt-0.5 font-serif text-2xl text-foreground">{demoPlan.actions.length}</dd>
                  </div>
                  <div className="text-center">
                    <dt className="uppercase tracking-[0.12em] text-muted-foreground">Concluídas</dt>
                    <dd className="mt-0.5 font-serif text-2xl text-foreground">
                      {demoLogSummary.concludedCount}
                      <span className="text-sm text-muted-foreground"> ({demoLogSummary.pctConcluded}%)</span>
                    </dd>
                  </div>
                  <div className="text-center">
                    <dt className="uppercase tracking-[0.12em] text-muted-foreground">Vitórias rápidas</dt>
                    <dd className="mt-0.5 font-serif text-2xl text-foreground">{demoPlan.quickWinCount}</dd>
                  </div>
                  <div className="text-center">
                    <dt className="uppercase tracking-[0.12em] text-muted-foreground">Lift IVO total</dt>
                    <dd className="mt-0.5 font-serif text-2xl text-primary">+{demoPlan.scheduledIvoLift}</dd>
                  </div>
                </dl>
              </div>

              <div className="mt-4">
                <SeasonBar current={demoPlan.season.currentWeek} total={demoPlan.season.totalWeeks} color={demoPlan.season.color} />
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
              {demoPlan.actions.map((item, i) => (
                <ActionCard
                  key={item.leverId}
                  item={item}
                  totalWeeks={demoPlan.season.totalWeeks}
                  index={i}
                  lifecycle={demoLifecycle.get(item.leverId) ?? "planejada"}
                  timeline={demoTimeline.get(item.leverId) ?? []}
                  statusLabels={governance.statusLabels}
                />
              ))}
            </div>

            {demoPlan.hiddenActionsCount > 0 && (
              <p className="mt-4 text-center text-xs text-muted-foreground">
                + {demoPlan.hiddenActionsCount} intervenções adicionais disponíveis — exibindo as{" "}
                {demoPlan.actions.length} de maior alavancagem.
              </p>
            )}

            <div className="mt-8 space-y-3">
              <p className="rounded-xl bg-muted/50 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
                {demoPlan.disclaimer} Demonstração: accountability e registro de eventos são dados de
                exemplo e não são persistidos.
              </p>
              <p className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                {governance.ownerDisclaimer}
              </p>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
