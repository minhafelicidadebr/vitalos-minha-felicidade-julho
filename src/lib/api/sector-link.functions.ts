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

/**
 * Emite um link de setor (admin da org, sessão real). O token bruto retorna
 * UMA única vez — o banco só guarda o hash. orgId vem da SESSÃO (P0-04).
 */
export const adminCreateSectorLink = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      accessToken: z.string().min(10),
      waveId: z.string().uuid(),
      sectorLabel: z.string().min(1).max(80),
      expiresInDays: z.number().int().min(1).max(365).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { requireOrgAdmin, describeAuthFailure } = await import("@/lib/auth/authorize.server");
    const auth = await requireOrgAdmin(data.accessToken);
    if (!auth.ok) return { created: false as const, error: describeAuthFailure(auth.reason) };

    const { createSectorLinkAsAdmin } = await import("@/lib/survey/sector-link-admin.server");
    return createSectorLinkAsAdmin(
      auth.membership.orgId,
      data.waveId,
      data.sectorLabel,
      data.expiresInDays,
    );
  });

/** Últimos eventos operacionais da org (P1-04) — falha visível sem SQL. */
export const adminListOpsEvents = createServerFn({ method: "GET" })
  .inputValidator(z.object({ accessToken: z.string().min(10) }))
  .handler(async ({ data }) => {
    const { requireOrgAdmin } = await import("@/lib/auth/authorize.server");
    const auth = await requireOrgAdmin(data.accessToken);
    if (!auth.ok) return { events: [] };

    const { listOpsEventsForOrg } = await import("@/lib/telemetry/ops-events.server");
    return { events: await listOpsEventsForOrg(auth.membership.orgId) };
  });
