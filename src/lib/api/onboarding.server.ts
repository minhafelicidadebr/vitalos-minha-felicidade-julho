// Server-only: cria org + profile para o primeiro admin de um cliente.
// Usa supabaseAdmin (service role) para INSERT sem restrição de RLS.
//
// Self-serve fechado: nenhuma organização nasce sem um inviteToken válido
// gerado por um admin da PLATAFORMA (ver org-invite.server.ts). O token é
// revalidado aqui — nunca confiar apenas na validação já feita na tela.

export interface OnboardingInput {
  userId: string;
  orgName: string;
  orgSlug: string;
  packId?: string;
  inviteToken: string;
}

export interface OnboardingResult {
  orgId: string;
  profileId: string;
}

export async function createOrgAndAdmin(
  input: OnboardingInput,
): Promise<OnboardingResult | { error: string }> {
  const { resolveOrgInvite, consumeOrgInvite } = await import("./org-invite.server");

  // 0. Revalida o convite — a checagem da tela é só UX, não segurança.
  const invite = await resolveOrgInvite(input.inviteToken);
  if (!invite.valid) {
    const messages: Record<string, string> = {
      invalid_token: "Link de convite inválido.",
      already_used: "Este convite já foi utilizado.",
      expired: "Este convite expirou. Peça um novo link ao administrador.",
    };
    return { error: messages[invite.reason] ?? "Convite inválido." };
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as any;

  // 1. Se o convite foi vinculado a um e-mail específico, confere que é
  // quem está logando — impede que um token vazado seja usado por outra pessoa.
  if (invite.email) {
    const { data: authUser } = await admin.auth.admin.getUserById(input.userId);
    const actualEmail = (authUser?.user?.email as string | undefined)?.toLowerCase();
    if (actualEmail !== invite.email.toLowerCase()) {
      return { error: "Este convite foi enviado para outro e-mail." };
    }
  }

  // 2. Cria a organização
  const { data: org, error: orgErr } = await admin
    .from("organizations")
    .insert({
      slug: input.orgSlug,
      name: input.orgName,
      pack_id: input.packId ?? "enterprise",
      plan: "pilot",
    })
    .select("id")
    .single();

  if (orgErr || !org) {
    if (orgErr?.code === "23505") return { error: "Já existe uma organização com este slug." };
    return { error: "Falha ao criar organização." };
  }

  // 3. Cria o perfil do admin
  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .insert({
      id: input.userId,
      org_id: org.id,
      role: "RH_ADMIN",
      display_name: input.orgName,
    })
    .select("id")
    .single();

  if (profileErr || !profile) {
    return { error: "Falha ao criar perfil do administrador." };
  }

  // 4. Consome o convite — nunca mais pode ser reusado.
  await consumeOrgInvite(input.inviteToken, org.id);

  return { orgId: org.id, profileId: profile.id };
}
