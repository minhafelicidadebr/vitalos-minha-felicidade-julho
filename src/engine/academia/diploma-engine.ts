// Diploma Vivo — engine PURO (I2, Academia Viva 2.0). Certifica PRÁTICA, não presença.
//
// TESE (§F do PLANO_ACADEMIA_VIVA_2.0.md): certificar seat-time é overclaim pedagógico.
// A elegibilidade é COMPUTADA (mesmo princípio do certification-engine: nunca comprada)
// e exige três provas reais:
//   (i)  trilha do driver concluída,
//   (ii) retenção comprovada — cartões SM-2 do driver em estado maduro (intervalo ≥21d,
//        a MESMA constante SM2_MATURE_INTERVAL_DAYS de todo o app),
//   (iii) ≥1 registro de prática aplicada.
// Ciência: Roediger & Karpicke 2006 (efeito de teste — o diploma atesta retenção, não
// presença); Cepeda et al. 2006 (retenção espaçada como critério válido); SDT
// (reconhecimento de competência REAL sustenta motivação — certificado vazio a corrói).
//
// Código de verificação v1: content-hash determinístico — a MESMA credencial canônica
// sempre produz o MESMO código, então qualquer pessoa com o documento pode recomputá-lo
// e conferir integridade. HONESTIDADE (Fable 5 §8): isto NÃO é um registro público de
// emissão — /verificar/:code com revogação exige a tabela verifiable_credentials (S6.5,
// rollout do blueprint) e fica explicitamente fora desta v1.
//
// Engine ≠ Domínio: sinais, rótulos, emissor e disclaimer chegam por parâmetro.

import { SM2_MATURE_INTERVAL_DAYS } from "../learning/sm2-engine";

export type DiplomaCriterionStatus = "cumprido" | "nao_cumprido";

export interface DiplomaCriterionResult {
  id: "trilha" | "retencao" | "pratica";
  label: string;
  status: DiplomaCriterionStatus;
  value: string;
  target: string;
  note: string;
}

export interface DiplomaEligibilityInput {
  /** Trilha do driver concluída (sinal real: participation_events kind "learning_path"). */
  pathCompleted: boolean;
  /** Intervalos (dias) dos cartões SM-2 do driver JÁ estudados — filtrados pelo compositor. */
  cardIntervalsDays: readonly number[];
  /** Nº de registros de prática aplicada do driver (Action Log / Diário de Prática). */
  appliedPracticeCount: number;
}

export interface DiplomaConfig {
  /** Intervalo mínimo (dias) para um cartão contar como maduro. */
  matureIntervalDays: number;
  /** Nº mínimo de cartões maduros do driver. */
  minMatureCards: number;
  /** Nº mínimo de registros de prática aplicada. */
  minAppliedPractice: number;
}

export const DEFAULT_DIPLOMA_CONFIG: DiplomaConfig = {
  matureIntervalDays: SM2_MATURE_INTERVAL_DAYS,
  minMatureCards: 2,
  minAppliedPractice: 1,
};

export interface DiplomaEligibilityResult {
  /** Concedido SÓ com os 3 critérios cumpridos — não existe crédito parcial em certificação. */
  granted: boolean;
  criteria: DiplomaCriterionResult[];
  /** O que falta, em linguagem de próximo passo (vazio quando granted). */
  gaps: string[];
}

