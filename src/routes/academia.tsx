import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/app/shell/AppShell";
import { usePersona } from "@/engine/rbac/rbac";
import { usePack } from "@/engine/pack";
import { calculateIVO } from "@/engine/index/ivo-engine";
import { recommendPaths, type PathRelevance } from "@/engine/academia/academia-engine";
import { getSectorData } from "@/mocks/sector-data";
import { LEARNING_PATHS, pathProgress, type LearningPath } from "@/mocks/academia-mock";

export const Route = createFileRoute("/academia")({
  head: () => ({ meta: [{ title: "Academia do Florescimento — 4 Lentes VitalOS™" }] }),
  component: AcademiaPage,
});

const FORMAT_ICON: Record<string, string> = {
  vídeo: "▶",
  leitura: "📖",
  prática: "✍",
  quiz: "❓",
};

function AcademiaPage() {
  const { roleId } = usePersona();
  const { index, packId } = usePack();

  // Dirigida pelo dado: as lentes/pilares mais fracos da organização puxam as
  // trilhas prioritárias (compõe o IVO do setor ativo + o catálogo de trilhas).
  const ranked = useMemo(() => {
    const lowestPillarNames = index
      ? calculateIVO(getSectorData(packId).currentCycle, index)
          .lenses.flatMap((l) => l.pillars)
          .filter((p) => p.visible)
          .sort((a, b) => a.score - b.score)
          .slice(0, 4)
          .map((p) => p.pillarName)
      : [];
    return recommendPaths(LEARNING_PATHS, { lowestPillarNames, roleId });
  }, [index, packId, roleId]);

  const priorityCount = ranked.filter((r) => r.relevance === "prioritaria").length;

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Academia do Florescimento
          </p>
          <h1 className="mt-1 font-serif text-3xl text-foreground">Aprender é parte do trabalho</h1>
          <p className="mt-2 text-base leading-relaxed text-muted-foreground">
            Trilhas curtas (módulos de 5–8 min) para o seu papel.{" "}
            {priorityCount > 0
              ? "As marcadas como prioritárias endereçam o que a organização mais precisa agora."
              : "Concluir rende Pontos de Aprendizagem — nunca cobrança."}
          </p>
        </motion.div>

        {ranked.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhuma trilha publicada para este papel ainda. Em breve!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {ranked.map((r, i) => (
              <PathCard
                key={r.path.id}
                path={r.path}
                relevance={r.relevance}
                matchedPillar={r.matchedPillar}
                delay={0.05 * (i + 1)}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function PathCard({
  path,
  relevance,
  matchedPillar,
  delay,
}: {
  path: LearningPath;
  relevance?: PathRelevance;
  matchedPillar?: string | null;
  delay: number;
}) {
  const [open, setOpen] = useState(false);
  const [doneIds, setDoneIds] = useState<Set<string>>(
    () => new Set(path.modules.filter((m) => m.done).map((m) => m.id)),
  );

  const progress = Math.round((doneIds.size / path.modules.length) * 100) || pathProgress(path);
  const complete = doneIds.size === path.modules.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay }}
      className="rounded-2xl border border-border/70 bg-card shadow-sm overflow-hidden"
    >
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-muted/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-card-foreground">{path.title}</p>
            {relevance === "prioritaria" && (
              <span
                className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                title={matchedPillar ? `Endereça: ${matchedPillar}` : undefined}
              >
                ★ Prioritária
              </span>
            )}
            {complete && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/40 dark:text-green-300">
                ✓ Concluída
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{path.description}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {path.pillarName} · {path.modules.length} módulos · +{path.learnPoints} pts de
            aprendizagem
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className="text-xs font-semibold tabular-nums text-foreground">{progress}%</span>
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </button>

      {open && (
        <div className="space-y-1 border-t border-border/50 px-3 py-3">
          {path.modules.map((m) => {
            const done = doneIds.has(m.id);
            return (
              <div
                key={m.id}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-muted/20 transition-colors"
              >
                <span className="w-5 text-center text-sm" aria-hidden>
                  {FORMAT_ICON[m.format]}
                </span>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm ${done ? "text-muted-foreground line-through" : "text-card-foreground"}`}
                  >
                    {m.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {m.format} · {m.minutes} min
                  </p>
                </div>
                {done ? (
                  <span className="text-xs text-green-600 dark:text-green-400">✓</span>
                ) : (
                  <button
                    onClick={() => setDoneIds((prev) => new Set([...prev, m.id]))}
                    className="rounded-lg border border-input px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    Concluir (demo)
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
