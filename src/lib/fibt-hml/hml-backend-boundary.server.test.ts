import { describe, expect, test } from "bun:test";
import { assertHmlBackendBoundary, type HmlBackendBoundaryEnv } from "./hml-backend-boundary.server";

const STAGING_REF = "xttjkpzhxtjfwxjsxuab";
// Ref sintético de produção — mesma convenção de staging-guard.test.ts
// (PROD_REF = "pppppppppppppppppppp"), nunca o ref real.
const PRODUCTION_REF = "pppppppppppppppppppp";
const AUTHORIZED_ORIGIN = "https://fibt-hml-01.lovable.app";

const VALID_ENV: HmlBackendBoundaryEnv = {
  VITE_FIBT_HML_ENABLED: "true",
  VITE_FIBT_HML_ENVIRONMENT: "staging",
  VITE_FIBT_HML_BATCH_ID: "FIBT-ISG-HML-01",
  FIBT_HML_AUTHORIZED_STAGING_REF: STAGING_REF,
  SUPABASE_URL: `https://${STAGING_REF}.supabase.co`,
  VITE_SUPABASE_URL: `https://${STAGING_REF}.supabase.co`,
  VITALOS_PRODUCTION_PROJECT_REF: PRODUCTION_REF,
  FIBT_HML_FRONTEND_BASE_URL: AUTHORIZED_ORIGIN,
  VITE_FIBT_HML_FRONTEND_BASE_URL: AUTHORIZED_ORIGIN,
};

describe("assertHmlBackendBoundary — fronteira backend×HML (Fase 14, itens 1-10)", () => {
  test("1. backend staging + frontend staging + ref autorizado + origem batendo = PASS (attested)", () => {
    const r = assertHmlBackendBoundary(VALID_ENV);
    expect(r).toEqual({
      hmlDeclared: true,
      attested: true,
      batchId: "FIBT-ISG-HML-01",
      serverProjectRefMasked: expect.any(String),
    });
  });

  test("2. backend de produção mesmo com banner HML declarado = BLOCKED (o P0 original)", () => {
    const r = assertHmlBackendBoundary({
      ...VALID_ENV,
      SUPABASE_URL: `https://${PRODUCTION_REF}.supabase.co`,
      VITE_SUPABASE_URL: `https://${PRODUCTION_REF}.supabase.co`,
      FIBT_HML_AUTHORIZED_STAGING_REF: PRODUCTION_REF,
    });
    expect(r).toEqual({ hmlDeclared: true, attested: false, code: "HML_PRODUCTION_TARGET_FORBIDDEN" });
  });

  test("3. backend staging real, mas VITE_SUPABASE_URL aponta para produção = BLOCKED (mismatch antes de forbidden)", () => {
    const r = assertHmlBackendBoundary({
      ...VALID_ENV,
      VITE_SUPABASE_URL: `https://${PRODUCTION_REF}.supabase.co`,
    });
    expect(r).toEqual({ hmlDeclared: true, attested: false, code: "HML_PROJECT_REF_MISMATCH" });
  });

  test("4. refs divergentes (dois stagings diferentes) = BLOCKED", () => {
    const r = assertHmlBackendBoundary({
      ...VALID_ENV,
      VITE_SUPABASE_URL: "https://outrostagingref00000.supabase.co",
    });
    expect(r).toEqual({ hmlDeclared: true, attested: false, code: "HML_PROJECT_REF_MISMATCH" });
  });

  test("5. ref não autorizado (staging real, mas não o declarado) = BLOCKED", () => {
    const r = assertHmlBackendBoundary({ ...VALID_ENV, FIBT_HML_AUTHORIZED_STAGING_REF: "outrorefautorizado00" });
    expect(r).toEqual({ hmlDeclared: true, attested: false, code: "HML_PROJECT_REF_NOT_AUTHORIZED" });
  });

  test("6. ref autorizado ausente = BLOCKED (nunca 'não se aplica')", () => {
    const r = assertHmlBackendBoundary({ ...VALID_ENV, FIBT_HML_AUTHORIZED_STAGING_REF: undefined });
    expect(r).toEqual({ hmlDeclared: true, attested: false, code: "HML_PROJECT_REF_NOT_AUTHORIZED" });
  });

  test("7. batch_id diferente = BLOCKED", () => {
    const r = assertHmlBackendBoundary({ ...VALID_ENV, VITE_FIBT_HML_BATCH_ID: "OUTRO-BATCH" });
    expect(r).toEqual({ hmlDeclared: true, attested: false, code: "HML_BATCH_ID_INVALID" });
  });

  test("8. environment diferente de staging = BLOCKED", () => {
    const r = assertHmlBackendBoundary({ ...VALID_ENV, VITE_FIBT_HML_ENVIRONMENT: "production" });
    expect(r).toEqual({ hmlDeclared: true, attested: false, code: "HML_ENVIRONMENT_INVALID" });
  });

  test("9. HTTPS ausente na origem de frontend = BLOCKED", () => {
    const r = assertHmlBackendBoundary({
      ...VALID_ENV,
      FIBT_HML_FRONTEND_BASE_URL: "http://fibt-hml-01.lovable.app",
      VITE_FIBT_HML_FRONTEND_BASE_URL: "http://fibt-hml-01.lovable.app",
    });
    expect(r).toEqual({ hmlDeclared: true, attested: false, code: "HML_FRONTEND_ORIGIN_INVALID" });
  });

  test("10. fallback produtivo (SUPABASE_URL ausente, sem fallback) = BLOCKED, nunca assume staging por omissão", () => {
    const r = assertHmlBackendBoundary({ ...VALID_ENV, SUPABASE_URL: undefined });
    expect(r).toEqual({ hmlDeclared: true, attested: false, code: "HML_SERVER_PROJECT_REF_MISSING" });
  });
});

