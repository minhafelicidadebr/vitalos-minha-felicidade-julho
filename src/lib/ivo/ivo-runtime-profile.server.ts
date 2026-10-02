// Perfil de execução da experiência IVO — server-only.
//
// Três perfis, decididos SÓ por variáveis de runtime do servidor (nenhuma
// flag de cliente concede autoridade):
//
//   default  VITALOS_IVO_PROFILE ausente. Comportamento de R5: leitura Q2 para
//            a organização da sessão; ledger (ACTION_PLAN) só em fixture local.
//   staging  VITALOS_IVO_PROFILE=staging. Habilitação controlada de R5/R6 num
//            projeto Supabase de staging EXPLÍCITO, para organizações
//            EXPLICITAMENTE autorizadas. Exige, cumulativamente:
//              · SUPABASE_URL e VITE_SUPABASE_URL do MESMO projeto;
//              · esse projeto == VITALOS_IVO_AUTHORIZED_PROJECT_REF;
//              · VITALOS_PRODUCTION_PROJECT_REF declarado e DIFERENTE;
//              · VITALOS_IVO_AUTHORIZED_ORG_IDS com 1..20 UUIDs;
//              · nenhuma declaração HML (o Worker histórico não vira IVO).
//   invalid  Qualquer outro valor ou condição acima ausente/inconsistente:
//            toda leitura e escrita IVO é recusada (fail-closed).
//
// A identidade e a organização continuam vindo da sessão (requireOrgAdmin).
// A allowlist só RESTRINGE: organização da sessão fora dela é recusada.

import { projectRefFromUrl } from "@/lib/env/environment-contract";

export interface IvoProfileEnv {
  VITALOS_IVO_PROFILE?: string | undefined;
  VITALOS_IVO_AUTHORIZED_PROJECT_REF?: string | undefined;
  VITALOS_IVO_AUTHORIZED_ORG_IDS?: string | undefined;
  VITALOS_PRODUCTION_PROJECT_REF?: string | undefined;
  SUPABASE_URL?: string | undefined;
  VITE_SUPABASE_URL?: string | undefined;
  VITE_FIBT_HML_ENABLED?: string | undefined;
  FIBT_HML_DEPLOYMENT_ENABLED?: string | undefined;
}

export type IvoProfileInvalidReason =
  | "unknown_profile"
  | "hml_declared"
  | "project_ref_missing"
  | "project_ref_mismatch"
  | "production_ref_missing"
  | "production_target"
  | "org_allowlist_invalid";

export type IvoRuntimeProfile =
  | { kind: "default" }
  | { kind: "staging"; projectRef: string; authorizedOrgIds: ReadonlySet<string> }
  | { kind: "invalid"; reason: IvoProfileInvalidReason };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const MAX_AUTHORIZED_ORGS = 20;

export function resolveIvoRuntimeProfile(
  env: IvoProfileEnv = process.env as IvoProfileEnv,
): IvoRuntimeProfile {
  const declared = env.VITALOS_IVO_PROFILE;
  if (declared === undefined) return { kind: "default" };
  if (declared !== "staging") return { kind: "invalid", reason: "unknown_profile" };

  if (env.VITE_FIBT_HML_ENABLED !== undefined || env.FIBT_HML_DEPLOYMENT_ENABLED !== undefined) {
    return { kind: "invalid", reason: "hml_declared" };
  }

  const authorized = env.VITALOS_IVO_AUTHORIZED_PROJECT_REF?.trim().toLowerCase();
  const serverRef = projectRefFromUrl(env.SUPABASE_URL ?? "");
  const browserRef = projectRefFromUrl(env.VITE_SUPABASE_URL ?? "");
  if (!authorized || !serverRef || !browserRef) return { kind: "invalid", reason: "project_ref_missing" };
  if (serverRef !== authorized || browserRef !== authorized) {
    return { kind: "invalid", reason: "project_ref_mismatch" };
  }

  const production = env.VITALOS_PRODUCTION_PROJECT_REF?.trim().toLowerCase();
  if (!production) return { kind: "invalid", reason: "production_ref_missing" };
  if (production === authorized) return { kind: "invalid", reason: "production_target" };

  const ids = (env.VITALOS_IVO_AUTHORIZED_ORG_IDS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  if (ids.length === 0 || ids.length > MAX_AUTHORIZED_ORGS || ids.some((id) => !UUID.test(id))) {
    return { kind: "invalid", reason: "org_allowlist_invalid" };
  }

  return { kind: "staging", projectRef: authorized, authorizedOrgIds: new Set(ids) };
}

/** Nomes das variáveis de runtime do perfil staging (contrato do runbook). */
export const IVO_STAGING_RUNTIME_VARS = [
  "VITALOS_IVO_PROFILE",
  "VITALOS_IVO_AUTHORIZED_PROJECT_REF",
  "VITALOS_IVO_AUTHORIZED_ORG_IDS",
  "VITALOS_PRODUCTION_PROJECT_REF",
  "SUPABASE_URL",
  "VITE_SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
] as const;
