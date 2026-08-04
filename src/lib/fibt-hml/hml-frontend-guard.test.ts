import { describe, expect, test } from "bun:test";
import {
  resolveHmlMode,
  resolveHmlRouteDisplayState,
  FORBIDDEN_HML_BASE_HOSTNAMES,
  type HmlEnvLike,
  type HmlAttestationPayload,
} from "./hml-frontend-guard";

const STAGING_REF = "xttjkpzhxtjfwxjsxuab";
// Ref sintético, não o real de produção — mesma convenção de
// staging-guard.test.ts (PROD_REF = "pppppppppppppppppppp").
const PRODUCTION_REF = "pppppppppppppppppppp";
const AUTHORIZED_ORIGIN = "https://fibt-hml-01.lovable.app";

const VALID_ENV: HmlEnvLike = {
  VITE_FIBT_HML_ENABLED: "true",
  VITE_FIBT_HML_ENVIRONMENT: "staging",
  VITE_FIBT_HML_PROJECT_REF: STAGING_REF,
  VITE_FIBT_HML_BATCH_ID: "FIBT-ISG-HML-01",
  VITE_FIBT_HML_FRONTEND_BASE_URL: AUTHORIZED_ORIGIN,
  VITE_SUPABASE_URL: `https://${STAGING_REF}.supabase.co`,
};

const VALID_ATTESTATION: HmlAttestationPayload = {
  status: "READY",
  contract_version: "FIBT-HML-1",
  environment: "staging",
  batch_id: "FIBT-ISG-HML-01",
  backend_attested: true,
  frontend_origin_attested: true,
};

describe("resolveHmlMode — caminho feliz", () => {
  test("todas as condições corretas, incluindo atestação server-side: ativo", () => {
    const r = resolveHmlMode(VALID_ENV, AUTHORIZED_ORIGIN, VALID_ATTESTATION);
    expect(r.active).toBe(true);
    if (r.active) {
      expect(r.blocked).toBe(false);
      expect(r.batchId).toBe("FIBT-ISG-HML-01");
      expect(r.projectRefMasked).not.toBe(STAGING_REF); // sempre mascarado
    }
  });
});

describe("resolveHmlMode — fail-closed em cada condição isolada (HML declarado, mas bloqueado)", () => {
  test("ambiente diferente de staging → bloqueado", () => {
    const r = resolveHmlMode({ ...VALID_ENV, VITE_FIBT_HML_ENVIRONMENT: "production" }, AUTHORIZED_ORIGIN, VALID_ATTESTATION);
    expect(r).toEqual({ active: false, blocked: true, reason: "HML_ENVIRONMENT_NOT_STAGING" });
  });

  test("project ref declarado ausente → bloqueado", () => {
    const r = resolveHmlMode({ ...VALID_ENV, VITE_FIBT_HML_PROJECT_REF: undefined }, AUTHORIZED_ORIGIN, VALID_ATTESTATION);
    expect(r).toEqual({ active: false, blocked: true, reason: "HML_PROJECT_REF_MISSING" });
  });

  test("VITE_SUPABASE_URL ausente/irreconhecível → bloqueado", () => {
    const r = resolveHmlMode({ ...VALID_ENV, VITE_SUPABASE_URL: undefined }, AUTHORIZED_ORIGIN, VALID_ATTESTATION);
    expect(r).toEqual({ active: false, blocked: true, reason: "HML_PROJECT_REF_UNRESOLVABLE" });

    const r2 = resolveHmlMode({ ...VALID_ENV, VITE_SUPABASE_URL: "not-a-url" }, AUTHORIZED_ORIGIN, VALID_ATTESTATION);
    expect(r2).toEqual({ active: false, blocked: true, reason: "HML_PROJECT_REF_UNRESOLVABLE" });
  });

  test("project ref declarado diverge do ref real (ex.: aponta para produção) → bloqueado", () => {
    const r = resolveHmlMode(
      { ...VALID_ENV, VITE_SUPABASE_URL: `https://${PRODUCTION_REF}.supabase.co` },
      AUTHORIZED_ORIGIN,
      VALID_ATTESTATION,
    );
    expect(r).toEqual({ active: false, blocked: true, reason: "HML_PROJECT_REF_MISMATCH" });
  });

  test("batch id ausente → bloqueado", () => {
    const r = resolveHmlMode({ ...VALID_ENV, VITE_FIBT_HML_BATCH_ID: undefined }, AUTHORIZED_ORIGIN, VALID_ATTESTATION);
    expect(r).toEqual({ active: false, blocked: true, reason: "HML_BATCH_ID_MISSING" });
  });

  test("batch id presente mas diferente do canônico → bloqueado (não aceita qualquer valor não vazio)", () => {
    const r = resolveHmlMode({ ...VALID_ENV, VITE_FIBT_HML_BATCH_ID: "OUTRO-BATCH" }, AUTHORIZED_ORIGIN, VALID_ATTESTATION);
    expect(r).toEqual({ active: false, blocked: true, reason: "HML_BATCH_ID_MISMATCH" });
  });
});

