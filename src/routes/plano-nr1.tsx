// /plano-nr1 — PGR Psicossocial: o eixo TRANSFORMAR da lane NR-1. Compõe o pgr-engine (puro):
// da exposição COPSOQ medida ao programa de gestão de risco no formato NR-01 — inventário de
// riscos classificados (matriz probabilidade × severidade) e medidas de controle na hierarquia
// (eliminação → organização → administrativa → monitoramento) com responsável, prazo e status.
// Printável (relatório). Honestidade: educativo, não substitui o PGR formal; age na organização
// do trabalho, nunca culpa a pessoa exposta.
//
// REAL vs. DEMO (mutuamente exclusivo, mesmo idioma de /plano-acao e /espelho): com sessão de
// org real, o PGR nasce do Plano Vivo real (pgr-document-real.server.ts) — nunca do setor-persona
// de demonstração, que não tem relação com a organização logada. `PgrSummaryGrid`/`PgrRiskInventory`
// são compartilhados entre os dois caminhos — mesma leitura visual, dado diferente.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleDot,
  Clock,
  Download,
  Loader2,
  MessageCircle,
  Printer,
  ShieldCheck,
  Target,
  TrendingDown,
} from "lucide-react";
import { AppShell } from "@/app/shell/AppShell";
import {
  buildPgrPlan,
  HORIZON_LABEL,
  PROBABILITY_LABEL,
  RISK_LABEL,
  DECISION_LABEL,
  PRIORITY_LABEL,
  SEVERITY_LABEL,
  STATUS_LABEL,
  TIER_LABEL,
  type ControlTier,
  type MeasureStatus,
  type PgrPlan,
  type RiskDecision,
  type RiskLevel,
} from "@/engine/nr1/pgr-engine";
import { NR1_CROSSWALK } from "@/mocks/nr1-crosswalk-mock";
import { PGR_INTRO } from "@/mocks/pgr-nr1-mock";
import { useSectorNR1 } from "@/hooks/use-sector-nr1";
import { usePack } from "@/engine/pack";
import { useRealOrgSession, type RealOrgSession } from "@/app/identity/useRealOrgSession";
import { supabase } from "@/integrations/supabase/client";
import { isCloudReady } from "@/lib/cloud/supabase-client";
import { getSectorPgrDocument, loadRealPgrDocument, type LoadRealPgrDocumentResult } from "@/lib/api/pgr-document.functions";

export const Route = createFileRoute("/plano-nr1")({
  head: () => ({ meta: [{ title: "PGR Psicossocial — 4 Lentes VitalOS™" }] }),
  component: PgrPage,
});

const RISK_TINT: Record<RiskLevel, string> = {
  critico: "border-red-400/50 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  alto: "border-orange-400/50 bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
  moderado: "border-amber-400/50 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300",
  baixo: "border-emerald-400/50 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300",
};

const RISK_BAR: Record<RiskLevel, string> = {
  critico: "bg-red-500",
  alto: "bg-orange-500",
  moderado: "bg-amber-500",
  baixo: "bg-emerald-500",
};

const TIER_TINT: Record<ControlTier, string> = {
  eliminacao: "border-primary/30 bg-primary/[0.06] text-primary",
  organizacao: "border-primary/20 bg-primary/[0.04] text-primary",
  administrativa: "border-border/60 bg-muted/50 text-muted-foreground",
  monitoramento: "border-border/50 bg-muted/40 text-muted-foreground",
};

const DECISION_TINT: Record<RiskDecision, string> = {
  acao_imediata: "border-red-400/50 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  adotar_acoes: "border-amber-400/50 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300",
  tolerável: "border-emerald-400/50 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300",
};

const STATUS_ICON: Record<MeasureStatus, typeof CheckCircle2> = {
  implementada: CheckCircle2,
  em_andamento: CircleDot,
  planejada: Clock,
};

const STATUS_TINT: Record<MeasureStatus, string> = {
  implementada: "text-emerald-600 dark:text-emerald-400",
  em_andamento: "text-amber-600 dark:text-amber-400",
  planejada: "text-muted-foreground",
};

async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

// ─── Compartilhado entre demo e real: mesma leitura visual, plan diferente ───

