// /expedicao — Expedição contra a Drenagem (I4, Academia Viva 2.0). O antagonista da temporada
// NUNCA é escolhido por marketing — é derivado do driver pior-ranqueado pela exposição medida
// (rankDriversByExposure, o mesmo ranking que alimenta /matriz e /drivers). O bestiário só recua
// ou cai com prova (buildReavaliacao / ReavaliacaoEfficacy, o mesmo motor de /evolucao-nr1).
// DEMO v1: a leitura usa a série do setor ativo (mesma fonte de /matriz e a camada mock de
// /evolucao-nr1) — decisão de escopo honesta: o pool coletivo da expedição e os badges
// coletivos ficam para v2 (não existe infraestrutura de "dano coletivo ao antagonista" hoje,
// só o Bosque do Bem-Comum, que é sabor CSR, não sabor "combate").

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Minus, ShieldAlert, Skull, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { AppShell } from "@/app/shell/AppShell";
import { usePack } from "@/engine/pack";
import { getCollectiveNarrative } from "@/engine/gamification/gamification-engine";
import { rankDriversByExposure } from "@/engine/nr1/crosswalk-engine";
import { buildPgrPlan } from "@/engine/nr1/pgr-engine";
import { buildReavaliacao } from "@/engine/nr1/reavaliacao-engine";
import {
  assessBestiary,
  selectSeasonAntagonist,
  type AntagonistAssessment,
  type AntagonistStatus,
} from "@/engine/academia/expedition-engine";
import { NR1_CROSSWALK } from "@/mocks/nr1-crosswalk-mock";
import { useSectorNR1 } from "@/hooks/use-sector-nr1";
import { useRealOrgSession } from "@/app/identity/useRealOrgSession";
import { supabase } from "@/integrations/supabase/client";
import {
  getRealExpeditionState,
  type RealExpeditionResult,
} from "@/lib/api/expedition-real.functions";

export const Route = createFileRoute("/expedicao")({
  head: () => ({ meta: [{ title: "Expedição contra a Drenagem · Academia — VitalOS™" }] }),
  component: ExpedicaoPage,
});

const STATUS_META: Record<
  AntagonistStatus,
  { label: string; icon: typeof TrendingUp; tint: string }
> = {
  dominando: {
    label: "Dominando",
    icon: TrendingUp,
    tint: "border-red-400/50 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300",
  },
  recuando: {
    label: "Recuando",
    icon: Minus,
    tint: "border-amber-400/50 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300",
  },
  derrotado: {
    label: "Derrotado",
    icon: TrendingDown,
    tint: "border-emerald-400/50 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300",
  },
};

