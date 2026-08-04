// Rota pública: /convite/:token — link anônimo enviado ao colaborador.
// NÃO requer login. O token é o único elo de autenticação do respondente.
// O wave_id real NUNCA é derivado no cliente — vem sempre da resolução
// server-side do token (checkInviteToken), que é a única fonte confiável.
// Após submit: tela de confirmação (sem dados pessoais, sem score individual).
//
// Nota de arquitetura: este caminho é deliberadamente "/convite" e não
// "/responder" — "/responder" já é uma rota de demo interna pack-aware
// (routes/responder.tsx) sem <Outlet/>, e aninhar um filho ali nunca renderiza.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useId, useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { CheckCircle, Sparkles, ShieldCheck, Smartphone, Users, Loader2 } from "lucide-react";
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
import {
  draftStorageKey,
  instrumentSignatureFor,
  buildDraftPayload,
  validateDraft,
  estimateRemainingLabel,
  type DraftPayload,
} from "@/engine/survey/survey-draft-engine";
import { buildReceiptJourney, type AggregationOutcome, type ReceiptJourney } from "@/engine/survey/receipt-journey-engine";
import { submitSurveyResponses } from "@/lib/api/survey.functions";
import { checkAndAggregateByToken } from "@/lib/api/capsule-aggregator.functions";
import { checkInviteToken } from "@/lib/api/invite-resolve.functions";
import type { InviteResolution } from "@/lib/api/invite-resolve.server";
import { CAPTURE_ERROR_COPY } from "@/lib/survey/capture-error-copy";
import { recordSurveyFunnelSnapshot, loadSurveyFunnelResult } from "@/lib/api/survey-telemetry.functions";
import {
  resolveHmlMode,
  HML_PRE_SUBMIT_REVIEW_TEXT,
  type HmlModeResolution,
} from "@/lib/fibt-hml/hml-frontend-guard";
import { HmlHomologationBanner } from "@/app/fibt-hml/HmlHomologationBanner";
import { HmlPersonaConfirmationGate } from "@/app/fibt-hml/HmlPersonaConfirmationGate";

/**
 * Resolve o modo de homologação (FIBT-HML-1B). `import.meta.env` já é
 * estático em build time (Vite) — seguro em SSR. O hostname só existe no
 * navegador; ausente em SSR, o que apenas significa que a checagem extra de
 * hostname produtivo fica pendente até a hidratação (resolveHmlMode() é
 * fail-closed: env sozinho já cobre o caso comum, hostname é defesa extra).
 */
function useHmlMode(): HmlModeResolution {
  const [hostname, setHostname] = useState<string | undefined>(undefined);
  useEffect(() => {
    setHostname(window.location.hostname);
  }, []);
  return resolveHmlMode(import.meta.env as unknown as Record<string, string | undefined>, hostname);
}

export const Route = createFileRoute("/convite/$token")({
  head: () => ({ meta: [{ title: "Responder Pesquisa — 4 Lentes VitalOS™" }] }),
  component: ResponderTokenPage,
});

const PILOT_PACK_ID = "enterprise";

const INVALID_TOKEN_MESSAGE: Record<string, string> = {
  invalid_token: "Este link não foi reconhecido. Verifique se copiou o endereço completo.",
  already_used: "Este link já foi utilizado. Cada convite só pode ser respondido uma vez.",
  wave_closed: "Esta pesquisa já foi encerrada e não aceita mais respostas.",
  cloud_adapter_missing: "A coleta de respostas está temporariamente indisponível. Tente novamente em instantes.",
};

function ResponderTokenPage() {
  const { token } = Route.useParams();
  const [resolution, setResolution] = useState<InviteResolution | "loading">("loading");
  const hmlMode = useHmlMode();
  const banner = hmlMode.active ? <HmlHomologationBanner batchId={hmlMode.batchId} /> : null;

  useEffect(() => {
    let active = true;
    checkInviteToken({ data: { token, packId: PILOT_PACK_ID } })
      .then((r) => active && setResolution(r))
      .catch(() => active && setResolution({ valid: false, reason: "invalid_token" }));
    return () => {
      active = false;
    };
  }, [token]);

  if (resolution === "loading") {
    return (
      <>
        {banner}
        <ResolvingScreen />
      </>
    );
  }

  if (!resolution.valid) {
    return (
      <>
        {banner}
        <TokenErrorScreen
          message={INVALID_TOKEN_MESSAGE[resolution.reason] ?? "Esta pesquisa não está disponível no momento."}
        />
      </>
    );
  }

  const survey = getWaveSurvey(PILOT_PACK_ID, resolution.instrument);
  if (!survey) {
    return (
      <>
        {banner}
        <TokenErrorScreen message="Esta pesquisa não está disponível no momento." />
      </>
    );
  }

  const surveyFlow = (
    <SurveyFlow survey={survey} token={token} waveId={resolution.waveId} hmlActive={hmlMode.active} />
  );

  return (
    <>
      {banner}
      {hmlMode.active ? <HmlPersonaConfirmationGate>{surveyFlow}</HmlPersonaConfirmationGate> : surveyFlow}
    </>
  );
}

