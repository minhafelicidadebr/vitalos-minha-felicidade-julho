// Duplas de Prática — engine PURO (I6, 2ª metade, Academia Viva 2.0). Pareamento
// opt-in BILATERAL por forças VIA-T consentidas complementares + mesmo driver em
// foco, com confirmação de evidência por par e anti-conluio semanal.
//
// CONSENTIMENTO POR SCHEMA, não por política (mesmo idioma de CircleSession sem
// conteúdo): este engine NUNCA recebe um ViatResult. O único objeto que circula é
// PairProfile, cujo campo de forças é `sharedStrengthIds` — a lista que a PRÓPRIA
// pessoa escolheu compartilhar (limitada pelo pack). O perfil VIA-T completo é
// estruturalmente incapaz de vazar por aqui: não há onde guardá-lo.
//
// "Nunca designada por gestor" (Weinstein & Ryan 2010, JPSP — ajudar gera bem-estar
// quando AUTÔNOMO) vira construção: `formPair` exige o aceite explícito dos DOIS
// lados; sem bilateralidade, a dupla não existe como objeto.
//
// Ciência: SDT (relatedness); Gollwitzer 1999 — intenção de implementação com
// parceiro tem taxa de execução maior; a confirmação por par substitui aprovação
// de RH para evidência micro, com anti-conluio (mesmo par não se valida 2× na
// mesma semana — chave semanal reusa recognitionWeekKey, o idioma do app).
//
// Engine ≠ Domínio: vocabulário e limites chegam por parâmetro (pack).

import { recognitionWeekKey } from "../recognition/recognition-engine";

// ─── Perfil compartilhado (o ato de consentir cria o objeto mínimo) ───────────

export interface PairProfile {
  personId: string;
  displayName: string;
  /** Driver em foco da pessoa nesta temporada (mesmo vocabulário do crosswalk/diário). */
  focusDriverId: string;
  /** SÓ as forças que a pessoa explicitamente escolheu compartilhar — nunca o perfil todo. */
  sharedStrengthIds: readonly string[];
}

export interface PairPolicy {
  /** Máximo de forças que um perfil pode compartilhar (proteção contra vazar o top-N inteiro). */
  maxSharedStrengths: number;
  /** Confirmações de evidência permitidas por dupla por semana (anti-conluio). */
  weeklyConfirmationLimit: number;
}

export const DEFAULT_PAIR_POLICY: PairPolicy = {
  maxSharedStrengths: 3,
  weeklyConfirmationLimit: 1,
};

export type ProfileReason = "ok" | "invalid_request" | "no_strengths_shared" | "too_many_strengths";

export interface ProfileValidation {
  reason: ProfileReason;
}

/** Valida um perfil compartilhado. Compartilhar é um ato explícito — vazio não é consentimento. */
export function validatePairProfile(
  profile: PairProfile,
  policy: PairPolicy = DEFAULT_PAIR_POLICY,
): ProfileValidation {
  if (!profile.personId.trim() || !profile.displayName.trim() || !profile.focusDriverId.trim()) {
    return { reason: "invalid_request" };
  }
  if (profile.sharedStrengthIds.length === 0) return { reason: "no_strengths_shared" };
  if (profile.sharedStrengthIds.length > policy.maxSharedStrengths) {
    return { reason: "too_many_strengths" };
  }
  return { reason: "ok" };
}

// ─── Sugestão de dupla (determinística, nunca imposta) ───────────────────────

export interface PairSuggestion {
  candidate: PairProfile;
  /** Forças do candidato que o buscador NÃO compartilhou — a complementaridade citável. */
  complementaryStrengthIds: string[];
}

/**
 * Sugere candidatos para o buscador: mesmo driver em foco + pelo menos uma força
 * compartilhada que o buscador não tem (complementar). Ordena por mais complementos,
 * empate por personId (determinístico). É SUGESTÃO — a dupla só nasce com aceite bilateral.
 */
export function suggestPairs(
  seeker: PairProfile,
  candidates: readonly PairProfile[],
): PairSuggestion[] {
  const seekerStrengths = new Set(seeker.sharedStrengthIds);
  return candidates
    .filter((c) => c.personId !== seeker.personId && c.focusDriverId === seeker.focusDriverId)
    .map((candidate) => ({
      candidate,
      complementaryStrengthIds: candidate.sharedStrengthIds.filter((s) => !seekerStrengths.has(s)),
    }))
    .filter((s) => s.complementaryStrengthIds.length > 0)
    .sort(
      (a, b) =>
        b.complementaryStrengthIds.length - a.complementaryStrengthIds.length ||
        a.candidate.personId.localeCompare(b.candidate.personId),
    );
}

