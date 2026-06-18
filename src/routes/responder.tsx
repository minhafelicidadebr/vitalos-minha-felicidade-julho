import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/app/shell/AppShell";
import { Slider } from "@/components/ui/slider";
import { usePack } from "@/engine/pack";
import {
  isAllowedSurveyValue,
  surveyProgress,
  type SurveyDefinition,
  type SurveyItem,
  type SurveyResponses,
  type SurveyValue,
} from "@/engine/survey/survey-engine";
import { useWaveResponses } from "@/engine/survey/survey-store";
import type { MeasurementWaveInput } from "@/engine/campaign/campaign-engine";
import { getActiveWave } from "@/mocks/campaign-mock";
import { getWaveSurvey } from "@/mocks/survey-mock";

export const Route = createFileRoute("/responder")({
  head: () => ({ meta: [{ title: "Responder · Onda Ativa — 4 Lentes VitalOS™" }] }),
  component: ResponderPage,
});

function ResponderPage() {
  const { packId } = usePack();
  const wave = getActiveWave(packId);
  const survey = getWaveSurvey(packId, wave.instrumentShort);

  if (!survey) {
    return (
      <AppShell>
        <div className="mx-auto flex min-h-[55vh] max-w-xl items-center px-4 py-12 sm:px-6">
          <div className="w-full rounded-3xl border border-dashed border-border/70 bg-card p-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Instrumento indisponível
            </p>
            <h1 className="mt-3 font-serif text-2xl text-foreground">
              Esta onda ainda não tem questionário demonstrativo.
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              A campanha continua visível, mas o VitalOS™ não fabrica perguntas nem escalas sem uma
              definição de instrumento válida.
            </p>
            <Link
              to="/onda"
              className="mt-6 inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
            >
              Voltar à Onda
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return <SurveyRuntime key={survey.id} wave={wave} survey={survey} />;
}

function SurveyRuntime({ wave, survey }: { wave: MeasurementWaveInput; survey: SurveyDefinition }) {
  const { hasResponded, markResponded } = useWaveResponses();
  const already = hasResponded(wave.id);
  const [responses, setResponses] = useState<SurveyResponses>({});
  const [submitted, setSubmitted] = useState(false);
  const progress = surveyProgress(survey.items, responses);

  function answer(id: string, value: SurveyValue) {
    if (!isAllowedSurveyValue(survey.scale, value)) return;
    setResponses((previous) => ({ ...previous, [id]: value }));
  }

  function submit() {
    if (!progress.isComplete) return;
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
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {wave.instrumentShort} · {wave.season}
            </p>
            <h1 className="mt-2 font-serif text-3xl text-foreground">{survey.intro.thanksTitle}</h1>
            <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-muted-foreground">
              {survey.intro.thanksBody}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                to="/onda"
                className="rounded-xl bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
              >
                Voltar à Onda
              </Link>
              <Link
                to={survey.completionRoute}
                className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                {survey.completionLabel}
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
            {survey.intro.eyebrow}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="font-serif text-3xl text-foreground">{wave.instrumentLabel}</h1>
            <span className="rounded-full border border-border/60 bg-card px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
              {survey.items.length} itens
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Estação {wave.season} · janela {wave.opensOn} a {wave.closesOn}
          </p>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            {survey.intro.lead}
          </p>
        </motion.header>

        <div className="sticky top-16 z-10 rounded-2xl border border-border/60 bg-card/92 px-4 py-3 shadow-sm backdrop-blur-xl">
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

        <ol className="space-y-3">
          {survey.items.map((item, index) => (
            <SurveyItemCard
              key={item.id}
              item={item}
              index={index}
              value={responses[item.id]}
              survey={survey}
              onAnswer={(value) => answer(item.id, value)}
            />
          ))}
        </ol>

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
          <div
            className="mt-4 rounded-r-xl border-l-4 border-amber-400 bg-amber-50/60 px-4 py-3 dark:bg-amber-950/20"
            role="note"
          >
            <p className="text-xs leading-relaxed text-amber-900 dark:text-amber-300">
              {survey.intro.disclaimer}
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function SurveyItemCard({
  item,
  index,
  value,
  survey,
  onAnswer,
}: {
  item: SurveyItem;
  index: number;
  value: SurveyValue | undefined;
  survey: SurveyDefinition;
  onAnswer: (value: SurveyValue) => void;
}) {
  return (
    <li className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 font-mono text-[11px] font-semibold text-primary">
          {index + 1}
        </span>
        <div className="min-w-0">
          {item.section && (
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {item.section}
            </p>
          )}
          <p className="mt-1 text-base leading-relaxed text-card-foreground">{item.text}</p>
        </div>
      </div>

      {survey.scale.presentation === "buttons" ? (
        <ButtonScale
          item={item}
          value={value}
          options={survey.scale.options}
          minLabel={survey.scale.minLabel}
          maxLabel={survey.scale.maxLabel}
          onAnswer={onAnswer}
        />
      ) : (
        <SliderScale
          item={item}
          value={value}
          options={survey.scale.options}
          minLabel={survey.scale.minLabel}
          maxLabel={survey.scale.maxLabel}
          onAnswer={onAnswer}
        />
      )}
    </li>
  );
}

function ButtonScale({
  item,
  value,
  options,
  minLabel,
  maxLabel,
  onAnswer,
}: {
  item: SurveyItem;
  value: SurveyValue | undefined;
  options: SurveyDefinition["scale"]["options"];
  minLabel: string;
  maxLabel: string;
  onAnswer: (value: SurveyValue) => void;
}) {
  return (
    <>
      <div
        className="mt-4 grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
        role="radiogroup"
        aria-label={item.text}
      >
        {options.map((option) => {
          const active = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={option.label}
              onClick={() => onAnswer(option.value)}
              className={`min-h-10 rounded-lg border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/60 text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {option.value}
            </button>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between gap-4 text-[10px] text-muted-foreground">
        <span>{minLabel}</span>
        <span className="text-right">{maxLabel}</span>
      </div>
    </>
  );
}

function SliderScale({
  item,
  value,
  options,
  minLabel,
  maxLabel,
  onAnswer,
}: {
  item: SurveyItem;
  value: SurveyValue | undefined;
  options: SurveyDefinition["scale"]["options"];
  minLabel: string;
  maxLabel: string;
  onAnswer: (value: SurveyValue) => void;
}) {
  const values = options.map((option) => option.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const step = values.length > 1 ? Math.abs(values[1]! - values[0]!) : 1;
  const midpoint = min + (max - min) / 2;

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] text-muted-foreground">{minLabel}</span>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold tabular-nums text-primary">
          {value ?? "—"}
        </span>
        <span className="text-right text-[10px] text-muted-foreground">{maxLabel}</span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value ?? midpoint]}
        onValueChange={([next]) => {
          if (next != null) onAnswer(next);
        }}
        aria-label={item.text}
        className="mt-4 w-full"
      />
      {value == null && (
        <p className="mt-2 text-center text-[10px] text-muted-foreground">
          Mova o controle para registrar sua resposta.
        </p>
      )}
    </div>
  );
}
