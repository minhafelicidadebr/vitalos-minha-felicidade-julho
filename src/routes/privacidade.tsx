import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppShell } from "@/app/shell/AppShell";
import { useIvo } from "@/mocks/hooks";
import {
  channelUsability,
  usableChannelIds,
  partitionByConsent,
} from "@/engine/trust/consent-engine";
import { proposeActions, type AgentProposal } from "@/engine/ai/agent-engine";
import { AI_GUARDRAILS } from "@/engine/ai/ai-types";
import { rankPriorities } from "@/engine/priority/priority-engine";
import { evaluateEvidence } from "@/engine/lab/evidence-engine";
import { computeSeasonOverview } from "@/engine/season/season-engine";
import { FORECAST_LEVERS, pillarsFromIvo } from "@/mocks/forecast-mock";
import { ambassadorshipForPillar } from "@/mocks/priority-mock";
import { EXPERIMENT_CASES } from "@/mocks/experiment-mock";
import { ANNUAL_PLAN, CURRENT_PROGRAM_WEEK } from "@/mocks/season-mock";
import { PROTOCOLS } from "@/mocks/lab-mock";
import { CONSENT_CHANNELS, REASON_COPY, SIGNAL_ALERT, PRIVACY_INTRO } from "@/mocks/consent-mock";
import { KIND_COPY, URGENCY_COPY } from "@/mocks/copiloto-mock";
import { DATA_RIGHTS } from "@/mocks/trust-mock";

export const Route = createFileRoute("/privacidade")({
  head: () => ({ meta: [{ title: "Privacidade × FlorescerIA — 4 Lentes VITA" }] }),
  component: PrivacidadePage,
});