// ─── Formação da dupla (bilateral por construção) ────────────────────────────

export interface PracticePair {
  id: string;
  memberIds: readonly [string, string];
  focusDriverId: string;
  formedOn: string;
}

export type FormPairReason =
  | "formed"
  | "invalid_request"
  | "self_pair"
  | "driver_mismatch"
  | "not_bilateral"
  | "already_paired";

export interface FormPairResult {
  reason: FormPairReason;
  pair?: PracticePair;
  pairs: PracticePair[];
}

/**
 * Forma a dupla — só existe com aceite explícito dos DOIS lados. Um gestor não tem
 * como designar uma dupla por aqui: sem `accepted` bilateral, não há objeto.
 */
export function formPair(
  existing: readonly PracticePair[],
  request: {
    id: string;
    a: PairProfile;
    b: PairProfile;
    aAccepted: boolean;
    bAccepted: boolean;
    formedOn: string;
  },
): FormPairResult {
  const pairs = [...existing];
  const { id, a, b, aAccepted, bAccepted, formedOn } = request;

  if (!id.trim() || !formedOn.trim()) return { reason: "invalid_request", pairs };
  if (a.personId === b.personId) return { reason: "self_pair", pairs };
  if (a.focusDriverId !== b.focusDriverId) return { reason: "driver_mismatch", pairs };
  if (!aAccepted || !bAccepted) return { reason: "not_bilateral", pairs };

  const alreadyPaired = pairs.some(
    (p) => p.memberIds.includes(a.personId) || p.memberIds.includes(b.personId),
  );
  if (alreadyPaired) return { reason: "already_paired", pairs };

  const pair: PracticePair = {
    id,
    memberIds: [a.personId, b.personId],
    focusDriverId: a.focusDriverId,
    formedOn,
  };
  return { reason: "formed", pair, pairs: [...pairs, pair] };
}

// ─── Confirmação de evidência por par (com anti-conluio semanal) ─────────────

export interface PairConfirmation {
  id: string;
  pairId: string;
  /** Quem confirma — nunca o dono da evidência. */
  confirmerId: string;
  /** Dono da evidência confirmada (o parceiro). */
  partnerId: string;
  /** Registro do Diário de Prática (I7) confirmado — referência, nunca o conteúdo. */
  entryId: string;
  occurredOn: string;
}

export type ConfirmReason =
  | "confirmed"
  | "invalid_request"
  | "not_pair_member"
  | "self_confirmation"
  | "duplicate"
  | "entry_already_confirmed"
  | "weekly_limit_reached";

export interface ConfirmResult {
  reason: ConfirmReason;
  confirmation?: PairConfirmation;
  confirmations: PairConfirmation[];
}

/**
 * Um membro da dupla confirma a evidência do OUTRO. Anti-conluio: a mesma dupla
 * não acumula confirmações além do limite na mesma semana (Guia do blueprint:
 * "o mesmo par não se valida 2× na mesma semana").
 */
export function confirmPartnerEvidence(
  existing: readonly PairConfirmation[],
  request: PairConfirmation,
  pair: PracticePair,
  policy: PairPolicy = DEFAULT_PAIR_POLICY,
): ConfirmResult {
  const confirmations = [...existing];
  const { id, pairId, confirmerId, partnerId, entryId, occurredOn } = request;

  if (!id.trim() || !pairId.trim() || !entryId.trim() || !occurredOn.trim()) {
    return { reason: "invalid_request", confirmations };
  }
  if (pairId !== pair.id) return { reason: "invalid_request", confirmations };
  if (!pair.memberIds.includes(confirmerId) || !pair.memberIds.includes(partnerId)) {
    return { reason: "not_pair_member", confirmations };
  }
  if (confirmerId === partnerId) return { reason: "self_confirmation", confirmations };
  if (confirmations.some((c) => c.id === id)) return { reason: "duplicate", confirmations };
  if (confirmations.some((c) => c.entryId === entryId)) {
    return { reason: "entry_already_confirmed", confirmations };
  }

  const week = recognitionWeekKey(occurredOn);
  const usedThisWeek = confirmations.filter(
    (c) => c.pairId === pair.id && recognitionWeekKey(c.occurredOn) === week,
  ).length;
  if (usedThisWeek >= policy.weeklyConfirmationLimit) {
    return { reason: "weekly_limit_reached", confirmations };
  }

  return { reason: "confirmed", confirmation: request, confirmations: [...confirmations, request] };
}

/** Confirmações recebidas por uma pessoa (as evidências dela validadas pelo par). */
export function confirmationsForPartner(
  confirmations: readonly PairConfirmation[],
  partnerId: string,
): PairConfirmation[] {
  return confirmations.filter((c) => c.partnerId === partnerId);
}