function AssessmentRow({
  name,
  tagline,
  finalBoss,
  assessment,
}: {
  name: string;
  tagline: string;
  finalBoss?: boolean;
  assessment: AntagonistAssessment;
}) {
  const meta = STATUS_META[assessment.status];
  const Icon = meta.icon;
  return (
    <li className="flex items-start gap-4 rounded-2xl border border-border/60 bg-background/45 p-4">
      <span
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground"
        aria-hidden
      >
        {finalBoss ? <Skull className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-foreground">{name}</p>
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium ${meta.tint}`}
          >
            <Icon className="h-3 w-3" aria-hidden />
            {meta.label}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{tagline}</p>
        <p className="mt-2 text-xs leading-relaxed text-foreground/80">{assessment.evidenceNote}</p>
      </div>
    </li>
  );
}

function ExpedicaoPage() {
  const { status, gamification, reload } = usePack();
  const bestiary = useMemo(
    () => (gamification ? getCollectiveNarrative(gamification) : null),
    [gamification],
  );
  const { exposure, cycles, measures, maintenance } = useSectorNR1();

  const needs = useMemo(() => rankDriversByExposure(NR1_CROSSWALK, exposure), [exposure]);

  const reavaliacao = useMemo(() => {
    const pgrPlan = buildPgrPlan({
      registry: NR1_CROSSWALK,
      exposures: exposure,
      measures,
      generatedAt: NR1_CROSSWALK.updatedAt,
      currentWeek: 13,
      horizonWeeks: 13,
      topRisks: 5,
    });
    return buildReavaliacao({
      registry: NR1_CROSSWALK,
      cycles,
      pgrPlan,
      maintenanceByDriver: maintenance,
    });
  }, [exposure, cycles, measures, maintenance]);

  const demoSelection = useMemo(
    () => (bestiary ? selectSeasonAntagonist(bestiary, needs) : null),
    [bestiary, needs],
  );

  const demoAssessments = useMemo(
    () => (bestiary ? assessBestiary(bestiary, reavaliacao.drivers, reavaliacao.efficacy) : []),
    [bestiary, reavaliacao],
  );

  // Sessão real: a mesma composição (rankDriversByExposure → buildReavaliacao →
  // assessBestiary), só que sobre o Cofre de Ciclos REAL desta organização —
  // resolvida no servidor (nunca confia em pack/org do payload, P0-04).
  const { org: realOrg } = useRealOrgSession();
  const isRealMode = !!realOrg;
  const [realResult, setRealResult] = useState<RealExpeditionResult | null>(null);

  useEffect(() => {
    if (!isRealMode) return;
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      const accessToken = data.session?.access_token;
      if (!accessToken) return;
      getRealExpeditionState({ data: { accessToken } })
        .then((r) => active && setRealResult(r))
        .catch(() => active && setRealResult(null));
    });
    return () => {
      active = false;
    };
  }, [isRealMode]);

  const realState = realResult?.available ? realResult.state : null;
  const selection = isRealMode ? (realState?.selection ?? null) : demoSelection;
  const assessments = isRealMode ? (realState?.assessments ?? []) : demoAssessments;

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

  if (status.state === "error" || !bestiary) {
    return (
      <AppShell>
        <div className="mx-auto flex min-h-[55vh] max-w-xl items-center px-4 py-12 sm:px-6">
          <div className="w-full rounded-3xl border border-destructive/30 bg-card p-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-destructive">
              Expedição indisponível
            </p>
            <h1 className="mt-3 font-serif text-2xl text-foreground">
              {status.state === "error"
                ? "A configuração deste pack não pôde ser carregada."
                : "Este pack ainda não declara o bestiário da Expedição."}
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

  const cinismo = bestiary.find((a) => a.finalBoss);
  const cinismoAssessment = assessments.find((a) => a.antagonistId === cinismo?.id);

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
              Academia Viva · Expedição contra a Drenagem
            </p>
            <h1 className="mt-3 max-w-3xl font-serif text-3xl leading-tight text-foreground sm:text-4xl">
              O antagonista nasce da medição, nunca do marketing
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
              Cada antagonista deste bestiário é um padrão sistêmico — nunca uma pessoa. Ele só
              recua quando a reavaliação mostra queda de exposição, e só cai com eficácia plena:
              medida de fonte implementada e mantida no tempo (Guia MTE 2026, 11.4.4).
            </p>
          </div>
        </motion.header>

        {isRealMode && realState && realState.cycleCount < 2 && (
          <section className="rounded-3xl border border-primary/20 bg-primary/5 p-5 sm:p-6">
            <p className="text-sm leading-relaxed text-foreground/80">
              {realState.cycleCount === 0
                ? "Sua organização ainda não tem ciclo registrado no Cofre de Ciclos — sem medição, não se inventa antagonista."
                : "1 ciclo registrado: o antagonista da temporada já é real, mas a reavaliação (recuo/derrota) exige pelo menos um 2º ciclo para comparar."}
            </p>
          </section>
        )}

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm sm:p-6"
        >
          <h2 className="font-serif text-xl text-foreground">O antagonista da temporada</h2>
          {selection ? (
            <div className="mt-3 space-y-2">
              <p className="text-lg font-medium text-foreground">{selection.antagonist.name}</p>
              <p className="text-sm text-muted-foreground">{selection.antagonist.tagline}</p>
              <p className="text-xs leading-relaxed text-foreground/80">
                Convocado pelo driver mais exposto na medição atual:{" "}
                <span className="font-medium">{selection.need.label}</span>
                {selection.need.topDimension && (
                  <>
                    {" "}— dimensão-fonte <em>{selection.need.topDimension.label}</em> com carga{" "}
                    {selection.need.topDimension.load}.
                  </>
                )}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Sem exposição medida que combine com um antagonista do bestiário — sem dado, não se
              inventa inimigo.
            </p>
          )}
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm sm:p-6"
        >
          <h2 className="font-serif text-xl text-foreground">O bestiário completo</h2>
          <ol className="mt-4 space-y-3">
            {bestiary.map((antagonist) => {
              const assessment = assessments.find((a) => a.antagonistId === antagonist.id);
              if (!assessment) return null;
              return (
                <AssessmentRow
                  key={antagonist.id}
                  name={antagonist.name}
                  tagline={antagonist.tagline}
                  finalBoss={antagonist.finalBoss}
                  assessment={assessment}
                />
              );
            })}
          </ol>
        </motion.section>

        {cinismo && cinismoAssessment && (
          <section className="rounded-3xl border border-primary/20 bg-primary/5 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
              <div>
                <h2 className="font-serif text-xl text-foreground">Por que o Culture Lab existe</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {cinismo.name} não tem driver — é exatamente para matá-lo que existem o Culture
                  Lab e a Vitrine de Evidências. Ele só cai com um ciclo fechado com evidência real
                  de eficácia, nunca com promessa.
                </p>
              </div>
            </div>
          </section>
        )}

        <section className="rounded-3xl border border-border/70 bg-muted/20 p-5 sm:p-6">
          <p className="text-sm leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">Nota honesta desta v1:</span> o pool
            coletivo de dano ao antagonista e os badges coletivos da expedição ficam para a v2 —
            hoje a infraestrutura de jogo coletivo (Bosque do Bem-Comum) é sabor CSR, não sabor
            "combate ao antagonista", e não há motivo para inventar essa ponte sem base real.
          </p>
          <Link
            to="/academia"
            className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-foreground underline decoration-border underline-offset-4 hover:text-primary"
          >
            Ir para as trilhas da Academia
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </section>

        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          {reavaliacao.disclaimer}{" "}
          {isRealMode
            ? "Leitura REAL desta organização, sobre o Cofre de Ciclos — não constitui diagnóstico individual."
            : "Leitura de referência do setor ativo (mesma série usada em Matriz e Reavaliação NR-1) — não constitui diagnóstico individual."}
        </p>
      </div>
    </AppShell>
  );
}
