import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { createHash } from "node:crypto";
import type { IdentityBoundaryStatus } from "@/engine/identity/authorization-engine";
import { SECTOR_RESPONSE_CONSENT_VERSION } from "@/domain/survey/sector-response-consent";
import { HML_SECTOR_SMOKE } from "@/lib/fibt-hml/hml-contract";

// Token demo real de src/mocks/sector-link-mock.ts (link ativo, dentro da janela).
const VALID_DEMO_TOKEN = "vL9k3mPqR7wXnAy2sZcBdEfGhJtUiOp";
// Relógio fixo dentro da janela do link demo (criado 2026-06-23, expira em
// 99 dias = 2026-09-30). Sem isto o teste quebra quando o relógio real passa
// da janela — o comportamento sob teste é o caminho demo, não a data de hoje.
const DEMO_WINDOW_NOW = "2026-08-01T00:00:00.000Z";
// Token "real" do fake cloud — o banco só conhece o hash dele.
const CLOUD_TOKEN = "a".repeat(48);
const CLOUD_TOKEN_HASH = createHash("sha256").update(CLOUD_TOKEN).digest("hex");
const ORIGINAL_HML_DEPLOYMENT_DECLARATION = process.env.FIBT_HML_DEPLOYMENT_ENABLED;

const mockBoundary = mock<() => IdentityBoundaryStatus>(() => ({
  requestedMode: "demo",
  state: "demo",
  realAuthentication: false,
  serverEnforced: false,
  reason: "demo_isolated",
}));

mock.module("@/lib/identity/identity-boundary.server", () => ({
  readIdentityBoundaryStatus: mockBoundary,
}));

// ── Fake supabaseAdmin: sector_links por token_hash + RPC registrada ──────────
let cloudLinkRow: Record<string, unknown> | null = null;
let rpcOutcome: { accepted: boolean; reason: string | null; response_count: number } = {
  accepted: true,
  reason: null,
  response_count: 6,
};
const rpcCalls: Array<{ name: string; args: Record<string, unknown> }> = [];

const fakeAdmin = {
  rpc: async (name: string, args: Record<string, unknown>) => {
    rpcCalls.push({ name, args });
    return { data: [rpcOutcome], error: null };
  },
  from: (_table: string) => ({
    insert: async (_row: Record<string, unknown>) => ({ error: null }),
    select: (_cols: string) => ({
      eq: (_c: string, v: string) => ({
        maybeSingle: async () => ({
          data: v === CLOUD_TOKEN_HASH ? cloudLinkRow : null,
        }),
      }),
    }),
  }),
};

mock.module("@/integrations/supabase/client.server", () => ({ supabaseAdmin: fakeAdmin }));

const { captureSectorLinkResponse: capture, resolveToken: resolve, hashSectorToken } =
  await import("./sector-link.server");
// Habilitação/método são dependências explícitas nestes testes da captura legada.
const captureSectorLinkResponse = (input: Parameters<typeof capture>[0], now?: string) => capture(input, now, async () => true);
const resolveToken = (token: string, now?: string) => resolve(token, now, async () => true);

function setBoundary(state: "demo" | "cloud" | "blocked") {
  mockBoundary.mockImplementation(() => ({
    requestedMode: state === "demo" ? "demo" : "cloud",
    state,
    realAuthentication: state === "cloud",
    serverEnforced: state !== "demo",
    reason:
      state === "demo"
        ? "demo_isolated"
        : state === "cloud"
          ? "cloud_ready"
          : "cloud_adapter_missing",
  }));
}

function activeCloudRow() {
  return {
    org_id: "org-real-1",
    wave_id: "wave-real-1",
    sector_label: "Operações",
    access_mode: "shared_sector",
    status: "active",
    expires_at: "2099-01-01T00:00:00.000Z",
    waves: {
      org_id: "org-real-1",
      instrument: "COPSOQ",
      instrument_version: "1.0.0",
      status: "collecting",
      label: "T3-2026 Riscos Psicossociais",
      created_at: "2026-07-01T00:00:00.000Z",
      closes_at: "2026-09-30T00:00:00.000Z",
      organizations: { name: "Organização Real", pack_id: null },
    },
  };
}

