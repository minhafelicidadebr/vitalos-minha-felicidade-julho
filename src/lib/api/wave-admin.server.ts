// Server-only: usa supabaseAdmin (service role) para operações privilegiadas.
// Seguro apenas em .server.ts — não importar em código de cliente.

import { createWaveWithAdmin } from "../cloud/db-adapter";
import type { CreateWaveInput, CreateWaveResult } from "../cloud/db-adapter";
import {
  checkWaveQuota,
  checkInviteQuota,
  checkInstrumentAllowed,
  describeLimitViolation,
} from "@/engine/billing/plan-engine";
import { emitOpsEvent } from "../telemetry/ops-events.server";

export type AdminCreateWaveResult = CreateWaveResult & { emailsSent: number; emailsAttempted: number };

export async function createWaveAsAdmin(
  input: CreateWaveInput,
): Promise<AdminCreateWaveResult | { error: string }> {
  // Import dinâmico garante que o service role nunca vaza para o bundle do cliente.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as any;

  const { data: org } = await admin
    .from("organizations")
    .select("plan, name")
    .eq("id", input.orgId)
    .single();
  const planId = (org?.plan as string | undefined) ?? "pilot";
  const orgName = (org?.name as string | undefined) ?? "Sua organização";

  // Gates de plano — sempre antes de qualquer escrita. Falha fechada: erro
  // claro com convite de upgrade, nunca silenciosamente ignorado.
  const instrumentCheck = checkInstrumentAllowed(planId, input.instrument);
  if (!instrumentCheck.allowed) {
    return { error: describeLimitViolation(instrumentCheck.reason)! };
  }

  const inviteCheck = checkInviteQuota(planId, input.inviteCount);
  if (!inviteCheck.allowed) {
    return { error: describeLimitViolation(inviteCheck.reason)! };
  }

  if (input.emails && input.emails.length !== input.inviteCount) {
    return { error: "Número de e-mails não corresponde ao número de convites." };
  }

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const { count } = await admin
    .from("waves")
    .select("id", { count: "exact", head: true })
    .eq("org_id", input.orgId)
    .gte("created_at", startOfMonth.toISOString());
  const waveCheck = checkWaveQuota(planId, count ?? 0);
  if (!waveCheck.allowed) {
    return { error: describeLimitViolation(waveCheck.reason)! };
  }

  const result = await createWaveWithAdmin(input, admin);
  if ("error" in result) return { error: result.error };

  emitOpsEvent("wave_created", {
    orgId: input.orgId,
    waveId: result.waveId,
    context: { instrument: input.instrument, inviteCount: input.inviteCount },
  });

  // Dispara e-mails para os convites que têm endereço associado. Awaited (não
  // fire-and-forget) — em runtimes tipo Workers, promises soltas após o
  // retorno da função podem ser encerradas antes de completar.
  const emailable = result.inviteTokens
    .map((token, i) => ({ token, link: result.inviteLinks[i]!, email: result.inviteEmails[i] }))
    .filter((x): x is { token: string; link: string; email: string } => x.email != null);

  let emailsSent = 0;
  if (emailable.length > 0) {
    const { dispatchInviteEmailBatch } = await import("@/lib/notifications/email-dispatcher.server");
    const outcomes = await dispatchInviteEmailBatch(
      emailable.map((x) => ({
        orgName,
        inviteLink: x.link,
        instrumentLabel: input.instrument,
        recipientEmail: x.email,
      })),
    );
    const sentTokens = emailable.filter((_, idx) => outcomes[idx]?.sent).map((x) => x.token);
    emailsSent = sentTokens.length;
    if (sentTokens.length > 0) {
      await admin
        .from("wave_invites")
        .update({ emailed_at: new Date().toISOString() })
        .in("token", sentTokens);
    }
  }

  return { ...result, emailsSent, emailsAttempted: emailable.length };
}

export type CloseWaveOutcome =
  | { closed: true; capsulePublished: true; participantCount: number }
  | { closed: true; capsulePublished: false; reason: string }
  | { closed: false; error: string };

/**
 * Fechamento é a ÚNICA ação que sela uma onda (P0-08) — sempre uma decisão
 * humana autorizada, nunca um efeito colateral automático de atingir n≥5.
 * Roda uma agregação final (a última cápsula reflete todas as respostas até
 * este momento) e só então marca a onda como selada. Se n<5 no fechamento,
 * a onda ainda sela — sem cápsula, como reconhecimento honesto de
 * participação insuficiente — nunca inventa um agregado abaixo do limiar.
 */
export async function closeWaveAsAdmin(
  orgId: string,
  waveId: string,
): Promise<CloseWaveOutcome> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as any;

  const { data: wave } = await admin
    .from("waves")
    .select("org_id, instrument, status")
    .eq("id", waveId)
    .maybeSingle();

  if (!wave || wave.org_id !== orgId) {
    return { closed: false, error: "Onda não encontrada nesta organização." };
  }
  if (wave.status === "sealed") {
    return { closed: false, error: "Esta onda já está selada." };
  }

  const { triggerCapsuleAggregation } = await import("./capsule-aggregator.server");
  const aggregation = await triggerCapsuleAggregation(waveId, wave.instrument as string, orgId);

  emitOpsEvent("wave_closed", {
    orgId,
    waveId,
    reason: aggregation.triggered ? "published" : aggregation.reason,
  });

  const seal_outcome = aggregation.triggered ? "published" : "insufficient_data";
  await admin
    .from("waves")
    .update({ status: "sealed", sealed_at: new Date().toISOString(), seal_outcome })
    .eq("id", waveId);

  if (aggregation.triggered) {
    return { closed: true, capsulePublished: true, participantCount: aggregation.participantCount };
  }
  return { closed: true, capsulePublished: false, reason: aggregation.reason };
}
