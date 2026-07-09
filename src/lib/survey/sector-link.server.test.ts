import { describe, expect, test, mock, beforeEach } from "bun:test";
import { createHash } from "node:crypto";
import type { IdentityBoundaryStatus } from "@/engine/identity/authorization-engine";

// Token demo real de src/mocks/sector-link-mock.ts (link ativo, dentro da janela).
const VALID_DEMO_TOKEN = "vL9k3mPqR7wXnAy2sZcBdEfGhJtUiOp";
// Token "real" do fake cloud — o banco só conhece o hash dele.
const CLOUD_TOKEN = "a".repeat(48);
const CLOUD_TOKEN_HASH = createHash("sha256").update(CLOUD_TOKEN).digest("hex");

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

const { captureSectorLinkResponse, resolveToken, hashSectorToken } = await import(
  "./sector-link.server"
);

function setBoundary(state: "demo" | "cloud" | "blocked") {
  mockBoundary.mockImplementation(() => ({
    requestedMode: state === "demo" ? "demo" : "cloud",
    state,
    realAuthentication: state === "cloud",
    serverEnforced: state !== "demo",
    reason:
      state === "demo" ? "demo_isolated" : state === "cloud" ? "cloud_ready" : "cloud_adapter_missing",
  }));
}

function activeCloudRow() {
  return {
    wave_id: "wave-real-1",
    sector_label: "Operações",
    access_mode: "shared_sector",
    status: "active",
    expires_at: "2099-01-01T00:00:00.000Z",
    waves: {
      instrument: "COPSOQ",
      status: "collecting",
      label: "T3-2026 Riscos Psicossociais",
      created_at: "2026-07-01T00:00:00.000Z",
      closes_at: "2026-09-30T00:00:00.000Z",
      organizations: { pack_id: null },
    },
  };
}

// Respostas válidas derivadas do survey REAL (copsoq-demo, 41 itens) —
// nunca ids inventados; se o catálogo mudar, o teste acompanha.
const { getWaveSurvey } = await import("@/mocks/survey-mock");
const COPSOQ_SURVEY = getWaveSurvey("enterprise", "COPSOQ")!;

function validAnswers() {
  return COPSOQ_SURVEY.items.map((item) => ({ itemId: item.id, value: 3 }));
}

beforeEach(() => {
  setBoundary("demo");
  cloudLinkRow = activeCloudRow();
  rpcOutcome = { accepted: true, reason: null, response_count: 6 };
  rpcCalls.length = 0;
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

    const ok = await captureSectorLinkResponse({
      token: VALID_DEMO_TOKEN,
      answers: validAnswers(),
      consentVersion: "2026.1",
    });
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
    // O token bruto NUNCA viaja para o banco.
    expect(JSON.stringify(rpcCalls[0]!.args)).not.toContain(CLOUD_TOKEN);
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
    let r = await captureSectorLinkResponse({ token: CLOUD_TOKEN, answers: validAnswers(), consentVersion: "1" });
    expect(r.accepted).toBe(false);

    cloudLinkRow = { ...activeCloudRow(), status: "revoked" };
    r = await captureSectorLinkResponse({ token: CLOUD_TOKEN, answers: validAnswers(), consentVersion: "1" });
    expect(r.accepted).toBe(false);

    cloudLinkRow = { ...activeCloudRow(), expires_at: "2020-01-01T00:00:00.000Z" };
    r = await captureSectorLinkResponse({ token: CLOUD_TOKEN, answers: validAnswers(), consentVersion: "1" });
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
    const result = await resolveToken(VALID_DEMO_TOKEN);
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.sectorLabel).toBe("Operações");
  });
});

describe("hashSectorToken — determinístico e unidirecional", () => {
  test("mesmo token → mesmo hash; tokens diferentes → hashes diferentes", () => {
    expect(hashSectorToken("abc")).toBe(hashSectorToken("abc"));
    expect(hashSectorToken("abc")).not.toBe(hashSectorToken("abd"));
    expect(hashSectorToken(CLOUD_TOKEN)).toBe(CLOUD_TOKEN_HASH);
  });
});
