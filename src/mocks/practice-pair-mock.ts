// Duplas de Prática — dados demonstrativos DETERMINÍSTICOS (I6, 2ª metade).
// A história honesta da demo: a Marina compartilhou 2 forças (curiosidade e
// gratidão — do seu VIA-T real, MAS por escolha explícita: o perfil completo
// nunca circula) e tem 2 colegas opt-in no mesmo driver em foco ("energia").
// O Caio é complementar (autorregulação + perseverança); a Júlia é espelho
// (também curiosidade) — o engine só sugere o Caio, e a demo mostra o porquê.
// Ninguém aqui foi "designado": os candidatos são pessoas que TAMBÉM optaram.

import type { PairProfile } from "@/engine/learning/practice-pair-engine";
import { MOCK_USER } from "./colaborador-mock";

/** Perfil compartilhado da Marina — 2 forças escolhidas por ela, nunca o VIA-T inteiro. */
export const MARINA_PAIR_PROFILE: PairProfile = {
  personId: MOCK_USER.id,
  displayName: MOCK_USER.name,
  focusDriverId: "energia",
  sharedStrengthIds: ["curiosidade", "gratidao"],
};

/** Colegas que TAMBÉM optaram por participar (opt-in bilateral — nunca designados). */
export const PAIR_CANDIDATES: PairProfile[] = [
  {
    personId: "u-caio",
    displayName: "Caio",
    focusDriverId: "energia",
    sharedStrengthIds: ["autorregulacao", "perseveranca"],
  },
  {
    personId: "u-julia",
    displayName: "Júlia",
    focusDriverId: "energia",
    // Espelho da Marina (mesma força) — o engine corretamente NÃO sugere.
    sharedStrengthIds: ["curiosidade"],
  },
];

export const PAIR_STRENGTH_LABELS: Record<string, string> = {
  curiosidade: "Curiosidade",
  gratidao: "Gratidão",
  autorregulacao: "Autorregulação",
  perseveranca: "Perseverança",
};

/**
 * Referência à prática do Caio desta semana — SÓ metadados (driver, tipo, data).
 * O conteúdo do registro é DELE: a dupla confirma que a prática aconteceu
 * (estiveram juntos nela), nunca lê nem valida o texto do parceiro.
 */
export const PARTNER_PRACTICE_REF = {
  entryId: "pj-u-caio-energia-semana",
  ownerId: "u-caio",
  driverId: "energia",
  kindLabel: "Relato curto",
  occurredOn: "2026-07-08",
} as const;

export const PRACTICE_PAIR_COPY = {
  title: "Sua dupla desta temporada",
  lead:
    "Praticar com um par aumenta a taxa de execução da intenção (Gollwitzer, 1999). " +
    "A dupla nasce de um aceite dos DOIS lados — nunca é designada por gestor — e " +
    "cada um confirma a evidência do outro, uma vez por semana.",
  consentNote:
    "Você escolhe quais forças compartilhar (até 3) — o seu Mapa de Forças completo " +
    "nunca é exposto. Compartilhar é um ato explícito: sem escolha, nada circula.",
  antiColusionNote:
    "A mesma dupla confirma no máximo 1 evidência por semana — a confirmação por " +
    "par vale pelo ritmo real de prática, não por volume.",
  demoNote:
    "Demonstração: a dupla e as confirmações desta sessão são efêmeras e vivem só neste navegador.",
} as const;
