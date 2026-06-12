import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/app/shell/AppShell";
import {
  VISIBILITY_RULES,
  CONSENT_ITEMS,
  DATA_RIGHTS,
  TRUST_PROMISES,
} from "@/mocks/trust-mock";
import type { ConsentItem } from "@/engine/trust/trust-types";

export const Route = createFileRoute("/confianca")({
  head: () => ({ meta: [{ title: "Trust Ledger — Sua privacidade, verificável · 4 Lentes VITA" }] }),
  component: TrustPage,
});

function TrustPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Trust Ledger™</p>
          <h1 className="mt-1 font-serif text-3xl text-foreground">Sua privacidade, verificável</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Esta tela mostra exatamente o que cada pessoa pode — e não pode — ver sobre você.
            Não é política de privacidade em juridiquês: é a interface da confiança.
          </p>
        </motion.div>

        <PromisesCard />
        <VisibilityCard />
        <ConsentsCard />
        <RightsCard />
      </div>
    </AppShell>
  );
}

// ─── Promises ─────────────────────────────────────────────────────────────────

function PromisesCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.05 }}
      className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
    >
      <p className="mb-3 font-medium text-card-foreground">Compromissos invioláveis</p>
      <ul className="space-y-2.5">
        {TRUST_PROMISES.map((p) => (
          <li key={p} className="flex items-start gap-2.5 text-sm leading-relaxed text-muted-foreground">
            <span className="mt-0.5 shrink-0 text-primary" aria-hidden>🔒</span>
            {p}
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

// ─── Visibility matrix ────────────────────────────────────────────────────────

function VisibilityCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.1 }}
      className="rounded-2xl border border-border/70 bg-card shadow-sm"
    >
      <div className="px-5 pt-5 pb-3">
        <p className="font-medium text-card-foreground">Quem vê o quê sobre você</p>
      </div>
      <div className="space-y-3 px-3 pb-4">
        {VISIBILITY_RULES.map((rule) => (
          <div key={rule.audienceId} className="rounded-xl border border-border/50 p-4">
            <p className="mb-2 text-sm font-semibold text-card-foreground">{rule.audienceLabel}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-green-700 dark:text-green-400">
                  Pode ver
                </p>
                <ul className="space-y-1">
                  {rule.canSee.map((item) => (
                    <li key={item} className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
                      <span className="mt-0.5 shrink-0 text-green-600 dark:text-green-400" aria-hidden>✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              {rule.cannotSee.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-red-600 dark:text-red-400">
                    Nunca vê
                  </p>
                  <ul className="space-y-1">
                    {rule.cannotSee.map((item) => (
                      <li key={item} className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
                        <span className="mt-0.5 shrink-0 text-red-500" aria-hidden>✕</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Consents ─────────────────────────────────────────────────────────────────

function ConsentsCard() {
  const [consents, setConsents] = useState<ConsentItem[]>(CONSENT_ITEMS);
  const [savedId, setSavedId] = useState<string | null>(null);

  function toggle(id: string) {
    setConsents((prev) =>
      prev.map((c) => (c.id === id ? { ...c, granted: !c.granted } : c)),
    );
    setSavedId(id);
    setTimeout(() => setSavedId(null), 2000);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.15 }}
      className="rounded-2xl border border-border/70 bg-card shadow-sm"
    >
      <div className="px-5 pt-5 pb-3">
        <p className="font-medium text-card-foreground">Consentimentos ativos</p>
        <p className="text-xs text-muted-foreground">
          Mude quando quiser. Nenhuma escolha gera punição ou perda de acesso.
        </p>
      </div>
      <div className="space-y-1 px-3 pb-4">
        {consents.map((c) => (
          <div key={c.id} className="flex items-start gap-3 rounded-xl px-3 py-3 hover:bg-muted/20 transition-colors">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-card-foreground">{c.label}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{c.description}</p>
              {savedId === c.id && (
                <p className="mt-1 text-[10px] text-green-600 dark:text-green-400">✓ Preferência salva</p>
              )}
            </div>
            <button
              role="switch"
              aria-checked={c.granted}
              aria-label={`${c.label}: ${c.granted ? "ativado" : "desativado"}`}
              onClick={() => toggle(c.id)}
              className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                c.granted ? "bg-primary" : "bg-muted-foreground/30"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition-all ${
                  c.granted ? "left-[1.375rem]" : "left-0.5"
                }`}
                aria-hidden
              />
            </button>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── LGPD rights ──────────────────────────────────────────────────────────────

function RightsCard() {
  const [requested, setRequested] = useState<string | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.2 }}
      className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
    >
      <p className="mb-1 font-medium text-card-foreground">Seus direitos sobre seus dados</p>
      <p className="mb-4 text-xs text-muted-foreground">LGPD — Lei Geral de Proteção de Dados</p>

      <div className="grid gap-3 sm:grid-cols-3">
        {DATA_RIGHTS.map((right) => (
          <button
            key={right.id}
            onClick={() => setRequested(right.id)}
            className="flex flex-col gap-1 rounded-xl border border-border/60 p-4 text-left transition-all hover:border-border hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <p className="text-sm font-medium text-card-foreground">{right.label}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">{right.description}</p>
            {requested === right.id && (
              <p className="mt-1 text-[10px] text-green-600 dark:text-green-400">
                ✓ Solicitação registrada (demo) — em produção, processada em até 15 dias
              </p>
            )}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