function activeHmlSectorSmokeRow() {
  return {
    ...activeCloudRow(),
    org_id: "org-hml-sector-smoke",
    sector_label: HML_SECTOR_SMOKE.sectorLabels[0],
    waves: {
      ...activeCloudRow().waves,
      org_id: "org-hml-sector-smoke",
      instrument: HML_SECTOR_SMOKE.instrument,
      instrument_version: HML_SECTOR_SMOKE.instrumentVersion,
      label: HML_SECTOR_SMOKE.waveLabel,
      organizations: { name: HML_SECTOR_SMOKE.organizationName, pack_id: null },
    },
  };
}

// Respostas válidas derivadas do survey REAL (copsoq-demo, 41 itens) —
// nunca ids inventados; se o catálogo mudar, o teste acompanha.
const { getWaveSurvey } = await import("@/mocks/survey-mock");
const COPSOQ_SURVEY = getWaveSurvey("enterprise", "COPSOQ")!;
const FIBT_SURVEY = getWaveSurvey("enterprise", "FIB-T")!;

function validAnswers() {
  return COPSOQ_SURVEY.items.map((item) => ({ itemId: item.id, value: 3 }));
}

function validFibtAnswers() {
  return FIBT_SURVEY.items.map((item) => ({ itemId: item.id, value: 3 }));
}

beforeEach(() => {
  delete process.env.FIBT_HML_DEPLOYMENT_ENABLED;
  setBoundary("demo");
  cloudLinkRow = activeCloudRow();
  rpcOutcome = { accepted: true, reason: null, response_count: 6 };
  rpcCalls.length = 0;
});

afterEach(() => {
  if (ORIGINAL_HML_DEPLOYMENT_DECLARATION === undefined) {
    delete process.env.FIBT_HML_DEPLOYMENT_ENABLED;
  } else {
    process.env.FIBT_HML_DEPLOYMENT_ENABLED = ORIGINAL_HML_DEPLOYMENT_DECLARATION;
  }
});

describe("captureSectorLinkResponse — demo inalterado", () => {
  test("demo: valida e descarta (ephemeral_demo); token desconhecido → unknown_wave", async () => {
    const unknown = await captureSectorLinkResponse({
      token: "token-desconhecido",
      answers: [],
      consentVersion: "2026.1",
    });
    expect(unknown.accepted).toBe(false);
    if (!unknown.accepted) expect(unknown.reason).toBe("unknown_wave");

    const ok = await captureSectorLinkResponse(
      {
        token: VALID_DEMO_TOKEN,
        answers: validAnswers(),
        consentVersion: "2026.1",
      },
      DEMO_WINDOW_NOW,
    );
    expect(ok.accepted).toBe(true);
    if (ok.accepted) expect(ok.receipt.persistence).toBe("ephemeral_demo");
    expect(rpcCalls).toHaveLength(0); // demo nunca toca o banco
  });

  test("blocked: recusa explícita — nunca cai para o caminho demo por acidente", async () => {
    setBoundary("blocked");
    const result = await captureSectorLinkResponse({
      token: VALID_DEMO_TOKEN,
      answers: validAnswers(),
      consentVersion: "2026.1",
    });
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe("cloud_adapter_missing");
  });
});