export function assessDiplomaEligibility(
  input: DiplomaEligibilityInput,
  config: DiplomaConfig = DEFAULT_DIPLOMA_CONFIG,
): DiplomaEligibilityResult {
  const criteria: DiplomaCriterionResult[] = [];

  // C1 — Trilha concluída.
  criteria.push({
    id: "trilha",
    label: "Trilha do driver concluída",
    status: input.pathCompleted ? "cumprido" : "nao_cumprido",
    value: input.pathCompleted ? "Trilha concluída" : "Trilha em andamento",
    target: "Todos os módulos da trilha",
    note: input.pathCompleted
      ? "A base conceitual do driver foi percorrida por inteiro."
      : "Concluir a trilha é a primeira das três provas.",
  });

  // C2 — Retenção comprovada (o coração do diploma: efeito de teste, não seat-time).
  const matureCount = input.cardIntervalsDays.filter(
    (days) => days >= config.matureIntervalDays,
  ).length;
  const retentionMet = matureCount >= config.minMatureCards;
  criteria.push({
    id: "retencao",
    label: "Retenção comprovada (revisão espaçada)",
    status: retentionMet ? "cumprido" : "nao_cumprido",
    value: `${matureCount} cartão(ões) maduro(s) de ${input.cardIntervalsDays.length} estudado(s)`,
    target: `≥ ${config.minMatureCards} cartões com intervalo ≥ ${config.matureIntervalDays} dias`,
    note: retentionMet
      ? "O conhecimento sobreviveu ao tempo — é retenção medida, não presença."
      : "Continuar as revisões espaçadas até os cartões amadurecerem.",
  });

  // C3 — Prática aplicada.
  const practiceMet = input.appliedPracticeCount >= config.minAppliedPractice;
  criteria.push({
    id: "pratica",
    label: "Prática aplicada registrada",
    status: practiceMet ? "cumprido" : "nao_cumprido",
    value: `${input.appliedPracticeCount} registro(s) de prática`,
    target: `≥ ${config.minAppliedPractice} registro com evidência`,
    note: practiceMet
      ? "O aprendizado saiu da tela e virou prática registrada."
      : "Registrar ao menos uma aplicação real fecha a terceira prova.",
  });

  const granted = criteria.every((c) => c.status === "cumprido");
  const gaps = criteria.filter((c) => c.status !== "cumprido").map((c) => `${c.label}: ${c.note}`);

  return { granted, criteria, gaps };
}

// ─── Documento da credencial + código de verificação ─────────────────────────

export interface DiplomaAward {
  /** Nome exibido SÓ com consentimento explícito da pessoa. */
  recipientName: string;
  credentialTitle: string;
  issuerName: string;
  driverLabel: string;
  pathTitle: string;
  awardedOn: string; // ISO date
  criteria: DiplomaCriterionResult[];
}

/** Mesmo idioma FNV-1a dos engines de survey-draft e vitrine (hash local, sem I/O). */
function fnv1aHex(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/**
 * Código de verificação por conteúdo: a mesma credencial canônica sempre gera o mesmo
 * código. Verificável offline por recomputação — NÃO substitui um registro de emissão.
 */
export function diplomaVerificationCode(award: DiplomaAward): string {
  const canonical = [
    award.recipientName,
    award.credentialTitle,
    award.issuerName,
    award.driverLabel,
    award.pathTitle,
    award.awardedOn,
    ...award.criteria.map((c) => `${c.id}=${c.status}`),
  ].join("|");
  return `DV-${fnv1aHex(canonical).toUpperCase()}`;
}

export type BuildDiplomaResult =
  | { ok: true; award: DiplomaAward; verificationCode: string }
  | { ok: false; reason: "not_eligible" | "missing_recipient_consent" };

/**
 * Único construtor válido de um diploma: sem elegibilidade concedida ou sem nome
 * consentido, o documento simplesmente não existe — por construção, não por política.
 */
export function buildDiploma(input: {
  eligibility: DiplomaEligibilityResult;
  recipientName: string;
  credentialTitle: string;
  issuerName: string;
  driverLabel: string;
  pathTitle: string;
  awardedOn: string;
}): BuildDiplomaResult {
  if (!input.eligibility.granted) return { ok: false, reason: "not_eligible" };
  if (!input.recipientName.trim()) return { ok: false, reason: "missing_recipient_consent" };

  const award: DiplomaAward = {
    recipientName: input.recipientName.trim(),
    credentialTitle: input.credentialTitle,
    issuerName: input.issuerName,
    driverLabel: input.driverLabel,
    pathTitle: input.pathTitle,
    awardedOn: input.awardedOn,
    criteria: input.eligibility.criteria,
  };
  return { ok: true, award, verificationCode: diplomaVerificationCode(award) };
}
