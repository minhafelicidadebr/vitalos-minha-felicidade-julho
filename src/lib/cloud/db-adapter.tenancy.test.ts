// Prova cross-tenant de listagem (Q1.1 + Q1.1B, escopo "listagem"/"filtros").
// listOrgWaves/listOrgCapsules são o caminho de LEITURA usado por
// adminListWaves/adminListCapsules (wave-admin.functions.ts) — a autorização
// nunca pode depender só do orgId recebido: cada leitura reverifica de forma
// autoritativa, a partir do access_token, a organização REAL do chamador
// (resolveMembership) antes de tocar o banco (ver db-adapter.ts,
// authorizeOrgRead). orgId nunca é aceito como prova de autorização por si.
//
// Usa injeção de dependência (deps.client / deps.resolveMembership), não
// mock.module("@/integrations/supabase/client", ...): esse especificador já
// é mockado por 6 outros arquivos de teste neste repo (pair-invite-adapter,
// practice-journal-adapter, learning-adapter, pair-directory-adapter,
// circle-sessions-adapter, participation-store) e mock.module troca a
// resolução do especificador para TODO o processo `bun test` — repetir o
// padrão aqui arriscaria o mesmo vazamento cross-file já corrigido em
// wave-admin.server.test.ts/capsule-aggregator.server.test.ts nesta sessão.

import { describe, expect, test } from "bun:test";
import { listOrgWaves, listOrgCapsules, type ResolveOrgMembershipFn } from "./db-adapter";

const TENANT_A = "org-tenant-a";
const TENANT_B = "org-tenant-b";
const TOKEN_MEMBER_A = "token-member-a";
const TOKEN_MEMBER_B = "token-member-b";
const TOKEN_NO_PROFILE = "token-no-profile";
const TOKEN_INVALID = "token-invalid-session";

const WAVE_ROWS = [
  {
    org_id: TENANT_A, id: "wave-a1", instrument: "COPSOQ", label: "Onda A",
    status: "open", invited_count: 10, closes_at: null,
    created_at: "2026-01-01T00:00:00Z", sealed_at: null,
  },
  {
    org_id: TENANT_B, id: "wave-b1", instrument: "PERMA", label: "Onda B",
    status: "open", invited_count: 8, closes_at: null,
    created_at: "2026-01-02T00:00:00Z", sealed_at: null,
  },
];

const CAPSULE_ROWS = [
  {
    org_id: TENANT_A, id: "capsule-a1", wave_id: "wave-a1", instrument: "COPSOQ",
    participant_count: 12, aggregated_at: "2026-01-05T00:00:00Z",
    dimensions: { exigencias: { mean: 3.1, high_risk_pct: 20, n: 12 } }, outcomes: null,
  },
  {
    org_id: TENANT_B, id: "capsule-b1", wave_id: "wave-b1", instrument: "PERMA",
    participant_count: 9, aggregated_at: "2026-01-06T00:00:00Z",
    dimensions: { positividade: { mean: 4.0, high_risk_pct: 5, n: 9 } }, outcomes: null,
  },
];

/** Fake de resolveOrgMembership — nunca confia em orgId de payload; mapeia
 * SÓ o token para a membership real, como o resolveOrgMembership de
 * verdade faz a partir da sessão (authorize.server.ts). */
const fakeResolveMembership: ResolveOrgMembershipFn = async (accessToken) => {
  if (accessToken === TOKEN_MEMBER_A) {
    return { ok: true, membership: { userId: "user-a", orgId: TENANT_A, role: "RH_ADMIN" } };
  }
  if (accessToken === TOKEN_MEMBER_B) {
    return { ok: true, membership: { userId: "user-b", orgId: TENANT_B, role: "RH_ADMIN" } };
  }
  if (accessToken === TOKEN_NO_PROFILE) {
    return { ok: false, reason: "no_profile" };
  }
  return { ok: false, reason: "invalid_session" };
};

/** Fake mínimo: só entende .from(table).select().eq("org_id", v).order() —
 * reflete o uso real de listOrgWaves/listOrgCapsules. Registra toda chamada
 * a .from() para provar que a recusa de autorização acontece ANTES de
 * qualquer leitura (a "leitura sensível" nunca é sequer tentada). */
function fakeClient(rows: Record<string, unknown>[], calls: string[]) {
  return {
    from: (table: string) => {
      calls.push(table);
      return {
        select: (_cols: string) => ({
          eq: (col: string, value: string) => ({
            order: async (_c: string, _o: unknown) => ({
              data: col === "org_id" ? rows.filter((r) => r.org_id === value) : [],
              error: null,
            }),
          }),
        }),
      };
    },
  };
}

