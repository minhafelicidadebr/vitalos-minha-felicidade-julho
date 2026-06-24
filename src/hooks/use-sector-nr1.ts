// Hook centralizado: resolve dados NR-1 (COPSOQ) do setor ativo.
// Consome usePack().packId e resolve via nr1-sector-exposure selectors.
// Engines NR-1 são puros — recebem estes dados como parâmetro.
// Quando o usuário troca setor no PackSwitcher, TUDO recomputa reativamente.

import { useMemo } from "react";
import { usePack } from "@/engine/pack";
import {
    getSectorExposure,
    getSectorCycles,
    getSectorPgrMeasures,
    getSectorMeasureMaintenance,
} from "@/mocks/nr1-sector-exposure";

/**
 * Hook reativo que entrega os dados NR-1 do setor ativo.
 * Muda automaticamente quando o usuário troca de pack no header.
 */
export function useSectorNR1() {
    const { packId } = usePack();

    const exposure = useMemo(() => getSectorExposure(packId), [packId]);
    const cycles = useMemo(() => getSectorCycles(packId), [packId]);
    const measures = useMemo(() => getSectorPgrMeasures(packId), [packId]);
    const maintenance = useMemo(() => getSectorMeasureMaintenance(packId), [packId]);

    return { packId, exposure, cycles, measures, maintenance };
}
