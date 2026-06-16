import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/app/shell/AppShell";
import { usePersona } from "@/engine/rbac/rbac";
import {
  computeWave,
  buildIndividualView,
  type MeasurementWave,
  type IndividualWaveView,
  type SegmentResult,
} from "@/engine/campaign/campaign-engine";
import { usePack } from "@/engine/pack";
import { useWaveResponses } from "@/engine/survey/survey-store";
import { getActiveWave, getSectorWaves, ONDA_INTRO, WAVE_STATE_STYLE } from "@/mocks/campaign-mock";

export const Route = createFileRoute("/onda")({
  head: () => ({ meta: [{ title: "Onda Ativa · Mensurar — 4 Lentes VITA" }] }),
  component: OndaPage,
});

// Papéis que veem a SI MESMOS (visão individual). Os demais veem o agregado.
const INDIVIDUAL_ROLES = new Set(["COLABORADOR", "EMBAIXADOR", "ESTUDANTE", "FAMILIA"]);

function OndaPage() {
  const { roleId } = usePersona();
  const { packId } = usePack();
  const isIndividual = INDIVIDUAL_ROLES.has(roleId);
  const waveInput = getActiveWave(packId);

  const responded = useWaveResponses((s) => s.hasResponded(waveInput.id));
  const wave = useMemo(() => computeWave(waveInput), [waveInput]);
  const individual = useMemo(
    () => buildIndividualView(waveInput, responded ? "respondeu" : "pendente"),
    [waveInput, responded],
  );
  const timeline = useMemo(() => getSectorWaves(packId).map((w) => computeWave(w)), [packId]);
  const stateStyle = WAVE_STATE_STYLE[wave.state]!;

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
        {/* Header comum */}
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {ONDA_INTRO.eyebrow}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="font-serif text-3xl text-foreground">{ONDA_INTRO.title}</h1>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${stateStyle.cls}`}>
              {stateStyle.label}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {wave.instrumentLabel} · estação {wave.season} · janela {wave.windowLabel}
            {wave.state !== "fechada" && ` · faltam ${wave.daysRemaining} dia(s)`}
          </p>
        </motion.header>

        {/* Revelação da dupla-visão */}
        <div className="rounded-xl border border-border/60 bg-secondary/30 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">
            Você está vendo esta onda como {isIndividual ? "colaborador(a)" : "gestão"}.
          </span>{" "}
          Troque o papel no topo para ver a MESMA onda pela outra ótica — é a trava de privacidade
          em ação: a gestão vê taxas agregadas; nunca quem respondeu.
        </div>

        {isIndividual ? (
          <IndividualView view={individual} />
        ) : (
          <LeaderView wave={wave} timeline={timeline} />
        )}
      </div>
    </AppShell>
  );
}

// ─── Visão do INDIVÍDUO ───────────────────────────────────────────────────────

function IndividualView({ view }: { view: IndividualWaveView }) {
  const responded = view.myStatus === "respondeu";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-5"
    >
      <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
        {ONDA_INTRO.leadIndividual}
      </p>

      <section className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <span
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-lg ${
              responded
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "bg-primary/10 text-primary"
            }`}
            aria-hidden
          >
            {responded ? "✓" : "✎"}
          </span>
          <div className="min-w-0">
            <p className="font-serif text-xl text-foreground">
              {responded ? "Sua resposta está registrada" : "Sua voz está aberta"}
            </p>
            <p className="mt-1 text-base leading-relaxed text-card-foreground">{view.cta}</p>
          </div>
        </div>

        {view.canRespond && (
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link
              to="/responder"
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Responder agora (≈ poucos minutos)
            </Link>
            <span className="text-xs text-muted-foreground">instrumento jogável (mock-first)</span>
          </div>
        )}
      </section>

      {/* Garantias — a privacidade como produto */}
      <section className="grid gap-3 sm:grid-cols-2">
        <Assurance icon="🔒" title="Anônima por construção" text={view.privacyAssurance} />
        <Assurance icon="🤝" title="Sempre voluntária" text={view.voluntaryNote} />
      </section>

      {/* Educar — o que acontece com a sua resposta */}
      <section className="rounded-2xl border border-border/60 bg-muted/30 p-5">
        <p className="font-medium text-card-foreground">O que acontece com a sua resposta</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Ela entra no agregado (n≥5), vira leitura coletiva no IVO e, no fim da onda, devolve
          aprendizagem e ações — Mensurar → Educar → Transformar → Evoluir.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            to="/metodologia"
            className="rounded-lg border border-input px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/50"
          >
            Como o método funciona
          </Link>
          <Link
            to="/privacidade"
            className="rounded-lg border border-input px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/50"
          >
            O que a IA pode (e não pode) ver
          </Link>
        </div>
      </section>
    </motion.div>
  );
}

