import { describe, expect, test, mock, afterEach } from "bun:test";

// Fake supabaseAdmin — registra toda chamada para provar que fica intocada
// quando o backend HML não está atestado (FIBT-HML-2E, P0).
const selectCalls: unknown[] = [];
const rpcCalls: unknown[] = [];

const fakeAdmin = {
  from: (_table: string) => ({
    select: (_cols: string) => ({
      eq: (_c: string, _v: string) => ({
        eq: (_c2: string, _v2: string) => ({
          order: (_c3: string, _o: unknown) => ({
            limit: async (_n: number) => {
              selectCalls.push(true);
              return { data: [] };
            },
          }),
        }),
      }),
    }),
  }),
  rpc: async (name: string, args: unknown) => {
    rpcCalls.push({ name, args });
    return { data: [{ accepted: true }], error: null };
  },
};

mock.module("@/integrations/supabase/client.server", () => ({ supabaseAdmin: fakeAdmin }));

const { loadSurveyFunnel, recordFunnelSnapshot } = await import("./survey-telemetry.server");

const HML_ENV_KEYS = [
  "VITE_FIBT_HML_ENABLED",
  "VITE_FIBT_HML_ENVIRONMENT",
  "VITE_FIBT_HML_BATCH_ID",
  "FIBT_HML_AUTHORIZED_STAGING_REF",
  "SUPABASE_URL",
  "VITE_SUPABASE_URL",
  "VITALOS_PRODUCTION_PROJECT_REF",
  "FIBT_HML_FRONTEND_BASE_URL",
  "VITE_FIBT_HML_FRONTEND_BASE_URL",
] as const;
const originalHmlEnv: Record<string, string | undefined> = {};

function setHmlEnv(overrides: Partial<Record<(typeof HML_ENV_KEYS)[number], string>>) {
  for (const key of HML_ENV_KEYS) {
    originalHmlEnv[key] = process.env[key];
    const value = overrides[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

function restoreHmlEnv() {
  for (const key of HML_ENV_KEYS) {
    const original = originalHmlEnv[key];
    if (original === undefined) delete process.env[key];
    else process.env[key] = original;
  }
}

const STAGING_REF = "xttjkpzhxtjfwxjsxuab";
const HML_DECLARED_BUT_NOT_ATTESTED = { VITE_FIBT_HML_ENABLED: "true" };
const HML_FULLY_ATTESTED = {
  VITE_FIBT_HML_ENABLED: "true",
  VITE_FIBT_HML_ENVIRONMENT: "staging",
  VITE_FIBT_HML_BATCH_ID: "FIBT-ISG-HML-01",
  FIBT_HML_AUTHORIZED_STAGING_REF: STAGING_REF,
  SUPABASE_URL: `https://${STAGING_REF}.supabase.co`,
  VITE_SUPABASE_URL: `https://${STAGING_REF}.supabase.co`,
  VITALOS_PRODUCTION_PROJECT_REF: "pppppppppppppppppppp",
  FIBT_HML_FRONTEND_BASE_URL: "https://fibt-hml-01.lovable.app",
  VITE_FIBT_HML_FRONTEND_BASE_URL: "https://fibt-hml-01.lovable.app",
};

describe("FIBT-HML-2E (P0) — assertHmlBackendBoundary protege loadSurveyFunnel/recordFunnelSnapshot", () => {
  afterEach(() => {
    restoreHmlEnv();
    selectCalls.length = 0;
    rpcCalls.length = 0;
  });

  test("loadSurveyFunnel: backend HML declarado mas não atestado bloqueia antes de qualquer SELECT", async () => {
    setHmlEnv(HML_DECLARED_BUT_NOT_ATTESTED);
    const result = await loadSurveyFunnel("enterprise", "COPSOQ");
    expect(result).toEqual({ ok: false, totalSessions: 0, kAnonymityMin: 5 });
    expect(selectCalls).toHaveLength(0);
  });

  test("loadSurveyFunnel: HML não declarado (produção comum) não é afetado", async () => {
    setHmlEnv({});
    await loadSurveyFunnel("enterprise", "COPSOQ");
    expect(selectCalls).toHaveLength(1);
  });

  test("loadSurveyFunnel: backend HML totalmente atestado prossegue e consulta o banco", async () => {
    setHmlEnv(HML_FULLY_ATTESTED);
    await loadSurveyFunnel("enterprise", "COPSOQ");
    expect(selectCalls).toHaveLength(1);
  });

  test("recordFunnelSnapshot: backend HML declarado mas não atestado bloqueia antes de qualquer RPC", async () => {
    setHmlEnv(HML_DECLARED_BUT_NOT_ATTESTED);
    const result = await recordFunnelSnapshot({
      packId: "enterprise",
      instrument: "COPSOQ",
      totalItems: 10,
      completed: true,
      elapsedMs: 1000,
      itemTimingsMs: {},
    });
    expect(result).toEqual({ accepted: false, reason: "hml_backend_not_attested" });
    expect(rpcCalls).toHaveLength(0);
  });

  test("recordFunnelSnapshot: HML não declarado (produção comum) não é afetado", async () => {
    setHmlEnv({});
    const result = await recordFunnelSnapshot({
      packId: "enterprise",
      instrument: "COPSOQ",
      totalItems: 10,
      completed: true,
      elapsedMs: 1000,
      itemTimingsMs: {},
    });
    expect(result.accepted).toBe(true);
    expect(rpcCalls).toHaveLength(1);
  });

  test("recordFunnelSnapshot: backend HML totalmente atestado prossegue e grava via RPC", async () => {
    setHmlEnv(HML_FULLY_ATTESTED);
    const result = await recordFunnelSnapshot({
      packId: "enterprise",
      instrument: "COPSOQ",
      totalItems: 10,
      completed: true,
      elapsedMs: 1000,
      itemTimingsMs: {},
    });
    expect(result.accepted).toBe(true);
    expect(rpcCalls).toHaveLength(1);
  });
});
