// Círculos Vivos reais (I5) — adapter cliente via RLS. Facilitador registra a
// própria roda; leitura é org-scoped (todos da org veem que a roda aconteceu,
// nunca quem participou — a linha não tem essa informação). Sem UPDATE/DELETE:
// uma roda que aconteceu é fato histórico.

import { supabase } from "@/integrations/supabase/client";
import type { CircleSession } from "@/engine/embaixadorias/circle-engine";

const db = supabase as any; // tipos resolvem pós-geração de schema pelo Lovable

interface CircleRow {
  id: string;
  facilitator_id: string;
  embassy_id: string;
  driver_id: string;
  occurred_on: string;
  presence_count: number;
}

/** Rodas da org (RLS já recorta por org do facilitador). Mapeadas ao tipo do engine. */
export async function loadOrgCircleSessions(): Promise<CircleSession[]> {
  const { data, error } = await db
    .from("circle_sessions")
    .select("id, facilitator_id, embassy_id, driver_id, occurred_on, presence_count")
    .order("occurred_on", { ascending: false });
  if (error) {
    console.warn("[circle-sessions-adapter] falha ao carregar rodas", error.message);
    return [];
  }
  return ((data ?? []) as CircleRow[]).map((row) => ({
    id: row.id,
    embassyId: row.embassy_id,
    facilitatorId: row.facilitator_id,
    driverId: row.driver_id,
    occurredOn: row.occurred_on,
    presenceCount: row.presence_count,
  }));
}

/** Registra uma roda JÁ VALIDADA pelo engine puro (openCircleSession). */
export async function saveCircleSession(
  orgId: string,
  facilitatorId: string,
  session: Omit<CircleSession, "facilitatorId">,
): Promise<{ savedId: string | null }> {
  const { data, error } = await db
    .from("circle_sessions")
    .insert({
      org_id: orgId,
      facilitator_id: facilitatorId,
      embassy_id: session.embassyId,
      driver_id: session.driverId,
      occurred_on: session.occurredOn,
      presence_count: session.presenceCount,
    })
    .select("id")
    .single();
  if (error) {
    console.warn("[circle-sessions-adapter] falha ao registrar roda", error.message);
    return { savedId: null };
  }
  return { savedId: (data as { id: string }).id };
}
