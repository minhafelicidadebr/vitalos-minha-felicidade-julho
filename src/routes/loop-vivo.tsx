// /loop-vivo — Loop Vivo da Semana (I3, Academia Viva 2.0). DEMO v1: equipe e
// maioria das contagens são fixas (este ambiente só tem a sessão de UMA pessoa),
// mas "Evidenciar" compõe AO VIVO o Diário de Prática (I7) e "Celebrar" compõe
// AO VIVO a Celebração do Jardineiro (I6) — registrar uma prática em /diario ou
// celebrar o Pomar em /reconhecimento muda o Loop aqui, na hora.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpenCheck,
  Feather,
  Lightbulb,
  Lock,
  MessageCircleHeart,
  NotebookPen,
  PartyPopper,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { AppShell } from "@/app/shell/AppShell";
import { usePack } from "@/engine/pack";
import { getWeeklyLoopConfig } from "@/engine/gamification/gamification-engine";
import { buildWeeklyLoop, type LoopStepId } from "@/engine/season/weekly-loop-engine";
import { usePracticeJournal } from "@/engine/learning/practice-journal-store";
import { useCelebrations } from "@/engine/recognition/celebration-store";
import {
  LOOP_FIXED_COUNTS,
  LOOP_TEAM_LABEL,
  LOOP_TEAM_SIZE,
  LOOP_VIVO_COPY,
  countCelebrarCoverage,
  countEvidenciarCoverage,
} from "@/mocks/weekly-loop-mock";

export const Route = createFileRoute("/loop-vivo")({
  head: () => ({ meta: [{ title: "Loop Vivo da Semana · Academia — VitalOS™" }] }),
  component: LoopVivoPage,
});

const STEP_ICON: Record<LoopStepId, typeof Sparkles> = {
  aprender: BookOpenCheck,
  praticar: NotebookPen,
  evidenciar: Feather,
  refletir: Lightbulb,
  compartilhar: MessageCircleHeart,
  celebrar: PartyPopper,
  evoluir: RefreshCcw,
};

