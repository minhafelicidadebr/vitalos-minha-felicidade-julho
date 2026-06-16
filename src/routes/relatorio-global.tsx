import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/app/shell/AppShell";
import { useIvo, useOrg } from "@/mocks/hooks";
import { deriveEsgReadiness, type PillarScore } from "@/engine/esg/esg-engine";
import { evaluateEvidence } from "@/engine/lab/evidence-engine";
import { certify } from "@/engine/certification/certification-engine";
import {
  buildAnnualEsgReport,
  type EsgDimensionReport,
  type EsgKpi,
} from "@/engine/esg-report/esg-report-engine";
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

export const Route = createFileRoute("/relatorio-global")({
  head: () => ({ meta: [{ title: "Relatório Global ESG — 4 Lentes VITA" }] }),
  component: RelatorioGlobalPage,
});

const DIM_COLOR: Record<string, string> = { E: "#16A34A", S: "#2563EB", G: "#CA8A04" };

function fibtDomain(id: string): number {
  return FIBT_ORG_RESULT.domains.find((d) => d.id === id)?.normalized ?? 0;
}

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
        {/* Timbre institucional — só na impressão (cabeçalho do documento) */}
        <div className="print-only mb-4 border-b border-border pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded bg-primary font-serif text-sm text-primary-foreground">
                4
              </span>
              <span className="text-sm font-medium text-foreground">4 Lentes VITA™</span>
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
