import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, DatabaseZap, History, RefreshCw, ShieldCheck } from "lucide-react";
import { AppShell } from "@/app/shell/AppShell";
import {
  CONSENT_DEMO_BASE_TIME,
  CONSENT_INITIAL_EVENTS,
  CONSENT_ITEMS,
  CONSENT_PURPOSES,
  DATA_RIGHTS,
  TRUST_PROMISES,
  VISIBILITY_RULES,
} from "@/mocks/trust-mock";
import {
  applyConsentDecision,
  projectConsentLedger,
  type ConsentDecisionReceipt,
  type ConsentLedgerEvent,
} from "@/engine/trust/consent-ledger-engine";
import { getConsentLedgerContractProof } from "@/lib/api/consent.functions";
import type { ConsentLedgerContractProof } from "@/lib/trust/consent-ledger-proof.server";

export const Route = createFileRoute("/confianca")({
  head: () => ({
    meta: [{ title: "Trust Ledger — Sua privacidade, verificável · 4 Lentes VitalOS™" }],
  }),
  component: TrustPage,
});

function TrustPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Trust Ledger™</p>
          <h1 className="mt-1 font-serif text-3xl text-foreground">Sua privacidade, verificável</h1>
          <p className="mt-2 text-base leading-relaxed text-muted-foreground">
            Esta tela mostra exatamente o que cada pessoa pode — e não pode — ver sobre você. Não é
            política de privacidade em juridiquês: é a interface da confiança.
          </p>
        </motion.div>

        <PromisesCard />
        <VisibilityCard />
        <ConsentContractCard />
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
          <li
            key={p}
            className="flex items-start gap-2.5 text-base leading-relaxed text-muted-foreground"
          >
            <span className="mt-0.5 shrink-0 text-primary" aria-hidden>
              🔒
            </span>
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
                <p className="mb-1.5 text-xs font-medium uppercase tracking-[0.14em] text-green-700 dark:text-green-400">
                  Pode ver
                </p>
                <ul className="space-y-1">
                  {rule.canSee.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground"
                    >
                      <span
                        className="mt-0.5 shrink-0 text-green-600 dark:text-green-400"
                        aria-hidden
                      >
                        ✓
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              {rule.cannotSee.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-medium uppercase tracking-[0.14em] text-red-600 dark:text-red-400">
                    Nunca vê
                  </p>
                  <ul className="space-y-1">
                    {rule.cannotSee.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground"
                      >
                        <span className="mt-0.5 shrink-0 text-red-500" aria-hidden>
                          ✕
                        </span>
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

type ConsentProofLoad =
  | { state: "loading" }
  | { state: "ready"; value: ConsentLedgerContractProof }
  | { state: "error" };

function ConsentContractCard() {
  const [load, setLoad] = useState<ConsentProofLoad>({ state: "loading" });

  function reload() {
    setLoad({ state: "loading" });
    void getConsentLedgerContractProof()
      .then((value) => setLoad({ state: "ready", value }))
      .catch(() => setLoad({ state: "error" }));
  }

  useEffect(reload, []);

  if (load.state === "loading") {
    return <div className="h-64 animate-pulse rounded-2xl bg-muted/55" aria-busy="true" />;
  }

  if (load.state === "error") {
    return (
      <section className="rounded-2xl border border-amber-300/40 bg-card p-6 text-center">
        <RefreshCw className="mx-auto h-5 w-5 text-amber-600" aria-hidden />
        <h2 className="mt-3 font-serif text-xl text-foreground">
          O contrato do ledger não respondeu.
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Nenhuma garantia de persistência foi presumida.
        </p>
        <button
          type="button"
          onClick={reload}
          className="mt-4 min-h-11 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
        >
          Verificar novamente
        </button>
      </section>
    );
  }

  const proof = load.value;
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-2xl border border-primary/25 bg-card shadow-sm"
    >
      <div className="grid lg:grid-cols-[0.65fr_1.35fr]">
        <div className="border-b border-border/60 bg-gradient-to-br from-primary/[0.13] via-card to-amber-500/[0.06] p-5 lg:border-r lg:border-b-0">
          <History className="h-6 w-6 text-primary" aria-hidden />
          <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
            Contrato event-sourced
          </p>
          <p className="mt-3 font-mono text-4xl font-semibold text-foreground">
            {proof.passedCheckCount}/{proof.checkCount}
          </p>
          <h2 className="mt-1 font-serif text-xl text-foreground">invariantes verificadas</h2>
          <div className="mt-5 rounded-xl border border-amber-300/35 bg-amber-500/[0.045] p-3">
            <p className="font-mono text-xs font-semibold text-foreground">
              runtime: {proof.runtime}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              As decisões abaixo vivem somente nesta sessão. Recarregar apaga o histórico demo.
            </p>
          </div>
        </div>
        <div className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                Revisão · revogação · concorrência
              </p>
              <h2 className="mt-1 font-serif text-xl text-foreground">
                Consentimento é um histórico, não um toggle
              </h2>
            </div>
            <span className="rounded-full border border-emerald-300/50 bg-emerald-500/[0.08] px-3 py-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
              {proof.status}
            </span>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {proof.checks.map((item) => (
              <article
                key={item.id}
                className="flex items-start gap-2 rounded-xl border border-border/55 bg-muted/20 p-3"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
                <div>
                  <p className="text-xs font-medium text-foreground">{item.label}</p>
                  <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                    {item.note}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function ConsentsCard() {
  const [events, setEvents] = useState<ConsentLedgerEvent[]>(CONSENT_INITIAL_EVENTS);
  const [receipt, setReceipt] = useState<ConsentDecisionReceipt | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const projection = useMemo(() => projectConsentLedger(CONSENT_PURPOSES, events), [events]);

  function toggle(id: string) {
    if (!projection.valid) return;
    const item = CONSENT_ITEMS.find((candidate) => candidate.id === id);
    const state = projection.states.find((candidate) => candidate.purposeId === id);
    if (!item || !state) return;

    const decision = state.granted ? "revoked" : "granted";
    const nextRevision = state.revision + 1;
    const result = applyConsentDecision(CONSENT_PURPOSES, events, {
      requestId: `demo-consent:${id}:${nextRevision}:${decision}`,
      purposeId: id,
      decision,
      expectedRevision: state.revision,
      policyVersion: item.policyVersion,
      occurredAt: new Date(
        Date.parse(CONSENT_DEMO_BASE_TIME) + (events.length + 1) * 1_000,
      ).toISOString(),
    });

    if (!result.accepted) {
      setMutationError(`A alteração foi recusada: ${result.reason}.`);
      return;
    }
    setEvents(result.events);
    setReceipt(result.receipt);
    setMutationError(null);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.15 }}
      className="rounded-2xl border border-border/70 bg-card shadow-sm"
    >
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" aria-hidden />
          <p className="font-medium text-card-foreground">Consentimentos ativos</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Mude quando quiser. Cada alteração cria uma revisão nesta sessão; nenhuma escolha gera
          punição.
        </p>
      </div>
      <div className="space-y-1 px-3 pb-4">
        {!projection.valid ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            O histórico está inconsistente e foi bloqueado: {projection.reason}.
          </div>
        ) : (
          CONSENT_ITEMS.map((item) => {
            const state = projection.states.find((candidate) => candidate.purposeId === item.id)!;
            return (
              <div
                key={item.id}
                className="flex items-start gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-muted/20"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-card-foreground">{item.label}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                  <p className="mt-1 font-mono text-[9px] text-muted-foreground">
                    política {state.policyVersion} · revisão {state.revision} ·{" "}
                    {state.granted ? "concedido" : "revogado"}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={state.granted}
                  aria-label={`${item.label}: ${state.granted ? "ativado" : "desativado"}`}
                  disabled={item.required}
                  onClick={() => toggle(item.id)}
                  className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${
                    state.granted ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition-all ${
                      state.granted ? "left-[1.375rem]" : "left-0.5"
                    }`}
                    aria-hidden
                  />
                </button>
              </div>
            );
          })
        )}
        {mutationError && (
          <p className="rounded-xl border border-amber-300/40 bg-amber-500/5 p-3 text-xs text-amber-800 dark:text-amber-300">
            {mutationError}
          </p>
        )}
        {receipt && (
          <div className="mx-3 mt-3 rounded-xl border border-primary/20 bg-primary/[0.045] p-4">
            <div className="flex items-center gap-2">
              <DatabaseZap className="h-4 w-4 text-primary" aria-hidden />
              <p className="text-xs font-medium text-foreground">Recibo da última decisão</p>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-[10px] sm:grid-cols-4">
              <LedgerField label="finalidade" value={receipt.purposeId} />
              <LedgerField label="revisão" value={String(receipt.revision)} />
              <LedgerField label="decisão" value={receipt.decision} />
              <LedgerField label="persistência" value={receipt.persisted ? "Cloud" : "efêmera"} />
            </dl>
            <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
              Revogação é efetiva nesta projeção imediatamente. Este recibo demo não possui peso
              jurídico e desaparece ao recarregar.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function LedgerField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-background/45 p-2">
      <dt className="uppercase tracking-[0.11em] text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-all font-mono font-semibold text-foreground">{value}</dd>
    </div>
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
              <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                ✓ Solicitação registrada (demo) — em produção, processada em até 15 dias
              </p>
            )}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