// ─── Fluxo do formulário ──────────────────────────────────────────────────────

function SurveyFlow({
  survey,
  token,
  waveId,
  hmlActive = false,
}: {
  survey: SurveyDefinition;
  token: string;
  waveId: string;
  hmlActive?: boolean;
}) {
  const [responses, setResponses] = useState<SurveyResponses>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  // Recibo Vivo (I-M2): `null` enquanto o resultado da agregação ainda não é
  // conhecido — o engine (receipt-journey-engine) nunca inventa um número nesse caso.
  const [aggregationOutcome, setAggregationOutcome] = useState<AggregationOutcome | null>(null);

  // Lupa da Escuta (I-M7): telemetria k-anon, sem token, sem identidade — mede a
  // qualidade do INSTRUMENTO, nunca a pessoa. sessionStartRef/itemTimingsRef vivem
  // só no cliente até o snapshot ser enviado; nada disto é persistido com identidade.
  const sessionStartRef = useRef(Date.now());
  const itemTimingsRef = useRef<Record<string, number>>({});
  const funnelSentRef = useRef(false);

  // Travessia Leve (I-M1): rascunho SÓ NESTE APARELHO (localStorage), nunca no
  // servidor — a resposta não se perde numa queda de conexão. Chave derivada de
  // hash do token; invalidado se o instrumento mudar de forma ou passar o TTL.
  const itemIds = useMemo(() => survey.items.map((i) => i.id), [survey.items]);
  const instrumentSignature = useMemo(() => instrumentSignatureFor(itemIds), [itemIds]);
  const draftKey = useMemo(() => draftStorageKey(token), [token]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const payload = JSON.parse(raw) as DraftPayload;
      const validity = validateDraft(payload, instrumentSignature, Date.now());
      if (validity === "valid") {
        setResponses(payload.responses as SurveyResponses);
        setDraftRestored(true);
      } else {
        localStorage.removeItem(draftKey);
      }
    } catch {
      // localStorage indisponível (modo privado, quota, SSR) — degrada silenciosamente.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (Object.keys(responses).length === 0) return; // nunca sobrescreve com vazio (evitaria apagar um rascunho ao montar)
    try {
      const payload = buildDraftPayload(responses as Record<string, number>, instrumentSignature, Date.now());
      localStorage.setItem(draftKey, JSON.stringify(payload));
    } catch {
      // quota excedida ou indisponível — degrada silenciosamente, o envio final continua funcionando.
    }
  }, [responses, instrumentSignature, draftKey]);

  // Tempo restante honesto, alimentado pela Lupa da Escuta (I-M7) quando há telemetria
  // real; cai para uma estimativa genérica declarada como tal quando ainda não há.
  const [funnelStats, setFunnelStats] = useState<{
    medianByItem: Record<string, number> | null;
    overallMedianMs: number | null;
  }>({ medianByItem: null, overallMedianMs: null });

  useEffect(() => {
    let active = true;
    loadSurveyFunnelResult({ data: { packId: PILOT_PACK_ID, instrument: survey.instrumentShort } })
      .then((r) => {
        if (!active || !r.cloudReady || !r.funnel.ok) return;
        const medianByItem: Record<string, number> = {};
        for (const item of r.funnel.items) {
          if (item.medianDeltaMs !== null) medianByItem[item.itemId] = item.medianDeltaMs;
        }
        setFunnelStats({ medianByItem, overallMedianMs: r.funnel.overallMedianDeltaMs });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function sendFunnelSnapshot(completed: boolean) {
    recordSurveyFunnelSnapshot({
      data: {
        packId: PILOT_PACK_ID,
        instrument: survey.instrumentShort,
        totalItems: survey.items.length,
        completed,
        elapsedMs: Date.now() - sessionStartRef.current,
        itemTimingsMs: itemTimingsRef.current,
      },
    }).catch(() => {});
  }

  // Captura best-effort de abandono: dispara no MÁXIMO uma vez por sessão quando a
  // aba é ocultada antes do envio. Não é garantido (fechar a aba sem trocar de aba
  // primeiro pode não disparar) — documentado como limitação honesta, não promessa.
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState !== "hidden" || funnelSentRef.current) return;
      funnelSentRef.current = true;
      sendFunnelSnapshot(false);
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const progress = surveyProgress(survey.items, responses);
  const allAnswered = progress.answered === progress.total;
  const timeRemainingLabel = estimateRemainingLabel({
    itemIds,
    answeredCount: progress.answered,
    medianDeltaMsByItem: funnelStats.medianByItem,
    overallMedianDeltaMs: funnelStats.overallMedianMs,
  });

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
          waveId,
          surveyId: survey.id,
          inviteToken: token,
          answers,
        },
      });

      if (result?.accepted) {
        setSubmitted(true);
        funnelSentRef.current = true;
        sendFunnelSnapshot(true);
        try {
          localStorage.removeItem(draftKey);
        } catch {
          // indisponível — sem risco, o rascunho expira sozinho pelo TTL.
        }
        // Dispara agregação server-side sem bloquear a confirmação da UI.
        // Se n≥5 e ainda não houve capsule, o engine agrega e sela a onda. O
        // resultado (sempre agregado — nunca identifica esta contribuição) alimenta
        // a linha do tempo do Recibo Vivo (I-M2).
        checkAndAggregateByToken({ data: { token } })
          .then((r) => {
            setAggregationOutcome(
              r.triggered
                ? { triggered: true, participantCount: r.participantCount }
                : { triggered: false, count: r.count },
            );
          })
          .catch(() => {});
      } else {
        setError(
          (result && CAPTURE_ERROR_COPY[result.reason]) ??
            "Não foi possível registrar sua resposta. Tente novamente.",
        );
      }
    } catch {
      setError("Erro de conexão. Verifique sua internet e tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return <ConfirmationScreen journey={buildReceiptJourney({ aggregation: aggregationOutcome })} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header institucional sem nav (rota pública) */}
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3 sm:px-6">
          <p className="font-serif text-sm font-semibold text-foreground">4 Lentes VitalOS™</p>
          <div className="flex flex-col items-end gap-0.5">
            <ProgressPill answered={progress.answered} total={progress.total} />
            {progress.answered > 0 && (
              <span className="text-[10px] text-muted-foreground">{timeRemainingLabel}</span>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-8 px-4 py-8 sm:px-6">
        {/* Travessia Leve (I-M1): banner honesto — nunca escondido, nunca vago. */}
        {Object.keys(responses).length > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
            <Smartphone className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>
              {draftRestored
                ? "Continuando de onde você parou — rascunho salvo só neste aparelho."
                : "Rascunho salvo só neste aparelho."}
            </span>
          </div>
        )}

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
              onChange={(v) => {
                if (responses[item.id] === undefined) {
                  itemTimingsRef.current[item.id] = Date.now() - sessionStartRef.current;
                }
                setResponses((prev) => ({ ...prev, [item.id]: v }));
              }}
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
          {hmlActive && (
            <p
              role="note"
              className="mb-4 rounded-xl border border-amber-400 bg-amber-50 px-4 py-3 text-sm font-medium leading-relaxed text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200"
            >
              {HML_PRE_SUBMIT_REVIEW_TEXT}
            </p>
          )}
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

function ConfirmationScreen({ journey }: { journey: ReceiptJourney }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45 }}
        className="w-full max-w-md rounded-3xl border border-primary/20 bg-card p-10 text-center shadow-sm"
      >
        <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-full bg-primary/10">
          <CheckCircle className="h-8 w-8 text-primary" />
        </div>
        <h1 className="font-serif text-2xl text-foreground">
          Obrigado — sua contribuição está protegida.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{journey.reciprocityLine}</p>

        <ol className="mt-8 space-y-3 text-left">
          {journey.steps.map((step) => (
            <li key={step.id} className="flex items-center gap-3">
              <span
                className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${
                  step.done ? "bg-primary text-primary-foreground" : "border border-border/70 bg-transparent"
                }`}
              >
                {step.done && <CheckCircle className="h-3.5 w-3.5" strokeWidth={2.5} />}
              </span>
              <span className={`text-sm ${step.done ? "text-foreground" : "text-muted-foreground"}`}>
                {step.label}
              </span>
            </li>
          ))}
        </ol>

        <div className="mt-6 flex justify-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <p className="text-xs text-muted-foreground">
            Resposta anônima · Não há como identificar você
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-5 text-left">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="text-xs font-medium uppercase tracking-[0.1em] text-primary">Os Dois Trilhos</p>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Suas respostas desta onda são anônimas e nunca viram um perfil seu — o banco não
            tem onde guardar isso. Se você quiser ver o SEU espelho, existe outro caminho: seu,
            opcional, identificado.
          </p>
          <Link
            to="/espelho"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            Ver meu espelho pessoal →
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Tela de resolução do link (loading) ──────────────────────────────────────

function ResolvingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Verificando seu link…</p>
      </div>
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
