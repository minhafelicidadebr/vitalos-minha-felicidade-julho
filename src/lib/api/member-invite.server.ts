// Server-only: convite de uma SEGUNDA (ou terceira, ou N-ésima) pessoa real
// para dentro de uma organização já existente, com papel explícito.
//
// Diferença de org-invite.server.ts: aquele cria a ORGANIZAÇÃO (token sem
// org_id, papel fixo do pack). Este convida uma PESSOA para uma organização
// que já existe — token com org_id + role explícitos, um perfil novo dentro
// da mesma org. Ver a migration 20260714120000_member_invites.sql para o
// desenho completo (RPC transacional accept_member_invite).
//
// Modelo de confiança: createMemberInvite só é chamada depois de
// requireOrgAdmin passar (o admin convida só na PRÓPRIA org, nunca uma
// escolhida pelo payload — a mesma garantia de wave-admin.server.ts).

import { resolvePackBundle } from "@/domain/packs/registry";
import { invitableRoles } from "@/domain/packs/pack-routes";
import { describeLimitViolation, getPlanLimits } from "@/engine/billing/plan-engine";
import { orgAdminRoles } from "@/lib/auth/authorize.server";

export interface MemberInviteSummary {
  token: string;
  email: string;
  role: string;
  usedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  link: string;
}

function inviteLink(token: string): string {
  const base = import.meta.env?.VITE_APP_URL?.trim() || "https://app.vitalos.com.br";
  return `${base}/aceitar-convite/${token}`;
}

interface MemberInviteRow {
  token: string;
  email: string;
  role: string;
  used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

/** Mensagem recuperável quando não há contagem confiável: nada foi criado. */
export const SEAT_CHECK_UNAVAILABLE =
  "Não foi possível conferir os assentos do plano agora. Nenhum convite foi criado. Tente novamente em instantes.";

function isInviteRow(value: unknown): value is MemberInviteRow {
  const v = value as Partial<MemberInviteRow> | null;
  return !!v && typeof v.token === "string" && v.token.length > 0 && typeof v.email === "string" && typeof v.role === "string";
}

function toSummary(row: MemberInviteRow): MemberInviteSummary {
  return {
    token: row.token,
    email: row.email,
    role: row.role,
    usedAt: row.used_at,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    link: inviteLink(row.token),
  };
}

/** Cria um convite de pessoa. Só chamado após requireOrgAdmin passar (orgId sempre real). */
export async function createMemberInvite(
  orgId: string,
  createdByUserId: string,
  email: string,
  role: string,
): Promise<MemberInviteSummary | { error: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as any;

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .select("pack_id, plan")
    .eq("id", orgId)
    .single();
  if (orgError && orgError.code !== "PGRST116") return { error: SEAT_CHECK_UNAVAILABLE };
  if (!org) return { error: "Organização não encontrada." };

  // Papel validado contra o pack da PRÓPRIA org (nunca uma lista solta no
  // cliente) — fonte única com o seletor de /admin via invitableRoles.
  const pack = resolvePackBundle(org.pack_id as string).pack;
  const allowed = invitableRoles(pack).some((r) => r.id === role);
  if (!allowed) return { error: "Este papel não pode ser convidado." };

  // Assento = papel ADMINISTRATIVO (decisão do founder, 21/11/2026): o teto do plano
  // vale só para papéis administrativos canônicos (orgAdminRoles(), mesma fonte de
  // requireOrgAdmin); convite administrativo pendente e válido reserva assento;
  // outros papéis não consomem. Contagem e INSERT acontecem na MESMA transação,
  // serializada por organização, dentro da RPC reserve_member_invite
  // (migration 20261121120000). Qualquer leitura sem resposta confiável falha
  // fechada: nenhum convite é criado.
  const adminRoles = [...orgAdminRoles()];
  const limit = getPlanLimits((org.plan as string | undefined) ?? "pilot").maxAdminSeats;
  const { data: reserved, error: rpcError } = await admin.rpc("reserve_member_invite", {
    p_org_id: orgId,
    p_email: email.trim(),
    p_role: role,
    p_created_by: createdByUserId,
    p_admin_roles: adminRoles,
    p_max_admin_seats: Number.isFinite(limit) ? limit : null,
    // Plano sobre o qual o teto foi calculado: a RPC relê e recusa se mudou.
    p_expected_plan: (org.plan as string | null | undefined) ?? null,
  });
  if (rpcError || !reserved || typeof reserved !== "object") return { error: SEAT_CHECK_UNAVAILABLE };
  const outcome = reserved as { ok?: unknown; reason?: unknown; invite?: unknown };
  if (outcome.ok === false && outcome.reason === "seat_quota_exceeded") {
    return { error: describeLimitViolation("seat_quota_exceeded")! };
  }
  if (outcome.ok === false && outcome.reason === "org_not_found") return { error: "Organização não encontrada." };
  if (outcome.ok !== true || !isInviteRow(outcome.invite)) return { error: SEAT_CHECK_UNAVAILABLE };
  return toSummary(outcome.invite);
}

export async function listMemberInvites(orgId: string): Promise<MemberInviteSummary[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as any;

  const { data } = await admin
    .from("member_invites")
    .select("token, email, role, used_at, expires_at, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  return ((data ?? []) as MemberInviteRow[]).map(toSummary);
}

export type MemberInviteResolution =
  | { valid: true; orgName: string; roleLabel: string; email: string }
  | { valid: false; reason: "invalid_token" | "already_used" | "expired" };

/** Resolve um token de convite → dados de exibição, sem autenticar ninguém (tela pública de aceite). */
export async function resolveMemberInvite(token: string): Promise<MemberInviteResolution> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as any;

  const { data: invite } = await admin
    .from("member_invites")
    .select("email, role, used_at, expires_at, organizations(name, pack_id)")
    .eq("token", token)
    .maybeSingle();

  if (!invite) return { valid: false, reason: "invalid_token" };
  if (invite.used_at) return { valid: false, reason: "already_used" };
  if (invite.expires_at && new Date(invite.expires_at as string) < new Date()) {
    return { valid: false, reason: "expired" };
  }

  const org = invite.organizations as { name?: string; pack_id?: string } | null;
  const pack = resolvePackBundle(org?.pack_id ?? "enterprise").pack;
  const roleLabel = pack.roles?.find((r) => r.id === invite.role)?.label ?? (invite.role as string);

  return {
    valid: true,
    orgName: org?.name ?? "sua organização",
    roleLabel,
    email: invite.email as string,
  };
}

/** Motivos que a RPC devolve na coluna `error` — traduzidos para o usuário. */
const RPC_ERROR_MESSAGES: Record<string, string> = {
  invalid_token: "Link de convite inválido.",
  already_used: "Este convite já foi utilizado.",
  expired: "Este convite expirou. Peça um novo link ao administrador.",
  email_mismatch: "Este convite foi enviado para outro e-mail. Entre com o e-mail que recebeu o convite.",
  already_has_profile: "Esta conta já está vinculada a uma organização.",
};

export async function acceptMemberInvite(
  token: string,
  userId: string,
): Promise<{ orgId: string; role: string } | { error: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as any;

  const { data, error } = await admin.rpc("accept_member_invite", {
    p_invite_token: token,
    p_user_id: userId,
  });

  if (error) return { error: `Falha ao aceitar convite (${error.message}).` };

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { error: "Falha ao aceitar convite." };
  if (row.error) return { error: RPC_ERROR_MESSAGES[row.error as string] ?? "Convite inválido." };

  return { orgId: row.org_id as string, role: row.role as string };
}
