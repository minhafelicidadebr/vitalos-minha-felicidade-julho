// Rota pública: /responder/:token — link anônimo enviado ao colaborador.
// NÃO requer login. O token é o único elo de autenticação do respondente.
// Após submit: tela de confirmação (sem dados pessoais, sem score individual).

import { createFileRoute } from "@tanstack/react-router";
import { useState, useId } from "react";
import { motion } from "framer-motion";
import { CheckCircle, ShieldCheck, Users } from "lucide-react";
import { getWaveSurvey } from "@/mocks/survey-mock";
import {
  surveyProgress,
  isAllowedSurveyValue,
  type SurveyDefinition,
  type SurveyItem,
  type SurveyResponses,
  type SurveyValue,
  type SurveyScale,
} from "@/engine/survey/survey-engine";
import { submitSurveyResponses } from "@/lib/api/survey.functions";

export const Route = createFileRoute("/responder/$token")({
  head: () => ({ meta: [{ title: "Responder Pesquisa — 4 Lentes VitalOS™" }] }),
  component: ResponderTokenPage,
});

// COPSOQ é o instrumento do piloto NR-1
const PILOT_PACK_ID = "enterprise";
const PILOT_INSTRUMENT = "COPSOQ";

function ResponderTokenPage() {
  const { token } = Route.useParams();
  const survey = getWaveSurvey(PILOT_PACK_ID, PILOT_INSTRUMENT);

  if (!survey) {
    return <TokenErrorScreen message="Esta pesquisa não está disponível no momento." />;
  }

  return <SurveyFlow survey={survey} token={token} />;
}

// ─── Fluxo do formulário ──────────────────────────────────────────────────────

function SurveyFlow({ survey, token }: { survey: SurveyDefinition; token: string }) {
  const [responses, setResponses] = useState<SurveyResponses>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const progress = surveyProgress(survey.items, responses);
  const allAnswered = progress.answered === progress.total;

  async function handleSubmit() {
    if (!allAnswered || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const answers = Object.entries(responses).map(([itemId, value]) => ({
        itemId,
        value: value as number,
      }));

      const result = await submitSurveyResponses({
        data: {
          submissionId: crypto.randomUUID(),
          packId: PILOT_PACK_ID,
          waveId: `wave-token-${token.slice(0, 8)}`,
          surveyId: survey.id,
          answers,
        },
      });

      if (result?.accepted) {
        setSubmitted(true);
      } else {
        setError("Não foi possível registrar sua resposta. Tente novamente.");
      }
    } catch {
      setError("Erro de conexão. Verifique sua internet e tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return <ConfirmationScreen />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header institucional sem nav (rota pública) */}
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3 sm:px-6">
          <p className="font-serif text-sm font-semibold text-foreground">4 Lentes VitalOS™</p>
          <ProgressPill answered={progress.answered} total={progress.total} />
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-8 px-4 py-8 sm:px-6">
        {/* Apresentação usando campos reais do SurveyDefinition */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {survey.instrumentShort} · Confidencial
          </p>
          <h1 className="mt-1 font-serif text-2xl text-foreground">
            {survey.intro.eyebrow}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {survey.intro.lead}
          </p>
          {survey.intro.disclaimer && (
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground/70 italic">
              {survey.intro.disclaimer}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-3">
            {[
              { icon: ShieldCheck, label: "Respostas anônimas" },
              { icon: Users, label: "Resultados só com 5+ participantes" },
            ].map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 py-1 text-xs text-muted-foreground"
              >
                <Icon className="h-3 w-3 text-primary" />
                {label}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Itens */}
        <div className="space-y-6">
          {survey.items.map((item, idx) => (
            <SurveyItemCard
              key={item.id}
              item={item}
              index={idx}
              scale={survey.scale}
              value={responses[item.id] as SurveyValue | undefined}
              onChange={(v) => setResponses((prev) => ({ ...prev, [item.id]: v }))}
            />
          ))}
        </div>

        {/* Erro */}
        {error && (
          <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}

        {/* Submit */}
        <div className="pb-12">
          <button
            onClick={handleSubmit}
            disabled={!allAnswered || submitting}
            className="w-full rounded-2xl bg-primary px-6 py-4 font-serif text-base font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? "Enviando…" : "Enviar respostas"}
          </button>
          <p className="mt-3 text-center text-xs leading-relaxed text-muted-foreground">
            Suas respostas individuais nunca serão exibidas.
            Os resultados aparecem como médias do grupo (mínimo 5 participantes).
          </p>
        </div>
      </main>
    </div>
  );
}

// ─── Item de escala Likert ────────────────────────────────────────────────────

function SurveyItemCard({
  item,
  index,
  scale,
  value,
  onChange,
}: {
  item: SurveyItem;
  index: number;
  scale: SurveyScale;
  value: SurveyValue | undefined;
  onChange: (v: SurveyValue) => void;
}) {
  const groupId = useId();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      className={`rounded-2xl border p-5 transition-all duration-200 ${
        value !== undefined
          ? "border-primary/30 bg-primary/5"
          : "border-border/70 bg-card"
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {index + 1} / {item.pillarId}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-foreground">{item.text}</p>

      <fieldset className="mt-4" aria-label={item.text}>
        <div className="flex flex-wrap gap-2">
          {scale.options.map((opt) => {
            const checked = value === opt.value;
            return (
              <label
                key={opt.value}
                className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border px-3 py-2 text-center transition-all duration-150 ${
                  checked
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border/60 bg-background hover:border-primary/40 hover:bg-primary/5"
                }`}
              >
                <input
                  type="radio"
                  name={groupId}
                  value={opt.value}
                  checked={checked}
                  onChange={() =>
                    isAllowedSurveyValue(scale, opt.value) && onChange(opt.value as SurveyValue)
                  }
                  className="sr-only"
                  aria-label={opt.label}
                />
                <span className="text-xs font-semibold">{opt.value}</span>
                <span
                  className={`text-[10px] leading-tight ${
                    checked ? "text-primary-foreground/80" : "text-muted-foreground"
                  }`}
                >
                  {opt.label}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
    </motion.div>
  );
}

// ─── Barra de progresso ───────────────────────────────────────────────────────

function ProgressPill({ answered, total }: { answered: number; total: number }) {
  const pct = total > 0 ? Math.round((answered / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">
        {answered}/{total}
      </span>
    </div>
  );
}

// ─── Tela de confirmação ──────────────────────────────────────────────────────

function ConfirmationScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45 }}
        className="w-full max-w-md rounded-3xl border border-primary/20 bg-card p-10 text-center shadow-sm"
      >
        <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-full bg-primary/10">
          <CheckCircle className="h-8 w-8 text-primary" />
        </div>
        <h1 className="font-serif text-2xl text-foreground">Obrigado pela contribuição</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Sua resposta foi registrada com segurança.
          Os resultados só aparecem quando{" "}
          <span className="font-medium text-foreground">5 ou mais pessoas</span>{" "}
          responderem — protegendo a identidade de todos.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <p className="text-xs text-muted-foreground">
            Resposta anônima · Não há como identificar você
          </p>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Tela de erro de token ────────────────────────────────────────────────────

function TokenErrorScreen({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-3xl border border-dashed border-border/70 bg-card p-10 text-center">
        <p className="font-serif text-xl text-foreground">Link indisponível</p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
