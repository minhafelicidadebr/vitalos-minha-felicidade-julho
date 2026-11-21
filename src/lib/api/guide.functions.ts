// Guia da Jornada · "Meu percurso": contexto e conteúdo para a sessão institucional.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const loadGuideJourneyFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ accessToken: z.string().min(10).optional() }).strict())
  .handler(async ({ data }) => (await import("@/lib/guide/guide-context.server")).loadGuideJourney(data));
