// Server-only: emissão e revogação de links de setor (Domínio B, modalidade
// shared_sector). O token bruto é gerado AQUI, devolvido UMA única vez ao admin
// (para copiar e distribuir) e nunca persiste — só o SHA-256 vai ao banco
// (mesmo princípio do Trust Ledger: hash como compromisso, nunca o segredo).
//
// Autorização: quem chama já passou por requireOrgAdmin (functions layer) —
// este módulo recebe o orgId RESOLVIDO DA SESSÃO (disciplina P0-04) e ainda
// verifica que a onda pertence à org antes de emitir.

import { randomBytes } from "node:crypto";
import { hashSectorToken } from "./sector-link.server";

export type CreateSectorLinkOutcome =
  | { created: true; token: string; expiresAt: string; sectorLabel: string }
  | { created: false; error: string };

const DEFAULT_EXPIRES_DAYS = 90;

export async function createSectorLinkAsAdmin(
  orgId: string,
  waveId: string,
  sectorLabel: string,
  expiresInDays = DEFAULT_EXPIRES_DAYS,
): Promise<CreateSectorLinkOutcome> {
  const label = sectorLabel.trim();
  if (!label) return { created: false, error: "Informe o nome do setor." };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as any;

  // A onda tem que pertencer à organização do admin autenticado (P0-04) e
  // estar aberta — não se emite link novo para onda selada.
  const { data: wave } = await admin
    .from("waves")
    .select("org_id, status")
    .eq("id", waveId)
    .maybeSingle();
  if (!wave || wave.org_id !== orgId) {
    return { created: false, error: "Onda não encontrada nesta organização." };
  }
  if (["sealed", "cancelled", "archived"].includes(wave.status as string)) {
    return { created: false, error: "Esta onda não está mais aberta para coleta." };
  }

  // Token opaco de 48 hex chars (24 bytes) — mesmo espaço de entropia dos
  // convites de onda. Existe SÓ nesta resposta; o banco guarda o hash.
  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + expiresInDays * 86_400_000).toISOString();

  const { error } = await admin.from("sector_links").insert({
    org_id: orgId,
    wave_id: waveId,
    token_hash: hashSectorToken(token),
    sector_label: label,
    access_mode: "shared_sector",
    status: "active",
    expires_at: expiresAt,
  });
  if (error) return { created: false, error: "Falha ao registrar o link. Tente novamente." };

  return { created: true, token, expiresAt, sectorLabel: label };
}
