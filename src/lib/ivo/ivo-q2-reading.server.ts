// IVO R5 — leitura Q2 (FIB-T) autenticada, para a experiência IVO.
//
// Modelo de confiança (o mesmo de authorize.server.ts):
//   · a organização vem SEMPRE da sessão (requireOrgAdmin → profiles.org_id),
//     nunca do payload — esta função nem aceita orgId;
//   · `service_role` só é usado DEPOIS da validação da sessão, e toda consulta
//     é filtrada pela organização da sessão (findWave(orgId, waveId) antes de
//     qualquer leitura escopada por onda — ordem herdada do leitor FIB-T);
//   · leitura SOMENTE do estado já publicado: esta função nunca avança a
//     publicação protegida (nenhum `publisherAccessToken`, nenhum
//     `advancePublication`). Publicar continua sendo ato do centro de controle
//     FIB-T (/fibt-piloto), pelo mecanismo canônico;
//   · fora do deployment HML: se a fronteira HML estiver declarada, recusa.
//     A allowlist HML não é alterada.
//
// A projeção devolvida contém apenas o que o fluxo FIB-T atual já permite
// consultar: estado por setor, rótulo de contagem protegido, fatores e escore
// bruto PUBLICADOS. Sem links, sem telemetria, sem resposta individual.

import {
  assertHmlBackendBoundary,
  type HmlBackendBoundaryEnv,
  type HmlBackendBoundaryResult,
} from "@/lib/fibt-hml/hml-backend-boundary.server";
import { readIdentityBoundaryStatus } from "@/lib/identity/identity-boundary.server";
import { resolveIvoRuntimeProfile, type IvoRuntimeProfile } from "./ivo-runtime-profile.server";
import type { IdentityBoundaryStatus } from "@/engine/identity/authorization-engine";
import { requireOrgAdmin, resolveOrgMembership, type MembershipResult } from "@/lib/auth/authorize.server";
import { LEADER_ROLE } from "./leader-scope-policy";
import {
  loadFibtManagerControlCenterAsAdmin,
  type FibtManagerSnapshot,
  type FibtManagerStore,
} from "@/lib/fibt/fibt-manager-control-center.server";
import type { ManagerAnalytics } from "@/lib/fibt/fibt-manager-control-center";
import { toFibtLensReading } from "@/lib/fibt/fibt-lens-adapter";
import { cycleOfInstant, formatCycleKey } from "@/domain/ivo/cycle-key";
import { getFibtManifest } from "@/domain/instruments/fibt/fibt-instrument";
import { FIBT_RAW_SCORE_MAX, FIBT_SCALE_MAX, FIBT_SCALE_MIN } from "@/domain/instruments/fibt/fibt-instrument-types";
import type { IvoQ2Failure, IvoQ2Outcome, IvoQ2Sector, IvoQ2SectorGroup, IvoQ2View } from "./ivo-views";

export type { IvoQ2Failure, IvoQ2Outcome, IvoQ2Sector, IvoQ2SectorGroup, IvoQ2View } from "./ivo-views";

export interface IvoSessionDeps {
  moduleAccess?: (orgId: string) => Promise<{ ok: true } | { ok: false; error: string; reason?: string }>;
  profile?: () => IvoRuntimeProfile;
  env?: HmlBackendBoundaryEnv;
  boundary?: (env: HmlBackendBoundaryEnv) => HmlBackendBoundaryResult;
  identity?: () => IdentityBoundaryStatus;
  requireAdmin?: (accessToken: string) => Promise<MembershipResult>;
  /** Vínculo de qualquer membro (papel real do servidor). Só consultado quando o chamador admite liderança. */
  resolveMember?: (accessToken: string) => Promise<MembershipResult>;
}

/** Quem o endpoint admite além do administrador. Padrão: só administrador. */
export interface IvoSessionOptions {
  allowLeader?: boolean;
  /** Qualquer membro da organização (C2: devolutiva coletiva de projeção fechada). */
  allowMember?: boolean;
}

export interface IvoQ2Deps extends IvoSessionDeps {
  /** Repassados ao leitor FIB-T. `advancePublication` NÃO existe aqui de propósito. */
  store?: FibtManagerStore;
  now?: () => Date;
  pilotEnabled?: () => boolean;
  locateLatestWave?: (orgId: string) => Promise<{ id: string } | null>;
}

export type IvoSessionAuthorization =
  | { ok: true; userId: string; orgId: string; role: string }
  | IvoQ2Failure;

/**
 * Autoriza um pedido da experiência IVO. A ordem importa: fronteira HML e
 * backend antes de tocar a sessão; sessão antes de qualquer leitura.
 */
