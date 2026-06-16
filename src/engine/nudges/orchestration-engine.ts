// Orchestration engine — puro. Fecha o laço M.E.T.E. da FlorescerIA Proativa:
// uma proposta aprovada (agent-engine) vira um PLANO DE ENTREGA concreto para o
// pilar-alvo, COMPONDO o nudge-engine (selectNudges) — sem reimplementar a seleção.
// Honestidade: o plano expõe o que NÃO será entregue (aguardando opt-in, ou no teto
// de frequência da semana). Privacidade por construção: opt-in e cap são respeitados,
// não contornados. Nunca importa de domain/.

import { selectNudges, type NudgeDef, type NudgeDelivery } from "./nudge-engine";

export interface DeliveryPlan {
  pillarId: string;
  /** Nudges que SERÃO entregues (respeitando papel, opt-in e cap semanal). */
  delivered: NudgeDelivery[];
  /** Nudges para o pilar que exigem opt-in ainda não concedido. */
  optInPending: number;
  /** Nudges bloqueados por já terem atingido o teto de frequência na semana. */
  capped: number;
  /** Total de nudges da biblioteca que endereçam este pilar. */
  candidateCount: number;
}

export function planDelivery(
  library: NudgeDef[],
  opts: {
    pillarId: string;
    role: string;
    optedInNudgeIds: Set<string>;
    deliveredThisWeek: Map<string, number>;
    max?: number;
  },
): DeliveryPlan {
  const forPillar = library.filter((n) => n.pillarId === opts.pillarId);

  const delivered = selectNudges(forPillar, {
    role: opts.role,
    optedInNudgeIds: opts.optedInNudgeIds,
    deliveredThisWeek: opts.deliveredThisWeek,
    max: opts.max ?? 2,
  });

  const optInPending = forPillar.filter(
    (n) => n.optInRequired && !opts.optedInNudgeIds.has(n.id),
  ).length;
  const capped = forPillar.filter(
    (n) => (opts.deliveredThisWeek.get(n.id) ?? 0) >= n.frequencyCapPerWeek,
  ).length;

  return {
    pillarId: opts.pillarId,
    delivered,
    optInPending,
    capped,
    candidateCount: forPillar.length,
  };
}