describe("listOrgWaves — autorização autoritativa antes da leitura", () => {
  test("membro de A lista A", async () => {
    const calls: string[] = [];
    const client = fakeClient(WAVE_ROWS, calls) as never;
    const result = await listOrgWaves(TOKEN_MEMBER_A, TENANT_A, {
      client,
      resolveMembership: fakeResolveMembership,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.id).toBe("wave-a1");
    }
    expect(calls).toEqual(["waves"]);
  });

  test("membro de A não lista B — orgId pedido não bate com a membership real do token", async () => {
    const calls: string[] = [];
    const client = fakeClient(WAVE_ROWS, calls) as never;
    // Mesmo que algo upstream erre e peça orgId=B com o token de A, a
    // checagem autoritativa (não o filtro) é quem decide.
    const result = await listOrgWaves(TOKEN_MEMBER_A, TENANT_B, {
      client,
      resolveMembership: fakeResolveMembership,
    });
    expect(result).toEqual({ ok: false, reason: "org_mismatch" });
    // "recusa ocorre antes da leitura sensível": .from() nunca foi chamado.
    expect(calls).toEqual([]);
  });

  test("usuário sem membership é recusado, nunca recebe lista vazia disfarçada de sucesso", async () => {
    const calls: string[] = [];
    const client = fakeClient(WAVE_ROWS, calls) as never;
    const result = await listOrgWaves(TOKEN_NO_PROFILE, TENANT_A, {
      client,
      resolveMembership: fakeResolveMembership,
    });
    expect(result).toEqual({ ok: false, reason: "no_profile" });
    expect(calls).toEqual([]);
  });

  test("sessão inválida é recusada antes de qualquer leitura", async () => {
    const calls: string[] = [];
    const client = fakeClient(WAVE_ROWS, calls) as never;
    const result = await listOrgWaves(TOKEN_INVALID, TENANT_A, {
      client,
      resolveMembership: fakeResolveMembership,
    });
    expect(result).toEqual({ ok: false, reason: "invalid_session" });
    expect(calls).toEqual([]);
  });
});

describe("listOrgCapsules — autorização autoritativa antes da leitura", () => {
  test("membro de A lista cápsulas de A", async () => {
    const calls: string[] = [];
    const client = fakeClient(CAPSULE_ROWS, calls) as never;
    const result = await listOrgCapsules(TOKEN_MEMBER_A, TENANT_A, {
      client,
      resolveMembership: fakeResolveMembership,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.id).toBe("capsule-a1");
    }
    expect(calls).toEqual(["wave_capsules"]);
  });

  test("membro de A não lista cápsulas de B", async () => {
    const calls: string[] = [];
    const client = fakeClient(CAPSULE_ROWS, calls) as never;
    const result = await listOrgCapsules(TOKEN_MEMBER_A, TENANT_B, {
      client,
      resolveMembership: fakeResolveMembership,
    });
    expect(result).toEqual({ ok: false, reason: "org_mismatch" });
    expect(calls).toEqual([]);
  });

  test("usuário sem membership nunca vê participant_count/dimensions de nenhuma org", async () => {
    const calls: string[] = [];
    const client = fakeClient(CAPSULE_ROWS, calls) as never;
    const result = await listOrgCapsules(TOKEN_NO_PROFILE, TENANT_B, {
      client,
      resolveMembership: fakeResolveMembership,
    });
    expect(result).toEqual({ ok: false, reason: "no_profile" });
    expect(calls).toEqual([]);
  });

  test("membro de B lista B, nunca A — confirma o par simétrico", async () => {
    const calls: string[] = [];
    const client = fakeClient(CAPSULE_ROWS, calls) as never;
    const result = await listOrgCapsules(TOKEN_MEMBER_B, TENANT_B, {
      client,
      resolveMembership: fakeResolveMembership,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.items.find((c) => c.id === "capsule-a1")).toBeUndefined();
      expect(result.items[0]!.id).toBe("capsule-b1");
    }
  });
});

describe("leituras institucionais — falha explícita sem singleton anônimo", () => {
  test("cliente do chamador ausente não produz uma lista vazia bem-sucedida", async () => {
    for (const read of [listOrgWaves, listOrgCapsules]) {
      expect(await read(TOKEN_MEMBER_A, TENANT_A, { resolveMembership: fakeResolveMembership }))
        .toEqual({ ok: false, reason: "read_unavailable" });
    }
  });

  test("erro ou resposta ausente do banco não viram ausência de registros", async () => {
    for (const result of [{ data: null, error: { message: "unavailable" } }, { data: null, error: null }]) {
      const client = {
        from: () => ({ select: () => ({ eq: () => ({ order: async () => result }) }) }),
      } as never;
      for (const read of [listOrgWaves, listOrgCapsules]) {
        expect(await read(TOKEN_MEMBER_A, TENANT_A, { client, resolveMembership: fakeResolveMembership }))
          .toEqual({ ok: false, reason: "read_unavailable" });
      }
    }
  });

  test("vazio confirmado continua sendo um resultado legítimo", async () => {
    for (const read of [listOrgWaves, listOrgCapsules]) {
      const client = fakeClient([], []) as never;
      expect(await read(TOKEN_MEMBER_A, TENANT_A, { client, resolveMembership: fakeResolveMembership }))
        .toEqual({ ok: true, items: [] });
    }
  });
});
