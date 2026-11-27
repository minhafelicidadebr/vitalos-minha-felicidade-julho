import { describe, expect, test, mock, beforeEach } from "bun:test";

// Fake supabaseAdmin — despacha por tabela (mesmo padrão de
// wave-admin.server.test.ts), mais .rpc() para acceptMemberInvite (mesmo
// padrão de onboarding.server.test.ts).
const ORGS: Record<string, { pack_id: string; plan: string; name: string }> = {
  "org-a": { pack_id: "enterprise", plan: "growth", name: "TechCorp Ltda" },
  "org-pilot-cheia": { pack_id: "enterprise", plan: "pilot", name: "Piloto Lotado" },
  "org-b": { pack_id: "enterprise", plan: "growth", name: "Outra Empresa Ltda" },
};
// Contagem de perfis ADMIN por org (o limite do plano só vale para administradores).
let adminCountByOrg: Record<string, number> = { "org-a": 1, "org-pilot-cheia": 1 };
let pendingAdminInvites: Array<{ org_id: string; expires_at: string | null }> = [];
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
          eq: (_c: string, orgId: string) => ({
            in: async (_r: string, roles: string[]) => {
              expect(roles).toContain("RH_ADMIN");
              return { count: adminCountByOrg[orgId] ?? 0 };
            },
          }),
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
          eq: (col: string, token: string) => ({
            in: (_r: string, _roles: string[]) => ({
              is: async () => ({ data: pendingAdminInvites.filter((i) => i.org_id === token) }),
            }),
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
    if (name === "reserve_member_invite") return fakeReserve(args);
    return rpcResponse;
  },
};

// Modelo da RPC reserve_member_invite (a prova de atomicidade REAL é no Postgres
// local; aqui o fake serializa por org como o advisory lock, para testar o contrato
// do servidor). Botões: reserveFailure força erro/resposta malformada.
let reserveFailure: "none" | "error" | "null" | "malformed" = "none";
// Plano gravado no banco no MOMENTO da RPC (pode divergir do lido pelo servidor).
let planAtRpc: Record<string, string> = {};
let reserveChain: Promise<unknown> = Promise.resolve();
async function fakeReserve(args: Record<string, unknown>) {
  if (reserveFailure === "error") return { data: null, error: { message: "timeout" } };
  if (reserveFailure === "null") return { data: null, error: null };
  if (reserveFailure === "malformed") return { data: { ok: true, invite: { token: "" } }, error: null };
  const run = async () => {
    const orgId = args.p_org_id as string;
    const roles = args.p_admin_roles as string[];
    const limit = args.p_max_admin_seats as number | null;
    if ((planAtRpc[orgId] ?? ORGS[orgId]?.plan ?? null) !== args.p_expected_plan) {
      return { data: { ok: false, reason: "plan_changed" }, error: null };
    }
    if (roles.includes(args.p_role as string) && limit !== null) {
      await new Promise((res) => setTimeout(res, 5)); // janela em que uma corrida apareceria
      const pending = pendingAdminInvites.filter(
        (i) => i.org_id === orgId && (i.expires_at === null || Date.parse(i.expires_at) > Date.now()),
      ).length;
      const used = (adminCountByOrg[orgId] ?? 0) + pending;
      if (used >= limit) return { data: { ok: false, reason: "seat_quota_exceeded", used, limit }, error: null };
      pendingAdminInvites.push({ org_id: orgId, expires_at: "2099-01-01T00:00:00Z" });
    }
    insertedInvites.push({ org_id: orgId, email: args.p_email, role: args.p_role });
    return {
      data: {
        ok: true,
        invite: { token: `tok-${insertedInvites.length}`, email: args.p_email, role: args.p_role, used_at: null, expires_at: "2099-01-01T00:00:00Z", created_at: "2026-11-21T00:00:00Z" },
      },
      error: null,
    };
  };
  const next = reserveChain.then(run, run);
  reserveChain = next.catch(() => undefined);
  return next;
}

mock.module("@/integrations/supabase/client.server", () => ({ supabaseAdmin: fakeAdmin }));

const { createMemberInvite, resolveMemberInvite, acceptMemberInvite, SEAT_CHECK_UNAVAILABLE } = await import("./member-invite.server");

beforeEach(() => {
  insertedInvites.length = 0;
  lastRpcArgs = null;
  adminCountByOrg = { "org-a": 1, "org-pilot-cheia": 1 };
  pendingAdminInvites = [];
  reserveFailure = "none";
  planAtRpc = {};
});

