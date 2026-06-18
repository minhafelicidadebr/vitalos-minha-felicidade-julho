// Academia engine — puro. Compõe sinais de aprendizagem sem conhecer setor:
// necessidades coletivas (IVO/IEV agregado) definem prioridade; forças pessoais
// declaradas (VIA-T) definem afinidade. O motor só ranqueia catálogo injetado,
// nunca interpreta resposta bruta, não computa perfil e não importa de domain/.

export type PathRelevance = "prioritaria" | "afinidade" | "recomendada";

export interface LearningSignal {
  id: string;
  label: string;
}

export interface RankablePath {
  id: string;
  roles: string[];
  targetPillarIds: string[];
  targetStrengthIds?: string[];
}

export interface RankedPath<P extends RankablePath> {
  path: P;
  relevance: PathRelevance;
  matchedPillars: LearningSignal[];
  matchedStrengths: LearningSignal[];
  /**
   * Explica a ordenação sem fingir precisão científica: prioridade coletiva
   * pesa mais que afinidade pessoal; o número não é exposto como score humano.
   */
  relevanceWeight: number;
}

export interface RecommendPathsOptions {
  roleId: string;
  priorityPillars: LearningSignal[];
  affinityStrengths?: LearningSignal[];
}

export interface RoleLearningTargets {
  pillarIds: string[];
  strengthIds: string[];
}

const PRIORITY_WEIGHT = 100;
const AFFINITY_WEIGHT = 20;

function normalize(id: string): string {
  return id.trim().toLocaleLowerCase("pt-BR");
}

function matchingSignals(targetIds: string[], signals: LearningSignal[]): LearningSignal[] {
  const targets = new Set(targetIds.map(normalize));
  return signals.filter((signal) => targets.has(normalize(signal.id)));
}

export function getRoleLearningTargets<P extends RankablePath>(
  paths: P[],
  roleId: string,
): RoleLearningTargets {
  const visible = paths.filter((path) => path.roles.includes(roleId));
  return {
    pillarIds: [...new Set(visible.flatMap((path) => path.targetPillarIds))],
    strengthIds: [...new Set(visible.flatMap((path) => path.targetStrengthIds ?? []))],
  };
}

export function recommendPaths<P extends RankablePath>(
  paths: P[],
  opts: RecommendPathsOptions,
): RankedPath<P>[] {
  const affinityStrengths = opts.affinityStrengths ?? [];

  return paths
    .map((path, catalogOrder) => {
      if (!path.roles.includes(opts.roleId)) return null;

      const matchedPillars = matchingSignals(path.targetPillarIds, opts.priorityPillars);
      const matchedStrengths = matchingSignals(path.targetStrengthIds ?? [], affinityStrengths);
      const relevance: PathRelevance =
        matchedPillars.length > 0
          ? "prioritaria"
          : matchedStrengths.length > 0
            ? "afinidade"
            : "recomendada";
      const relevanceWeight =
        matchedPillars.length * PRIORITY_WEIGHT + matchedStrengths.length * AFFINITY_WEIGHT;

      return {
        ranked: {
          path,
          relevance,
          matchedPillars,
          matchedStrengths,
          relevanceWeight,
        } satisfies RankedPath<P>,
        catalogOrder,
      };
    })
    .filter(
      (
        item,
      ): item is {
        ranked: RankedPath<P>;
        catalogOrder: number;
      } => item !== null,
    )
    .sort(
      (a, b) =>
        b.ranked.relevanceWeight - a.ranked.relevanceWeight || a.catalogOrder - b.catalogOrder,
    )
    .map(({ ranked }) => ranked);
}
