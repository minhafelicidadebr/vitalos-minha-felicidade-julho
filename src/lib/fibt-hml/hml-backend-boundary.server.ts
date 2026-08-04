// Fronteira server-side entre o modo de homologação sintética (FIBT-HML-1) e
// o backend Supabase que os caminhos de convite/submissão de fato usam.
//
// FIBT-HML-1C (revisão adversarial do PR #39) confirmou um P0: o banner/
// confirmação de persona no cliente eram desacoplados do backend real —
// `hmlMode.active` só controlava UI, nunca influenciava qual projeto Supabase
// `checkInviteToken`/`submitSurveyResponses` de fato atingiam (isso vinha,
// sempre, de SUPABASE_URL/VITE_SUPABASE_URL — ver client.server.ts). Um
// deployment mal configurado podia mostrar "ambiente de homologação" e ainda
// assim gravar em produção.
//
// `assertHmlBackendBoundary()` fecha essa lacuna: é a ÚNICA fonte da verdade
// sobre "este deployment está seguramente vinculado ao staging autorizado",
// chamada nos dois pontos server-side que tocam o banco de verdade
// (invite-resolve.server.ts, response-capture.server.ts) e no endpoint de
// atestação (Fase 9.3) — nunca confia em nada vindo do navegador.
//
// Puro em relação a I/O: recebe o ambiente como dado (nunca lê process.env
// diretamente), para ser testável sem simular ambiente.

import { projectRefFromUrl, maskRef } from "@/lib/env/environment-contract";
import { HML_BATCH_ID, HML_ENVIRONMENT, validateHmlOrigin } from "./hml-contract";

export interface HmlBackendBoundaryEnv {
  /** Declarado true SOMENTE quando este deployment é, de propósito, uma instância de homologação. */
  VITE_FIBT_HML_ENABLED?: string;
  VITE_FIBT_HML_ENVIRONMENT?: string;
  VITE_FIBT_HML_BATCH_ID?: string;
  /** Ref de staging que o operador declara como o único autorizado para este lote. */
  FIBT_HML_AUTHORIZED_STAGING_REF?: string;
  /** Origem pública do frontend de homologação — lado servidor, nunca versionado. */
  FIBT_HML_FRONTEND_BASE_URL?: string;
  /** MESMO valor de FIBT_HML_FRONTEND_BASE_URL, exposto ao bundle do cliente —
   *  mesma relação que SUPABASE_URL/VITE_SUPABASE_URL já têm em
   *  environment-contract.ts: duas variáveis, um valor, cross-checadas. */
  VITE_FIBT_HML_FRONTEND_BASE_URL?: string;
  /** Ref de produção, público e versionado (`.env`) — âncora independente,
   *  nunca derivada de SUPABASE_URL (checar contra o próprio SUPABASE_URL
   *  seria circular: é exatamente o valor sob teste). */
  VITALOS_PRODUCTION_PROJECT_REF?: string;
  /** Lista extra opcional, mesma convenção de forbiddenRefs() (staging-guard.ts). */
  FORBIDDEN_PROJECT_REFS?: string;
  /** URL Supabase REAL usada pelo servidor — client.server.ts lê exatamente esta. */
  SUPABASE_URL?: string;
  /** URL Supabase exposta ao navegador — client.ts lê exatamente esta. */
  VITE_SUPABASE_URL?: string;
}

export type HmlBackendBoundaryFailureCode =
  | "HML_ENVIRONMENT_INVALID"
  | "HML_BATCH_ID_INVALID"
  | "HML_SERVER_PROJECT_REF_MISSING"
  | "HML_BROWSER_PROJECT_REF_MISSING"
  | "HML_PROJECT_REF_MISMATCH"
  | "HML_PROJECT_REF_NOT_AUTHORIZED"
  | "HML_PRODUCTION_TARGET_FORBIDDEN"
  | "HML_FRONTEND_ORIGIN_INVALID";

export type HmlBackendBoundaryResult =
  /** HML nem foi declarado neste deployment — fluxo normal de produção/demo, inalterado. */
  | { hmlDeclared: false; attested: false; code: "HML_NOT_ENABLED" }
  | { hmlDeclared: true; attested: false; code: HmlBackendBoundaryFailureCode }
  | { hmlDeclared: true; attested: true; batchId: string; serverProjectRefMasked: string };

/**
 * Verifica, nesta ordem, as 11 condições cumulativas da autorização
 * FIBT-HML-1D (Fase 3). Fail-closed: a PRIMEIRA condição que falhar decide o
 * código de saída — nenhuma condição posterior é avaliada.
 */
