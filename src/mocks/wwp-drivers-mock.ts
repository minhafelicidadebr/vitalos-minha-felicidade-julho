// Vínculos driver WWP → pilares do índice (mock-first, por pack). É o conector que faz a
// Revisão Espaçada e a Academia priorizarem pelo que a organização mais precisa (Medir →
// Educar). Vocabulário/mapeamento vivem aqui; o driver-pillar-bridge engine só recebe.
//
// Os driverId espelham os cartões em flashcard-mock.ts. Os pillarId são os IDs reais do
// framework do pack (enterprise: ivo-framework.json). Packs sem mapa caem em ordem de
// catálogo, sem prioridade presumida (fallback honesto).

import type { DriverPillarLink } from "@/engine/learning/driver-pillar-bridge";

const WWP_DRIVER_PILLARS: Record<string, DriverPillarLink[]> = {
  enterprise: [
    { driverId: "seguranca_psicologica", pillarIds: ["seguranca_psicologica"] },
    { driverId: "reconhecimento", pillarIds: ["reconhecimento_pares"] },
    { driverId: "energia", pillarIds: ["energia_vitalidade"] },
    { driverId: "proposito", pillarIds: ["proposito_significado"] },
    { driverId: "autonomia", pillarIds: ["equilibrio_autonomia"] },
    { driverId: "pertencimento", pillarIds: ["comunicacao_pertencimento"] },
    { driverId: "crescimento", pillarIds: ["crescimento_maestria"] },
  ],
};

/** Vínculos driver→pilar do pack ativo, ou [] quando o pack não declara mapa. */
export function getDriverPillarLinks(packId: string): DriverPillarLink[] {
  return WWP_DRIVER_PILLARS[packId] ?? [];
}
