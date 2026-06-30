// Server-only: resolve um invite token → wave_id real + instrumento.
// Esta é a ÚNICA fonte confiável de wave_id no fluxo /responder/:token — o
// cliente nunca deve inventar ou derivar um wave_id a partir do próprio token.

import { readIdentityBoundaryStatus } from "@/lib/identity/identity-boundary.server";
import { getActiveWave } from "@/mocks/campaign-mock";
import { dbInstrumentToSurveyKey } from "@/lib/survey/instrument-mapping";

export type InviteResolution =
  | { valid: true; waveId: string; instrument: string }
  | {
      valid: false;
      reason: "invalid_token" | "already_used" | "wave_closed" | "cloud_adapter_missing";
    };

export async function resolveInviteToken(token: string, packId: string): Promise<InviteResolution> {
  const boundary = readIdentityBoundaryStatus();

  if (boundary.state === "cloud") {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;

    const { data: invite } = await admin
      .from("wave_invites")
      .select("wave_id, used_at, waves(instrument, status)")
      .eq("token", token)
      .maybeSingle();

    if (!invite) return { valid: false, reason: "invalid_token" };
    if (invite.used_at) return { valid: false, reason: "already_used" };

    const wave = invite.waves as { instrument?: string; status?: string } | null;
    if (!wave || wave.status === "sealed" || wave.status === "cancelled" || wave.status === "archived") {
      return { valid: false, reason: "wave_closed" };
    }

    return {
      valid: true,
      waveId: invite.wave_id as string,
      instrument: dbInstrumentToSurveyKey(wave.instrument ?? "COPSOQ"),
    };
  }

  if (boundary.state === "blocked") {
    return { valid: false, reason: "cloud_adapter_missing" };
  }

  // Demo: qualquer token abre a onda ativa mockada do pack (sem persistência real).
  const wave = getActiveWave(packId);
  return { valid: true, waveId: wave.id, instrument: wave.instrumentShort };
}
