// Server-only: resolve um invite token → wave_id real + instrumento.
// Esta é a ÚNICA fonte confiável de wave_id no fluxo /responder/:token — o
// cliente nunca deve inventar ou derivar um wave_id a partir do próprio token.

import { readIdentityBoundaryStatus } from "@/lib/identity/identity-boundary.server";
import { getActiveWave } from "@/mocks/campaign-mock";
import { dbInstrumentToSurveyKey } from "@/lib/survey/instrument-mapping";
import {
  assertHmlBackendBoundary,
  type HmlBackendBoundaryEnv,
} from "@/lib/fibt-hml/hml-backend-boundary.server";
import { assertInviteWithinAuthorizedHmlBatch } from "@/lib/fibt-hml/hml-contract";

export type InviteResolution =
  | { valid: true; waveId: string; instrument: string }
  | {
      valid: false;
      reason: "invalid_token" | "already_used" | "wave_closed" | "cloud_adapter_missing";
    };

export async function resolveInviteToken(token: string, packId: string): Promise<InviteResolution> {
  const boundary = readIdentityBoundaryStatus();

  if (boundary.state === "cloud") {
    // FIBT-HML-1D (Fase 4): quando este deployment declara modo HML, a
    // fronteira precisa estar atestada ANTES de qualquer query real —
    // nunca confia em VITE_FIBT_HML_ENABLED sozinho para decidir que o
    // ambiente é seguro (ver hml-backend-boundary.server.ts).
    const hmlBoundary = assertHmlBackendBoundary(process.env as HmlBackendBoundaryEnv);
    if (hmlBoundary.hmlDeclared && !hmlBoundary.attested) {
      return { valid: false, reason: "cloud_adapter_missing" };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;

    // Em modo HML atestado, a query já traz a cadeia
    // invite→cohort→wave→organization para o vínculo de lote (Fase 6) — fora
    // do modo HML, a query permanece exatamente a de sempre (zero mudança de
    // comportamento para convites de produção reais).
    const selectColumns = hmlBoundary.hmlDeclared
      ? "wave_id, used_at, expires_at, cohort_id, waves(instrument, status, label, organizations(slug)), wave_cohorts(key)"
      : "wave_id, used_at, waves(instrument, status)";

    const { data: invite } = await admin
      .from("wave_invites")
      .select(selectColumns)
      .eq("token", token)
      .maybeSingle();

    if (!invite) return { valid: false, reason: "invalid_token" };
    if (invite.used_at) return { valid: false, reason: "already_used" };

    if (hmlBoundary.hmlDeclared) {
      const waveJoin = invite.waves as { organizations?: { slug?: string } | null; label?: string } | null;
      const cohortJoin = invite.wave_cohorts as { key?: string } | null;
      const binding = assertInviteWithinAuthorizedHmlBatch({
        organizationSlug: waveJoin?.organizations?.slug,
        waveLabel: waveJoin?.label,
        cohortKey: cohortJoin?.key,
        expiresAt: invite.expires_at as string | null,
      });
      // Não usar convite comum (ou de outro lote) como convite da
      // homologação: sanitizado para "invalid_token" — o mesmo motivo que
      // um token nunca visto, nunca revela ao respondente que o token é
      // real, mas pertence a outro escopo.
      if (!binding.ok) return { valid: false, reason: "invalid_token" };
    }

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
