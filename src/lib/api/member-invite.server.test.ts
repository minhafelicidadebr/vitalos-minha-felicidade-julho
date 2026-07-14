import { describe, expect, test, mock, beforeEach } from "bun:test";

// Fake supabaseAdmin — despacha por tabela (mesmo padrão de
// wave-admin.server.test.ts), mais .rpc() para acceptMemberInvite (mesmo
// padrão de onboarding.server.test.ts).
const ORGS: Record<string, { pack_id: string; plan: string; name: string }> = {
  "org-a": { pack_id: "enterprise", plan: "growth", name: "TechCorp Ltda" },
  "org-pilot-cheia": { pack_id: "enterprise", plan: "pilot", name: "Piloto Lotado" },
};
let profileCountByOrg: Record<string, number> = { "org-a": 3, "org-pilot-cheia": 1 };
const insertedInvites: Array<Record<string, unknown>> = [];

const MEMBER_INVITES: Record<
  string,
  { email: string; role: string; used_at: string | null; expires_at: string | null; org_id: string }
> = {
  "tok-valido": {
    email: "marina@techcorp.com",
    role: "COLABORADOR",
    used_at: null,
    expires_at: "2099-01-01T00:00:00Z",
    org_id: "org-a",
  },
  "tok-usado": {
    email: "usado@techcorp.com",
    role: "COLABORADOR",
    used_at: "2026-07-01T00:00:00Z",
    expires_at: "2099-01-01T00:00:00Z",
    org_id: "org-a",
  },
  "tok-expirado": {
    email: "velho@techcorp.com",
    role: "COLABORADOR",
    used_at: null,
    expires_at: "2020-01-01T00:00:00Z",
    org_id: "org-a",
  },
};

let rpcResponse: { data: unknown; error: { message: string } | null } = { data: null, error: null };
let lastRpcArgs: Record<string, unknown> | null = null;

const fakeAdmin = {
  from(table: string) {
    if (table === "organizations") {
      return {
        select: (_cols: string) => ({
          eq: (_c: string, id: string) => ({
            single: async () => ({ data: ORGS[id] ?? null }),
          }),
        }),
      };
    }
    if (table === "profiles") {
      // head:true — o formato real do Supabase é { count }, sem `data`.
      return {
        select: (_cols: string, _opts?: unknown) => ({
          eq: async (_c: string, orgId: string) => ({ count: profileCountByOrg[orgId] ?? 0 }),
        }),
      };
    }
    if (table === "member_invites") {
      return {
        insert: (payload: Record<string, unknown>) => {
          insertedInvites.push(payload);
          return {
            select: (_cols: string) => ({
              single: async () => ({
                data: {
                  token: "tok-novo",
                  email: payload.email,
                  role: payload.role,
                  used_at: null,
                  expires_at: "2099-01-01T00:00:00Z",
                  created_at: "2026-07-14T00:00:00Z",
                },
                error: null,
              }),
            }),
          };
        },
        select: (cols: string) => ({
          eq: (_c: string, token: string) => ({
            maybeSingle: async () => {
              const row = MEMBER_INVITES[token];
              if (!row) return { data: null };
              if (cols.includes("organizations")) {
                const org = ORGS[row.org_id];
                return { data: { ...row, organizations: org ? { name: org.name, pack_id: org.pack_id } : null } };
              }
              return { data: row };
            },
          }),
        }),
      };
    }
    throw new Error(`tabela inesperada no fake: ${table}`);
  },
  rpc: async (name: string, args: Record<string, unknown>) => {
    lastRpcArgs = { name, ...args };
    return rpcResponse;
  },
};

mock.module("@/integrations/supabase/client.server", () => ({ supabaseAdmin: fakeAdmin }));

const { createMemberInvite, resolveMemberInvite, acceptMemberInvite } = await import("./member-invite.server");

beforeEach(() => {
  insertedInvites.length = 0;
  lastRpcArgs = null;
  profileCountByOrg = { "org-a": 3, "org-pilot-cheia": 1 };
});

