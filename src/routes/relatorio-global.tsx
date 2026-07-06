import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { AppShell } from "@/app/shell/AppShell";
import { useIvo, useOrg } from "@/mocks/hooks";
import { deriveEsgReadiness, type PillarScore } from "@/engine/esg/esg-engine";
import { evaluateEvidence } from "@/engine/lab/evidence-engine";
import { certify } from "@/engine/certification/certification-engine";
import {
  buildAnnualEsgReport,
  type EsgDimensionReport,
  type EsgKpi,
  type MaterialityDeclaration,
} from "@/engine/esg-report/esg-report-engine";
import { buildAssuranceAnnex, type AssuranceAnnex } from "@/engine/esg-report/assurance-annex-engine";
import { pillarsFromIvo } from "@/mocks/forecast-mock";
import { ESG_MAPPING } from "@/mocks/esg-mock";
import { FIBT_ORG_RESULT } from "@/mocks/fibt-mock";
import { ORG_VIAT_RESULT } from "@/mocks/viat-mock";
import { EXPERIMENT_CASES } from "@/mocks/experiment-mock";
import { DOMAIN_B_READY } from "@/mocks/certification-mock";
import { CONSENT_CHANNELS } from "@/mocks/consent-mock";
import {
  JOURNEY_QUARTERS,
  METHODOLOGY,
  ODS_LABEL,
  COPSOQ_READINESS,
  REPORT_INTRO,
  formatReportDate,
} from "@/mocks/esg-report-mock";
import { useRealOrgSession } from "@/app/identity/useRealOrgSession";
import { supabase } from "@/integrations/supabase/client";
import { isCloudReady } from "@/lib/cloud/supabase-client";
import { loadLatestOrgCapsule } from "@/lib/api/capsule-report.functions";
import { loadCycleHistory } from "@/lib/api/cycle-history.functions";
import { createEsgSnapshot, loadEsgSnapshots } from "@/lib/api/esg-snapshot.functions";

export const Route = createFileRoute("/relatorio-global")({
  head: () => ({ meta: [{ title: "Relatório Global ESG — 4 Lentes VitalOS™" }] }),
  component: RelatorioGlobalPage,
});

const DIM_COLOR: Record<string, string> = { E: "#16A34A", S: "#2563EB", G: "#CA8A04" };

function fibtDomain(id: string): number {
  return FIBT_ORG_RESULT.domains.find((d) => d.id === id)?.normalized ?? 0;
}

// A organização não vem mais do cliente (P0-04) — o servidor resolve quem é
// o admin de verdade a partir do access_token da própria sessão.
async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

// Temas de materialidade (v1: lista fixa; virá do pack por setor em versão futura).
const MATERIALITY_THEMES = [
  "Saúde psicossocial",
  "Jornada e carga de trabalho",
  "Equidade e inclusão",
  "Governança e integridade",
] as const;

