import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/app/shell/AppShell";
import {
  calculatePnL,
  DEFAULT_INPUTS,
  type PnLInputs,
  type Scenario,
} from "@/engine/pnl/pnl-engine";

export const Route = createFileRoute("/pnl")({
  head: () => ({ meta: [{ title: "Vitality P&L — a linguagem do CFO · 4 Lentes VitalOS™" }] }),
  component: PnLPage,
});

function brl(n: number) {
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

const SCENARIOS: Scenario[] = ["conservador", "médio", "otimista"];
const IVO_DELTA_DEMO = 51; // delta real do mock T4/2025 → T1/2026

function PnLPage() {
  const [inputs, setInputs] = useState<PnLInputs>(DEFAULT_INPUTS);
  const [scenario, setScenario] = useState<Scenario>("médio");

  const result = useMemo(() => calculatePnL(inputs, IVO_DELTA_DEMO, scenario), [inputs, scenario]);

  function setField(field: keyof PnLInputs, raw: string) {
    const value = Number(raw);
    if (Number.isNaN(value) || value < 0) return;
    setInputs((prev) => ({ ...prev, [field]: value }));
  }

  const inputFields: Array<{ field: keyof PnLInputs; label: string; step?: number }> = [
    { field: "employees", label: "Colaboradores" },
    { field: "avgMonthlySalary", label: "Salário médio mensal (R$)", step: 100 },
    { field: "turnoverRatePctYear", label: "Turnover anual (%)", step: 0.5 },
    { field: "replacementCostMultiplier", label: "Custo de reposição (× salário)", step: 0.5 },
    { field: "absenteeismDaysPerEmployeeYear", label: "Dias de ausência/colab./ano", step: 0.5 },
    { field: "presenteeismLossPct", label: "Perda por presenteísmo (%)", step: 0.5 },
  ];

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Vitality P&L™</p>
          <h1 className="mt-1 font-serif text-3xl text-foreground">O custo invisível, visível</h1>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Toda estimativa mostra a própria fórmula. Edite os inputs com os números da sua
            realidade — honestidade metodológica é a feature.
          </p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Inputs */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.05 }}
            className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm lg:col-span-2"
          >
            <p className="mb-4 font-medium text-card-foreground">Inputs editáveis</p>
            <div className="space-y-3">
              {inputFields.map(({ field, label, step }) => (
                <label key={field} className="block">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <input
                    type="number"
                    min={0}
                    step={step ?? 1}
                    value={inputs[field]}
                    onChange={(e) => setField(field, e.target.value)}
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm tabular-nums text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </label>
              ))}
            </div>

            <p className="mt-4 text-xs text-muted-foreground">Cenário</p>
            <div className="mt-1.5 flex gap-2" role="group" aria-label="Escolher cenário">
              {SCENARIOS.map((s) => (
                <button
                  key={s}
                  onClick={() => setScenario(s)}
                  aria-pressed={scenario === s}
                  className={`flex-1 rounded-lg px-2 py-2 text-xs font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    scenario === s
                      ? "bg-primary text-primary-foreground"
                      : "border border-border/60 text-muted-foreground hover:bg-muted/40"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Results */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="space-y-4 lg:col-span-3"
          >
            {/* Headline numbers */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
                <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  Custo corrente/ano
                </p>
                <p className="mt-1 font-serif text-xl font-semibold tabular-nums text-foreground sm:text-2xl">
                  {brl(result.totalCurrentCost)}
                </p>
              </div>
              <div className="rounded-2xl border border-green-300/50 bg-green-50/50 p-4 shadow-sm dark:border-green-800/50 dark:bg-green-950/20">
                <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  Custo evitável
                </p>
                <p className="mt-1 font-serif text-xl font-semibold tabular-nums text-green-700 dark:text-green-400 sm:text-2xl">
                  {brl(result.avoidedCost)}
                </p>
              </div>
              <div className="rounded-2xl border border-red-300/50 bg-red-50/50 p-4 shadow-sm dark:border-red-900/50 dark:bg-red-950/20">
                <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  Inação (12m)
                </p>
                <p className="mt-1 font-serif text-xl font-semibold tabular-nums text-red-600 dark:text-red-400 sm:text-2xl">
                  {brl(result.inactionCost12m)}
                </p>
              </div>
            </div>

            {/* Lines with formulas */}
            <div className="rounded-2xl border border-border/70 bg-card shadow-sm">
              <div className="px-5 pt-5 pb-2">
                <p className="font-medium text-card-foreground">Demonstrativo — linha a linha</p>
              </div>
              <div className="space-y-1 px-3 pb-4">
                {result.lines.map((line) => (
                  <div
                    key={line.id}
                    className="rounded-xl px-3 py-3 hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-sm text-card-foreground">{line.label}</p>
                      <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                        {brl(line.value)}
                      </p>
                    </div>
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                      = {line.formula}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Honesty box */}
            <div
              className="rounded-r-xl border-l-4 bg-amber-50/60 px-5 py-4 dark:bg-amber-950/20"
              style={{ borderLeftColor: "#C9A227" }}
              role="note"
            >
              <p className="text-xs leading-relaxed text-amber-900 dark:text-amber-300">
                ℹ Estimativas correlacionais, não promessas. A premissa (cada 100 pts de IVO ≈ 6% de
                redução de custos de pessoas) é declarada, editável por cenário e deve ser calibrada
                com os dados reais da sua organização ao longo das temporadas.
              </p>
            </div>

            <button
              disabled
              title="Em breve — Bloco 17 (Relatórios)"
              className="w-full cursor-not-allowed rounded-lg border border-input py-2.5 text-xs font-medium text-muted-foreground opacity-50"
            >
              Exportar 1 página para a diretoria (PDF)
            </button>
          </motion.div>
        </div>
      </div>
    </AppShell>
  );
}