describe("createMemberInvite — valida papel e assento antes de escrever", () => {
  test("papel convidável (COLABORADOR): cria e devolve link com /aceitar-convite/", async () => {
    const result = await createMemberInvite("org-a", "admin-1", "novo@techcorp.com", "COLABORADOR");
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.link).toContain("/aceitar-convite/");
      expect(insertedInvites[0]).toMatchObject({ org_id: "org-a", email: "novo@techcorp.com", role: "COLABORADOR" });
    }
  });

  test("papel não convidável (HOLDING_ADMIN, escopo multi-org): recusa sem escrever nada", async () => {
    const result = await createMemberInvite("org-a", "admin-1", "x@techcorp.com", "HOLDING_ADMIN");
    expect(result).toEqual({ error: "Este papel não pode ser convidado." });
    expect(insertedInvites).toHaveLength(0);
  });

  test("papel inventado (fora do pack): recusa do mesmo jeito — nunca confia no payload", async () => {
    const result = await createMemberInvite("org-a", "admin-1", "x@techcorp.com", "SUPER_ADMIN_HACK");
    expect(result).toEqual({ error: "Este papel não pode ser convidado." });
  });

  test("seat do plano esgotado: recusa com mensagem de upgrade, não escreve", async () => {
    const result = await createMemberInvite("org-pilot-cheia", "admin-1", "x@techcorp.com", "COLABORADOR");
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error).toContain("upgrade");
    expect(insertedInvites).toHaveLength(0);
  });

  test("organização inexistente: recusa sem lançar", async () => {
    const result = await createMemberInvite("org-fantasma", "admin-1", "x@techcorp.com", "COLABORADOR");
    expect(result).toEqual({ error: "Organização não encontrada." });
  });
});

describe("resolveMemberInvite — tela pública de aceite, antes do login", () => {
  test("token válido: devolve nome da org + rótulo do papel + e-mail", async () => {
    const result = await resolveMemberInvite("tok-valido");
    expect(result).toEqual({
      valid: true,
      orgName: "TechCorp Ltda",
      roleLabel: "Colaborador",
      email: "marina@techcorp.com",
    });
  });

  test("token já usado: invalid → already_used", async () => {
    expect(await resolveMemberInvite("tok-usado")).toEqual({ valid: false, reason: "already_used" });
  });

  test("token expirado: invalid → expired", async () => {
    expect(await resolveMemberInvite("tok-expirado")).toEqual({ valid: false, reason: "expired" });
  });

  test("token inexistente: invalid → invalid_token", async () => {
    expect(await resolveMemberInvite("tok-nao-existe")).toEqual({ valid: false, reason: "invalid_token" });
  });
});

describe("acceptMemberInvite — mapeia o retorno da RPC transacional", () => {
  test("sucesso: passa p_invite_token/p_user_id e devolve orgId/role", async () => {
    rpcResponse = { data: [{ org_id: "org-a", role: "COLABORADOR", error: null }], error: null };
    const result = await acceptMemberInvite("tok-valido", "user-1");
    expect(lastRpcArgs).toMatchObject({
      name: "accept_member_invite",
      p_invite_token: "tok-valido",
      p_user_id: "user-1",
    });
    expect(result).toEqual({ orgId: "org-a", role: "COLABORADOR" });
  });

  test.each([
    ["invalid_token", "Link de convite inválido."],
    ["already_used", "Este convite já foi utilizado."],
    ["expired", "Este convite expirou. Peça um novo link ao administrador."],
    ["email_mismatch", "Este convite foi enviado para outro e-mail. Entre com o e-mail que recebeu o convite."],
    ["already_has_profile", "Esta conta já está vinculada a uma organização."],
  ])("mapeia o erro de negócio '%s' da RPC para mensagem humana", async (rpcError, expectedMessage) => {
    rpcResponse = { data: [{ org_id: null, role: null, error: rpcError }], error: null };
    const result = await acceptMemberInvite("tok-x", "user-1");
    expect(result).toEqual({ error: expectedMessage });
  });

  test("erro de transporte: propaga com detalhe", async () => {
    rpcResponse = { data: null, error: { message: "connection refused" } };
    const result = await acceptMemberInvite("tok-x", "user-1");
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error).toContain("connection refused");
  });
});