function RelatorioGlobalPage() {
  const { current, previous, delta } = useIvo();
  const org = useOrg();

  const report = useMemo(() => {
    if (!current) return null;
    const pillars = pillarsFromIvo(current);

    const toScore = (p: (typeof pillars)[number]): PillarScore => ({
      pillarId: p.pillarId,
      name: p.name,
      score: p.score,
      visible: p.visible,
    });
    const esgReadiness = deriveEsgReadiness(pillars.map(toScore), ESG_MAPPING).overallScore;
    const pillarScore = (id: string) => pillars.find((p) => p.pillarId === id)?.score ?? 0;
    const trend: EsgKpi["trend"] = delta > 0 ? "up" : delta < 0 ? "down" : "flat";

    // KPIs por dimensão — cada um rastreável ao instrumento + ODS.
    const kpis: EsgKpi[] = [
      // ── Ambiental ──
      {
        id: "fibt-ambiente",
        label: "Responsabilidade ambiental (FIB-T)",
        valueNorm: fibtDomain("meio_ambiente") * 10,
        display: `${fibtDomain("meio_ambiente")} / 100`,
        source: "FIB-T",
        dim: "E",
        ods: "ODS 13",
      },
      // ── Social ──
      {
        id: "ivo-perma",
        label: "Florescimento (IVO / PERMA+V)",
        valueNorm: current.ivoScore,
        display: `${current.ivoScore} / 1000`,
        source: "IVO/PERMA",
        dim: "S",
        ods: "ODS 3",
        trend,
      },
      {
        id: "viat",
        label: "Forças de caráter (VIA-T)",
        valueNorm: Math.round((ORG_VIAT_RESULT.globalAvg ?? 0) * 100),
        display: `${ORG_VIAT_RESULT.globalAvg ?? "—"} / 10`,
        source: "VIA-T",
        dim: "S",
        ods: "ODS 4",
      },
      {
        id: "fibt-saude",
        label: "Saúde e vitalidade (FIB-T)",
        valueNorm: fibtDomain("saude") * 10,
        display: `${fibtDomain("saude")} / 100`,
        source: "FIB-T",
        dim: "S",
        ods: "ODS 3",
      },
      {
        id: "fibt-padrao",
        label: "Padrão de vida digno (FIB-T)",
        valueNorm: fibtDomain("padrao_vida") * 10,
        display: `${fibtDomain("padrao_vida")} / 100`,
        source: "FIB-T",
        dim: "S",
        ods: "ODS 8",
      },
      {
        id: "copsoq",
        label: "Segurança psicossocial (COPSOQ/NR-1)",
        valueNorm: COPSOQ_READINESS,
        display: `${COPSOQ_READINESS} / 1000`,
        source: "COPSOQ",
        dim: "S",
        ods: "ODS 8",
      },
      // ── Governança ──
      {
        id: "fibt-gov",
        label: "Governança percebida (FIB-T)",
        valueNorm: fibtDomain("governanca") * 10,
        display: `${fibtDomain("governanca")} / 100`,
        source: "FIB-T",
        dim: "G",
        ods: "ODS 16",
      },
      {
        id: "ivo-justica",
        label: "Justiça e coerência (IVO)",
        valueNorm: pillarScore("justica_coerencia"),
        display: `${pillarScore("justica_coerencia")} / 1000`,
        source: "IVO",
        dim: "G",
        ods: "ODS 16",
      },
    ];

    // Prova: experimentos + selo (compõe evidence + certification).
    const concluded = EXPERIMENT_CASES.filter((c) => c.status === "concluido" && c.observed);
    const verdicts = concluded.map((c) => evaluateEvidence(c.observed!));
    const confirmed = verdicts.filter(
      (v) => v.verdict === "confirmado" || v.verdict === "superou",
    ).length;
    const consentCoverage = CONSENT_CHANNELS.find((c) => c.id === "pulses")?.orgConsentPct ?? 0;
    const cert = certify({
      ivoScore: current.ivoScore,
      previousIvoScore: previous?.ivoScore ?? 0,
      participationPct: org.participationPct,
      experimentsConfirmed: confirmed,
      domainBReady: DOMAIN_B_READY,
      consentCoveragePct: consentCoverage,
      kAnonRespected: true,
    });

    return buildAnnualEsgReport({
      year: 2026,
      orgName: org.name,
      kpis,
      journey: JOURNEY_QUARTERS,
      proof: {
        experimentsConcluded: verdicts.length,
        experimentsConfirmed: confirmed,
        sealLabel: cert.tierLabel,
        sealGranted: cert.granted,
      },
      methodology: METHODOLOGY,
      overallReadiness: esgReadiness,
    });
  }, [current, previous, delta, org.participationPct, org.name]);

  // ─── Anexo de Asseguração (I-E1) — só existe com sessão de org real ─────────
  const cloudActive = isCloudReady();
  const { org: realOrg } = useRealOrgSession();
  const isRealMode = cloudActive && !!realOrg;

  const [annexLoading, setAnnexLoading] = useState(false);
  const [annexError, setAnnexError] = useState<string | null>(null);
  const [realKpi, setRealKpi] = useState<EsgKpi | null>(null);
  const [registeredCycleCount, setRegisteredCycleCount] = useState(0);
  const [snapshots, setSnapshots] = useState<Array<{ id: string; contentHash: string; generatedAt: string }>>([]);
  const [materiality, setMateriality] = useState<Record<string, { impact: number; financial: number; role: string }>>(
    {},
  );
  const [savingSnapshot, setSavingSnapshot] = useState(false);

  const fetchAssuranceData = useCallback(async () => {
    if (!isRealMode) return;
    setAnnexLoading(true);
    setAnnexError(null);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setAnnexError("Sessão expirada. Faça login novamente.");
        return;
      }

      const [capsuleResult, cycleResult, snapshotsResult] = await Promise.all([
        loadLatestOrgCapsule({ data: { accessToken } }),
        loadCycleHistory({ data: { accessToken, instrument: "COPSOQ" } }),
        loadEsgSnapshots({ data: { accessToken } }),
      ]);

      if (capsuleResult.found) {
        const dims = Object.values(capsuleResult.dimensions);
        const avgHighRisk = dims.length ? dims.reduce((s, d) => s + d.high_risk_pct, 0) / dims.length : 0;
        const readiness = Math.max(0, Math.min(1000, Math.round(1000 - avgHighRisk * 10)));

        let trend: EsgKpi["trend"] | undefined;
        const cycleCount =
          cycleResult.cloudReady && "registeredCycles" in cycleResult
            ? cycleResult.registeredCycles.length
            : 0;
        if (cycleCount >= 2 && cycleResult.cloudReady && "proof" in cycleResult && cycleResult.proof) {
          trend =
            cycleResult.proof.overallDirection === "melhorando"
              ? "up"
              : cycleResult.proof.overallDirection === "piorando"
                ? "down"
                : "flat";
        }
        setRegisteredCycleCount(cycleCount);

        setRealKpi({
          id: "copsoq-real",
          label: "Segurança psicossocial (COPSOQ/NR-1) — dado real",
          valueNorm: readiness,
          display: `${readiness} / 1000`,
          source: "COPSOQ",
          dim: "S",
          ods: "ODS 8",
          trend,
          lineage: {
            instrument: "COPSOQ",
            waveId: capsuleResult.waveId,
            capsuleId: capsuleResult.id,
            n: capsuleResult.participantCount,
            kAnonStatus: "ok",
            formula: "1000 − (média do high_risk_pct das dimensões × 10)",
          },
        });
      } else {
        setRealKpi(null);
      }

      if (snapshotsResult.cloudReady && "snapshots" in snapshotsResult) {
        setSnapshots(snapshotsResult.snapshots);
      }
    } catch {
      setAnnexError("Erro ao carregar o Anexo de Asseguração.");
    } finally {
      setAnnexLoading(false);
    }
  }, [isRealMode]);

  useEffect(() => {
    fetchAssuranceData();
  }, [fetchAssuranceData]);

  const materialityDeclarations: MaterialityDeclaration[] = useMemo(
    () =>
      Object.entries(materiality)
        .filter(([, v]) => v.role.trim())
        .map(([theme, v]) => ({
          theme,
          impactRelevance: v.impact,
          financialRelevance: v.financial,
          declaredByRole: v.role,
          declaredAt: new Date().toISOString().slice(0, 10),
        })),
    [materiality],
  );

  const annex: AssuranceAnnex | null = useMemo(() => {
    if (!realKpi) return null;
    return buildAssuranceAnnex([realKpi], materialityDeclarations, registeredCycleCount);
  }, [realKpi, materialityDeclarations, registeredCycleCount]);

  async function handleGenerateSnapshot() {
    if (!annex || savingSnapshot) return;
    setSavingSnapshot(true);
    setAnnexError(null);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setAnnexError("Sessão expirada. Faça login novamente.");
        return;
      }
      const result = await createEsgSnapshot({
        data: {
          accessToken,
          year: new Date().getFullYear(),
          payload: {
            orgName: realOrg?.orgName ?? "Organização",
            generatedAt: new Date().toISOString(),
            realKpis: annex.publishedKpis,
            gapKpis: annex.gapKpis,
            materiality: materialityDeclarations,
            checks: annex.checks,
            allChecksPassed: annex.allChecksPassed,
            readyForAssuranceNote: annex.readyForAssuranceNote,
          },
        },
      });
      if (!result.accepted) {
        setAnnexError(result.reason ?? "Erro ao gerar o snapshot.");
        return;
      }
      await fetchAssuranceData();
    } catch {
      setAnnexError("Erro ao gerar o snapshot.");
    } finally {
      setSavingSnapshot(false);
    }
  }

  if (!report) {
    return (
      <AppShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <p className="animate-pulse text-muted-foreground">Consolidando o ano…</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-7 px-4 py-8 sm:px-6 print:max-w-none print:px-0 print:py-0 print:space-y-5">
        {/* Capa do documento — só na impressão (1ª folha A4) */}
        <section
          className="print-only print-cover"
          aria-hidden
          style={{ minHeight: "calc(100vh - 38mm)" }}
        >
          <div className="flex h-full min-h-[230mm] flex-col justify-between py-10">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded bg-primary font-serif text-2xl text-primary-foreground">
                4
              </span>
              <span className="text-sm font-medium tracking-wide text-foreground">
                4 Lentes VitalOS™ · VitalOS
              </span>
            </div>

            <div className="mx-auto max-w-xl text-center">
              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                {REPORT_INTRO.eyebrow}
              </p>
              <h1 className="mt-4 font-serif text-4xl leading-tight text-foreground">
                {REPORT_INTRO.title}
              </h1>
              <p className="mt-6 text-base text-foreground">{report.orgName}</p>
              <p className="mt-1 text-sm text-muted-foreground">Ano {report.year}</p>
              <div className="mx-auto mt-10 h-px w-24 bg-border" />
              <p className="mt-6 text-[11px] uppercase tracking-[0.22em] text-primary">
                Confidencial — uso interno do conselho
              </p>
            </div>

            <div className="flex items-end justify-between text-[10px] text-muted-foreground">
              <span>Emitido em {formatReportDate()}</span>
              <span>{REPORT_INTRO.generatedBy}</span>
            </div>
          </div>
        </section>

        {/* Timbre institucional — só na impressão (cabeçalho do documento) */}
        <div className="print-only mb-4 border-b border-border pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded bg-primary font-serif text-sm text-primary-foreground">
                4
              </span>
              <span className="text-sm font-medium text-foreground">4 Lentes VitalOS™</span>
            </div>
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {REPORT_INTRO.kicker}
            </span>
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            {report.orgName} · Relatório Global ESG {report.year} · Emitido em {formatReportDate()}
          </p>
        </div>

        {/* Capa */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="rounded-2xl border border-border/70 bg-gradient-to-br from-card to-muted/30 p-6 shadow-sm sm:p-8"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {REPORT_INTRO.eyebrow}
              </p>
              <h1 className="mt-1 font-serif text-3xl text-foreground">{REPORT_INTRO.title}</h1>
              <p className="mt-1 text-xs text-muted-foreground">
                {report.orgName} · Ano {report.year}
              </p>
            </div>
            <button
              onClick={() => window.print()}
              title={REPORT_INTRO.printHint}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground print:hidden"
            >
              <span aria-hidden>⤓</span> Exportar PDF do conselho
            </button>
          </div>

          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {REPORT_INTRO.lead}
          </p>

          <div className="mt-5 flex flex-wrap items-end gap-6 border-t border-border/50 pt-5">
            <div>
              <p className="text-xs text-muted-foreground">Prontidão ESG social</p>
              <div className="flex items-baseline gap-2">
                <span className="font-serif text-5xl font-semibold text-foreground">
                  {report.overallReadiness ?? "—"}
                </span>
                <span className="text-sm text-muted-foreground">/ 1000</span>
              </div>
              {report.overallBandLabel && (
                <span className="text-sm font-medium text-primary">{report.overallBandLabel}</span>
              )}
            </div>
            <p className="max-w-md text-base leading-relaxed text-foreground">{report.headline}</p>
          </div>

          {/* ODS cobertos */}
          {report.odsCovered.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {report.odsCovered.map((o) => (
                <span
                  key={o}
                  className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
                  title={ODS_LABEL[o]}
                >
                  {o} · {ODS_LABEL[o]}
                </span>
              ))}
            </div>
          )}
        </motion.section>

        {/* Jornada anual */}
        <section>
          <h2 className="mb-3 font-serif text-xl text-foreground">A jornada de 12 meses</h2>
          <div className="grid gap-3 sm:grid-cols-4">
            {report.journey.map((q, i) => (
              <div
                key={q.quarter}
                className="relative rounded-2xl border border-border/60 bg-card p-4"
              >
                {i < report.journey.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute right-[-10px] top-7 hidden text-muted-foreground/40 sm:block"
                  >
                    →
                  </span>
                )}
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  {q.quarter}
                </p>
                <p className="mt-1 font-medium text-card-foreground">{q.lensName}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{q.highlight}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Dimensões E / S / G */}
        <section className="space-y-4">
          <h2 className="font-serif text-xl text-foreground">As três dimensões ESG</h2>
          {report.dimensions.map((d) => (
            <DimensionCard key={d.dim} dimension={d} />
          ))}
        </section>

        {/* Anexo de Asseguração (I-E1) — dados reais desta organização */}
        {isRealMode && (
          <AssuranceAnnexSection
            loading={annexLoading}
            error={annexError}
            realKpi={realKpi}
            annex={annex}
            registeredCycleCount={registeredCycleCount}
            snapshots={snapshots}
            materiality={materiality}
            onMaterialityChange={setMateriality}
            onGenerateSnapshot={handleGenerateSnapshot}
            savingSnapshot={savingSnapshot}
          />
        )}

        {/* Prova consolidada */}
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border/60 bg-card p-5">
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
              Transformação comprovada
            </p>
            <p className="mt-1 font-serif text-3xl text-foreground">
              {report.proof.experimentsConfirmed}
              <span className="text-base text-muted-foreground">
                /{report.proof.experimentsConcluded}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">experimentos com efeito medido</p>
            <Link
              to="/experimentos"
              className="mt-2 inline-block text-xs text-primary underline underline-offset-2"
            >
              ver evidências →
            </Link>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card p-5">
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
              Certificação
            </p>
            <p className="mt-1 font-serif text-2xl text-foreground">{report.proof.sealLabel}</p>
            <p className="text-xs text-muted-foreground">
              {report.proof.sealGranted ? "Selo Empresa Viva concedido" : "Selo em jornada"}
            </p>
            <Link
              to="/selo"
              className="mt-2 inline-block text-xs text-primary underline underline-offset-2"
            >
              ver o selo →
            </Link>
          </div>
        </section>

        {/* Metodologia — design instrucional */}
        <section className="break-before rounded-2xl border border-border/60 bg-muted/30 p-5 sm:p-6">
          <h2 className="font-serif text-xl text-foreground">A metodologia, em ciência</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {REPORT_INTRO.methodologyLead}
          </p>
          <div className="mt-4 space-y-2.5">
            {report.methodology.map((m, i) => (
              <div
                key={m.instrument}
                className="flex gap-3 rounded-xl border border-border/50 bg-card p-3.5"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-medium text-card-foreground">{m.instrument}</p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                    {m.measures}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground/80">Base: {m.science}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Honestidade */}
        <div
          className="rounded-r-xl border-l-4 border-amber-400 bg-amber-50/60 px-5 py-4 dark:bg-amber-950/20"
          role="note"
        >
          <p className="text-xs leading-relaxed text-amber-900 dark:text-amber-300">
            {REPORT_INTRO.disclaimer}
          </p>
        </div>

        {/* Rodapé institucional — só na impressão (assinatura do documento) */}
        <div className="print-only mt-4 border-t border-border pt-3">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{REPORT_INTRO.confidential}</span>
            <span>{REPORT_INTRO.generatedBy}</span>
          </div>
        </div>

        {/* Dica de impressão — só na tela */}
        <p className="text-center text-xs text-muted-foreground print:hidden">
          {REPORT_INTRO.printHint}
        </p>

        <p className="text-center text-xs text-muted-foreground print:hidden">
          Cada KPI é derivado e auditável — vem dos motores de{" "}
          <Link to="/ivo" className="underline underline-offset-2 hover:text-foreground">
            IVO
          </Link>
          ,{" "}
          <Link to="/fibt" className="underline underline-offset-2 hover:text-foreground">
            FIB-T
          </Link>
          ,{" "}
          <Link to="/viat" className="underline underline-offset-2 hover:text-foreground">
            VIA-T
          </Link>{" "}
          e{" "}
          <Link to="/esg" className="underline underline-offset-2 hover:text-foreground">
            ESG
          </Link>
          .
        </p>
      </div>
    </AppShell>
  );
}

// Anexo de Asseguração (I-E1, §F) — as 5 regras F3 checadas ao vivo sobre o
// ÚNICO KPI hoje backed por dado real (COPSOQ, via Cofre de Ciclos). Os
// outros 7 KPIs do relatório acima permanecem leitura de referência do setor
// até terem sua própria linhagem real — nunca misturados aqui sem rótulo.
function AssuranceAnnexSection({
  loading,
  error,
  realKpi,
  annex,
  registeredCycleCount,
  snapshots,
  materiality,
  onMaterialityChange,
  onGenerateSnapshot,
  savingSnapshot,
}: {
  loading: boolean;
  error: string | null;
  realKpi: EsgKpi | null;
  annex: AssuranceAnnex | null;
  registeredCycleCount: number;
  snapshots: Array<{ id: string; contentHash: string; generatedAt: string }>;
  materiality: Record<string, { impact: number; financial: number; role: string }>;
  onMaterialityChange: (
    updater: (
      prev: Record<string, { impact: number; financial: number; role: string }>,
    ) => Record<string, { impact: number; financial: number; role: string }>,
  ) => void;
  onGenerateSnapshot: () => void;
  savingSnapshot: boolean;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="rounded-2xl border border-primary/25 bg-primary/5 p-5 sm:p-6 print:break-inside-avoid"
    >
      <h2 className="font-serif text-xl text-foreground">Anexo de Asseguração</h2>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Dados reais desta organização — linhagem completa (onda → cápsula → fórmula),
        materialidade declarada e as 5 regras anti-greenwashing checadas ao vivo. Os demais
        KPIs do relatório acima seguem como leitura de referência do setor.
      </p>

      {loading && !realKpi && (
        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Carregando…
        </p>
      )}

      {error && (
        <p className="mt-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-xs text-destructive">
          {error}
        </p>
      )}

      {!loading && !realKpi && !error && (
        <p className="mt-3 text-xs text-muted-foreground">
          Nenhuma cápsula selada ainda nesta organização — o Anexo aparece assim que a
          primeira onda fechar.
        </p>
      )}

      {realKpi && annex && (
        <>
          {/* Linhagem (F1) */}
          <div className="mt-4 rounded-xl border border-border/50 bg-card p-4">
            <p className="text-sm font-medium text-card-foreground">{realKpi.label}</p>
            <p className="mt-0.5 font-serif text-2xl text-foreground">{realKpi.display}</p>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-muted-foreground sm:grid-cols-4">
              <div>
                <dt className="uppercase tracking-[0.1em]">Onda</dt>
                <dd className="truncate font-mono">{realKpi.lineage?.waveId}</dd>
              </div>
              <div>
                <dt className="uppercase tracking-[0.1em]">Cápsula</dt>
                <dd className="truncate font-mono">{realKpi.lineage?.capsuleId}</dd>
              </div>
              <div>
                <dt className="uppercase tracking-[0.1em]">n</dt>
                <dd>{realKpi.lineage?.n}</dd>
              </div>
              <div>
                <dt className="uppercase tracking-[0.1em]">Fórmula</dt>
                <dd>{realKpi.lineage?.formula}</dd>
              </div>
            </dl>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Ciclos registrados no Cofre: {registeredCycleCount}
              {registeredCycleCount < 2 && " — afirmações de tendência aguardam o 2º ciclo."}
            </p>
          </div>

          {/* Materialidade dupla (F2) */}
          <div className="mt-4 rounded-xl border border-border/50 bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Materialidade dupla declarada
            </p>
            <div className="mt-3 space-y-3">
              {MATERIALITY_THEMES.map((theme) => {
                const v = materiality[theme] ?? { impact: 3, financial: 3, role: "" };
                return (
                  <div key={theme} className="grid gap-2 sm:grid-cols-[1fr_auto_auto_1fr] sm:items-center">
                    <span className="text-xs text-card-foreground">{theme}</span>
                    <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      Impacto
                      <select
                        value={v.impact}
                        onChange={(e) =>
                          onMaterialityChange((prev) => ({
                            ...prev,
                            [theme]: { ...v, impact: Number(e.target.value) },
                          }))
                        }
                        className="rounded-lg border border-border/60 bg-background px-1.5 py-1 text-xs"
                      >
                        {[1, 2, 3, 4, 5].map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </label>
                    <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      Financeira
                      <select
                        value={v.financial}
                        onChange={(e) =>
                          onMaterialityChange((prev) => ({
                            ...prev,
                            [theme]: { ...v, financial: Number(e.target.value) },
                          }))
                        }
                        className="rounded-lg border border-border/60 bg-background px-1.5 py-1 text-xs"
                      >
                        {[1, 2, 3, 4, 5].map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </label>
                    <input
                      value={v.role}
                      onChange={(e) =>
                        onMaterialityChange((prev) => ({ ...prev, [theme]: { ...v, role: e.target.value } }))
                      }
                      placeholder="Papel de quem declara"
                      className="rounded-lg border border-border/60 bg-background px-2 py-1 text-[11px] text-foreground focus:border-primary/50 focus:outline-none"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Regras F3 (anti-greenwashing) */}
          <div className="mt-4 rounded-xl border border-border/50 bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Regras anti-greenwashing (§F3)
              </p>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                  annex.allChecksPassed
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                }`}
              >
                {annex.allChecksPassed ? (
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <ShieldAlert className="h-3.5 w-3.5" aria-hidden />
                )}
                {annex.allChecksPassed ? "Todas as regras atendidas" : "Pendências"}
              </span>
            </div>
            <ul className="mt-3 space-y-2">
              {annex.checks.map((c) => (
                <li key={c.rule} className="flex items-start gap-2 text-xs">
                  {c.passed ? (
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                  ) : (
                    <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
                  )}
                  <div>
                    <span className="font-medium text-card-foreground">{c.label}</span>
                    <p className="text-muted-foreground">{c.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
            {annex.gapKpis.length > 0 && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                {annex.gapKpis.length} indicador(es) sem linhagem completa ficaram nas lacunas —
                medição planejada, ainda não realizada.
              </p>
            )}
          </div>

          <button
            type="button"
            disabled={savingSnapshot}
            onClick={onGenerateSnapshot}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 print:hidden"
          >
            {savingSnapshot ? "Selando…" : "Gerar snapshot imutável"}
          </button>

          {snapshots.length > 0 && (
            <div className="mt-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Snapshots selados
              </p>
              <ul className="mt-1.5 space-y-1">
                {snapshots.slice(0, 5).map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <span>{new Date(s.generatedAt).toLocaleString("pt-BR")}</span>
                    <span className="truncate font-mono">hash {s.contentHash.slice(0, 16)}…</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <p className="mt-4 border-t border-primary/20 pt-3 text-[11px] leading-relaxed text-muted-foreground">
        {annex?.readyForAssuranceNote ??
          "Este relatório organiza evidência com linhagem auditável; não constitui verificação independente."}
      </p>
    </motion.section>
  );
}

function DimensionCard({ dimension }: { dimension: EsgDimensionReport }) {
  const color = DIM_COLOR[dimension.dim]!;
  return (
    <div
      className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm"
      style={{ borderTopColor: color, borderTopWidth: 3 }}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 px-5 py-4">
        <div className="flex items-center gap-3">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white"
            style={{ background: color }}
          >
            {dimension.dim}
          </span>
          <div>
            <p className="font-medium text-card-foreground">{dimension.label}</p>
            <p className="text-xs text-muted-foreground">{dimension.narrative}</p>
          </div>
        </div>
        <div className="text-right">
          <span className="font-serif text-2xl text-foreground">{dimension.score ?? "—"}</span>
          {dimension.bandLabel && (
            <span className="ml-2 text-xs font-medium" style={{ color }}>
              {dimension.bandLabel}
            </span>
          )}
        </div>
      </header>
      <div className="divide-y divide-border/40">
        {dimension.kpis.map((k) => (
          <div key={k.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
            <div className="min-w-0">
              <span className="text-sm text-card-foreground">{k.label}</span>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <span className="rounded-full border border-border/60 px-1.5 py-0.5 text-[9px] text-muted-foreground">
                  {k.source}
                </span>
                {k.ods && (
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">
                    {k.ods}
                  </span>
                )}
              </div>
            </div>
            <span className="shrink-0 text-sm font-medium tabular-nums text-foreground">
              {k.display}
              {k.trend === "up" && (
                <span className="ml-1 text-emerald-600 dark:text-emerald-400">▲</span>
              )}
              {k.trend === "down" && <span className="ml-1 text-red-600 dark:text-red-400">▼</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
