// Ponte entre o REGISTRO canônico de governança (proposta/aprovado) e as
// funcionalidades que dependem dele. Server-only.
//
// D9 (parâmetros do protocolo de eficácia) controla a ELEGIBILIDADE do parecer
// conclusivo; a pendência de D9 NÃO impede persistir um protocolo em preparação.
//
// Sobre o override de TESTE: a demonstração local precisa exercitar parecer
// favorável/desfavorável sem fingir uma aprovação real. O override só vale em
// runtime LOCAL descartável (mesmas condições das fixtures de capability:
// runtime/db local, URLs loopback, sem declaração HML), é pedido por variável
// explícita e marca o parecer como `teste_sintetico` — visível na interface.
import { governanceStateOf } from "@/domain/ivo/methodology-governance";
import { isApprovedState, type GovernanceAuthority, type GovernanceState } from "@/engine/ivo/governance-decision";
import { isLocalUrl } from "@/lib/env/environment-contract";

export interface GovernanceGateEnv {
  VITALOS_RUNTIME_ENV?: string | undefined;
  VITALOS_DB_TARGET?: string | undefined;
  SUPABASE_URL?: string | undefined;
  VITE_SUPABASE_URL?: string | undefined;
  VITE_FIBT_HML_ENABLED?: string | undefined;
  FIBT_HML_DEPLOYMENT_ENABLED?: string | undefined;
  VITALOS_IVO_TEST_GOVERNANCE?: string | undefined;
  VITALOS_IVO_METHOD_AUTHORITY_USER_IDS?: string | undefined;
}

export const TEST_GOVERNANCE_D9 = "D9_APROVADO_SINTETICO" as const;

export interface GovernanceGate {
  decisionId: "D9";
  state: GovernanceState;
  source: "registro_canonico" | "teste_sintetico";
}

/** Runtime local descartável: condições cumulativas; qualquer uma ausente ⇒ false. */
export function isDisposableLocalRuntime(env: GovernanceGateEnv): boolean {
  if (env.VITALOS_RUNTIME_ENV?.trim() !== "local" || env.VITALOS_DB_TARGET?.trim() !== "local") return false;
  const server = env.SUPABASE_URL?.trim() ?? "";
  const client = env.VITE_SUPABASE_URL?.trim() ?? "";
  if (!server || !client || !isLocalUrl(server) || !isLocalUrl(client)) return false;
  if (env.VITE_FIBT_HML_ENABLED !== undefined || env.FIBT_HML_DEPLOYMENT_ENABLED !== undefined) return false;
  return true;
}

export function resolveEfficacyGovernanceGate(env: GovernanceGateEnv = process.env as GovernanceGateEnv): GovernanceGate {
  if (env.VITALOS_IVO_TEST_GOVERNANCE?.trim() === TEST_GOVERNANCE_D9 && isDisposableLocalRuntime(env)) {
    return { decisionId: "D9", state: "aprovado_para_piloto", source: "teste_sintetico" };
  }
  return { decisionId: "D9", state: governanceStateOf("D9"), source: "registro_canonico" };
}

export function isConclusiveAllowed(gate: GovernanceGate): boolean {
  return isApprovedState(gate.state);
}

/** Autoridade metodológica configurada no servidor (lista de user ids). Vazia por padrão. */
export function resolveMethodAuthority(env: GovernanceGateEnv = process.env as GovernanceGateEnv): GovernanceAuthority {
  const ids = (env.VITALOS_IVO_METHOD_AUTHORITY_USER_IDS ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  return { configuredUserIds: ids };
}
