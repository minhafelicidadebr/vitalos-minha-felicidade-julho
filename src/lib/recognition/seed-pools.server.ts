// Pools coletivos REAIS das Sementes (Pomar/Bosque — Academia Viva 2.0 I1).
//
// Via service role, o SELECT pede SÓ {pool_id, user_id, amount} das doações
// team/cause da org — nunca item/destinatário do canal person. O k-anonimato
// (≥5 contribuintes únicos por pool) e a proteção de visibilidade são
// computados pela MESMA função pura do demo (buildSeedPools) — zero
// duplicação. Total individual de doação NUNCA sai daqui (constante ética
// do pack: no_individual_totals_public — o agregado é por POOL).

import {
  buildSeedPools,
  type PoolContribution,
  type SeedEconomyPolicy,
  type SeedPoolAggregate,
  type SeedPoolDef,
} from "@/engine/recognition/seed-economy-engine";

interface DonationRow {
  pool_id: string;
  user_id: string;
  amount: number;
}

export async function loadOrgSeedPools(
  orgId: string,
  pools: readonly SeedPoolDef[],
  policy: SeedEconomyPolicy,
): Promise<SeedPoolAggregate[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as any;

  const { data, error } = await admin
    .from("seed_events")
    .select("pool_id, user_id, amount")
    .eq("org_id", orgId)
    .in("kind", ["donated_team", "donated_cause"]);
  if (error || !data) return buildSeedPools([], pools, policy);

  const contributions: PoolContribution[] = (data as DonationRow[])
    .filter((row) => row.pool_id)
    .map((row) => ({ poolId: row.pool_id, contributorId: row.user_id, amount: row.amount }));

  return buildSeedPools(contributions, pools, policy);
}
