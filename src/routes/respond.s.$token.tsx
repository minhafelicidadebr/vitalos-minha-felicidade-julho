// Rota pública de resposta por setor — sem autenticação, sem AppShell, sem nav.
// Qualquer pessoa com o link pode acessar; o setor é derivado do token no servidor.
// Domínio B exclusivo (COPSOQ/risco psicossocial). Modo A: anonimato por construção.

import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import {
  isAllowedSurveyValue,
  surveyProgress,
  type SurveyDefinition,
  type SurveyItem,
  type SurveyResponses,
  type SurveyValue,
} from "@/engine/survey/survey-engine";
import type { CaptureReceipt, CaptureResult } from "@/engine/survey/response-capture-engine";
import { resolveSectorToken, submitSectorLinkResponse } from "@/lib/api/sector-link.functions";
import { getWaveSurvey } from "@/mocks/survey-mock";
import type { SectorTokenResolution } from "@/lib/survey/sector-link.server";

// ─── Rota ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/respond/s/$token")({
  head: () => ({
    meta: [{ title: "Pesquisa de Bem-Estar · 4 Lentes VitalOS™" }],
  }),
  loader: async ({ params }) => {
    try {
      return await resolveSectorToken({ data: { token: params.token } });
    } catch {
      return { valid: false, reason: "not_found" } as SectorTokenResolution;
    }
  },
  component: PublicSurveyPage,
});

// ─── Componente raiz ──────────────────────────────────────────────────────────

function PublicSurveyPage() {
  const { token } = Route.useParams();
  const grant = Route.useLoaderData();

  if (!grant.valid) {
    return <InvalidTokenPage reason={grant.reason} />;
  }

  const survey = getWaveSurvey("enterprise", grant.instrumentShort);
  if (!survey) {
    return <InvalidTokenPage reason="not_found" />;
  }

  return <SurveyFlow token={token} grant={grant} survey={survey} />;
}

// ─── Fluxo principal (máquina de estados) ────────────────────────────────────

type Stage = "consent" | "survey" | "submitted";

function SurveyFlow({
  token,
  grant,
  survey,
}: {
  token: string;
  grant: Extract<SectorTokenResolution, { valid: true }>;
  survey: SurveyDefinition;
}) {
  const [stage, setStage] = useState<Stage>("consent");
  const [responses, setResponses] = useState<SurveyResponses>({});
  const [submitting, setSubmitting] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<CaptureReceipt | null>(null);
  const submitting$ = useRef(false);

  const progress = surveyProgress(survey.items, responses);

  function answer(id: string, value: SurveyValue) {
    if (!isAllowedSurveyValue(survey.scale, value)) return;
    setResponses((prev) => ({ ...prev, [id]: value }));
  }

  async function submit() {
    if (!progress.isComplete || submitting$.current) return;
    submitting$.current = true;
    setSubmitting(true);
    setCaptureError(null);

    let result: CaptureResult;
    try {
      result = await submitSectorLinkResponse({
        data: {
          token,
          answers: survey.items.map((item) => ({
            itemId: item.id,
            value: responses[item.id]!,
          })),
          consentVersion: "2026.1",
        },
      });
    } catch {
      setCaptureError(
        "Não foi possível enviar. Suas respostas continuam nesta tela — tente novamente.",
      );
      setSubmitting(false);
      submitting$.current = false;
      return;
    }

    if (!result.accepted) {
      const msgs: Record<string, string> = {
        unknown_wave: "A campanha não está disponível para este link.",
        unknown_survey: "O instrumento não corresponde à campanha.",
        invalid_submission: "O envio está incompleto ou malformado.",
        duplicate_item: "Há itens duplicados no envio.",
        item_set_mismatch: "O conjunto de itens não corresponde ao instrumento.",
        invalid_value: "Uma resposta está fora da escala permitida.",
        cloud_adapter_missing: "Serviço temporariamente indisponível.",
      };
      setCaptureError(msgs[result.reason] ?? "Envio recusado. Tente novamente.");
      setSubmitting(false);
      submitting$.current = false;
      return;
    }

    setReceipt(result.receipt ?? null);
    setStage("submitted");
    setSubmitting(false);
  }

  return (
    <PublicShell>
      <AnimatePresence mode="wait">
        {stage === "consent" && (
          <motion.div
            key="consent"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <ConsentScreen grant={grant} survey={survey} onAccept={() => setStage("survey")} />
          </motion.div>
        )}

        {stage === "survey" && (
          <motion.div
            key="survey"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <SurveyScreen
              grant={grant}
              survey={survey}
              responses={responses}
              progress={progress}
              submitting={submitting}
              captureError={captureError}
              onAnswer={answer}
              onSubmit={submit}
            />
          </motion.div>
        )}

        {stage === "submitted" && (
          <motion.div
            key="submitted"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <ThanksScreen grant={grant} receipt={receipt} />
          </motion.div>
        )}
      </AnimatePresence>
    </PublicShell>
  );
}

