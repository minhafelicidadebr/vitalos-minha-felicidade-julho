import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppShell } from "@/app/shell/AppShell";
import { usePack } from "@/engine/pack";
import { calculateIVO } from "@/engine/index/ivo-engine";
import { getPulseConfig, getResponseLabels, selectPulseItems } from "@/engine/index/pulse-engine";
import { ivoCurrentCycle } from "@/mocks/ivo-mock";

export const Route = createFileRoute("/pulse")({
  head: () => ({ meta: [{ title: "Pulse 60s — 4 Lentes VitalOS™" }] }),
  component: PulsePage,
});

type Stage = "intro" | "answering" | "done" | "declined";

function PulsePage() {
  const { index } = usePack();

  const { items, config, labels } = useMemo(() => {
    if (!index) return { items: [], config: null, labels: [] as string[] };
    const result = calculateIVO(ivoCurrentCycle, index);
    const scores = new Map(
      result.lenses.flatMap((l) => l.pillars.map((p) => [p.pillarId, p.score] as const)),
    );
    const config = getPulseConfig(index);
    return {
      items: selectPulseItems(index, scores, config.itemsPerPulse),
      config,
      labels: getResponseLabels(index),
    };
  }, [index]);

  const [stage, setStage] = useState<Stage>("intro");
  const [current, setCurrent] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(60);

  useEffect(() => {
    if (stage !== "answering") return;
    if (secondsLeft <= 0) {
      setStage("done"); // tempo esgotado também conclui — respostas parciais valem
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [stage, secondsLeft]);

  if (!index || !config) {
    return (
      <AppShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <p className="text-muted-foreground animate-pulse">Preparando pulse…</p>
        </div>
      </AppShell>
    );
  }

  function start() {
    setSecondsLeft(config!.durationSeconds);
    setCurrent(0);
    setStage("answering");
  }

  function answer() {
    // Resposta NUNCA é armazenada no cliente — em produção segue direto
    // para a edge function de agregação. Aqui, simplesmente avançamos.
    if (current + 1 >= items.length) {
      setStage("done");
    } else {
      setCurrent((c) => c + 1);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center px-4 py-10 sm:px-6">
        <AnimatePresence mode="wait">
          {stage === "intro" && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-6 text-center"
            >
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Pulse quinzenal
              </p>
              <h1 className="font-serif text-3xl text-foreground">
                {items.length} perguntas. {config.durationSeconds} segundos. Anônimo.
              </h1>
              <p className="mx-auto max-w-md text-base leading-relaxed text-muted-foreground">
                Suas respostas viram apenas médias agregadas — ninguém vê o que você respondeu, nem
                com quem. Participar vale +25 XP pela participação (nunca pelo conteúdo).
              </p>
              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={start}
                  className="rounded-lg bg-primary px-8 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Começar agora
                </button>
                {config.optOut && (
                  <button
                    onClick={() => setStage("declined")}
                    className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                  >
                    Agora não — sem problema
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {stage === "answering" && items[current] && (
            <motion.div
              key={`q-${current}`}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25 }}
              className="space-y-8"
            >
              {/* Progress + timer */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {current + 1} de {items.length}
                </span>
                <span
                  className={`tabular-nums font-medium ${secondsLeft <= 10 ? "text-amber-600" : ""}`}
                  aria-live="polite"
                >
                  ⏱ {secondsLeft}s
                </span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${((current + 1) / items.length) * 100}%` }}
                />
              </div>

              {/* Question */}
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-2.5 py-1 text-xs text-muted-foreground">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: items[current].lensColor }}
                    aria-hidden
                  />
                  {items[current].pillarName}
                </span>
                <p className="mt-4 font-serif text-2xl leading-snug text-foreground">
                  {items[current].text}
                </p>
              </div>

              {/* Likert buttons */}
              <div className="grid gap-2">
                {labels.map((label, i) => (
                  <button
                    key={label}
                    onClick={answer}
                    className="flex items-center justify-between rounded-xl border border-border/60 px-4 py-3 text-sm text-card-foreground transition-all hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {label}
                    <span className="text-xs text-muted-foreground">{i + 1}</span>
                  </button>
                ))}
              </div>

              <p className="text-center text-xs text-muted-foreground">
                Sua resposta individual nunca fica no aplicativo — só agregados com 5+ pessoas.
              </p>
            </motion.div>
          )}

          {stage === "done" && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6 text-center"
            >
              <motion.p
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.1 }}
                className="text-5xl"
                aria-hidden
              >
                🌱
              </motion.p>
              <h1 className="font-serif text-3xl text-foreground">Obrigado por participar</h1>
              <p className="mx-auto max-w-md text-base leading-relaxed text-muted-foreground">
                +25 XP pela participação. Suas respostas seguiram direto para a agregação anônima —
                nem o RH, nem sua liderança, nem nós vemos o que você marcou.
              </p>
              <div className="flex justify-center gap-3">
                <Link
                  to="/colaborador"
                  className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Voltar ao dashboard
                </Link>
                <Link
                  to="/confianca"
                  className="rounded-lg border border-input px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
                >
                  Ver Trust Ledger
                </Link>
              </div>
            </motion.div>
          )}

          {stage === "declined" && (
            <motion.div
              key="declined"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6 text-center"
            >
              <p className="text-4xl" aria-hidden>
                👍
              </p>
              <h1 className="font-serif text-2xl text-foreground">Tudo bem!</h1>
              <p className="mx-auto max-w-md text-base leading-relaxed text-muted-foreground">
                Participar é sempre voluntário — não participar nunca gera punição nem afeta nada
                para você. Voltamos a convidar no próximo ciclo.
              </p>
              <Link
                to="/colaborador"
                className="inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Voltar ao dashboard
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  );
}
