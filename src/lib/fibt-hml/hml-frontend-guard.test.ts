import { describe, expect, test } from "bun:test";
import { resolveHmlMode, FORBIDDEN_HML_BASE_HOSTNAMES, type HmlEnvLike } from "./hml-frontend-guard";

const STAGING_REF = "xttjkpzhxtjfwxjsxuab";
// Ref sintético, não o real de produção — mesma convenção de
// staging-guard.test.ts (PROD_REF = "pppppppppppppppppppp").
const PRODUCTION_REF = "pppppppppppppppppppp";

const VALID_ENV: HmlEnvLike = {
  VITE_FIBT_HML_ENABLED: "true",
  VITE_FIBT_HML_ENVIRONMENT: "staging",
  VITE_FIBT_HML_PROJECT_REF: STAGING_REF,
  VITE_FIBT_HML_BATCH_ID: "FIBT-ISG-HML-01",
  VITE_SUPABASE_URL: `https://${STAGING_REF}.supabase.co`,
};

describe("resolveHmlMode — caminho feliz", () => {
  test("todas as condições corretas: ativo", () => {
    const r = resolveHmlMode(VALID_ENV);
    expect(r.active).toBe(true);
    if (r.active) {
      expect(r.batchId).toBe("FIBT-ISG-HML-01");
      expect(r.projectRefMasked).not.toBe(STAGING_REF); // sempre mascarado
    }
  });
});

describe("resolveHmlMode — fail-closed em cada condição isolada", () => {
  test("HML não habilitado → inativo", () => {
    const r = resolveHmlMode({ ...VALID_ENV, VITE_FIBT_HML_ENABLED: "false" });
    expect(r).toEqual({ active: false, reason: "HML_NOT_ENABLED" });
  });

  test("VITE_FIBT_HML_ENABLED ausente → inativo (não confunde ausência com true)", () => {
    const r = resolveHmlMode({ ...VALID_ENV, VITE_FIBT_HML_ENABLED: undefined });
    expect(r).toEqual({ active: false, reason: "HML_NOT_ENABLED" });
  });

  test("valores 'quase verdadeiros' (1, yes, on) NÃO ativam — só a string exata 'true'", () => {
    for (const v of ["1", "yes", "on", "TRUE", "True"]) {
      const r = resolveHmlMode({ ...VALID_ENV, VITE_FIBT_HML_ENABLED: v });
      expect(r.active).toBe(false);
    }
  });

  test("ambiente diferente de staging → inativo", () => {
    const r = resolveHmlMode({ ...VALID_ENV, VITE_FIBT_HML_ENVIRONMENT: "production" });
    expect(r).toEqual({ active: false, reason: "HML_ENVIRONMENT_NOT_STAGING" });
  });

  test("project ref declarado ausente → inativo", () => {
    const r = resolveHmlMode({ ...VALID_ENV, VITE_FIBT_HML_PROJECT_REF: undefined });
    expect(r).toEqual({ active: false, reason: "HML_PROJECT_REF_MISSING" });
  });

  test("VITE_SUPABASE_URL ausente/irreconhecível → inativo", () => {
    const r = resolveHmlMode({ ...VALID_ENV, VITE_SUPABASE_URL: undefined });
    expect(r).toEqual({ active: false, reason: "HML_PROJECT_REF_UNRESOLVABLE" });

    const r2 = resolveHmlMode({ ...VALID_ENV, VITE_SUPABASE_URL: "not-a-url" });
    expect(r2).toEqual({ active: false, reason: "HML_PROJECT_REF_UNRESOLVABLE" });
  });

  test("project ref declarado diverge do ref real (ex.: aponta para produção) → inativo", () => {
    const r = resolveHmlMode({
      ...VALID_ENV,
      VITE_SUPABASE_URL: `https://${PRODUCTION_REF}.supabase.co`,
    });
    expect(r).toEqual({ active: false, reason: "HML_PROJECT_REF_MISMATCH" });
  });

  test("batch id ausente → inativo", () => {
    const r = resolveHmlMode({ ...VALID_ENV, VITE_FIBT_HML_BATCH_ID: undefined });
    expect(r).toEqual({ active: false, reason: "HML_BATCH_ID_MISSING" });
  });
});

describe("resolveHmlMode — hostname de produção sempre recusado, mesmo com env correto", () => {
  test.each([...FORBIDDEN_HML_BASE_HOSTNAMES] as string[])("hostname %s é recusado", (host) => {
    const r = resolveHmlMode(VALID_ENV, host);
    expect(r).toEqual({ active: false, reason: "HML_HOSTNAME_FORBIDDEN" });
  });

  test("hostname de homologação (não produtivo) é aceito quando o resto está correto", () => {
    const r = resolveHmlMode(VALID_ENV, "fibt-hml-01.lovable.app");
    expect(r.active).toBe(true);
  });

  test("comparação de hostname é case-insensitive", () => {
    const r = resolveHmlMode(VALID_ENV, "APP.VITALOS.COM.BR");
    expect(r).toEqual({ active: false, reason: "HML_HOSTNAME_FORBIDDEN" });
  });

  test("hostname ausente (SSR) não bloqueia por si só — env continua sendo a fonte primária", () => {
    const r = resolveHmlMode(VALID_ENV, undefined);
    expect(r.active).toBe(true);
  });
});
