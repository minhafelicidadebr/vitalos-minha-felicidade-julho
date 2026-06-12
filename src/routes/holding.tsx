import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { AppShell } from "@/app/shell/AppShell";
import { HOLDING_PORTFOLIO, HOLDING_SUMMARY, type PortfolioCompany } from "@/mocks/executivo-mock";

export const Route = createFileRoute("/holding")({
  head: () => ({ meta: [{ title: "Holding — Carteira de Vitalidade · 4 Lentes VITA" }] }),
  component: HoldingPage,
});

const HEALTH_STYLE: Record<PortfolioCompany["adoptionHealth"], { dot: string; label: string }> = {
  saudável: { dot: "bg-green-500", label: "Saudável" },
  atenção: { dot: "bg-amber-500", label: "Atenção" },
  crítico: { dot: "bg-red-500", label: "Crítico" },
};

function HoldingPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Holding</p>
          <h1 className="mt-1 font-serif text-3xl text-foreground">Carteira de Vitalidade</h1>
        </motion.div>

        {/* Summary stats */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05 }}
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {[
            { label: "Organizações", value: String(HOLDING_SUMMARY.companies) },
            {
              label: "Colaboradores",
              value: HOLDING_SUMMARY.totalEmployees.toLocaleString("pt-BR"),
            },
            { label: "IVO médio", value: `${HOLDING_SUMMARY.avgIvo} pts` },
            { label: "Participação média", value: `${HOLDING_SUMMARY.avgParticipation}%` },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm"
            >
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {s.label}
              </p>
              <p className="mt-1 font-serif text-2xl font-semibold text-foreground">{s.value}</p>
            </div>
          ))}
        </motion.div>

        {/* Portfolio table */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="rounded-2xl border border-border/70 bg-card shadow-sm"
        >
          <div className="px-5 pt-5 pb-3">
            <p className="font-medium text-card-foreground">Organizações da carteira</p>
          </div>
          <div className="overflow-x-auto px-3 pb-4">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Organização</th>
                  <th className="px-3 py-2 font-medium text-right">Pessoas</th>
                  <th className="px-3 py-2 font-medium text-right">IVO</th>
                  <th className="px-3 py-2 font-medium text-right">Participação</th>
                  <th className="px-3 py-2 font-medium text-right">Adoção</th>
                </tr>
              </thead>
              <tbody>
                {HOLDING_PORTFOLIO.map((org) => {
                  const h = HEALTH_STYLE[org.adoptionHealth];
                  return (
                    <tr
                      key={org.id}
                      className="rounded-xl text-sm hover:bg-muted/20 transition-colors"
                    >
                      <td className="rounded-l-xl px-3 py-3">
                        <p className="font-medium text-card-foreground">{org.name}</p>
                        <p className="text-[10px] text-muted-foreground">{org.sector}</p>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                        {org.employees.toLocaleString("pt-BR")}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {org.ivoScore !== null ? (
                          <div>
                            <span className="font-semibold tabular-nums text-foreground">
                              {org.ivoScore}
                            </span>
                            <p className="text-[10px] text-muted-foreground">{org.maturityName}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">ciclo em curso</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                        {org.participationPct}%
                      </td>
                      <td className="rounded-r-xl px-3 py-3 text-right">
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span className={`h-2 w-2 rounded-full ${h.dot}`} aria-hidden />
                          {h.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45, delay: 0.15 }}
          className="text-xs leading-relaxed text-muted-foreground"
        >
          🔒 {HOLDING_SUMMARY.microcopy}
        </motion.p>
      </div>
    </AppShell>
  );
}
