// Server-only: cria org + profile para o primeiro admin de um cliente.
// Usa supabaseAdmin (service role) para INSERT sem restrição de RLS.
//
// Self-serve fechado: nenhuma organização nasce sem um inviteToken válido
// gerado por um admin da PLATAFORMA (ver org-invite.server.ts). O token é
// revalidado aqui — nunca confiar apenas na validação já feita na tela.
//
// Setor × plano: o SETOR (packId) é uma escolha do cliente — ele sabe se é
// empresa/escola/governo/condomínio/saúde melhor do que quem gerou o link.
// O PLANO nunca é escolha do cliente — vem do invite (decisão comercial do
// admin da plataforma) e cai em 'pilot' na ausência, nunca num valor
// enviado pelo formulário. Isso fecha a brecha de auto-upgrade sem cobrança.

import { resolvePackBundle, REGISTERED_PACK_IDS, DEFAULT_PACK_ID } from "@/domain/packs/registry";

/** Papel atribuído ao primeiro admin de cada setor — declarado no próprio pack (orgAdminRole). */
function resolveOrgAdminRole(packId: string): string {
  const pack = resolvePackBundle(packId).pack as unknown as { orgAdminRole?: string };
  return pack.orgAdminRole ?? "RH_ADMIN";
}

export interface OnboardingInput {
  userId: string;
  orgName: string;
  orgSlug: string;
  packId: string;
  cnpj: string;
  teamSizeBand: string;
  phone: string;
  address?: string;
  segment?: string;
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

  // 2. Revalida o setor — nunca confiar apenas na validação já feita na tela
  // (mesma doutrina do token: o cliente controla o payload, o servidor decide).
  const packId = REGISTERED_PACK_IDS.includes(input.packId) ? input.packId : DEFAULT_PACK_ID;

  // 3. Cria a organização — plano vem do convite (nunca do formulário do cliente).
  const { data: org, error: orgErr } = await admin
    .from("organizations")
    .insert({
      slug: input.orgSlug,
      name: input.orgName,
      pack_id: packId,
      plan: invite.plan ?? "pilot",
      cnpj: input.cnpj.trim(),
      team_size_band: input.teamSizeBand,
      phone: input.phone.trim(),
      address: input.address?.trim() || null,
      segment: input.segment?.trim() || null,
    })
    .select("id")
    .single();

  if (orgErr || !org) {
    if (orgErr?.code === "23505") return { error: "Já existe uma organização com este slug." };
    return { error: orgErr?.message ? `Falha ao criar organização (${orgErr.message}).` : "Falha ao criar organização." };
  }

  // 4. Cria o perfil do admin — papel varia por setor (líder/diretor/síndico/...).
  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .insert({
      id: input.userId,
      org_id: org.id,
      role: resolveOrgAdminRole(packId),
      display_name: input.orgName,
    })
    .select("id")
    .single();

  if (profileErr || !profile) {
    return { error: "Falha ao criar perfil do administrador." };
  }

  // 5. Consome o convite — nunca mais pode ser reusado.
  await consumeOrgInvite(input.inviteToken, org.id);

  return { orgId: org.id, profileId: profile.id };
}
