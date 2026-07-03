import { describe, expect, test, mock } from "bun:test";

// Fake supabaseAdmin: captura a chamada .rpc() e permite programar a resposta
// por teste, sem precisar de um Postgres real (a atomicidade da transação em
// si é provada por leitura do corpo SQL — ver comentário na migration; aqui
// provamos o CONTRATO: quais parâmetros a camada JS envia e como interpreta
// cada valor de retorno).
let lastRpcCall: { name: string; args: Record<string, unknown> } | null = null;
let rpcResponse: { data: unknown; error: { message: string } | null } = { data: null, error: null };

const fakeAdmin = {
  rpc: async (name: string, args: Record<string, unknown>) => {
    lastRpcCall = { name, args };
    return rpcResponse;
  },
};

mock.module("@/integrations/supabase/client.server", () => ({ supabaseAdmin: fakeAdmin }));

const { createOrgAndAdmin } = await import("./onboarding.server");

function baseInput() {
  return {
    userId: "11111111-1111-1111-1111-111111111111",
    orgName: "Escola Alegria",
    orgSlug: "escola-alegria",
    packId: "school",
    cnpj: "12.345.678/0001-90",
    teamSizeBand: "11-50",
    phone: "(11) 90000-0000",
    inviteToken: "tok-abc",
  };
}

describe("createOrgAndAdmin — chama a RPC transacional com os parâmetros certos", () => {
  test("resolve o setor e o papel em JS e envia como p_pack_id/p_role — nunca deixa a RPC decidir vocabulário de domínio", async () => {
    rpcResponse = {
      data: [{ org_id: "org-1", profile_id: "11111111-1111-1111-1111-111111111111", plan: "pilot", error: null }],
      error: null,
    };

    const result = await createOrgAndAdmin(baseInput());

    expect(lastRpcCall?.name).toBe("provision_organization_from_invite");
    expect(lastRpcCall?.args.p_pack_id).toBe("school");
    expect(lastRpcCall?.args.p_role).toBe("DIRETOR"); // orgAdminRole do pack school
    expect(lastRpcCall?.args.p_invite_token).toBe("tok-abc");
    expect(lastRpcCall?.args.p_user_id).toBe("11111111-1111-1111-1111-111111111111");
    expect(result).toEqual({ orgId: "org-1", profileId: "11111111-1111-1111-1111-111111111111" });
  });

  test("packId desconhecido cai no pack default (enterprise) — nunca confia cegamente no cliente", async () => {
    rpcResponse = { data: [{ org_id: "org-2", profile_id: "u2", plan: "pilot", error: null }], error: null };
    await createOrgAndAdmin({ ...baseInput(), packId: "setor-inventado" });
    expect(lastRpcCall?.args.p_pack_id).toBe("enterprise");
    expect(lastRpcCall?.args.p_role).toBe("RH_ADMIN");
  });

  test.each([
    ["invalid_token", "Link de convite inválido."],
    ["already_used", "Este convite já foi utilizado."],
    ["expired", "Este convite expirou. Peça um novo link ao administrador."],
    ["email_mismatch", "Este convite foi enviado para outro e-mail."],
    ["slug_taken", "Já existe uma organização com este slug."],
  ])("mapeia o erro de negócio '%s' da RPC para mensagem humana", async (rpcError, expectedMessage) => {
    rpcResponse = { data: [{ org_id: null, profile_id: null, plan: null, error: rpcError }], error: null };
    const result = await createOrgAndAdmin(baseInput());
    expect(result).toEqual({ error: expectedMessage });
  });

  test("erro de transporte/transação (ex.: profile já existia) propaga com detalhe, não trava silenciosamente", async () => {
    rpcResponse = { data: null, error: { message: "duplicate key value violates unique constraint" } };
    const result = await createOrgAndAdmin(baseInput());
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error).toContain("duplicate key");
  });

  test("aceita tanto array (data[0]) quanto objeto único como formato de retorno da RPC", async () => {
    rpcResponse = { data: { org_id: "org-3", profile_id: "u3", plan: "growth", error: null }, error: null };
    const result = await createOrgAndAdmin(baseInput());
    expect(result).toEqual({ orgId: "org-3", profileId: "u3" });
  });
});