describe("captureSectorLinkResponse — cloud REAL via RPC (fecha P0-01)", () => {
  test("link ativo + respostas válidas: persiste via RPC com o HASH, nunca o token bruto", async () => {
    setBoundary("cloud");
    const result = await captureSectorLinkResponse({
      token: CLOUD_TOKEN,
      answers: validAnswers(),
      consentVersion: "2026.1",
    });

    expect(result.accepted).toBe(true);
    if (result.accepted) expect(result.receipt.persistence).toBe("cloud_persisted");

    expect(rpcCalls).toHaveLength(1);
    expect(rpcCalls[0]!.name).toBe("submit_sector_response");
    expect(rpcCalls[0]!.args.p_token_hash).toBe(CLOUD_TOKEN_HASH);
    expect(rpcCalls[0]!.args.p_consent_version).toBe(SECTOR_RESPONSE_CONSENT_VERSION);
    expect(rpcCalls[0]!.args).not.toHaveProperty("p_invite_token");
    // O token bruto NUNCA viaja para o banco.
    expect(JSON.stringify(rpcCalls[0]!.args)).not.toContain(CLOUD_TOKEN);
  });

  test("consentimento ausente/inválido falha antes da RPC; versão válida é normalizada", async () => {
    setBoundary("cloud");

    for (const consentVersion of [undefined, "", "   ", "2025.9", "x".repeat(21)]) {
      const result = await captureSectorLinkResponse({
        token: CLOUD_TOKEN,
        answers: validAnswers(),
        consentVersion: consentVersion as unknown as string,
      });
      expect(result).toMatchObject({ accepted: false, reason: "invalid_submission" });
    }
    expect(rpcCalls).toHaveLength(0);

    const result = await captureSectorLinkResponse({
      token: CLOUD_TOKEN,
      answers: validAnswers(),
      consentVersion: `  ${SECTOR_RESPONSE_CONSENT_VERSION}  `,
    });
    expect(result.accepted).toBe(true);
    expect(rpcCalls).toHaveLength(1);
    expect(rpcCalls[0]!.args.p_consent_version).toBe(SECTOR_RESPONSE_CONSENT_VERSION);
  });

  test("item inventado é recusado ANTES da RPC — a mesma validação pura do demo (P0-07)", async () => {
    setBoundary("cloud");
    const result = await captureSectorLinkResponse({
      token: CLOUD_TOKEN,
      answers: [{ itemId: "item-inventado", value: 3 }],
      consentVersion: "2026.1",
    });
    expect(result.accepted).toBe(false);
    expect(rpcCalls).toHaveLength(0); // nada tocou o banco
  });

  test("link desconhecido/revogado/expirado → recusa, sem RPC", async () => {
    setBoundary("cloud");

    cloudLinkRow = null;
    let r = await captureSectorLinkResponse({
      token: CLOUD_TOKEN,
      answers: validAnswers(),
      consentVersion: "1",
    });
    expect(r.accepted).toBe(false);

    cloudLinkRow = { ...activeCloudRow(), status: "revoked" };
    r = await captureSectorLinkResponse({
      token: CLOUD_TOKEN,
      answers: validAnswers(),
      consentVersion: "1",
    });
    expect(r.accepted).toBe(false);

    cloudLinkRow = { ...activeCloudRow(), expires_at: "2020-01-01T00:00:00.000Z" };
    r = await captureSectorLinkResponse({
      token: CLOUD_TOKEN,
      answers: validAnswers(),
      consentVersion: "1",
    });
    expect(r.accepted).toBe(false);

    expect(rpcCalls).toHaveLength(0);
  });

  test("RPC recusa (ex.: onda selada entre resolução e envio) → recusa honesta, sem recibo", async () => {
    setBoundary("cloud");
    rpcOutcome = { accepted: false, reason: "wave_not_open", response_count: 0 };
    const result = await captureSectorLinkResponse({
      token: CLOUD_TOKEN,
      answers: validAnswers(),
      consentVersion: "2026.1",
    });
    expect(result.accepted).toBe(false);
  });
});

describe("resolveToken — cloud", () => {
  test("link ativo: grant sem NENHUM id interno (org, hash)", async () => {
    setBoundary("cloud");
    const result = await resolveToken(CLOUD_TOKEN);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.sectorLabel).toBe("Operações");
      expect(result.instrumentShort).toBe("COPSOQ");
      expect(result.accessMode).toBe("shared_sector");
      expect(JSON.stringify(result)).not.toContain(CLOUD_TOKEN_HASH);
      expect(JSON.stringify(result)).not.toContain("org_");
    }
  });

  test("revogado → revoked; expirado → expired; inexistente → not_found", async () => {
    setBoundary("cloud");

    cloudLinkRow = { ...activeCloudRow(), status: "revoked" };
    let r = await resolveToken(CLOUD_TOKEN);
    expect(r.valid ? null : r.reason).toBe("revoked");

    cloudLinkRow = { ...activeCloudRow(), expires_at: "2020-01-01T00:00:00.000Z" };
    r = await resolveToken(CLOUD_TOKEN);
    expect(r.valid ? null : r.reason).toBe("expired");

    cloudLinkRow = null;
    r = await resolveToken(CLOUD_TOKEN);
    expect(r.valid ? null : r.reason).toBe("not_found");
  });

  test("demo continua resolvendo o token mock", async () => {
    const result = await resolveToken(VALID_DEMO_TOKEN, DEMO_WINDOW_NOW);
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.sectorLabel).toBe("Operações");
  });
});