describe("assertHmlBackendBoundary — HML não declarado: fluxo normal intocado", () => {
  test("VITE_FIBT_HML_ENABLED ausente → hmlDeclared false, não é uma reprovação do boundary", () => {
    const r = assertHmlBackendBoundary({ ...VALID_ENV, VITE_FIBT_HML_ENABLED: undefined });
    expect(r).toEqual({ hmlDeclared: false, attested: false, code: "HML_NOT_ENABLED" });
  });

  test("valores 'quase verdadeiros' não ativam", () => {
    for (const v of ["1", "yes", "TRUE"]) {
      const r = assertHmlBackendBoundary({ ...VALID_ENV, VITE_FIBT_HML_ENABLED: v });
      expect(r.hmlDeclared).toBe(false);
    }
  });
});

describe("assertHmlBackendBoundary — casos adicionais de fronteira de origem", () => {
  test("origem exposta ao cliente diverge da origem server-only declarada", () => {
    const r = assertHmlBackendBoundary({
      ...VALID_ENV,
      VITE_FIBT_HML_FRONTEND_BASE_URL: "https://outra-origem-hml.lovable.app",
    });
    expect(r).toEqual({ hmlDeclared: true, attested: false, code: "HML_FRONTEND_ORIGIN_INVALID" });
  });

  test("browser project ref irreconhecível = BLOCKED", () => {
    const r = assertHmlBackendBoundary({ ...VALID_ENV, VITE_SUPABASE_URL: "not-a-url" });
    expect(r).toEqual({ hmlDeclared: true, attested: false, code: "HML_BROWSER_PROJECT_REF_MISSING" });
  });

  test("ref autorizado declarado igual ao de produção = BLOCKED mesmo que SUPABASE_URL aponte para ele mesmo (consistente)", () => {
    const r = assertHmlBackendBoundary({
      ...VALID_ENV,
      FIBT_HML_AUTHORIZED_STAGING_REF: PRODUCTION_REF,
      SUPABASE_URL: `https://${PRODUCTION_REF}.supabase.co`,
      VITE_SUPABASE_URL: `https://${PRODUCTION_REF}.supabase.co`,
    });
    expect(r).toEqual({ hmlDeclared: true, attested: false, code: "HML_PRODUCTION_TARGET_FORBIDDEN" });
  });

  test("FORBIDDEN_PROJECT_REFS extra também bloqueia mesmo sem VITALOS_PRODUCTION_PROJECT_REF", () => {
    const r = assertHmlBackendBoundary({
      ...VALID_ENV,
      VITALOS_PRODUCTION_PROJECT_REF: undefined,
      FORBIDDEN_PROJECT_REFS: STAGING_REF,
    });
    expect(r).toEqual({ hmlDeclared: true, attested: false, code: "HML_PRODUCTION_TARGET_FORBIDDEN" });
  });
});
