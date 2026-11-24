// /ondas — Painel de Gestão de Ondas (RH/SST). Distinto de /onda (participação,
// do Lovable): aqui o gestor OPERA o ciclo de vida — publica, abre, encerra+sela,
// arquiva. Consome a autoridade server (wave-lifecycle.functions) e nunca toca em
// dados individuais: o resumo traz só metadados seguros + a trilha de auditoria.
//
// Honestidade na tela: o resultado do selamento é exibido como é — "selada e
// publicável" só quando n≥k; senão "encerrada sem leitura divulgável". Sem inventar.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Archive,
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  Clock,
  Loader2,
  Lock,
  PlayCircle,
  Radio,
  RefreshCw,
  Users,
  Send,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { AppShell } from "@/app/shell/AppShell";
import { usePack } from "@/engine/pack";
import { usePersona } from "@/app/identity/persona-store";
import {
  listPackWaveLifecycles,
  transitionWave,
} from "@/lib/api/wave-lifecycle.functions";
import type { WaveLifecycleSummary } from "@/lib/survey/wave-lifecycle.server";
import type {
  WaveLifecycleAction,
  WaveLifecycleStatus,
} from "@/engine/survey/wave-lifecycle-engine";

export const Route = createFileRoute("/ondas")({
  head: () => ({
    meta: [{ title: "Gestão de Ondas · Mensurar — 4 Lentes VitalOS™" }],
  }),
  component: OndasPage,
});

const INTRO = {
  eyebrow: "Mensurar · Operação de Campo",
  title: "Gestão de Ondas",
  lead:
    "O painel onde o ciclo de medição é operado: publicar, abrir, encerrar e selar cada onda. " +
    "O selamento só gera leitura divulgável com privacidade garantida (n≥5) — encerrar é sempre " +
    "possível, mas a verdade do dado é preservada.",
};

// ─── Vocabulário de estado (operacional) ──────────────────────────────────────

const STATUS_META: Record<
  WaveLifecycleStatus,
  { label: string; cls: string; icon: typeof Radio }
> = {
  draft: {
    label: "Rascunho",
    cls: "border-border/60 bg-secondary/50 text-muted-foreground",
    icon: CircleDashed,
  },
  scheduled: {
    label: "Agendada",
    cls: "border-sky-400/40 bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
    icon: Clock,
  },
  collecting: {
    label: "Coletando",
    cls: "border-amber-400/50 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    icon: Radio,
  },
  sealed: {
    label: "Selada",
    cls: "border-emerald-400/50 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    icon: Lock,
  },
  archived: {
    label: "Arquivada",
    cls: "border-border/60 bg-secondary/40 text-muted-foreground",
    icon: Archive,
  },
  cancelled: {
    label: "Cancelada",
    cls: "border-red-400/40 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
    icon: XCircle,
  },
};

const ACTION_META: Record<
  WaveLifecycleAction,
  { label: string; icon: typeof Send; primary?: boolean }
> = {
  publish: { label: "Publicar", icon: Send },
  open: { label: "Abrir coleta", icon: PlayCircle },
  seal: { label: "Encerrar e selar", icon: Lock, primary: true },
  archive: { label: "Arquivar", icon: Archive },
  cancel: { label: "Cancelar", icon: XCircle },
};

const SEAL_OUTCOME_COPY: Record<string, { text: string; tone: "good" | "warn" }> = {
  sealed_publishable: {
    text: "Leitura divulgável — alimenta a FlorescerIA com privacidade garantida (n≥5).",
    tone: "good",
  },
  insufficient_k_anon: {
    text: "Encerrada sem leitura divulgável: menos de 5 respostas protegidas. O dado não vaza.",
    tone: "warn",
  },
  no_responses: {
    text: "Encerrada sem respostas registradas.",
    tone: "warn",
  },
};

// ─── Página ────────────────────────────────────────────────────────────────────

type LoadState =
  | { state: "loading" }
  | { state: "error" }
  | { state: "ready"; waves: WaveLifecycleSummary[] };