export async function authorizeIvoSession(
  accessToken: string | undefined,
  deps: IvoSessionDeps = {},
  options: IvoSessionOptions = {},
): Promise<IvoSessionAuthorization> {
  // Perfil IVO primeiro: configuração ausente/inconsistente recusa tudo antes
  // de qualquer I/O (nem a sessão é consultada).
  const profile = (deps.profile ?? resolveIvoRuntimeProfile)();
  if (profile.kind === "invalid") {
    return {
      ok: false,
      category: "unavailable",
      error: "A experiência IVO não está habilitada corretamente neste ambiente. Nada foi lido.",
    };
  }

  const boundary = (deps.boundary ?? assertHmlBackendBoundary)(
    deps.env ?? (process.env as HmlBackendBoundaryEnv),
  );
  if (boundary.hmlDeclared) {
    return {
      ok: false,
      category: "hml_boundary",
      error: "A experiência IVO não faz parte do deployment HML. Nada foi lido.",
    };
  }

  const identity = (deps.identity ?? readIdentityBoundaryStatus)();
  if (identity.state !== "cloud") {
    return {
      ok: false,
      category: "unavailable",
      error:
        "Não há backend autenticado configurado neste ambiente. A leitura organizacional não é exibida e nenhum dado de demonstração a substitui.",
    };
  }

  if (!accessToken) {
    return {
      ok: false,
      category: "unauthenticated",
      error: "Entre com a sua conta para ver a leitura da sua organização.",
    };
  }

  let auth: MembershipResult;
  try {
    auth = await (deps.requireAdmin ?? requireOrgAdmin)(accessToken);
    // Liderança (decisão Q2_LEADER_SCOPE_PROPOSAL): só onde o endpoint admite,
    // com papel lido do servidor. O escopo por ação é aplicado pelo chamador.
    if (!auth.ok && auth.reason === "not_admin" && (options.allowLeader || options.allowMember)) {
      const member = await (deps.resolveMember ?? resolveOrgMembership)(accessToken);
      if (member.ok && (options.allowMember || member.membership.role === LEADER_ROLE)) auth = member;
    }
  } catch {
    return { ok: false, category: "backend", error: "Não foi possível validar a sessão agora. Nada foi lido." };
  }
  if (!auth.ok) {
    if (auth.reason === "invalid_session") {
      return { ok: false, category: "unauthenticated", error: "Sessão inválida ou expirada. Entre novamente." };
    }
    if (auth.reason === "no_profile") {
      return { ok: false, category: "forbidden", error: "Esta conta não está vinculada a uma organização." };
    }
    // Membro da organização sem papel administrativo: a leitura segue negada,
    // mas a recusa aponta o caminho que o próprio papel já pode percorrer.
    return {
      ok: false,
      category: "forbidden",
      error: "A leitura FIB-T por setor é conduzida pelo RH da organização.",
      memberPath: {
        href: "/diario",
        label: "Abrir o Diário de Prática",
        description: "Ali você registra suas práticas e vê apenas sínteses coletivas de grupos com pelo menos 5 pessoas.",
      },
    };
  }
  // Perfil staging: a organização DA SESSÃO precisa estar na allowlist do
  // ambiente. A allowlist só restringe; nunca escolhe a organização.
  if (profile.kind === "staging" && !profile.authorizedOrgIds.has(auth.membership.orgId.toLowerCase())) {
    return {
      ok: false,
      category: "forbidden",
      error: "Esta organização não está habilitada para a experiência IVO neste ambiente.",
    };
  }
  return { ok: true, userId: auth.membership.userId, orgId: auth.membership.orgId, role: auth.membership.role };
}

function groupOf(analytics: ManagerAnalytics, waveCollecting: boolean): IvoQ2SectorGroup {
  switch (analytics.state) {
    case "available":
      return "available";
    case "insufficient_participants":
    case "complementary_suppression":
    case "withheld_on_close":
      return "suppressed";
    case "awaiting_batched_release":
    case "awaiting_item_coverage":
      return "pending_publication";
    case "no_data":
      return waveCollecting ? "collecting" : "no_data";
    default:
      return "unavailable";
  }
}

