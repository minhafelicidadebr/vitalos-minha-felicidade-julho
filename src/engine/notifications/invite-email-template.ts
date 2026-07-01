// Motor puro de template do e-mail de convite — sem I/O, sem dependência de
// provedor. Recebe dados já resolvidos (nome da org, link, instrumento) e
// devolve assunto + corpo (texto e HTML). Nunca inclui dado individual ou
// score — o convite é só a porta de entrada, não carrega conteúdo de resposta.

export interface InviteEmailInput {
  orgName: string;
  inviteLink: string;
  instrumentLabel: string;
  recipientEmail: string;
}

export interface InviteEmailContent {
  to: string;
  subject: string;
  text: string;
  html: string;
}

const INSTRUMENT_BLURB: Record<string, string> = {
  COPSOQ: "uma pesquisa sobre organização e relações no trabalho",
  PERMA: "uma pesquisa sobre bem-estar e florescimento no trabalho",
  "PERMA+V / IVO": "uma pesquisa sobre bem-estar e florescimento no trabalho",
  VIA_T: "um mapeamento de forças e talentos da equipe",
  "VIA-T": "um mapeamento de forças e talentos da equipe",
};

export function buildInviteEmail(input: InviteEmailInput): InviteEmailContent {
  const blurb = INSTRUMENT_BLURB[input.instrumentLabel] ?? "uma pesquisa de clima organizacional";
  const subject = `${input.orgName} convida você para uma pesquisa anônima`;

  const text = [
    `Olá!`,
    ``,
    `${input.orgName} está conduzindo ${blurb} (${input.instrumentLabel}).`,
    ``,
    `Sua participação é anônima e leva cerca de 10 minutos. Os resultados só`,
    `aparecem para a empresa quando 5 ou mais pessoas responderem — sua`,
    `resposta individual nunca fica visível para ninguém.`,
    ``,
    `Acesse seu link exclusivo (uso único):`,
    input.inviteLink,
    ``,
    `Obrigado pela sua participação.`,
  ].join("\n");

  const html = `
    <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; color: #1C2A24;">
      <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em; color: #6b7280;">
        ${escapeHtml(input.orgName)} · Pesquisa anônima
      </p>
      <h1 style="font-size: 20px; margin: 8px 0 16px;">Você está convidado(a) a participar</h1>
      <p style="font-size: 14px; line-height: 1.6;">
        ${escapeHtml(input.orgName)} está conduzindo ${escapeHtml(blurb)}
        (${escapeHtml(input.instrumentLabel)}).
      </p>
      <p style="font-size: 14px; line-height: 1.6;">
        Sua participação é <strong>anônima</strong> e leva cerca de 10 minutos.
        Os resultados só aparecem para a empresa quando <strong>5 ou mais pessoas</strong>
        responderem — sua resposta individual nunca fica visível para ninguém.
      </p>
      <p style="margin: 24px 0;">
        <a href="${escapeHtmlAttr(input.inviteLink)}"
           style="display: inline-block; background: #0B3D2E; color: #F8F7F4; padding: 12px 24px;
                  border-radius: 12px; text-decoration: none; font-weight: 600;">
          Responder agora
        </a>
      </p>
      <p style="font-size: 11px; color: #6b7280;">
        Este link é de uso único e pessoal. Se você não esperava este e-mail, pode ignorá-lo.
      </p>
    </div>
  `.trim();

  return { to: input.recipientEmail, subject, text, html };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeHtmlAttr(value: string): string {
  return escapeHtml(value).replace(/'/g, "&#39;");
}
