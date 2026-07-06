// Ponte lever→driver — engine PURO (destrava Vigia I-E4 e Ata de Vitória I-E2).
//
// O Plano Vivo (action-plan-engine) identifica intervenções por `leverId`
// (Playbook); a Reavaliação NR-1 (crosswalk-engine/reavaliacao-engine)
// identifica risco por `driverId` (NR1_CROSSWALK) — os dois vocabulários
// NUNCA foram unificados neste produto. Em vez de inventar uma
// correspondência sem base, este engine usa o vocabulário que os DOIS já
// compartilham de fato: cada lever declara `targetPillarIds` (IVO) e cada
// driver do crosswalk declara `pillarIds` (IVO) — a mesma ponte que
// `driver-pillar-bridge.ts` já usa para outro par de vocabulários (Academia↔IVO).
//
// HONESTIDADE: um lever sem NENHUM pilar em comum com nenhum driver não tem
// correspondência — o resultado é `null`, nunca um match forçado. Empates de
// sobreposição são resolvidos por ordem alfabética do driverId
// (determinístico, sem favorecer nenhum setor).
//
// Engine puro: sem React, sem I/O, sem imports de domain/.

export interface LeverPillars {
  leverId: string;
  pillarIds: readonly string[];
}

export interface DriverPillars {
  driverId: string;
  pillarIds: readonly string[];
}

export interface LeverDriverMatch {
  driverId: string;
  /** Quantos pilares o lever e o driver têm em comum — a força do match. */
  overlapCount: number;
}

/** Todos os drivers com ≥1 pilar em comum, por sobreposição desc (empate por id). */
export function matchDriversForLever(
  lever: LeverPillars,
  drivers: readonly DriverPillars[],
): LeverDriverMatch[] {
  const leverSet = new Set(lever.pillarIds);
  return drivers
    .map((d) => ({
      driverId: d.driverId,
      overlapCount: d.pillarIds.filter((p) => leverSet.has(p)).length,
    }))
    .filter((m) => m.overlapCount > 0)
    .sort((a, b) => b.overlapCount - a.overlapCount || a.driverId.localeCompare(b.driverId));
}

/** O driver mais provável para o lever — maior sobreposição; null se nenhum pilar em comum. */
export function bestDriverForLever(
  lever: LeverPillars,
  drivers: readonly DriverPillars[],
): string | null {
  return matchDriversForLever(lever, drivers)[0]?.driverId ?? null;
}

/** Mapa lever_id → driverId mais provável, para todos os levers de uma vez. */
export function buildLeverToDriverMap(
  levers: readonly LeverPillars[],
  drivers: readonly DriverPillars[],
): Map<string, string | null> {
  return new Map(levers.map((l) => [l.leverId, bestDriverForLever(l, drivers)]));
}
