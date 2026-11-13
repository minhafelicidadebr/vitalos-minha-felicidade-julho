import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { acceptFirstAdmin, issueFirstAdmin, listFirstAdmin, revokeFirstAdmin, type FirstAdminDeps, type FirstAdminStore } from "./first-admin.server";
import { firstAdminSchemas } from "./first-admin-contract";

const org = "10000000-0000-4000-8000-000000000001";
const requestId = "20000000-0000-4000-8000-000000000001";
const token = "a".repeat(64);
const row = { id: "30000000-0000-4000-8000-000000000001", org_id: org, recipient_email: "recipient@synthetic.test", role: "RH_ADMIN" as const,
  token_hash: createHash("sha256").update(token).digest("hex"), request_id: requestId, issued_by: "platform-synthetic", expires_at: "2099-01-01T00:00:00Z", accepted_by: null, accepted_at: null, revoked_at: null };
function deps(overrides: Partial<FirstAdminStore> = {}): FirstAdminDeps {
  return {
    authority: async () => ({ authorized: true, userId: row.issued_by, email: "platform@synthetic.test" }),
    identity: async () => ({ id: "recipient-synthetic", email: row.recipient_email, verified: true }),
    store: {
      organization: async () => ({ data: { id: org, name: "Synthetic", slug: "synthetic" }, error: null }),
      organizations: async () => ({ data: [], error: null }), invites: async () => ({ data: [], error: null }),
      request: async () => ({ data: null, error: null }), token: async () => ({ data: row, error: null }),
      insert: async () => ({ data: row, error: null }), accept: async () => ({ data: { ...row, accepted_by: "recipient-synthetic", accepted_at: "2026-11-13T00:00:00Z" }, error: null }),
      revoke: async () => ({ data: { ...row, revoked_at: "2026-11-13T00:00:00Z" }, error: null }), ...overrides,
    },
  };
}
const input = { accessToken: "synthetic-session", organizationId: org, email: row.recipient_email, token, requestId };
describe("primeiro administrador empresarial", () => {
  test("schemas recusam identidade, papel e ator escolhidos pelo navegador", () => {
    expect(firstAdminSchemas.issue.safeParse({ ...input, role: "RH_ADMIN" }).success).toBe(false);
    expect(firstAdminSchemas.issue.safeParse({ ...input, issuedBy: "other" }).success).toBe(false);
    expect(firstAdminSchemas.accept.safeParse({ accessToken: input.accessToken, token, userId: "other" }).success).toBe(false);
    expect(firstAdminSchemas.accept.safeParse({ accessToken: input.accessToken, token, organizationId: org }).success).toBe(false);
  });
  test("sem autoridade: emissão/listagem/revogação não acessam a store", async () => {
    const d = deps(); let calls = 0;
    d.authority = async () => ({ authorized: false });
    d.store = new Proxy(d.store, { get() { calls++; throw new Error("store não autorizada"); } });
    for (const result of [await issueFirstAdmin(input, d), await listFirstAdmin(input.accessToken, d), await revokeFirstAdmin({ accessToken: input.accessToken, inviteId: row.id }, d)]) {
      expect(result).toMatchObject({ ok: false, reason: "forbidden" });
    }
    expect(calls).toBe(0);
  });
  test("emissão grava hash e identidade validada, sem persistir token ou sessão", async () => {
    let stored: unknown;
    const d = deps({ insert: async (value) => { stored = value; return { data: row, error: null }; } });
    const result = await issueFirstAdmin({ ...input, email: " RECIPIENT@synthetic.test " }, d);
    expect(result.ok).toBe(true);
    expect(stored).toEqual({ org_id: org, recipient_email: row.recipient_email, token_hash: row.token_hash, request_id: requestId, issued_by: row.issued_by });
    expect(JSON.stringify(stored)).not.toContain(input.accessToken);
    expect(JSON.stringify(result)).not.toContain(row.token_hash);
  });
  test("retry não reemite; mesmo pedido com conteúdo alterado conflita", async () => {
    let inserts = 0;
    const d = deps({ request: async () => ({ data: row, error: null }), insert: async () => { inserts++; throw new Error(); } });
    expect((await issueFirstAdmin(input, d)).ok).toBe(true);
    for (const delta of [{ email: "other@synthetic.test" }, { organizationId: requestId }, { token: "b".repeat(64) }]) {
      expect(await issueFirstAdmin({ ...input, ...delta }, d)).toMatchObject({ ok: false, reason: "request_conflict" });
    }
    expect(inserts).toBe(0);
  });
  test("conflito único concorrente relê o mesmo pedido sem duplicar", async () => {
    let calls = 0;
    const d = deps({ request: async () => ({ data: ++calls === 1 ? null : row, error: null }), insert: async () => ({ data: null, error: { code: "23505" } }) });
    expect((await issueFirstAdmin(input, d)).ok).toBe(true);
    expect(calls).toBe(2);
  });
  test("sessão ausente, identidade errada e e-mail não confirmado não aceitam", async () => {
    for (const [identity, reason] of [[null, "invalid_session"], [{ id: "other", email: "other@synthetic.test", verified: true }, "identity_mismatch"], [{ id: "recipient", email: row.recipient_email, verified: false }, "unverified_identity"]] as const) {
      let writes = 0; const d = deps({ accept: async () => { writes++; throw new Error(); } });
      d.identity = async () => identity;
      expect(await acceptFirstAdmin(input, true, d)).toMatchObject({ ok: false, reason });
      expect(writes).toBe(0);
    }
  });
  test("convites expirados/revogados não consultam organização nem escrevem", async () => {
    for (const [delta, reason] of [[{ expires_at: "2000-01-01T00:00:00Z" }, "expired"], [{ revoked_at: "2026-01-01T00:00:00Z" }, "revoked"]] as const) {
      const d = deps({ token: async () => ({ data: { ...row, ...delta }, error: null }), organization: async () => { throw new Error(); } });
      expect(await acceptFirstAdmin(input, true, d)).toMatchObject({ ok: false, reason });
    }
  });
  test("conflito de vínculo do banco é explícito e sem detalhe privado", async () => {
    const d = deps({ accept: async () => ({ data: null, error: { message: "first_admin_profile_conflict private-detail" } }) });
    const result = await acceptFirstAdmin(input, true, d);
    expect(result).toMatchObject({ ok: false, reason: "profile_conflict" });
    expect(JSON.stringify(result)).not.toContain("private-detail");
  });
  test("preview não escreve; aceite usa só identidade verificada", async () => {
    let writes = 0;
    const d = deps({ accept: async (id, user) => { writes++; expect(id).toBe(row.id); expect(user).toBe("recipient-synthetic"); return { data: row, error: null }; } });
    expect((await acceptFirstAdmin(input, false, d)).ok).toBe(true);
    expect(writes).toBe(0);
    expect((await acceptFirstAdmin(input, true, d)).ok).toBe(true);
    expect(writes).toBe(1);
  });
  test("resposta perdida depois do commit é recuperada sem repetir o efeito", async () => {
    let committed = false;
    let writes = 0;
    const accepted = { ...row, accepted_by: "recipient-synthetic", accepted_at: "2026-11-13T00:00:00Z" };
    const d = deps({
      token: async () => ({ data: committed ? accepted : row, error: null }),
      accept: async () => { writes++; committed = true; throw new Error("resposta de rede perdida"); },
    });
    expect(await acceptFirstAdmin(input, true, d)).toMatchObject({ ok: false, reason: "unavailable" });
    expect((await acceptFirstAdmin(input, true, d)).ok).toBe(true);
    expect(writes).toBe(1);
  });
});
