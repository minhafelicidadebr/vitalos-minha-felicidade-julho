// /lupa-da-escuta — I-M7 (Mensurar Vivo): telemetria k-anon do funil de
// resposta por item. Mede a qualidade do INSTRUMENTO — onde as pessoas
// param, quanto tempo cada item consome — nunca vigia a pessoa. Cross-tenant
// por design (§E1 do blueprint, Trilho A: zero identidade por arquitetura):
// aberta como /benchmark, sem RBAC — o dado só existe agregado e k-anon≥5.

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Loader2, Search, ShieldCheck } from "lucide-react";
import { AppShell } from "@/app/shell/AppShell";
import { usePack } from "@/engine/pack";
import { getRegisteredWaveSurveyKeys, getWaveSurvey } from "@/mocks/survey-mock";
import { loadSurveyFunnelResult, type LoadSurveyFunnelResult } from "@/lib/api/survey-telemetry.functions";
import type { ItemFunnelStat, SurveyTelemetryResult } from "@/engine/survey/survey-telemetry-engine";

export const Route = createFileRoute("/lupa-da-escuta")({
  head: () => ({ meta: [{ title: "Lupa da Escuta — 4 Lentes VitalOS™" }] }),
  component: LupaDaEscutaPage,
});

function instrumentsForPack(packId: string): string[] {
  const prefix = `${packId}:`;
  return getRegisteredWaveSurveyKeys()
    .filter((key) => key.startsWith(prefix))
    .map((key) => key.slice(prefix.length));
}

function instrumentLabel(packId: string, instrument: string): string {
  return getWaveSurvey(packId, instrument)?.intro.eyebrow ?? instrument;
}

function LupaDaEscutaPage() {
  const { packId } = usePack();
  const instruments = useMemo(() => instrumentsForPack(packId), [packId]);
  const [instrument, setInstrument] = useState(instruments[0] ?? "");
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<LoadSurveyFunnelResult | null>(null);

  useEffect(() => {
    setInstrument(instruments[0] ?? "");
  }, [instruments]);

  useEffect(() => {
    if (!instrument) return;
    let active = true;
    setLoading(true);
    loadSurveyFunnelResult({ data: { packId, instrument } })
      .then((r) => active && setResult(r))
      .catch(() => active && setResult({ cloudReady: false }))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [packId, instrument]);

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-primary">
            <Search className="h-4 w-4" aria-hidden />
            Mensurar · Lupa da Escuta
          </div>
          <h1 className="mt-2 font-serif text-3xl text-foreground sm:text-4xl">
            Onde o instrumento pesa
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Telemetria agregada e anônima do funil de resposta, por item — nunca por pessoa. Ajuda a
            encurtar, reordenar ou reescrever os itens que mais pesam, em toda a base de organizações
            (nunca um recorte por cliente).
          </p>
        </motion.div>

        {instruments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {instruments.map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setInstrument(i)}
                aria-pressed={instrument === i}
                className={`rounded-xl border px-3 py-2 text-sm transition-all ${
                  instrument === i
                    ? "border-foreground/40 bg-card shadow-sm"
                    : "border-border/60 bg-card/50 text-muted-foreground hover:border-border"
                }`}
              >
                {instrumentLabel(packId, i)}
              </button>
            ))}
          </div>
        )}

        {loading && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Carregando…
          </p>
        )}

        {!loading && result && !result.cloudReady && (
          <div className="rounded-2xl border border-border/70 bg-card p-8 text-center">
            <p className="font-serif text-xl text-foreground">Lovable Cloud não está ativo</p>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
              A Lupa da Escuta lê telemetria real de respostas — sem Lovable Cloud não há dado a
              agregar.
            </p>
          </div>
        )}

        {!loading && result && result.cloudReady && !result.funnel.ok && (
          <div className="rounded-2xl border border-border/70 bg-card p-8 text-center">
            <ShieldCheck className="mx-auto h-8 w-8 text-primary" aria-hidden />
            <p className="mt-2 font-serif text-xl text-foreground">Amostra protegida</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              Ainda há menos de {result.funnel.kAnonymityMin} sessões registradas para este
              instrumento — nenhuma leitura é exibida abaixo do k-anonimato mínimo.
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              {result.funnel.totalSessions} de {result.funnel.kAnonymityMin} sessões mínimas.
            </p>
          </div>
        )}

        {!loading && result && result.cloudReady && result.funnel.ok && (
          <FunnelView funnel={result.funnel} />
        )}
      </div>
    </AppShell>
  );
}

function FunnelView({ funnel }: { funnel: Extract<SurveyTelemetryResult, { ok: true }> }) {
  const completionPct = Math.round(funnel.completionRate * 100);
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Sessões (k-anon)" value={String(funnel.totalSessions)} />
        <StatCard label="Taxa de conclusão" value={`${completionPct}%`} />
        <StatCard
          label="Tempo típico entre itens"
          value={funnel.overallMedianDeltaMs !== null ? `${Math.round(funnel.overallMedianDeltaMs / 1000)}s` : "—"}
        />
      </div>

      <div className="space-y-2.5">
        {funnel.items.map((item) => (
          <ItemRow key={item.itemId} item={item} />
        ))}
      </div>

      <div className="rounded-2xl border border-border/50 bg-muted/30 p-4">
        <p className="text-xs leading-relaxed text-muted-foreground">{funnel.disclaimer}</p>
      </div>
    </motion.div>
  );
}

function ItemRow({ item }: { item: ItemFunnelStat }) {
  if (!item.visible) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-border/60 bg-card/40 px-4 py-3">
        <span className="text-xs text-muted-foreground">
          Item {item.position + 1} — amostra protegida (k-anonimato)
        </span>
      </div>
    );
  }

  const timeLabel = item.medianDeltaMs !== null ? `${Math.round(item.medianDeltaMs / 1000)}s` : "—";

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-card-foreground">Item {item.position + 1}</span>
        <div className="flex items-center gap-2 text-xs">
          {item.highLoad && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/50 bg-amber-50 px-2 py-0.5 font-medium text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
              <AlertTriangle className="h-3 w-3" aria-hidden /> Carga alta
            </span>
          )}
          <span className="text-muted-foreground">{timeLabel} típicos</span>
        </div>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${item.reachedPct ?? 0}%` }}
          aria-label={`Respondido por ${item.reachedPct}% das sessões`}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{item.reachedPct}% responderam</span>
        {item.dropOffPct !== null && item.dropOffPct > 0 && (
          <span className="text-orange-600 dark:text-orange-400">−{item.dropOffPct}% vs. anterior</span>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <p className="font-serif text-2xl tabular-nums text-foreground">{value}</p>
      <p className="mt-1 text-xs leading-tight text-muted-foreground">{label}</p>
    </div>
  );
}
