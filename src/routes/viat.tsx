import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import { AppShell } from "@/app/shell/AppShell";
import { usePersona } from "@/app/identity/persona-store";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import {
  MARINA_VIAT_RESULT,
  ORG_VIAT_RESULT,
  VIAT_INTRO,
  VIAT_ITEM_TEXT,
  VIAT_DEMO_ITEMS,
  VIAT_MISSIONS,
  CLASSIFICATION_COPY,
  ICUFT_CLASS_COPY,
  DIAGNOSIS_COPY,
  VIRTUE_COLOR,
} from "@/mocks/viat-mock";
import type {
  StrengthScore,
  VirtueScore,
  ViatGroupResult,
  ViatGroupStrength,
} from "@/engine/viat/viat-engine";

export const Route = createFileRoute("/viat")({
  head: () => ({ meta: [{ title: "Mapa de Forças VIA-T — 4 Lentes VitalOS™" }] }),
  component: ViatPage,
});

type ViatView = "devolutiva" | "assessment" | "equipe";

const LEADER_ROLES = new Set([
  "LIDER_EQUIPE",
  "RH_ADMIN",
  "CHRO",
  "C_LEVEL",
  "HOLDING_ADMIN",
  "GESTOR_CARTEIRA",
]);

function ViatPage() {
  const { roleId } = usePersona();
  const canSeeTeam = LEADER_ROLES.has(roleId);
  const defaultView: ViatView =
    roleId === "RH_ADMIN" || roleId === "CHRO" ? "equipe" : "devolutiva";
  const [view, setView] = useState<ViatView>(defaultView);

  const result = useMemo(() => MARINA_VIAT_RESULT, []);

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {VIAT_INTRO.eyebrow}
          </p>
          <h1 className="mt-1 font-serif text-3xl text-foreground">{VIAT_INTRO.title}</h1>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {VIAT_INTRO.lead}
          </p>
        </motion.div>

        {/* Tab navigation */}
        {canSeeTeam && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex gap-1 rounded-xl border border-border/60 bg-muted/40 p-1 w-fit"
            role="tablist"
          >
            {(["devolutiva", "equipe"] as const).map((v) => (
              <button
                key={v}
                role="tab"
                aria-selected={view === v}
                onClick={() => setView(v)}
                className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all ${
                  view === v
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {v === "devolutiva" ? "Meu Mapa" : "Visão da Equipe"}
              </button>
            ))}
          </motion.div>
        )}

        {/* Views */}
        <AnimatePresence mode="wait">
          {view === "devolutiva" && (
            <motion.div
              key="devolutiva"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              <DevolutivaSection result={result} onStartAssessment={() => setView("assessment")} />
            </motion.div>
          )}

          {view === "assessment" && (
            <motion.div
              key="assessment"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <AssessmentSection onComplete={() => setView("devolutiva")} />
            </motion.div>
          )}

          {view === "equipe" && (
            <motion.div
              key="equipe"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <EquipeSection groupResult={ORG_VIAT_RESULT} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  );
}

// ─── Devolutiva individual ────────────────────────────────────────────────────

function DevolutivaSection({
  result,
  onStartAssessment,
}: {
  result: typeof MARINA_VIAT_RESULT;
  onStartAssessment: () => void;
}) {
  const [selectedStrength, setSelectedStrength] = useState<string>(result.top5[0]?.id ?? "");
  const mission = selectedStrength ? VIAT_MISSIONS[selectedStrength] : null;

  return (
    <div className="space-y-8">
      {/* Disclaimer individual */}
      <DisclaimerBanner text={VIAT_INTRO.disclaimer} />

      {/* Top 5 Forças Assinatura */}
      <section>
        <h2 className="mb-4 font-serif text-xl text-foreground">
          Suas Forças Percebidas no Trabalho
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {result.strengths
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)
            .map((s, i) => (
              <StrengthCard key={s.id} strength={s} rank={i + 1} />
            ))}
        </div>
        {/* Outras forças (6–24) */}
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
            Ver todas as {result.strengths.length} forças
          </summary>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {result.strengths
              .sort((a, b) => b.score - a.score)
              .slice(5)
              .map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2"
                >
                  <div>
                    <span className="text-sm text-card-foreground">{s.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{s.virtueName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1 w-16 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-muted-foreground/40"
                        style={{ width: `${(s.score / 10) * 100}%` }}
                      />
                    </div>
                    <span className="w-6 text-right text-xs tabular-nums text-muted-foreground">
                      {s.score}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </details>
      </section>

      {/* Radar das Virtudes */}
      <section>
        <h2 className="mb-4 font-serif text-xl text-foreground">Radar das Seis Virtudes</h2>
        <VirtueRadar virtues={result.virtues} />
      </section>

      {/* ICUFT + Diagnóstico */}
      <section>
        <h2 className="mb-4 font-serif text-xl text-foreground">Contexto Organizacional (ICUFT)</h2>
        <IcuftCard icuft={result.icuft} diagnosis={result.icuftDiagnosis} />
      </section>

      {/* Missão de 7 dias */}
      <section>
        <h2 className="mb-1 font-serif text-xl text-foreground">Missão de 7 Dias</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Escolha uma das suas Forças Assinatura e aplique de forma nova e concreta por 7 dias.
        </p>
        <MissionPicker
          top5={result.top5}
          selected={selectedStrength}
          onSelect={setSelectedStrength}
          mission={mission ?? null}
        />
      </section>

      {/* Global + CTA */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border/60 bg-muted/30 px-5 py-4">
        <div>
          <p className="text-xs text-muted-foreground">VIA-T Global (exploratório)</p>
          <p className="font-serif text-3xl text-foreground">
            {result.global} <span className="font-sans text-sm text-muted-foreground">/ 10</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Média das 24 forças — use como tendência, não como score definitivo.
          </p>
        </div>
        <button
          onClick={onStartAssessment}
          className="rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          Explorar o instrumento completo →
        </button>
      </div>
    </div>
  );
}

// ─── Card de força ────────────────────────────────────────────────────────────

function StrengthCard({ strength, rank }: { strength: StrengthScore; rank: number }) {
  const copy = CLASSIFICATION_COPY[strength.classification]!;
  const virtueColor = VIRTUE_COLOR[strength.virtueId] ?? "#6B7280";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: rank * 0.05 }}
      className={`rounded-2xl border border-border/60 p-4 ${copy.bg}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-background/60 text-xs font-semibold text-muted-foreground">
              {rank}
            </span>
            <h3 className="truncate font-medium text-card-foreground">{strength.name}</h3>
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: virtueColor }}
              aria-hidden
            />
            <span className="text-xs text-muted-foreground">{strength.virtueName}</span>
          </div>
        </div>
        <span className={`shrink-0 font-serif text-2xl font-semibold ${copy.color}`}>
          {strength.score}
        </span>
      </div>

      {/* Barra */}
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-background/60">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${(strength.score / 10) * 100}%`, background: virtueColor }}
        />
      </div>

      <span className={`mt-2 inline-block text-xs font-medium ${copy.color}`}>{copy.label}</span>
    </motion.div>
  );
}

