import { createHash } from "node:crypto";
import { verifyPlatformAdmin, type PlatformAdminCheck } from "@/lib/api/org-invite.server";
import { FIRST_ADMIN_MESSAGES, type FirstAdminInviteView, type FirstAdminOrganization, type FirstAdminResult } from "./first-admin-contract";

interface InviteRow {
  id: string; org_id: string; recipient_email: string; role: "RH_ADMIN"; token_hash: string;
  request_id: string; issued_by: string; expires_at: string;
  accepted_by: string | null; accepted_at: string | null; revoked_at: string | null;
}
interface DbResult<T> { data: T | null; error: { message?: string; code?: string } | null }
export interface FirstAdminStore {
  organization(id: string): Promise<DbResult<FirstAdminOrganization>>;
  organizations(): Promise<DbResult<FirstAdminOrganization[]>>;
  invites(): Promise<DbResult<InviteRow[]>>;
  request(actor: string, request: string): Promise<DbResult<InviteRow>>;
  token(hash: string): Promise<DbResult<InviteRow>>;
  insert(row: Pick<InviteRow, "org_id" | "recipient_email" | "token_hash" | "request_id" | "issued_by">): Promise<DbResult<InviteRow>>;
  accept(id: string, userId: string): Promise<DbResult<InviteRow>>;
  revoke(id: string, actor: string): Promise<DbResult<InviteRow>>;
}
export interface FirstAdminDeps {
  authority(token: string): Promise<PlatformAdminCheck>;
  identity(token: string): Promise<{ id: string; email: string; verified: boolean } | null>;
  store: FirstAdminStore;
}
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
function failure<T>(reason: string): FirstAdminResult<T> {
  return { ok: false, reason, message: FIRST_ADMIN_MESSAGES[reason] ?? FIRST_ADMIN_MESSAGES.unavailable! };
}
function dbFailure<T>(error: DbResult<unknown>["error"]): FirstAdminResult<T> {
  const reason = /first_admin_([a-z_]+)/.exec(error?.message ?? "")?.[1];
  if (reason && FIRST_ADMIN_MESSAGES[reason]) return failure(reason);
  if (error?.code === "23505") return failure("pending_invite");
  return failure("unavailable");
}
function view(row: InviteRow): FirstAdminInviteView {
  return { id: row.id, organizationId: row.org_id, email: row.recipient_email, role: row.role,
    expiresAt: row.expires_at, acceptedAt: row.accepted_at, revokedAt: row.revoked_at };
}
export async function listFirstAdmin(token: string, d: FirstAdminDeps = defaults()): Promise<FirstAdminResult<{ organizations: FirstAdminOrganization[]; invites: FirstAdminInviteView[] }>> {
  try {
    if (!(await d.authority(token)).authorized) return failure("forbidden");
    const [organizations, invites] = await Promise.all([d.store.organizations(), d.store.invites()]);
    if (organizations.error || invites.error) return failure("unavailable");
    return { ok: true, value: { organizations: organizations.data ?? [], invites: (invites.data ?? []).map(view) } };
  } catch { return failure("unavailable"); }
}
export async function issueFirstAdmin(input: { accessToken: string; organizationId: string; email: string; token: string; requestId: string }, d: FirstAdminDeps = defaults()): Promise<FirstAdminResult<FirstAdminInviteView>> {
  try {
    const actor = await d.authority(input.accessToken);
    if (!actor.authorized) return failure("forbidden");
    const row = { org_id: input.organizationId, recipient_email: input.email.trim().toLowerCase(), token_hash: hashToken(input.token), request_id: input.requestId, issued_by: actor.userId };
    const replay = (old: InviteRow): FirstAdminResult<FirstAdminInviteView> => {
      if (old.org_id !== row.org_id || old.recipient_email !== row.recipient_email || old.token_hash !== row.token_hash) return failure("request_conflict");
      return { ok: true, value: view(old) };
    };
    const previous = await d.store.request(actor.userId, input.requestId);
    if (previous.error) return dbFailure(previous.error);
    if (previous.data) return replay(previous.data);
    const result = await d.store.insert(row);
    if (result.error) {
      // O mesmo pedido pode ter vencido a corrida em outra conexão.
      const concurrent = await d.store.request(actor.userId, input.requestId);
      if (!concurrent.error && concurrent.data) return replay(concurrent.data);
      return dbFailure(result.error);
    }
    return result.data ? { ok: true, value: view(result.data) } : failure("unavailable");
  } catch { return failure("unavailable"); }
}
export async function acceptFirstAdmin(input: { accessToken: string; token: string }, commit: boolean, d: FirstAdminDeps = defaults()): Promise<FirstAdminResult<{ invite: FirstAdminInviteView; organization: FirstAdminOrganization | null; identity: string }>> {
  try {
    const identity = await d.identity(input.accessToken);
    if (!identity) return failure("invalid_session");
    if (!identity.verified) return failure("unverified_identity");
    const found = await d.store.token(hashToken(input.token));
    if (found.error) return dbFailure(found.error);
    const row = found.data;
    if (!row) return failure("invalid_invite");
    if (identity.email.toLowerCase() !== row.recipient_email) return failure("identity_mismatch");
    if (row.revoked_at) return failure("revoked");
    if (row.accepted_by && row.accepted_by !== identity.id) return failure("identity_mismatch");
    if (!row.accepted_at && Date.parse(row.expires_at) <= Date.now()) return failure("expired");
    let accepted = row;
    if (commit && !row.accepted_at) {
      const result = await d.store.accept(row.id, identity.id);
      if (result.error) return dbFailure(result.error);
      if (!result.data) return failure("unavailable");
      accepted = result.data;
    }
    // Consulta apenas o alvo do convite, após conferir a identidade destinatária.
    const organization = await d.store.organization(row.org_id);
    if (organization.error || !organization.data) return failure("unavailable");
    return { ok: true, value: { invite: view(accepted), organization: organization.data, identity: identity.email } };
  } catch { return failure("unavailable"); }
}
export async function revokeFirstAdmin(input: { accessToken: string; inviteId: string }, d: FirstAdminDeps = defaults()): Promise<FirstAdminResult<FirstAdminInviteView>> {
  try {
    const actor = await d.authority(input.accessToken);
    if (!actor.authorized) return failure("forbidden");
    const result = await d.store.revoke(input.inviteId, actor.userId);
    if (result.error) return dbFailure(result.error);
    return result.data ? { ok: true, value: view(result.data) } : failure("invalid_invite");
  } catch { return failure("unavailable"); }
}
function defaults(): FirstAdminDeps {
  async function db() { const { supabaseAdmin } = await import("@/integrations/supabase/client.server"); return supabaseAdmin as any; }
  const table = async () => (await db()).from("first_admin_invites");
  return {
    authority: verifyPlatformAdmin,
    async identity(token) {
      const { data, error } = await (await db()).auth.getUser(token);
      return error || !data.user?.email ? null : { id: data.user.id, email: data.user.email, verified: !!data.user.email_confirmed_at };
    },
    store: {
      async organization(id) { return (await db()).from("organizations").select("id,name,slug").eq("id", id).eq("pack_id", "enterprise").maybeSingle(); },
      async organizations() { return (await db()).from("organizations").select("id,name,slug").eq("pack_id", "enterprise").order("name").limit(200); },
      async invites() { return (await table()).select("*").order("created_at", { ascending: false }).limit(200); },
      async request(actor, request) { return (await table()).select("*").eq("issued_by", actor).eq("request_id", request).maybeSingle(); },
      async token(hash) { return (await table()).select("*").eq("token_hash", hash).maybeSingle(); },
      async insert(row) { return (await table()).insert(row).select("*").single(); },
      async accept(id, userId) { return (await table()).update({ accepted_by: userId }).eq("id", id).select("*").single(); },
      async revoke(id, actor) { return (await table()).update({ revoked_by: actor }).eq("id", id).select("*").single(); },
    },
  };
}
