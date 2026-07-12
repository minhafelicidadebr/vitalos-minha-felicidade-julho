import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { WeeklyLoopResult } from "@/engine/season/weekly-loop-engine";

export type RealWeeklyLoopResult =
  | { available: false }
  | { available: true; loop: WeeklyLoopResult };

/**
 * Loop Vivo da Semana REAL (I3). Leitura — qualquer membro da org vê (a
 * cobertura já nasce k-anon protegida); org sempre da SESSÃO (P0-04).
 * Política (k mínimo, limiar) vem do PACK DA ORG no servidor, nunca do payload.
 */
export const getRealWeeklyLoop = createServerFn({ method: "GET" })
  .inputValidator(z.object({ accessToken: z.string().min(10) }))
  .handler(async ({ data }): Promise<RealWeeklyLoopResult> => {
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
    const { getWeeklyLoopConfig } = await import("@/engine/gamification/gamification-engine");
    const { DEFAULT_LOOP_POLICY } = await import("@/engine/season/weekly-loop-engine");
    const bundle = resolvePackBundle((org?.pack_id as string | null) ?? "enterprise");
    const policy =
      (bundle.gamification && getWeeklyLoopConfig(bundle.gamification)?.policy) ||
      DEFAULT_LOOP_POLICY;

    const { loadRealWeeklyLoop } = await import("@/lib/learning/weekly-loop-real.server");
    const loop = await loadRealWeeklyLoop(auth.membership.orgId, policy);
    if (!loop) return { available: false };
    return { available: true, loop };
  });