/** Projeção mínima do snapshot protegido — pura, testável. */
export function projectIvoQ2View(
  snapshot: FibtManagerSnapshot,
  organizationId: string,
  generatedAt: Date,
): IvoQ2View {
  const manifest = getFibtManifest();
  const cycleKey = formatCycleKey(cycleOfInstant(snapshot.campaign.createdAt));
  const waveCollecting = snapshot.campaign.status === "collecting";

  const sectors: IvoQ2Sector[] = snapshot.sectors.map((sector) => {
    const a = sector.analytics;
    const available = a.state === "available" ? a : null;
    return {
      cohortId: sector.id,
      key: sector.key,
      label: sector.label,
      group: groupOf(a, waveCollecting),
      nativeState: a.state,
      countLabel: a.countLabel,
      message: a.state === "available" ? null : a.message,
      publishedAt: available ? available.publishedAt : null,
      factors: available
        ? available.result.factors.map((f) => ({ id: f.id, name: f.name, mean: f.mean }))
        : null,
      rawScore: available ? available.result.escoreBruto : null,
    };
  });

  const reading = toFibtLensReading(snapshot, {
    organizationId,
    cycleKey,
    generatedAt: generatedAt.toISOString(),
  });

  const overall: IvoQ2View["overall"] = sectors.some((s) => s.group === "available")
    ? "available"
    : sectors.some((s) => s.group === "suppressed" || s.group === "pending_publication")
      ? "protected"
      : waveCollecting
        ? "collecting"
        : "no_data";

  return {
    organizationName: snapshot.campaign.organizationName,
    cycleKey,
    wave: {
      id: snapshot.campaign.waveId,
      label: snapshot.campaign.label,
      status: snapshot.campaign.status,
      createdAt: snapshot.campaign.createdAt,
      closesAt: snapshot.campaign.closesAt,
    },
    methodology: {
      instrumentId: manifest.instrument_id,
      instrumentName: manifest.name,
      waveInstrumentVersion: snapshot.campaign.instrumentVersion,
      manifestVersion: manifest.instrument_version,
      manifestStatus: manifest.status,
      calculationVersion: reading.calculationVersion,
      author: manifest.author,
      citation: manifest.citation_reference,
      kMin: snapshot.privacy.kMin,
      factorScale: { min: FIBT_SCALE_MIN, max: FIBT_SCALE_MAX },
      rawScoreMax: FIBT_RAW_SCORE_MAX,
    },
    overall,
    sectors,
    reading,
    privacy: { kMin: snapshot.privacy.kMin, individualResponsesExposed: false, waveLevelReading: "unavailable" },
  };
}

async function locateLatestFibtWave(orgId: string): Promise<{ id: string } | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = supabaseAdmin as any;
  const { data, error } = await admin
    .from("waves")
    .select("id")
    .eq("org_id", orgId)
    .eq("instrument", "FIB_T")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("IVO_Q2_WAVE_LOOKUP_FAILED");
  return data ? { id: String(data.id) } : null;
}

/**
 * Leitura Q2 de uma organização JÁ autorizada. Exportada para o ciclo de ação
 * (R6), que revalida no servidor que a fonte citada está publicada.
 */
export async function loadIvoQ2ForOrg(
  orgId: string,
  waveId: string | undefined,
  deps: IvoQ2Deps = {},
): Promise<IvoQ2Outcome> {
  try {
    const access = await (deps.moduleAccess ?? (async org => (await import("@/lib/identity/module-access.server")).checkInstrument(org, "FIB_T")))(orgId);
    if (!access.ok) return { ok: false, category: access.reason === "unavailable" ? "backend" : "module_disabled", error: access.error };
    let targetWave = waveId;
    if (!targetWave) {
      const latest = await (deps.locateLatestWave ?? locateLatestFibtWave)(orgId);
      if (!latest) return { ok: true, state: "no_wave" };
      targetWave = latest.id;
    }

    const outcome = await loadFibtManagerControlCenterAsAdmin(
      orgId,
      targetWave,
      { environment: "application", hmlAttested: false },
      // Sem advancePublication: leitura somente do já publicado.
      { store: deps.store, now: deps.now, pilotEnabled: deps.pilotEnabled, moduleAccess: deps.moduleAccess },
    );
    if (!outcome.ok) {
      if (outcome.category === "feature_gate") {
        return { ok: false, category: "unavailable", error: outcome.error };
      }
      return { ok: false, category: outcome.category, error: outcome.error };
    }

    const now = (deps.now ?? (() => new Date()))();
    return { ok: true, state: "ready", view: projectIvoQ2View(outcome.snapshot, orgId, now) };
  } catch {
    return {
      ok: false,
      category: "backend",
      error: "A leitura protegida não pôde ser carregada agora. Nenhum valor foi estimado.",
    };
  }
}

export async function loadIvoQ2ReadingForSession(
  input: { accessToken?: string; waveId?: string },
  deps: IvoQ2Deps = {},
): Promise<IvoQ2Outcome> {
  const auth = await authorizeIvoSession(input.accessToken, deps);
  if (!auth.ok) return auth;
  return loadIvoQ2ForOrg(auth.orgId, input.waveId, deps);
}
