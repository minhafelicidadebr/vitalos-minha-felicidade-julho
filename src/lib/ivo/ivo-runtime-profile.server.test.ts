import { describe, expect, test } from "bun:test";
import { resolveIvoRuntimeProfile, type IvoProfileEnv } from "./ivo-runtime-profile.server";
import { authorizeIvoSession } from "./ivo-q2-reading.server";
import { loadFibtActionLoop } from "./fibt-action-loop.server";
import { CAPABILITY_REGISTRY } from "@/lib/capabilities/registry";
import type { MembershipResult } from "@/lib/auth/authorize.server";

// Refs fictícios no formato Supabase (20 caracteres) — nenhum projeto real.
const STAGING = "stagingrefficticio01";
const PROD = "producaoreffictici02";
const ORG_ALFA = "d1000000-0000-4000-8000-000000000001";
const ORG_BETA = "d2000000-0000-4000-8000-000000000001";
const ORG_OUTRA = "d3000000-0000-4000-8000-000000000001";

const STAGING_ENV: IvoProfileEnv = {
  VITALOS_IVO_PROFILE: "staging",
  VITALOS_IVO_AUTHORIZED_PROJECT_REF: STAGING,
  VITALOS_IVO_AUTHORIZED_ORG_IDS: `${ORG_ALFA},${ORG_BETA}`,
  VITALOS_PRODUCTION_PROJECT_REF: PROD,
  SUPABASE_URL: `https://${STAGING}.supabase.co`,
  VITE_SUPABASE_URL: `https://${STAGING}.supabase.co`,
};

describe("perfil de runtime IVO", () => {
  test("ausente = default (comportamento atual)", () => {
    expect(resolveIvoRuntimeProfile({})).toEqual({ kind: "default" });
  });

  test("staging válido exige projeto explícito, produção distinta e allowlist", () => {
    const p = resolveIvoRuntimeProfile(STAGING_ENV);
    expect(p.kind).toBe("staging");
    if (p.kind === "staging") expect([...p.authorizedOrgIds]).toEqual([ORG_ALFA, ORG_BETA]);
  });

  test("qualquer ausência ou inconsistência recusa (fail-closed)", () => {
    const cases: Array<[Partial<IvoProfileEnv>, string]> = [
      [{ VITALOS_IVO_PROFILE: "Staging" }, "unknown_profile"],
      [{ VITALOS_IVO_PROFILE: "production" }, "unknown_profile"],
      [{ VITE_FIBT_HML_ENABLED: "true" }, "hml_declared"],
      [{ FIBT_HML_DEPLOYMENT_ENABLED: "true" }, "hml_declared"],
      [{ VITALOS_IVO_AUTHORIZED_PROJECT_REF: undefined }, "project_ref_missing"],
      [{ SUPABASE_URL: "http://127.0.0.1:55421" }, "project_ref_missing"],
      [{ VITE_SUPABASE_URL: `https://${PROD}.supabase.co` }, "project_ref_mismatch"],
      [{ SUPABASE_URL: `https://${PROD}.supabase.co`, VITE_SUPABASE_URL: `https://${PROD}.supabase.co` }, "project_ref_mismatch"],
      [{ VITALOS_PRODUCTION_PROJECT_REF: undefined }, "production_ref_missing"],
      [{ VITALOS_PRODUCTION_PROJECT_REF: STAGING }, "production_target"],
      [{ VITALOS_IVO_AUTHORIZED_ORG_IDS: undefined }, "org_allowlist_invalid"],
      [{ VITALOS_IVO_AUTHORIZED_ORG_IDS: "org-alfa" }, "org_allowlist_invalid"],
      [{ VITALOS_IVO_AUTHORIZED_ORG_IDS: " , " }, "org_allowlist_invalid"],
    ];
    for (const [override, reason] of cases) {
      expect(resolveIvoRuntimeProfile({ ...STAGING_ENV, ...override })).toEqual({ kind: "invalid", reason: reason as never });
    }
  });
});

const SESSIONS: Record<string, MembershipResult> = {
  alfa: { ok: true, membership: { userId: "u-alfa", orgId: ORG_ALFA, role: "RH_ADMIN" } },
  outra: { ok: true, membership: { userId: "u-outra", orgId: ORG_OUTRA, role: "RH_ADMIN" } },
};

function deps(env: IvoProfileEnv) {
  const seen: string[] = [];
  return {
    seen,
    moduleAccess: async () => ({ ok: true as const }),
    profile: () => resolveIvoRuntimeProfile(env),
    boundary: () => ({ hmlDeclared: false, attested: false, code: "HML_NOT_ENABLED" }) as const,
    identity: () => ({ requestedMode: "cloud", state: "cloud", realAuthentication: true, serverEnforced: true, reason: "cloud_ready" }) as const,
    requireAdmin: async (token: string) => {
      seen.push(token);
      return SESSIONS[token] ?? ({ ok: false, reason: "invalid_session" } as const);
    },
  };
}

describe("autorização IVO sob o perfil staging", () => {
  test("ambiente não autorizado recusa antes de consultar a sessão", async () => {
    const d = deps({ ...STAGING_ENV, VITALOS_IVO_AUTHORIZED_PROJECT_REF: PROD });
    expect(await authorizeIvoSession("alfa", d)).toMatchObject({ ok: false, category: "unavailable" });
    expect(d.seen).toEqual([]);
  });

  test("organização da sessão fora da allowlist é recusada; dentro passa", async () => {
    const d = deps(STAGING_ENV);
    expect(await authorizeIvoSession("outra", d)).toMatchObject({ ok: false, category: "forbidden" });
    expect(await authorizeIvoSession("alfa", d)).toMatchObject({ ok: true, orgId: ORG_ALFA });
  });

  test("sessão ausente e inválida continuam recusadas no perfil staging", async () => {
    const d = deps(STAGING_ENV);
    expect(await authorizeIvoSession(undefined, d)).toMatchObject({ ok: false, category: "unauthenticated" });
    expect(await authorizeIvoSession("token-desconhecido", d)).toMatchObject({ ok: false, category: "unauthenticated" });
  });

  test("ACTION_PLAN: perfil staging válido habilita só o ciclo IVO; registro global segue desligado", async () => {
    expect(CAPABILITY_REGISTRY.ACTION_PLAN.enabled).toBe(false);
    const ledger = {
      loadFibtLedger: async () => ({ plans: [], items: [], evidence: [], events: [], cohortLabels: {} }),
    } as never;
    const staging = await loadFibtActionLoop({ accessToken: "alfa" }, { ...deps(STAGING_ENV), ledger });
    expect(staging).toEqual({ ok: true, plans: [] });
    const semPerfil = await loadFibtActionLoop({ accessToken: "alfa" }, { ...deps({}), ledger });
    expect(semPerfil).toMatchObject({ ok: false, category: "unavailable" });
  });
});
