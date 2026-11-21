import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/app/shell/AppShell";
import { FlaskConical } from "lucide-react";
import { AMBASSADORSHIPS } from "@/mocks/embaixadorias-mock";
import { ContextualHelp } from "@/features/help/ContextualHelp";
import { HELP_EMBAIXADORIAS, HELP_UI_COPY, GUARDIOES_CARD_NOTE } from "@/domain/help/contextual-help";
import { EMBAIXADORIA_CARD_HELP } from "@/domain/help/embaixadorias-help";

/** Ajuda própria em cada card: propósito, exemplo, próximo passo e limites da frente. */
const CARD_HELP = EMBAIXADORIA_CARD_HELP;

/** Aviso que precisa estar visível no próprio card, não só dentro da ajuda. */
const CARD_NOTE: Record<string, string> = {
  "amb-seguranca": GUARDIOES_CARD_NOTE,
};

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
          <div className="mt-1 flex items-start gap-1">
            <h1 className="font-serif text-3xl text-foreground">15 frentes, uma cultura</h1>
            <ContextualHelp entry={HELP_EMBAIXADORIAS} />
          </div>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Cada embaixadoria cuida de um pilar na prática — com missões reais, não cargos
            honorários. Participar é voluntário, sair é livre, e o impacto é coletivo.
          </p>
        </motion.div>

        <p
          role="note"
          className="flex max-w-3xl items-start gap-2 rounded-xl border border-accent/50 bg-accent/10 px-3 py-2 text-sm leading-relaxed text-foreground"
        >
          <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-foreground/70" aria-hidden />
          <span>
            <span className="font-semibold">{HELP_UI_COPY.demoBadge}.</span>{" "}
            {HELP_EMBAIXADORIAS.demoNotice}
          </span>
        </p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05 }}
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          {AMBASSADORSHIPS.map((amb) => {
            const joined = joinedIds.has(amb.id);
            const help = CARD_HELP[amb.id];
            const note = CARD_NOTE[amb.id];
            return (
              <div
                key={amb.id}
                className={`flex flex-col rounded-2xl border p-4 shadow-sm transition-colors ${
                  joined ? "border-primary/40 bg-primary/5" : "border-border/70 bg-card"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <span className="pt-0.5 text-2xl" aria-hidden>
                    {amb.emoji}
                  </span>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <h2 className="text-sm font-medium text-card-foreground">{amb.name}</h2>
                    <p className="text-xs text-muted-foreground">{amb.pillarName}</p>
                  </div>
                  {help && (
                    <div className="-mr-2 -mt-2">
                      <ContextualHelp entry={help} size="sm" />
                    </div>
                  )}
                </div>
                <p className="mt-2 flex-1 text-xs leading-relaxed text-muted-foreground">
                  {amb.description}
                </p>
                {note && (
                  <p className="mt-2 rounded-lg border border-border/70 bg-muted/40 px-2.5 py-1.5 text-xs leading-relaxed text-foreground/80">
                    {note}
                  </p>
                )}
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {amb.members + (joined && !amb.joined ? 1 : !joined && amb.joined ? -1 : 0)}{" "}
                    pessoas no exemplo
                    {amb.openMissions > 0 && ` · ${amb.openMissions} missão(ões)`}
                  </span>
                  <button
                    onClick={() => toggleJoin(amb.id)}
                    aria-pressed={joined}
                    className={`min-h-11 shrink-0 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
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
