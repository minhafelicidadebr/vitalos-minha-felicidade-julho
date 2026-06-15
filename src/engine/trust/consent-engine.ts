// Consent engine — puro. Traduz os consentimentos do colaborador em quais
// CANAIS DE OBSERVAÇÃO a FlorescerIA pode usar. Privacidade radical como produto:
// a IA só enxerga o que a pessoa permite, e só no agregado (k-anon). Um canal só
// é utilizável se a pessoa concedeu E o agregado tem adesão suficiente (limiar +
// número mínimo de organizações/respostas). Nunca importa de domain/.

export const CONSENT_THRESHOLD_PCT = 50;
export const MIN_CONSENT_COUNT = 5;

export type UsabilityReason = "ok" | "revogado" | "abaixo_do_limiar" | "k_anon";

export interface ConsentChannel {
  id: string; // pulses | nudges | gamification | signals
  label: string;
  personalGranted: boolean; // a pessoa concedeu este canal
  orgConsentPct: number; // % da org que concedeu
  orgConsentCount: number; // nº de pessoas que concederam (base do k-anon)
}

export interface ChannelUsability {
  usable: boolean;
  reason: UsabilityReason;
}

export function channelUsability(
  ch: ConsentChannel,
  threshold: number = CONSENT_THRESHOLD_PCT,
  minCount: number = MIN_CONSENT_COUNT,
): ChannelUsability {
  if (!ch.personalGranted) return { usable: false, reason: "revogado" };
  if (ch.orgConsentCount < minCount) return { usable: false, reason: "k_anon" };
  if (ch.orgConsentPct < threshold) return { usable: false, reason: "abaixo_do_limiar" };
  return { usable: true, reason: "ok" };
}

export function usableChannelIds(
  channels: ConsentChannel[],
  threshold: number = CONSENT_THRESHOLD_PCT,
  minCount: number = MIN_CONSENT_COUNT,
): Set<string> {
  return new Set(
    channels.filter((c) => channelUsability(c, threshold, minCount).usable).map((c) => c.id),
  );
}

/**
 * Disponibilidade do canal NO NÍVEL DA ORGANIZAÇÃO (agregado), independente do
 * consentimento individual: só exige adesão coletiva ≥ limiar e ≥ k-anon. É o
 * gate de um painel agregado (ex.: Sinais Vivos) — diferente de `channelUsability`,
 * que também exige o consentimento pessoal ("o que a IA observa sobre VOCÊ").
 */
export function orgChannelAvailable(
  ch: ConsentChannel,
  threshold: number = CONSENT_THRESHOLD_PCT,
  minCount: number = MIN_CONSENT_COUNT,
): boolean {
  return ch.orgConsentCount >= minCount && ch.orgConsentPct >= threshold;
}

/**
 * Particiona itens que declaram `requiresChannel` em permitidos × bloqueados,
 * conforme os canais utilizáveis. Itens sem canal exigido são sempre permitidos.
 */
export function partitionByConsent<T extends { requiresChannel?: string }>(
  items: T[],
  usable: Set<string>,
): { allowed: T[]; blocked: Array<{ item: T; missingChannel: string }> } {
  const allowed: T[] = [];
  const blocked: Array<{ item: T; missingChannel: string }> = [];
  for (const it of items) {
    if (!it.requiresChannel || usable.has(it.requiresChannel)) allowed.push(it);
    else blocked.push({ item: it, missingChannel: it.requiresChannel });
  }
  return { allowed, blocked };
}
