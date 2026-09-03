// Server functions do snapshot imutável do Dossiê ESG (I-E1, §F4).
//
// Modelo de confiança (mesma disciplina de wave-admin.functions.ts, P0-04):
// nenhuma função aqui aceita orgId do cliente. O chamador manda o
// access_token da própria sessão; o servidor resolve a organização real via
// resolveOrgMembership/requireOrgAdmin — nunca uma escolhida pelo payload.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  createEsgSnapshotAsAdmin,
  listEsgSnapshotsForOrg,
  type EsgSnapshotSummary,
} from "../esg/esg-snapshot.server";
import { isCloudReady } from "../cloud/supabase-client";
import { describeAuthFailure, requireOrgAdmin, resolveOrgMembership } from "@/lib/auth/authorize.server";
import { isCapabilityEnabled } from "@/lib/capabilities/registry";

const accessTokenSchema = z.object({ accessToken: z.string().min(10) });

// ─── Listar snapshots (leitura — qualquer membro) ───────────────────────────

export type ListEsgSnapshotsResult =
  | { cloudReady: false }
  | { cloudReady: true; error: string }
  | { cloudReady: true; snapshots: EsgSnapshotSummary[] };

export const loadEsgSnapshots = createServerFn({ method: "GET" })
  .inputValidator(accessTokenSchema.extend({ year: z.number().int().optional() }))
  .handler(async ({ data }): Promise<ListEsgSnapshotsResult> => {
    if (!isCapabilityEnabled("ESG_ASSURANCE_SNAPSHOT")) return { cloudReady: false };
    if (!isCloudReady()) return { cloudReady: false };

    const auth = await resolveOrgMembership(data.accessToken);
    if (!auth.ok) return { cloudReady: true, error: describeAuthFailure(auth.reason) };

    const snapshots = await listEsgSnapshotsForOrg(auth.membership.orgId, data.year);
    return { cloudReady: true, snapshots };
  });

// ─── Selar um snapshot (admin) ───────────────────────────────────────────────

const createSchema = accessTokenSchema.extend({
  year: z.number().int().min(2020).max(2100),
  payload: z.record(z.string(), z.unknown()),
});

export const createEsgSnapshot = createServerFn({ method: "POST" })
  .inputValidator(createSchema)
  .handler(async ({ data }) => {
    if (!isCapabilityEnabled("ESG_ASSURANCE_SNAPSHOT")) {
      return { accepted: false as const, reason: "capability_disabled", snapshotId: null, contentHash: null };
    }
    if (!isCloudReady()) {
      return { accepted: false as const, reason: "cloud_not_ready", snapshotId: null, contentHash: null };
    }

    const auth = await requireOrgAdmin(data.accessToken);
    if (!auth.ok) {
      return {
        accepted: false as const,
        reason: describeAuthFailure(auth.reason),
        snapshotId: null,
        contentHash: null,
      };
    }

    return createEsgSnapshotAsAdmin(auth.membership.orgId, data.year, data.payload, auth.membership.userId);
  });
