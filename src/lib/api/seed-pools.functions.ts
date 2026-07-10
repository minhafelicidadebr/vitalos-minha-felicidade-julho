import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SeedPoolAggregate } from "@/engine/recognition/seed-economy-engine";

export type RealSeedPoolsResult =
  | { available: false }
  | { available: true; pools: SeedPoolAggregate[] };

/**
 * Pools coletivos REAIS (Pomar/Bosque, k-anon ≥5). Qualquer membro da org lê
 * — o agregado nasce protegido; org sempre da SESSÃO (P0-04). Definições de
 * pool E política vêm do PACK DA ORG resolvido no servidor, nunca do payload.
 */
export const loadRealSeedPools = createServerFn({ method: "GET" })
  .inputValidator(z.object({ accessToken: z.string().min(10) }))
  .handler(async ({ data }): Promise<RealSeedPoolsResult> => {
    const { readIdentityBoundaryStatus } = await import("@/lib/identity/identity-boundary.server");
    if (readIdentityBoundaryStatus().state !== "cloud") return { available: false };

    const { resolveOrgMembership } = await import("@/lib/auth/authorize.server");
    const auth = await resolveOrgMembership(data.accessToken);
    if (!auth.ok) return { available: false };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const { data: org } = await admin
      .from("organizations")
      .select("pack_id")
      .eq("id", auth.membership.orgId)
      .maybeSingle();

    const { resolvePackBundle } = await import("@/domain/packs/registry");
    const { getSeedEconomyPolicy, getSeedPools } = await import(
      "@/engine/gamification/gamification-engine"
    );
    const bundle = resolvePackBundle((org?.pack_id as string | null) ?? "enterprise");
    if (!bundle.gamification) return { available: false };
    const policy = getSeedEconomyPolicy(bundle.gamification);
    if (!policy) return { available: false }; // pack sem economia pró-social

    const { loadOrgSeedPools } = await import("@/lib/recognition/seed-pools.server");
    return {
      available: true,
      pools: await loadOrgSeedPools(auth.membership.orgId, getSeedPools(bundle.gamification), policy),
    };
  });
