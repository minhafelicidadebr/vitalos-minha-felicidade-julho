import { describe, expect, test } from "bun:test";
import { buildHmlAttestationPayload } from "./api.fibt-hml.attestation";
import type { HmlBackendBoundaryEnv } from "@/lib/fibt-hml/hml-backend-boundary.server";

const STAGING_REF = "xttjkpzhxtjfwxjsxuab";
const AUTHORIZED_ORIGIN = "https://fibt-hml-01.lovable.app";

const VALID_ENV: HmlBackendBoundaryEnv = {
  VITE_FIBT_HML_ENABLED: "true",
  VITE_FIBT_HML_ENVIRONMENT: "staging",
  VITE_FIBT_HML_BATCH_ID: "FIBT-ISG-HML-01",
  FIBT_HML_AUTHORIZED_STAGING_REF: STAGING_REF,
  SUPABASE_URL: `https://${STAGING_REF}.supabase.co`,
  VITE_SUPABASE_URL: `https://${STAGING_REF}.supabase.co`,
  VITALOS_PRODUCTION_PROJECT_REF: "pppppppppppppppppppp",
  FIBT_HML_FRONTEND_BASE_URL: AUTHORIZED_ORIGIN,
  VITE_FIBT_HML_FRONTEND_BASE_URL: AUTHORIZED_ORIGIN,
};

describe("buildHmlAttestationPayload — endpoint /api/fibt-hml/attestation (Fase 14, itens 27-28)", () => {
  test("27. boundary atestado → READY, 200, payload sem ref/URL/segredo", () => {
    const r = buildHmlAttestationPayload(VALID_ENV);
    expect(r.httpStatus).toBe(200);
    expect(r.body).toEqual({
      status: "READY",
      contract_version: "FIBT-HML-1",
      environment: "staging",
      batch_id: "FIBT-ISG-HML-01",
      backend_attested: true,
      frontend_origin_attested: true,
    });
    expect(JSON.stringify(r.body)).not.toContain(STAGING_REF);
    expect(JSON.stringify(r.body)).not.toContain("supabase.co");
  });

  test("28. HML não declarado → BLOCKED, 503, código HML_NOT_ENABLED", () => {
    const r = buildHmlAttestationPayload({ ...VALID_ENV, VITE_FIBT_HML_ENABLED: undefined });
    expect(r).toEqual({ httpStatus: 503, body: { status: "BLOCKED", failure_code: "HML_NOT_ENABLED" } });
  });

  test("boundary declarado mas não atestado (backend produtivo) → BLOCKED, 503, código específico", () => {
    const r = buildHmlAttestationPayload({
      ...VALID_ENV,
      SUPABASE_URL: "https://pppppppppppppppppppp.supabase.co",
      VITE_SUPABASE_URL: "https://pppppppppppppppppppp.supabase.co",
      FIBT_HML_AUTHORIZED_STAGING_REF: "pppppppppppppppppppp",
    });
    expect(r).toEqual({
      httpStatus: 503,
      body: { status: "BLOCKED", failure_code: "HML_PRODUCTION_TARGET_FORBIDDEN" },
    });
  });

  test("payload BLOCKED nunca contém ref mascarado nem qualquer fragmento de URL", () => {
    const r = buildHmlAttestationPayload({ ...VALID_ENV, VITE_FIBT_HML_ENVIRONMENT: "production" });
    const serialized = JSON.stringify(r.body);
    expect(serialized).not.toContain("supabase");
    expect(serialized).not.toContain(STAGING_REF);
  });

  test("FIBT-HML-1F: âncora produtiva ausente → BLOCKED, 503, código específico (P0 corrigido)", () => {
    const r = buildHmlAttestationPayload({ ...VALID_ENV, VITALOS_PRODUCTION_PROJECT_REF: undefined });
    expect(r).toEqual({
      httpStatus: 503,
      body: { status: "BLOCKED", failure_code: "HML_PRODUCTION_PROJECT_REF_MISSING" },
    });
  });
});