function PgrSummaryGrid({ plan }: { plan: PgrPlan }) {
  const coveragePct = Math.round(plan.summary.coverage * 100);
  return (
    <>
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.08 }}
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        <SummaryStat label="Riscos priorizados" value={String(plan.summary.total)} />
        <SummaryStat
          label="Críticos / Altos"
          value={`${plan.summary.critico} / ${plan.summary.alto}`}
          tint="text-orange-600 dark:text-orange-400"
        />
        <SummaryStat label="Medidas de controle" value={String(plan.summary.measuresTotal)} />
        <SummaryStat label="Execução do ciclo" value={`${coveragePct}%`} tint="text-primary" />
      </motion.section>

      <div className="rounded-2xl border border-border/60 bg-card p-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {plan.summary.measuresImplemented} de {plan.summary.measuresTotal} medidas implementadas
          </span>
          <span className="tabular-nums">{coveragePct}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${coveragePct}%` }}
            aria-label={`Execução do ciclo: ${coveragePct}%`}
          />
        </div>
      </div>
    </>
  );
}

function PgrRiskInventory({ plan }: { plan: PgrPlan }) {
  if (plan.risks.length === 0) {
    return (
      <div className="rounded-3xl border border-border/60 bg-card/50 p-8 text-center">
        <p className="font-serif text-xl text-foreground">Sem exposição priorizável no ciclo</p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          Nenhuma dimensão COPSOQ visível atingiu nível que exija plano de controle. Mantenha o
          monitoramento e reavalie no próximo ciclo de medição.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {plan.risks.map((risk, i) => (
        <motion.article
          key={risk.driverId}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.12 + i * 0.05 }}
          className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm"
        >
          {/* Cabeçalho do risco */}
          <div className="border-b border-border/60 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Risco {i + 1} · {risk.macroLayer}
                  </span>
                </div>
                <h2 className="mt-1 font-serif text-2xl text-foreground">{risk.label}</h2>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${RISK_TINT[risk.riskLevel]}`}
                >
                  Risco {RISK_LABEL[risk.riskLevel]}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Prob. {PROBABILITY_LABEL[risk.probability]} × Sev. {SEVERITY_LABEL[risk.severity]}
                </span>
              </div>
            </div>

            {/* Classificação NR-1: prioridade · prazo · decisão (Guia MTE 2026, Quadro 5 / 11.6) */}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
              <span className="rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 text-muted-foreground">
                Prioridade {PRIORITY_LABEL[risk.priority]}
              </span>
              <span className="rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 text-muted-foreground">
                Prazo: {risk.deadlineLabel}
              </span>
              <span className={`rounded-md border px-2 py-0.5 font-medium ${DECISION_TINT[risk.decision]}`}>
                {DECISION_LABEL[risk.decision]}
              </span>
            </div>

            {/* Exposição medida */}
            {risk.topDimension && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Exposição medida · {risk.topDimension.label}</span>
                  <span className="tabular-nums">{risk.topDimension.load}/100</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${RISK_BAR[risk.riskLevel]}`}
                    style={{ width: `${risk.topDimension.load}%` }}
                    aria-label={`Exposição ${risk.topDimension.label}: ${risk.topDimension.load} de 100`}
                  />
                </div>
              </div>
            )}

            {risk.hypothesis && (
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {risk.hypothesis}
                {risk.evidence && (
                  <span className="ml-1 text-xs italic text-muted-foreground/80">— {risk.evidence}</span>
                )}
              </p>
            )}
          </div>

          {/* Medidas de controle */}
          <div className="divide-y divide-border/50">
            {risk.measures.map((m, j) => {
              const Icon = STATUS_ICON[m.status];
              return (
                <div key={j} className="flex items-start gap-3 p-4 sm:px-5">
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${STATUS_TINT[m.status]}`} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${TIER_TINT[m.tier]}`}
                      >
                        {TIER_LABEL[m.tier]}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {HORIZON_LABEL[m.horizon]} · semana {m.dueWeek}
                      </span>
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {STATUS_LABEL[m.status]}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-card-foreground">{m.action}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Target className="h-3 w-3" aria-hidden /> {m.responsible}
                      </span>
                      {m.evidence && <span className="italic">{m.evidence}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Rodapé do risco: residual + atalhos */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 bg-muted/30 px-5 py-3">
            <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              Risco residual estimado:
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-semibold ${RISK_TINT[risk.residual]}`}
              >
                {RISK_LABEL[risk.residual]}
              </span>
            </span>
            <div className="flex items-center gap-3 print:hidden">
              <Link
                to="/driver/$driverId"
                params={{ driverId: risk.driverId }}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Mundo do driver <ArrowRight className="h-3 w-3" aria-hidden />
              </Link>
              <Link
                to="/copilota"
                search={{ driver: risk.driverId }}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <MessageCircle className="h-3 w-3" aria-hidden /> Mentor
              </Link>
            </div>
          </div>
        </motion.article>
      ))}

      {plan.hiddenRiskCount > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          + {plan.hiddenRiskCount}{" "}
          {plan.hiddenRiskCount === 1 ? "driver exposto adicional" : "drivers expostos adicionais"} em
          monitoramento, abaixo do limite de priorização deste ciclo.
        </p>
      )}
    </div>
  );
}

