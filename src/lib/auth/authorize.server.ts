// Autorização server-side de ações sobre uma organização (P0-04, Sprint S1).
//
// PROBLEMA: wave-admin.functions.ts, capsule-report.functions.ts e
// capsule-aggregator.functions.ts recebiam `orgId` no PAYLOAD do cliente e
// usavam service role para agir sobre ele sem verificar se o chamador tinha
// qualquer relação com essa organização. Bastava conhecer um UUID válido de
// outra empresa para ler ou escrever nos dados dela.
//
// SOLUÇÃO: nenhuma função privilegiada aceita mais `orgId` do cliente para
// fins de autorização. O chamador manda o access_token da própria sessão
// Supabase; o servidor resolve quem ele é DE VERDADE
// (supabaseAdmin.auth.getUser) e qual é o SEU org_id/role reais (tabela
// profiles) — mesmo modelo de confiança já estabelecido em
// org-invite.server.ts (verifyPlatformAdmin). `resolveOrgMembership` não
// aceita orgId como parâmetro: o ataque "finja que é de outra org" não tem
// como ser expresso na assinatura da função.

import { REGISTERED_PACK_IDS, resolvePackBundle } from "@/domain/packs/registry";

export type AuthFailureReason = "invalid_session" | "no_profile" | "not_admin";

export interface OrgMembership {
  userId: string;
  orgId: string;
  role: string;
}

export type MembershipResult =
  | { ok: true; membership: OrgMembership }
  | { ok: false; reason: AuthFailureReason };

/**
 * Papéis com autoridade administrativa sobre uma organização — um por setor,
 * declarado no próprio pack (`orgAdminRole`, ver onboarding.server.ts).
 * Derivado do registry em vez de hardcoded: evita a classe de bug já
 * corrigida nesta sessão (enum "condo" vs id real "condominium"), onde uma
 * segunda lista de papéis dessincronizava da fonte única por pack.
 */
export function orgAdminRoles(): Set<string> {
  return new Set(
    REGISTERED_PACK_IDS.map((id) => {
      const pack = resolvePackBundle(id).pack as unknown as { orgAdminRole?: string };
      return pack.orgAdminRole ?? "RH_ADMIN";
    }),
  );
}

/** Pura — usada pelos testes e por requireOrgAdmin. */
export function isOrgAdminRole(role: string): boolean {
  return orgAdminRoles().has(role);
}

export type IdentityResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "invalid_session" };

/**
 * Resolve a identidade REAL do chamador a partir do access_token da própria
 * sessão — nunca de um userId solto vindo do payload. Não exige que já
 * exista um `profiles` (usado também durante o onboarding, antes de o
 * perfil existir); quem precisa de organização usa resolveOrgMembership.
 */
export async function resolveAuthenticatedUserId(accessToken: string): Promise<IdentityResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as any;

  const { data: userData, error: userErr } = await admin.auth.getUser(accessToken);
  if (userErr || !userData?.user?.id) return { ok: false, reason: "invalid_session" };
  return { ok: true, userId: userData.user.id as string };
}

/**
 * Resolve a identidade e a organização REAIS do chamador a partir do
 * access_token da própria sessão. Não existe parâmetro orgId — a organização
 * retornada é sempre a do perfil vinculado ao usuário autenticado, nunca uma
 * escolhida pelo chamador.
 */
export async function resolveOrgMembership(accessToken: string): Promise<MembershipResult> {
  const identity = await resolveAuthenticatedUserId(accessToken);
  if (!identity.ok) return identity;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as any;

  const { data: profile } = await admin
    .from("profiles")
    .select("org_id, role")
    .eq("id", identity.userId)
    .maybeSingle();

  if (!profile?.org_id) return { ok: false, reason: "no_profile" };

  return {
    ok: true,
    membership: {
      userId: identity.userId,
      orgId: profile.org_id as string,
      role: profile.role as string,
    },
  };
}

/**
 * Igual a resolveOrgMembership, mas também exige papel administrativo do
 * setor. Use em toda ação que CRIA ou ALTERA dados da organização (criar
 * onda, disparar agregação). Para leituras que qualquer membro pode ver
 * (ex.: capsule agregada da própria org), resolveOrgMembership basta.
 */
export async function requireOrgAdmin(accessToken: string): Promise<MembershipResult> {
  const result = await resolveOrgMembership(accessToken);
  if (!result.ok) return result;
  if (!isOrgAdminRole(result.membership.role)) return { ok: false, reason: "not_admin" };
  return result;
}

/** Mensagem humana por motivo de recusa — nunca revela se o UUID pedido existe. */
export function describeAuthFailure(reason: AuthFailureReason): string {
  switch (reason) {
    case "invalid_session":
      return "Sessão inválida ou expirada. Faça login novamente.";
    case "no_profile":
      return "Esta conta não está vinculada a uma organização.";
    case "not_admin":
      return "Seu papel não tem permissão de administrador para esta ação.";
  }
}
