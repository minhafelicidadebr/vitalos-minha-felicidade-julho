import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/app/shell/AppShell";
import { usePersona } from "@/engine/rbac/rbac";
import { usePack } from "@/engine/pack";
import {
  getAntiGamingRules,
  getParticipationLedgerConfig,
} from "@/engine/gamification/gamification-engine";
import {
  hasParticipationEvidence,
  type ParticipationRecordResult,
} from "@/engine/gamification/participation-ledger";
import { useParticipationLedger } from "@/engine/gamification/participation-store";
import { calculateIVO } from "@/engine/index/ivo-engine";
import {
  getRoleLearningTargets,
  recommendPaths,
  type LearningSignal,
  type PathRelevance,
  type RankedPath,
} from "@/engine/academia/academia-engine";
import { getSectorData } from "@/mocks/sector-data";
import { getLearningPaths, pathProgress, type LearningPath } from "@/mocks/academia-mock";
import { GAMIFICATION_TODAY } from "@/mocks/gamification-mock";
import { MARINA_VIAT_RESULT, VIAT_INTRO } from "@/mocks/viat-mock";

export const Route = createFileRoute("/academia")({
  head: () => ({ meta: [{ title: "Academia adaptativa — 4 Lentes VitalOS™" }] }),
  component: AcademiaPage,
});

const FORMAT_ICON: Record<string, string> = {
  vídeo: "▶",
  leitura: "▤",
  prática: "✦",
  quiz: "?",
};

const PERSONAL_STRENGTH_ROLES = new Set(["COLABORADOR", "EMBAIXADOR", "LIDER_EQUIPE"]);

