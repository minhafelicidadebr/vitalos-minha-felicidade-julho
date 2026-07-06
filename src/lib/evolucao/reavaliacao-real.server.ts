// Fronteira server-only da Reavaliação NR-1 REAL (destrava I-E4 Vigia e I-E2
// Ata de Vitória). Compõe o Cofre de Ciclos (S6.75, histórico real de
// capsules registradas) com a Vigia de Manutenção real (maintenance-bridge)
// para alimentar reavaliacao-engine.ts e victory-engine.ts com dado 100%
// real — SEM MUDAR UMA LINHA de nenhum dos dois engines (mesma assinatura de
// sempre: ReavaliacaoInput/VictoryConditionInput).
//
// ESCOPO v1, declarado por honestidade: `pgrPlan` é omitido de propósito —
// ligar um PGR real ao Plano Vivo (para computar `efficacy`) é trabalho
// adicional fora deste incremento. Sem pgrPlan, `efficacy` fica `null`
// (honesto: "ainda não computado"), mas `drivers` (a evolução real de
// exposição por driver) e as Atas de Vitória funcionam plenamente — elas não
// dependem de `efficacy`, só de `maintenanceByDriver` (calculado aqui,
// direto do Plano Vivo real).
//
// Seguro apenas em .server.ts — não importar em código de cliente.

import {
  buildReavaliacao,
  type CycleExposure,
  type ReavaliacaoResult,
} from "@/engine/nr1/reavaliacao-engine";
import { buildAtaDeVitoria, type AtaDeVitoria } from "@/engine/evolucao/victory-engine";
import { NR1_CROSSWALK } from "@/mocks/nr1-crosswalk-mock";
import { loadOrgCycleHistory, K_ANONYMITY_MIN } from "./cycle-history.server";
import { loadRealMaintenanceByDriver } from "./maintenance-bridge.server";

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

  const history = await loadOrgCycleHistory(orgId, instrument);

  const cycles: CycleExposure[] = history.map((capsule) => ({
    cycleId: capsule.cohortId,
    label: capsule.cohortId,
    exposures: capsule.dimensions.map((d) => ({
      dimensionId: d.dimensionId,
      load: d.loadScore,
      visible: d.visible,
    })),
  }));

  const maintenanceByDriver = await loadRealMaintenanceByDriver(orgId);
  const reavaliacao = buildReavaliacao({ registry: NR1_CROSSWALK, cycles });

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
