import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/app/shell/AppShell";
import { useIvo, useOrg } from "@/mocks/hooks";
import { certify, type CriterionResult } from "@/engine/certification/certification-engine";
import { evaluateEvidence } from "@/engine/lab/evidence-engine";
import { EXPERIMENT_CASES } from "@/mocks/experiment-mock";
import { CONSENT_CHANNELS } from "@/mocks/consent-mock";
import { DOMAIN_B_READY, TIER_STYLE, STATUS_STYLE, SEAL_INTRO } from "@/mocks/certification-mock";
import { formatReportDate } from "@/mocks/esg-report-mock";

export const Route = createFileRoute("/selo")({
  head: () => ({ meta: [{ title: "Selo Empresa Viva — 4 Lentes VITA" }] }),
  component: SeloPage,
});

function SeloPage() {
  const { current, previous } = useIvo();
  const org = useOrg();

  const result = useMemo(() => {
    if (!current) return null;

    const experimentsConfirmed = EXPERIMENT_CASES.filter(
      (c) => c.status === "concluido" && c.observed,
    )
      .map((c) => evaluateEvidence(c.observed!))
      .filter((v) => v.verdict === "confirmado" || v.verdict === "superou").length;

    // Cobertura de consentimento ≈ canal de percepção (pulses), o Trust Ledger ativo.
    const consentCoveragePct = CONSENT_CHANNELS.find((c) => c.id === "pulses")?.orgConsentPct ?? 0;

    return certify({
      ivoScore: current.ivoScore,
      previousIvoScore: previous?.ivoScore ?? 0,
      participationPct: org.participationPct,
      experimentsConfirmed,
      domainBReady: DOMAIN_B_READY,
      consentCoveragePct,
      kAnonRespected: true, // invariante de arquitetura
    });
  }, [current, previous, org.participationPct]);

  if (!result) {
    return (
      <AppShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <p className="animate-pulse text-muted-foreground">Auditando a certificação…</p>
        </div>
      </AppShell>
    );
  }

  const style = TIER_STYLE[result.tier];

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 print:py-0">
        {/* Timbre institucional — só na impressão */}
        <div className="print-only mb-4 border-b border-border pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded bg-primary font-serif text-sm text-primary-foreground">
                4
              </span>
              <span className="text-sm font-medium text-foreground">4 Lentes VITA™</span>
            </div>
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Certificado de Conselho
            </span>
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            {org.name} · Selo Empresa Viva · Emitido em {formatReportDate()}
          </p>
        </div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="flex flex-wrap items-start justify-between gap-3"
        >
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {SEAL_INTRO.eyebrow}
            </p>
            <h1 className="mt-1 font-serif text-3xl text-foreground">{SEAL_INTRO.title}</h1>
            <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground">
              {SEAL_INTRO.lead}
            </p>
          </div>
          <button
            onClick={() => window.print()}
            title="Na caixa de impressão, escolha “Salvar como PDF” em tamanho A4."
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground print:hidden"
          >
            <span aria-hidden>⤓</span> Exportar certificado
          </button>
        </motion.div>

        {/* O selo — emblema visual (no print: certificado emoldurado) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, delay: 0.05 }}
          className="relative flex flex-col items-center overflow-hidden rounded-2xl border border-border/70 bg-card p-8 text-center shadow-sm print:shadow-none print:print-certificate print-certificate"
        >
          <div
            aria-hidden
            className={`pointer-events-none absolute inset-x-0 top-0 h-40 ${style.bg} opacity-60 blur-2xl print:hidden`}
          />
          <p className="print-only mb-4 font-serif text-[11px] uppercase tracking-[0.3em] text-primary">
            Certificado Empresa Viva
          </p>
          <div className="relative">
            {/* halo externo */}
            <div
              aria-hidden
              className={`absolute inset-0 -m-3 rounded-full ${style.bg} opacity-50 blur-xl print:hidden`}
            />
            {/* anel duplo */}
            <div
              className={`relative grid h-32 w-32 place-items-center rounded-full ring-2 ring-offset-4 ring-offset-card ${style.ring} ${style.bg}`}
            >
              <div
                className={`grid h-24 w-24 place-items-center rounded-full bg-card text-5xl ring-1 ring-inset ${style.ring} ${
                  result.granted ? "shadow-inner" : "opacity-80 grayscale-[0.3]"
                }`}
              >
                <span aria-hidden>{style.emoji}</span>
              </div>
            </div>
          </div>
          <p className={`relative mt-5 font-serif text-2xl tracking-tight ${style.color}`}>
            {result.tierLabel}
          </p>
          <p className="relative mt-1 text-xs text-muted-foreground">
            {org.name} · {result.essentialMet}/{result.essentialTotal} critérios essenciais
          </p>
          <span
            className={`relative mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${style.bg} ${style.color}`}
          >
            <span
              aria-hidden
              className={`h-1.5 w-1.5 rounded-full ${
                result.granted ? "bg-emerald-500" : "bg-muted-foreground/60"
              }`}
            />
            {result.granted ? "Selo concedido" : "Selo não concedido"}
          </span>
          <p className="relative mt-3 max-w-md text-xs leading-relaxed text-muted-foreground">
            {result.granted ? SEAL_INTRO.grantedNote : SEAL_INTRO.pendingNote}
          </p>

          {/* Linha de assinatura/validade — só impressão */}
          <div className="print-only mt-10 grid w-full max-w-md grid-cols-2 gap-8 text-left">
            <div>
              <div className="h-px w-full bg-foreground/60" />
              <p className="mt-1 text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                Assinatura do conselho
              </p>
            </div>
            <div>
              <div className="h-px w-full bg-foreground/60" />
              <p className="mt-1 text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                Emitido em {formatReportDate()} · válido por 12 meses
              </p>
            </div>
          </div>
        </motion.div>

        {/* Critérios auditáveis */}
        <section className="rounded-2xl border border-border/70 bg-card shadow-sm">
          <header className="border-b border-border/50 px-5 py-4">
            <h2 className="font-serif text-lg text-foreground">Critérios auditáveis</h2>
            <p className="text-xs text-muted-foreground">
              Cada linha é rastreável até a sua evidência — o auditor refaz a conta.
            </p>
          </header>
          <div className="divide-y divide-border/40">
            {result.criteria.map((c) => (
              <CriterionRow key={c.id} criterion={c} />
            ))}
          </div>
        </section>

        {/* O que falta */}
        {result.gaps.length > 0 && (
          <section className="rounded-2xl border border-amber-200/60 bg-amber-50/40 p-5 dark:border-amber-800/40 dark:bg-amber-950/20">
            <h2 className="mb-2 font-serif text-base text-amber-900 dark:text-amber-200">
              O que falta para {result.granted ? "elevar o selo" : "conquistar o selo"}
            </h2>
            <ul className="space-y-1.5">
              {result.gaps.map((g, i) => (
                <li
                  key={i}
                  className="flex gap-2 text-[12px] leading-relaxed text-amber-900/90 dark:text-amber-300"
                >
                  <span className="text-amber-500/70" aria-hidden>
                    →
                  </span>
                  {g}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Nota pública + honestidade */}
        <div className="rounded-2xl border border-border/60 bg-muted/30 p-5">
          <p className="text-xs leading-relaxed text-muted-foreground">{SEAL_INTRO.publicNote}</p>
        </div>

        {/* Rodapé institucional — só na impressão */}
        <div className="print-only mt-4 border-t border-border pt-3">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Confidencial — uso interno do conselho. Dados agregados (k≥5).</span>
            <span>Gerado pelo 4 Lentes VITA™ · VitalOS</span>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground print:hidden">
          O selo compõe a maturidade do{" "}
          <Link to="/ivo" className="underline underline-offset-2 hover:text-foreground">
            IVO
          </Link>
          , a prova dos{" "}
          <Link to="/experimentos" className="underline underline-offset-2 hover:text-foreground">
            Experimentos
          </Link>{" "}
          e a confiança do{" "}
          <Link to="/privacidade" className="underline underline-offset-2 hover:text-foreground">
            Trust Ledger
          </Link>
          .
        </p>
      </div>
    </AppShell>
  );
}

function CriterionRow({ criterion }: { criterion: CriterionResult }) {
  const s = STATUS_STYLE[criterion.status]!;
  return (
    <div className="flex items-start gap-3 px-5 py-3.5">
      <span className={`mt-0.5 shrink-0 text-base ${s.color}`} aria-hidden>
        {s.icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-card-foreground">{criterion.label}</span>
          {criterion.essential && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
              essencial
            </span>
          )}
          <span className={`text-xs font-medium ${s.color}`}>{s.label}</span>
        </div>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{criterion.note}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          <span className="tabular-nums">{criterion.value}</span> · alvo: {criterion.target}
        </p>
      </div>
    </div>
  );
}
