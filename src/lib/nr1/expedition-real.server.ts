// Fronteira server-only da Expedição contra a Drenagem REAL (I4, Academia
// Viva 2.0) — a mesma composição do dossiê PGR real
// (pgr-document-real.server.ts), reaplicada ao bestiário.
//
// COMPOSIÇÃO ponta a ponta (zero motor novo, zero duplicação):
//   loadOrgCycleHistory   → histórico REAL do Cofre de Ciclos (S6.75)
//   loadRealPgrPlan       → PGR real (Plano Vivo + Ponte lever→driver)
//   rankDriversByExposure → o MESMO ranking que /matriz e /drivers usam
//   buildReavaliacao      → o MESMO motor de /evolucao-nr1
//   selectSeasonAntagonist / assessBestiary → os MESMOS motores puros do
//   demo (expedition-engine.ts) — o v1 mock só trocava a fonte do dado.
//
// HONESTIDADE: nunca inventa antagonista sem medição. 0 ciclos → sem
// seleção nem avaliação (bestiary "dominando" por padrão, sem prova
// nenhuma citada). <2 ciclos → sem leitura longitudinal (drivers vazio,
// efficacy null — cada assessAntagonist já degrada graciosamente para
// "dominando"/"sem reavaliação medida"). Sem Plano Vivo ativo → efficacy
// null (nunca um antagonista "derrotado" sem prova de eficácia plena).
//
// Seguro apenas em .server.ts — não importar em código de cliente.

import { rankDriversByExposure, exposuresFromLoadScores } from "@/engine/nr1/crosswalk-engine";
import { buildReavaliacao, type CycleExposure } from "@/engine/nr1/reavaliacao-engine";
import {
  assessBestiary,
  selectSeasonAntagonist,
  type AntagonistAssessment,
  type SeasonAntagonistSelection,
} from "@/engine/academia/expedition-engine";
import { getCollectiveNarrative } from "@/engine/gamification/gamification-engine";
import { NR1_CROSSWALK } from "@/mocks/nr1-crosswalk-mock";
import { resolvePackBundle } from "@/domain/packs/registry";
import { loadOrgCycleHistory } from "@/lib/evolucao/cycle-history.server";
import { loadRealPgrPlan } from "@/lib/evolucao/pgr-from-plan.server";

export interface RealExpeditionState {
  cycleCount: number;
  hasActivePlan: boolean;
  selection: SeasonAntagonistSelection | null;
  assessments: AntagonistAssessment[];
}

/**
 * Monta o estado real da Expedição para uma organização. `null` quando o
 * pack não declara `collectiveNarrative` (mesma regra do demo — a UI
 * esconde a seção inteira).
 */
export async function loadRealExpeditionState(
  orgId: string,
  packId: string,
  instrument = "COPSOQ",
): Promise<RealExpeditionState | null> {
  const bundle = resolvePackBundle(packId);
  if (!bundle.gamification) return null;
  const bestiary = getCollectiveNarrative(bundle.gamification);
  if (!bestiary) return null;

  const history = await loadOrgCycleHistory(orgId, instrument);
  if (history.length === 0) {
    return { cycleCount: 0, hasActivePlan: false, selection: null, assessments: [] };
  }

  const latestExposures = exposuresFromLoadScores(history[history.length - 1]!.dimensions);
  const needs = rankDriversByExposure(NR1_CROSSWALK, latestExposures);
  const selection = selectSeasonAntagonist(bestiary, needs);

  if (history.length < 2) {
    // Sem leitura longitudinal ainda — antagonistas todos "dominando",
    // honestamente, mas a seleção da temporada já é real (1 ciclo já
    // ranqueia o driver pior-medido).
    const assessments = assessBestiary(bestiary, [], null);
    return { cycleCount: 1, hasActivePlan: false, selection, assessments };
  }

  const cycles: CycleExposure[] = history.map((capsule) => ({
    cycleId: capsule.cohortId,
    label: capsule.closedOn,
    exposures: exposuresFromLoadScores(capsule.dimensions),
  }));

  const plan = await loadRealPgrPlan(orgId, latestExposures);
  const reavaliacao = buildReavaliacao({
    registry: NR1_CROSSWALK,
    cycles,
    pgrPlan: plan ?? undefined,
  });

  const assessments = assessBestiary(bestiary, reavaliacao.drivers, reavaliacao.efficacy);
  return { cycleCount: history.length, hasActivePlan: !!plan, selection, assessments };
}
