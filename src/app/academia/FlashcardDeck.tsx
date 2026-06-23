// Experiência de Revisão Espaçada — UI premium que COMPÕE o flashcard-session engine
// (que por sua vez compõe o SM-2). Toda a matemática vive no motor puro e testado; aqui
// só há apresentação, foco e acessibilidade. Mock-first: o conteúdo chega por props.

import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { motion } from "framer-motion";
import { CalendarClock, RotateCcw, Sparkles, Target } from "lucide-react";
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
  reviewCard,
  summarizeDeck,
  type CardSchedule,
  type RecallQuality,
  type ScheduledCard,
} from "@/engine/learning/sm2-engine";
import type { Flashcard } from "@/mocks/flashcard-mock";

// As 4 avaliações (estilo Anki) mapeadas para a qualidade SM-2. "Errei" recoloca o
// cartão na fila desta sessão; as demais graduam, com intervalos progressivamente
// maiores. Tons via tokens/escala semântica — nunca julgam a pessoa, só a recordação.
// As 4 avaliações (estilo Anki) mapeadas para a qualidade SM-2. O sublabel descreve a
// AUTOAVALIAÇÃO da recordação (não a pessoa). "Errei" recoloca o cartão na fila desta
// sessão; as demais graduam. Tons via escala semântica — nunca julgam desempenho.
const GRADES: { quality: RecallQuality; label: string; feel: string; key: string; cls: string }[] =
  [
    {
      quality: 1,
      label: "Errei",
      feel: "não lembrei",
      key: "1",
      cls: "border-red-300/60 text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/30",
    },
    {
      quality: 3,
      label: "Difícil",
      feel: "com esforço",
      key: "2",
      cls: "border-amber-300/60 text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950/30",
    },
    {
      quality: 4,
      label: "Bom",
      feel: "lembrei",
      key: "3",
      cls: "border-primary/40 text-primary hover:bg-primary/5",
    },
    {
      quality: 5,
      label: "Fácil",
      feel: "foi fácil",
      key: "4",
      cls: "border-emerald-300/60 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/30",
    },
  ];

// Preview HONESTO do agendador, computado pelo próprio motor SM-2 (sem duplicar a regra).
// Verdade do SM-2: o PRÓXIMO intervalo de um acerto depende só de ter acertado (e da
// maturidade do cartão), não de quão bem — a nota ajusta o fator de facilidade, que molda as
// revisões SEGUINTES. Por isso o intervalo é mostrado UMA vez (representado por "Bom"=4), não
// por botão. Torna a repetição espaçada visível sem mentir sobre o algoritmo.
function passInterval(schedule: CardSchedule): string {
  const days = reviewCard(schedule, 4).intervalDays;
  if (days <= 1) return "amanhã";
  return `${days} dias`;
}

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
  const remaining = progress.total - progress.done;

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

      {/* Carta com flip 3D acessível (fallback instantâneo em redução de movimento).
          Atrás dela, camadas-fantasma dão profundidade tátil ao baralho (quantas faltam). */}
      <div className="relative" style={{ perspective: 1200 }}>
        {remaining > 2 && <DeckLayer offset={2} />}
        {remaining > 1 && <DeckLayer offset={1} />}
        <motion.div
          key={card.id}
          className="relative z-[1]"
          initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: reduceMotion ? 0 : 0.32, ease: [0.22, 1, 0.36, 1] }}
        >
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
            <CardFace hidden={flipped} className="border-border/70 bg-gradient-to-br from-card to-muted/30">
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
              className="border-primary/30 bg-gradient-to-br from-primary/[0.06] to-accent/[0.04] dark:from-primary/[0.1]"
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
        </motion.div>
      </div>

      {/* Avaliação — só ativa com a carta virada (honestidade: você avalia a própria recordação) */}
      <div aria-live="polite">
        {flipped ? (
          <div className="space-y-2.5">
            <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
              <CalendarClock className="h-3.5 w-3.5 text-primary" aria-hidden />
              Se você recordou, volta{" "}
              <span className="font-medium text-foreground">{passInterval(card.schedule)}</span>. Quão
              bem lembrou ajusta o ritmo das próximas.
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {GRADES.map((g) => (
                <button
                  key={g.quality}
                  type="button"
                  onClick={() => grade(g.quality)}
                  className={`flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-2xl border bg-card px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${g.cls}`}
                >
                  <span className="flex items-center gap-1.5">
                    <kbd className="rounded bg-muted px-1 text-[10px] text-muted-foreground">
                      {g.key}
                    </kbd>
                    {g.label}
                  </span>
                  <span className="text-[11px] font-normal text-muted-foreground">{g.feel}</span>
                </button>
              ))}
            </div>
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

// Camada-fantasma atrás da carta atual: comunica "ainda há cartões" com profundidade.
// Puramente decorativa (aria-hidden); recua e encolhe conforme a posição na pilha.
function DeckLayer({ offset }: { offset: number }) {
  return (
    <div
      aria-hidden
      className="absolute inset-x-0 top-0 rounded-3xl border border-border/50 bg-card/60 shadow-sm"
      style={{
        height: 320,
        zIndex: 0,
        transform: `translateY(${offset * 9}px) scale(${1 - offset * 0.035})`,
        transformOrigin: "center top",
      }}
    />
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

      <ForgettingCurve />

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

// Por que espaçar funciona — a curva do esquecimento (Ebbinghaus) com e sem revisão.
// Narrativa da ciência do aprendizado: cada revisão no momento certo "reergue" a memória e
// achata o esquecimento. SVG leve, theme-aware (tokens), com descrição acessível.
function ForgettingCurve() {
  return (
    <figure className="mx-auto mt-8 max-w-md">
      <svg
        viewBox="0 0 240 96"
        className="w-full"
        role="img"
        aria-label="Gráfico comparando a retenção da memória: sem revisão ela despenca; com repetição espaçada, cada revisão reergue a memória e o esquecimento fica mais lento."
      >
        <line x1="14" y1="6" x2="14" y2="78" className="stroke-border" strokeWidth="1" />
        <line x1="14" y1="78" x2="232" y2="78" className="stroke-border" strokeWidth="1" />
        {/* Sem revisão: decaimento acentuado */}
        <path
          d="M14,14 C40,52 70,68 232,74"
          className="stroke-muted-foreground/50"
          strokeWidth="2"
          fill="none"
          strokeDasharray="4 4"
        />
        {/* Com repetição espaçada: dente-de-serra que se mantém alto */}
        <path
          d="M14,14 C28,28 36,34 52,36 L52,15 C74,24 92,27 116,29 L116,14 C150,19 188,20 232,21"
          className="stroke-primary"
          strokeWidth="2.5"
          fill="none"
          strokeLinejoin="round"
        />
        {[52, 116].map((x) => (
          <circle key={x} cx={x} cy={x === 52 ? 15 : 14} r="3" className="fill-primary" />
        ))}
      </svg>
      <figcaption className="mt-2 flex items-center justify-center gap-4 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-primary" aria-hidden /> com repetição espaçada
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-0.5 w-4 bg-muted-foreground/50"
            style={{ borderTop: "2px dashed" }}
            aria-hidden
          />{" "}
          sem revisão
        </span>
      </figcaption>
    </figure>
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
