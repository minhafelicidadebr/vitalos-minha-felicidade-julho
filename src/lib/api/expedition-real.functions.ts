import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { RealExpeditionState } from "@/lib/nr1/expedition-real.server";

export type RealExpeditionResult =
  | { available: false }
  | { available: true; state: RealExpeditionState };

/**
 * Estado real da Expedição contra a Drenagem (I4). Leitura — qualquer
 * membro da org pode ver (mesmo padrão de getRealBoardBrief/
 * getRealPracticeAggregates); org sempre da SESSÃO (P0-04).
 */
export const getRealExpeditionState = createServerFn({ method: "GET" })
  .inputValidator(z.object({ accessToken: z.string().min(10) }))
  .handler(async ({ data }): Promise<RealExpeditionResult> => {
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

    const { loadRealExpeditionState } = await import("@/lib/nr1/expedition-real.server");
    const state = await loadRealExpeditionState(
      auth.membership.orgId,
      (org?.pack_id as string | null) ?? "enterprise",
    );
    if (!state) return { available: false };
    return { available: true, state };
  });
