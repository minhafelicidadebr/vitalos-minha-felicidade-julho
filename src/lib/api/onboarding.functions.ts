import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const onboardingSchema = z.object({
  userId: z.string().uuid(),
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

/** Cria organização + perfil RH_ADMIN para o primeiro login de um cliente. */
export const submitOnboarding = createServerFn({ method: "POST" })
  .inputValidator(onboardingSchema)
  .handler(async ({ data }): Promise<OnboardingOk | OnboardingErr> => {
    const { createOrgAndAdmin } = await import("./onboarding.server");
    const result = await createOrgAndAdmin(data);
    if ("error" in result) return { ok: false, error: result.error };
    return { ok: true, orgId: result.orgId };
  });
