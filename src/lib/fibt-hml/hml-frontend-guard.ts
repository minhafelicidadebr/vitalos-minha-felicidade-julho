// Guarda de modo de homologação (FIBT-HML-1B, endurecida em FIBT-HML-1D) —
// decide, no CLIENTE, se a rota pública /convite/:token deve ativar o
// banner/confirmação de homologação sintética. Puro: recebe ambiente,
// origem atual e atestação server-side como DADOS (nunca lê import.meta.env,
// window.location ou faz fetch diretamente) — isso fica no ponto de chamada,
// na rota, para que esta função seja testável sem depender do bundler nem de
// rede.
//
// FAIL-CLOSED por design: qualquer condição ausente ou divergente resulta em
// `active: false`. FIBT-HML-1D adiciona uma distinção que FIBT-HML-1C exigiu:
// "ativo" não pode mais depender só das variáveis VITE_FIBT_HML_* — agora
// exige TAMBÉM uma atestação vinda do servidor (via endpoint de atestação,
// Fase 9), que é o único lugar que de fato confirma o backend Supabase real.
// Sem essa atestação, o estado é `blocked: true` (HML_BLOCKED) — nunca
// silenciosamente "modo normal" nem "modo homologação sem prova".

import { projectRefFromUrl, maskRef } from "@/lib/env/environment-contract";
import {
  HML_BATCH_ID,
  HML_CONTRACT_VERSION,
  FORBIDDEN_HML_BASE_HOSTNAMES,
  validateHmlOrigin,
} from "./hml-contract";

export { FORBIDDEN_HML_BASE_HOSTNAMES };

export interface HmlEnvLike {
  VITE_FIBT_HML_ENABLED?: string;
  VITE_FIBT_HML_ENVIRONMENT?: string;
  VITE_FIBT_HML_PROJECT_REF?: string;
  VITE_FIBT_HML_BATCH_ID?: string;
  /** Origem pública autorizada do frontend de homologação — mesmo valor que
   *  o servidor declara em FIBT_HML_FRONTEND_BASE_URL (hml-backend-boundary.server.ts). */
  VITE_FIBT_HML_FRONTEND_BASE_URL?: string;
  /** Mesma variável que o cliente real do navegador já lê (environment-contract.ts) —
   * não uma nova var: o ref efetivo é derivado dela, nunca declarado solto. */
  VITE_SUPABASE_URL?: string;
}

/** Payload do endpoint de atestação (Fase 9.3) — nunca carrega ref/URL/segredo. */
export interface HmlAttestationPayload {
  status: "READY" | "BLOCKED";
  contract_version?: string;
  environment?: string;
  batch_id?: string;
  backend_attested?: boolean;
  frontend_origin_attested?: boolean;
  failure_code?: string;
}

export type HmlInactiveReason =
  | "HML_NOT_ENABLED"
  | "HML_ENVIRONMENT_NOT_STAGING"
  | "HML_PROJECT_REF_MISSING"
  | "HML_PROJECT_REF_UNRESOLVABLE"
  | "HML_PROJECT_REF_MISMATCH"
  | "HML_BATCH_ID_MISSING"
  | "HML_BATCH_ID_MISMATCH"
  | "HML_HOSTNAME_FORBIDDEN"
  | "HML_FRONTEND_ORIGIN_INVALID"
  | "HML_BACKEND_ATTESTATION_MISSING"
  | "HML_BACKEND_ATTESTATION_FAILED";

export type HmlModeResolution =
  | { active: true; blocked: false; batchId: string; projectRefMasked: string }
  /** HML foi declarado neste deployment (VITE_FIBT_HML_ENABLED=true), mas
   *  alguma condição de segurança não foi satisfeita — a rota deve bloquear
   *  a resolução do convite e nunca cair de volta ao modo comum (Fase 4). */
  | { active: false; blocked: true; reason: HmlInactiveReason }
  /** HML nem foi declarado — comportamento de produção normal, inalterado. */
  | { active: false; blocked: false; reason: "HML_NOT_ENABLED" };

/**
 * Resolve se o modo de homologação deve estar ativo. `currentOrigin` é
 * `window.location.origin` (ausente em SSR — antes da hidratação, a
 * resolução fica `blocked: true` até o efeito no cliente preencher, nunca
 * `active: true` prematuramente). `attestation` é o resultado (já resolvido)
 * de uma chamada ao endpoint de atestação server-side — undefined enquanto
 * ainda não chegou.
 */
