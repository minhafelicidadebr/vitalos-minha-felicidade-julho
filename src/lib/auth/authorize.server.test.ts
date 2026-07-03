import { describe, expect, test, mock } from "bun:test";

// ── Fake supabaseAdmin: dois usuários, duas organizações distintas ──────────
// user-a-token → user A → org "org-aaa", papel RH_ADMIN (admin)
// user-b-token → user B → org "org-bbb", papel RH_ADMIN (admin)
// user-c-token → user C → org "org-aaa", papel COLABORADOR (mesma org de A, não-admin)
// user-d-token → user D → sem linha em profiles (onboarding incompleto)
// token-invalido → getUser falha (sessão expirada/forjada)

const USERS: Record<string, { id: string }> = {
  "user-a-token": { id: "user-a" },
  "user-b-token": { id: "user-b" },
  "user-c-token": { id: "user-c" },
  "user-d-token": { id: "user-d" },
};

const PROFILES: Record<string, { org_id: string; role: string }> = {
  "user-a": { org_id: "org-aaa", role: "RH_ADMIN" },
  "user-b": { org_id: "org-bbb", role: "RH_ADMIN" },
  "user-c": { org_id: "org-aaa", role: "COLABORADOR" },
  // user-d: sem entrada — simula perfil ausente
};

const fakeAdmin = {
  auth: {
    getUser: async (token: string) => {
      const user = USERS[token];
      if (!user) return { data: { user: null }, error: { message: "invalid token" } };
      return { data: { user }, error: null };
    },
  },
  from: (table: string) => ({
    select: (_cols: string) => ({
      eq: (col: string, val: string) => ({
        maybeSingle: async () => {
          if (table === "profiles" && col === "id") {
            const p = PROFILES[val];
            return { data: p ?? null, error: null };
          }
          return { data: null, error: null };
        },
      }),
    }),
  }),
};

mock.module("@/integrations/supabase/client.server", () => ({ supabaseAdmin: fakeAdmin }));

// Import DEPOIS do mock.module — só assim o módulo sob teste usa o fake.
const {
  resolveAuthenticatedUserId,
  resolveOrgMembership,
  requireOrgAdmin,
  isOrgAdminRole,
  orgAdminRoles,
  describeAuthFailure,
} = await import("./authorize.server");

describe("resolveAuthenticatedUserId — identidade sem exigir profile (usado no onboarding)", () => {
  test("resolve o userId real mesmo sem perfil ainda existir", async () => {
    const r = await resolveAuthenticatedUserId("user-d-token");
    expect(r).toEqual({ ok: true, userId: "user-d" });
  });

  test("token inválido/forjado → invalid_session", async () => {
    const r = await resolveAuthenticatedUserId("token-forjado-inexistente");
    expect(r).toEqual({ ok: false, reason: "invalid_session" });
  });

  test("nunca aceita um userId como parâmetro — só o access_token da sessão", () => {
    expect(resolveAuthenticatedUserId.length).toBe(1);
  });
});

describe("resolveOrgMembership — identidade real da sessão, nunca do payload", () => {
  test("resolve o admin da org A para o org_id DELE, nunca o de outra org", async () => {
    const r = await resolveOrgMembership("user-a-token");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.membership).toEqual({ userId: "user-a", orgId: "org-aaa", role: "RH_ADMIN" });
  });

  test("dois tokens de duas organizações resolvem para orgIds DISTINTOS e corretos — nunca cruzam", async () => {
    const a = await resolveOrgMembership("user-a-token");
    const b = await resolveOrgMembership("user-b-token");
    expect(a.ok && a.membership.orgId).toBe("org-aaa");
    expect(b.ok && b.membership.orgId).toBe("org-bbb");
  });

  test("não existe parâmetro orgId na função — o ataque 'finja ser da org B' não é expressável", () => {
    // Prova estrutural: a assinatura de resolveOrgMembership só aceita 1 argumento.
    expect(resolveOrgMembership.length).toBe(1);
  });

  test("token inválido/expirado → invalid_session, nunca resolve organização nenhuma", async () => {
    const r = await resolveOrgMembership("token-forjado-inexistente");
    expect(r).toEqual({ ok: false, reason: "invalid_session" });
  });

  test("usuário autenticado sem perfil (onboarding incompleto) → no_profile", async () => {
    const r = await resolveOrgMembership("user-d-token");
    expect(r).toEqual({ ok: false, reason: "no_profile" });
  });
});

describe("requireOrgAdmin — cross-tenant e escalação de papel dentro da própria org", () => {
  test("admin de verdade é autorizado para a PRÓPRIA org", async () => {
    const r = await requireOrgAdmin("user-a-token");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.membership.orgId).toBe("org-aaa");
  });

  test("colaborador (não-admin) da mesma org é REJEITADO — não escala privilégio só por pertencer à org", async () => {
    const r = await requireOrgAdmin("user-c-token");
    expect(r).toEqual({ ok: false, reason: "not_admin" });
  });

  test("admin da org B nunca consegue produzir um contexto para a org A — não há como pedir", async () => {
    const r = await requireOrgAdmin("user-b-token");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.membership.orgId).not.toBe("org-aaa");
  });
});

describe("isOrgAdminRole / orgAdminRoles — derivado do registry, não hardcoded", () => {
  test("aceita o papel de admin de cada um dos 5 setores registrados", () => {
    expect(isOrgAdminRole("RH_ADMIN")).toBe(true); // enterprise
    expect(isOrgAdminRole("DIRETOR")).toBe(true); // school
    expect(isOrgAdminRole("DGP_RH")).toBe(true); // government
    expect(isOrgAdminRole("SINDICO")).toBe(true); // condominium
    expect(isOrgAdminRole("SESMT_SAUDE")).toBe(true); // health
  });

  test("rejeita papéis de participante/colaborador de qualquer setor", () => {
    expect(isOrgAdminRole("COLABORADOR")).toBe(false);
    expect(isOrgAdminRole("ESTUDANTE")).toBe(false);
    expect(isOrgAdminRole("MORADOR")).toBe(false);
    expect(isOrgAdminRole("SERVIDOR")).toBe(false);
    expect(isOrgAdminRole("")).toBe(false);
  });

  test("orgAdminRoles tem exatamente um papel por pack registrado (5 hoje)", () => {
    expect(orgAdminRoles().size).toBe(5);
  });
});

describe("describeAuthFailure", () => {
  test("mensagem humana por motivo, nunca vaza detalhe de UUID/existência", () => {
    expect(describeAuthFailure("invalid_session")).toMatch(/sessão/i);
    expect(describeAuthFailure("no_profile")).toMatch(/organização/i);
    expect(describeAuthFailure("not_admin")).toMatch(/permiss/i);
  });
});