function Assurance({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <p className="flex items-center gap-2 text-sm font-medium text-card-foreground">
        <span aria-hidden>{icon}</span>
        {title}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}

// ─── Visão do LÍDER / RH ──────────────────────────────────────────────────────

function LeaderView({ wave, timeline }: { wave: MeasurementWave; timeline: MeasurementWave[] }) {
  const { ledger } = wave;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-5"
    >
      <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
        {ONDA_INTRO.leadLeader}
      </p>

      {/* Participação + ritmo */}
      <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Participação</p>
            <p className="mt-1 flex items-baseline gap-2">
              <span className="font-serif text-5xl font-semibold text-foreground">
                {wave.participationPct}%
              </span>
              <span className="text-sm text-muted-foreground">
                {ledger.respondedTotal}/{ledger.invitedTotal}
              </span>
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
              wave.onTrack
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
            }`}
          >
            {wave.onTrack ? "No ritmo" : "Atrás do ritmo"}
          </span>
        </div>

        {/* Barra: participação × meta × esperado-para-agora */}
        <div className="mt-4">
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${wave.participationPct}%` }}
            />
            <span
              className="absolute top-1/2 h-4 w-0.5 -translate-y-1/2 bg-foreground/70"
              style={{ left: `${wave.targetParticipationPct}%` }}
              aria-hidden
              title={`Meta ${wave.targetParticipationPct}%`}
            />
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
            <span>esperado p/ agora: {wave.expectedByNowPct}%</span>
            <span>meta: {wave.targetParticipationPct}%</span>
          </div>
        </div>
      </section>

      {/* Lembrete — human-in-the-loop */}
      <section
        className={`rounded-2xl border p-5 ${
          wave.reminder.shouldRemind
            ? "border-amber-300/60 bg-amber-50/50 dark:border-amber-800/50 dark:bg-amber-950/20"
            : "border-border/60 bg-card"
        }`}
      >
        <p className="text-sm font-medium text-card-foreground">Lembrete de participação</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{wave.reminder.reason}</p>
        {wave.reminder.shouldRemind && (
          <button
            className="mt-3 rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
            title="Dispara um nudge de participação (mock). Em produção, respeita opt-in e cap."
          >
            Disparar lembrete coletivo
          </button>
        )}
      </section>

      {/* Livro-razão por recorte — a trava de privacidade */}
      <section className="rounded-2xl border border-border/70 bg-card shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 px-5 py-4">
          <h2 className="font-serif text-lg text-foreground">{ONDA_INTRO.segmentsTitle}</h2>
          {ledger.hiddenSegmentCount > 0 && (
            <span className="text-xs text-muted-foreground">
              🔒 {ledger.hiddenSegmentCount} recorte(s) oculto(s) (n&lt;5)
            </span>
          )}
        </header>
        <div className="divide-y divide-border/40">
          {ledger.segments.map((s) => (
            <SegmentRow key={s.segmentId} segment={s} />
          ))}
        </div>
        <p className="border-t border-border/50 px-5 py-3 text-xs leading-relaxed text-muted-foreground">
          {wave.privacyNote}
        </p>
      </section>

      {/* Prontidão + devolutiva (Educar) */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Resultado</p>
          <p className="mt-1.5 text-base leading-relaxed text-foreground">
            {ledger.readyToPublishOverall
              ? "Pronto para publicar (n≥5 no agregado)."
              : "Aguardando n≥5 para publicar com segurança."}
          </p>
          {ledger.readyToPublishOverall && (
            <Link
              to="/ivo"
              className="mt-2 inline-block text-xs text-primary underline underline-offset-2"
            >
              ver o IVO desta onda →
            </Link>
          )}
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
            Devolutiva (Educar)
          </p>
          <p className="mt-1.5 text-base leading-relaxed text-foreground">
            Ao fechar, a onda devolve aprendizagem por pilar e dispara o ciclo de ação.
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            <Link to="/academia" className="text-xs text-primary underline underline-offset-2">
              Academia →
            </Link>
            <Link to="/prioridades" className="text-xs text-primary underline underline-offset-2">
              Transformar →
            </Link>
          </div>
        </div>
      </section>

      {/* Ondas do ano — a jornada de instrumentos, trimestre a trimestre */}
      <section>
        <h2 className="mb-3 font-serif text-lg text-foreground">{ONDA_INTRO.historyTitle}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {timeline.map((w) => {
            const st = WAVE_STATE_STYLE[w.state]!;
            const active = w.id === wave.id;
            return (
              <div
                key={w.id}
                className={`rounded-2xl border p-4 ${
                  active ? "border-primary/40 bg-primary/5" : "border-border/60 bg-card"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-card-foreground">
                    {w.instrumentShort}
                  </span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${st.cls}`}>
                    {st.label}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{w.season}</p>
                {w.state !== "agendada" && (
                  <p className="mt-1 text-xs font-semibold text-foreground">
                    {w.participationPct}% participação
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </motion.div>
  );
}

function SegmentRow({ segment }: { segment: SegmentResult }) {
  if (!segment.visibleToLeader) {
    return (
      <div className="flex items-center justify-between gap-3 px-5 py-3.5">
        <span className="text-sm text-muted-foreground">{segment.label}</span>
        <span className="text-xs text-muted-foreground">
          🔒 menos de 5 respostas — taxa oculta para proteger a privacidade
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <span className="w-40 shrink-0 truncate text-sm text-card-foreground">{segment.label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${segment.participationPct}%` }}
        />
      </div>
      <span className="w-12 shrink-0 text-right text-sm font-medium tabular-nums text-foreground">
        {segment.participationPct}%
      </span>
      <span className="w-16 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
        {segment.responded}/{segment.invited}
      </span>
    </div>
  );
}
