import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/app/shell/AppShell";
import { AMBASSADORSHIPS } from "@/mocks/embaixadorias-mock";

export const Route = createFileRoute("/embaixadorias")({
  head: () => ({ meta: [{ title: "Embaixadorias do Florescimento — 4 Lentes VitalOS™" }] }),
  component: EmbaixadoriasPage,
});

function EmbaixadoriasPage() {
  const [joinedIds, setJoinedIds] = useState<Set<string>>(
    () => new Set(AMBASSADORSHIPS.filter((a) => a.joined).map((a) => a.id)),
  );

  function toggleJoin(id: string) {
    setJoinedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Embaixadorias do Florescimento
          </p>
          <h1 className="mt-1 font-serif text-3xl text-foreground">15 frentes, uma cultura</h1>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Cada embaixadoria cuida de um pilar na prática — com missões reais, não cargos
            honorários. Participar é voluntário, sair é livre, e o impacto é coletivo.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05 }}
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          {AMBASSADORSHIPS.map((amb) => {
            const joined = joinedIds.has(amb.id);
            return (
              <div
                key={amb.id}
                className={`flex flex-col rounded-2xl border p-4 shadow-sm transition-colors ${
                  joined ? "border-primary/40 bg-primary/5" : "border-border/70 bg-card"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <span className="text-2xl" aria-hidden>
                    {amb.emoji}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-card-foreground">{amb.name}</p>
                    <p className="text-xs text-muted-foreground">{amb.pillarName}</p>
                  </div>
                </div>
                <p className="mt-2 flex-1 text-xs leading-relaxed text-muted-foreground">
                  {amb.description}
                </p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {amb.members + (joined && !amb.joined ? 1 : !joined && amb.joined ? -1 : 0)}{" "}
                    pessoas
                    {amb.openMissions > 0 && ` · ${amb.openMissions} missão(ões)`}
                  </span>
                  <button
                    onClick={() => toggleJoin(amb.id)}
                    aria-pressed={joined}
                    className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                      joined
                        ? "border border-primary/40 text-primary hover:bg-primary/10"
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                    }`}
                  >
                    {joined ? "✓ Participo" : "Participar"}
                  </button>
                </div>
              </div>
            );
          })}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="text-xs text-muted-foreground"
        >
          Sua participação fortalece a cultura — e é sempre voluntária. Sair de uma embaixadoria
          nunca gera qualquer consequência.
        </motion.p>
      </div>
    </AppShell>
  );
}