// ─── Tela de consentimento ────────────────────────────────────────────────────

function ConsentScreen({
  grant,
  survey,
  onAccept,
}: {
  grant: Extract<SectorTokenResolution, { valid: true }>;
  survey: SurveyDefinition;
  onAccept: () => void;
}) {
  const [checked, setChecked] = useState(false);

  return (
    <div className="space-y-6">
      {/* Cabeçalho da campanha */}
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Domínio B · Risco Psicossocial · {grant.meteAnchor ?? "Pesquisa Ativa"}
        </p>
        <h1 className="mt-2 font-serif text-3xl text-foreground">{grant.campaignTitle}</h1>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5">
          <span className="h-2 w-2 rounded-full bg-primary" />
          <span className="text-sm font-medium text-primary">
            Setor: {grant.sectorLabel}
          </span>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {survey.intro.lead}
        </p>
      </header>

      {/* Aviso de setor pré-definido */}
      <div className="rounded-2xl border border-amber-300/60 bg-amber-50/60 px-5 py-4 dark:border-amber-800/40 dark:bg-amber-950/20">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-400">
          Setor pré-definido
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-amber-900 dark:text-amber-300">
          Este link está configurado para o setor <strong>{grant.sectorLabel}</strong>. Se este não é
          o seu setor, não responda — não há como corrigir após o envio.
        </p>
      </div>

      {/* Disclaimer Domínio B */}
      <div
        className="rounded-r-xl border-l-4 border-amber-400 bg-amber-50/40 px-5 py-4 dark:bg-amber-950/15"
        role="note"
        aria-label="Nota de privacidade"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-400">
          Privacidade & Anonimato
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-amber-900 dark:text-amber-300">
          {survey.intro.disclaimer}
        </p>
      </div>

      {/* Limitação honesta do Modo A */}
      <div className="rounded-2xl border border-border/60 bg-muted/30 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Como funciona o anonimato
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          Não é possível obter ao mesmo tempo <strong>anonimato forte</strong>,{" "}
          <strong>rastreamento individual de participação</strong> e{" "}
          <strong>uma resposta por pessoa</strong> sem uma arquitetura criptográfica adicional. Neste
          modo padrão, priorizamos o anonimato: sua resposta não é vinculada a nenhuma identidade, e
          o gestor vê apenas totais agregados (mínimo 5 respondentes por setor).
        </p>
      </div>

      {/* Período da pesquisa */}
      <p className="text-xs text-muted-foreground">
        Período: {grant.opensAt} → {grant.closesAt} ·{" "}
        <strong>{survey.items.length} perguntas</strong> · estimativa: 5–10 min
      </p>

      {/* Consentimento */}
      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border/60 bg-card p-4 transition-colors hover:bg-muted/30">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-0.5 h-4 w-4 cursor-pointer rounded border-border accent-primary"
          aria-label="Concordo em participar desta pesquisa anonimamente"
        />
        <span className="text-sm leading-relaxed text-foreground">
          Entendi o caráter anônimo e voluntário desta pesquisa e concordo em participar.
        </span>
      </label>

      <button
        disabled={!checked}
        onClick={onAccept}
        className="w-full rounded-xl bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Começar a pesquisa →
      </button>
    </div>
  );
}

// ─── Tela de questionário ─────────────────────────────────────────────────────

