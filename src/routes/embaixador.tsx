import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { HeartHandshake, ShieldCheck, Sparkles, Users } from "lucide-react";
import { AppShell } from "@/app/shell/AppShell";
import { useLiveEconomy } from "@/app/gamification/use-live-economy";
import { usePack } from "@/engine/pack";
import { computeWave } from "@/engine/campaign/campaign-engine";
import { ETHICAL_XP_RULE, type MissionAxis } from "@/engine/gamification/live-economy";
import { getCirclesConfig } from "@/engine/gamification/gamification-engine";
import {
  getCircleScript,
  openCircleSession,
  sessionsByEmbassy,
  type CircleSessionRejectReason,
} from "@/engine/embaixadorias/circle-engine";
import { useCircleSessions } from "@/engine/embaixadorias/circle-session-store";
import { useCircleSessionsSync } from "@/app/identity/useCircleSessionsSync";
import { useRealOrgSession } from "@/app/identity/useRealOrgSession";
import { getActiveWave } from "@/mocks/campaign-mock";
import { AMBASSADORSHIPS } from "@/mocks/embaixadorias-mock";
import { CIRCLE_SCRIPTS, CIRCLE_VIVO_COPY } from "@/mocks/circle-script-mock";
import { MOCK_USER } from "@/mocks/colaborador-mock";
import { GAMIFICATION_TODAY } from "@/mocks/gamification-mock";

