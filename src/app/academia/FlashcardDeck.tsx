// Experiência de Revisão Espaçada — UI premium que COMPÕE o flashcard-session engine
// (que por sua vez compõe o SM-2). Toda a matemática vive no motor puro e testado; aqui
// só há apresentação, foco e acessibilidade. Mock-first: o conteúdo chega por props.

import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { motion } from "framer-motion";
import { RotateCcw, Sparkles, Target } from "lucide-react";
import { useA11y } from "@/app/shell/A11yProvider";
import {
  currentCard,
  gradeCurrent,
  sessionProgress,
  startSession,
  type SessionCard,
  type SessionState,
} from "@/engine/learning/flashcard-session";
import {
  summarizeDeck,
  type RecallQuality,
  type ScheduledCard,
} from "@/engine/learning/sm2-engine";
import type { Flashcard } from "@/mocks/flashcard-mock";

// As 4 avaliações (estilo Anki) mapeadas para a qualidade SM-2. "Errei" recoloca o
// cartão na fila desta sessão; as demais graduam, com intervalos progressivamente
// maiores. Tons via tokens/escala semântica — nunca julgam a pessoa, só a recordação.
const GRADES: { quality: RecallQuality; label: string; hint: string; key: string; cls: string }[] =
  [
    {
      quality: 1,
      label: "Errei",
      hint: "revejo já",
      key: "1",
      cls: "border-red-300/60 text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/30",
    },
    {
      quality: 3,
      label: "Difícil",
      hint: "+1 dia",
      key: "2",
      cls: "border-amber-300/60 text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950/30",
    },
    {
      quality: 4,
      label: "Bom",
      hint: "espaça",
      key: "3",
      cls: "border-primary/40 text-primary hover:bg-primary/5",
    },
    {
      quality: 5,
      label: "Fácil",
      hint: "espaça mais",
      key: "4",
      cls: "border-emerald-300/60 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/30",
    },
  ];

type Action =
  | { type: "grade"; quality: RecallQuality }
  | { type: "restart"; cards: SessionCard<Flashcard>[] };

function reducer(state: SessionState<Flashcard>, action: Action): SessionState<Flashcard> {
  switch (action.type) {
    case "grade":
      return gradeCurrent(state, action.quality);
    case "restart":
      return startSession(action.cards);
  }
}

export function FlashcardDeck({
  cards,
  priorityDriverIds,
}: {
  cards: SessionCard<Flashcard>[];
  /** Drivers marcados como prioritários pelo IVO — sinaliza o cartão com honestidade. */
  priorityDriverIds?: Set<string>;
}) {
  const { reduceMotion } = useA11y();
  const [state, dispatch] = useReducer(reducer, cards, startSession);
  const [flipped, setFlipped] = useState(false);

  const card = currentCard(state);
  const progress = sessionProgress(state);

  const grade = useCallback(
    (quality: RecallQuality) => {
      dispatch({ type: "grade", quality });
      setFlipped(false);
    },
    [dispatch],
  );

  const restart = useCallback(() => {
    dispatch({ type: "restart", cards });
    setFlipped(false);
  }, [cards]);

  // Garantia determinística: todo cartão novo começa pela frente. Cobre a corrida em
  // que o reset imediato no grade() não se aplica (ex.: troca de cartão diferente).
  useEffect(() => {
    setFlipped(false);
  }, [card?.id]);

  // Atalhos de teclado: Espaço/Enter vira a carta; 1–4 avalia (só com a carta virada).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!card) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;

      if ((e.key === " " || e.key === "Enter") && !flipped) {
        e.preventDefault();
        setFlipped(true);
        return;
      }
      if (flipped) {
        const match = GRADES.find((g) => g.key === e.key);
        if (match) {
          e.preventDefault();
          grade(match.quality);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [card, flipped, grade]);

  // ── Estado final: sessão concluída ──────────────────────────────────────────
  if (!card) {
    return <SessionSummary state={state} onRestart={restart} />;
  }

  const flipDuration = reduceMotion ? 0 : 0.5;
  const isPriority = priorityDriverIds?.has(card.card.driverId) ?? false;

  return (
    <div className="space-y-5">
      {/* Progresso */}
      <div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Cartão {progress.done + 1} de {progress.total}
          </span>
          <span className="tabular-nums">{progress.pct}%</span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={false}
            animate={{ width: `${progress.pct}%` }}
            transition={{ duration: reduceMotion ? 0 : 0.4 }}
          />
        </div>
      </div>

      {/* Carta com flip 3D acessível (fallback instantâneo em redução de movimento) */}
      <div style={{ perspective: 1200 }}>
        <motion.button
          type="button"
          onClick={() => setFlipped((f) => !f)}
          aria-label={flipped ? "Cartão virado — mostrando a resposta" : "Mostrar a resposta"}
          className="relative w-full cursor-pointer rounded-3xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          style={{ transformStyle: "preserve-3d", minHeight: 320 }}
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: flipDuration, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Frente — a pergunta */}
          <CardFace hidden={flipped} className="border-border/70 bg-card">
            <ChipRow label={card.card.driverLabel} priority={isPriority} />
            <p className="mt-5 font-serif text-2xl leading-snug text-foreground sm:text-3xl">
              {card.card.front}
            </p>
            <p className="mt-auto pt-6 text-xs text-muted-foreground">
              Pense na resposta, depois toque para virar{" "}
              <kbd className="rounded bg-muted px-1.5 py-0.5 font-sans text-[10px]">espaço</kbd>
            </p>
          </CardFace>

          {/* Verso — a resposta + fonte */}
          <CardFace
            hidden={!flipped}
            flipped
            className="border-primary/30 bg-primary/[0.03] dark:bg-primary/[0.06]"
          >
            <ChipRow label={card.card.driverLabel} priority={isPriority} />
            <p className="mt-4 text-base leading-relaxed text-foreground sm:text-lg">
              {card.card.back}
            </p>
            <p className="mt-auto pt-5 text-xs italic text-muted-foreground">
              Fonte: {card.card.citation}
            </p>
          </CardFace>
        </motion.button>
      </div>

      {/* Avaliação — só ativa com a carta virada (honestidade: você avalia a própria recordação) */}
      <div aria-live="polite">
        {flipped ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {GRADES.map((g) => (
              <button
                key={g.quality}
                type="button"
                onClick={() => grade(g.quality)}
                className={`flex min-h-14 flex-col items-center justify-center rounded-2xl border bg-card px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${g.cls}`}
              >
                <span className="flex items-center gap-1.5">
                  <kbd className="rounded bg-muted px-1 text-[10px] text-muted-foreground">
                    {g.key}
                  </kbd>
                  {g.label}
                </span>
                <span className="text-[11px] font-normal text-muted-foreground">{g.hint}</span>
              </button>
            ))}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setFlipped(true)}
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Mostrar resposta
          </button>
        )}
      </div>

      <p className="text-center text-xs leading-relaxed text-muted-foreground">
        Sua autoavaliação agenda quando o cartão volta — nunca vira nota, ranking ou avaliação de
        desempenho. Nesta demonstração, o progresso fica só nesta sessão.
      </p>
    </div>
  );
}

