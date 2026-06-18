import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePack } from "@/engine/pack";
import { calculateIVO } from "@/engine/index/ivo-engine";
import { getPulseConfig, getResponseLabels, selectPulseItems } from "@/engine/index/pulse-engine";
import { ivoCurrentCycle } from "@/mocks/ivo-mock";

export const Route = createFileRoute("/quiosque")({
  head: () => ({ meta: [{ title: "Quiosque — 4 Lentes VitalOS™" }] }),
  component: QuiosquePage,
});

// Kiosk mode: ephemeral session, no AppShell, no persona, big touch
// targets (>=44px), plain language for 50+ operational workers.
// Nothing persists — reload wipes everything.

type Stage = "welcome" | "answering" | "done";

function QuiosquePage() {
  const { index } = usePack();
  const [stage, setStage] = useState<Stage>("welcome");
  const [current, setCurrent] = useState(0);

  const { items, labels } = useMemo(() => {
    if (!index) return { items: [], labels: [] as string[] };
    const result = calculateIVO(ivoCurrentCycle, index);
    const scores = new Map(
      result.lenses.flatMap((l) => l.pillars.map((p) => [p.pillarId, p.score] as const)),
    );
    const config = getPulseConfig(index);
    return {
      items: selectPulseItems(index, scores, config.itemsPerPulse),
      labels: getResponseLabels(index),
    };
  }, [index]);

  // Auto-reset to welcome after done (next person in line)
  useEffect(() => {
    if (stage !== "done") return;
    const t = setTimeout(() => {
      setStage("welcome");
      setCurrent(0);
    }, 8000);
    return () => clearTimeout(t);
  }, [stage]);

  function answer() {
    if (current + 1 >= items.length) setStage("done");
    else setCurrent((c) => c + 1);
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      {/* Minimal kiosk header */}
      <header className="flex items-center justify-between border-b border-border/60 px-6 py-4">
        <div className="flex items-center gap-3">
          <span
            className="grid h-10 w-10 place-items-center rounded-md bg-primary font-serif text-xl text-primary-foreground"
            aria-hidden
          >
            4
          </span>
          <span className="font-serif text-lg">4 Lentes VitalOS™ · Quiosque</span>
        </div>
        <Link to="/" className="text-sm text-muted-foreground underline underline-offset-2">
          sair do modo quiosque
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-8">
        <AnimatePresence mode="wait">
          {stage === "welcome" && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="max-w-lg space-y-8 text-center"
            >
              <p className="text-6xl" aria-hidden>
                👋
              </p>
              <h1 className="font-serif text-4xl leading-tight">Oi! Sua opinião vale muito.</h1>
              <p className="text-lg leading-relaxed text-muted-foreground">
                São só {items.length || 3} perguntas. Ninguém fica sabendo o que você respondeu —
                nem o chefe, nem o RH. É rápido e ajuda a melhorar o trabalho de todo mundo.
              </p>
              <button
                onClick={() => setStage("answering")}
                className="min-h-[56px] w-full rounded-2xl bg-primary px-8 text-xl font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring"
              >
                Começar
              </button>
              <p className="text-sm text-muted-foreground">
                Não quer responder? Tudo bem, é sempre por livre escolha.
              </p>
            </motion.div>
          )}

          {stage === "answering" && items[current] && (
            <motion.div
              key={`q-${current}`}
              initial={{ opacity: 0, x: 32 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -32 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-xl space-y-8"
            >
              <p className="text-center text-base text-muted-foreground">
                Pergunta {current + 1} de {items.length}
              </p>
              <h2 className="text-center font-serif text-3xl leading-snug">
                {items[current].text}
              </h2>
              <div className="grid gap-3">
                {labels.map((label) => (
                  <button
                    key={label}
                    onClick={answer}
                    className="min-h-[56px] rounded-2xl border-2 border-border bg-card px-6 text-lg text-card-foreground transition-all hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring"
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-center text-sm text-muted-foreground">
                Resposta anônima — junta com a de mais de 5 colegas antes de aparecer para alguém.
              </p>
            </motion.div>
          )}

          {stage === "done" && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-lg space-y-6 text-center"
            >
              <motion.p
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.1 }}
                className="text-7xl"
                aria-hidden
              >
                🌻
              </motion.p>
              <h1 className="font-serif text-4xl">Valeu demais!</h1>
              <p className="text-lg leading-relaxed text-muted-foreground">
                Pronto, já foi. Pode chamar o próximo colega.
              </p>
              <p className="text-sm text-muted-foreground">
                Esta tela volta ao início em alguns segundos…
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="border-t border-border/60 px-6 py-3 text-center text-xs text-muted-foreground">
        Sessão efêmera — nada fica salvo neste aparelho.
      </footer>
    </div>
  );
}
