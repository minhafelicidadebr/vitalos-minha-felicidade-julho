// Fronteira server-only do Dossiê GRO/PGR REAL de uma organização — a
// continuação natural de pgr-from-plan.server.ts (PGR.*, `efficacy` real):
// aqui o PGR real vira o MESMO documento auditável que o setor demo já tem
// (pgr-document.server.ts), só que alimentado por dado 100% real.
//
// COMPOSIÇÃO ponta a ponta (zero motor novo, zero duplicação):
//   loadRealPgrPlan            → PGR real (Plano Vivo + Ponte lever→driver)
//   loadOrgCycleHistory        → histórico REAL do Cofre de Ciclos (S6.75) —
//                                 o MESMO tipo que capsule-history-mock
//                                 entrega, então buildLongitudinalReading
//                                 funciona idêntico ao caminho demo.
//   buildPgrDocument           → o MESMO engine puro do dossiê demo
//   serializePgrDocumentMarkdown → o MESMO serializador
//
// HONESTIDADE: `null` quando não há Plano Vivo ativo — nunca um dossiê
// fabricado. A seção de reavaliação longitudinal só aparece com ≥2 ciclos
// reais registrados (mesma regra do demo).
//
// Seguro apenas em .server.ts — não importar em código de cliente.

import type { PgrPlan } from "@/engine/nr1/pgr-engine";
import {
  buildPgrDocument,
  serializePgrDocumentMarkdown,
  type PgrDocument,
  type PgrDocumentMeta,
} from "@/engine/nr1/pgr-document-engine";
import { buildLongitudinalReading, type LongitudinalReading } from "@/engine/ai/capsule-longitudinal-engine";
import { exposuresFromLoadScores } from "@/engine/nr1/crosswalk-engine";
import { loadRealPgrPlan } from "@/lib/evolucao/pgr-from-plan.server";
import { loadOrgCycleHistory } from "@/lib/evolucao/cycle-history.server";
import { resolvePackBundle } from "@/domain/packs/registry";

export interface RealPgrDocumentResult {
  plan: PgrPlan;
  document: PgrDocument;
  markdown: string;
  hasReavaliacao: boolean;
  /** Leitura longitudinal real (≥2 ciclos) — alimenta a tabela premium de reavaliação no PDF. */
  reavaliacao?: LongitudinalReading;
}

function resolveReavaliacao(
  history: Awaited<ReturnType<typeof loadOrgCycleHistory>>,
): LongitudinalReading | undefined {
  if (history.length < 2) return undefined;
  const result = buildLongitudinalReading({ capsules: history });
  return result.ok ? result.reading : undefined;
}

/**
 * Monta o dossiê GRO/PGR real desta organização. `null` quando não há um
 * Plano Vivo ativo — o PGR real nasce do Plano Vivo (Transformar), nunca é
 * fabricado só a partir de exposição.
 */
export async function buildRealOrgPgrDocument(
  orgId: string,
  instrument = "COPSOQ",
): Promise<RealPgrDocumentResult | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as any;
  const { data: org } = await admin.from("organizations").select("name, pack_id").eq("id", orgId).maybeSingle();
  if (!org) return null;

  const history = await loadOrgCycleHistory(orgId, instrument);
  const latestExposures =
    history.length > 0 ? exposuresFromLoadScores(history[history.length - 1]!.dimensions) : [];

  const plan = await loadRealPgrPlan(orgId, latestExposures);
  if (!plan) return null;

  const sectorLabel = resolvePackBundle((org.pack_id as string | null) ?? "enterprise").sectorLabel;
  const meta: PgrDocumentMeta = {
    orgName: (org.name as string | undefined) ?? "Organização",
    sectorLabel,
    periodLabel: `Ciclo ${instrument} · gerado em ${plan.generatedAt}`,
    responsibleRole: "SESMT / Profissional legalmente habilitado",
    documentId: `PGR-PSI-${orgId.slice(0, 8).toUpperCase()}-${plan.generatedAt}`,
  };

  const reavaliacao = resolveReavaliacao(history);
  const document = buildPgrDocument(plan, meta, reavaliacao);

  return {
    plan,
    document,
    markdown: serializePgrDocumentMarkdown(document),
    hasReavaliacao: document.hasReavaliacao,
    reavaliacao,
  };
}

