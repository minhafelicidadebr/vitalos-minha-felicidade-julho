// Fronteira server-only da Lupa da Escuta (I-M7, Mensurar Vivo). Lê os
// snapshots anônimos e cross-tenant de item_funnel_events e os passa pelo
// engine puro (survey-telemetry-engine.ts) — k-anonimato ≥5 é aplicado
// DENTRO do engine, nunca aqui; esta camada só busca, formata e grava.
//
// Deliberadamente SEM filtro de organização — a Lupa mede a qualidade do
// instrumento para toda a base, não um recorte por cliente (ver header da
// migration 20260706130000_item_funnel_events.sql, §E1 do blueprint).
//
// Seguro apenas em .server.ts — não importar em código de cliente.

import { buildSurveyTelemetry, type SurveyTelemetryResult } from "@/engine/survey/survey-telemetry-engine";
import { getWaveSurvey } from "@/mocks/survey-mock";

const RECENT_SESSIONS_LIMIT = 5000;

/**
 * Monta a leitura agregada do funil para um pack+instrumento, a partir das
 * sessões mais recentes (o instrumento pode mudar de redação com o tempo —
 * recência importa mais que histórico completo).
 */
export async function loadSurveyFunnel(packId: string, instrument: string): Promise<SurveyTelemetryResult> {
  const survey = getWaveSurvey(packId, instrument);
  const itemIds = survey ? survey.items.map((i) => i.id) : [];
  if (itemIds.length === 0) return { ok: false, totalSessions: 0, kAnonymityMin: 5 };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as any;
  const { data } = await admin
    .from("item_funnel_events")
    .select("item_timings, total_items, completed, elapsed_ms")
    .eq("pack_id", packId)
    .eq("instrument", instrument)
    .order("created_at", { ascending: false })
    .limit(RECENT_SESSIONS_LIMIT);

  const sessions = (
    (data ?? []) as Array<{
      item_timings: Record<string, number> | null;
      total_items: number;
      completed: boolean;
      elapsed_ms: number;
    }>
  ).map((row) => ({
    itemTimingsMs: row.item_timings ?? {},
    totalItems: row.total_items,
    completed: row.completed,
    elapsedMs: row.elapsed_ms,
  }));

  return buildSurveyTelemetry({ itemIds, sessions });
}

export interface RecordFunnelSnapshotInput {
  packId: string;
  instrument: string;
  totalItems: number;
  completed: boolean;
  elapsedMs: number;
  itemTimingsMs: Record<string, number>;
}

export interface RecordFunnelSnapshotResult {
  accepted: boolean;
  reason: string | null;
}

/** Grava um snapshot de sessão anônimo via RPC — nunca INSERT direto na tabela. */
export async function recordFunnelSnapshot(
  input: RecordFunnelSnapshotInput,
): Promise<RecordFunnelSnapshotResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as any;
  const { data, error } = await admin.rpc("record_item_funnel_event", {
    p_pack_id: input.packId,
    p_instrument: input.instrument,
    p_total_items: input.totalItems,
    p_completed: input.completed,
    p_elapsed_ms: Math.round(input.elapsedMs),
    p_item_timings: input.itemTimingsMs,
  });
  if (error) return { accepted: false, reason: "db_error" };
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.accepted) return { accepted: false, reason: row?.reason ?? "db_error" };
  return { accepted: true, reason: null };
}
