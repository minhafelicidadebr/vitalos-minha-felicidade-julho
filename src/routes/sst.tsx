import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/app/shell/AppShell";
import { usePack } from "@/engine/pack";
import { summarizeNR1Readiness } from "@/engine/domainb/nr1-readiness-engine";
import { useOrg } from "@/mocks/hooks";
import { formatReportDate } from "@/mocks/esg-report-mock";
import {
  SST_DISCLAIMER,
  SST_RISK_INVENTORY,
  SST_LISTENING,
  SST_CHECKLIST,
  COPSOQ_AGGREGATE,
  type RiskCategory,
  type CopsoqDimension,
} from "@/mocks/executivo-mock";

export const Route = createFileRoute("/sst")({
  head: () => ({ meta: [{ title: "SST / CIPA — Domínio B educativo · 4 Lentes VitalOS™" }] }),
  component: SSTPage,
});

const BAND_STYLE: Record<CopsoqDimension["band"], string> = {
  favorável: "bg-green-500",
  intermediário: "bg-amber-500",
  risco: "bg-red-500",
};

function CopsoqCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.12 }}
      className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
    >
      <p className="font-medium text-card-foreground">COPSOQ II agregado (versão curta BR)</p>
      <p className="text-xs text-muted-foreground">
        n = {COPSOQ_AGGREGATE.n} · {COPSOQ_AGGREGATE.appliedLabel} · escala 0–100
      </p>

      <div className="mt-4 space-y-2.5">
        {COPSOQ_AGGREGATE.dimensions.map((d) => (
          <div key={d.id}>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">
                {d.name}
                <span className="ml-1 text-[9px] text-muted-foreground/70">
                  ({d.direction === "menor_melhor" ? "↓ melhor" : "↑ melhor"})
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${BAND_STYLE[d.band]}`} aria-hidden />
                <span className="font-medium tabular-nums text-foreground">{d.score}</span>
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full ${BAND_STYLE[d.band]} opacity-70`}
                style={{ width: `${d.score}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        Resultados agregados de toda a organização — recortes menores seguem a regra de 5+
        respondentes. Instrumento aplicado em caráter educativo; a interpretação para fins de PGR
        cabe a profissional habilitado.
      </p>
    </motion.div>
  );
}

const EXPOSURE_STYLE: Record<RiskCategory["exposure"], { cls: string; label: string }> = {
  baixa: {
    cls: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
    label: "Baixa",
  },
  moderada: {
    cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    label: "Moderada",
  },
  alta: { cls: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300", label: "Alta" },
};

function SSTPage() {
  const maxCount = Math.max(...SST_LISTENING.byCategory.map((c) => c.count));
  const { pack } = usePack();
  const org = useOrg();

  // Síntese EDUCATIVA de prontidão — compõe COPSOQ + inventário + checklist GRO.
  const readiness = useMemo(
    () =>
      summarizeNR1Readiness({
        copsoqDimensions: COPSOQ_AGGREGATE.dimensions.map((d) => ({ band: d.band })),
        riskExposures: SST_RISK_INVENTORY.map((r) => ({
          exposure: r.exposure,
          actionsOpen: r.actionsOpen,
        })),
        checklist: SST_CHECKLIST.map((c) => ({ done: c.done })),
      }),
    [],
  );

  // Disclaimer obrigatório — verbatim do pack (Domínio B), fonte única.
  const domainB = pack?.domainB as { mandatoryDisclaimer?: string } | undefined;
  const mandatoryDisclaimer = domainB?.mandatoryDisclaimer ?? SST_DISCLAIMER;

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6 print:py-0">
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
              Dossiê Educativo NR-1 · Domínio B
            </span>
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            {org.name} · Material preparatório (não é PGR) · Emitido em {formatReportDate()}
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="flex flex-wrap items-start justify-between gap-3"
        >
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Domínio B · SST / CIPA
            </p>
            <h1 className="mt-1 font-serif text-3xl text-foreground">
              Riscos psicossociais — NR-1
            </h1>
          </div>
          <button
            onClick={() => window.print()}
            title="Na caixa de impressão, escolha “Salvar como PDF” em tamanho A4."
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground print:hidden"
          >
            <span aria-hidden>⤓</span> Exportar dossiê NR-1
          </button>
        </motion.div>

        {/* Mandatory disclaimer — always visible, top of page */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05 }}
          className="rounded-r-xl border-l-4 bg-amber-50/60 px-5 py-4 dark:bg-amber-950/20"
          style={{ borderLeftColor: "#C9A227" }}
          role="note"
          aria-label="Aviso obrigatório do Domínio B"
        >
          <p className="flex items-start gap-2 text-base leading-relaxed text-amber-900 dark:text-amber-300">
            <span className="mt-0.5 shrink-0" aria-hidden>
              ℹ
            </span>
            {mandatoryDisclaimer}
          </p>
        </motion.div>

        {/* Síntese de prontidão educativa (compõe COPSOQ + inventário + checklist) */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.07 }}
          className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
        >
          <p className="font-medium text-card-foreground">Síntese de prontidão educativa NR-1</p>
          <p className="text-xs text-muted-foreground">
            Leitura agregada (k≥5) para apoiar — não substituir — o trabalho do profissional
            habilitado.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <ReadinessStat
              value={readiness.dimensionsByBand.risco}
              label="Dimensões em risco"
              tone={readiness.riskDimensions > 0 ? "warn" : "ok"}
            />
            <ReadinessStat
              value={readiness.highExposureRisks}
              label="Exposição alta"
              tone={readiness.highExposureRisks > 0 ? "warn" : "ok"}
            />
            <ReadinessStat value={readiness.openActions} label="Ações em aberto" tone="neutral" />
            <ReadinessStat
              value={`${readiness.checklistPct}%`}
              label="Checklist GRO"
              tone="neutral"
            />
          </div>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            {readiness.readinessNote}
          </p>
        </motion.section>

        {/* Risk inventory */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="rounded-2xl border border-border/70 bg-card shadow-sm"
        >
          <div className="px-5 pt-5 pb-2">
            <p className="font-medium text-card-foreground">Inventário de riscos psicossociais</p>
            <p className="text-xs text-muted-foreground">
              Exposição estimada por categoria, conectada aos pilares do IVO
            </p>
          </div>
          <div className="space-y-1 px-3 pb-4">
            {SST_RISK_INVENTORY.map((risk) => {
              const ex = EXPOSURE_STYLE[risk.exposure];
              return (
                <div
                  key={risk.id}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-card-foreground">{risk.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Pilar: {risk.relatedPillar}
                      {risk.actionsOpen > 0 && ` · ${risk.actionsOpen} ação(ões) em aberto`}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${ex.cls}`}
                  >
                    {ex.label}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>

        <CopsoqCard />

        <div className="grid gap-6 md:grid-cols-2">
          {/* Listening channel — aggregate volumes only */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.15 }}
            className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
          >
            <p className="font-medium text-card-foreground">Canal de escuta protegida</p>
            <div className="mt-3 flex items-end gap-3">
              <p className="font-serif text-4xl font-semibold leading-none text-foreground">
                {SST_LISTENING.totalReportsQuarter}
              </p>
              <p className="text-xs text-muted-foreground">
                relatos no trimestre · resposta média {SST_LISTENING.avgResponseDays} dias
              </p>
            </div>
            <div className="mt-4 space-y-2">
              {SST_LISTENING.byCategory.map((c) => (
                <div key={c.label}>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{c.label}</span>
                    <span className="font-medium tabular-nums text-foreground">{c.count}</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(c.count / maxCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              {SST_LISTENING.microcopy}
            </p>
          </motion.div>

          {/* GRO checklist */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.2 }}
            className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
          >
            <p className="font-medium text-card-foreground">Checklist preparatório GRO</p>
            <ul className="mt-3 space-y-2.5">
              {SST_CHECKLIST.map((item) => (
                <li key={item.id} className="flex items-start gap-2.5">
                  <span
                    className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border text-xs ${
                      item.done
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/40"
                    }`}
                    aria-hidden
                  >
                    {item.done ? "✓" : ""}
                  </span>
                  <span
                    className={`text-xs leading-relaxed ${item.done ? "text-muted-foreground" : "text-card-foreground"}`}
                  >
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => window.print()}
              className="mt-4 w-full rounded-lg border border-input py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted/50 print:hidden"
            >
              Exportar trilha documental (PDF)
            </button>
          </motion.div>
        </div>

        {/* Rodapé institucional — só na impressão */}
        <div className="print-only mt-4 border-t border-border pt-3">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>
              Confidencial · Material educativo preparatório — não constitui PGR nem laudo.
            </span>
            <span>Gerado pelo 4 Lentes VitalOS™ · VitalOS</span>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function ReadinessStat({
  value,
  label,
  tone,
}: {
  value: number | string;
  label: string;
  tone: "ok" | "warn" | "neutral";
}) {
  const color =
    tone === "warn"
      ? "text-amber-700 dark:text-amber-300"
      : tone === "ok"
        ? "text-emerald-700 dark:text-emerald-300"
        : "text-foreground";
  return (
    <div className="rounded-xl border border-border/60 bg-background p-3">
      <p className={`font-serif text-2xl ${color}`}>{value}</p>
      <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{label}</p>
    </div>
  );
}
