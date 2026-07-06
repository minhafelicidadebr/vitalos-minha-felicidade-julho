// /espelho — Espelho Vivo (Mensurar Vivo I-M3 + I-M4): o primeiro resultado
// INDIVIDUAL do VitalOS. Trilho B dos Dois Trilhos: autoavaliação opt-in e
// identificada — nunca deriva de onda organizacional (anônima por arquitetura).
// Demo mock-first: resultado fica SÓ neste aparelho (localStorage), rotulado;
// a persistência real (personal_assessments, padrão S5) chega no S6.5.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Compass,
  Download,
  Eye,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import { AppShell } from "@/app/shell/AppShell";
import { usePack } from "@/engine/pack";
import { getMissions } from "@/engine/gamification/gamification-engine";
import {
  buildAssessmentTrend,
  canRetake,
  scorePersonalAssessment,
  PERSONAL_ASSESSMENT_ENGINE_VERSION,
  type PersonalAssessmentRecord,
  type PersonalAssessmentResult,
} from "@/engine/espelho/personal-assessment-engine";
import { buildMirrorCompass } from "@/engine/espelho/mirror-recommendation-engine";
import { PERMA_ITEMS } from "@/mocks/survey-mock";
import { MARINA_VIAT_RESULT } from "@/mocks/viat-mock";
import { LEARNING_PATHS } from "@/mocks/academia-mock";
import {
  ESPELHO_BANDS,
  ESPELHO_COLLECTIVE_PRIORITY,
  ESPELHO_COPY,
  ESPELHO_FACTORS,
  ESPELHO_HISTORY_SEED,
  ESPELHO_MIN_RETAKE_DAYS,
  ESPELHO_PILLAR_LABELS,
  ESPELHO_SCALE,
  ESPELHO_SCALE_OPTIONS,
  ESPELHO_TODAY,
} from "@/mocks/espelho-mock";
import { useRealOrgSession } from "@/app/identity/useRealOrgSession";
import { isCloudReady } from "@/lib/cloud/supabase-client";
import {
  eraseMyAssessments,
  loadAssessmentHistory,
  saveAssessmentRecord,
} from "@/lib/cloud/espelho-adapter";

const INSTRUMENT = "perma_personal";
const INSTRUMENT_VERSION = "br-2026-15itens";

export const Route = createFileRoute("/espelho")({
  head: () => ({ meta: [{ title: "Espelho Vivo — 4 Lentes VitalOS™" }] }),
  component: EspelhoPage,
});

const STORAGE_KEY = "vitalos-espelho-demo";

interface StoredMirror {
  responses: Record<string, number>;
  takenAt: string;
}

const BAND_STYLE: Record<string, string> = {
  atencao: "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800/40",
  construindo: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/40",
  cultivando: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/40",
  florescendo: "bg-primary/8 text-primary border-primary/25",
};

type Stage = "loading" | "intro" | "assessment" | "mirror";