// ─── Radar das virtudes ───────────────────────────────────────────────────────

function VirtueRadar({ virtues }: { virtues: VirtueScore[] }) {
  const data = virtues.map((v) => ({
    virtue: v.name.split(" e ")[0]?.split(" e Conhecimento")[0] ?? v.name,
    score: v.score,
    fill: VIRTUE_COLOR[v.id] ?? "#6B7280",
  }));

  const radarSummary = data.map((d) => `${d.virtue} ${d.score}`).join(", ");

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-6">
      <div role="img" aria-label={`Radar das seis virtudes (escala 0–10): ${radarSummary}.`}>
        <ResponsiveContainer width="100%" height={320}>
          <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
            <PolarGrid gridType="polygon" stroke="currentColor" strokeOpacity={0.12} />
            <PolarAngleAxis
              dataKey="virtue"
              tick={{ fontSize: 12, fontWeight: 500, fill: "currentColor" }}
            />
            <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
            <Radar
              name="Score"
              dataKey="score"
              stroke="#8B5CF6"
              fill="#8B5CF6"
              fillOpacity={0.15}
              strokeWidth={2}
            />
            <RechartsTooltip
              content={({ payload }) => {
                if (!payload?.length) return null;
                const d = payload[0];
                return (
                  <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md">
                    <p className="text-xs font-medium text-foreground">{d?.payload?.virtue}</p>
                    <p className="text-sm tabular-nums text-muted-foreground">{d?.value} / 10</p>
                  </div>
                );
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Legenda de virtudes */}
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        {virtues.map((v) => (
          <div key={v.id} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: VIRTUE_COLOR[v.id] }}
              aria-hidden
            />
            <span className="text-xs text-muted-foreground">
              {v.name.split(" e Conhecimento")[0]} · {v.score}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Card ICUFT + diagnóstico VIA×ICUFT ─────────────────────────────────────

function IcuftCard({
  icuft,
  diagnosis,
}: {
  icuft: typeof MARINA_VIAT_RESULT.icuft;
  diagnosis: typeof MARINA_VIAT_RESULT.icuftDiagnosis;
}) {
  const classCopy = ICUFT_CLASS_COPY[icuft.classification]!;
  const diagCopy = DIAGNOSIS_COPY[diagnosis]!;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* ICUFT score */}
      <div className="rounded-2xl border border-border/60 bg-card p-5">
        <p className="text-xs text-muted-foreground">
          ICUFT — Índice de Condições de Uso das Forças
        </p>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-serif text-4xl text-foreground">{icuft.score}</span>
          <span className="text-sm text-muted-foreground">/ 10</span>
        </div>
        <span className={`mt-1 inline-block text-sm font-medium ${classCopy.color}`}>
          {classCopy.label}
        </span>
        <p className="mt-1 text-xs text-muted-foreground">{classCopy.description}</p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-amber-500"
            style={{ width: `${(icuft.score / 10) * 100}%` }}
          />
        </div>
      </div>

      {/* Diagnóstico VIA×ICUFT */}
      <div className="rounded-2xl border border-border/60 bg-card p-5">
        <p className="text-xs text-muted-foreground">Diagnóstico VIA-T × ICUFT</p>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-3xl" aria-hidden>
            {diagCopy.icon}
          </span>
          <p className="font-medium text-card-foreground">{diagCopy.title}</p>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{diagCopy.description}</p>
        <div className="mt-3 rounded-lg bg-muted/60 px-3 py-2">
          <p className="text-xs leading-relaxed text-foreground">{diagCopy.action}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Missão de 7 dias ─────────────────────────────────────────────────────────

function MissionPicker({
  top5,
  selected,
  onSelect,
  mission,
}: {
  top5: StrengthScore[];
  selected: string;
  onSelect: (id: string) => void;
  mission: { mission: string; hint: string } | null;
}) {
  return (
    <div className="space-y-4">
      {/* Seletor de força */}
      <div className="flex flex-wrap gap-2">
        {top5.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${
              selected === s.id
                ? "border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300"
                : "border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground"
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* Missão */}
      <AnimatePresence mode="wait">
        {mission && (
          <motion.div
            key={selected}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="rounded-2xl border border-violet-200/60 bg-violet-50/50 p-5 dark:border-violet-800/40 dark:bg-violet-950/20"
          >
            <p className="font-medium text-violet-900 dark:text-violet-200">{mission.mission}</p>
            <p className="mt-2 text-xs leading-relaxed text-violet-700/70 dark:text-violet-400">
              {mission.hint}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Assessment demo ──────────────────────────────────────────────────────────

type AssessmentStage = "items" | "processing";

function AssessmentSection({ onComplete }: { onComplete: () => void }) {
  const [stage, setStage] = useState<AssessmentStage>("items");
  const [current, setCurrent] = useState(0);
  const [responses, setResponses] = useState<Record<string, number>>({});

  const item = VIAT_DEMO_ITEMS[current];
  const totalItems = VIAT_DEMO_ITEMS.length;
  const progress = Math.round((current / totalItems) * 100);
  const value = item ? (responses[item.itemId] ?? 5) : 5;

  function handleNext() {
    if (current + 1 >= totalItems) {
      setStage("processing");
      setTimeout(() => onComplete(), 1800);
    } else {
      setCurrent((c) => c + 1);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 py-4">
      {/* Disclaimer */}
      <DisclaimerBanner text={VIAT_INTRO.disclaimer} compact />

      <AnimatePresence mode="wait">
        {stage === "items" && item && (
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {/* Progresso */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {current + 1} de {totalItems}
                </span>
                <span className="rounded-full bg-muted px-2 py-0.5">{item.section}</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>

            {/* Item */}
            <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
              <p className="text-base leading-relaxed text-card-foreground">
                {VIAT_ITEM_TEXT[item.itemId]}
              </p>

              {/* Slider 0–10 */}
              <div className="mt-6 space-y-3">
                <Slider
                  min={0}
                  max={10}
                  step={0.5}
                  value={[value]}
                  onValueChange={([v]) => setResponses((r) => ({ ...r, [item.itemId]: v ?? 5 }))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0 — Nunca descreve</span>
                  <span className="font-semibold text-foreground tabular-nums">{value}</span>
                  <span>10 — Descreve muito</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleNext}
              className="w-full rounded-xl bg-foreground px-6 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              {current + 1 >= totalItems ? "Ver meu mapa →" : "Próxima →"}
            </button>
          </motion.div>
        )}

        {stage === "processing" && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center gap-4 py-20 text-center"
          >
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-muted border-t-violet-500" />
            <p className="text-lg font-medium text-foreground">Calculando seu mapa de forças…</p>
            <p className="text-xs text-muted-foreground">
              Resultado demonstrativo — em produção, as 48 perguntas completas são consideradas.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Dashboard de equipe ──────────────────────────────────────────────────────

function EquipeSection({ groupResult }: { groupResult: ViatGroupResult }) {
  const icuftCopy = groupResult.icuftClassification
    ? ICUFT_CLASS_COPY[groupResult.icuftClassification]
    : null;
  const diagCopy = groupResult.icuftDiagnosis ? DIAGNOSIS_COPY[groupResult.icuftDiagnosis] : null;

  const radarData = groupResult.virtues
    .filter((v) => v.visible && v.avgScore !== null)
    .map((v) => ({
      virtue: v.name.split(" e ")[0]?.split(" e Conhecimento")[0] ?? v.name,
      score: v.avgScore ?? 0,
    }));

  return (
    <div className="space-y-8">
      {/* Disclaimer coletivo */}
      <DisclaimerBanner text={VIAT_INTRO.groupDisclaimer} />

      {/* Resumo */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <p className="text-xs text-muted-foreground">Respondentes</p>
          <p className="mt-1 font-serif text-4xl text-foreground">{groupResult.n}</p>
          <p className="text-xs text-muted-foreground">k-anonimato: n ≥ {groupResult.minN}</p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <p className="text-xs text-muted-foreground">VIA-T Global médio</p>
          <p className="mt-1 font-serif text-4xl text-foreground">
            {groupResult.globalAvg ?? "—"}
            <span className="font-sans text-sm text-muted-foreground"> / 10</span>
          </p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <p className="text-xs text-muted-foreground">ICUFT médio</p>
          <p className="mt-1 font-serif text-4xl text-foreground">
            {groupResult.icuftAvg ?? "—"}
            <span className="font-sans text-sm text-muted-foreground"> / 10</span>
          </p>
          {icuftCopy && (
            <span className={`text-xs font-medium ${icuftCopy.color}`}>{icuftCopy.label}</span>
          )}
        </div>
      </div>

      {/* Diagnóstico e alertas */}
      {(diagCopy || groupResult.alerts.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {diagCopy && (
            <div className="rounded-2xl border border-border/60 bg-card p-5">
              <p className="text-xs text-muted-foreground">Diagnóstico VIA-T × ICUFT</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-2xl" aria-hidden>
                  {diagCopy.icon}
                </span>
                <p className="font-medium text-card-foreground">{diagCopy.title}</p>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {diagCopy.action}
              </p>
            </div>
          )}

          {groupResult.alerts.length > 0 && (
            <div className="rounded-2xl border border-amber-200/60 bg-amber-50/40 p-5 dark:border-amber-800/40 dark:bg-amber-950/20">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                Alertas organizacionais
              </p>
              <div className="mt-2 space-y-3">
                {groupResult.alerts.map((alert) => (
                  <div key={alert.id}>
                    <p className="text-sm text-amber-900 dark:text-amber-200">{alert.message}</p>
                    <p className="mt-0.5 text-xs text-amber-700/70 dark:text-amber-400">
                      → {alert.action}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Radar das virtudes (agregado) */}
      {radarData.length > 0 && (
        <section>
          <h2 className="mb-4 font-serif text-xl text-foreground">
            Radar das Virtudes — Organização
          </h2>
          <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-6">
            <div
              role="img"
              aria-label={`Radar das virtudes da organização (escala 0–10): ${radarData
                .map((d) => `${d.virtue} ${d.score}`)
                .join(", ")}.`}
            >
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                  <PolarGrid gridType="polygon" stroke="currentColor" strokeOpacity={0.12} />
                  <PolarAngleAxis dataKey="virtue" tick={{ fontSize: 11, fill: "currentColor" }} />
                  <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
                  <Radar
                    name="Org"
                    dataKey="score"
                    stroke="#F59E0B"
                    fill="#F59E0B"
                    fillOpacity={0.12}
                    strokeWidth={2}
                  />
                  <RechartsTooltip
                    content={({ payload }) => {
                      if (!payload?.length) return null;
                      const d = payload[0];
                      return (
                        <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md">
                          <p className="text-xs font-medium text-foreground">
                            {d?.payload?.virtue}
                          </p>
                          <p className="text-sm tabular-nums text-muted-foreground">
                            {d?.value} / 10
                          </p>
                        </div>
                      );
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      )}

      {/* Top 10 forças */}
      <section>
        <h2 className="mb-4 font-serif text-xl text-foreground">Top 10 Forças da Organização</h2>
        <div className="rounded-2xl border border-border/70 bg-card divide-y divide-border/40">
          {groupResult.top10.map((s, i) => (
            <OrgStrengthRow key={s.id} strength={s} rank={i + 1} />
          ))}
        </div>
      </section>

      {/* Todas as forças */}
      <section>
        <h2 className="mb-4 font-serif text-xl text-foreground">Todas as Forças</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {groupResult.strengths
            .filter((s) => s.visible)
            .sort((a, b) => b.avgScore - a.avgScore)
            .map((s) => {
              const copy = CLASSIFICATION_COPY[s.classification]!;
              const virtueColor = VIRTUE_COLOR[s.virtueId] ?? "#6B7280";
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2.5"
                >
                  <div>
                    <span className="text-sm text-card-foreground">{s.name}</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: virtueColor }}
                        aria-hidden
                      />
                      <span className="text-xs text-muted-foreground">
                        {
                          groupResult.virtues
                            .find((v) => v.id === s.virtueId)
                            ?.name?.split(" e ")[0]
                        }
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(s.avgScore / 10) * 100}%`,
                          background: virtueColor,
                        }}
                      />
                    </div>
                    <span
                      className={`w-6 text-right text-xs font-medium tabular-nums ${copy.color}`}
                    >
                      {s.avgScore}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
        {groupResult.hiddenStrengthCount > 0 && (
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
            {groupResult.hiddenStrengthCount} força(s) oculta(s) por k-anonimato (n &lt;{" "}
            {groupResult.minN}).
          </p>
        )}
      </section>
    </div>
  );
}

// ─── Linha de força (ranking) ─────────────────────────────────────────────────

function OrgStrengthRow({ strength, rank }: { strength: ViatGroupStrength; rank: number }) {
  const copy = CLASSIFICATION_COPY[strength.classification]!;
  const virtueColor = VIRTUE_COLOR[strength.virtueId] ?? "#6B7280";

  return (
    <div className="flex items-center gap-4 px-5 py-3.5">
      <span className="w-5 shrink-0 text-center text-sm font-semibold text-muted-foreground">
        {rank}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-card-foreground">{strength.name}</span>
          <span className={`text-xs ${copy.color}`}>{copy.label}</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full"
            style={{ width: `${(strength.avgScore / 10) * 100}%`, background: virtueColor }}
          />
        </div>
      </div>
      <span className="shrink-0 font-serif text-xl text-foreground">{strength.avgScore}</span>
    </div>
  );
}

// ─── Disclaimer reutilizável ──────────────────────────────────────────────────

function DisclaimerBanner({ text, compact = false }: { text: string; compact?: boolean }) {
  return (
    <div
      className={`rounded-r-xl border-l-4 border-amber-400 bg-amber-50/60 dark:bg-amber-950/20 ${compact ? "px-3 py-2" : "px-5 py-4"}`}
      role="note"
      aria-label="Aviso sobre o instrumento"
    >
      <p
        className={`leading-relaxed text-amber-900 dark:text-amber-300 ${compact ? "text-xs" : "text-xs"}`}
      >
        {text}
      </p>
    </div>
  );
}