function SurveyScreen({
  grant,
  survey,
  responses,
  progress,
  submitting,
  captureError,
  onAnswer,
  onSubmit,
}: {
  grant: Extract<SectorTokenResolution, { valid: true }>;
  survey: SurveyDefinition;
  responses: SurveyResponses;
  progress: ReturnType<typeof surveyProgress>;
  submitting: boolean;
  captureError: string | null;
  onAnswer: (id: string, value: SurveyValue) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {survey.intro.eyebrow}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <h1 className="font-serif text-2xl text-foreground">{grant.campaignTitle}</h1>
          <span className="rounded-full border border-border/60 bg-card px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
            {survey.items.length} itens
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Setor: {grant.sectorLabel} · {grant.meteAnchor}
        </p>
      </header>

      {/* Barra de progresso fixa */}
      <div className="sticky top-4 z-10 rounded-2xl border border-border/60 bg-card/95 px-4 py-3 shadow-sm backdrop-blur-xl">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {progress.answered}/{progress.total} respondidas
          </span>
          <span className="font-semibold text-primary">{progress.pct}%</span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progress.pct}%` }}
          />
        </div>
      </div>

      {/* Itens */}
      <ol className="space-y-3">
        {survey.items.map((item, index) => (
          <SurveyItemCard
            key={item.id}
            item={item}
            index={index}
            value={responses[item.id]}
            survey={survey}
            onAnswer={(v) => onAnswer(item.id, v)}
          />
        ))}
      </ol>

      {/* Envio */}
      <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
        {captureError && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-amber-300/50 bg-amber-50/60 px-4 py-3 text-sm leading-relaxed text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/20 dark:text-amber-300"
          >
            {captureError}
          </div>
        )}

        <button
          disabled={!progress.isComplete || submitting}
          onClick={onSubmit}
          className="w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting
            ? "Enviando de forma segura…"
            : progress.isComplete
              ? "Enviar respostas"
              : `Responda todas (${progress.answered}/${progress.total})`}
        </button>

        <p className="mt-3 text-center text-[11px] leading-relaxed text-muted-foreground">
          O servidor valida e descarta o conteúdo. Nenhuma resposta individual é armazenada.
        </p>

        <div
          role="note"
          className="mt-4 rounded-r-xl border-l-4 border-amber-400 bg-amber-50/40 px-4 py-3 dark:bg-amber-950/15"
        >
          <p className="text-xs leading-relaxed text-amber-900 dark:text-amber-300">
            {survey.intro.disclaimer}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Tela de agradecimento ────────────────────────────────────────────────────

function ThanksScreen({
  grant,
  receipt,
}: {
  grant: Extract<SectorTokenResolution, { valid: true }>;
  receipt: CaptureReceipt | null;
}) {
  return (
    <div className="flex flex-col items-center py-10 text-center">
      <span
        aria-hidden
        className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-3xl text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
      >
        ✓
      </span>
      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {grant.instrumentShort} · {grant.sectorLabel} · {grant.meteAnchor}
      </p>
      <h1 className="mt-2 font-serif text-3xl text-foreground">{survey_intro_thanks}</h1>
      <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-muted-foreground">
        Sua resposta entrou somente no agregado anônimo do setor. No fechamento da campanha, a
        devolutiva mostra o que a comunidade aprendeu e qual é o próximo movimento — sem identificar
        nenhum respondente.
      </p>

      {receipt && (
        <div className="mx-auto mt-6 w-full max-w-sm rounded-2xl border border-border/70 bg-card p-4 text-left shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
            Recibo sem conteúdo
          </p>
          <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
            <ReceiptField label="Itens validados" value={String(receipt.itemCount)} />
            <ReceiptField
              label="Persistência"
              value={receipt.persisted ? "Cloud seguro" : "Validado e descartado"}
            />
            <ReceiptField label="Conteúdo retornado" value="Nenhum" />
            <ReceiptField
              label="Recibo"
              value={receipt.receiptId.replace("capture:", "").slice(0, 8) + "…"}
            />
          </dl>
        </div>
      )}

      <div className="mx-auto mt-6 max-w-md rounded-2xl border border-border/60 bg-muted/30 px-5 py-4 text-left">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          O que acontece agora
        </p>
        <ul className="mt-2 space-y-1 text-xs leading-relaxed text-muted-foreground">
          <li>• Sua resposta vai para o agregado protegido do setor {grant.sectorLabel}</li>
          <li>• Ao atingir 5 respondentes, as tendências ficam disponíveis para o time de RH/SST</li>
          <li>• Os resultados orientam o plano de ação do Culture Lab e o GRO da NR-1</li>
          <li>• Nenhum gestor vê quem respondeu ou o que cada pessoa respondeu</li>
        </ul>
      </div>
    </div>
  );
}

const survey_intro_thanks = "Obrigado — sua participação foi registrada";

// ─── Token inválido ───────────────────────────────────────────────────────────

const INVALID_COPY: Record<string, { title: string; body: string }> = {
  expired: {
    title: "Este link expirou",
    body: "A janela de participação desta pesquisa foi encerrada. Se você acredita que isso é um erro, entre em contato com o responsável de RH ou SST da sua organização.",
  },
  revoked: {
    title: "Este link foi desativado",
    body: "O link foi revogado pelo administrador da campanha. Entre em contato com o responsável de RH ou SST para obter um novo link, se aplicável.",
  },
  rotated: {
    title: "Este link foi substituído",
    body: "Um link atualizado foi gerado para este setor. Solicite ao responsável de RH ou SST o link mais recente.",
  },
  not_found: {
    title: "Link não encontrado",
    body: "Este link não corresponde a nenhuma campanha ativa. Verifique se copiou o endereço corretamente ou solicite um novo link ao responsável.",
  },
};

function InvalidTokenPage({ reason }: { reason?: string }) {
  const copy = INVALID_COPY[reason ?? "not_found"] ?? INVALID_COPY.not_found!;
  return (
    <PublicShell>
      <div className="flex flex-col items-center py-12 text-center">
        <span
          aria-hidden
          className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-amber-100 text-2xl text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
        >
          ⚠
        </span>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Acesso indisponível
        </p>
        <h1 className="mt-2 font-serif text-2xl text-foreground">{copy.title}</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
          {copy.body}
        </p>
      </div>
    </PublicShell>
  );
}

// ─── Shell público (sem nav, sem login) ──────────────────────────────────────

function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Cabeçalho mínimo — apenas branding, sem nav */}
      <header className="border-b border-border/40 bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-primary" aria-hidden />
            <span className="font-serif text-base font-medium text-foreground">VitalOS™</span>
          </div>
          <span className="rounded-full border border-amber-300/60 bg-amber-50/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700 dark:border-amber-700/40 dark:bg-amber-950/20 dark:text-amber-400">
            Pesquisa Anônima
          </span>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        {children}
      </main>

      {/* Rodapé de privacidade */}
      <footer className="border-t border-border/40 bg-card/50 py-5">
        <p className="mx-auto max-w-2xl px-4 text-center text-[11px] leading-relaxed text-muted-foreground sm:px-6">
          Este formulário não coleta nome, e-mail, CPF, matrícula, IP ou qualquer identificador
          pessoal. A sua resposta entra somente no agregado anônimo do setor (mínimo 5 participantes
          para publicar). Plataforma{" "}
          <span className="font-medium text-foreground">4 Lentes VitalOS™</span>.
        </p>
      </footer>
    </div>
  );
}

// ─── Componentes de survey ────────────────────────────────────────────────────

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
  const answered = value !== undefined;
  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.5) }}
      className={`rounded-2xl border bg-card p-4 shadow-sm transition-colors ${
        answered ? "border-primary/30" : "border-border/70"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-full font-mono text-[11px] font-semibold transition-colors ${
            answered
              ? "bg-primary text-primary-foreground"
              : "bg-primary/10 text-primary"
          }`}
        >
          {answered ? "✓" : index + 1}
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
    </motion.li>
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
  const values = options.map((o) => o.value);
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

function ReceiptField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/35 px-3 py-2">
      <dt className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium text-foreground">{value}</dd>
    </div>
  );
}
