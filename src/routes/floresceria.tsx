import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppShell } from "@/app/shell/AppShell";
import { AI_GUARDRAILS } from "@/engine/ai/ai-types";
import { AI_MODES, AI_RESPONSES } from "@/mocks/floresceria-mock";

export const Route = createFileRoute("/floresceria")({
  head: () => ({ meta: [{ title: "FlorescerIA — copilota da vitalidade · 4 Lentes VITA" }] }),
  component: FlorescerIAPage,
});

const DEMO_ROLES = [
  { id: "COLABORADOR", label: "Colaborador" },
  { id: "LIDER_EQUIPE", label: "Líder" },
  { id: "RH_ADMIN", label: "RH" },
  { id: "CHRO", label: "CHRO" },
  { id: "C_LEVEL", label: "C-Level" },
  { id: "SST_PROFISSIONAL", label: "SST" },
] as const;

function FlorescerIAPage() {
  const [role, setRole] = useState<string>("COLABORADOR");
  const [activeModeId, setActiveModeId] = useState<string | null>(null);
  const [approvalState, setApprovalState] = useState<"none" | "approved" | "rejected">("none");

  const modes = useMemo(() => AI_MODES.filter((m) => m.roles.includes(role)), [role]);
  const response = activeModeId ? AI_RESPONSES[activeModeId] : null;

  function selectMode(id: string) {
    setActiveModeId(id);
    setApprovalState("none");
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            FlorescerIA™ · respostas mockadas — Fase 2 conecta o modelo real
          </p>
          <h1 className="mt-1 font-serif text-3xl text-foreground">
            Copilota da vitalidade, com limites auditáveis
          </h1>
        </motion.div>

        {/* Role switcher (persona demo) */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05 }}
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Trocar papel de demonstração"
        >
          {DEMO_ROLES.map((r) => (
            <button
              key={r.id}
              onClick={() => {
                setRole(r.id);
                setActiveModeId(null);
                setApprovalState("none");
              }}
              aria-pressed={role === r.id}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                role === r.id
                  ? "bg-primary text-primary-foreground"
                  : "border border-border/60 text-muted-foreground hover:bg-muted/40"
              }`}
            >
              {r.label}
            </button>
          ))}
        </motion.div>

        {/* Modes */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="grid gap-2 sm:grid-cols-2"
        >
          {modes.map((m) => (
            <button
              key={m.id}
              onClick={() => selectMode(m.id)}
              aria-pressed={activeModeId === m.id}
              className={`rounded-xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                activeModeId === m.id
                  ? "border-primary bg-primary/5"
                  : "border-border/60 bg-card hover:border-border hover:shadow-sm"
              }`}
            >
              <p className="text-sm font-medium text-card-foreground">✨ {m.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{m.description}</p>
            </button>
          ))}
        </motion.div>

        {/* Response */}
        <AnimatePresence mode="wait">
          {response && (
            <motion.div
              key={activeModeId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
            >
              <p className="text-sm leading-relaxed text-card-foreground whitespace-pre-line">
                {response.text}
              </p>

              {/* Proposal — human-in-the-loop */}
              {response.proposal && (
                <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
                  <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-primary">
                    Proposta — requer sua aprovação
                  </p>
                  <p className="mt-1.5 text-sm font-medium text-card-foreground">
                    {response.proposal.summary}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {response.proposal.detail}
                  </p>
                  <div className="mt-3 flex gap-2">
                    {approvalState === "none" ? (
                      <>
                        <button
                          onClick={() => setApprovalState("approved")}
                          className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                        >
                          Aprovar
                        </button>
                        <button
                          onClick={() => setApprovalState("rejected")}
                          className="rounded-lg border border-input px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted/50"
                        >
                          Recusar
                        </button>
                      </>
                    ) : approvalState === "approved" ? (
                      <p className="text-xs text-green-600 dark:text-green-400">
                        ✓ Aprovado — registrado na trilha de auditoria (demo). A IA nunca age sem este passo.
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Recusado — registrado na trilha de auditoria (demo). Sem consequências para ninguém.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Guardrails — always visible */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.15 }}
          className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
        >
          <p className="mb-3 font-medium text-card-foreground">Guardrails invioláveis</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-red-600 dark:text-red-400">
                Nunca
              </p>
              <ul className="space-y-1">
                {AI_GUARDRAILS.never.map((g) => (
                  <li key={g} className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
                    <span className="mt-0.5 shrink-0 text-red-500" aria-hidden>✕</span>
                    {g}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-green-700 dark:text-green-400">
                Sempre
              </p>
              <ul className="space-y-1">
                {AI_GUARDRAILS.always.map((g) => (
                  <li key={g} className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
                    <span className="mt-0.5 shrink-0 text-green-600 dark:text-green-400" aria-hidden>✓</span>
                    {g}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </AppShell>
  );
}
