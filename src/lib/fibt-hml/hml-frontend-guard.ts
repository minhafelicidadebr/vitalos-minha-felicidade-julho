// Guarda de modo de homologação (FIBT-HML-1B) — decide, no CLIENTE, se a rota
// pública /convite/:token deve ativar o banner/confirmação de homologação
// sintética. Puro: recebe o ambiente como dado, nunca lê import.meta.env
// diretamente (isso fica no ponto de chamada, na rota), para ser testável
// sem depender do bundler.
//
// FAIL-CLOSED por design: qualquer condição ausente ou divergente resulta em
// `active: false` — a rota volta ao comportamento de sempre (produção
// normal), nunca mostra um banner com informação errada nem finge estar em
// homologação quando a configuração está inconsistente. O objetivo não é
// "sempre avisar", é "nunca mentir sobre em que modo está".

import { maskRef, projectRefFromUrl } from "@/lib/env/environment-contract";

export const FORBIDDEN_HML_BASE_HOSTNAMES = [
  "vitalos.com.br",
  "www.vitalos.com.br",
  "app.vitalos.com.br",
] as const;

export interface HmlEnvLike {
  VITE_FIBT_HML_ENABLED?: string;
  VITE_FIBT_HML_ENVIRONMENT?: string;
  VITE_FIBT_HML_PROJECT_REF?: string;
  VITE_FIBT_HML_BATCH_ID?: string;
  /** Mesma variável que o cliente real do navegador já lê (environment-contract.ts) —
   * não uma nova var: o ref efetivo é derivado dela, nunca declarado solto. */
  VITE_SUPABASE_URL?: string;
}

export type HmlInactiveReason =
  | "HML_NOT_ENABLED"
  | "HML_ENVIRONMENT_NOT_STAGING"
  | "HML_PROJECT_REF_MISSING"
  | "HML_PROJECT_REF_UNRESOLVABLE"
  | "HML_PROJECT_REF_MISMATCH"
  | "HML_BATCH_ID_MISSING"
  | "HML_HOSTNAME_FORBIDDEN";

export type HmlModeResolution =
  | { active: true; batchId: string; projectRefMasked: string }
  | { active: false; reason: HmlInactiveReason };

/**
 * Resolve se o modo de homologação deve estar ativo. `currentHostname` é
 * opcional (ausente em SSR) — quando presente, hostnames de produção são
 * recusados mesmo que as variáveis de build estivessem, por erro, corretas.
 */
export function resolveHmlMode(env: HmlEnvLike, currentHostname?: string): HmlModeResolution {
  if (env.VITE_FIBT_HML_ENABLED !== "true") {
    return { active: false, reason: "HML_NOT_ENABLED" };
  }
  if (env.VITE_FIBT_HML_ENVIRONMENT !== "staging") {
    return { active: false, reason: "HML_ENVIRONMENT_NOT_STAGING" };
  }

  const declaredRef = env.VITE_FIBT_HML_PROJECT_REF?.trim();
  if (!declaredRef) {
    return { active: false, reason: "HML_PROJECT_REF_MISSING" };
  }

  const actualRef = env.VITE_SUPABASE_URL ? projectRefFromUrl(env.VITE_SUPABASE_URL) : null;
  if (!actualRef) {
    return { active: false, reason: "HML_PROJECT_REF_UNRESOLVABLE" };
  }
  if (actualRef !== declaredRef) {
    return { active: false, reason: "HML_PROJECT_REF_MISMATCH" };
  }

  const batchId = env.VITE_FIBT_HML_BATCH_ID?.trim();
  if (!batchId) {
    return { active: false, reason: "HML_BATCH_ID_MISSING" };
  }

  if (currentHostname) {
    const host = currentHostname.toLowerCase();
    if ((FORBIDDEN_HML_BASE_HOSTNAMES as readonly string[]).includes(host)) {
      return { active: false, reason: "HML_HOSTNAME_FORBIDDEN" };
    }
  }

  return { active: true, batchId, projectRefMasked: maskRef(actualRef) };
}

export const HML_BANNER_TEXT = {
  line1: "AMBIENTE DE HOMOLOGAÇÃO",
  line2: "DADOS EXCLUSIVAMENTE SINTÉTICOS",
  line3: "NÃO RESPONDA SOBRE SUA EXPERIÊNCIA REAL",
  line4: "NÃO INSIRA NOMES, E-MAILS OU INFORMAÇÕES DE TRABALHADORES",
  line5: "ESTE TESTE NÃO CONSTITUI APLICAÇÃO OFICIAL DO FIB-T",
} as const;

export const HML_PERSONA_CONFIRMATION_TEXT =
  "Confirmo que utilizarei somente a persona fictícia fornecida e não responderei com base na minha experiência pessoal.";

export const HML_PRE_SUBMIT_REVIEW_TEXT =
  "Revise suas respostas e confirme que nenhuma informação pessoal ou real foi inserida.";
