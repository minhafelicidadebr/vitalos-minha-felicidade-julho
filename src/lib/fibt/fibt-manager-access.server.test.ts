import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { authorizeFibtManagerRequest } from "./fibt-manager-access.server";
import type { MembershipResult } from "@/lib/auth/authorize.server";
import type { FibtManagerStore } from "./fibt-manager-control-center.server";

const HML_WAVE = {
  id: "wave-hml",
  orgId: "org-hml",
  organizationName: "ISG Sintetica",
  label: "Onda sintetica",
  instrument: "FIB_T",
  instrumentVersion: "1.0.0",
  status: "collecting",
  createdAt: "2026-08-01T00:00:00.000Z",
  closesAt: null,
};

const hmlStore = {
  findCanonicalHmlWave: async () => HML_WAVE,
} as unknown as FibtManagerStore;

describe("FIB-T manager request authorization", () => {
  test("requires a verified Access identity in an attested HML deployment", async () => {
    const denied = await authorizeFibtManagerRequest(
      {},
      {},
      {},
      {
        store: hmlStore,
        boundary: () => ({
          hmlDeclared: true,
          attested: true,
          batchId: "batch",
          serverProjectRefMasked: "masked",
        }),
      },
    );
    expect(denied).toMatchObject({ ok: false, category: "hml_boundary" });
  });

  test("rejects an empty Access identity", async () => {
    const denied = await authorizeFibtManagerRequest(
      {},
      { hmlAccessIdentity: { email: " ", subject: "" } },
      {},
      {
        store: hmlStore,
        boundary: () => ({
          hmlDeclared: true,
          attested: true,
          batchId: "batch",
          serverProjectRefMasked: "masked",
        }),
      },
    );
    expect(denied).toMatchObject({ ok: false, category: "hml_boundary" });
  });

  test("resolves only the canonical HML campaign and never returns identity", async () => {
    const granted = await authorizeFibtManagerRequest(
      {},
      { hmlAccessIdentity: { email: "not-returned@example.test", subject: "not-returned" } },
      {},
      {
        store: hmlStore,
        boundary: () => ({
          hmlDeclared: true,
          attested: true,
          batchId: "batch",
          serverProjectRefMasked: "masked",
        }),
      },
    );
    expect(granted).toEqual({
      ok: true,
      orgId: "org-hml",
      waveId: "wave-hml",
      mode: "hml_access",
      hmlAttested: true,
    });
    expect(JSON.stringify(granted)).not.toContain("example.test");
  });

  test("rejects a caller-selected wave in HML", async () => {
    const denied = await authorizeFibtManagerRequest(
      { waveId: "other-wave" },
      { hmlAccessIdentity: { email: "tester@example.test", subject: "subject" } },
      {},
      {
        store: hmlStore,
        boundary: () => ({
          hmlDeclared: true,
          attested: true,
          batchId: "batch",
          serverProjectRefMasked: "masked",
        }),
      },
    );
    expect(denied).toMatchObject({ ok: false, category: "validation" });
  });

  test("requires Supabase admin authorization outside HML", async () => {
    const denied = await authorizeFibtManagerRequest(
      { accessToken: "valid-looking-token", waveId: "wave-a" },
      {},
      {},
      {
        boundary: () => ({ hmlDeclared: false, attested: false, code: "HML_NOT_ENABLED" }),
        requireAdmin: async () => ({ ok: false, reason: "not_admin" }),
      },
    );
    expect(denied).toMatchObject({ ok: false, category: "authorization" });
  });

  test("derives the organization from the authenticated admin, never input", async () => {
    const granted = await authorizeFibtManagerRequest(
      { accessToken: "valid-looking-token", waveId: "wave-a" },
      {},
      {},
      {
        boundary: () => ({ hmlDeclared: false, attested: false, code: "HML_NOT_ENABLED" }),
        requireAdmin: async () => ({
          ok: true,
          membership: { userId: "user-a", orgId: "org-from-session", role: "RH_ADMIN" },
        }),
      },
    );
    expect(granted).toMatchObject({
      ok: true,
      orgId: "org-from-session",
      waveId: "wave-a",
      mode: "supabase_admin",
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// D9 — sessão Supabase do usuário sintético habilitando o publicador canônico
// em HML, sem modo novo, sem service role e sem cruzar organização.
// ═══════════════════════════════════════════════════════════════════════════

const hmlBoundary = () =>
  ({
    hmlDeclared: true,
    attested: true,
    batchId: "batch",
    serverProjectRefMasked: "masked",
  }) as const;

const hmlIdentity = { hmlAccessIdentity: { email: "sintetico@example.test", subject: "sub" } };

/** Autoriza o pedido HML com a sessão descrita, contando as validações feitas. */
async function authorizeHml(
  input: { accessToken?: string; waveId?: string },
  requireAdmin?: (accessToken: string) => Promise<MembershipResult>,
) {
  const seen: string[] = [];
  const outcome = await authorizeFibtManagerRequest(input, hmlIdentity, {}, {
    store: hmlStore,
    boundary: hmlBoundary,
    requireAdmin: requireAdmin
      ? async (token) => {
        seen.push(token);
        return requireAdmin(token);
      }
      : undefined,
  });
  return { outcome, seen };
}

const admin = (orgId: string, role = "RH_ADMIN"): MembershipResult => ({
  ok: true,
  membership: { userId: "user-sintetico", orgId, role },
});

describe("publicação protegida em HML com sessão do usuário sintético", () => {
  test("token válido da MESMA organização da onda é liberado ao publicador", async () => {
    const { outcome, seen } = await authorizeHml(
      { accessToken: "sessao-do-usuario-sintetico" },
      async () => admin("org-hml"),
    );
    expect(outcome).toEqual({
      ok: true,
      orgId: "org-hml",
      waveId: "wave-hml",
      // Modo preservado: nenhum modo novo foi criado para este caminho.
      mode: "hml_access",
      hmlAttested: true,
      publisherAccessToken: "sessao-do-usuario-sintetico",
    });
    // A sessão passou pelo mecanismo `requireAdmin` já existente.
    expect(seen).toEqual(["sessao-do-usuario-sintetico"]);
  });

  test("token de OUTRA organização não é liberado, mesmo sendo admin válido", async () => {
    const { outcome } = await authorizeHml(
      { accessToken: "sessao-de-outra-org" },
      async () => admin("org-alheia"),
    );
    expect(outcome).toMatchObject({ ok: true, mode: "hml_access", orgId: "org-hml" });
    expect(outcome).not.toHaveProperty("publisherAccessToken");
    // O token alheio não pode sequer aparecer no retorno.
    expect(JSON.stringify(outcome)).not.toContain("sessao-de-outra-org");
  });

  test("token inválido não habilita publicação e mantém o painel protegido", async () => {
    for (const reason of ["invalid_session", "no_profile", "not_admin"] as const) {
      const { outcome } = await authorizeHml({ accessToken: "token-recusado" }, async () => ({
        ok: false,
        reason,
      }));
      expect(outcome).toMatchObject({ ok: true, mode: "hml_access", hmlAttested: true });
      expect(outcome).not.toHaveProperty("publisherAccessToken");
    }
  });

  test("ausência de token mantém o painel disponível e nada é validado nem publicado", async () => {
    const { outcome, seen } = await authorizeHml({}, async () => admin("org-hml"));
    expect(outcome).toMatchObject({ ok: true, mode: "hml_access", hmlAttested: true });
    expect(outcome).not.toHaveProperty("publisherAccessToken");
    expect(seen).toEqual([]);
  });

  test("falha da própria validação não derruba o painel nem libera publicação", async () => {
    const { outcome } = await authorizeHml({ accessToken: "token-que-explode" }, async () => {
      throw new Error("validação indisponível");
    });
    expect(outcome).toMatchObject({ ok: true, mode: "hml_access", hmlAttested: true });
    expect(outcome).not.toHaveProperty("publisherAccessToken");
    expect(JSON.stringify(outcome)).not.toContain("token-que-explode");
  });

  test("sessão válida não contorna a onda canônica nem a atestação HML", async () => {
    // Onda escolhida pelo chamador continua recusada, com ou sem sessão.
    const { outcome: waveDenied } = await authorizeHml(
      { accessToken: "sessao-do-usuario-sintetico", waveId: "outra-onda" },
      async () => admin("org-hml"),
    );
    expect(waveDenied).toMatchObject({ ok: false, category: "validation" });

    // Sem identidade Access verificada, a sessão Supabase não abre o caminho.
    const identityDenied = await authorizeFibtManagerRequest(
      { accessToken: "sessao-do-usuario-sintetico" },
      {},
      {},
      { store: hmlStore, boundary: hmlBoundary, requireAdmin: async () => admin("org-hml") },
    );
    expect(identityDenied).toMatchObject({ ok: false, category: "hml_boundary" });
  });

  test("o ramo HML repassa o token JÁ validado e não publica por service role", () => {
    const fonte = readFileSync(
      join(process.cwd(), "src", "lib", "api", "fibt-manager-control-center.functions.ts"),
      "utf8",
    );
    // Repasse no ramo HML, preservando atestação e contrato de coortes.
    expect(fonte.includes("publisherAccessToken: access.publisherAccessToken")).toBe(true);
    expect(fonte.includes("hmlAttested: true")).toBe(true);
    expect(fonte.includes("expectedCohortKeys: expectedHmlCohorts")).toBe(true);
    // Publicação segue exclusivamente pelo publicador canônico.
    expect(fonte.includes("advancePublication: advanceCohortPublication")).toBe(true);
    expect(fonte.includes("SUPABASE_SERVICE_ROLE_KEY")).toBe(false);
    expect(fonte.includes("supabaseAdmin")).toBe(false);
    // Nenhuma credencial literal embutida no caminho de publicação.
    expect(/eyJ[A-Za-z0-9_-]{10,}/.test(fonte)).toBe(false);
  });
});
