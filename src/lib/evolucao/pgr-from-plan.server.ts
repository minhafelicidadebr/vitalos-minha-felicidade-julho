// Fronteira server-only do PGR REAL derivado do Plano Vivo (continuação de I-E4/I-E2 —
// destrava `efficacy` na Reavaliação NR-1 real). Composição, não invenção: cada action_item
// real já carrega `controlTier` (mesma hierarquia NR-01 do pgr-engine, gravada desde S6.1/§13)
// e um status real (fold do Action Log, nunca opinião). A Ponte lever→driver — a MESMA usada
// por maintenance-bridge.server.ts para a Vigia de Manutenção — resolve o driverId; sem
// correspondência real, o item fica fora do PGR.
//
// COMPOSIÇÃO ponta a ponta:
//   loadLatestActionPlanForOrg  → itens reais do Plano Vivo desta org (S6.1)
//   resolveLeverToDriverMap     → a mesma ponte de I-E4 (pillarIds compartilhados)
//   buildPgrMeasuresFromPlan    → medidas do PGR com status REAL (nunca derivado por semana)
//   buildPgrPlan                → o mesmo motor puro do PGR demo (/plano-nr1) — zero duplicação
//
// Seguro apenas em .server.ts — não importar em código de cliente.

import { buildPgrPlan, type PgrPlan } from "@/engine/nr1/pgr-engine";
import { buildPgrMeasuresFromPlan } from "@/engine/nr1/plan-pgr-bridge";
import type { DimensionExposure } from "@/engine/nr1/crosswalk-engine";
import { loadLatestActionPlanForOrg } from "@/lib/api/action-plan.server";
import { NR1_CROSSWALK } from "@/mocks/nr1-crosswalk-mock";
import { resolveLeverToDriverMap } from "./lever-driver-resolver";

const PGR_TOP_RISKS = 5;

/**
 * Monta o PGR real desta organização a partir do Plano Vivo ativo mais recente e da exposição
 * medida (tipicamente a última cápsula do Cofre de Ciclos). `null` quando não há plano — nunca
 * um PGR vazio fabricado para preencher a tela.
 */
export async function loadRealPgrPlan(
  orgId: string,
  exposures: readonly DimensionExposure[],
): Promise<PgrPlan | null> {
  const plan = await loadLatestActionPlanForOrg(orgId);
  if (!plan || plan.items.length === 0) return null;

  const leverToDriver = resolveLeverToDriverMap();
  const measures = buildPgrMeasuresFromPlan(
    plan.items.map((item) => ({
      leverId: item.leverId,
      controlTier: item.controlTier,
      title: item.title,
      description: item.description,
      ownerRoleLabel: item.owner?.roleLabel ?? null,
      status: item.status,
    })),
    leverToDriver,
  );

  return buildPgrPlan({
    registry: NR1_CROSSWALK,
    exposures: [...exposures],
    measures,
    generatedAt: new Date().toISOString().slice(0, 10),
    currentWeek: 13,
    horizonWeeks: 13,
    topRisks: PGR_TOP_RISKS,
  });
}
