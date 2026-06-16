// Seletor de dados de ciclo por setor. O framework (índice) já vem do pack ativo
// via usePack().index; aqui resolvemos os AGREGADOS de demonstração coerentes com
// esse framework. Garante a honestidade do switch: ao ativar o pack Escola, `/ivo`
// computa o IEV real sobre agregados escolares — nunca dados de empresa relabelados.
//
// Invariante (provada em sector-data.test.ts): todo pillarId dos agregados existe
// no framework do mesmo setor. Sem isso, calculateIVO produziria zeros silenciosos.

import type { IVOInput } from "@/engine/index/ivo-engine";
import { ivoCurrentCycle, ivoPreviousCycle, DEMO_ORG } from "./ivo-mock";
import { SCHOOL_CYCLE, SCHOOL_CYCLE_PREVIOUS, SCHOOL_ORG } from "./school-mock";

export interface SectorData {
  org: { name: string; participationRate: number };
  currentCycle: IVOInput;
  previousCycle: IVOInput;
}

const SECTOR_DATA: Record<string, SectorData> = {
  enterprise: {
    org: { name: DEMO_ORG.name, participationRate: DEMO_ORG.participationRate },
    currentCycle: ivoCurrentCycle,
    previousCycle: ivoPreviousCycle,
  },
  school: {
    org: { name: SCHOOL_ORG.name, participationRate: SCHOOL_ORG.participationRate },
    currentCycle: SCHOOL_CYCLE,
    previousCycle: SCHOOL_CYCLE_PREVIOUS,
  },
};

export function getSectorData(packId: string): SectorData {
  return SECTOR_DATA[packId] ?? SECTOR_DATA.enterprise!;
}
