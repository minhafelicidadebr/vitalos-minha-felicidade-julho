import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Check,
  Heart,
  Landmark,
  Loader2,
  ShieldCheck,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import { AppShell } from "@/app/shell/AppShell";
import { usePack } from "@/engine/pack";
import { useIvo, useOrg } from "@/mocks/hooks";
import { getBoardBrief, getRealBoardBrief } from "@/lib/api/board-brief.functions";
import type { BoardBrief } from "@/lib/proof/board-brief.server";
import { useRealOrgSession } from "@/app/identity/useRealOrgSession";
import { supabase } from "@/integrations/supabase/client";
import { isCloudReady } from "@/lib/cloud/supabase-client";
import { isCapabilityEnabled } from "@/lib/capabilities/registry";
import { loadCycleHistory, type LoadCycleHistoryResult } from "@/lib/api/cycle-history.functions";
import { projectForecast } from "@/engine/forecast/forecast-engine";
import { calculatePnL, DEFAULT_INPUTS } from "@/engine/pnl/pnl-engine";
import { deriveEsgReadiness, type PillarScore } from "@/engine/esg/esg-engine";
import { rankPriorities } from "@/engine/priority/priority-engine";
import { evaluateEvidence } from "@/engine/lab/evidence-engine";
import { computeSeasonOverview } from "@/engine/season/season-engine";
import { buildPanorama, type PanoramaMetric } from "@/engine/panorama/panorama-engine";
import { FORECAST_LEVERS, MATURITY_BANDS, pillarsFromIvo } from "@/mocks/forecast-mock";
import { ESG_MAPPING } from "@/mocks/esg-mock";
import { ambassadorshipForPillar } from "@/mocks/priority-mock";
import { EXPERIMENT_CASES } from "@/mocks/experiment-mock";
import { ANNUAL_PLAN, CURRENT_PROGRAM_WEEK } from "@/mocks/season-mock";

export const Route = createFileRoute("/panorama")({
  head: () => ({ meta: [{ title: "Panorama Executivo — 4 Lentes VitalOS™" }] }),
  component: PanoramaPage,
});

const DEFAULT_PLAN = ["energia_carga", "reconhecimento"];

