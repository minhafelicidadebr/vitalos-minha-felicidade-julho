import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { PracticeAggregate } from "@/engine/learning/practice-journal-engine";

export type RealPracticeAggregatesResult =
  | { available: false }
  | { available: true; aggregates: PracticeAggregate[] };

/**
 * Agregados coletivos REAIS do Diário (k-anon ≥5). Qualquer MEMBRO da org
 * pode ler — o agregado já nasce protegido; org sempre da SESSÃO (P0-04).
 * A política (k mínimo) é resolvida do PACK DA ORG no servidor — nunca do
 * payload: um cliente malicioso não rebaixa o k-anonimato.
 */
export const loadRealPracticeAggregates = createServerFn({ method: "GET" })
  .inputValidator(z.object({ accessToken: z.string().min(10) }))
  .handler(async ({ data }): Promise<RealPracticeAggregatesResult> => {
    const { readIdentityBoundaryStatus } = await import("@/lib/identity/identity-boundary.server");
    if (readIdentityBoundaryStatus().state !== "cloud") return { available: false };

    const { resolveOrgMembership } = await import("@/lib/auth/authorize.server");
    const auth = await resolveOrgMembership(data.accessToken);
    if (!auth.ok) return { available: false };

    // Política do pack REAL da org (piso k≥5 garantido pelo default do engine).
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const { data: org } = await admin
      .from("organizations")
      .select("pack_id")
      .eq("id", auth.membership.orgId)
      .maybeSingle();

    const { resolvePackBundle } = await import("@/domain/packs/registry");
    const { getPracticeJournalConfig } = await import("@/engine/gamification/gamification-engine");
    const { DEFAULT_JOURNAL_POLICY } = await import("@/engine/learning/practice-journal-engine");
    const bundle = resolvePackBundle((org?.pack_id as string | null) ?? "enterprise");
    const policy =
      (bundle.gamification && getPracticeJournalConfig(bundle.gamification)?.policy) ||
      DEFAULT_JOURNAL_POLICY;

    const { loadOrgPracticeAggregates } = await import("@/lib/learning/practice-aggregates.server");
    return {
      available: true,
      aggregates: await loadOrgPracticeAggregates(auth.membership.orgId, policy),
    };
  });
