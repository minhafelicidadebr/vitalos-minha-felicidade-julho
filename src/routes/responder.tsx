import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/app/shell/AppShell";
import {
  surveyProgress,
  type LikertValue,
  type SurveyResponses,
} from "@/engine/survey/survey-engine";
import { useWaveResponses } from "@/engine/survey/survey-store";
import { ACTIVE_WAVE_INPUT } from "@/mocks/campaign-mock";
import { PERMA_ITEMS, PERMA_RESPONSE_SCALE, SURVEY_INTRO } from "@/mocks/survey-mock";

export const Route = createFileRoute("/responder")({
  head: () => ({ meta: [{ title: "Responder · Onda Ativa — 4 Lentes VitalOS™" }] }),
  component: ResponderPage,
});

const LIKERT: LikertValue[] = [1, 2, 3, 4, 5];

function ResponderPage() {
  const wave = ACTIVE_WAVE_INPUT;
  const { hasResponded, markResponded } = useWaveResponses();
  const already = hasResponded(wave.id);

  const [responses, setResponses] = useState<SurveyResponses>({});
  const [submitted, setSubmitted] = useState(false);
  const progress = surveyProgress(PERMA_ITEMS, responses);

  function answer(id: string, value: LikertValue) {
    setResponses((prev) => ({ ...prev, [id]: value }));
  }
  function submit() {
    markResponded(wave.id);
    setSubmitted(true);
  }

  if (already || submitted) {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
            <span
              className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-2xl text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
              aria-hidden
            >
              ✓
            </span>
            <h1 className="mt-4 font-serif text-3xl text-foreground">{SURVEY_INTRO.thanksTitle}</h1>
            <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-muted-foreground">
              {SURVEY_INTRO.thanksBody}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                to="/onda"
                className="rounded-xl bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
              >
                Voltar à Onda
              </Link>
              <Link
                to="/devolutiva"
                className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Ver a devolutiva
              </Link>
            </div>
          </motion.div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6">
        <motion.header initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {SURVEY_INTRO.eyebrow}
          </p>
          <h1 className="mt-1 font-serif text-3xl text-foreground">{wave.instrumentLabel}</h1>
          <p className="mt-2 text-base leading-relaxed text-muted-foreground">
            {SURVEY_INTRO.lead}
          </p>
        </motion.header>

        {/* Progresso (sticky) */}
        <div className="sticky top-16 z-10 rounded-xl border border-border/60 bg-card/90 px-4 py-3 backdrop-blur">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {progress.answered}/{progress.total} respondidas
            </span>
            <span>{progress.pct}%</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress.pct}%` }}
            />
          </div>
        </div>

        {/* Itens */}
        <ol className="space-y-3">
          {PERMA_ITEMS.map((item, i) => {
            const value = responses[item.id];
            return (
              <li
                key={item.id}
                className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm"
              >
                <p className="text-base text-card-foreground">
                  <span className="mr-1.5 text-xs text-muted-foreground">{i + 1}.</span>
                  {item.text}
                </p>
                <div
                  className="mt-3 grid grid-cols-5 gap-1.5"
                  role="radiogroup"
                  aria-label={item.text}
                >
                  {LIKERT.map((v) => {
                    const active = value === v;
                    return (
                      <button
                        key={v}
                        role="radio"
                        aria-checked={active}
                        aria-label={PERMA_RESPONSE_SCALE[v - 1]}
                        onClick={() => answer(item.id, v)}
                        className={`rounded-lg border py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border/60 text-muted-foreground hover:bg-muted/50"
                        }`}
                      >
                        {v}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                  <span>{PERMA_RESPONSE_SCALE[0]}</span>
                  <span>{PERMA_RESPONSE_SCALE[4]}</span>
                </div>
              </li>
            );
          })}
        </ol>

        {/* Envio */}
        <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
          <button
            disabled={!progress.isComplete}
            onClick={submit}
            className="w-full rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {progress.isComplete
              ? "Enviar respostas"
              : `Responda todas (${progress.answered}/${progress.total})`}
          </button>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            {SURVEY_INTRO.disclaimer}
          </p>
        </div>
      </div>
    </AppShell>
  );
}