function CardFace({
  children,
  hidden,
  flipped = false,
  className,
}: {
  children: React.ReactNode;
  hidden: boolean;
  flipped?: boolean;
  className?: string;
}) {
  return (
    <div
      aria-hidden={hidden}
      className={`flex flex-col rounded-3xl border p-6 shadow-sm sm:p-8 ${className ?? ""} ${
        flipped ? "absolute inset-0" : ""
      }`}
      style={{
        minHeight: 320,
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        transform: flipped ? "rotateY(180deg)" : undefined,
      }}
    >
      {children}
    </div>
  );
}

function ChipRow({ label, priority }: { label: string; priority: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
        <Sparkles className="h-3 w-3 text-primary" aria-hidden />
        {label}
      </span>
      {priority && (
        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
          <Target className="h-3 w-3" aria-hidden />
          Prioridade do seu índice
        </span>
      )}
    </div>
  );
}

function SessionSummary({
  state,
  onRestart,
}: {
  state: SessionState<Flashcard>;
  onRestart: () => void;
}) {
  // Resumo honesto via o motor SM-2: conta estados de agendamento, não "quanto sabe".
  const summary = useMemo(() => {
    const today = new Date();
    const scheduled: ScheduledCard<Flashcard>[] = state.reviewed.map((c) => ({
      card: c.card,
      schedule: c.schedule,
      dueDate: today,
    }));
    return summarizeDeck(scheduled, today);
  }, [state.reviewed]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-3xl border border-border/70 bg-card p-8 text-center shadow-sm"
    >
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Sparkles className="h-6 w-6" aria-hidden />
      </span>
      <h2 className="mt-4 font-serif text-2xl text-foreground">Revisão concluída</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        Você revisou {summary.total} {summary.total === 1 ? "cartão" : "cartões"}
        {state.lapseCount > 0 && (
          <>
            {" "}
            com {state.lapseCount} {state.lapseCount === 1 ? "recaída" : "recaídas"} — voltar a um
            cartão é parte de aprender, não falha
          </>
        )}
        . O agendador definiu quando cada um volta.
      </p>

      <dl className="mx-auto mt-6 grid max-w-md grid-cols-3 gap-3">
        <SummaryStat label="Revisões" value={state.reviewCount} />
        <SummaryStat label="Consolidando" value={summary.young + summary.mature} />
        <SummaryStat label="Facilidade média" value={summary.averageEasiness.toFixed(2)} />
      </dl>

      <button
        type="button"
        onClick={onRestart}
        className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <RotateCcw className="h-4 w-4" aria-hidden />
        Revisar de novo
      </button>
    </motion.div>
  );
}

function SummaryStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-muted/30 p-3">
      <dd className="font-serif text-2xl text-foreground tabular-nums">{value}</dd>
      <dt className="mt-0.5 text-[11px] text-muted-foreground">{label}</dt>
    </div>
  );
}
