// Carrega o capsule mais recente de uma organização (com dimensions + outcomes).
// Usado pelo dashboard RH para mostrar dados reais quando n≥5 existe.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { isCloudReady } from "@/lib/cloud/supabase-client";

interface CapsuleDim {
  mean: number;
  high_risk_pct: number;
  n: number;
}

export type LatestCapsuleResult =
  | { found: false; reason: string }
  | {
      found: true;
      id: string;
      waveId: string;
      instrument: string;
      participantCount: number;
      dimensions: Record<string, CapsuleDim>;
      outcomes: Record<string, CapsuleDim> | null;
      closedOn: string;
    };

export const loadLatestOrgCapsule = createServerFn({ method: "GET" })
  .inputValidator(z.object({ orgId: z.string().uuid() }))
  .handler(async ({ data }): Promise<LatestCapsuleResult> => {
    if (!isCloudReady()) return { found: false, reason: "cloud_not_ready" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;

    const { data: capsule, error } = await admin
      .from("wave_capsules")
      .select("id, wave_id, instrument, participant_count, dimensions, outcomes, closed_on")
      .eq("org_id", data.orgId)
      .order("closed_on", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !capsule) return { found: false, reason: "no_capsule" };

    return {
      found: true,
      id: capsule.id as string,
      waveId: capsule.wave_id as string,
      instrument: capsule.instrument as string,
      participantCount: capsule.participant_count as number,
      dimensions: (capsule.dimensions ?? {}) as Record<string, CapsuleDim>,
      outcomes: (capsule.outcomes ?? null) as Record<string, CapsuleDim> | null,
      closedOn: capsule.closed_on as string,
    };
  });
