import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/app/shell/AppShell";
import { usePack } from "@/engine/pack";
import { usePersona } from "@/engine/rbac/rbac";
import { computeWave } from "@/engine/campaign/campaign-engine";
import { useWaveResponses } from "@/engine/survey/survey-store";
import { calculateIVO } from "@/engine/index/ivo-engine";
import { rankPriorities } from "@/engine/priority/priority-engine";
import { recommendPaths } from "@/engine/academia/academia-engine";
import { getAntiGamingRules } from "@/engine/gamification/gamification-engine";
import {
  deriveLiveMissions,
  ETHICAL_XP_RULE,
  type MissionAxis,
} from "@/engine/gamification/live-economy";
import { getActiveWave } from "@/mocks/campaign-mock";
import { getSectorData } from "@/mocks/sector-data";
import { FORECAST_LEVERS, pillarsFromIvo } from "@/mocks/forecast-mock";
import { LEARNING_PATHS } from "@/mocks/academia-mock";
import { AMBASSADORSHIPS } from "@/mocks/embaixadorias-mock";

const AXIS_STYLE: Record<MissionAxis, { label: string; cls: string }> = {
  mensurar: {
    label: "Mensurar",
    cls: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  },
  transformar: {
    label: "Transformar",
    cls: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  },
  educar: {
    label: "Educar",
    cls: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  },
};

export const Route = createFileRoute("/embaixador")({
  head: () => ({ meta: [{ title: "Painel do Embaixador — 4 Lentes VitalOS™" }] }),
  component: EmbaixadorPage,
});

