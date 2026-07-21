// AdaptiveQuizCard — fluxo do quiz adaptativo por dificuldade pedagógica
// (LD-002, LDX-2 Fatia B). Um item por vez, feedback imediato (errar ensina),
// tentativa reversível, síntese pedagógica sem nota única.
//
// SESSION_ONLY: todo estado vive neste componente — nada é persistido, nada
// sobe para o empregador. O nível deriva SÓ do desempenho nesta sessão.

import { useEffect, useMemo, useState } from "react";
import {
  answerItem,
  selectNextItem,
  startAdaptiveQuiz,
  summarizeAdaptiveSession,
  undoLastAnswer,
  validateAdaptiveBank,
  type AdaptiveQuizBank,
  type AdaptiveQuizState,
  type AdaptiveSessionSummary,
  type QuizDifficulty,
} from "@/engine/learning/adaptive-quiz-engine";

const LEVEL_LABELS: Record<QuizDifficulty, string> = {
  fundamento: "Fundamento",
  aplicacao: "Aplicação",
  transferencia: "Transferência",
};

const LEVEL_HINTS: Record<QuizDifficulty, string> = {
  fundamento: "entender o mecanismo",
  aplicacao: "aplicar no dia a dia",
  transferencia: "levar para contextos novos",
};

interface AdaptiveQuizCardProps {
  bank: AdaptiveQuizBank;
  /** Resolve o rótulo da fonte (citação canônica) de um study_id. */
  resolveSourceLabel: (studyId: string) => string;
  onSummaryChange?: (summary: AdaptiveSessionSummary) => void;
}