describe("HML sector smoke — vínculo server-side fail-closed", () => {
  test("o lote sintético canônico resolve e submete FIB-T com consentimento", async () => {
    process.env.FIBT_HML_DEPLOYMENT_ENABLED = "true";
    setBoundary("cloud");
    cloudLinkRow = activeHmlSectorSmokeRow();

    const resolution = await resolveToken(CLOUD_TOKEN);
    expect(resolution.valid).toBe(true);
    if (resolution.valid) {
      expect(resolution.instrumentShort).toBe("FIB-T");
      expect(resolution.sectorLabel).toBe("TESTE-ISG-A");
    }

    const submission = await captureSectorLinkResponse({
      token: CLOUD_TOKEN,
      answers: validFibtAnswers(),
      consentVersion: SECTOR_RESPONSE_CONSENT_VERSION,
    });
    expect(submission.accepted).toBe(true);
    expect(rpcCalls).toHaveLength(1);
  });

  test("qualquer divergência do lote é not_found/unknown_wave e nunca alcança a RPC", async () => {
    process.env.FIBT_HML_DEPLOYMENT_ENABLED = "true";
    setBoundary("cloud");
    const valid = activeHmlSectorSmokeRow();
    const invalidRows = [
      { ...valid, org_id: "outra-org" },
      { ...valid, waves: { ...valid.waves, org_id: "outra-org" } },
      {
        ...valid,
        waves: { ...valid.waves, organizations: { name: "Outra organização", pack_id: null } },
      },
      { ...valid, waves: { ...valid.waves, label: "Outra onda" } },
      { ...valid, waves: { ...valid.waves, instrument: "COPSOQ" } },
      { ...valid, waves: { ...valid.waves, instrument_version: "fibt-1.0.0" } },
      { ...valid, sector_label: "Operações" },
    ];

    for (const row of invalidRows) {
      cloudLinkRow = row;
      expect(await resolveToken(CLOUD_TOKEN)).toEqual({ valid: false, reason: "not_found" });
      expect(
        await captureSectorLinkResponse({
          token: CLOUD_TOKEN,
          answers: validFibtAnswers(),
          consentVersion: SECTOR_RESPONSE_CONSENT_VERSION,
        }),
      ).toMatchObject({ accepted: false, reason: "unknown_wave" });
    }
    expect(rpcCalls).toHaveLength(0);
  });

  test("declaração HML malformada também bloqueia antes da RPC", async () => {
    process.env.FIBT_HML_DEPLOYMENT_ENABLED = "false";
    setBoundary("cloud");
    cloudLinkRow = activeHmlSectorSmokeRow();

    expect(await resolveToken(CLOUD_TOKEN)).toEqual({ valid: false, reason: "not_found" });
    expect(
      await captureSectorLinkResponse({
        token: CLOUD_TOKEN,
        answers: validFibtAnswers(),
        consentVersion: SECTOR_RESPONSE_CONSENT_VERSION,
      }),
    ).toMatchObject({ accepted: false, reason: "unknown_wave" });
    expect(rpcCalls).toHaveLength(0);
  });
});

describe("hashSectorToken — determinístico e unidirecional", () => {
  test("mesmo token → mesmo hash; tokens diferentes → hashes diferentes", () => {
    expect(hashSectorToken("abc")).toBe(hashSectorToken("abc"));
    expect(hashSectorToken("abc")).not.toBe(hashSectorToken("abd"));
    expect(hashSectorToken(CLOUD_TOKEN)).toBe(CLOUD_TOKEN_HASH);
  });
});
