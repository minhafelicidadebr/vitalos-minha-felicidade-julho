// Resolve o mapa lever→driver a partir do vocabulário que os dois catálogos JÁ compartilham
// de fato (pillarIds — ver engine/evolucao/lever-driver-bridge.ts). Extraído para não duplicar
// esta composição entre maintenance-bridge.server.ts (Vigia I-E4) e pgr-from-plan.server.ts
// (PGR real). Sem I/O — só compõe config estática; pode ser importado por qualquer .server.ts.

import { buildLeverToDriverMap } from "@/engine/evolucao/lever-driver-bridge";
import { FORECAST_LEVERS } from "@/mocks/forecast-mock";
import { NR1_CROSSWALK } from "@/mocks/nr1-crosswalk-mock";

export function resolveLeverToDriverMap(): Map<string, string | null> {
  const leverPillars = FORECAST_LEVERS.map((l) => ({ leverId: l.id, pillarIds: l.targetPillarIds }));
  const driverPillars = NR1_CROSSWALK.drivers.map((d) => ({ driverId: d.id, pillarIds: d.pillarIds }));
  return buildLeverToDriverMap(leverPillars, driverPillars);
}
