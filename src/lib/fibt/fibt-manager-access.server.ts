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
    /**
     * Presente SOMENTE quando o chamador apresentou uma sessão Supabase que
     * `requireAdmin` validou E cuja organização é a MESMA da onda canônica
     * HML. É a identidade organizacional que a RPC canônica exige em
     * `auth.uid()`. Ausente (e, portanto, painel somente-leitura sobre o já
     * publicado) quando não há token, quando o token é inválido, ou quando a
     * sessão pertence a outra organização.
     */
    publisherAccessToken?: string;
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
    // Sessão Supabase OPCIONAL, empilhada sobre a identidade Access já
    // verificada acima. Quando o usuário sintético da organização HML entra
    // pelo login interativo (`/entrar`), a sessão DELE — e somente ela — pode
    // habilitar o publicador canônico, que exige `auth.uid()` de um membro da
    // organização da onda. Nenhum modo novo, nenhum `service_role`: o token é
    // repassado ao mesmo publicador do fluxo `supabase_admin`.
    //
    // Fail-closed em quatro frentes: token ausente, token que `requireAdmin`
    // recusa, token de OUTRA organização (o cruzamento `membership.orgId ===
    // wave.orgId` é o que impede um admin legítimo de uma org alheia de
    // disparar publicação na onda HML) e FALHA da própria validação — rede
    // fora, projeto indisponível, qualquer rejeição inesperada. Em todos esses
    // casos o painel segue disponível no mesmo modo protegido, sem chamar a RPC.
    //
    // O `catch` é deliberadamente silencioso e não registra nada: o token não
    // pode aparecer em log nem em telemetria, e a única decisão que importa
    // aqui é NÃO liberar o publicador.
    let publisherAccessToken: string | undefined;
    if (input.accessToken) {
      try {
        const session = await (deps.requireAdmin ?? requireOrgAdmin)(input.accessToken);
        if (session.ok && session.membership.orgId === wave.orgId) {
          publisherAccessToken = input.accessToken;
        }
      } catch {
        publisherAccessToken = undefined;
      }
    }

    return {
      ok: true,
      orgId: wave.orgId,
      waveId: wave.id,
      mode: "hml_access",
      hmlAttested: true,
      // Chave omitida (não `undefined` explícito) quando não houve liberação:
      // o publicador é acionado por presença.
      ...(publisherAccessToken ? { publisherAccessToken } : {}),
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
