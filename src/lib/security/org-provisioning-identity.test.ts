// P0-SEC — trava no gate o invariante de identidade do provisionamento.
//
// A vulnerabilidade original foi reproduzida ao vivo em staging antes da
// correção (scripts/staging-org-invite-identity-proof.ts): com convite
// genérico (email NULL), tanto um usuário autenticado quanto `anon` sem JWT
// nenhum conseguiam provisionar organização vinculada ao UUID de OUTRA pessoa,
// porque provision_organization_from_invite só checava identidade quando o
// convite tinha e-mail, e nunca comparava p_user_id com auth.uid().
//
// Estes testes são estáticos (leem o SQL versionado). Não substituem a prova
// dinâmica — complementam: garantem que a correção não seja removida ou
// enfraquecida por uma migration futura sem que o build quebre.

import { describe, expect, test } from "bun:test";
import { collectSqlSources } from "@/lib/schema-parity/parity-io";

function allSql(): string {
  return collectSqlSources()
    .map((s) => s.content)
    .join("\n");
}

/** Última definição da função no corpus — a que vale, já que migrations posteriores
 *  sobrescrevem as anteriores via CREATE OR REPLACE. */
function ultimaDefinicao(sql: string): string {
  const partes = sql.split(/CREATE OR REPLACE FUNCTION public\.provision_organization_from_invite/);
  expect(partes.length).toBeGreaterThan(1);
  return partes[partes.length - 1]!;
}

describe("provision_organization_from_invite — invariante de identidade (P0-SEC)", () => {
  const sql = allSql();
  const def = ultimaDefinicao(sql);

  test("a função captura auth.uid() como identidade efetiva do chamador", () => {
    expect(def).toMatch(/v_caller\s+UUID\s*:=\s*auth\.uid\(\)/);
  });

  test("recusa chamador sem sessão (anon) com not_authenticated", () => {
    expect(def).toMatch(/v_caller IS NULL/);
    expect(def).toMatch(/'not_authenticated'/);
  });

  test("recusa p_user_id diferente de auth.uid() com identity_mismatch", () => {
    expect(def).toMatch(/p_user_id IS DISTINCT FROM v_caller/);
    expect(def).toMatch(/'identity_mismatch'/);
  });

  test("service_role tem bypass explícito (caminho do app, autorizado antes na aplicação)", () => {
    expect(def).toMatch(/auth\.role\(\)\s*=\s*'service_role'/);
  });

  test("o portão de identidade vem ANTES de qualquer INSERT — sem escrita parcial", () => {
    const posIdentidade = def.indexOf("identity_mismatch");
    const posInsertOrg = def.indexOf("INSERT INTO public.organizations");
    const posInsertProfile = def.indexOf("INSERT INTO public.profiles");
    expect(posIdentidade).toBeGreaterThan(-1);
    expect(posInsertOrg).toBeGreaterThan(posIdentidade);
    expect(posInsertProfile).toBeGreaterThan(posIdentidade);
  });

  test("o portão vem ANTES até da leitura do convite (falha o mais cedo possível)", () => {
    const posIdentidade = def.indexOf("identity_mismatch");
    const posSelectInvite = def.indexOf("FROM public.org_invites WHERE token = p_invite_token");
    expect(posSelectInvite).toBeGreaterThan(posIdentidade);
  });
});

describe("provision_organization_from_invite — proteções preservadas", () => {
  const def = ultimaDefinicao(allSql());

  test("mantém SECURITY DEFINER com search_path fixo", () => {
    expect(def).toMatch(/SECURITY DEFINER SET search_path = public/);
  });

  test("mantém trava de linha do convite (FOR UPDATE) — uso único atômico", () => {
    expect(def).toMatch(/FROM public\.org_invites WHERE token = p_invite_token FOR UPDATE/);
  });

  test("mantém validação de e-mail quando o convite tem e-mail", () => {
    expect(def).toMatch(/v_invite\.email IS NOT NULL/);
    expect(def).toMatch(/'email_mismatch'/);
  });

  test("mantém recusa de convite já usado e expirado", () => {
    expect(def).toMatch(/v_invite\.used_at IS NOT NULL/);
    expect(def).toMatch(/'already_used'/);
    expect(def).toMatch(/'expired'/);
  });

  test("mantém consumo do convite após sucesso", () => {
    expect(def).toMatch(/UPDATE public\.org_invites SET used_at = NOW\(\)/);
  });
});

describe("provision_organization_from_invite — grants mínimos", () => {
  const sql = allSql();

  test("EXECUTE revogado de PUBLIC, anon e authenticated", () => {
    expect(sql).toMatch(
      /REVOKE EXECUTE ON FUNCTION public\.provision_organization_from_invite\([\s\S]*?\)\s*FROM PUBLIC, anon, authenticated/,
    );
  });

  test("EXECUTE concedido a service_role (único caminho legítimo — o app)", () => {
    expect(sql).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.provision_organization_from_invite\([\s\S]*?\)\s*TO service_role/,
    );
  });
});