describe("resolveHmlMode — HML não declarado: modo normal, nunca bloqueado", () => {
  test("HML não habilitado → inativo e NÃO bloqueado (produção normal segue)", () => {
    const r = resolveHmlMode({ ...VALID_ENV, VITE_FIBT_HML_ENABLED: "false" });
    expect(r).toEqual({ active: false, blocked: false, reason: "HML_NOT_ENABLED" });
  });

  test("VITE_FIBT_HML_ENABLED ausente → inativo e não bloqueado", () => {
    const r = resolveHmlMode({ ...VALID_ENV, VITE_FIBT_HML_ENABLED: undefined });
    expect(r).toEqual({ active: false, blocked: false, reason: "HML_NOT_ENABLED" });
  });

  test("valores 'quase verdadeiros' (1, yes, on) NÃO ativam — só a string exata 'true'", () => {
    for (const v of ["1", "yes", "on", "TRUE", "True"]) {
      const r = resolveHmlMode({ ...VALID_ENV, VITE_FIBT_HML_ENABLED: v });
      expect(r.active).toBe(false);
      expect(r.blocked).toBe(false);
    }
  });
});

describe("resolveHmlMode — hostname/origem de produção sempre recusados, mesmo com env e atestação corretos", () => {
  test.each([...FORBIDDEN_HML_BASE_HOSTNAMES] as string[])("hostname %s é recusado (bloqueado)", (host) => {
    const r = resolveHmlMode(VALID_ENV, `https://${host}`, VALID_ATTESTATION);
    expect(r).toEqual({ active: false, blocked: true, reason: "HML_HOSTNAME_FORBIDDEN" });
  });

  test("comparação de hostname é case-insensitive", () => {
    const r = resolveHmlMode(VALID_ENV, "https://APP.VITALOS.COM.BR", VALID_ATTESTATION);
    expect(r).toEqual({ active: false, blocked: true, reason: "HML_HOSTNAME_FORBIDDEN" });
  });

  test("origem ausente (SSR, antes da hidratação) → bloqueado, NUNCA ativo prematuramente", () => {
    const r = resolveHmlMode(VALID_ENV, undefined, VALID_ATTESTATION);
    expect(r).toEqual({ active: false, blocked: true, reason: "HML_FRONTEND_ORIGIN_INVALID" });
  });

  test("origem atual diverge da base URL autorizada → bloqueado", () => {
    const r = resolveHmlMode(VALID_ENV, "https://outra-origem-diferente.lovable.app", VALID_ATTESTATION);
    expect(r).toEqual({ active: false, blocked: true, reason: "HML_FRONTEND_ORIGIN_INVALID" });
  });

  test("sufixo-lookalike de produção como origem atual → bloqueado", () => {
    const r = resolveHmlMode(VALID_ENV, "https://vitalos.com.br.attacker-controlled.test", VALID_ATTESTATION);
    expect(r).toEqual({ active: false, blocked: true, reason: "HML_FRONTEND_ORIGIN_INVALID" });
  });

  test("HTTP puro como origem atual → bloqueado", () => {
    const r = resolveHmlMode(VALID_ENV, "http://fibt-hml-01.lovable.app", VALID_ATTESTATION);
    expect(r).toEqual({ active: false, blocked: true, reason: "HML_FRONTEND_ORIGIN_INVALID" });
  });
});

