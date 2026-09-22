import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { HML_SECTOR_SMOKE } from "@/lib/fibt-hml/hml-contract";
import type { HmlBackendBoundaryEnv } from "@/lib/fibt-hml/hml-backend-boundary.server";
import { authorizeFibtManagerRequest } from "@/lib/fibt/fibt-manager-access.server";

const accessSchema = z.object({
  accessToken: z.string().min(10).optional(),
  waveId: z.string().uuid().optional(),
});

const expectedHmlCohorts = HML_SECTOR_SMOKE.sectorLabels as readonly string[];

export const loadFibtManagerControlCenter = createServerFn({ method: "GET" })
  .inputValidator(accessSchema)
  .handler(async ({ data, context }) => {
    const access = await authorizeFibtManagerRequest(
      data,
      context,
      process.env as HmlBackendBoundaryEnv,
    );
    if (!access.ok) return access;

    const { loadFibtManagerControlCenterAsAdmin } =
      await import("@/lib/fibt/fibt-manager-control-center.server");
    const { advanceCohortPublication } =
      await import("@/lib/fibt/fibt-cohort-publication.server");

    // `publisherAccessToken` só existe no modo `supabase_admin`: a RPC canônica
    // que AVANÇA a publicação protegida exige identidade organizacional
    // (`auth.uid()`), e o deployment HML autentica por Cloudflare Access, sem
    // sessão Supabase. Lá o painel é somente-leitura sobre o já publicado.
    return loadFibtManagerControlCenterAsAdmin(
      access.orgId,
      access.waveId,
      access.mode === "hml_access"
        ? {
          environment: "hml_staging",
          hmlAttested: true,
          expectedCohortKeys: expectedHmlCohorts,
        }
        : {
          environment: "application",
          hmlAttested: false,
          publisherAccessToken: data.accessToken,
        },
      { advancePublication: advanceCohortPublication },
    );
  });

export const issueFibtManagerSectorLink = createServerFn({ method: "POST" })
  .inputValidator(
    accessSchema.extend({
      cohortKey: z.string().min(2).max(40),
      expiresInDays: z.number().int().min(1).max(90),
    }),
  )
  .handler(async ({ data, context }) => {
    const access = await authorizeFibtManagerRequest(
      data,
      context,
      process.env as HmlBackendBoundaryEnv,
    );
    if (!access.ok) return { created: false as const, error: access.error };

    if (access.mode === "hml_access" && !expectedHmlCohorts.includes(data.cohortKey)) {
      return { created: false as const, error: "Setor fora do lote sintético autorizado." };
    }

    const { issueWaveSectorLinkAsAdmin } =
      await import("@/lib/survey/sector-operations-admin.server");
    return issueWaveSectorLinkAsAdmin(access.orgId, access.waveId, {
      cohortKey: data.cohortKey,
      expiresInDays: data.expiresInDays,
    });
  });

export const revokeFibtManagerSectorLink = createServerFn({ method: "POST" })
  .inputValidator(accessSchema.extend({ linkId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const access = await authorizeFibtManagerRequest(
      data,
      context,
      process.env as HmlBackendBoundaryEnv,
    );
    if (!access.ok) return { revoked: false as const, error: access.error };

    if (access.mode === "hml_access") {
      const { managerLinkBelongsToExpectedCohort } =
        await import("@/lib/fibt/fibt-manager-control-center.server");
      const allowed = await managerLinkBelongsToExpectedCohort(
        access.orgId,
        access.waveId,
        data.linkId,
        expectedHmlCohorts,
      );
      if (!allowed) {
        return { revoked: false as const, error: "Link fora do lote sintético autorizado." };
      }
    }

    const { revokeWaveSectorLinkAsAdmin } =
      await import("@/lib/survey/sector-operations-admin.server");
    return revokeWaveSectorLinkAsAdmin(access.orgId, access.waveId, data.linkId);
  });
