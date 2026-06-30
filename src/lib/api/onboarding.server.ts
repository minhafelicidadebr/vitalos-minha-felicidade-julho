// Server-only: cria org + profile para o primeiro admin de um cliente.
// Usa supabaseAdmin (service role) para INSERT sem restrição de RLS.

export interface OnboardingInput {
  userId: string;
  orgName: string;
  orgSlug: string;
  packId?: string;
}

export interface OnboardingResult {
  orgId: string;
  profileId: string;
}

export async function createOrgAndAdmin(
  input: OnboardingInput,
): Promise<OnboardingResult | { error: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as any;

  // 1. Cria a organização
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

  // 2. Cria o perfil do admin
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

  return { orgId: org.id, profileId: profile.id };
}
