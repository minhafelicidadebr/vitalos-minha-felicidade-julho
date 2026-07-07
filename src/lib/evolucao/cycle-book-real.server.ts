// Fronteira server-only do Livro do Ciclo real (I-E3, Arco da Prova). Compõe TODA
// a infraestrutura real já construída nesta base — Cofre de Ciclos + Reavaliação
// (PGR.*), Atas de Vitória seladas (I-E2), snapshots ESG imutáveis (I-E1) e o Plano
// Vivo ativo (S6.1) — e entrega ao engine puro (cycle-book-engine.ts) para virar a
// narrativa anual. ZERO query nova além das já existentes: nenhuma tabela é lida
// aqui pela primeira vez.
//
// NUNCA retorna null por falta de dado — uma organização no primeiro dia ainda tem
// um Livro (magro, honesto: "a fundação foi lançada"). Só retorna null se a própria
// organização não existir.
//
// Seguro apenas em .server.ts — não importar em código de cliente.

import {
  buildCycleBook,
  type CycleBookDocument,
  type CycleBookActivePlan,
} from "@/engine/evolucao/cycle-book-engine";
import { buildRealReavaliacaoBundle } from "./reavaliacao-real.server";
import { listVictoryRecordsForOrg } from "./victory.server";
import { listEsgSnapshotsForOrg } from "@/lib/esg/esg-snapshot.server";
import { loadLatestActionPlanForOrg, type LoadedActionPlan } from "@/lib/api/action-plan.server";
import { NR1_CROSSWALK } from "@/mocks/nr1-crosswalk-mock";
import { resolvePackBundle } from "@/domain/packs/registry";

function driverLabel(driverId: string): string {
  return NR1_CROSSWALK.drivers.find((d) => d.id === driverId)?.label ?? driverId;
}

/**
 * Sumário leve do Plano Vivo ativo — deliberadamente NÃO chama enrichQuarterlyPlan
 * (exigiria montar um QuarterlyPlan completo com `season`, desproporcional para uma
 * estatística narrativa). O dado já foi validado quando escrito
 * (setActionItemAccountabilityAsAdmin); aqui só contamos presença, não reformatamos.
 */
function summarizePlan(plan: LoadedActionPlan): CycleBookActivePlan {
  const total = plan.items.length;
  const compliant = plan.items.filter((i) => i.owner && i.dueOn && i.metric).length;
  const concluded = plan.items.filter((i) => i.status === "concluida" || i.status === "em_vigilancia").length;
  return {
    seasonName: plan.seasonName,
    totalActions: total,
    compliancePct: total === 0 ? 0 : Math.round((compliant / total) * 100),
    concludedPct: total === 0 ? 0 : Math.round((concluded / total) * 100),
  };
}

export async function buildRealCycleBook(orgId: string): Promise<CycleBookDocument | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as any;
  const { data: org } = await admin.from("organizations").select("name, pack_id").eq("id", orgId).maybeSingle();
  if (!org) return null;

  const [bundle, sealedVictories, esgSnapshots, plan] = await Promise.all([
    buildRealReavaliacaoBundle(orgId, "COPSOQ"),
    listVictoryRecordsForOrg(orgId),
    listEsgSnapshotsForOrg(orgId),
    loadLatestActionPlanForOrg(orgId),
  ]);

  const year = new Date().getFullYear();
  const sectorLabel = resolvePackBundle((org.pack_id as string | null) ?? "enterprise").sectorLabel;

  return buildCycleBook({
    meta: {
      orgName: (org.name as string | undefined) ?? "Organização",
      sectorLabel,
      periodLabel: String(year),
      documentId: `LIVRO-${orgId.slice(0, 8).toUpperCase()}-${year}`,
      generatedAt: new Date().toISOString().slice(0, 10),
    },
    reavaliacao: bundle.cycleCount > 0 ? bundle.reavaliacao : null,
    cycleCount: bundle.cycleCount,
    victories: sealedVictories.map((v) => ({
      driverId: v.driverId,
      driverLabel: driverLabel(v.driverId),
      cycleKey: v.cycleKey,
      contentHash: v.contentHash,
      issuedAt: v.issuedAt,
    })),
    esgSnapshots: esgSnapshots.map((s) => ({ year: s.year, contentHash: s.contentHash, generatedAt: s.generatedAt })),
    activePlan: plan ? summarizePlan(plan) : null,
  });
}
