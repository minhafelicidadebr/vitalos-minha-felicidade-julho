// Ponte Plano Vivo → PGR — engine PURO (destrava `efficacy` na Reavaliação NR-1 real).
//
// O Plano Vivo real (S6.1/§13) já grava, por ação, a MESMA hierarquia de controle NR-01
// (controlTier: eliminação/organização/administrativa/monitoramento) e um status real,
// derivado por fold do Action Log (nunca opinião — action-log-engine.ts). Este engine
// converte esses itens reais em PgrMeasureSeed[] (a entrada de pgr-engine.buildPgrPlan),
// usando a Ponte lever→driver (lever-driver-bridge.ts) para resolver o driverId — a MESMA
// ponte que já destrava a Vigia de Manutenção real (I-E4).
//
// HONESTIDADE: um item sem controlTier (nunca classificado na hierarquia) ou cujo lever não
// tem correspondência real com nenhum driver (bridge devolve null) fica FORA do PGR — nunca
// uma medida sem tier real ou sem driver real correspondente. Nada aqui deriva por semana:
// o status vem sempre do dado real (via PgrMeasureSeed.knownStatus).
//
// Engine puro: sem React, sem I/O, sem imports de domain/.

import type { ControlTier as PlanoControlTier } from "../action-plan/plan-enrichment-engine";
import type { PlanActionStatus } from "../action-plan/action-log-engine";
import type { MeasureStatus, PgrMeasureSeed } from "./pgr-engine";

/** Um item do Plano Vivo real, no recorte mínimo que este bridge precisa. */
export interface PlanMeasureSourceItem {
  leverId: string;
  controlTier: PlanoControlTier | null;
  title: string;
  description: string;
  ownerRoleLabel: string | null;
  status: PlanActionStatus;
}

const DEFAULT_RESPONSIBLE = "Responsável a definir";

/**
 * PlanActionStatus (5 valores, o fold real do Action Log) → MeasureStatus (3 valores, o
 * vocabulário do PGR). "interrompida" nunca é creditada como concluída — cai em "planejada"
 * (a leitura mais conservadora: uma medida interrompida não pode ser contada como feita).
 * "em_vigilancia" é pós-conclusão (Vigia I-E4) — continua "implementada".
 */
const STATUS_MAP: Record<PlanActionStatus, MeasureStatus> = {
  planejada: "planejada",
  em_execucao: "em_andamento",
  concluida: "implementada",
  em_vigilancia: "implementada",
  interrompida: "planejada",
};

/**
 * Converte os itens reais do Plano Vivo em medidas do PGR, resolvendo driverId pela Ponte
 * lever→driver. Determinístico: preserva a ordem de entrada; um driver pode receber várias
 * medidas (várias ações mapeiam para o mesmo driver) — pgr-engine já agrupa por driverId.
 */
export function buildPgrMeasuresFromPlan(
  items: readonly PlanMeasureSourceItem[],
  leverToDriver: ReadonlyMap<string, string | null>,
): PgrMeasureSeed[] {
  const seeds: PgrMeasureSeed[] = [];
  for (const item of items) {
    if (!item.controlTier) continue; // sem classificação real na hierarquia NR-01

    const driverId = leverToDriver.get(item.leverId);
    if (!driverId) continue; // sem correspondência real — nunca um match forçado

    const action = item.description.trim() || item.title.trim();
    if (!action) continue;

    seeds.push({
      driverId,
      tier: item.controlTier,
      action,
      responsible: item.ownerRoleLabel?.trim() || DEFAULT_RESPONSIBLE,
      knownStatus: STATUS_MAP[item.status],
    });
  }
  return seeds;
}