const CIRCLE_RESULT_COPY: Record<CircleSessionRejectReason, string> = {
  invalid_request: "Verifique os dados da roda antes de registrar.",
  duplicate: "Esta roda já foi registrada.",
  presence_out_of_range: "Uma roda tem entre 5 e 8 pessoas — ajuste a contagem.",
  no_script_for_driver: "Esta embaixadoria ainda não tem um roteiro pronto.",
};

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
  const { packId } = usePack();
  const live = useLiveEconomy();
  const waveInput = getActiveWave(packId);
  const wave = useMemo(() => computeWave(waveInput), [waveInput]);
  // A embaixadoria que a pessoa lidera (joined) — senão a primeira.
  const mine = AMBASSADORSHIPS.find((a) => a.joined) ?? AMBASSADORSHIPS[0]!;

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

        <CircleSection embassyId={mine.id} driverId={mine.driverId} />

        {/* Missões do momento — derivadas do laço, XP ético */}
        {live.missions.length > 0 && (
          <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Missões do momento
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Não são lista fixa — nascem do que a cultura precisa agora.
            </p>
            <ul className="mt-3 space-y-2">
              {live.missions.map((m) => {
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
                        {m.status === "completed" ? "Concluída" : `até +${m.xp} XP`}
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

// ─── Círculo Vivo (I5) ────────────────────────────────────────────────────────

function CircleSection({ embassyId, driverId }: { embassyId: string; driverId?: string }) {
  const { gamification } = usePack();
  const circles = useMemo(() => (gamification ? getCirclesConfig(gamification) : null), [gamification]);
  const demoSessions = useCircleSessions((state) => state.sessions);
  const append = useCircleSessions((state) => state.append);

  // Sessão real: rodas da ORG persistidas (privacidade por schema — só
  // metadados, nunca quem participou). Demo: store local efêmero.
  const { isRealSession, orgSessions, persist } = useCircleSessionsSync();
  const { org } = useRealOrgSession();
  const sessions = isRealSession ? orgSessions : demoSessions;

  const [presenceCount, setPresenceCount] = useState(6);
  const [result, setResult] = useState<CircleSessionRejectReason | "recorded" | null>(null);

  if (!circles) return null;

  const facilitatorId = isRealSession && org ? org.userId : MOCK_USER.id;
  const today = isRealSession ? new Date().toISOString().slice(0, 10) : GAMIFICATION_TODAY;
  const script = driverId ? getCircleScript(CIRCLE_SCRIPTS, driverId) : undefined;
  const mySessions = sessionsByEmbassy(sessions, embassyId);
  const lastSession = [...mySessions].reverse()[0] ?? null;

  function open() {
    if (!driverId || !circles) return;
    const response = openCircleSession(
      sessions,
      {
        id: `circ-${embassyId}-${sessions.length + 1}`,
        embassyId,
        facilitatorId,
        driverId,
        occurredOn: today,
        presenceCount,
      },
      CIRCLE_SCRIPTS,
      circles.policy,
    );
    setResult(response.reason);
    if (response.reason === "recorded" && response.session) {
      if (isRealSession) {
        // Persiste no banco (fire-and-forget; reload traz o id real).
        void persist({
          id: response.session.id,
          embassyId: response.session.embassyId,
          driverId: response.session.driverId,
          occurredOn: response.session.occurredOn,
          presenceCount: response.session.presenceCount,
        });
      } else {
        append(response.session);
      }
    }
  }

  return (
    <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Users className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {CIRCLE_VIVO_COPY.eyebrow}
          </p>
          <h2 className="font-serif text-xl text-foreground">{CIRCLE_VIVO_COPY.title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {CIRCLE_VIVO_COPY.lead}
          </p>
        </div>
      </div>

      {!script ? (
        <p className="mt-4 rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
          {CIRCLE_VIVO_COPY.noScriptNote}
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="rounded-2xl border border-border/55 bg-background/45 p-4">
            <p className="text-sm font-medium text-foreground">{script.title}</p>
            <p className="mt-2 text-sm italic leading-relaxed text-muted-foreground">
              "{script.openingPrompt}"
            </p>
            <ul className="mt-2 space-y-1">
              {script.discussionPrompts.map((prompt) => (
                <li key={prompt} className="text-xs leading-relaxed text-muted-foreground">
                  • {prompt}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-muted-foreground">{script.citation}</p>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-foreground">
                Quantas pessoas na roda? (5-8)
              </span>
              <input
                type="number"
                min={5}
                max={8}
                value={presenceCount}
                onChange={(event) => {
                  setPresenceCount(Number(event.target.value));
                  setResult(null);
                }}
                className="min-h-11 w-24 rounded-xl border border-input bg-background px-3 text-sm text-foreground"
              />
            </label>
            <button
              type="button"
              onClick={open}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              Registrar roda concluída
            </button>
          </div>

          {result && (
            <div
              className={`rounded-2xl px-4 py-3 text-sm ${
                result === "recorded"
                  ? "border border-emerald-300/60 bg-emerald-50/60 text-emerald-900 dark:border-emerald-800/50 dark:bg-emerald-950/20 dark:text-emerald-300"
                  : "border border-amber-300/60 bg-amber-50/60 text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/20 dark:text-amber-300"
              }`}
              role="status"
            >
              {result === "recorded" ? (
                <div className="space-y-2">
                  <p>Roda registrada. Fechamento ritual — o compromisso é seu, não da roda:</p>
                  <p className="italic">"{script.closingPrompt}"</p>
                  <div className="flex flex-wrap gap-3 pt-1">
                    <Link
                      to="/diario"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                    >
                      <HeartHandshake className="h-3.5 w-3.5" aria-hidden />
                      Registrar meu compromisso no Diário →
                    </Link>
                    <Link
                      to="/reconhecimento"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                    >
                      Plantar uma semente para alguém →
                    </Link>
                  </div>
                </div>
              ) : (
                CIRCLE_RESULT_COPY[result]
              )}
            </div>
          )}

          {lastSession && (
            <p className="text-[11px] text-muted-foreground">
              {mySessions.length} {mySessions.length === 1 ? "roda registrada" : "rodas registradas"}{" "}
              nesta embaixadoria · última com {lastSession.presenceCount} pessoas em{" "}
              {lastSession.occurredOn}.
            </p>
          )}

          <div className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {CIRCLE_VIVO_COPY.privacyNote}
            </p>
          </div>
        </div>
      )}

      <p className="mt-3 text-[11px] text-muted-foreground">{CIRCLE_VIVO_COPY.demoNote}</p>
    </section>
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
