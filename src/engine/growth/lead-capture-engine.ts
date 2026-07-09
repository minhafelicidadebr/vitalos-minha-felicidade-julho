// Captura de leads — engine PURO (S7, Porta de Entrada). Fecha P1-05 (zero
// captura de leads): o modal executivo da landing existia desde antes,
// declarado honestamente como "demonstração visual — nenhum dado é enviado
// ou armazenado". Este engine é a metade determinística da correção: valida
// a submissão e extrai a origem (UTM), sem tocar rede ou banco.
//
// Consentimento explícito é um REQUISITO, não um detalhe de UI: sem
// `consent: true`, a submissão é recusada — nunca um checkbox pré-marcado
// em lugar nenhum do app (LGPD, mesma doutrina do consent-engine de IA).
//
// Engine ≠ Domínio: não importa o catálogo de "interesses" da landing-copy
// (isso é vocabulário de cliente/UI); só valida forma (string não vazia,
// dentro de um teto de tamanho).

export interface LeadSubmission {
  name: string;
  company: string;
  role: string;
  email: string;
  whatsapp: string;
  interest: string;
  /** De onde veio o lead: "/" | "/nr1" | outra landing pública. */
  sourcePage: string;
  /** Consentimento explícito — nunca assumido. */
  consent: boolean;
  consentVersion: string;
}

export interface UtmParams {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  term: string | null;
  content: string | null;
}

/** Extrai UTM de uma querystring bruta (ex.: window.location.search). Puro. */
export function parseUtmParams(search: string): UtmParams {
  const params = new URLSearchParams(search);
  return {
    source: params.get("utm_source"),
    medium: params.get("utm_medium"),
    campaign: params.get("utm_campaign"),
    term: params.get("utm_term"),
    content: params.get("utm_content"),
  };
}

export type LeadValidationReason =
  | "ok"
  | "invalid_request"
  | "missing_consent"
  | "invalid_email"
  | "field_too_long";

export interface LeadValidationResult {
  reason: LeadValidationReason;
}

const MAX_FIELD_LENGTH = 200;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Valida a submissão do formulário executivo. Campos vazios ou consentimento
 * ausente recusam ANTES de qualquer persistência — nunca salvamos um lead
 * sem nome/e-mail utilizável, e nunca sem o consentimento explícito.
 */
export function validateLeadSubmission(submission: LeadSubmission): LeadValidationResult {
  const requiredFields = [
    submission.name,
    submission.company,
    submission.email,
    submission.interest,
    submission.sourcePage,
  ];
  if (requiredFields.some((f) => !f || !f.trim())) {
    return { reason: "invalid_request" };
  }

  const allFields = [
    submission.name,
    submission.company,
    submission.role,
    submission.email,
    submission.whatsapp,
    submission.interest,
  ];
  if (allFields.some((f) => f.length > MAX_FIELD_LENGTH)) {
    return { reason: "field_too_long" };
  }

  if (!EMAIL_PATTERN.test(submission.email.trim())) {
    return { reason: "invalid_email" };
  }

  if (!submission.consent || !submission.consentVersion.trim()) {
    return { reason: "missing_consent" };
  }

  return { reason: "ok" };
}