function PrivacidadePage() {
  const { current, previous } = useIvo();

  // Estado dos consentimentos pessoais (o colaborador no controle).
  const [granted, setGranted] = useState<Record<string, boolean>>(
    Object.fromEntries(CONSENT_CHANNELS.map((c) => [c.id, c.personalGranted])),
  );

  const channels = CONSENT_CHANNELS.map((c) => ({
    ...c,
    personalGranted: granted[c.id] ?? c.personalGranted,
  }));
  const usable = useMemo(() => usableChannelIds(channels), [granted]);

  // Observações para a FlorescerIA, derivadas dos motores (sempre agregadas).
  const proposals = useMemo(() => {
    if (!current) return [];
    const pillars = pillarsFromIvo(current);

    const priorities = rankPriorities(pillars, FORECAST_LEVERS, { scenario: "medio" });
    const top = priorities.items[0] ?? null;
    const owner = top?.addressedPillars[0]
      ? ambassadorshipForPillar(top.addressedPillars[0].pillarId)
      : null;

    const prevScores = new Map(
      (previous?.lenses ?? []).flatMap((l) => l.pillars.map((p) => [p.pillarId, p.score] as const)),
    );
    const declining = current.lenses
      .flatMap((l) => l.pillars)
      .filter((p) => p.visible && prevScores.has(p.pillarId))
      .map((p) => ({ p, drop: (prevScores.get(p.pillarId) ?? p.score) - p.score }))
      .filter(({ drop }) => drop >= 6)
      .sort((a, b) => b.drop - a.drop)
      .slice(0, 2)
      .map(({ p, drop }) => ({ pillarId: p.pillarId, name: p.pillarName, score: p.score, drop }));

    const experiments = EXPERIMENT_CASES.filter((c) => c.status === "concluido" && c.observed).map(
      (c) => {
        const v = evaluateEvidence(c.observed!);
        const name = c.protocolId
          ? (PROTOCOLS.find((pr) => pr.id === c.protocolId)?.name ?? c.id)
          : c.id;
        return {
          id: c.id,
          name,
          verdict: v.verdict,
          netEffect: v.netEffect,
          reportable: v.reportable,
        };
      },
    );

    const season = computeSeasonOverview(ANNUAL_PLAN, CURRENT_PROGRAM_WEEK);

    // signalAlert é sempre gerado para que a proposta exista e possa ser
    // DESBLOQUEADA ao conceder o canal (o consentimento é o gate, não a geração).
    return proposeActions({
      topPriority: top
        ? {
            leverId: top.leverId,
            label: top.label,
            owner: owner?.name ?? null,
            lift: top.expectedIvoLift,
            isQuickWin: top.isQuickWin,
          }
        : null,
      decliningPillars: declining,
      experiments,
      signalAlert: SIGNAL_ALERT,
      phaseId: season.currentPhase.id,
      seasonName: season.currentSeason.name,
    });
  }, [current, previous]);

  const { allowed, blocked } = partitionByConsent(proposals, usable);

  const toggle = (id: string) => setGranted((g) => ({ ...g, [id]: !(g[id] ?? false) }));

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {PRIVACY_INTRO.eyebrow}
          </p>
          <h1 className="mt-1 font-serif text-3xl text-foreground">{PRIVACY_INTRO.title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {PRIVACY_INTRO.lead}
          </p>
        </motion.div>

        {/* Canais de observação */}
        <section className="space-y-3">
          <h2 className="font-serif text-xl text-foreground">Seus canais de observação</h2>
          {channels.map((ch) => {
            const u = channelUsability(ch);
            return (
              <div
                key={ch.id}
                className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-card-foreground">{ch.label}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                      {ch.feeds}
                    </p>
                  </div>
                  <button
                    onClick={() => toggle(ch.id)}
                    role="switch"
                    aria-checked={ch.personalGranted}
                    aria-label={`Consentir ${ch.label}`}
                    className={`mt-0.5 flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors ${
                      ch.personalGranted ? "bg-primary" : "bg-muted"
                    }`}
                  >
                    <span
                      className={`h-5 w-5 rounded-full bg-background shadow-sm transition-transform ${
                        ch.personalGranted ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px]">
                  <span
                    className={`rounded-full px-2 py-0.5 font-medium ${
                      u.usable
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                        : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
                    }`}
                  >
                    {u.usable ? "Observável pela IA" : REASON_COPY[u.reason]}
                  </span>
                  <span className="text-muted-foreground">
                    {ch.orgConsentPct}% da org consentiu ({ch.orgConsentCount} pessoas)
                  </span>
                </div>

                <div className="mt-2 grid gap-1 sm:grid-cols-2">
                  <p className="flex gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
                    <span className="text-emerald-500/70">✓</span>
                    {ch.iaCan}
                  </p>
                  <p className="flex gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
                    <span className="text-red-500/60">✕</span>
                    {ch.iaCannot}
                  </p>
                </div>
              </div>
            );
          })}
        </section>

        {/* Preview ao vivo do copiloto */}
        <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-serif text-lg text-foreground">
              O que a FlorescerIA pode propor agora
            </h2>
            <span className="text-[11px] text-muted-foreground">
              {allowed.length} ativas · {blocked.length} bloqueadas por você
            </span>
          </div>

          <div className="space-y-2">
            {allowed.map((p) => (
              <PreviewRow key={p.id} proposal={p} blocked={false} />
            ))}
            <AnimatePresence initial={false}>
              {blocked.map(({ item, missingChannel }) => (
                <PreviewRow key={item.id} proposal={item} blocked missingChannel={missingChannel} />
              ))}
            </AnimatePresence>
          </div>

          {allowed.length === 0 && (
            <p className="mt-2 text-sm text-muted-foreground">
              Você revogou os canais de percepção — a FlorescerIA fica em silêncio. É a sua escolha,
              sem penalidade.
            </p>
          )}
        </section>

        {/* Guardrails */}
        <section className="rounded-2xl border border-border/60 bg-muted/30 p-5">
          <h2 className="mb-3 font-serif text-base text-foreground">Limites invioláveis</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-[10px] uppercase tracking-[0.12em] text-red-600 dark:text-red-400">
                Nunca
              </p>
              <ul className="space-y-1">
                {AI_GUARDRAILS.never.map((g) => (
                  <li
                    key={g}
                    className="flex gap-1.5 text-[11px] leading-relaxed text-muted-foreground"
                  >
                    <span className="text-red-500/60">✕</span>
                    {g}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-1.5 text-[10px] uppercase tracking-[0.12em] text-emerald-600 dark:text-emerald-400">
                Sempre
              </p>
              <ul className="space-y-1">
                {AI_GUARDRAILS.always.map((g) => (
                  <li
                    key={g}
                    className="flex gap-1.5 text-[11px] leading-relaxed text-muted-foreground"
                  >
                    <span className="text-emerald-500/60">✓</span>
                    {g}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Direitos sobre os dados */}
        <section className="grid gap-3 sm:grid-cols-3">
          {DATA_RIGHTS.map((r) => (
            <div key={r.id} className="rounded-2xl border border-border/60 bg-card p-4">
              <p className="text-sm font-medium text-card-foreground">{r.label}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                {r.description}
              </p>
            </div>
          ))}
        </section>

        <p className="text-center text-xs text-muted-foreground">
          Esta é a ponte do{" "}
          <Link to="/confianca" className="underline underline-offset-2 hover:text-foreground">
            Trust Ledger
          </Link>{" "}
          com a{" "}
          <Link to="/copiloto" className="underline underline-offset-2 hover:text-foreground">
            FlorescerIA Proativa
          </Link>
          : a IA propõe, você aprova — e só enxerga o que você permite.
        </p>
      </div>
    </AppShell>
  );
}

// ─── Linha de preview de proposta ─────────────────────────────────────────────

function PreviewRow({
  proposal,
  blocked,
  missingChannel,
}: {
  proposal: AgentProposal;
  blocked: boolean;
  missingChannel?: string;
}) {
  const kind = KIND_COPY[proposal.kind];
  const urgency = URGENCY_COPY[proposal.urgency];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex items-start gap-3 rounded-xl border px-3.5 py-3 ${
        blocked
          ? "border-dashed border-border/50 bg-muted/20 opacity-70"
          : "border-border/60 bg-background/40"
      }`}
    >
      <span className="mt-0.5 text-base" aria-hidden>
        {kind.icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-medium text-card-foreground">{kind.label}</span>
          {!blocked && (
            <span
              className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${urgency.bg} ${urgency.color}`}
            >
              {urgency.label}
            </span>
          )}
        </div>
        <p
          className={`mt-0.5 text-[12px] leading-relaxed ${blocked ? "text-muted-foreground" : "text-card-foreground"}`}
        >
          {proposal.trigger}
        </p>
      </div>
      {blocked && (
        <span className="shrink-0 self-center rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-medium text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
          🔒 ligue {missingChannel}
        </span>
      )}
    </motion.div>
  );
}
