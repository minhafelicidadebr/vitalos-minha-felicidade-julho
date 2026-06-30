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
  packId: z.enum(["enterprise", "health", "government", "condo", "school"]).optional(),
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
