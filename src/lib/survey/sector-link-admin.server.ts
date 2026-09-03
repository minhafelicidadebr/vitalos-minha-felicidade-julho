// Server-only: emissão e revogação de links de setor (Domínio B, modalidade
// shared_sector). O token bruto é gerado AQUI, devolvido UMA única vez ao admin
// (para copiar e distribuir) e nunca persiste — só o SHA-256 vai ao banco
// (mesmo princípio do Trust Ledger: hash como compromisso, nunca o segredo).
//
// Autorização: quem chama já passou por requireOrgAdmin (functions layer) —
// este módulo recebe o orgId RESOLVIDO DA SESSÃO (disciplina P0-04) e ainda
// verifica que a onda pertence à org antes de emitir.

import { issueWaveSectorLinkAsAdmin } from "./sector-operations-admin.server";

export type CreateSectorLinkOutcome =
  | { created: true; token: string; expiresAt: string; sectorLabel: string }
  | { created: false; error: string };

const DEFAULT_EXPIRES_DAYS = 14;

export async function createSectorLinkAsAdmin(
  orgId: string,
  waveId: string,
  sectorLabel: string,
  expiresInDays = DEFAULT_EXPIRES_DAYS,
): Promise<CreateSectorLinkOutcome> {
  const result = await issueWaveSectorLinkAsAdmin(orgId, waveId, {
    cohortKey: sectorLabel,
    expiresInDays,
  });
  return result.created
    ? {
        created: true,
        token: result.token,
        expiresAt: result.expiresAt,
        sectorLabel: result.sectorKey,
      }
    : result;
}
