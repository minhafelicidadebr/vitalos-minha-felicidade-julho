// Travessia Leve — engine PURO (I-M1, Mensurar Vivo). "A resposta que não se perde": um
// rascunho salvo SÓ no aparelho do respondente (localStorage), nunca no servidor — a
// pessoa que perde conexão no item 19 de um COPSOQ de 32 volta e continua de onde parou.
//
// ÉTICA (Fable 5 §8, spec I-M1 verbatim): o rascunho contém respostas sensíveis → nunca
// sai do aparelho, nunca vira uma escrita no servidor. Invalidado por dois motivos, nunca
// um terceiro: TTL vencido (janela da onda) ou o instrumento mudou de forma (item
// adicionado/removido/reordenado) — nunca reaplicar um rascunho contra um formulário que
// já não é o mesmo. Apagado no submit — nunca sobrevive além do próprio envio.
//
// Engine ≠ Domínio: recebe token/itens/relógio como parâmetro; nunca lê localStorage
// diretamente (isso é I/O — fica no componente). Determinístico, sem React.

export interface DraftPayload {
  /** Assinatura do instrumento no momento em que o rascunho foi salvo (ver instrumentSignatureFor). */
  instrumentSignature: string;
  /** epoch ms de quando o rascunho foi salvo pela última vez. */
  savedAt: number;
  responses: Readonly<Record<string, number>>;
}

/** TTL default — aproximação generosa da janela de uma onda (spec pede "TTL = janela da onda"; sem acesso à data de fechamento exata no cliente, um teto fixo generoso é a simplificação v1 honesta: nunca expira cedo demais, e nunca vira armazenamento permanente). */
export const DEFAULT_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Chave de armazenamento derivada do token via hash não-criptográfico (FNV-1a 32 bits) —
 * suficiente para uma chave de localStorage; nunca guarda o token em claro na chave.
 */
export function draftStorageKey(token: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < token.length; i++) {
    hash ^= token.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `vitalos-draft-${(hash >>> 0).toString(16)}`;
}

/** Assinatura do instrumento — muda se qualquer item for adicionado/removido/reordenado. */
export function instrumentSignatureFor(itemIds: readonly string[]): string {
  return itemIds.join("|");
}

export function buildDraftPayload(
  responses: Readonly<Record<string, number>>,
  instrumentSignature: string,
  nowMs: number,
): DraftPayload {
  return { instrumentSignature, savedAt: nowMs, responses };
}

export type DraftValidity = "valid" | "expired" | "instrument_changed" | "missing";

export function validateDraft(
  payload: DraftPayload | null,
  currentSignature: string,
  nowMs: number,
  ttlMs: number = DEFAULT_DRAFT_TTL_MS,
): DraftValidity {
  if (!payload) return "missing";
  if (payload.instrumentSignature !== currentSignature) return "instrument_changed";
  if (nowMs - payload.savedAt > ttlMs) return "expired";
  return "valid";
}

// ─── Estimativa honesta de tempo restante (alimentada pela Lupa da Escuta, I-M7) ─────

export interface TimeEstimateInput {
  /** Ordem canônica dos itens do instrumento. */
  itemIds: readonly string[];
  /** Quantos itens já foram respondidos — os restantes é que compõem a estimativa. */
  answeredCount: number;
  /** Mediana real de tempo incremental por item (ms), da Lupa da Escuta. `null` = sem telemetria real ainda. */
  medianDeltaMsByItem: Readonly<Record<string, number>> | null;
  /** Mediana geral de referência (ms) — usada para itens sem mediana própria (amostra pequena). */
  overallMedianDeltaMs: number | null;
}

/**
 * "~4 min (estimativa)" — nunca uma barra de progresso acelerada falsa. Usa mediana REAL
 * por item quando existe (Lupa da Escuta); cai para uma estimativa genérica declarada como
 * tal quando ainda não há telemetria real suficiente — nunca finge precisão que não tem.
 */
export function estimateRemainingLabel(input: TimeEstimateInput): string {
  const remainingIds = input.itemIds.slice(input.answeredCount);
  if (remainingIds.length === 0) return "quase lá";

  if (!input.medianDeltaMsByItem || input.overallMedianDeltaMs === null) {
    const genericMinutes = Math.max(1, Math.ceil(remainingIds.length * 0.25));
    return remainingIds.length <= 2 ? "menos de 1 minuto" : `~${genericMinutes} min (estimativa)`;
  }

  const totalMs = remainingIds.reduce(
    (sum, id) => sum + (input.medianDeltaMsByItem![id] ?? input.overallMedianDeltaMs!),
    0,
  );
  const minutes = Math.max(1, Math.round(totalMs / 60000));
  return minutes <= 1 ? "menos de 1 minuto" : `~${minutes} min (estimativa)`;
}