export function assertHmlBackendBoundary(env: HmlBackendBoundaryEnv): HmlBackendBoundaryResult {
  // 1. enabled exatamente "true" — ausente/qualquer outro valor: HML nem se
  //    aplica a este deployment. Não é uma falha do boundary, é "não é HML".
  if (env.VITE_FIBT_HML_ENABLED !== "true") {
    return { hmlDeclared: false, attested: false, code: "HML_NOT_ENABLED" };
  }

  // 2. environment exatamente "staging".
  if (env.VITE_FIBT_HML_ENVIRONMENT !== HML_ENVIRONMENT) {
    return { hmlDeclared: true, attested: false, code: "HML_ENVIRONMENT_INVALID" };
  }

  // 3. batch_id exatamente o da campanha canônica — não "qualquer valor não vazio".
  if (env.VITE_FIBT_HML_BATCH_ID !== HML_BATCH_ID) {
    return { hmlDeclared: true, attested: false, code: "HML_BATCH_ID_INVALID" };
  }

  // 4. project ref real do cliente server-side extraído com sucesso.
  const serverRef = env.SUPABASE_URL ? projectRefFromUrl(env.SUPABASE_URL) : null;
  if (!serverRef) {
    return { hmlDeclared: true, attested: false, code: "HML_SERVER_PROJECT_REF_MISSING" };
  }

  // 5. project ref do frontend extraído com sucesso.
  const browserRef = env.VITE_SUPABASE_URL ? projectRefFromUrl(env.VITE_SUPABASE_URL) : null;
  if (!browserRef) {
    return { hmlDeclared: true, attested: false, code: "HML_BROWSER_PROJECT_REF_MISSING" };
  }

  // 6. ambos os refs são iguais — servidor e navegador nunca falam com bancos diferentes.
  if (serverRef !== browserRef) {
    return { hmlDeclared: true, attested: false, code: "HML_PROJECT_REF_MISMATCH" };
  }

  // 7. ambos são iguais ao ref autorizado EM RUNTIME (nunca hardcoded). Ausência
  //    do ref autorizado é, por si só, reprovação — nunca um "não se aplica".
  const authorizedRef = env.FIBT_HML_AUTHORIZED_STAGING_REF?.trim().toLowerCase();
  if (!authorizedRef || serverRef !== authorizedRef) {
    return { hmlDeclared: true, attested: false, code: "HML_PROJECT_REF_NOT_AUTHORIZED" };
  }

  // 8. nenhum corresponde a forbiddenRefs() — âncora INDEPENDENTE
  //    (VITALOS_PRODUCTION_PROJECT_REF, público e versionado), nunca derivada
  //    de SUPABASE_URL: checar serverRef contra um ref também derivado de
  //    SUPABASE_URL seria tautológico. Também cobre o próprio authorizedRef
  //    declarado ser, por engano, o ref de produção.
  const productionRef = env.VITALOS_PRODUCTION_PROJECT_REF?.trim().toLowerCase();
  const extraForbidden = (env.FORBIDDEN_PROJECT_REFS ?? "")
    .split(",")
    .map((r) => r.trim().toLowerCase())
    .filter(Boolean);
  const isForbidden = (ref: string) => (productionRef !== undefined && ref === productionRef) || extraForbidden.includes(ref);
  if (isForbidden(serverRef) || isForbidden(authorizedRef)) {
    return { hmlDeclared: true, attested: false, code: "HML_PRODUCTION_TARGET_FORBIDDEN" };
  }

  // 9+10+11. origem de frontend: HTTPS, sem cruft, e as duas declarações
  //    independentes (server-only × exposta ao bundle) concordam por
  //    igualdade exata de origem — mesma relação de FIBT_HML_AUTHORIZED_STAGING_REF
  //    acima, aplicada à origem em vez do ref. Nenhum fallback produtivo foi
  //    usado em nenhum passo anterior (cada condição já reprovou o caminho
  //    que o usaria).
  const originCheck = validateHmlOrigin(env.VITE_FIBT_HML_FRONTEND_BASE_URL, env.FIBT_HML_FRONTEND_BASE_URL);
  if (!originCheck.valid) {
    return { hmlDeclared: true, attested: false, code: "HML_FRONTEND_ORIGIN_INVALID" };
  }

  return {
    hmlDeclared: true,
    attested: true,
    batchId: env.VITE_FIBT_HML_BATCH_ID,
    serverProjectRefMasked: maskRef(serverRef),
  };
}
