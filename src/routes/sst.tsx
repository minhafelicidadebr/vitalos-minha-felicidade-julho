import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { AppShell } from "@/app/shell/AppShell";
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
  head: () => ({ meta: [{ title: "SST / CIPA — Domínio B educativo · 4 Lentes VITA" }] }),
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

      <p className="mt-4 text-[10px] leading-relaxed text-muted-foreground">
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

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Domínio B · SST / CIPA
          </p>
          <h1 className="mt-1 font-serif text-3xl text-foreground">Riscos psicossociais — NR-1</h1>
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
          <p className="flex items-start gap-2 text-sm leading-relaxed text-amber-900 dark:text-amber-300">
            <span className="mt-0.5 shrink-0" aria-hidden>
              ℹ
            </span>
            {SST_DISCLAIMER}
          </p>
        </motion.div>

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
                    <p className="text-[10px] text-muted-foreground">
                      Pilar: {risk.relatedPillar}
                      {risk.actionsOpen > 0 && ` · ${risk.actionsOpen} ação(ões) em aberto`}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-medium ${ex.cls}`}
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
            <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
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
                    className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border text-[10px] ${
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
              disabled
              title="Em breve — Bloco 17 (Relatórios)"
              className="mt-4 w-full cursor-not-allowed rounded-lg border border-input py-2 text-xs font-medium text-muted-foreground opacity-50"
            >
              Exportar trilha documental (PDF)
            </button>
          </motion.div>
        </div>
      </div>
    </AppShell>
  );
}
