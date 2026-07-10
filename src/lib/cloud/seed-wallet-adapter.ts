// Persistência pessoal da carteira de Sementes (Academia Viva 2.0 I1 real).
// Mesmo modelo do practice-journal-adapter: cada linha é da PRÓPRIA pessoa
// (auth.uid()), cliente autenticado via RLS — sem service role. INSERT-only:
// o banco não aceita UPDATE/DELETE (teto semanal e orçamento são folds do
// histórico; apagar evento burlaria os limites).

import { supabase } from "@/integrations/supabase/client";
import type { SeedWalletEvent } from "@/engine/recognition/seed-economy-engine";

const db = supabase as any; // tipos resolvem pós-geração de schema pelo Lovable

interface SeedRow {
  id: string;
  kind: string;
  amount: number;
  source_kind: string | null;
  item_id: string | null;
  recipient_id: string | null;
  pool_id: string | null;
  occurred_on: string;
}

export async function loadOwnSeedEvents(userId: string): Promise<SeedWalletEvent[]> {
  const { data, error } = await db
    .from("seed_events")
    .select("id, kind, amount, source_kind, item_id, recipient_id, pool_id, occurred_on")
    .eq("user_id", userId)
    .order("occurred_on", { ascending: true });
  if (error) {
    console.warn("[seed-wallet-adapter] falha ao carregar carteira", error.message);
    return [];
  }
  return ((data ?? []) as SeedRow[]).map((row) => ({
    id: row.id,
    kind: row.kind as SeedWalletEvent["kind"],
    amount: row.amount,
    sourceKind: row.source_kind ?? undefined,
    itemId: row.item_id ?? undefined,
    recipientId: row.recipient_id ?? undefined,
    poolId: row.pool_id ?? undefined,
    occurredOn: row.occurred_on,
  }));
}

/** Persiste um evento JÁ VALIDADO pelo engine puro (earn/donation). */
export async function saveSeedEvent(
  userId: string,
  orgId: string,
  event: SeedWalletEvent,
): Promise<{ savedId: string | null }> {
  const { data, error } = await db
    .from("seed_events")
    .insert({
      user_id: userId,
      org_id: orgId,
      kind: event.kind,
      amount: event.amount,
      source_kind: event.sourceKind ?? null,
      item_id: event.itemId ?? null,
      recipient_id: event.recipientId ?? null,
      pool_id: event.poolId ?? null,
      occurred_on: event.occurredOn,
    })
    .select("id")
    .single();
  if (error) {
    console.warn("[seed-wallet-adapter] falha ao persistir evento", error.message);
    return { savedId: null };
  }
  return { savedId: (data as { id: string }).id };
}
