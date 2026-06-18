// Live economy — puro. A gamificação VIVA: as missões do momento não são uma lista
// estática — DERIVAM do laço real (onda aberta → responder; prioridade → apoiar;
// trilha recomendada → aprender). Cada XP passa pelo teto ético (clampXpAward), e a
// regra de ouro é explícita: XP celebra contribuição à cultura, JAMAIS desempenho,
// promoção ou remuneração. Compõe o gamification-engine; não reinventa a economia.
// Nunca importa de domain/.

import { clampXpAward, type AntiGamingRules } from "./gamification-engine";

export type MissionAxis = "mensurar" | "educar" | "transformar";
export type LiveMissionStatus = "pending" | "in_progress" | "completed";

export interface LiveMission {
  id: string;
  axis: MissionAxis;
  title: string;
  baseXp: number;
  /** XP após o teto diário ético (clampXpAward). */
  xp: number;
  route: string;
  status: LiveMissionStatus;
  progressPct: number;
  evidenceSourceId: string;
}

export interface LiveMissionContext {
  waveOpen: boolean;
  waveId: string;
  waveInstrument: string;
  alreadyResponded: boolean;
  topPriorityId: string | null;
  topPriorityLabel: string | null;
  priorityEvidenceRecorded: boolean;
  recommendedPathId: string | null;
  recommendedPathTitle: string | null;
  recommendedPathCompletedModules: number;
  recommendedPathTotalModules: number;
  recommendedPathCompleted: boolean;
}

export const ETHICAL_XP_RULE =
  "XP celebra contribuição à cultura — nunca desempenho, promoção, remuneração ou ranking de pessoas.";

const BASE_XP: Record<MissionAxis, number> = { mensurar: 25, transformar: 20, educar: 15 };

export function deriveLiveMissions(
  ctx: LiveMissionContext,
  rules: AntiGamingRules,
  earnedToday = 0,
): LiveMission[] {
  const out: LiveMission[] = [];
  const clamp = (base: number) => clampXpAward(base, earnedToday, rules);

  // Mensurar — permanece visível depois da resposta como prova do ciclo fechado.
  if (ctx.waveOpen || ctx.alreadyResponded) {
    out.push({
      id: "mission-responder",
      axis: "mensurar",
      title: `Responder à onda de ${ctx.waveInstrument}`,
      baseXp: BASE_XP.mensurar,
      xp: clamp(BASE_XP.mensurar),
      route: "/responder",
      status: ctx.alreadyResponded ? "completed" : "pending",
      progressPct: ctx.alreadyResponded ? 100 : 0,
      evidenceSourceId: ctx.waveId,
    });
  }

  // Transformar — apoiar a maior alavancagem do momento.
  if (ctx.topPriorityLabel) {
    out.push({
      id: "mission-prioridade",
      axis: "transformar",
      title: `Apoiar a prioridade: ${ctx.topPriorityLabel}`,
      baseXp: BASE_XP.transformar,
      xp: clamp(BASE_XP.transformar),
      route: "/missoes",
      status: ctx.priorityEvidenceRecorded ? "completed" : "pending",
      progressPct: ctx.priorityEvidenceRecorded ? 100 : 0,
      evidenceSourceId: ctx.topPriorityId ?? "priority-unavailable",
    });
  }

  // Educar — concluir a trilha que a leitura recomenda.
  if (ctx.recommendedPathTitle) {
    out.push({
      id: "mission-trilha",
      axis: "educar",
      title: `Concluir a trilha: ${ctx.recommendedPathTitle}`,
      baseXp: BASE_XP.educar,
      xp: clamp(BASE_XP.educar),
      route: "/academia",
      status: ctx.recommendedPathCompleted
        ? "completed"
        : ctx.recommendedPathCompletedModules > 0
          ? "in_progress"
          : "pending",
      progressPct:
        ctx.recommendedPathTotalModules > 0
          ? Math.round(
              (ctx.recommendedPathCompletedModules / ctx.recommendedPathTotalModules) * 100,
            )
          : 0,
      evidenceSourceId: ctx.recommendedPathId ?? "path-unavailable",
    });
  }

  return out;
}