function EspelhoPage() {
  const { gamification } = usePack();
  const cloudActive = isCloudReady();
  const { loading: orgLoading, org: realOrg } = useRealOrgSession();
  const isRealMode = cloudActive && !!realOrg;

  const [stage, setStage] = useState<Stage>("loading");
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [itemIndex, setItemIndex] = useState(0);
  const [stored, setStored] = useState<StoredMirror | null>(null); // caminho demo (localStorage)
  const [realHistory, setRealHistory] = useState<PersonalAssessmentRecord[]>([]); // caminho real
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchRealHistory = useCallback(async (): Promise<PersonalAssessmentRecord[]> => {
    if (!realOrg) return [];
    return loadAssessmentHistory(realOrg.userId, INSTRUMENT);
  }, [realOrg]);

  // Hidratação — real (Supabase) ou demo (localStorage), mutuamente exclusivas.
  // Aguarda orgLoading resolver antes de decidir o caminho — evita um flash de
  // conteúdo demo para quem tem sessão real.
  useEffect(() => {
    if (orgLoading) return;
    if (isRealMode) {
      fetchRealHistory().then((history) => {
        setRealHistory(history);
        setStage(history.length > 0 ? "mirror" : "intro");
      });
      return;
    }
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredMirror;
        setStored(parsed);
        setStage("mirror");
        return;
      }
    } catch {
      // storage indisponível/corrompido → começa do zero, honesto
    }
    setStage("intro");
  }, [orgLoading, isRealMode, fetchRealHistory]);

  const demoResult: PersonalAssessmentResult | null = useMemo(() => {
    if (!stored) return null;
    return scorePersonalAssessment(
      stored.responses,
      ESPELHO_FACTORS,
      ESPELHO_BANDS,
      ESPELHO_SCALE,
      stored.takenAt,
    );
  }, [stored]);

  const realResult: PersonalAssessmentResult | null = useMemo(() => {
    if (realHistory.length === 0) return null;
    return realHistory[realHistory.length - 1]!.result;
  }, [realHistory]);

  const result = isRealMode ? realResult : demoResult;

  const history: PersonalAssessmentRecord[] = useMemo(() => {
    if (isRealMode) return realHistory;
    const base = [...ESPELHO_HISTORY_SEED];
    if (demoResult) {
      base.push({
        assessmentId: `espelho-local-${demoResult.takenAt}`,
        instrument: INSTRUMENT,
        instrumentVersion: INSTRUMENT_VERSION,
        engineVersion: PERSONAL_ASSESSMENT_ENGINE_VERSION,
        takenAt: demoResult.takenAt,
        result: demoResult,
      });
    }
    return base;
  }, [isRealMode, realHistory, demoResult]);

  const trend = useMemo(() => buildAssessmentTrend(history, INSTRUMENT), [history]);

  const compass = useMemo(() => {
    const missions = gamification ? getMissions(gamification) : [];
    return buildMirrorCompass({
      personal: result,
      affinityStrengths: MARINA_VIAT_RESULT.top5.map((s) => ({ id: s.id, label: s.name })),
      collectivePriority: ESPELHO_COLLECTIVE_PRIORITY,
      paths: LEARNING_PATHS.filter((p) => p.packIds.includes("enterprise")),
      missions,
      roleId: "COLABORADOR",
      pillarLabels: ESPELHO_PILLAR_LABELS,
    });
  }, [result, gamification]);

  const today = isRealMode ? new Date().toISOString().slice(0, 10) : ESPELHO_TODAY;
  const lastTakenAt = isRealMode
    ? (realHistory.length > 0 ? realHistory[realHistory.length - 1]!.takenAt : null)
    : (stored?.takenAt ?? null);
  const retakeGate = canRetake(lastTakenAt, today, ESPELHO_MIN_RETAKE_DAYS);

  async function finishAssessment(finalResponses: Record<string, number>) {
    const computedResult = scorePersonalAssessment(
      finalResponses,
      ESPELHO_FACTORS,
      ESPELHO_BANDS,
      ESPELHO_SCALE,
      today,
    );

    if (isRealMode && realOrg) {
      setSaving(true);
      setActionError(null);
      try {
        await saveAssessmentRecord(realOrg.userId, {
          instrument: INSTRUMENT,
          instrumentVersion: INSTRUMENT_VERSION,
          engineVersion: PERSONAL_ASSESSMENT_ENGINE_VERSION,
          takenAt: today,
          result: computedResult,
        });
        setRealHistory(await fetchRealHistory());
        setStage("mirror");
      } catch {
        setActionError("Erro ao salvar sua autoavaliação. Tente novamente.");
      } finally {
        setSaving(false);
      }
      return;
    }

    const record: StoredMirror = { responses: finalResponses, takenAt: today };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    } catch {
      // sem storage: segue efêmero na sessão
    }
    setStored(record);
    setStage("mirror");
  }

  async function eraseMirror() {
    if (isRealMode) {
      setActionError(null);
      const outcome = await eraseMyAssessments();
      if (!outcome.success) {
        setActionError("Erro ao apagar seus dados. Tente novamente.");
        return;
      }
      setRealHistory([]);
      setResponses({});
      setItemIndex(0);
      setStage("intro");
      return;
    }
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // nada a fazer
    }
    setStored(null);
    setResponses({});
    setItemIndex(0);
    setStage("intro");
  }

  function exportMirror() {
    if (!result) return;
    const payload = {
      exportedAt: new Date().toISOString(),
      instrument: INSTRUMENT,
      instrumentVersion: INSTRUMENT_VERSION,
      engineVersion: PERSONAL_ASSESSMENT_ENGINE_VERSION,
      note: "Snapshot computado (minimização LGPD): faixas e escores; respostas item a item não são retidas.",
      result,
      historySeedIncluded: !isRealMode,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `espelho-vivo-${result.takenAt}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (stage === "loading") {
    return (
      <AppShell>
        <div className="mx-auto max-w-3xl space-y-5 px-4 py-8 sm:px-6" aria-busy="true">
          <div className="h-4 w-56 animate-pulse rounded bg-muted" />
          <div className="h-48 animate-pulse rounded-[2rem] bg-muted/70" />
          <div className="h-72 animate-pulse rounded-3xl bg-muted/60" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {ESPELHO_COPY.eyebrow}
          </p>
          <h1 className="mt-2 font-serif text-3xl leading-tight text-foreground sm:text-4xl">
            {ESPELHO_COPY.title}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {ESPELHO_COPY.lead}
          </p>
        </motion.header>

        {stage === "intro" && (
          <Intro
            onStart={() => {
              setResponses({});
              setItemIndex(0);
              setStage("assessment");
            }}
          />
        )}

        {stage === "assessment" && !saving && (
          <Assessment
            responses={responses}
            itemIndex={itemIndex}
            onAnswer={(itemId, value) => {
              const next = { ...responses, [itemId]: value };
              setResponses(next);
              if (itemIndex < PERMA_ITEMS.length - 1) {
                setItemIndex(itemIndex + 1);
              } else {
                finishAssessment(next);
              }
            }}
            onBack={() => setItemIndex(Math.max(0, itemIndex - 1))}
          />
        )}

        {stage === "assessment" && saving && (
          <p className="animate-pulse text-sm text-muted-foreground">Salvando sua autoavaliação…</p>
        )}

        {stage === "mirror" && result && (
          <Mirror
            result={result}
            trend={trend}
            compass={compass}
            retakeGate={retakeGate}
            isRealMode={isRealMode}
            saving={saving}
            actionError={actionError}
            onRetake={() => {
              setResponses({});
              setItemIndex(0);
              setStage("assessment");
            }}
            onExport={exportMirror}
            onErase={eraseMirror}
          />
        )}
      </div>
    </AppShell>
  );
}

// ─── Ato 0 · O convite (Contrato + Dois Trilhos + disclaimers) ───────────────

function Intro({ onStart }: { onStart: () => void }) {
  return (
    <div className="space-y-4">
      <section className="rounded-[2rem] border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-accent/5 p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden />
          <div>
            <h2 className="font-serif text-xl text-foreground">O Contrato de Reciprocidade</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {ESPELHO_COPY.contract}
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-border/60 bg-card/70 p-4">
          <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <p className="text-xs leading-relaxed text-muted-foreground">{ESPELHO_COPY.twoTracks}</p>
        </div>
        <button
          type="button"
          onClick={onStart}
          className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Começar minha autoavaliação · ~3 min
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Opcional, sempre. {ESPELHO_COPY.yourData}
        </p>
      </section>

      <Disclaimers />
    </div>
  );
}

// ─── Ato 1 · A autoavaliação (15 itens, um por tela) ─────────────────────────

function Assessment({
  responses,
  itemIndex,
  onAnswer,
  onBack,
}: {
  responses: Record<string, number>;
  itemIndex: number;
  onAnswer: (itemId: string, value: number) => void;
  onBack: () => void;
}) {
  const item = PERMA_ITEMS[itemIndex]!;
  const pct = Math.round((itemIndex / PERMA_ITEMS.length) * 100);
  return (
    <section aria-label="Autoavaliação PERMA+V">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {itemIndex + 1} de {PERMA_ITEMS.length} · {item.section}
        </span>
        <span className="tabular-nums">{pct}%</span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>

      <motion.div
        key={item.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mt-5 rounded-3xl border border-border/70 bg-card p-6 shadow-sm sm:p-8"
      >
        <p className="font-serif text-xl leading-snug text-foreground sm:text-2xl">{item.text}</p>
        <div role="radiogroup" aria-label={item.text} className="mt-6 grid gap-2 sm:grid-cols-5">
          {ESPELHO_SCALE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={responses[item.id] === option.value}
              onClick={() => onAnswer(item.id, option.value)}
              className={`min-h-14 rounded-2xl border px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                responses[item.id] === option.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/60 bg-background hover:border-primary/40 hover:bg-primary/5"
              }`}
            >
              <span className="block font-semibold tabular-nums">{option.value}</span>
              <span className="mt-0.5 block text-[11px] leading-tight opacity-80">{option.label}</span>
            </button>
          ))}
        </div>
      </motion.div>

      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          disabled={itemIndex === 0}
          className="inline-flex min-h-10 items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Voltar
        </button>
        <p className="text-[11px] text-muted-foreground">Suas respostas ficam só com você.</p>
      </div>
    </section>
  );
}

// ─── Atos 2–4 · O espelho, a bússola e os direitos ───────────────────────────

function Mirror({
  result,
  trend,
  compass,
  retakeGate,
  isRealMode,
  saving,
  actionError,
  onRetake,
  onExport,
  onErase,
}: {
  result: PersonalAssessmentResult;
  trend: ReturnType<typeof buildAssessmentTrend>;
  compass: ReturnType<typeof buildMirrorCompass<(typeof LEARNING_PATHS)[number]>>;
  retakeGate: ReturnType<typeof canRetake>;
  isRealMode: boolean;
  saving: boolean;
  actionError: string | null;
  onRetake: () => void;
  onExport: () => void;
  onErase: () => void;
}) {
  const radarData = MARINA_VIAT_RESULT.virtues.map((v) => ({ virtue: v.name, score: v.score }));

  return (
    <div className="space-y-5">
      {/* O retrato em faixas */}
      <section className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Seu PERMA+V · {result.takenAt}
            </p>
            <h2 className="mt-1 font-serif text-2xl text-foreground">
              Você está{" "}
              <span className="text-primary">{result.globalBandLabel ?? "sem leitura"}</span>
            </h2>
            {trend.lastDelta !== null && (
              <p className="mt-1 text-xs text-muted-foreground">
                {trend.direction === "melhorando"
                  ? `Subindo desde a última leitura (+${trend.lastDelta}).`
                  : trend.direction === "atencao"
                    ? `Abaixo da última leitura (${trend.lastDelta}) — um convite, não um veredito.`
                    : "Estável desde a última leitura."}
              </p>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{result.completeness}% respondido</p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-5">
          {result.factors.map((factor) => (
            <div key={factor.id} className="rounded-2xl border border-border/55 bg-background/45 p-3">
              <p className="text-xs font-medium text-foreground">{factor.name}</p>
              {factor.score === null ? (
                <p className="mt-2 text-[11px] text-muted-foreground">sem dados</p>
              ) : (
                <>
                  <span
                    className={`mt-2 inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                      BAND_STYLE[factor.bandId ?? ""] ?? "bg-muted text-muted-foreground border-border/50"
                    }`}
                  >
                    {factor.bandLabel}
                  </span>
                  <div
                    className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted"
                    role="img"
                    aria-label={`${factor.name}: ${factor.bandLabel}`}
                  >
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${((factor.score - 1) / 4) * 100}%` }}
                    />
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Forças VIA-T (consentidas) */}
      <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Suas forças · VIA-T (exploratório)
          </p>
          <div className="mt-2 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="75%">
                <PolarGrid stroke="var(--color-border)" />
                <PolarAngleAxis dataKey="virtue" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
                <Radar
                  dataKey="score"
                  stroke="var(--color-primary)"
                  fill="var(--color-primary)"
                  fillOpacity={0.25}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {MARINA_VIAT_RESULT.top5.map((s) => (
              <span
                key={s.id}
                className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary"
              >
                <Sparkles className="mr-1 inline h-3 w-3" aria-hidden />
                {s.name}
              </span>
            ))}
          </div>
        </div>

        {/* A Bússola */}
        <div className="rounded-3xl border border-primary/25 bg-primary/[0.04] p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-primary" aria-hidden />
            <h2 className="font-serif text-xl text-foreground">Sua Bússola</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Recomendações do SEU dado — necessidade pessoal primeiro, prioridade coletiva junto,
            suas forças como porta de entrada.
          </p>

          <div className="mt-4 space-y-2">
            {compass.recommendations.map((rec) => (
              <Link
                key={rec.path.id}
                to="/academia"
                className="flex items-center justify-between gap-3 rounded-2xl border border-border/55 bg-card px-4 py-3 transition-colors hover:border-primary/40"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{rec.path.title}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {rec.path.focusLabel} · {rec.path.modules.length} módulos
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                    rec.relevance === "prioritaria"
                      ? "bg-primary/10 text-primary"
                      : rec.relevance === "afinidade"
                        ? "bg-accent/20 text-amber-800 dark:text-amber-300"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {rec.relevance === "prioritaria"
                    ? "sua prioridade"
                    : rec.relevance === "afinidade"
                      ? "sua força"
                      : "sugestão"}
                </span>
              </Link>
            ))}
          </div>

          {compass.microMission && (
            <div className="mt-3 rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-800 dark:text-amber-300">
                Micro-missão da semana
              </p>
              <p className="mt-1 text-sm text-foreground">{compass.microMission.title}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Praticou? Registre no seu Diário de Prática — vira evidência viva.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Cofre pessoal + re-teste */}
      <section className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <Eye className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
          <div className="flex-1">
            <h2 className="font-serif text-xl text-foreground">Seu dado é seu</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {ESPELHO_COPY.yourData}
              {isRealMode && " Salvo com segurança na sua conta — disponível em qualquer aparelho."}
            </p>
            {actionError && (
              <p className="mt-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {actionError}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onExport}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border/70 bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/40"
              >
                <Download className="h-4 w-4" aria-hidden />
                Exportar (JSON)
              </button>
              <button
                type="button"
                onClick={onErase}
                disabled={saving}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-destructive/30 bg-background px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/5 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                Apagar meu espelho
              </button>
              <button
                type="button"
                onClick={onRetake}
                disabled={!retakeGate.allowed || saving}
                title={
                  retakeGate.allowed
                    ? undefined
                    : `Re-teste disponível em ${retakeGate.daysRemaining} dias — dar tempo ao tempo também é método.`
                }
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {saving ? "Salvando…" : "Refazer autoavaliação"}
              </button>
            </div>
            {!retakeGate.allowed && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Cadência mínima de {ESPELHO_MIN_RETAKE_DAYS} dias entre leituras — re-testagem
                obsessiva mede ansiedade, não florescimento. Faltam {retakeGate.daysRemaining} dias.
              </p>
            )}
          </div>
        </div>
      </section>

      <Disclaimers />
      <p className="text-center text-xs leading-relaxed text-muted-foreground">
        {ESPELHO_COPY.twoTracks} {!isRealMode && ESPELHO_COPY.demoNote}
      </p>
    </div>
  );
}

function Disclaimers() {
  return (
    <section className="rounded-2xl border border-border/60 bg-muted/30 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Honestidade científica
      </p>
      <ul className="mt-2 space-y-1">
        {ESPELHO_COPY.disclaimers.map((text) => (
          <li key={text} className="text-[11px] leading-relaxed text-muted-foreground">
            · {text}
          </li>
        ))}
      </ul>
    </section>
  );
}
