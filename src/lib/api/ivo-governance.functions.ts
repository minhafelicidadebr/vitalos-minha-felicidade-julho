// Server functions de governança metodológica (R8) e educação (R7). POST,
// `.strict()`, exigem sessão. A consulta é aberta ao administrador autenticado;
// preparar decisão exige a autoridade metodológica configurada no servidor e
// NÃO grava nada (devolve o registro para revisão e commit). Fora da allowlist HML.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const token = z.string().min(10).optional();

export const ivoGovernanceSchemas = {
  load: z.object({ accessToken: token }).strict(),
  prepare: z
    .object({
      accessToken: token,
      entryId: z.string().regex(/^[DM]\d{1,2}$/),
      toState: z.enum(["proposta", "em_revisao", "aprovado_para_piloto", "validado_para_uso_definido", "rejeitada", "retirada"]),
      owner: z.string().trim().max(80).nullable().optional(),
      reviewer: z.string().trim().max(80).nullable().optional(),
      evidence: z.array(z.string().trim().min(1).max(300)).max(10).optional(),
      criteriaMet: z.array(z.string().trim().min(1).max(300)).max(20).optional(),
      intendedUse: z.string().trim().max(500).nullable().optional(),
    })
    .strict(),
};
export const ivoEducationSchemas = { load: z.object({ accessToken: token }).strict() };

export const loadGovernanceFn = createServerFn({ method: "POST" })
  .inputValidator(ivoGovernanceSchemas.load)
  .handler(async ({ data }) => (await import("@/lib/ivo/ivo-governance.server")).loadGovernanceForSession(data));

export const prepareGovernanceDecisionFn = createServerFn({ method: "POST" })
  .inputValidator(ivoGovernanceSchemas.prepare)
  .handler(async ({ data }) => (await import("@/lib/ivo/ivo-governance.server")).prepareGovernanceDecisionForSession(data));

export const loadEducationFn = createServerFn({ method: "POST" })
  .inputValidator(ivoEducationSchemas.load)
  .handler(async ({ data }) => (await import("@/lib/ivo/ivo-education.server")).loadEducationForSession(data));