// ─── PGR real (dossiê visível): Plano Vivo real → PGR real → dossiê auditável ───
// null quando não há Plano Vivo ativo — o PGR real nasce do Plano Vivo (Transformar),
// nunca é fabricado só a partir da exposição.

function RealPgrView({ org }: { org: RealOrgSession }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LoadRealPgrDocumentResult | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const fetchDocument = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setError("Sessão expirada. Faça login novamente.");
        return;
      }
      const r = await loadRealPgrDocument({ data: { accessToken, instrument: "COPSOQ" } });
      setResult(r);
    } catch {
      setError("Erro ao carregar o PGR real.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocument();
  }, [fetchDocument]);

  const bundle = result && result.cloudReady && "document" in result ? result.document : undefined;

  async function handleDownload() {
    if (!bundle) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      const { downloadPgrDocumentPdf } = await import("@/lib/pdf/pgr-document-pdf");
      downloadPgrDocumentPdf(
        bundle.document,
        bundle.plan,
        bundle.reavaliacao,
        `pgr-dossie-${org.orgName.toLowerCase().replace(/\s+/g, "-")}.pdf`,
      );
    } catch {
      setDownloadError("Erro ao gerar o dossiê em PDF.");
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Carregando o PGR real…
      </p>
    );
  }

  if (error || (result && result.cloudReady && "error" in result)) {
    const message = error ?? (result && "error" in result ? result.error : "Erro desconhecido.");
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
        <p className="text-sm text-destructive">{message}</p>
        <button
          type="button"
          onClick={fetchDocument}
          className="mt-3 rounded-lg border border-border/60 bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!result || !result.cloudReady) {
    return (
      <p className="rounded-2xl border border-border/70 bg-card p-5 text-sm text-muted-foreground">
        Lovable Cloud não está ativo.
      </p>
    );
  }

  if (!bundle) {
    return (
      <div className="rounded-3xl border border-border/60 bg-card/50 p-8 text-center">
        <p className="font-serif text-xl text-foreground">Nenhum Plano Vivo ativo ainda</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          O PGR real nasce do Plano Vivo (Transformar) — cada ação classificada na hierarquia NR-01
          vira uma medida de controle real neste programa. Ative um plano de ação para começar.
        </p>
        <Link
          to="/plano-acao"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          Ir para o Plano Vivo <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    );
  }

  const { plan, hasReavaliacao } = bundle;
  const generated = new Date(plan.generatedAt + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <motion.header initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-primary">
          <ShieldCheck className="h-4 w-4" aria-hidden />
          Dossiê GRO/PGR real desta organização
        </div>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl text-foreground sm:text-4xl">{org.orgName}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Programa derivado do Plano Vivo real desta organização — inventário, medidas e
              eficácia, ambos construídos a partir de dado real, nunca de perfil de demonstração.
            </p>
          </div>
          <button
            type="button"
            disabled={downloading}
            onClick={handleDownload}
            className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50 print:hidden"
          >
            <Download className="h-4 w-4" aria-hidden /> {downloading ? "Gerando…" : "Baixar dossiê PDF"}
          </button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Gerado em {generated} {hasReavaliacao && "· inclui reavaliação longitudinal (≥ 2 ciclos)"}
        </p>
      </motion.header>

      {downloadError && (
        <p className="rounded-xl border border-amber-400/40 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          {downloadError}
        </p>
      )}

      <PgrSummaryGrid plan={plan} />
      <PgrRiskInventory plan={plan} />

      {!hasReavaliacao && plan.risks.length > 0 && (
        <p className="flex items-start gap-1.5 rounded-xl border border-border/50 bg-muted/30 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          Registre pelo menos 2 ciclos no Cofre de Ciclos para o dossiê incluir a reavaliação
          longitudinal (antes/depois).
        </p>
      )}

      <Link
        to="/evolucao-nr1"
        className="flex items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/[0.03] px-5 py-4 transition hover:bg-primary/[0.06] print:hidden"
      >
        <div>
          <p className="flex items-center gap-1.5 text-sm font-medium text-card-foreground">
            <TrendingDown className="h-4 w-4 text-primary" aria-hidden /> Acompanhar a evolução
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Reavaliação NR-1 real: a exposição caiu depois das medidas? Veja o antes/depois por ciclo.
          </p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-primary" aria-hidden />
      </Link>

      <div className="rounded-2xl border border-border/50 bg-muted/30 p-4">
        <p className="text-xs leading-relaxed text-muted-foreground">{plan.disclaimer}</p>
      </div>
    </>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

function PgrPage() {
  const { packId, sectorLabel } = usePack();
  const { exposure, measures } = useSectorNR1();
  const { loading: orgLoading, org: realOrg } = useRealOrgSession();
  const isRealMode = isCloudReady() && !!realOrg;

  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const plan = useMemo(
    () =>
      buildPgrPlan({
        registry: NR1_CROSSWALK,
        exposures: exposure,
        measures,
        generatedAt: NR1_CROSSWALK.updatedAt,
        currentWeek: 6,
        horizonWeeks: 13,
        topRisks: 5,
      }),
    [exposure, measures],
  );

  const generated = new Date(plan.generatedAt + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  async function handleDownloadDemo() {
    setDownloading(true);
    setDownloadError(null);
    try {
      const [{ document }, { downloadPgrDocumentPdf }, { getCapsuleHistory }, { buildLongitudinalReading }] =
        await Promise.all([
          getSectorPgrDocument({ data: { packId, sectorLabel } }),
          import("@/lib/pdf/pgr-document-pdf"),
          import("@/mocks/capsule-history-mock"),
          import("@/engine/ai/capsule-longitudinal-engine"),
        ]);
      const history = getCapsuleHistory(packId, "COPSOQ");
      const longitudinal = history.length >= 2 ? buildLongitudinalReading({ capsules: history }) : null;
      downloadPgrDocumentPdf(
        document,
        plan,
        longitudinal?.ok ? longitudinal.reading : undefined,
        `pgr-dossie-${packId}.pdf`,
      );
    } catch {
      setDownloadError("Erro ao gerar o dossiê em PDF.");
    } finally {
      setDownloading(false);
    }
  }

  if (orgLoading) {
    return (
      <AppShell>
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Carregando…
          </p>
        </div>
      </AppShell>
    );
  }

  if (isRealMode && realOrg) {
    return (
      <AppShell>
        <div className="mx-auto max-w-4xl space-y-7 px-4 py-8 sm:px-6">
          <RealPgrView org={realOrg} />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-7 px-4 py-8 sm:px-6">
        {/* Hero */}
        <motion.header initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-primary">
            <ShieldCheck className="h-4 w-4" aria-hidden />
            {PGR_INTRO.eyebrow}
          </div>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-serif text-3xl text-foreground sm:text-4xl">{PGR_INTRO.title}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {PGR_INTRO.subtitle}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2 print:hidden">
              <button
                type="button"
                disabled={downloading}
                onClick={handleDownloadDemo}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border/60 bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-50"
              >
                <Download className="h-4 w-4" aria-hidden /> {downloading ? "Gerando…" : "Baixar dossiê PDF"}
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border/60 bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
              >
                <Printer className="h-4 w-4" aria-hidden /> Imprimir
              </button>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Gerado em {generated} · Ciclo de {plan.horizonWeeks} semanas · Semana atual {plan.currentWeek}
          </p>
        </motion.header>

        {downloadError && (
          <p className="rounded-xl border border-amber-400/40 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
            {downloadError}
          </p>
        )}

        <PgrSummaryGrid plan={plan} />
        <PgrRiskInventory plan={plan} />

        {/* Ponte para Evoluir */}
        <Link
          to="/evolucao-nr1"
          className="flex items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/[0.03] px-5 py-4 transition hover:bg-primary/[0.06] print:hidden"
        >
          <div>
            <p className="flex items-center gap-1.5 text-sm font-medium text-card-foreground">
              <TrendingDown className="h-4 w-4 text-primary" aria-hidden /> Acompanhar a evolução
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Reavaliação NR-1: a exposição caiu depois das medidas? Veja o antes/depois por ciclo.
            </p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-primary" aria-hidden />
        </Link>

        {/* Disclaimer */}
        <div className="rounded-2xl border border-border/50 bg-muted/30 p-4">
          <p className="text-xs leading-relaxed text-muted-foreground">{plan.disclaimer}</p>
        </div>
      </div>
    </AppShell>
  );
}

function SummaryStat({
  label,
  value,
  tint = "text-foreground",
}: {
  label: string;
  value: string;
  tint?: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <p className={`font-serif text-2xl tabular-nums ${tint}`}>{value}</p>
      <p className="mt-1 text-xs leading-tight text-muted-foreground">{label}</p>
    </div>
  );
}
