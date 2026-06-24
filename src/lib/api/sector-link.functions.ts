import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { captureSectorLinkResponse, resolveToken } from "../survey/sector-link.server";

// Token: comprimento mínimo 20 para prevenir força bruta trivial; máximo 200.
const tokenSchema = z.string().min(20).max(200);

/** Resolve um token opaco em dados de acesso. Chamado no loader da rota pública. */
export const resolveSectorToken = createServerFn({ method: "GET" })
  .inputValidator(z.object({ token: tokenSchema }))
  .handler(({ data }) => resolveToken(data.token));

const answerSchema = z.object({
  itemId: z.string().min(1).max(120),
  value: z.number().finite(),
});

const sectorSubmitSchema = z.object({
  token: tokenSchema,
  answers: z.array(answerSchema).min(1).max(250),
  consentVersion: z.string().min(1).max(20),
});

/** Submete respostas anônimas de um sector link. submissionId gerado server-side. */
export const submitSectorLinkResponse = createServerFn({ method: "POST" })
  .inputValidator(sectorSubmitSchema)
  .handler(({ data }) =>
    captureSectorLinkResponse({
      token: data.token,
      answers: data.answers,
      consentVersion: data.consentVersion,
    }),
  );
