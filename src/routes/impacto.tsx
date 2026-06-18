import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { AppShell } from "@/app/shell/AppShell";
import { IMPACT_REPORT, IMPACT_INTRO, DIRECTION_LABEL } from "@/mocks/impact-mock";
import {
  DIRECTION_SYMBOL,
  EVIDENCE_LEVEL_LABEL,
  type ImpactSection,
  type LensDelta,
} from "@/engine/impact/impact-engine";

export const Route = createFileRoute("/impacto")({
  head: () => ({ meta: [{ title: "Relatório de Impacto — 4 Lentes VitalOS™" }] }),
  component: Impacto,
});

// ─── Helpers visuais ─────────────────────────────────────────────────────────

const DIRECTION_COLOR: Record<string, string> = {
  alta: "text-emerald-700 dark:text-emerald-300",
  queda: "text-rose-600 dark:text-rose-400",
  estavel: "text-muted-foreground",
};

const MATURITY_COLOR: Record<string, string> = {
  iniciando: "bg-slate-400",
  avancando: "bg-amber-500",
  consolidando: "bg-emerald-500",
  referencia: "bg-primary",
};

// Barra de maturidade do programa
function MaturityBar({ score, band }: { score: number; band: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${MATURITY_COLOR[band] ?? "bg-primary"}`}
          style={{ width: `${score}%` }}
          aria-label={`Maturidade ${score}/100`}
        />
      </div>
      <span className="shrink-0 tabular-nums text-xs text-muted-foreground">{score}/100</span>
    </div>
  );
}

// Card de métrica de impacto
function ImpactCard({ section, index }: { section: ImpactSection; index: number }) {
  const dirColor = section.direction ? DIRECTION_COLOR[section.direction] : "";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      className="rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_0_rgba(0,0,0,0.02)]"
    >
      <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {section.title}
      </p>
      <p className={`mt-2 font-serif text-2xl font-semibold tabular-nums ${dirColor || "text-foreground"}`}>
        {section.direction && (
          <span className="mr-1 text-lg">{DIRECTION_SYMBOL[section.direction]}</span>
        )}
        {section.value}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{section.sub}</p>
      {section.note && (
        <p className="mt-2 text-[11px] italic text-muted-foreground/70">{section.note}</p>
      )}
    </motion.div>
  );
}

// Linha de delta por lente
function LensDeltaRow({ lens, index }: { lens: LensDelta; index: number }) {
  const color = DIRECTION_COLOR[lens.direction] ?? "";
  const symbol = DIRECTION_SYMBOL[lens.direction];
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
      className="flex items-center justify-between border-b border-border/40 py-3 last:border-0"
      aria-label={`${lens.lensLabel}: ${lens.before} → ${lens.after}`}
    >
      <span className="font-medium text-sm text-card-foreground">{lens.lensLabel}</span>
      <div className="flex items-center gap-6 text-sm tabular-nums">
        <span className="text-muted-foreground">{lens.before}</span>
        <span className="text-xs text-muted-foreground">→</span>
        <span className="font-semibold text-card-foreground">{lens.after}</span>
        <span className={`w-14 text-right font-semibold ${color}`}>
          {symbol} {lens.delta >= 0 ? `+${lens.delta}` : lens.delta}
        </span>
        <span className={`text-xs ${color}`}>
          {DIRECTION_LABEL[lens.direction]}
        </span>
      </div>
    </motion.div>
  );
}

// ─── Página ──────────────────────────────────────────────────────────────────

function Impacto() {
  const report = IMPACT_REPORT;

  return (
    <AppShell>
      {/* Hero */}
      <section className="border-b border-border/40">
        <div className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {IMPACT_INTRO.eyebrow}
            </p>
            <h1 className="mt-3 font-serif text-3xl text-foreground sm:text-4xl">
              {IMPACT_INTRO.title}
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
              {IMPACT_INTRO.lead}
            </p>
          </motion.div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Proof sentence */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8 rounded-xl border border-primary/20 bg-primary/5 px-5 py-4 font-serif text-base text-primary"
        >
          {report.proofSentence}
        </motion.p>

        {/* Grid de métricas */}
        <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {report.sections.map((section, i) => (
            <ImpactCard key={section.id} section={section} index={i} />
          ))}
        </div>

        {/* Antes × Depois por lente */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mb-8 rounded-2xl border border-border/70 bg-card p-6 shadow-[0_1px_0_rgba(0,0,0,0.02)]"
        >
          <h2 className="mb-1 font-serif text-xl text-card-foreground">IVO por lente</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Variação por lente de vitalidade entre o ciclo anterior e o atual.
          </p>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/60 pb-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            <span>Lente</span>
            <div className="flex items-center gap-6 text-right">
              <span className="w-12">Antes</span>
              <span className="w-4" />
              <span className="w-12">Depois</span>
              <span className="w-14">Δ</span>
              <span className="w-16">Direção</span>
            </div>
          </div>
          {report.lensDeltas.map((lens, i) => (
            <LensDeltaRow key={lens.lensId} lens={lens} index={i} />
          ))}
        </motion.div>

        {/* Maturidade do programa */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="mb-8 rounded-2xl border border-border/70 bg-card p-6 shadow-[0_1px_0_rgba(0,0,0,0.02)]"
        >
          <h2 className="mb-1 font-serif text-xl text-card-foreground">Maturidade do programa</h2>
          <p className="mb-4 text-sm text-muted-foreground">{report.maturity.bandLabel}</p>
          <MaturityBar score={report.maturity.score} band={report.maturity.band} />
          <p className="mt-3 text-[11px] text-muted-foreground/70">
            Fórmula: {report.maturity.formula}
          </p>
        </motion.div>

        {/* Nível de evidência */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          className="mb-8 rounded-2xl border border-border/70 bg-card p-6 shadow-[0_1px_0_rgba(0,0,0,0.02)]"
        >
          <h2 className="mb-1 font-serif text-xl text-card-foreground">Nível de evidência</h2>
          <p className="mb-2 text-sm text-muted-foreground">
            {EVIDENCE_LEVEL_LABEL[report.evidenceLevel]}
          </p>
          <div className="flex flex-wrap gap-2 text-[11px]">
            {(["inicial", "indicativo", "robusto", "referencia"] as const).map((lvl) => (
              <span
                key={lvl}
                className={`rounded-full border px-3 py-1 font-medium capitalize ${
                  lvl === report.evidenceLevel
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/50 text-muted-foreground"
                }`}
              >
                {lvl}
              </span>
            ))}
          </div>
        </motion.div>

        {/* ROI */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="mb-8 rounded-2xl border border-border/70 bg-card p-6 shadow-[0_1px_0_rgba(0,0,0,0.02)]"
        >
          <h2 className="mb-1 font-serif text-xl text-card-foreground">Retorno sobre investimento</h2>
          <p className="font-serif text-4xl font-semibold text-primary">{report.roi.label}</p>
          <p className="mt-2 text-[11px] text-muted-foreground/70">Fórmula: {report.roi.formula}</p>
          <p className="mt-1 text-[11px] italic text-muted-foreground/60">
            Estimativa correlacional — não é promessa contratual.
          </p>
        </motion.div>

        {/* Disclaimer */}
        <p className="rounded-xl bg-muted/50 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
          {report.disclaimer}
        </p>
      </div>
    </AppShell>
  );
}
