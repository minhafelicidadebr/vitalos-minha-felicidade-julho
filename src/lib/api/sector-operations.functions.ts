import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { describeAuthFailure, requireOrgAdmin } from "@/lib/auth/authorize.server";
import { FIBT_PILOT_DISABLED_REASON, isFibtPilotEnabled } from "@/lib/fibt/fibt-pilot-flag";

const sessionSchema = z.object({
  accessToken: z.string().min(10),
  waveId: z.string().uuid(),
});

const pilotDisabled = () => !isFibtPilotEnabled();

export const adminListWaveSectorOperations = createServerFn({ method: "GET" })
  .inputValidator(sessionSchema)
  .handler(async ({ data }) => {
    if (pilotDisabled()) return { ok: false as const, error: FIBT_PILOT_DISABLED_REASON };
    const auth = await requireOrgAdmin(data.accessToken);
    if (!auth.ok) return { ok: false as const, error: describeAuthFailure(auth.reason) };

    const { listWaveSectorOperationsAsAdmin } =
      await import("@/lib/survey/sector-operations-admin.server");
    return listWaveSectorOperationsAsAdmin(auth.membership.orgId, data.waveId);
  });

export const adminCreateWaveSector = createServerFn({ method: "POST" })
  .inputValidator(
    sessionSchema.extend({
      key: z.string().min(1).max(80),
      label: z.string().min(2).max(80),
    }),
  )
  .handler(async ({ data }) => {
    if (pilotDisabled()) return { created: false as const, error: FIBT_PILOT_DISABLED_REASON };
    const auth = await requireOrgAdmin(data.accessToken);
    if (!auth.ok) return { created: false as const, error: describeAuthFailure(auth.reason) };

    const { createWaveSectorAsAdmin } = await import("@/lib/survey/sector-operations-admin.server");
    return createWaveSectorAsAdmin(auth.membership.orgId, data.waveId, {
      key: data.key,
      label: data.label,
    });
  });

export const adminIssueWaveSectorLink = createServerFn({ method: "POST" })
  .inputValidator(
    sessionSchema.extend({
      cohortKey: z.string().min(2).max(40),
      expiresInDays: z.number().int().min(1).max(90).optional(),
    }),
  )
  .handler(async ({ data }) => {
    if (pilotDisabled()) return { created: false as const, error: FIBT_PILOT_DISABLED_REASON };
    const auth = await requireOrgAdmin(data.accessToken);
    if (!auth.ok) return { created: false as const, error: describeAuthFailure(auth.reason) };

    const { issueWaveSectorLinkAsAdmin } =
      await import("@/lib/survey/sector-operations-admin.server");
    return issueWaveSectorLinkAsAdmin(auth.membership.orgId, data.waveId, {
      cohortKey: data.cohortKey,
      expiresInDays: data.expiresInDays,
    });
  });

export const adminRevokeWaveSectorLink = createServerFn({ method: "POST" })
  .inputValidator(sessionSchema.extend({ linkId: z.string().uuid() }))
  .handler(async ({ data }) => {
    if (pilotDisabled()) return { revoked: false as const, error: FIBT_PILOT_DISABLED_REASON };
    const auth = await requireOrgAdmin(data.accessToken);
    if (!auth.ok) return { revoked: false as const, error: describeAuthFailure(auth.reason) };

    const { revokeWaveSectorLinkAsAdmin } =
      await import("@/lib/survey/sector-operations-admin.server");
    return revokeWaveSectorLinkAsAdmin(auth.membership.orgId, data.waveId, data.linkId);
  });
