// Server-only: provisionamento de organizações por convite. Fecha o self-serve
// — nenhuma organização nasce sem um token gerado por um admin da PLATAFORMA
// (não confundir com admin de uma organização cliente).
//
// Modelo de confiança: o chamador nunca informa "quem ele é" por um dado
// solto (userId/email) — sempre manda o access_token da própria sessão
// Supabase, e o servidor verifica a identidade de verdade via
// supabaseAdmin.auth.getUser(accessToken) antes de qualquer ação privilegiada.

export interface PlatformAdminCheck {
  authorized: boolean;
  email?: string;
}

/** Parseia PLATFORM_ADMIN_EMAILS ("a@x.com, B@Y.com") numa allowlist normalizada. */
export function parsePlatformAdminAllowlist(envValue: string | undefined): string[] {
  return (envValue ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** Compara um e-mail contra a allowlist — case-insensitive, tolera espaços. Pura, sem I/O. */
export function isAllowedPlatformAdminEmail(email: string, envValue: string | undefined): boolean {
  const allowlist = parsePlatformAdminAllowlist(envValue);
  if (allowlist.length === 0) return false;
  return allowlist.includes(email.trim().toLowerCase());
}

/** Verifica se o access_token pertence a um e-mail da allowlist de admin da plataforma. */
export async function verifyPlatformAdmin(accessToken: string): Promise<PlatformAdminCheck> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as any;

  const { data, error } = await admin.auth.getUser(accessToken);
  if (error || !data?.user?.email) return { authorized: false };

  const email = data.user.email as string;
  return { authorized: isAllowedPlatformAdminEmail(email, process.env.PLATFORM_ADMIN_EMAILS), email };
}

export interface OrgInviteSummary {
  token: string;
  email: string | null;
  usedAt: string | null;
  usedByOrgId: string | null;
  expiresAt: string | null;
  createdAt: string;
  link: string;
}

interface OrgInviteRow {
  token: string;
  email: string | null;
  used_at: string | null;
  used_by_org_id: string | null;
  expires_at: string | null;
  created_at: string;
}

function toInviteSummary(row: OrgInviteRow): OrgInviteSummary {
  const base = import.meta.env?.VITE_APP_URL?.trim() || "https://app.vitalos.com.br";
  return {
    token: row.token,
    email: row.email,
    usedAt: row.used_at,
    usedByOrgId: row.used_by_org_id,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    link: `${base}/ativar/${row.token}`,
  };
}

/** Cria um convite de organização. Só chamado após verifyPlatformAdmin passar. */
export async function createOrgInvite(
  createdByUserId: string,
  boundEmail?: string,
): Promise<OrgInviteSummary | { error: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as any;

  const { data, error } = await admin
    .from("org_invites")
    .insert({ created_by: createdByUserId, email: boundEmail?.trim() || null })
    .select("token, email, used_at, used_by_org_id, expires_at, created_at")
    .single();

  if (error || !data) {
    // Mostra o erro real do Postgres — esta tela é restrita ao admin da
    // plataforma, então expor a causa (ex.: tabela ainda não migrada) ajuda
    // a diagnosticar em vez de esconder atrás de uma mensagem genérica.
    const detail = error?.message ? ` (${error.message})` : "";
    return { error: `Falha ao criar convite${detail}.` };
  }
  return toInviteSummary(data as OrgInviteRow);
}

/** Lista os convites já gerados por qualquer admin da plataforma (auditoria). */
export async function listOrgInvites(): Promise<OrgInviteSummary[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as any;

  const { data } = await admin
    .from("org_invites")
    .select("token, email, used_at, used_by_org_id, expires_at, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return ((data ?? []) as OrgInviteRow[]).map(toInviteSummary);
}

export type OrgInviteResolution =
  | { valid: true; email: string | null }
  | { valid: false; reason: "invalid_token" | "already_used" | "expired" };

/** Valida um token de convite ANTES de mostrar o formulário de cadastro da empresa. */
export async function resolveOrgInvite(token: string): Promise<OrgInviteResolution> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as any;

  const { data } = await admin
    .from("org_invites")
    .select("email, used_at, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (!data) return { valid: false, reason: "invalid_token" };
  if (data.used_at) return { valid: false, reason: "already_used" };
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
    return { valid: false, reason: "expired" };
  }

  return { valid: true, email: data.email };
}

/** Marca o convite como usado. Chamado só depois que a organização foi criada com sucesso. */
export async function consumeOrgInvite(token: string, orgId: string): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as any;

  const { data } = await admin
    .from("org_invites")
    .update({ used_at: new Date().toISOString(), used_by_org_id: orgId })
    .eq("token", token)
    .is("used_at", null)
    .select("token")
    .maybeSingle();

  return !!data;
}
