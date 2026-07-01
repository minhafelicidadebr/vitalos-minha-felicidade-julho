// Server-only: dispara e-mails de convite via Resend quando RESEND_API_KEY
// está configurada; caso contrário, opera em modo "logged_only" (não falha,
// não bloqueia a criação da onda — apenas registra que o e-mail não foi
// enviado). Nunca lança exceção para o chamador: billing/admin nunca trava
// por causa de e-mail.

import { buildInviteEmail, type InviteEmailInput } from "@/engine/notifications/invite-email-template";

export type EmailDispatchOutcome =
  | { sent: true; provider: "resend"; messageId: string }
  | { sent: false; provider: "logged_only"; reason: "no_api_key" }
  | { sent: false; provider: "resend"; reason: "provider_error"; detail: string };

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const FROM_ADDRESS = "VitalOS <convites@vitalos.com.br>";

export async function dispatchInviteEmail(input: InviteEmailInput): Promise<EmailDispatchOutcome> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const email = buildInviteEmail(input);

  if (!apiKey) {
    // Modo sem provedor configurado — não é erro do app, é ausência de
    // configuração. O admin continua podendo copiar o link manualmente.
    return { sent: false, provider: "logged_only", reason: "no_api_key" };
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: email.to,
        subject: email.subject,
        text: email.text,
        html: email.html,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => response.statusText);
      return { sent: false, provider: "resend", reason: "provider_error", detail };
    }

    const body = (await response.json()) as { id?: string };
    return { sent: true, provider: "resend", messageId: body.id ?? "unknown" };
  } catch (error) {
    return {
      sent: false,
      provider: "resend",
      reason: "provider_error",
      detail: error instanceof Error ? error.message : "unknown error",
    };
  }
}

/** Dispara em lote, sem deixar uma falha individual derrubar o restante. */
export async function dispatchInviteEmailBatch(
  inputs: readonly InviteEmailInput[],
): Promise<EmailDispatchOutcome[]> {
  return Promise.all(inputs.map((input) => dispatchInviteEmail(input)));
}
