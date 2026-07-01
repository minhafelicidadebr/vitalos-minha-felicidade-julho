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
