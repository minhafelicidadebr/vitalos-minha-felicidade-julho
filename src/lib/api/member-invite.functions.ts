// Server functions de convite de pessoa (membro real de uma organização).
//
// Modelo de confiança: criar/listar convites exige requireOrgAdmin (o admin
// só age na PRÓPRIA org, nunca uma escolhida pelo payload). Resolver e
// aceitar um convite são as duas únicas ações que um NÃO-membro pode fazer —
// resolver é pública (mostra "org X convida você"), aceitar exige só uma
// sessão autenticada válida (resolveAuthenticatedUserId), não uma org ainda.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { isCloudReady } from "../cloud/supabase-client";
import {
  requireOrgAdmin,
  resolveAuthenticatedUserId,
  describeAuthFailure,
} from "@/lib/auth/authorize.server";

const accessTokenSchema = z.object({ accessToken: z.string().min(10) });

const createMemberInviteSchema = accessTokenSchema.extend({
  email: z.string().email(),
  role: z.string().min(1),
});

type MemberInviteOk = {
  ok: true;
  token: string;
  email: string;
  role: string;
  link: string;
};
type MemberInviteErr = { ok: false; error: string };

/** Gera o link de convite de uma pessoa (usa service role via .server.ts). */
export const createMemberInviteLink = createServerFn({ method: "POST" })
  .inputValidator(createMemberInviteSchema)
  .handler(async ({ data }): Promise<MemberInviteOk | MemberInviteErr> => {
    if (!isCloudReady()) {
      return { ok: false, error: "Cloud não ativado — execute o Prompt 1 do ADR-003." };
    }
    const auth = await requireOrgAdmin(data.accessToken);
    if (!auth.ok) return { ok: false, error: describeAuthFailure(auth.reason) };

    const { createMemberInvite } = await import("./member-invite.server");
    const result = await createMemberInvite(auth.membership.orgId, auth.membership.userId, data.email, data.role);
    if ("error" in result) return { ok: false, error: result.error };
    return { ok: true, token: result.token, email: result.email, role: result.role, link: result.link };
  });

type MemberInviteItem = {
  token: string;
  email: string;
  role: string;
  usedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  link: string;
};

export const adminListMemberInvites = createServerFn({ method: "GET" })
  .inputValidator(accessTokenSchema)
  .handler(async ({ data }): Promise<{ invites: MemberInviteItem[]; error?: string }> => {
    if (!isCloudReady()) return { invites: [] };

    const auth = await requireOrgAdmin(data.accessToken);
    if (!auth.ok) return { invites: [], error: describeAuthFailure(auth.reason) };

    const { listMemberInvites } = await import("./member-invite.server");
    return { invites: await listMemberInvites(auth.membership.orgId) };
  });

const tokenSchema = z.object({ token: z.string().min(1) });

type MemberInviteCheck =
  | { valid: true; orgName: string; roleLabel: string; email: string }
  | { valid: false; error: string };

/** Pública — mostra "{org} convida você a entrar como {papel}" antes do login. */
export const checkMemberInviteToken = createServerFn({ method: "GET" })
  .inputValidator(tokenSchema)
  .handler(async ({ data }): Promise<MemberInviteCheck> => {
    const { resolveMemberInvite } = await import("./member-invite.server");
    const result = await resolveMemberInvite(data.token);
    if (!result.valid) {
      const messages: Record<string, string> = {
        invalid_token: "Link de convite inválido.",
        already_used: "Este convite já foi utilizado.",
        expired: "Este convite expirou. Peça um novo link ao administrador.",
      };
      return { valid: false, error: messages[result.reason] };
    }
    return { valid: true, orgName: result.orgName, roleLabel: result.roleLabel, email: result.email };
  });

const acceptSchema = accessTokenSchema.extend({ token: z.string().min(1) });

type AcceptOk = { ok: true; orgId: string; role: string };
type AcceptErr = { ok: false; error: string };

/** Aceita o convite — exige sessão autenticada, mas NÃO exige perfil ainda (é o que esta ação cria). */
export const submitMemberInviteAcceptance = createServerFn({ method: "POST" })
  .inputValidator(acceptSchema)
  .handler(async ({ data }): Promise<AcceptOk | AcceptErr> => {
    const identity = await resolveAuthenticatedUserId(data.accessToken);
    if (!identity.ok) return { ok: false, error: describeAuthFailure(identity.reason) };

    const { acceptMemberInvite } = await import("./member-invite.server");
    const result = await acceptMemberInvite(data.token, identity.userId);
    if ("error" in result) return { ok: false, error: result.error };
    return { ok: true, orgId: result.orgId, role: result.role };
  });
