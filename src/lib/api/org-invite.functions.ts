import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { OrgInviteSummary, OrgInviteResolution } from "./org-invite.server";

const accessTokenSchema = z.object({ accessToken: z.string().min(10) });

type PlatformResult<T> = ({ ok: true } & T) | { ok: false; error: string };

/** Gera um novo link de convite. Só funciona para e-mails da allowlist de admin da plataforma. */
export const createOrgInviteLink = createServerFn({ method: "POST" })
  .inputValidator(
    accessTokenSchema.extend({
      email: z.string().email().optional(),
      // Plano contratado — decisão comercial do admin da plataforma, nunca do
      // cliente. Ausente = organização nasce em 'pilot' (default seguro).
      plan: z.enum(["pilot", "growth", "enterprise"]).optional(),
    }),
  )
  .handler(async ({ data }): Promise<PlatformResult<{ invite: OrgInviteSummary }>> => {
    const { verifyPlatformAdmin, createOrgInvite } = await import("./org-invite.server");
    const check = await verifyPlatformAdmin(data.accessToken);
    if (!check.authorized) return { ok: false, error: "Acesso restrito ao administrador da plataforma." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const { data: userData } = await admin.auth.getUser(data.accessToken);

    const result = await createOrgInvite(userData.user.id, data.email, data.plan);
    if ("error" in result) return { ok: false, error: result.error };
    return { ok: true, invite: result };
  });

/** Lista os convites já gerados — mesma allowlist de admin da plataforma. */
export const listPlatformOrgInvites = createServerFn({ method: "POST" })
  .inputValidator(accessTokenSchema)
  .handler(async ({ data }): Promise<PlatformResult<{ invites: OrgInviteSummary[] }>> => {
    const { verifyPlatformAdmin, listOrgInvites } = await import("./org-invite.server");
    const check = await verifyPlatformAdmin(data.accessToken);
    if (!check.authorized) return { ok: false, error: "Acesso restrito ao administrador da plataforma." };

    const invites = await listOrgInvites();
    return { ok: true, invites };
  });

/** Resolve um token de convite — usado pela tela pública /onboarding/:token. */
export const checkOrgInviteToken = createServerFn({ method: "GET" })
  .inputValidator(z.object({ token: z.string().min(1) }))
  .handler(async ({ data }): Promise<OrgInviteResolution> => {
    const { resolveOrgInvite } = await import("./org-invite.server");
    return resolveOrgInvite(data.token);
  });
