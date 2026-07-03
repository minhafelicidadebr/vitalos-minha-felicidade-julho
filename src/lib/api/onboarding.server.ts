// Server-only: cria org + profile para o primeiro admin de um cliente.
//
// Atomicidade (P0-05, Sprint S2): toda a criação acontece dentro de UMA
// transação no banco via RPC `provision_organization_from_invite` — validar
// convite, checar e-mail vinculado, criar organização, criar perfil e
// consumir o convite não são mais passos HTTP separados. Duas requisições
// simultâneas com o mesmo token nunca produzem duas organizações: a segunda
// espera a primeira terminar (trava de linha dentro da RPC) e recebe
// 'already_used' sem escrever nada. Ver a migration para o mecanismo exato.
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

/** Motivos que a RPC devolve na coluna `error` — traduzidos para o usuário. */
const RPC_ERROR_MESSAGES: Record<string, string> = {
  invalid_token: "Link de convite inválido.",
  already_used: "Este convite já foi utilizado.",
  expired: "Este convite expirou. Peça um novo link ao administrador.",
  email_mismatch: "Este convite foi enviado para outro e-mail.",
  slug_taken: "Já existe uma organização com este slug.",
};

export async function createOrgAndAdmin(
  input: OnboardingInput,
): Promise<OnboardingResult | { error: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as any;

  // Setor e papel são configuração de domínio (registry de packs) — resolvidos
  // em JS, nunca em SQL. Revalida o setor: nunca confiar apenas na tela.
  const packId = REGISTERED_PACK_IDS.includes(input.packId) ? input.packId : DEFAULT_PACK_ID;
  const role = resolveOrgAdminRole(packId);

  const { data, error } = await admin.rpc("provision_organization_from_invite", {
    p_invite_token: input.inviteToken,
    p_user_id: input.userId,
    p_org_name: input.orgName,
    p_org_slug: input.orgSlug,
    p_pack_id: packId,
    p_role: role,
    p_cnpj: input.cnpj.trim(),
    p_team_size_band: input.teamSizeBand,
    p_phone: input.phone.trim(),
    p_address: input.address?.trim() || null,
    p_segment: input.segment?.trim() || null,
  });

  // Erro de transporte/transação (ex.: perfil já existia para este usuário —
  // ver comentário na migration sobre por que esse caso propaga em vez de
  // ser capturado graciosamente: garante rollback completo, incluindo a
  // organização recém-criada).
  if (error) {
    return { error: `Falha ao provisionar organização (${error.message}).` };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { error: "Falha ao provisionar organização." };
  if (row.error) return { error: RPC_ERROR_MESSAGES[row.error as string] ?? "Convite inválido." };

  return { orgId: row.org_id as string, profileId: row.profile_id as string };
}
