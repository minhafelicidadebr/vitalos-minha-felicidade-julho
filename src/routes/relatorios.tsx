import { DemonstrationContext } from "@/components/DemonstrationContext";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/app/shell/AppShell";
import { EVIDENCES, REPORTS, SEAL_STATUS, type Evidence } from "@/mocks/relatorios-mock";

export const Route = createFileRoute("/relatorios")({
  head: () => ({ meta: [{ title: "Evidências, Relatórios e Selo — 4 Lentes VitalOS™" }] }),
  component: RelatoriosPage,
});

const TYPE_ICON: Record<Evidence["type"], string> = {
  foto: "📷",
  documento: "📄",
  checklist: "☑",
  relato: "💬",
};

function RelatoriosPage() {
  return (
    <AppShell>
      <div className="mx-auto min-w-0 max-w-5xl space-y-8 px-4 py-8 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Evidências · Relatórios · Certificação
          </p>
          <h1 className="mt-1 font-serif text-3xl text-foreground">Evidências e relatórios · demonstração</h1>
        </motion.div>

        <DemonstrationContext kind="reports" />

        <SealCard />

        <div className="grid gap-6 lg:grid-cols-2">
          <EvidencesCard />
          <ReportsCard />
        </div>
      </div>
    </AppShell>
  );
}

// ─── Selo Empresa Viva ────────────────────────────────────────────────────────

function SealCard() {
  const s = SEAL_STATUS;
  const doneCount = s.requirements.filter((r) => r.done).length;
  const progressToNext = Math.min(100, Math.round((s.ivoScore / s.nextLevelMin) * 100));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.05 }}
      className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-medium text-card-foreground">Selo Empresa Viva™ · exemplo</p>
          <p className="mt-1 text-xs text-muted-foreground">Modelo demonstrativo de certificação</p>
        </div>
        {/* Anel de progresso + nível atual — board-grade */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
            <svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90" aria-hidden>
              <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/40" />
              <circle
                cx="32" cy="32" r="28" fill="none"
                stroke="#C9A227" strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 28}`}
                strokeDashoffset={`${2 * Math.PI * 28 * (1 - progressToNext / 100)}`}
                className="transition-all duration-700"
              />
            </svg>
            <span className="relative text-2xl" aria-hidden>🌿</span>
          </div>
          <div>
            <p className="font-serif text-lg font-semibold text-foreground">{s.currentLevelName}</p>
            <p className="text-xs text-muted-foreground">IVO {s.ivoScore} · T1/2026</p>
            <p className="mt-0.5 text-xs font-medium" style={{ color: "#C9A227" }}>{progressToNext}% rumo ao próximo nível</p>
          </div>
        </div>
      </div>

      {/* Destino do próximo nível */}
      <p className="mt-4 text-xs text-muted-foreground">
        Próximo nível:{" "}
        <span className="font-medium text-foreground">{s.nextLevelName}</span>
        {" "}(IVO ≥ {s.nextLevelMin})
      </p>

      {/* Requirements */}
      <p className="mt-5 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
        Requisitos do próximo nível ({doneCount}/{s.requirements.length})
      </p>
      <ul className="mt-2 space-y-2">
        {s.requirements.map((r) => (
          <li key={r.id} className="flex items-start gap-2.5">
            <span
              className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border text-xs ${
                r.done
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-muted-foreground/40"
              }`}
              aria-hidden
            >
              {r.done ? "✓" : ""}
            </span>
            <div>
              <span
                className={`text-xs ${r.done ? "text-muted-foreground" : "text-card-foreground font-medium"}`}
              >
                {r.label}
              </span>
              <span className="ml-2 text-xs text-muted-foreground">{r.detail}</span>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{s.publicNote}</p>
    </motion.div>
  );
}

// ─── Evidências ───────────────────────────────────────────────────────────────

function EvidencesCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.1 }}
      className="rounded-2xl border border-border/70 bg-card shadow-sm"
    >
      <div className="px-5 pt-5 pb-2">
        <p className="font-medium text-card-foreground">Evidências de exemplo</p>
        <p className="text-xs text-muted-foreground">
          Exemplos de registros associados a ações. Os estados abaixo não representam aprovação de evidências da sua organização.
        </p>
      </div>
      <div className="space-y-1 px-3 pb-4">
        {EVIDENCES.map((ev) => (
          <div
            key={ev.id}
            className="flex items-start gap-3 rounded-xl px-3 py-3 hover:bg-muted/20 transition-colors"
          >
            <span className="mt-0.5 text-base" aria-hidden>
              {TYPE_ICON[ev.type]}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-card-foreground">{ev.title}</p>
              <p className="text-xs text-muted-foreground">
                {ev.linkedTo} · {ev.submittedBy} · {ev.date}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-medium ${
                ev.status === "aprovada"
                  ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {ev.status}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Relatórios ───────────────────────────────────────────────────────────────

function ReportsCard() {
  const [generatedId, setGeneratedId] = useState<string | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.15 }}
      className="rounded-2xl border border-border/70 bg-card shadow-sm"
    >
      <div className="px-5 pt-5 pb-2">
        <p className="font-medium text-card-foreground">Relatórios demonstrativos</p>
        <p className="text-xs text-muted-foreground">
          Sempre com dados agregados e fórmulas declaradas
        </p>
      </div>
      <div className="space-y-1 px-3 pb-4">
        {REPORTS.map((rep) => (
          <div key={rep.id} className="rounded-xl px-3 py-3 hover:bg-muted/20 transition-colors">
            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row">
              <div className="min-w-0">
                <p className="text-sm font-medium text-card-foreground">{rep.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {rep.description}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Para: {rep.audience} · {rep.pages} pág.
                </p>
              </div>
              <button
                onClick={() => setGeneratedId(rep.id)}
                className="min-h-11 shrink-0 rounded-lg border border-input px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                Simular geração de PDF
              </button>
            </div>
            {generatedId === rep.id && (
              <p role="status" className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Simulação concluída. Nenhum arquivo PDF foi gerado por esta ação.
              </p>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
