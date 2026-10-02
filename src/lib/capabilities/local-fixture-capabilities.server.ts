// Capabilities em fixture LOCAL controlada (macro-onda R5/R6).
//
// O registro (`registry.ts`) é congelado e não lê ambiente, de propósito:
// ligar um módulo opcional em produção é decisão de contrato, não de flag.
// A demonstração local da jornada IVO precisa do ledger (ACTION_PLAN) contra
// um Supabase LOCAL descartável — e só lá.
//
// Esta camada server-only habilita uma capability somente quando TODAS as
// condições abaixo valem ao mesmo tempo. Qualquer uma ausente devolve o valor
// do registro (desligado):
//   1. a capability está na lista FECHADA de fixtures locais (só ACTION_PLAN);
//   2. foi pedida explicitamente em VITALOS_LOCAL_FIXTURE_CAPABILITIES;
//   3. VITALOS_RUNTIME_ENV=local e VITALOS_DB_TARGET=local;
//   4. SUPABASE_URL e VITE_SUPABASE_URL são loopback (mesma regra do preflight);
//   5. nenhuma declaração HML está presente.
//
// Não contorna verificação de acesso: a capability só decide se o MÓDULO
// existe neste ambiente. Sessão, papel e organização continuam sendo
// verificados por quem chama.

import { isCapabilityEnabled, type CapabilityId } from "./registry";
import { isLocalUrl } from "@/lib/env/environment-contract";

/** Lista fechada — adicionar aqui é decisão revisável, nunca efeito colateral. */
export const LOCAL_FIXTURE_CAPABILITIES: readonly CapabilityId[] = ["ACTION_PLAN"];

export interface LocalFixtureEnv {
  VITALOS_RUNTIME_ENV?: string | undefined;
  VITALOS_DB_TARGET?: string | undefined;
  SUPABASE_URL?: string | undefined;
  VITE_SUPABASE_URL?: string | undefined;
  VITE_FIBT_HML_ENABLED?: string | undefined;
  FIBT_HML_DEPLOYMENT_ENABLED?: string | undefined;
  VITALOS_LOCAL_FIXTURE_CAPABILITIES?: string | undefined;
}

export type ServerCapabilityDecision =
  | { enabled: true; source: "registry" | "local_fixture" | "ivo_staging_profile" }
  | {
    enabled: false;
    reason:
    | "registry_disabled"
    | "not_fixture_capability"
    | "not_local_runtime"
    | "non_loopback_database"
    | "hml_declared";
  };

export function resolveServerCapability(
  id: CapabilityId,
  env: LocalFixtureEnv = process.env as LocalFixtureEnv,
): ServerCapabilityDecision {
  if (isCapabilityEnabled(id)) return { enabled: true, source: "registry" };

  const requested = (env.VITALOS_LOCAL_FIXTURE_CAPABILITIES ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (!requested.includes(id)) return { enabled: false, reason: "registry_disabled" };
  if (!LOCAL_FIXTURE_CAPABILITIES.includes(id)) return { enabled: false, reason: "not_fixture_capability" };

  if (env.VITALOS_RUNTIME_ENV?.trim() !== "local" || env.VITALOS_DB_TARGET?.trim() !== "local") {
    return { enabled: false, reason: "not_local_runtime" };
  }
  const serverUrl = env.SUPABASE_URL?.trim() ?? "";
  const clientUrl = env.VITE_SUPABASE_URL?.trim() ?? "";
  if (!serverUrl || !clientUrl || !isLocalUrl(serverUrl) || !isLocalUrl(clientUrl)) {
    return { enabled: false, reason: "non_loopback_database" };
  }
  if (env.VITE_FIBT_HML_ENABLED !== undefined || env.FIBT_HML_DEPLOYMENT_ENABLED !== undefined) {
    return { enabled: false, reason: "hml_declared" };
  }
  return { enabled: true, source: "local_fixture" };
}