export function resolveHmlMode(
  env: HmlEnvLike,
  currentOrigin?: string,
  attestation?: HmlAttestationPayload,
): HmlModeResolution {
  if (env.VITE_FIBT_HML_ENABLED !== "true") {
    return { active: false, blocked: false, reason: "HML_NOT_ENABLED" };
  }
  if (env.VITE_FIBT_HML_ENVIRONMENT !== "staging") {
    return { active: false, blocked: true, reason: "HML_ENVIRONMENT_NOT_STAGING" };
  }

  const declaredRef = env.VITE_FIBT_HML_PROJECT_REF?.trim();
  if (!declaredRef) {
    return { active: false, blocked: true, reason: "HML_PROJECT_REF_MISSING" };
  }

  const actualRef = env.VITE_SUPABASE_URL ? projectRefFromUrl(env.VITE_SUPABASE_URL) : null;
  if (!actualRef) {
    return { active: false, blocked: true, reason: "HML_PROJECT_REF_UNRESOLVABLE" };
  }
  if (actualRef !== declaredRef) {
    return { active: false, blocked: true, reason: "HML_PROJECT_REF_MISMATCH" };
  }

  const batchId = env.VITE_FIBT_HML_BATCH_ID?.trim();
  if (!batchId) {
    return { active: false, blocked: true, reason: "HML_BATCH_ID_MISSING" };
  }
  // Não aceitar qualquer batch_id não vazio — precisa ser exatamente o da
  // campanha canônica (P1 confirmado na FIBT-HML-1C).
  if (batchId !== HML_BATCH_ID) {
    return { active: false, blocked: true, reason: "HML_BATCH_ID_MISMATCH" };
  }

  if (currentOrigin) {
    try {
      const host = new URL(currentOrigin).hostname.toLowerCase();
      if ((FORBIDDEN_HML_BASE_HOSTNAMES as readonly string[]).includes(host)) {
        return { active: false, blocked: true, reason: "HML_HOSTNAME_FORBIDDEN" };
      }
    } catch {
      // currentOrigin malformado cai na validação de origem abaixo, que já
      // recusa por HML_FRONTEND_ORIGIN_INVALID (unparseable).
    }
  }

  // Origem atual exatamente igual à base URL autorizada — HTTPS, sem
  // credenciais/query/fragment, comparação por IGUALDADE, nunca blocklist
  // (validateHmlOrigin, hml-contract.ts).
  const originCheck = validateHmlOrigin(currentOrigin, env.VITE_FIBT_HML_FRONTEND_BASE_URL);
  if (!originCheck.valid) {
    return { active: false, blocked: true, reason: "HML_FRONTEND_ORIGIN_INVALID" };
  }

  // Atestação server-side — a condição que fecha o P0 da FIBT-HML-1C: só
  // ativa o banner quando o SERVIDOR já confirmou que este deployment está
  // vinculado ao backend de staging autorizado (hml-backend-boundary.server.ts).
  // Nunca usar apenas as variáveis VITE_* para decidir que o ambiente é seguro.
  if (!attestation) {
    return { active: false, blocked: true, reason: "HML_BACKEND_ATTESTATION_MISSING" };
  }
  const attestationOk =
    attestation.status === "READY" &&
    attestation.contract_version === HML_CONTRACT_VERSION &&
    attestation.batch_id === HML_BATCH_ID &&
    attestation.backend_attested === true &&
    attestation.frontend_origin_attested === true;
  if (!attestationOk) {
    return { active: false, blocked: true, reason: "HML_BACKEND_ATTESTATION_FAILED" };
  }

  return { active: true, blocked: false, batchId, projectRefMasked: maskRef(actualRef) };
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

export const HML_BLOCKED_MESSAGE =
  "Este ambiente está configurado para homologação, mas a verificação de segurança do backend ainda não foi concluída. A pesquisa não pode ser aberta enquanto essa verificação não for confirmada.";

// ─── Estado visual da rota (Fase 9.2) ─────────────────────────────────────
//
// Extraído como função pura para que a decisão "quando o banner aparece,
// quando o formulário fica bloqueado, quando o gate de persona entra" seja
// verificável estruturalmente (union discriminada + teste unitário direto),
// substituindo o antigo portão que só provava substring/comentário no
// texto-fonte da rota (removido em FIBT-HML-1D — ver commitGateFailures em
// scripts/fibt-hml/create-synthetic-homologation-links.ts).

export type HmlRouteDisplayState =
  | { kind: "HML_BLOCKED"; message: string }
  | { kind: "HML_ATTESTED"; batchId: string }
  | { kind: "NORMAL_MODE" };

export function resolveHmlRouteDisplayState(hmlMode: HmlModeResolution): HmlRouteDisplayState {
  if (hmlMode.blocked) return { kind: "HML_BLOCKED", message: HML_BLOCKED_MESSAGE };
  if (hmlMode.active) return { kind: "HML_ATTESTED", batchId: hmlMode.batchId };
  return { kind: "NORMAL_MODE" };
}
