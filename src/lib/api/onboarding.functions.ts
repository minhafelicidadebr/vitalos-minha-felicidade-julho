import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { resolveAuthenticatedUserId, describeAuthFailure } from "@/lib/auth/authorize.server";

const onboardingSchema = z.object({
  // Identidade (P0-05): nunca um userId solto do cliente — o servidor resolve
  // quem é de verdade a partir do access_token da própria sessão.
  accessToken: z.string().min(10),
  orgName: z.string().min(2).max(120),
  orgSlug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífens"),
  // Validado contra REGISTERED_PACK_IDS dentro de createOrgAndAdmin — única
  // fonte de verdade, evita duplicar (e desalinhar) a lista de setores aqui.
  packId: z.string().min(1, "Selecione o setor da organização"),
  cnpj: z.string().min(11, "CNPJ inválido").max(32),
  teamSizeBand: z.string().min(1, "Selecione o tamanho da equipe"),
  phone: z.string().min(8, "Telefone inválido").max(32),
  address: z.string().max(200).optional(),
  segment: z.string().max(120).optional(),
  inviteToken: z.string().min(1, "Convite obrigatório"),
});

type OnboardingOk = { ok: true; orgId: string };
type OnboardingErr = { ok: false; error: string };

/** Cria organização + perfil admin (papel varia por setor) para o primeiro login de um cliente. */
export const submitOnboarding = createServerFn({ method: "POST" })
  .inputValidator(onboardingSchema)
  .handler(async ({ data }): Promise<OnboardingOk | OnboardingErr> => {
    const identity = await resolveAuthenticatedUserId(data.accessToken);
    if (!identity.ok) return { ok: false, error: describeAuthFailure(identity.reason) };

    const { createOrgAndAdmin } = await import("./onboarding.server");
    const { accessToken: _accessToken, ...rest } = data;
    const result = await createOrgAndAdmin({ ...rest, userId: identity.userId });
    if ("error" in result) return { ok: false, error: result.error };
    return { ok: true, orgId: result.orgId };
  });
