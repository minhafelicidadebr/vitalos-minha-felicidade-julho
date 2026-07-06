// Fronteira server-only da Vigia de Manutenção REAL (I-E4, destrava Ata de
// Vitória I-E2). Compõe o Plano Vivo real (action_log, S6.1-S6.3) com a Ponte
// lever→driver (engine/evolucao/lever-driver-bridge.ts) para responder: "a
// medida que este driver do crosswalk precisaria ainda está em funcionamento?"
//
// NADA aqui inventa a correspondência lever↔driver — ela é computada por
// sobreposição de pilares IVO (o vocabulário que FORECAST_LEVERS e
// NR1_CROSSWALK já compartilham de fato). Um lever sem pilar em comum com
// nenhum driver simplesmente não contribui — nunca um match forçado.
//
// Seguro apenas em .server.ts — não importar em código de cliente.

import { buildLeverToDriverMap } from "@/engine/evolucao/lever-driver-bridge";
import { summarizeActionLog } from "@/engine/action-plan/action-log-engine";
import { loadLatestActionPlanForOrg } from "@/lib/api/action-plan.server";
import { toActionLogEvents } from "@/lib/api/action-plan-shapes";
import { FORECAST_LEVERS } from "@/mocks/forecast-mock";
import { NR1_CROSSWALK } from "@/mocks/nr1-crosswalk-mock";

/**
 * Manutenção real por driver — driverId → medida mantida (true/false).
 * Ausência de entrada = nenhum lever do Plano Vivo desta org mapeia para esse
 * driver (nunca presumida mantida; ver evaluateVictoryCondition).
 *
 * Regra de agregação (conservadora): se ≥1 lever mapeado ao driver está em
 * desuso, o driver inteiro NÃO é creditado — um driver só é "mantido" se
 * TODAS as medidas de fonte que o endereçam seguem funcionando.
 */
export async function loadRealMaintenanceByDriver(
  orgId: string,
): Promise<Record<string, boolean>> {
  const plan = await loadLatestActionPlanForOrg(orgId);
  if (!plan || plan.items.length === 0) return {};

  const events = toActionLogEvents(plan);
  const leverIds = plan.items.map((item) => item.leverId);
  const summary = summarizeActionLog(events, leverIds);

  const leverPillars = FORECAST_LEVERS.map((l) => ({ leverId: l.id, pillarIds: l.targetPillarIds }));
  const driverPillars = NR1_CROSSWALK.drivers.map((d) => ({ driverId: d.id, pillarIds: d.pillarIds }));
  const leverToDriver = buildLeverToDriverMap(leverPillars, driverPillars);

  const maintenanceByDriver: Record<string, boolean> = {};
  for (const leverId of leverIds) {
    const driverId = leverToDriver.get(leverId);
    if (!driverId) continue;
    const maintained = summary.maintenanceByAction[leverId];
    if (maintained === undefined) continue; // sem atestação — nunca presumida

    maintenanceByDriver[driverId] =
      maintenanceByDriver[driverId] === undefined ? maintained : maintenanceByDriver[driverId] && maintained;
  }
  return maintenanceByDriver;
}