function AcademiaPage() {
  const { roleId } = usePersona();
  const { index, packId, status, t, reload } = usePack();
  const academyName = t("academy", "Academia do Florescimento");
  const indexLabel = t("index", packId === "school" ? "IEV" : "IVO");

  const recommendation = useMemo(() => {
    if (!index) {
      return {
        priorityPillars: [] as LearningSignal[],
        affinityStrengths: [] as LearningSignal[],
        ranked: [] as RankedPath<LearningPath>[],
      };
    }

    const catalog = getLearningPaths(packId);
    const roleTargets = getRoleLearningTargets(catalog, roleId);
    const eligiblePillarIds = new Set(roleTargets.pillarIds);
    const current = calculateIVO(getSectorData(packId).currentCycle, index);
    const priorityPillars = current.lenses
      .flatMap((lens) => lens.pillars)
      .filter((pillar) => pillar.visible && eligiblePillarIds.has(pillar.pillarId))
      .sort((a, b) => a.score - b.score)
      .slice(0, 4)
      .map((pillar) => ({ id: pillar.pillarId, label: pillar.pillarName }));
    const affinityStrengths =
      packId === "enterprise" && PERSONAL_STRENGTH_ROLES.has(roleId)
        ? MARINA_VIAT_RESULT.top5.map((strength) => ({
            id: strength.id,
            label: strength.name,
          }))
        : [];

    return {
      priorityPillars,
      affinityStrengths,
      ranked: recommendPaths(catalog, {
        priorityPillars,
        affinityStrengths,
        roleId,
      }),
    };
  }, [index, packId, roleId]);

  if (status.state === "idle" || status.state === "loading") {
    return (
      <AppShell>
        <div className="mx-auto max-w-4xl space-y-4 px-4 py-8 sm:px-6" aria-busy="true">
          <div className="h-4 w-44 animate-pulse rounded bg-muted" />
          <div className="h-10 w-3/4 animate-pulse rounded-xl bg-muted" />
          <div className="h-28 animate-pulse rounded-3xl bg-muted/70" />
          <div className="h-40 animate-pulse rounded-3xl bg-muted/70" />
        </div>
      </AppShell>
    );
  }

  if (status.state === "error" || !index) {
    return (
      <AppShell>
        <div className="mx-auto flex min-h-[55vh] max-w-xl items-center px-4 py-12 sm:px-6">
          <div className="w-full rounded-3xl border border-destructive/30 bg-card p-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-destructive">
              Curadoria indisponível
            </p>
            <h1 className="mt-3 font-serif text-2xl text-foreground">
              Não foi possível ler o framework deste setor.
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Nenhuma recomendação foi fabricada. Recarregue o pack para tentar novamente.
            </p>
            <button
              type="button"
              onClick={reload}
              className="mt-6 min-h-11 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  const priorityCount = recommendation.ranked.filter(
    (item) => item.relevance === "prioritaria",
  ).length;
  const affinityCount = recommendation.ranked.filter(
    (item) => item.relevance === "afinidade",
  ).length;

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {academyName} · Curadoria adaptativa
          </p>
          <h1 className="mt-1 font-serif text-3xl text-foreground sm:text-4xl">
            Aprender a partir do que importa agora
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-muted-foreground">
            O {indexLabel} agregado sinaliza necessidades da comunidade.{" "}
            {recommendation.affinityStrengths.length > 0
              ? "Seu mapa VIA-T demonstrativo acrescenta afinidades para tornar o caminho mais natural."
              : "As trilhas são filtradas para o seu papel e para o contexto do setor."}
          </p>
        </motion.header>

        <RecommendationBasis
          indexLabel={indexLabel}
          priorityPillars={recommendation.priorityPillars}
          affinityStrengths={recommendation.affinityStrengths}
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl text-foreground">Sua curadoria</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {priorityCount > 0
                ? priorityCount === 1
                  ? "1 trilha responde às prioridades coletivas."
                  : `${priorityCount} trilhas respondem às prioridades coletivas.`
                : "Nenhuma trilha coincide diretamente com as prioridades atuais."}{" "}
              {affinityCount > 0 &&
                (affinityCount === 1
                  ? "1 segue afinidades de forças."
                  : `${affinityCount} seguem afinidades de forças.`)}
            </p>
          </div>
          <span className="rounded-full border border-border/70 bg-card px-3 py-1.5 text-xs text-muted-foreground">
            {recommendation.ranked.length}{" "}
            {recommendation.ranked.length === 1 ? "trilha" : "trilhas"} para este papel
          </span>
        </div>

        {recommendation.ranked.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border/60 bg-card/40 p-10 text-center">
            <p className="font-serif text-xl text-foreground">Catálogo em preparação</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              Ainda não existe uma trilha publicada para este papel neste pack. O VitalOS™ não
              reaproveita conteúdo de outro setor apenas para preencher a tela.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {recommendation.ranked.map((ranked, index) => (
              <PathCard key={ranked.path.id} ranked={ranked} delay={0.04 * (index + 1)} />
            ))}
          </div>
        )}

        <div className="rounded-2xl border border-border/70 bg-muted/30 px-5 py-4">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Pontos de aprendizagem celebram participação e aplicação prática. Nunca alimentam
            avaliação, nota, promoção, remuneração ou ranking de pessoas. As prioridades do{" "}
            {indexLabel} vêm apenas de agregados protegidos. Nesta demonstração, conclusões feitas
            aqui permanecem somente na sessão atual.
          </p>
        </div>

        {recommendation.affinityStrengths.length > 0 && (
          <div
            className="rounded-r-xl border-l-4 border-amber-400 bg-amber-50/60 px-5 py-4 dark:bg-amber-950/20"
            role="note"
          >
            <p className="text-xs leading-relaxed text-amber-900 dark:text-amber-300">
              {VIAT_INTRO.disclaimer}
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function RecommendationBasis({
  indexLabel,
  priorityPillars,
  affinityStrengths,
}: {
  indexLabel: string;
  priorityPillars: LearningSignal[];
  affinityStrengths: LearningSignal[];
}) {
  return (
    <section className="grid overflow-hidden rounded-3xl border border-border/70 bg-card shadow-sm md:grid-cols-2">
      <div className="p-5 sm:p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
          Necessidade coletiva · {indexLabel}
        </p>
        <h2 className="mt-2 font-serif text-xl text-foreground">
          Onde a comunidade pede aprendizagem
        </h2>
        {priorityPillars.length > 0 ? (
          <>
            <div className="mt-4 flex flex-wrap gap-2">
              {priorityPillars.map((pillar) => (
                <span
                  key={pillar.id}
                  className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary"
                >
                  {pillar.label}
                </span>
              ))}
            </div>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              São os pilares visíveis, pertinentes a este papel, com menor leitura agregada. Isso
              orienta a curadoria, não culpa pessoas.
            </p>
          </>
        ) : (
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Não há um sinal agregado autorizado para orientar este papel neste momento. Nenhuma
            prioridade será presumida.
          </p>
        )}
      </div>

      <div className="border-t border-border/60 bg-muted/25 p-5 sm:p-6 md:border-l md:border-t-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-600 dark:text-violet-300">
          Afinidade pessoal · Forças
        </p>
        {affinityStrengths.length > 0 ? (
          <>
            <h2 className="mt-2 font-serif text-xl text-foreground">
              Como aprender com mais naturalidade
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {affinityStrengths.map((strength) => (
                <span
                  key={strength.id}
                  className="rounded-full bg-violet-100 px-3 py-1.5 text-xs font-medium text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
                >
                  {strength.label}
                </span>
              ))}
            </div>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              Afinidade não é déficit nem prescrição. É uma porta de entrada opcional baseada no{" "}
              <Link to="/viat" className="font-medium text-foreground underline underline-offset-2">
                {VIAT_INTRO.title}
              </Link>
              .
            </p>
          </>
        ) : (
          <>
            <h2 className="mt-2 font-serif text-xl text-foreground">
              Sem perfil individual presumido
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Para este setor ou papel, a curadoria usa somente contexto agregado e permissões do
              pack. Nenhuma força pessoal é inferida.
            </p>
          </>
        )}
      </div>
    </section>
  );
}

function PathCard({ ranked, delay }: { ranked: RankedPath<LearningPath>; delay: number }) {
  const { path, relevance, matchedPillars, matchedStrengths } = ranked;
  const { gamification } = usePack();
  const events = useParticipationLedger((state) => state.events);
  const recordParticipation = useParticipationLedger((state) => state.record);
  const [open, setOpen] = useState(false);
  const doneIds = new Set(
    path.modules
      .filter((module) =>
        hasParticipationEvidence(events, "learning_module", `${path.id}:${module.id}`),
      )
      .map((module) => module.id),
  );

  const progress =
    path.modules.length > 0
      ? Math.round((doneIds.size / path.modules.length) * 100)
      : pathProgress(path);
  const complete =
    hasParticipationEvidence(events, "learning_path", path.id) ||
    (path.modules.length > 0 && doneIds.size === path.modules.length);

  function completeModule(moduleId: string): ParticipationRecordResult | null {
    if (!gamification) return null;
    const config = getParticipationLedgerConfig(gamification);
    const antiGaming = getAntiGamingRules(gamification);
    const result = recordParticipation(
      {
        id: `learning-module:${path.id}:${moduleId}`,
        kind: "learning_module",
        sourceId: `${path.id}:${moduleId}`,
        occurredOn: GAMIFICATION_TODAY,
      },
      config.awards,
      antiGaming,
    );
    const completedAfter = new Set([...doneIds, moduleId]);

    if (completedAfter.size === path.modules.length) {
      recordParticipation(
        {
          id: `learning-path:${path.id}`,
          kind: "learning_path",
          sourceId: path.id,
          occurredOn: GAMIFICATION_TODAY,
        },
        config.awards,
        antiGaming,
      );
    }
    return result;
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm"
    >
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex min-h-20 w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-card-foreground">{path.title}</p>
            <RelevanceBadge relevance={relevance} />
            {complete && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                ✓ Concluída
              </span>
            )}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{path.description}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {path.focusLabel} · {path.modules.length} módulos · +{path.learnPoints} pontos de
            aprendizagem
          </p>
          {(matchedPillars.length > 0 || matchedStrengths.length > 0) && (
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
              {matchedPillars.length > 0 && (
                <span className="text-primary">
                  Prioridade: {matchedPillars.map((signal) => signal.label).join(" · ")}
                </span>
              )}
              {matchedStrengths.length > 0 && (
                <span className="text-violet-600 dark:text-violet-300">
                  Afinidade: {matchedStrengths.map((signal) => signal.label).join(" · ")}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className="text-xs font-semibold tabular-nums text-foreground">{progress}%</span>
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground">{open ? "Recolher" : "Abrir"}</span>
        </div>
      </button>

      {open && (
        <div className="space-y-1 border-t border-border/50 px-3 py-3">
          {path.modules.map((module) => {
            const done = doneIds.has(module.id);
            return (
              <div
                key={module.id}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/20"
              >
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted text-xs font-semibold text-muted-foreground"
                  aria-hidden
                >
                  {FORMAT_ICON[module.format]}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm ${
                      done ? "text-muted-foreground line-through" : "text-card-foreground"
                    }`}
                  >
                    {module.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {module.format} · {module.minutes} min
                  </p>
                </div>
                {done ? (
                  <span className="px-3 text-xs text-emerald-600 dark:text-emerald-400">
                    Concluído
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => completeModule(module.id)}
                    className="min-h-11 rounded-lg border border-input px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Concluir
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </motion.article>
  );
}

function RelevanceBadge({ relevance }: { relevance: PathRelevance }) {
  if (relevance === "prioritaria") {
    return (
      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
        Prioridade coletiva
      </span>
    );
  }
  if (relevance === "afinidade") {
    return (
      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
        Afinidade de força
      </span>
    );
  }
  return (
    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      Recomendada ao papel
    </span>
  );
}
