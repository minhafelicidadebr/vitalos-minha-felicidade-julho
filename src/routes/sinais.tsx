import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/app/shell/AppShell";
import { useIvo } from "@/mocks/hooks";
import {
  reconcileSignals,
  visibleSignals,
  type Quadrant,
  type ReconciledPair,
} from "@/engine/signals/signals-engine";
import { orgChannelAvailable } from "@/engine/trust/consent-engine";
import {
  SIGNALS,
  PERCEPTION_BEHAVIOR_INPUT,
  QUADRANT_COPY,
  SIGNALS_INTRO,
  SIGNALS_CONSENT_NOTE,
} from "@/mocks/signals-mock";
import { CONSENT_CHANNELS } from "@/mocks/consent-mock";

export const Route = createFileRoute("/sinais")({
  head: () => ({ meta: [{ title: "Sinais Vivos · Percepção × Comportamento — 4 Lentes VITA" }] }),
  component: SinaisPage,
});

const QUADRANT_ORDER: Quadrant[] = [
  "praticado_e_sentido",
  "discurso_sem_pratica",
  "pratica_nao_sentida",
  "lacuna_dupla",
];

function SinaisPage() {
  const { current } = useIvo();

  // Consentimento coletivo: Sinais Vivos só ligam com adesão suficiente da org.
  const signalsChannel = CONSENT_CHANNELS.find((c) => c.id === "signals")!;
  const available = orgChannelAvailable(signalsChannel);

  const data = useMemo(() => {
    // Percepção vem do IVO ao vivo (override sobre o mock); comportamento, dos sinais.
    const perceptionByPillar = new Map(
      (current?.lenses ?? []).flatMap((l) => l.pillars.map((p) => [p.pillarId, p.score] as const)),
    );
    const pairs = PERCEPTION_BEHAVIOR_INPUT.map((p) => ({
      pillarId: p.pillarId,
      pillarName: p.pillarName,
      perceptionScore: perceptionByPillar.get(p.pillarId) ?? p.perceptionScore,
      behaviorValue: p.behaviorValue,
    }));
    return reconcileSignals(pairs);
  }, [current]);

  const allSignals = SIGNALS;
  const shown = visibleSignals(SIGNALS);
  const hiddenCount = allSignals.length - shown.length;

  if (!available) {
    return (
      <AppShell>
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <Header />
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mt-6 rounded-2xl border border-border/70 bg-card p-8 text-center shadow-sm"
          >
            <span className="text-3xl" aria-hidden>
              🔒
            </span>
            <h2 className="mt-2 font-serif text-xl text-foreground">{SIGNALS_INTRO.lockedTitle}</h2>
            <p className="mx-auto mt-2 max-w-md text-base leading-relaxed text-muted-foreground">
              {SIGNALS_INTRO.lockedNote}
            </p>
            <Link
              to="/privacidade"
              className="mt-4 inline-block rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              ver os canais de consentimento →
            </Link>
          </motion.div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
        <Header />

        {/* Índice de alinhamento */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:col-span-1">
            <p className="text-xs text-muted-foreground">Alinhamento percepção × comportamento</p>
            <p className="mt-1 font-serif text-5xl text-foreground">{data.alignmentIndex}</p>
            <p className="text-xs text-muted-foreground">
              0 = dizem e fazem o oposto · 100 = idênticos
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card p-5 sm:col-span-2">
            <p className="text-xs text-muted-foreground">
              Onde percepção e comportamento mais divergem
            </p>
            {data.topDivergence ? (
              <>
                <p className="mt-1 font-medium text-card-foreground">
                  {data.topDivergence.pillarName}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {QUADRANT_COPY[data.topDivergence.quadrant]!.action}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  percepção {data.topDivergence.perceptionScore} · comportamento{" "}
                  {data.topDivergence.behaviorValue} · {data.divergentCount} divergência(s) no total
                </p>
              </>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">Sem divergências relevantes.</p>
            )}
          </div>
        </div>

        {/* Matriz de quadrantes */}
        <section>
          <h2 className="mb-3 font-serif text-xl text-foreground">A matriz da interseção</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {QUADRANT_ORDER.map((q) => (
              <QuadrantCard
                key={q}
                quadrant={q}
                pairs={data.pairs.filter((p) => p.quadrant === q)}
              />
            ))}
          </div>
        </section>

        {/* Sinais de comportamento (com k-anon) */}
        <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
          <h2 className="mb-3 font-serif text-lg text-foreground">Sinais de comportamento</h2>
          <div className="space-y-2.5">
            {shown.map((s) => (
              <div key={s.signalId} className="flex items-center gap-3">
                <span className="w-56 shrink-0 truncate text-sm text-card-foreground">
                  {s.label}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-foreground/30"
                    style={{ width: `${s.value}%` }}
                  />
                </div>
                <span className="w-20 shrink-0 text-right text-xs text-muted-foreground">
                  {s.value}
                  <span
                    className={
                      s.deltaVsPrev >= 0
                        ? "ml-1 text-emerald-600 dark:text-emerald-400"
                        : "ml-1 text-red-600 dark:text-red-400"
                    }
                  >
                    {s.deltaVsPrev >= 0 ? "+" : ""}
                    {s.deltaVsPrev}
                  </span>
                </span>
              </div>
            ))}
          </div>
          {hiddenCount > 0 && (
            <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
              {hiddenCount} sinal(is) oculto(s) por k-anonimato (n &lt; 5).
            </p>
          )}
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {SIGNALS_CONSENT_NOTE}
          </p>
        </section>

        {/* Honestidade */}
        <div
          className="rounded-r-xl border-l-4 border-amber-400 bg-amber-50/60 px-5 py-4 dark:bg-amber-950/20"
          role="note"
        >
          <p className="text-xs leading-relaxed text-amber-900 dark:text-amber-300">
            {SIGNALS_INTRO.disclaimer}
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          A percepção vem do{" "}
          <Link to="/ivo" className="underline underline-offset-2 hover:text-foreground">
            IVO
          </Link>
          , o comportamento dos Sinais Vivos consentidos em{" "}
          <Link to="/privacidade" className="underline underline-offset-2 hover:text-foreground">
            Privacidade
          </Link>
          , e a divergência vira proposta na{" "}
          <Link to="/copiloto" className="underline underline-offset-2 hover:text-foreground">
            FlorescerIA
          </Link>
          .
        </p>
      </div>
    </AppShell>
  );
}

function Header() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
    >
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
        {SIGNALS_INTRO.eyebrow}
      </p>
      <h1 className="mt-1 font-serif text-3xl text-foreground">{SIGNALS_INTRO.title}</h1>
      <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground">
        {SIGNALS_INTRO.lead}
      </p>
    </motion.div>
  );
}

function QuadrantCard({ quadrant, pairs }: { quadrant: Quadrant; pairs: ReconciledPair[] }) {
  const copy = QUADRANT_COPY[quadrant]!;
  return (
    <div className={`rounded-2xl border border-border/60 p-4 ${copy.bg}`}>
      <p className={`text-sm font-medium ${copy.color}`}>{copy.label}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{copy.action}</p>
      <div className="mt-2.5 space-y-1">
        {pairs.length === 0 ? (
          <p className="text-xs text-muted-foreground/70">— nenhum pilar aqui</p>
        ) : (
          pairs.map((p) => (
            <div key={p.pillarId} className="flex items-center justify-between gap-2">
              <span className="truncate text-xs text-card-foreground">{p.pillarName}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                P {p.perceptionScore} · C {p.behaviorValue}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