function LoopVivoPage() {
  const { status, gamification, reload } = usePack();
  const loop = useMemo(() => (gamification ? getWeeklyLoopConfig(gamification) : null), [gamification]);
  const sessionEntries = usePracticeJournal((state) => state.entries);
  const celebrationRecords = useCelebrations((state) => state.records);

  const result = useMemo(() => {
    if (!loop) return null;
    const evidenciarCount = countEvidenciarCoverage(sessionEntries);
    const celebrarCount = countCelebrarCoverage(celebrationRecords);
    return buildWeeklyLoop(
      {
        teamSize: LOOP_TEAM_SIZE,
        completedCountByStep: {
          ...LOOP_FIXED_COUNTS,
          evidenciar: evidenciarCount,
          celebrar: celebrarCount,
        },
      },
      loop.policy,
    );
  }, [loop, sessionEntries]);

  if (status.state === "idle" || status.state === "loading") {
    return (
      <AppShell>
        <div className="mx-auto max-w-4xl space-y-5 px-4 py-8 sm:px-6" aria-busy="true">
          <div className="h-4 w-48 animate-pulse rounded bg-muted" />
          <div className="h-44 animate-pulse rounded-[2rem] bg-muted/70" />
          <div className="h-96 animate-pulse rounded-3xl bg-muted/60" />
        </div>
      </AppShell>
    );
  }

  if (status.state === "error" || !loop || !result) {
    return (
      <AppShell>
        <div className="mx-auto flex min-h-[55vh] max-w-xl items-center px-4 py-12 sm:px-6">
          <div className="w-full rounded-3xl border border-destructive/30 bg-card p-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-destructive">
              Loop Vivo indisponível
            </p>
            <h1 className="mt-3 font-serif text-2xl text-foreground">
              {status.state === "error"
                ? "A configuração deste pack não pôde ser carregada."
                : "Este pack ainda não declara o Loop Vivo da Semana."}
            </h1>
            {status.state === "error" && (
              <button
                type="button"
                onClick={reload}
                className="mt-6 min-h-11 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
              >
                Tentar novamente
              </button>
            )}
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-7 px-4 py-8 sm:px-6">
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-[2rem] border border-primary/18 bg-gradient-to-br from-primary/12 via-card to-accent/8 p-6 shadow-sm sm:p-8"
        >
          <div
            className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/8 blur-3xl"
            aria-hidden
          />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {LOOP_VIVO_COPY.eyebrow}
            </p>
            <h1 className="mt-3 max-w-3xl font-serif text-3xl leading-tight text-foreground sm:text-4xl">
              {LOOP_VIVO_COPY.title}
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
              {LOOP_VIVO_COPY.lead}
            </p>
          </div>
          <div className="relative mt-5 inline-flex items-center gap-2 rounded-2xl border border-border/60 bg-card/75 px-4 py-2.5 backdrop-blur">
            <Users className="h-4 w-4 text-primary" aria-hidden />
            <span className="text-sm text-foreground">
              {LOOP_TEAM_LABEL} · {LOOP_TEAM_SIZE} pessoas · {result.completedSteps}/
              {result.totalSteps} passos concluídos
            </span>
          </div>
        </motion.header>

        <section className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
          <ol className="space-y-3">
            {result.steps.map((step) => {
              const Icon = STEP_ICON[step.id];
              return (
                <li
                  key={step.id}
                  className={`flex items-start gap-4 rounded-2xl border p-4 ${
                    step.done
                      ? "border-primary/30 bg-primary/5"
                      : step.unlocked
                        ? "border-border/60 bg-background/45"
                        : "border-dashed border-border/50 bg-muted/20 opacity-70"
                  }`}
                >
                  <span
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                      step.done
                        ? "bg-primary/15 text-primary"
                        : step.unlocked
                          ? "bg-muted text-muted-foreground"
                          : "bg-muted/60 text-muted-foreground"
                    }`}
                    aria-hidden
                  >
                    {step.unlocked ? <Icon className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">
                        {loop.stepLabels[step.id]}
                      </p>
                      {step.coveragePct !== null ? (
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-medium tabular-nums ${
                            step.done ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {step.coveragePct}% da equipe
                        </span>
                      ) : (
                        <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
                          🔒 protegido
                        </span>
                      )}
                    </div>
                    {step.coveragePct !== null && (
                      <div
                        className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted"
                        role="progressbar"
                        aria-valuenow={step.coveragePct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${loop.stepLabels[step.id]}: ${step.coveragePct}% da equipe`}
                      >
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-500"
                          style={{ width: `${step.coveragePct}%` }}
                        />
                      </div>
                    )}
                    {step.id === "evidenciar" && !step.done && step.unlocked && (
                      <Link
                        to="/diario"
                        className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                      >
                        Registrar uma prática no Diário →
                      </Link>
                    )}
                    {step.id === "celebrar" && !step.done && (
                      <div className="mt-2 space-y-1.5">
                        <p className="text-[11px] leading-relaxed text-muted-foreground">
                          {LOOP_VIVO_COPY.celebrarNote}
                        </p>
                        {step.unlocked && (
                          <Link
                            to="/reconhecimento"
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                          >
                            Ver o Pomar da Equipe →
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <section className="rounded-3xl border border-primary/20 bg-primary/5 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
            <div>
              <h2 className="font-serif text-xl text-foreground">Time, nunca ranking</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Este anel mostra o progresso da EQUIPE — nunca de uma pessoa. Ninguém é
                nomeado por não ter completado um passo, e equipes pequenas demais para
                proteger identidade ficam com a cobertura oculta por padrão.
              </p>
              <Link
                to="/academia"
                className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-foreground underline decoration-border underline-offset-4 hover:text-primary"
              >
                Ir para as trilhas da Academia
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </section>

        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          {LOOP_VIVO_COPY.scienceNote} {LOOP_VIVO_COPY.demoNote}
        </p>
      </div>
    </AppShell>
  );
}
