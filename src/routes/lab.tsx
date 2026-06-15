import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/app/shell/AppShell";
import { PROTOCOLS, EXPERIMENTS } from "@/mocks/lab-mock";
import type { ProtocolDef, Experiment } from "@/engine/lab/lab-types";

export const Route = createFileRoute("/lab")({
  head: () => ({
    meta: [{ title: "Culture Lab — cultura como ciência experimental · 4 Lentes VITA" }],
  }),
  component: LabPage,
});

function LabPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Culture Lab™</p>
          <h1 className="mt-1 font-serif text-3xl text-foreground">
            Cultura como ciência experimental
          </h1>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Ative um protocolo baseado em evidência em equipes-piloto, meça antes/depois contra
            grupos de comparação e descubra o que funciona <em>na sua</em> cultura.
          </p>
        </motion.div>

        <ExperimentsSection experiments={EXPERIMENTS} />
        <ProtocolLibrary protocols={PROTOCOLS} />
      </div>
    </AppShell>
  );
}

// ─── Experiments ──────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<Experiment["status"], string> = {
  concluído: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  rodando: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  planejado: "bg-muted text-muted-foreground",
};

function ExperimentsSection({ experiments }: { experiments: Experiment[] }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.05 }}
      className="space-y-3"
    >
      <h2 className="font-serif text-xl text-foreground">Experimentos</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {experiments.map((ex) => (
          <div
            key={ex.id}
            className="flex flex-col rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-card-foreground">{ex.protocolName}</p>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[ex.status]}`}
              >
                {ex.status}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {ex.pilotTeams.length} equipe(s): {ex.pilotTeams.join(", ")} · {ex.startedLabel}
            </p>

            {ex.status === "rodando" && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    Semana {ex.weeksElapsed} de {ex.durationWeeks}
                  </span>
                  <span>{Math.round((ex.weeksElapsed / ex.durationWeeks) * 100)}%</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(ex.weeksElapsed / ex.durationWeeks) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {ex.result && (
              <div className="mt-3 rounded-xl bg-muted/30 p-3">
                <div className="flex items-baseline justify-center gap-3">
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {ex.result.before}
                  </span>
                  <span className="text-muted-foreground" aria-hidden>
                    →
                  </span>
                  <span className="font-serif text-2xl font-semibold tabular-nums text-foreground">
                    {ex.result.after}
                  </span>
                  <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                    +{ex.result.after - ex.result.before}
                  </span>
                </div>
                <p className="mt-1 text-center text-xs text-muted-foreground">
                  Comparação (sem protocolo): +{ex.result.comparisonDelta} no mesmo período
                </p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {ex.result.confidenceNote}
                </p>
              </div>
            )}

            {ex.status === "planejado" && (
              <p className="mt-3 text-xs text-muted-foreground">
                Início previsto após aprovação do plano de carga (GRO).
              </p>
            )}
          </div>
        ))}
      </div>
    </motion.section>
  );
}

// ─── Protocol library ─────────────────────────────────────────────────────────

function ProtocolLibrary({ protocols }: { protocols: ProtocolDef[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [activatedId, setActivatedId] = useState<string | null>(null);

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.1 }}
      className="space-y-3"
    >
      <div>
        <h2 className="font-serif text-xl text-foreground">Biblioteca de protocolos</h2>
        <p className="text-xs text-muted-foreground">
          {protocols.length} protocolos baseados em evidência · cada um indica alvo, duração, efeito
          esperado e fonte
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {protocols.map((p) => {
          const isOpen = openId === p.id;
          return (
            <div
              key={p.id}
              className="rounded-2xl border border-border/70 bg-card shadow-sm overflow-hidden"
            >
              <button
                onClick={() => setOpenId(isOpen ? null : p.id)}
                aria-expanded={isOpen}
                className="flex w-full items-start justify-between gap-3 px-5 py-4 text-left hover:bg-muted/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              >
                <div>
                  <p className="text-sm font-medium text-card-foreground">{p.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {p.targetPillarName} · {p.durationWeeks} semanas · efeito esperado{" "}
                    {p.expectedEffect}
                  </p>
                </div>
                <span
                  className="mt-1 text-muted-foreground transition-transform"
                  style={{ transform: isOpen ? "rotate(180deg)" : "none" }}
                  aria-hidden
                >
                  ▾
                </span>
              </button>

              {isOpen && (
                <div className="border-t border-border/50 px-5 py-4 space-y-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      Passos
                    </p>
                    <ol className="mt-1.5 space-y-1">
                      {p.steps.map((step, i) => (
                        <li
                          key={step}
                          className="flex gap-2 text-xs leading-relaxed text-muted-foreground"
                        >
                          <span className="shrink-0 font-medium text-foreground">{i + 1}.</span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    📚 {p.scientificBasis} · mínimo {p.minTeamSize} pessoas por equipe (k-anonymity)
                  </p>
                  {activatedId === p.id ? (
                    <p className="text-xs text-green-600 dark:text-green-400">
                      ✓ Protocolo marcado para ativação (demo) — em produção, seguiria para seleção
                      de equipes-piloto e janela de medição.
                    </p>
                  ) : (
                    <button
                      onClick={() => setActivatedId(p.id)}
                      className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      Ativar em equipes-piloto
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </motion.section>
  );
}
