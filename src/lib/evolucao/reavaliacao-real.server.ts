// Fronteira server-only da Reavaliação NR-1 REAL (destrava I-E4 Vigia, I-E2
// Ata de Vitória e a `efficacy` da Reavaliação). Compõe o Cofre de Ciclos
// (S6.75, histórico real de capsules registradas) com a Vigia de Manutenção
// real (maintenance-bridge) E o PGR real derivado do Plano Vivo
// (pgr-from-plan.server.ts) para alimentar reavaliacao-engine.ts e
// victory-engine.ts com dado 100% real — SEM MUDAR UMA LINHA de nenhum dos
// engines consumidos (mesma assinatura de sempre: ReavaliacaoInput/
// VictoryConditionInput).
//
// `efficacy` (destravada nesta composição): o PGR real usa o `controlTier`
// e o status REAL de cada ação do Plano Vivo (nunca uma derivação por
// semana/cronograma — ver pgr-engine.knownStatus) e resolve o driverId pela
// mesma Ponte lever→driver da Vigia. Sem plano ativo ou sem nenhuma medida
// classificável, `pgrPlan` é `null` e `efficacy` permanece honestamente
// `null` — nunca um PGR fabricado para preencher a tela.
//
// Seguro apenas em .server.ts — não importar em código de cliente.

import {
  buildReavaliacao,
  type CycleExposure,
  type ReavaliacaoResult,
} from "@/engine/nr1/reavaliacao-engine";
import { exposuresFromLoadScores } from "@/engine/nr1/crosswalk-engine";
import { buildAtaDeVitoria, type AtaDeVitoria } from "@/engine/evolucao/victory-engine";
import { NR1_CROSSWALK } from "@/mocks/nr1-crosswalk-mock";
import { loadOrgCycleHistory, K_ANONYMITY_MIN } from "./cycle-history.server";
import { loadRealMaintenanceByDriver } from "./maintenance-bridge.server";
import { loadRealPgrPlan } from "./pgr-from-plan.server";

export interface RealReavaliacaoBundle {
  reavaliacao: ReavaliacaoResult;
  victories: AtaDeVitoria[];
  cycleCount: number;
  /** Chave do ciclo mais recente — o cycle_key a usar ao selar uma Ata. */
  latestCycleKey: string | null;
  maintenanceByDriver: Record<string, boolean>;
}

export async function buildRealReavaliacaoBundle(
  orgId: string,
  instrument = "COPSOQ",
): Promise<RealReavaliacaoBundle> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as any;
  const { data: org } = await admin.from("organizations").select("name").eq("id", orgId).maybeSingle();
  const orgName = (org?.name as string | undefined) ?? "Organização";

  // failClosed: o chamador transforma a falha em erro recuperável, nunca em "sem ciclos".
  const history = await loadOrgCycleHistory(orgId, instrument, { failClosed: true });

  const cycles: CycleExposure[] = history.map((capsule) => ({
    cycleId: capsule.cohortId,
    label: capsule.cohortId,
    exposures: exposuresFromLoadScores(capsule.dimensions),
  }));

  const maintenanceByDriver = await loadRealMaintenanceByDriver(orgId);
  const latestExposures = cycles[cycles.length - 1]?.exposures ?? [];
  const pgrPlan = await loadRealPgrPlan(orgId, latestExposures);
  const reavaliacao = buildReavaliacao({
    registry: NR1_CROSSWALK,
    cycles,
    pgrPlan: pgrPlan ?? undefined,
    maintenanceByDriver,
  });

  const victories: AtaDeVitoria[] = [];
  if (history.length >= 2) {
    const latest = history[history.length - 1]!;
    const first = history[0]!;
    for (const driver of reavaliacao.drivers) {
      const ata = buildAtaDeVitoria(
        {
          driver,
          maintained: maintenanceByDriver[driver.driverId],
          participantCount: latest.participantCount,
          kAnonymityMin: K_ANONYMITY_MIN,
        },
        {
          orgName,
          cycleLabel: `${first.cohortId} → ${latest.cohortId}`,
          documentId: `ata-${driver.driverId}-${latest.cohortId}`,
          generatedAt: new Date().toISOString(),
        },
      );
      if (ata) victories.push(ata);
    }
  }

  return {
    reavaliacao,
    victories,
    cycleCount: history.length,
    latestCycleKey: history.length > 0 ? history[history.length - 1]!.cohortId : null,
    maintenanceByDriver,
  };
}