function EmbaixadorPage() {
  const { packId, index, gamification } = usePack();
  const { roleId } = usePersona();
  const waveInput = getActiveWave(packId);
  const responded = useWaveResponses((s) => s.hasResponded(waveInput.id));
  const wave = useMemo(() => computeWave(waveInput), [waveInput]);
  // A embaixadoria que a pessoa lidera (joined) — senão a primeira.
  const mine = AMBASSADORSHIPS.find((a) => a.joined) ?? AMBASSADORSHIPS[0]!;

  // Missões VIVAS — derivam do laço inteiro (onda + prioridade + trilha), XP ético.
  const missions = useMemo(() => {
    if (!index || !gamification) return [];
    const current = calculateIVO(getSectorData(packId).currentCycle, index);
    const pillars = pillarsFromIvo(current);
    const top = rankPriorities(pillars, FORECAST_LEVERS, { scenario: "medio" }).items[0] ?? null;
    const lowest = current.lenses
      .flatMap((l) => l.pillars)
      .filter((p) => p.visible)
      .sort((a, b) => a.score - b.score)
      .slice(0, 4)
      .map((p) => p.pillarName);
    const ranked = recommendPaths(LEARNING_PATHS, { lowestPillarNames: lowest, roleId });
    const recommended = ranked.find((r) => r.relevance === "prioritaria") ?? ranked[0] ?? null;
    return deriveLiveMissions(
      {
        waveOpen: wave.state === "aberta" || wave.state === "encerrando",
        waveInstrument: wave.instrumentShort,
        alreadyResponded: responded,
        topPriorityLabel: top?.label ?? null,
        recommendedPathTitle: recommended?.path.title ?? null,
      },
      getAntiGamingRules(gamification),
    );
  }, [index, gamification, packId, roleId, wave, responded]);

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        <motion.header initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Comunidade · Painel do Embaixador
          </p>
          <h1 className="mt-1 font-serif text-3xl text-foreground sm:text-4xl">
            Você move a cultura — de baixo para cima
          </h1>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground">
            O Embaixador não dá ordens: cria condições. Mobiliza a participação, sustenta uma
            embaixadoria e transforma a leitura coletiva em ação — sempre no agregado, sempre
            voluntário.
          </p>
        </motion.header>

        {/* Mobilizar a Onda — o papel central do Embaixador no Mensurar */}
        <section className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-primary">
            Mobilizar a onda da estação
          </p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-serif text-2xl text-foreground">{wave.instrumentLabel}</p>
              <p className="text-xs text-muted-foreground">
                estação {wave.season} · {wave.daysRemaining} dia(s) restantes
              </p>
            </div>
            <div className="text-right">
              <p className="font-serif text-4xl font-semibold text-foreground">
                {wave.participationPct}%
              </p>
              <p className="text-xs text-muted-foreground">participação (agregado)</p>
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-card-foreground">
            {wave.participationPct < wave.targetParticipationPct
              ? `Faltam ${wave.targetParticipationPct - wave.participationPct} pontos para a meta. Um convite caloroso da sua parte move mais que um e-mail do RH.`
              : "Meta alcançada — agora é sustentar e celebrar quem participou."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              to="/onda"
              className="rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              Ver a onda
            </Link>
            <Link
              to="/responder"
              className="rounded-xl border border-border px-4 py-2 text-sm text-foreground transition-colors hover:bg-muted"
            >
              Responder eu mesmo(a)
            </Link>
          </div>
        </section>

        {/* Minha embaixadoria */}
        <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Minha embaixadoria
          </p>
          <div className="mt-2 flex items-start gap-3">
            <span className="text-3xl" aria-hidden>
              {mine.emoji}
            </span>
            <div className="min-w-0">
              <p className="font-serif text-xl text-foreground">{mine.name}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                {mine.description}
              </p>
              <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span>
                  <span className="font-semibold text-foreground">{mine.members}</span> pessoas
                </span>
                <span>
                  <span className="font-semibold text-foreground">{mine.openMissions}</span> missões
                  abertas
                </span>
                <span>
                  pilar: <span className="font-medium text-foreground">{mine.pillarName}</span>
                </span>
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              to="/embaixadorias"
              className="rounded-lg border border-input px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/50"
            >
              Ver todas as embaixadorias
            </Link>
            <Link
              to="/academia"
              className="rounded-lg border border-input px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/50"
            >
              Trilha do pilar
            </Link>
          </div>
        </section>

        {/* Missões do momento — derivadas do laço, XP ético */}
        {missions.length > 0 && (
          <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Missões do momento
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Não são lista fixa — nascem do que a cultura precisa agora.
            </p>
            <ul className="mt-3 space-y-2">
              {missions.map((m) => {
                const ax = AXIS_STYLE[m.axis];
                return (
                  <li key={m.id}>
                    <Link
                      to={m.route}
                      className="flex items-center gap-3 rounded-xl border border-border/60 bg-background px-4 py-3 transition-colors hover:bg-muted/40"
                    >
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${ax.cls}`}
                      >
                        {ax.label}
                      </span>
                      <span className="min-w-0 flex-1 text-sm text-card-foreground">{m.title}</span>
                      <span className="shrink-0 text-sm font-semibold text-primary">
                        +{m.xp} XP
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              {ETHICAL_XP_RULE}
            </p>
          </section>
        )}

        {/* Do dado à ação — o laço completo */}
        <section className="grid gap-3 sm:grid-cols-3">
          <LoopLink to="/devolutiva" kicker="Educar" title="Devolutiva da onda" />
          <LoopLink to="/embaixadorias" kicker="Transformar" title="Missões da embaixadoria" />
          <LoopLink to="/onda" kicker="Mensurar" title="Mobilizar participação" />
        </section>

        <p className="text-center text-xs text-muted-foreground">
          XP e reconhecimento celebram contribuição à cultura — nunca desempenho, promoção ou
          remuneração.
        </p>
      </div>
    </AppShell>
  );
}

function LoopLink({ to, kicker, title }: { to: string; kicker: string; title: string }) {
  return (
    <Link
      to={to}
      className="rounded-2xl border border-border/60 bg-card p-4 transition-all hover:border-border hover:shadow-sm"
    >
      <p className="text-xs uppercase tracking-[0.14em] text-primary">{kicker}</p>
      <p className="mt-1 text-sm font-medium text-card-foreground">{title} →</p>
    </Link>
  );
}
