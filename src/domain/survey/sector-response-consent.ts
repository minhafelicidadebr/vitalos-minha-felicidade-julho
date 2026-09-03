/** Versão do texto de consentimento exibido no fluxo público por setor. */
export const SECTOR_RESPONSE_CONSENT_VERSION = "2026.1";

/** Limite compartilhado com o contrato da RPC e da coluna persistida. */
export const SECTOR_RESPONSE_CONSENT_VERSION_MAX_LENGTH = 20;

/**
 * Normaliza a evidência declarada pelo cliente antes de qualquer boundary.
 * A RPC repete a validação: esta função melhora a falha local, não substitui
 * a garantia atômica do banco.
 */
export function normalizeSectorResponseConsentVersion(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (
    !normalized ||
    normalized.length > SECTOR_RESPONSE_CONSENT_VERSION_MAX_LENGTH ||
    normalized !== SECTOR_RESPONSE_CONSENT_VERSION
  ) {
    return null;
  }
  return normalized;
}