describe("createMemberInvite — valida papel e assento antes de escrever", () => {
  test("papel convidável (COLABORADOR): cria e devolve link com /aceitar-convite/", async () => {
    const result = await createMemberInvite("org-a", "admin-1", "novo@techcorp.com", "COLABORADOR");
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.link).toContain("/aceitar-convite/");
      expect(insertedInvites[0]).toMatchObject({ org_id: "org-a", email: "novo@techcorp.com", role: "COLABORADOR" });
      expect(lastRpcArgs).toMatchObject({ name: "reserve_member_invite", p_max_admin_seats: 5 });
      expect(lastRpcArgs?.p_admin_roles).toContain("RH_ADMIN");
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

  test("Piloto com 1 admin: convite de COLABORADOR passa (não consome assento administrativo)", async () => {
    const result = await createMemberInvite("org-pilot-cheia", "admin-1", "x@techcorp.com", "COLABORADOR");
    expect("error" in result).toBe(false);
    expect(insertedInvites).toHaveLength(1);
  });

  test("Piloto com 1 admin: convite de RH_ADMIN recusa com mensagem de upgrade, não escreve", async () => {
    const result = await createMemberInvite("org-pilot-cheia", "admin-1", "x@techcorp.com", "RH_ADMIN");
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error).toContain("upgrade");
    expect(insertedInvites).toHaveLength(0);
  });

  test("falha de leitura (erro, resposta vazia ou malformada): falha fechada, mensagem recuperável, nada criado", async () => {
    for (const f of ["error", "null", "malformed"] as const) {
      reserveFailure = f;
      const result = await createMemberInvite("org-a", "admin-1", "z@techcorp.com", "RH_ADMIN");
      expect(result).toEqual({ error: SEAT_CHECK_UNAVAILABLE });
    }
    expect(insertedInvites).toHaveLength(0);
  });

  test("duas emissões simultâneas com 1 assento livre: exatamente uma obtém o convite", async () => {
    adminCountByOrg["org-a"] = 4; // growth = 5 → resta 1
    const results = await Promise.all([
      createMemberInvite("org-a", "admin-1", "a@techcorp.com", "RH_ADMIN"),
      createMemberInvite("org-a", "admin-1", "b@techcorp.com", "RH_ADMIN"),
    ]);
    expect(results.filter((r) => !("error" in r))).toHaveLength(1);
    expect(results.filter((r) => "error" in r && r.error.includes("upgrade"))).toHaveLength(1);
  });

  test("plano alterado entre a leitura e a reserva: falha fechada, nada criado", async () => {
    planAtRpc["org-a"] = "pilot"; // downgrade growth → pilot depois da leitura do servidor
    const result = await createMemberInvite("org-a", "admin-1", "d@techcorp.com", "RH_ADMIN");
    expect(result).toEqual({ error: SEAT_CHECK_UNAVAILABLE });
    expect(lastRpcArgs).toMatchObject({ p_expected_plan: "growth", p_max_admin_seats: 5 });
    expect(insertedInvites).toHaveLength(0);
  });

  test("convite de admin pendente conta como assento; expirado não conta", async () => {
    adminCountByOrg["org-a"] = 4; // growth = 5 assentos
    pendingAdminInvites = [{ org_id: "org-a", expires_at: "2099-01-01T00:00:00Z" }];
    const cheio = await createMemberInvite("org-a", "admin-1", "y@techcorp.com", "RH_ADMIN");
    expect("error" in cheio).toBe(true);
    pendingAdminInvites = [{ org_id: "org-a", expires_at: "2020-01-01T00:00:00Z" }];
    const livre = await createMemberInvite("org-a", "admin-1", "y@techcorp.com", "RH_ADMIN");
    expect("error" in livre).toBe(false);
  });

  test("organização inexistente: recusa sem lançar", async () => {
    const result = await createMemberInvite("org-fantasma", "admin-1", "x@techcorp.com", "COLABORADOR");
    expect(result).toEqual({ error: "Organização não encontrada." });
  });

  // Isolamento entre organizações (contrato do servidor). A prova de que o Postgres
  // filtra por org está na jornada local (scripts/integ-local/mo2-journey.ts); aqui se
  // prova que o servidor só reserva assento na org recebida e não mistura contagens.
  test("duas orgs: assentos cheios na org-a não bloqueiam a org-b; cada convite carrega a própria org", async () => {
    adminCountByOrg["org-a"] = 5; // growth = 5 → cheia
    adminCountByOrg["org-b"] = 0;
    const cheia = await createMemberInvite("org-a", "admin-a", "a@techcorp.com", "RH_ADMIN");
    expect("error" in cheia && cheia.error.includes("upgrade")).toBe(true);
    expect(insertedInvites).toHaveLength(0);

    const livre = await createMemberInvite("org-b", "admin-b", "b@outra.com", "RH_ADMIN");
    expect("error" in livre).toBe(false);
    expect(lastRpcArgs).toMatchObject({ p_org_id: "org-b", p_expected_plan: "growth", p_max_admin_seats: 5 });
    expect(insertedInvites).toEqual([{ org_id: "org-b", email: "b@outra.com", role: "RH_ADMIN" }]);
  });

  test("duas orgs, emissões simultâneas com 1 assento livre em cada: ambas passam e o convite pendente de uma não conta na outra", async () => {
    adminCountByOrg["org-a"] = 4;
    adminCountByOrg["org-b"] = 4;
    const results = await Promise.all([
      createMemberInvite("org-a", "admin-a", "a@techcorp.com", "RH_ADMIN"),
      createMemberInvite("org-b", "admin-b", "b@outra.com", "RH_ADMIN"),
    ]);
    expect(results.every((r) => !("error" in r))).toBe(true);
    expect(insertedInvites.map((i) => i.org_id).sort()).toEqual(["org-a", "org-b"]);
    // Cada org tem exatamente 1 pendente (o seu); um 2º admin em org-a agora é recusado.
    expect(pendingAdminInvites.filter((i) => i.org_id === "org-a")).toHaveLength(1);
    expect(pendingAdminInvites.filter((i) => i.org_id === "org-b")).toHaveLength(1);
    const segunda = await createMemberInvite("org-a", "admin-a", "c@techcorp.com", "RH_ADMIN");
    expect("error" in segunda && segunda.error.includes("upgrade")).toBe(true);
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