function OndasPage() {
  const { packId, t } = usePack();
  const { roleId } = usePersona();
  const [load, setLoad] = useState<LoadState>({ state: "loading" });
  const [pendingWave, setPendingWave] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ waveId: string; msg: string; ok: boolean } | null>(
    null,
  );

  const refresh = useCallback(() => {
    setLoad({ state: "loading" });
    void listPackWaveLifecycles({ data: { packId } })
      .then((waves) => setLoad({ state: "ready", waves: waves ?? [] }))
      .catch(() => setLoad({ state: "error" }));
  }, [packId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleAction = useCallback(
    (waveId: string, action: WaveLifecycleAction) => {
      setPendingWave(waveId);
      setFeedback(null);
      void transitionWave({ data: { waveId, action, actorRole: roleId } })
        .then((result) => {
          if (result?.ok) {
            setFeedback({
              waveId,
              msg: `${ACTION_META[action].label} concluído.`,
              ok: true,
            });
            refresh();
          } else {
            setFeedback({
              waveId,
              msg: result?.reason ?? "Ação não permitida neste estado.",
              ok: false,
            });
          }
        })
        .catch(() => setFeedback({ waveId, msg: "Falha ao aplicar a ação.", ok: false }))
        .finally(() => setPendingWave(null));
    },
    [roleId, refresh],
  );

  const indexLabel = t("index", "IVO");

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {INTRO.eyebrow}
          </p>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-serif text-3xl text-foreground">{INTRO.title}</h1>
              {load.state === "ready" && load.waves.length > 0 && (
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium tabular-nums text-primary">
                  {load.waves.length} onda{load.waves.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={refresh}
              disabled={load.state === "loading"}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-border/60 bg-secondary/50 px-3 py-2 text-sm text-secondary-foreground transition-colors hover:bg-secondary disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${load.state === "loading" ? "animate-spin" : ""}`}
                aria-hidden
              />{" "}
              Atualizar
            </button>
          </div>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
            {INTRO.lead}
          </p>
        </motion.header>

        {load.state === "loading" && (
          <div className="grid gap-5 lg:grid-cols-2" aria-busy="true" aria-label="Carregando ondas">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-2xl border border-border/50 bg-card/40 p-5 sm:p-6"
              >
                <div className="flex items-center gap-2">
                  <div className="h-5 w-40 rounded bg-secondary/70" />
                  <div className="h-5 w-20 rounded-full bg-secondary/50" />
                </div>
                <div className="mt-2 h-3 w-28 rounded bg-secondary/40" />
                <div className="mt-5 h-2 w-full rounded-full bg-secondary/50" />
                <div className="mt-5 flex gap-2">
                  <div className="h-9 w-28 rounded-lg bg-secondary/60" />
                  <div className="h-9 w-24 rounded-lg bg-secondary/40" />
                </div>
              </div>
            ))}
          </div>
        )}

        {load.state === "error" && (
          <div className="rounded-xl border border-red-400/40 bg-red-50 px-5 py-6 text-red-700 dark:bg-red-950/30 dark:text-red-300">
            <p className="font-medium">Não foi possível carregar as ondas.</p>
            <button
              type="button"
              onClick={refresh}
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-400/40 px-3 py-2 text-sm hover:bg-red-100/50 dark:hover:bg-red-900/30"
            >
              <RefreshCw className="h-4 w-4" aria-hidden /> Tentar novamente
            </button>
          </div>
        )}

        {load.state === "ready" && load.waves.length === 0 && (
          <div className="rounded-xl border border-border/50 bg-card/40 px-5 py-10 text-center text-muted-foreground">
            <Radio className="mx-auto h-8 w-8 opacity-40" aria-hidden />
            <p className="mt-3 font-medium text-foreground">Nenhuma onda configurada</p>
            <p className="mt-1 text-sm">
              As ondas da jornada da Matriz IFT aparecem aqui assim que forem criadas.
            </p>
            <Link
              to="/temporada"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              Ver o cronograma anual <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        )}

        {load.state === "ready" && load.waves.length > 0 && (
          <>
            <WaveSummaryStrip waves={load.waves} />
            <div className="grid items-start gap-5 lg:grid-cols-2">
              {load.waves.map((wave, i) => (
                <WaveCard
                  key={wave.waveId}
                  wave={wave}
                  index={i}
                  indexLabel={indexLabel}
                  pending={pendingWave === wave.waveId}
                  feedback={feedback?.waveId === wave.waveId ? feedback : null}
                  onAction={handleAction}
                />
              ))}
            </div>
          </>
        )}

        <p className="border-t border-border/40 pt-4 text-xs leading-relaxed text-muted-foreground">
          <ShieldCheck className="mr-1 inline h-3.5 w-3.5 align-text-bottom" aria-hidden />
          Auditoria sem vigilância: cada ação registra papel, momento e motivo — nunca a
          identidade de quem respondeu. O {indexLabel} e a leitura de risco vivem de agregados
          protegidos.
        </p>
      </div>
    </AppShell>
  );
}

// ─── Faixa-resumo: leitura instantânea do ciclo (board-grade) ───────────────────

function WaveSummaryStrip({ waves }: { waves: WaveLifecycleSummary[] }) {
  const collecting = waves.filter((w) => w.status === "collecting").length;
  const sealed = waves.filter((w) => w.status === "sealed").length;
  const publishable = waves.filter((w) => w.publishable).length;
  const responded = waves.reduce((s, w) => s + w.respondedTotal, 0);

  const stats: { icon: typeof Radio; label: string; value: string; tint: string }[] = [
    { icon: Radio, label: "Coletando", value: String(collecting), tint: "text-amber-600 dark:text-amber-400" },
    { icon: Lock, label: "Seladas", value: String(sealed), tint: "text-emerald-600 dark:text-emerald-400" },
    { icon: CheckCircle2, label: "Alimentam a IA", value: String(publishable), tint: "text-primary" },
    { icon: Users, label: "Respostas (k≥5)", value: responded.toLocaleString("pt-BR"), tint: "text-foreground" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border/60 bg-border/40 sm:grid-cols-4"
    >
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <div key={s.label} className="flex flex-col gap-1 bg-card px-4 py-3.5">
            <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
              <Icon className={`h-3.5 w-3.5 ${s.tint}`} aria-hidden /> {s.label}
            </span>
            <span className={`font-serif text-2xl leading-none tabular-nums ${s.tint}`}>
              {s.value}
            </span>
          </div>
        );
      })}
    </motion.div>
  );
}

// ─── Card de uma onda ──────────────────────────────────────────────────────────

function WaveCard({
  wave,
  index,
  indexLabel,
  pending,
  feedback,
  onAction,
}: {
  wave: WaveLifecycleSummary;
  index: number;
  indexLabel: string;
  pending: boolean;
  feedback: { msg: string; ok: boolean } | null;
  onAction: (waveId: string, action: WaveLifecycleAction) => void;
}) {
  const meta = STATUS_META[wave.status];
  const StatusIcon = meta.icon;
  const outcome = wave.sealOutcome ? SEAL_OUTCOME_COPY[wave.sealOutcome] : null;

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 * index }}
      className="rounded-2xl border border-border/50 bg-card/60 p-5 shadow-sm transition-all duration-300 hover:border-primary/25 hover:shadow-md sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-serif text-xl text-foreground">{wave.instrumentLabel}</h2>
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${meta.cls}`}
            >
              <StatusIcon className="h-3.5 w-3.5" aria-hidden /> {meta.label}
            </span>
            {wave.domain && (
              <span className="rounded-full border border-border/50 bg-secondary/40 px-2 py-0.5 text-[11px] text-muted-foreground">
                Domínio {wave.domain}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{wave.season}</p>
        </div>
        {wave.publishable && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Alimenta a FlorescerIA
          </span>
        )}
      </div>

      {/* Participação agregada */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Participação agregada (k≥5)</span>
          <span className="font-medium text-foreground">
            {wave.participationPct}% · {wave.respondedTotal}/{wave.invitedTotal}
          </span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary/60">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${Math.min(100, wave.participationPct)}%` }}
          />
        </div>
      </div>

      {/* Avisos de reconciliação calendário × operação */}
      {wave.shouldOpen && (
        <p className="mt-3 rounded-lg border border-sky-400/30 bg-sky-50 px-3 py-2 text-xs text-sky-700 dark:bg-sky-950/30 dark:text-sky-300">
          <Clock className="mr-1 inline h-3.5 w-3.5 align-text-bottom" aria-hidden />
          A janela do calendário já abriu — abra a coleta para começar a receber respostas.
        </p>
      )}
      {wave.awaitingSeal && (
        <p className="mt-3 rounded-lg border border-amber-400/30 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
          <Lock className="mr-1 inline h-3.5 w-3.5 align-text-bottom" aria-hidden />
          A janela do calendário fechou — encerre e sele para gerar a leitura.
        </p>
      )}

      {/* Resultado do selamento */}
      {outcome && (
        <p
          className={`mt-3 rounded-lg border px-3 py-2 text-xs ${
            outcome.tone === "good"
              ? "border-emerald-400/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
              : "border-amber-400/30 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
          }`}
        >
          {outcome.text}
        </p>
      )}

      {/* Ações do gestor */}
      {wave.availableActions.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {wave.availableActions.map((action) => {
            const am = ACTION_META[action];
            const ActionIcon = am.icon;
            return (
              <button
                key={action}
                type="button"
                disabled={pending}
                onClick={() => onAction(wave.waveId, action)}
                className={`inline-flex min-h-[40px] items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                  am.primary
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "border border-border/60 bg-secondary/50 text-secondary-foreground hover:bg-secondary"
                }`}
              >
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <ActionIcon className="h-4 w-4" aria-hidden />
                )}
                {am.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Feedback da ação */}
      {feedback && (
        <p
          className={`mt-3 text-xs ${feedback.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
        >
          {feedback.msg}
        </p>
      )}

      {/* Trilha de auditoria */}
      {wave.events.length > 0 && (
        <details className="mt-4 border-t border-border/40 pt-3">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
            Trilha de auditoria ({wave.events.length} evento{wave.events.length > 1 ? "s" : ""})
          </summary>
          <ul className="mt-2 space-y-1.5">
            {wave.events.map((e, idx) => (
              <li key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono text-[11px] text-foreground">
                  {ACTION_META[e.action]?.label ?? e.action}
                </span>
                <span aria-hidden>·</span>
                <span>{e.actorRole}</span>
                <span aria-hidden>·</span>
                <span>{e.at.slice(0, 10)}</span>
                {e.reason && <span className="italic">— {e.reason}</span>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </motion.article>
  );
}