export function AdaptiveQuizCard({ bank, resolveSourceLabel, onSummaryChange }: AdaptiveQuizCardProps) {
  const bankErrors = useMemo(() => validateAdaptiveBank(bank), [bank]);
  const [state, setState] = useState<AdaptiveQuizState>(() => startAdaptiveQuiz(bank));
  const [phase, setPhase] = useState<"answering" | "feedback">("answering");

  const summary = useMemo(() => summarizeAdaptiveSession(bank, state), [bank, state]);
  useEffect(() => {
    onSummaryChange?.(summary);
  }, [summary, onSummaryChange]);

  // Estado honesto quando o banco está estruturalmente inválido.
  if (bankErrors.length > 0) {
    return (
      <div className="rounded-2xl border border-border/70 bg-card p-4" role="note">
        <p className="text-sm text-muted-foreground">
          Quiz indisponível no momento — o banco de perguntas não passou na validação estrutural.
        </p>
      </div>
    );
  }

  const lastRecord = state.history[state.history.length - 1] ?? null;
  const lastItem = lastRecord ? bank.items.find((i) => i.id === lastRecord.itemId) ?? null : null;
  const nextItem = selectNextItem(bank, state);
  const complete = nextItem === null && phase === "answering";

  function handleAnswer(itemId: string, optionId: string) {
    const outcome = answerItem(bank, state, itemId, optionId);
    if (!outcome) return;
    setState(outcome.state);
    setPhase("feedback");
  }

  function handleUndo() {
    setState(undoLastAnswer(state));
    setPhase("answering");
  }

  function handleContinue() {
    setPhase("answering");
  }

  function handleRestart() {
    setState(startAdaptiveQuiz(bank));
    setPhase("answering");
  }

  // ─── Síntese pedagógica (sessão completa) ─────────────────────────────────
  if (complete) {
    const reviewItems = summary.reviewItemIds
      .map((id) => bank.items.find((i) => i.id === id))
      .filter((i): i is NonNullable<typeof i> => Boolean(i));
    return (
      <div className="space-y-4" aria-live="polite">
        <div className="rounded-2xl border border-border/70 bg-card p-4">
          <p className="text-sm font-medium text-card-foreground">
            Trilha de perguntas concluída — o que importa é o que fica para revisar.
          </p>
          <ul className="mt-3 space-y-1">
            {summary.perLevel
              .filter((l) => l.totalInBank > 0)
              .map((l) => (
                <li key={l.level} className="text-sm text-muted-foreground">
                  {LEVEL_LABELS[l.level]} ({LEVEL_HINTS[l.level]}): {l.correct} de {l.answered}{" "}
                  {l.answered === 1 ? "respondida" : "respondidas"}
                </li>
              ))}
          </ul>
          {reviewItems.length > 0 ? (
            <div className="mt-4 rounded-r-lg border-l-4 border-amber-400 bg-amber-50/60 px-3 py-2 dark:bg-amber-950/20">
              <p className="text-xs font-semibold text-card-foreground">Para revisar com calma:</p>
              <ul className="mt-1 space-y-2">
                {reviewItems.map((item) => (
                  <li key={item.id} className="text-xs leading-relaxed text-card-foreground">
                    <span className="font-medium">{item.question}</span> {item.explanation}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">
              Nenhum item para revisar — os três níveis foram atravessados sem tropeço.
            </p>
          )}
          <p className="mt-3 text-[11px] text-muted-foreground">
            Este resultado é seu, da sessão atual — não é gravado nem vira indicador para a
            organização.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRestart}
          className="min-h-11 rounded-xl border border-border/70 bg-background px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          Refazer do início
        </button>
      </div>
    );
  }

  // ─── Feedback da última resposta ──────────────────────────────────────────
  if (phase === "feedback" && lastRecord && lastItem) {
    const correct = lastRecord.correct;
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-border/70 bg-card p-4">
          <p className="text-sm font-medium text-card-foreground">{lastItem.question}</p>
          <div className="mt-3 flex flex-col gap-2">
            {lastItem.options.map((option) => {
              const selected = lastRecord.optionId === option.id;
              const isCorrectOption = option.id === lastItem.correctOptionId;
              return (
                <div
                  key={option.id}
                  className={`min-h-11 rounded-xl border px-3 py-2 text-left text-sm ${
                    isCorrectOption
                      ? "border-primary/50 bg-primary/10 text-foreground"
                      : selected
                        ? "border-amber-400/60 bg-amber-50/60 text-foreground dark:bg-amber-950/20"
                        : "border-border/70 bg-background text-muted-foreground"
                  }`}
                >
                  {option.label}
                  {selected && <span className="ml-2 text-[11px] text-muted-foreground">(sua resposta)</span>}
                </div>
              );
            })}
          </div>
          <div
            className={`mt-3 rounded-r-lg border-l-4 px-3 py-2 ${
              correct
                ? "border-primary bg-primary/5"
                : "border-amber-400 bg-amber-50/60 dark:bg-amber-950/20"
            }`}
            role="note"
            aria-live="polite"
          >
            <p className="text-xs leading-relaxed text-card-foreground">
              <span className="font-semibold">{correct ? "Isso. " : "Ainda não. "}</span>
              {lastItem.explanation}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Fonte: {resolveSourceLabel(lastItem.sourceStudyId)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleContinue}
            className="min-h-11 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            Continuar
          </button>
          <button
            type="button"
            onClick={handleUndo}
            className="min-h-11 rounded-xl border border-border/70 bg-background px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            Desfazer resposta
          </button>
          <span className="text-xs text-muted-foreground">
            Desfazer não conta como erro — tentativa é reversível.
          </span>
        </div>
      </div>
    );
  }

  // ─── Pergunta vigente ─────────────────────────────────────────────────────
  if (!nextItem) return null; // defensivo — coberto por `complete` acima

  const answeredCount = summary.answeredCount;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded-full border border-border/70 bg-background px-2.5 py-1 font-medium text-foreground">
          Nível: {LEVEL_LABELS[nextItem.difficulty]}
        </span>
        <span>
          {LEVEL_HINTS[nextItem.difficulty]} · pergunta {answeredCount + 1} de {summary.totalInBank}
        </span>
      </div>
      <div className="rounded-2xl border border-border/70 bg-card p-4">
        <p className="text-sm font-medium text-card-foreground">{nextItem.question}</p>
        <div className="mt-3 flex flex-col gap-2">
          {nextItem.options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => handleAnswer(nextItem.id, option.id)}
              className="min-h-11 rounded-xl border border-border/70 bg-background px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        A dificuldade se ajusta ao seu desempenho nesta sessão — nada além dela. Errar mostra a
        explicação na hora e recua um nível para consolidar.
      </p>
    </div>
  );
}