function compactBRL(v: number): string {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1).replace(".", ",")} mi`;
  if (v >= 1_000) return `R$ ${Math.round(v / 1_000)} mil`;
  return `R$ ${Math.round(v)}`;
}

// A organização não vem mais do cliente (P0-04) — o servidor resolve quem é
// o admin de verdade a partir do access_token da própria sessão.
async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

const TONE_STYLE: Record<string, { dot: string; text: string; bg: string }> = {
  avancando: {
    dot: "bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
  },
  estavel: {
    dot: "bg-sky-500",
    text: "text-sky-700 dark:text-sky-300",
    bg: "bg-sky-50 dark:bg-sky-950/30",
  },
  atencao: {
    dot: "bg-amber-500",
    text: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-50 dark:bg-amber-950/30",
  },
  risco: {
    dot: "bg-red-500",
    text: "text-red-700 dark:text-red-300",
    bg: "bg-red-50 dark:bg-red-950/30",
  },
};

function PanoramaPage() {
  const { packId } = usePack();
  const { current, previous, delta } = useIvo();
  const org = useOrg();

  // Board Brief: o arco medir→provar→custo→selo lido pelos 5 céticos — hoje
  // sempre a leitura de DEMONSTRAÇÃO (histórico compartilhado por setor).
  const [brief, setBrief] = useState<BoardBrief | null>(null);
  useEffect(() => {
    let active = true;
    void getBoardBrief({ data: { packId } })
      .then((b) => active && setBrief(b))
      .catch(() => active && setBrief(null));
    return () => {
      active = false;
    };
  }, [packId]);

  // Prova de Ciclo REAL desta organização (Cofre de Ciclos, S6.75) — só existe
  // com sessão de org real e ≥2 ciclos registrados em /evolucao-nr1.
  const cloudActive = isCloudReady();
  const { org: realOrg } = useRealOrgSession();
  const isRealMode = isCapabilityEnabled("ORGANIZATION_CYCLE") && cloudActive && !!realOrg;
  const [realCycleResult, setRealCycleResult] = useState<LoadCycleHistoryResult | null>(null);
  const [realCycleLoading, setRealCycleLoading] = useState(false);

  const [realBrief, setRealBrief] = useState<BoardBrief | null>(null);

  const fetchRealCycleProof = useCallback(async () => {
    if (!isRealMode) return;
    setRealCycleLoading(true);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) return;
      const result = await loadCycleHistory({ data: { accessToken, instrument: "COPSOQ" } });
      setRealCycleResult(result);
      // Brief executivo REAL (E4): mesma sessão, só existe com ≥2 ciclos no Cofre.
      const briefResult = await getRealBoardBrief({ data: { accessToken } });
      setRealBrief(briefResult.available ? briefResult.brief : null);
    } catch {
      setRealCycleResult(null);
      setRealBrief(null);
    } finally {
      setRealCycleLoading(false);
    }
  }, [isRealMode]);

  useEffect(() => {
    fetchRealCycleProof();
  }, [fetchRealCycleProof]);

  const panorama = useMemo(() => {
    if (!current) return null;

    const pillars = pillarsFromIvo(current);

    // Projetar (mesmo plano-base de /trajetoria)
    const forecast = projectForecast({
      pillars,
      levers: FORECAST_LEVERS,
      activeLeverIds: DEFAULT_PLAN,
      seasons: 4,
      scenario: "medio",
      maturityLevels: MATURITY_BANDS,
    });
    const avoided = calculatePnL(
      DEFAULT_INPUTS,
      Math.max(0, forecast.ivoDelta),
      "médio",
    ).avoidedCost;

    // ESG agora × projetado
    const toScore = (p: (typeof pillars)[number]): PillarScore => ({
      pillarId: p.pillarId,
      name: p.name,
      score: p.score,
      visible: p.visible,
    });
    const esgNow = deriveEsgReadiness(pillars.map(toScore), ESG_MAPPING).overallScore;
    const esgNext = deriveEsgReadiness(
      forecast.projectedPillars.map(toScore),
      ESG_MAPPING,
    ).overallScore;

    // Agir (prioridade #1)
    const priorities = rankPriorities(pillars, FORECAST_LEVERS, { scenario: "medio" });
    const top = priorities.items[0] ?? null;
    const topLeadPillar = top?.addressedPillars[0]?.pillarId;
    const owner = topLeadPillar ? ambassadorshipForPillar(topLeadPillar) : null;

    // Provar (experimentos)
    const concludedCases = EXPERIMENT_CASES.filter((c) => c.status === "concluido" && c.observed);
    const verdicts = concludedCases.map((c) => evaluateEvidence(c.observed!));
    const confirmed = verdicts.filter(
      (v) => v.verdict === "confirmado" || v.verdict === "superou",
    ).length;

    // Ritmo
    const season = computeSeasonOverview(ANNUAL_PLAN, CURRENT_PROGRAM_WEEK);

    return buildPanorama({
      ivoScore: current.ivoScore,
      ivoDelta: delta,
      maturityName: current.maturityLevel.name,
      respondents: current.totalRespondents,
      participationPct: org.participationPct,
      topPriorityLabel: top?.label ?? null,
      topPriorityOwner: owner?.name ?? null,
      topPriorityLift: top?.expectedIvoLift ?? 0,
      projectedIvo: forecast.finalIvo,
      projectedDelta: forecast.ivoDelta,
      avoidedCostLabel: compactBRL(avoided),
      esgNow,
      esgNext,
      experimentsConcluded: verdicts.length,
      experimentsConfirmed: confirmed,
      seasonName: season.currentSeason.name,
      phaseLabel: season.currentPhase.label,
    });
  }, [current, previous, delta, org.participationPct]);

  if (!panorama) {
    return (
      <AppShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <p className="animate-pulse text-muted-foreground">Sintetizando o panorama…</p>
        </div>
      </AppShell>
    );
  }

  const tone = TONE_STYLE[panorama.tone]!;
  const today = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6 print:max-w-none print:px-0 print:py-0 print:space-y-4">
        {/* Timbre institucional — só na impressão */}
        <div className="print-only mb-4 border-b border-border pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded bg-primary font-serif text-sm text-primary-foreground">
                4
              </span>
              <span className="text-sm font-medium text-foreground">4 Lentes VitalOS™</span>
            </div>
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Panorama de Conselho
            </span>
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            {org.name} · Panorama Executivo · Emitido em {today}
          </p>
        </div>

        {/* Cabeçalho */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="flex flex-wrap items-start justify-between gap-3"
        >
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Panorama Executivo · {org.name}
            </p>
            <h1 className="mt-1 font-serif text-3xl text-foreground">Vitalidade em uma página</h1>
            <p className="mt-1 text-xs text-muted-foreground">{today}</p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${tone.bg} ${tone.text}`}
            >
              <span className={`h-2 w-2 rounded-full ${tone.dot}`} aria-hidden />
              {panorama.toneLabel}
            </span>
            <button
              onClick={() => window.print()}
              title="Na caixa de impressão, escolha “Salvar como PDF” em tamanho A4."
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground print:hidden"
            >
              <span aria-hidden>⤓</span> Exportar PDF do conselho
            </button>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45, delay: 0.05 }}
          className="font-serif text-xl leading-snug text-foreground"
        >
          {panorama.headline}
        </motion.p>

        {/* Métricas-herói */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {panorama.heroMetrics.map((m, i) => (
            <HeroMetric key={m.id} metric={m} delay={0.1 + i * 0.04} />
          ))}
        </div>

        {/* Arco medir → agir → projetar → provar */}
        <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
          <h2 className="mb-4 font-serif text-lg text-foreground">O ciclo, de ponta a ponta</h2>
          <div className="grid gap-3 sm:grid-cols-4">
            {panorama.arc.map((step, i) => (
              <div key={step.id} className="relative">
                {i < panorama.arc.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute right-[-10px] top-6 hidden text-muted-foreground/40 sm:block"
                  >
                    →
                  </span>
                )}
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  {step.label}
                </p>
                <p className="mt-1 font-medium text-card-foreground">{step.headline}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Narrativa */}
        <section className="rounded-2xl border border-border/60 bg-muted/30 p-5">
          <h2 className="mb-2 font-serif text-base text-foreground">Leitura para a diretoria</h2>
          <p className="text-base leading-relaxed text-muted-foreground">{panorama.narrative}</p>
        </section>

        {/* Prova de Ciclo REAL desta organização (Cofre de Ciclos, S6.75) */}
        {isRealMode && (
          <RealCycleProofCard result={realCycleResult} loading={realCycleLoading} />
        )}

        {/* Board Brief REAL (E4, S8): os 5 céticos sobre os ciclos DESTA org */}
        {isRealMode && realBrief && <RealBoardBriefCard brief={realBrief} />}

        {/* Prova de Ciclo — o arco lido pelos cinco céticos (medir→provar→custo→selo) */}
        {brief && <BoardBriefCard brief={brief} isRealMode={isRealMode} />}

        {/* Próxima ação + prova */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
            <p className="text-xs uppercase tracking-[0.12em] text-primary">Próxima ação</p>
            <p className="mt-1.5 text-base leading-relaxed text-foreground">
              {panorama.nextAction}
            </p>
            <Link
              to="/prioridades"
              className="mt-3 inline-block text-xs text-primary underline underline-offset-2"
            >
              ver a fila de prioridades →
            </Link>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card p-5">
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
              Prova acumulada
            </p>
            <p className="mt-1.5 text-base leading-relaxed text-foreground">{panorama.proofLine}</p>
            <Link
              to="/experimentos"
              className="mt-3 inline-block text-xs text-primary underline underline-offset-2"
            >
              ver os experimentos →
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Cada número desta página é derivado e auditável — vem dos motores de{" "}
          <Link to="/ivo" className="underline underline-offset-2 hover:text-foreground">
            IVO
          </Link>
          ,{" "}
          <Link to="/trajetoria" className="underline underline-offset-2 hover:text-foreground">
            Trajetória
          </Link>{" "}
          e{" "}
          <Link to="/experimentos" className="underline underline-offset-2 hover:text-foreground">
            Evidência
          </Link>
          .
        </p>

        {/* Rodapé institucional — só na impressão */}
        <div className="print-only mt-4 border-t border-border pt-3">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Confidencial — uso interno do conselho. Dados agregados (k≥5).</span>
            <span>Gerado pelo 4 Lentes VitalOS™ · VitalOS</span>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function HeroMetric({ metric, delay }: { metric: PanoramaMetric; delay: number }) {
  const trendIcon = metric.trend === "up" ? "▲" : metric.trend === "down" ? "▼" : "";
  const trendColor =
    metric.trend === "up"
      ? "text-emerald-600 dark:text-emerald-400"
      : metric.trend === "down"
        ? "text-red-600 dark:text-red-400"
        : "text-muted-foreground";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="rounded-2xl border border-border/60 bg-card p-4"
    >
      <p className="text-xs text-muted-foreground">{metric.label}</p>
      <p className="mt-1 flex items-baseline gap-1.5 font-serif text-3xl text-foreground">
        {metric.value}
        {trendIcon && (
          <span aria-hidden className={`text-xs ${trendColor}`}>
            {trendIcon}
          </span>
        )}
      </p>
      {metric.sub && (
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{metric.sub}</p>
      )}
    </motion.div>
  );
}

// Ícone por cético — reforça a leitura de board (quem está perguntando).
const SKEPTIC_ICON: Record<string, LucideIcon> = {
  chro: Users,
  cfo: Landmark,
  auditor: ShieldCheck,
  colaborador: Heart,
  investidor: TrendingUp,
};

// Prova de Ciclo lida pelos cinco céticos — cada dúvida, um número real (Board Brief).
// Prova de Ciclo REAL desta organização (Cofre de Ciclos, S6.75) — composição
// direta de loadCycleHistory, sem inventar dado novo. Só CHRO/CFO/Auditor são
// respondidos aqui: Colaborador é invariante de arquitetura (k-anon sempre) e
// Investidor/Selo exigem IVO/participação/consentimento reais, ainda fora do
// escopo real (ver /evolucao-nr1 § Cofre de Ciclos e a memória do sprint).
function RealCycleProofCard({
  result,
  loading,
}: {
  result: LoadCycleHistoryResult | null;
  loading: boolean;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="rounded-2xl border border-primary/25 bg-primary/5 p-5 shadow-sm print:break-inside-avoid"
    >
      <h2 className="font-serif text-base text-foreground">
        Prova de Ciclo real desta organização
      </h2>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Composta do Cofre de Ciclos — cápsulas seladas que sua equipe registrou como ciclo.
      </p>

      {loading && !result && (
        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Carregando…
        </p>
      )}

      {result && result.cloudReady && "registeredCycles" in result && (
        <>
          {result.registeredCycles.length < 2 || !result.proof ? (
            <p className="mt-3 text-xs text-muted-foreground">
              {result.registeredCycles.length === 0
                ? "Nenhum ciclo registrado ainda. "
                : `${result.registeredCycles.length} ciclo registrado — falta ao menos mais 1. `}
              Registre cápsulas seladas de COPSOQ em{" "}
              <Link to="/evolucao-nr1" className="underline underline-offset-2">
                Reavaliação NR-1 · Cofre de Ciclos
              </Link>
              .
            </p>
          ) : (
            <p className="mt-3 text-sm leading-relaxed text-foreground">{result.proof.headline}</p>
          )}

          <ul className="mt-4 space-y-2">
            <li className="flex items-start gap-3 rounded-xl border border-border/50 bg-card px-3.5 py-2.5">
              <Users className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-card-foreground">CHRO</p>
                <p className="text-xs text-muted-foreground">
                  {result.proof
                    ? `Medição viva em ${result.proof.cycleCount} ciclos: ${result.proof.improvedDimensions} melhoraram, ${result.proof.worsenedDimensions} pioraram.`
                    : "Ainda sem ciclos suficientes para leitura longitudinal."}
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3 rounded-xl border border-border/50 bg-card px-3.5 py-2.5">
              <Landmark className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-card-foreground">CFO</p>
                <p className="text-xs text-muted-foreground">
                  {result.proof && result.proof.preventionRoi
                    ? `Custo de prevenção evitado estimado: R$ ${result.proof.preventionRoi.avoidedCostYear.toLocaleString("pt-BR")}/ano.`
                    : "Sem redução atribuível medida ainda — sem custo evitado a declarar."}
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3 rounded-xl border border-border/50 bg-card px-3.5 py-2.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-card-foreground">Auditor NR-1</p>
                <p className="text-xs text-muted-foreground">
                  {result.proof
                    ? `${result.proof.interventionsWithEffect} intervenção(ões) com efeito atribuível medido.`
                    : "Domínio B ainda sem eficácia comprovada."}
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3 rounded-xl border border-dashed border-border/50 bg-muted/20 px-3.5 py-2.5">
              <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-muted-foreground">Investidor · Selo</p>
                <p className="text-xs text-muted-foreground">
                  Pendente — exige IVO, participação e consentimento reais desta organização,
                  ainda não computados. Não afirmado até existir.
                </p>
              </div>
            </li>
          </ul>
        </>
      )}

      <p className="mt-4 border-t border-primary/20 pt-3 text-[11px] leading-relaxed text-muted-foreground">
        Associação orientativa (indicativa), nunca causalidade; custos são estimativas com fórmula
        visível; agregados protegidos por k-anonimato.
      </p>
    </motion.section>
  );
}

// Brief executivo REAL (E4, S8): o mesmo corpo visual do BoardBriefCard, com o
// cabeçalho declarando a fonte (Cofre de Ciclos DESTA org) — compor, não duplicar.
function RealBoardBriefCard({ brief }: { brief: BoardBrief }) {
  return (
    <BoardBriefCard
      brief={brief}
      isRealMode={false}
      heading="Board Brief REAL · os cinco céticos"
      subtitle="Sobre os ciclos registrados no Cofre DESTA organização — o relatório executivo com dado real, não referência de setor."
    />
  );
}

function BoardBriefCard({
  brief,
  isRealMode,
  heading,
  subtitle,
}: {
  brief: BoardBrief;
  isRealMode: boolean;
  heading?: string;
  subtitle?: string;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm print:break-inside-avoid"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-serif text-base text-foreground">
            {heading ??
              `Prova de Ciclo · os cinco céticos${isRealMode ? " (leitura de referência do setor)" : ""}`}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {subtitle ??
              (isRealMode
                ? "Histórico compartilhado de demonstração — a Prova de Ciclo REAL desta organização está no card acima."
                : "Cada dúvida do board, respondida por um número real do arco — não por marketing.")}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          {brief.satisfiedCount}/5 com evidência · Selo {brief.sealTierLabel}
        </span>
      </div>

      <ul className="mt-5 space-y-2.5">
        {brief.skeptics.map((s) => {
          const Icon = SKEPTIC_ICON[s.id] ?? Users;
          return (
            <li
              key={s.id}
              className={`relative flex items-start gap-3.5 overflow-hidden rounded-xl border px-4 py-3.5 transition-colors ${s.satisfied
                ? "border-emerald-300/50 bg-emerald-50/40 dark:border-emerald-800/40 dark:bg-emerald-950/20"
                : "border-border/50 bg-muted/20"
                }`}
            >
              <span
                aria-hidden
                className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full ${s.satisfied ? "bg-emerald-500/70" : "bg-border"
                  }`}
              />
              <span
                aria-hidden
                className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full ring-1 ${s.satisfied
                  ? "bg-emerald-100 text-emerald-700 ring-emerald-300/60 dark:bg-emerald-900/40 dark:text-emerald-200 dark:ring-emerald-700/50"
                  : "bg-card text-muted-foreground ring-border/60"
                  }`}
              >
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-sm font-semibold text-card-foreground">{s.persona}</span>
                  {s.satisfied && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm dark:bg-emerald-600">
                      <Check className="h-3 w-3" strokeWidth={3} aria-hidden /> evidência
                    </span>
                  )}
                  <span className="text-xs italic text-muted-foreground">“{s.doubt}”</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.answer}</p>
                <p className="mt-2 font-serif text-base tabular-nums tracking-tight text-foreground">
                  {s.metric}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 border-t border-border/40 pt-3 text-[11px] leading-relaxed text-muted-foreground">
        {brief.disclaimer}
      </p>
    </motion.section>
  );
}
