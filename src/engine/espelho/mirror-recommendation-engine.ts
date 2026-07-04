// Bússola Pessoal — motor FINO de composição (Mensurar Vivo, I-M4).
//
// Este motor não inventa recomendação nenhuma: ele deriva a NECESSIDADE
// PESSOAL (fatores mais baixos da autoavaliação → seus pilares), junta a
// prioridade COLETIVA injetada (do IVO agregado — série real via Cofre de
// Ciclos no S6.75) e a AFINIDADE consentida (top-5 VIA-T), e entrega tudo ao
// recommendPaths do academia-engine — a mesma régua honesta 100×20 que a
// Academia já usa (necessidade > afinidade). Saídas: trilhas (Educar) e uma
// micro-missão (Transformar, escreve no Diário de Prática I7).
//
// Ética: linguagem de convite, nunca de correção — quem nomeia a faixa é o
// vocabulário do pack; este motor só ordena. Nada aqui é prescrição clínica.

import {
  recommendPaths,
  type LearningSignal,
  type RankablePath,
  type RankedPath,
} from "../academia/academia-engine";
import type { MissionDef } from "../gamification/gamification-engine";
import type { PersonalAssessmentResult } from "./personal-assessment-engine";

export interface MirrorCompassInput<P extends RankablePath> {
  personal: PersonalAssessmentResult | null;
  /** Top forças consentidas (VIA-T) como sinais de afinidade. */
  affinityStrengths: LearningSignal[];
  /** Prioridade coletiva do índice agregado (injetada; nunca derivada aqui). */
  collectivePriority: LearningSignal[];
  paths: P[];
  missions: MissionDef[];
  roleId: string;
  /** Nº de fatores pessoais mais baixos considerados necessidade (default 2). */
  lowestFactorCount?: number;
  /** Nº máximo de trilhas recomendadas (default 3). */
  maxPaths?: number;
  /** Rótulos por pilar (vocabulário do pack) p/ sinais pessoais. */
  pillarLabels: Readonly<Record<string, string>>;
}

export interface MirrorCompass<P extends RankablePath> {
  /** Pilares derivados dos fatores pessoais mais baixos — a necessidade É sua. */
  personalPriorityPillars: LearningSignal[];
  recommendations: RankedPath<P>[];
  /** Micro-missão do pilar pessoal prioritário (fallback: coletivo). */
  microMission: MissionDef | null;
}

/** Fatores com dados, do menor score para o maior. */
export function lowestFactors(
  personal: PersonalAssessmentResult | null,
  count: number,
): PersonalAssessmentResult["factors"] {
  if (!personal) return [];
  return personal.factors
    .filter((f) => f.score !== null)
    .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))
    .slice(0, count);
}

export function buildMirrorCompass<P extends RankablePath>(
  input: MirrorCompassInput<P>,
): MirrorCompass<P> {
  const lowest = lowestFactors(input.personal, input.lowestFactorCount ?? 2);

  const personalPriorityPillars: LearningSignal[] = [];
  const seen = new Set<string>();
  for (const factor of lowest) {
    for (const pillarId of factor.pillarIds) {
      if (seen.has(pillarId)) continue;
      seen.add(pillarId);
      personalPriorityPillars.push({
        id: pillarId,
        label: input.pillarLabels[pillarId] ?? pillarId,
      });
    }
  }

  // Necessidade pessoal primeiro; a coletiva soma sem duplicar.
  const priorityPillars = [
    ...personalPriorityPillars,
    ...input.collectivePriority.filter((signal) => !seen.has(signal.id)),
  ];

  const recommendations = recommendPaths(input.paths, {
    roleId: input.roleId,
    priorityPillars,
    affinityStrengths: input.affinityStrengths,
  }).slice(0, input.maxPaths ?? 3);

  const personalIds = new Set(personalPriorityPillars.map((s) => s.id));
  const collectiveIds = new Set(input.collectivePriority.map((s) => s.id));
  const microMission =
    input.missions.find((m) => personalIds.has(m.pillarId)) ??
    input.missions.find((m) => collectiveIds.has(m.pillarId)) ??
    null;

  return { personalPriorityPillars, recommendations, microMission };
}
