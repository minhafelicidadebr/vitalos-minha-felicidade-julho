import {
  assertHmlBackendBoundary,
  type HmlBackendBoundaryEnv,
  type HmlBackendBoundaryResult,
} from "@/lib/fibt-hml/hml-backend-boundary.server";
import type { HmlAccessIdentityLike } from "@/lib/fibt-hml/hml-deployment-boundary.server";
import { requireOrgAdmin, type MembershipResult } from "@/lib/auth/authorize.server";
import type { FibtManagerServiceDeps } from "./fibt-manager-control-center.server";

interface ManagerRequestContext {
  hmlAccessIdentity?: HmlAccessIdentityLike;
}

export interface FibtManagerAccessDeps extends FibtManagerServiceDeps {
  boundary?: (env: HmlBackendBoundaryEnv) => HmlBackendBoundaryResult;
  requireAdmin?: (accessToken: string) => Promise<MembershipResult>;
}

export type FibtManagerAccessOutcome =
  | {
      ok: true;
      orgId: string;
      waveId: string;
      mode: "hml_access";
      hmlAttested: true;
    }
  | {
      ok: true;
      orgId: string;
      waveId: string;
      mode: "supabase_admin";
      hmlAttested: false;
    }
  | {
      ok: false;
      category: "authorization" | "hml_boundary" | "validation";
      error: string;
    };

function verifiedHmlIdentity(context: unknown): boolean {
  if (!context || typeof context !== "object") return false;
  const identity = (context as ManagerRequestContext).hmlAccessIdentity;
  return (
    !!identity &&
    typeof identity.email === "string" &&
    identity.email.trim().length > 0 &&
    typeof identity.subject === "string" &&
    identity.subject.trim().length > 0
  );
}

/**
 * A identidade Access é usada apenas como prova booleana de autenticação.
 * Seus identificadores nunca entram no retorno, telemetria ou snapshot.
 */
export async function authorizeFibtManagerRequest(
  input: { accessToken?: string; waveId?: string },
  context: unknown,
  env: HmlBackendBoundaryEnv,
  deps: FibtManagerAccessDeps = {},
): Promise<FibtManagerAccessOutcome> {
  const boundary = (deps.boundary ?? assertHmlBackendBoundary)(env);

  if (boundary.hmlDeclared) {
    if (!boundary.attested || !verifiedHmlIdentity(context)) {
      return {
        ok: false,
        category: "hml_boundary",
        error: "A sessão HML não está atestada para esta operação.",
      };
    }

    const { resolveCanonicalHmlManagerWave } = await import("./fibt-manager-control-center.server");
    const wave = await resolveCanonicalHmlManagerWave(deps);
    if (!wave || (input.waveId && input.waveId !== wave.id)) {
      return {
        ok: false,
        category: "validation",
        error: "A campanha solicitada não corresponde ao lote sintético autorizado.",
      };
    }
    return {
      ok: true,
      orgId: wave.orgId,
      waveId: wave.id,
      mode: "hml_access",
      hmlAttested: true,
    };
  }

  if (!input.accessToken || !input.waveId) {
    return {
      ok: false,
      category: "authorization",
      error: "Sessao administrativa e onda sao obrigatorias.",
    };
  }

  const auth = await (deps.requireAdmin ?? requireOrgAdmin)(input.accessToken);
  if (!auth.ok) {
    return {
      ok: false,
      category: "authorization",
      error: "A sessão não possui autorização administrativa para esta operação.",
    };
  }

  return {
    ok: true,
    orgId: auth.membership.orgId,
    waveId: input.waveId,
    mode: "supabase_admin",
    hmlAttested: false,
  };
}