describe("resolveHmlMode — atestação server-side é obrigatória (fecha o P0 da FIBT-HML-1C)", () => {
  test("sem atestação (ainda não chegou) → bloqueado, nunca ativo só por causa das VITE_*", () => {
    const r = resolveHmlMode(VALID_ENV, AUTHORIZED_ORIGIN, undefined);
    expect(r).toEqual({ active: false, blocked: true, reason: "HML_BACKEND_ATTESTATION_MISSING" });
  });

  test("atestação BLOCKED → bloqueado", () => {
    const r = resolveHmlMode(VALID_ENV, AUTHORIZED_ORIGIN, { status: "BLOCKED", failure_code: "HML_PRODUCTION_TARGET_FORBIDDEN" });
    expect(r).toEqual({ active: false, blocked: true, reason: "HML_BACKEND_ATTESTATION_FAILED" });
  });

  test("atestação READY mas backend_attested false → bloqueado", () => {
    const r = resolveHmlMode(VALID_ENV, AUTHORIZED_ORIGIN, { ...VALID_ATTESTATION, backend_attested: false });
    expect(r).toEqual({ active: false, blocked: true, reason: "HML_BACKEND_ATTESTATION_FAILED" });
  });

  test("atestação READY mas frontend_origin_attested false → bloqueado", () => {
    const r = resolveHmlMode(VALID_ENV, AUTHORIZED_ORIGIN, { ...VALID_ATTESTATION, frontend_origin_attested: false });
    expect(r).toEqual({ active: false, blocked: true, reason: "HML_BACKEND_ATTESTATION_FAILED" });
  });

  test("atestação com contract_version divergente → bloqueado", () => {
    const r = resolveHmlMode(VALID_ENV, AUTHORIZED_ORIGIN, { ...VALID_ATTESTATION, contract_version: "OUTRA-VERSAO" });
    expect(r).toEqual({ active: false, blocked: true, reason: "HML_BACKEND_ATTESTATION_FAILED" });
  });

  test("atestação com batch_id divergente → bloqueado", () => {
    const r = resolveHmlMode(VALID_ENV, AUTHORIZED_ORIGIN, { ...VALID_ATTESTATION, batch_id: "OUTRO-BATCH" });
    expect(r).toEqual({ active: false, blocked: true, reason: "HML_BACKEND_ATTESTATION_FAILED" });
  });
});

describe("resolveHmlRouteDisplayState — decisão de estado visual (Fase 14, itens 13-14)", () => {
  test("13. HML bloqueado → kind HML_BLOCKED, com mensagem", () => {
    const r = resolveHmlRouteDisplayState({ active: false, blocked: true, reason: "HML_BACKEND_ATTESTATION_MISSING" });
    expect(r.kind).toBe("HML_BLOCKED");
    if (r.kind === "HML_BLOCKED") expect(r.message.length).toBeGreaterThan(0);
  });

  test("14. HML ativo e atestado → kind HML_ATTESTED, com batchId", () => {
    const r = resolveHmlRouteDisplayState({
      active: true,
      blocked: false,
      batchId: "FIBT-ISG-HML-01",
      projectRefMasked: "abcd...wxyz",
    });
    expect(r).toEqual({ kind: "HML_ATTESTED", batchId: "FIBT-ISG-HML-01" });
  });

  test("HML não declarado → kind NORMAL_MODE", () => {
    const r = resolveHmlRouteDisplayState({ active: false, blocked: false, reason: "HML_NOT_ENABLED" });
    expect(r).toEqual({ kind: "NORMAL_MODE" });
  });
});
