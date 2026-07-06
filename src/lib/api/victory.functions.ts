// Server functions da Reavaliação NR-1 real e da Ata de Vitória (I-E2/I-E4).
//
// Modelo de confiança (mesma disciplina de wave-admin.functions.ts, P0-04):
// nenhuma função aqui aceita orgId do cliente. O chamador manda o
// access_token da própria sessão; o servidor resolve a organização real via
// resolveOrgMembership/requireOrgAdmin — nunca uma escolhida pelo payload.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { buildRealReavaliacaoBundle, type RealReavaliacaoBundle } from "../evolucao/reavaliacao-real.server";
import { listVictoryRecordsForOrg, sealVictoryRecordAsAdmin, type VictoryRecordSummary } from "../evolucao/victory.server";
import { isCloudReady } from "../cloud/supabase-client";
import { describeAuthFailure, requireOrgAdmin, resolveOrgMembership } from "@/lib/auth/authorize.server";

const accessTokenSchema = z.object({ accessToken: z.string().min(10) });
const instrumentSchema = z.string().min(2).max(20).default("COPSOQ");

// ─── Carregar a Reavaliação real + as Atas elegíveis (leitura — qualquer membro) ─

export type LoadRealReavaliacaoResult =
  | { cloudReady: false }
  | { cloudReady: true; error: string }
  | { cloudReady: true; bundle: RealReavaliacaoBundle };

export const loadRealReavaliacao = createServerFn({ method: "GET" })
  .inputValidator(accessTokenSchema.extend({ instrument: instrumentSchema }))
  .handler(async ({ data }): Promise<LoadRealReavaliacaoResult> => {
    if (!isCloudReady()) return { cloudReady: false };

    const auth = await resolveOrgMembership(data.accessToken);
    if (!auth.ok) return { cloudReady: true, error: describeAuthFailure(auth.reason) };

    const bundle = await buildRealReavaliacaoBundle(auth.membership.orgId, data.instrument);
    return { cloudReady: true, bundle };
  });

// ─── Listar Atas já seladas (leitura — qualquer membro) ─────────────────────

export type LoadVictoryRecordsResult =
  | { cloudReady: false }
  | { cloudReady: true; error: string }
  | { cloudReady: true; records: VictoryRecordSummary[] };

export const loadVictoryRecords = createServerFn({ method: "GET" })
  .inputValidator(accessTokenSchema)
  .handler(async ({ data }): Promise<LoadVictoryRecordsResult> => {
    if (!isCloudReady()) return { cloudReady: false };

    const auth = await resolveOrgMembership(data.accessToken);
    if (!auth.ok) return { cloudReady: true, error: describeAuthFailure(auth.reason) };

    const records = await listVictoryRecordsForOrg(auth.membership.orgId);
    return { cloudReady: true, records };
  });

// ─── Selar uma Ata elegível (admin) ──────────────────────────────────────────
// O cliente manda a Ata JÁ COMPUTADA (vinda de loadRealReavaliacao, que só
// devolve Atas para condições elegíveis — buildAtaDeVitoria nunca inventa
// vitória). O servidor não recomputa a condição aqui; a proteção real é que
// esta RPC só é alcançável via service_role depois de requireOrgAdmin.

const sealSchema = accessTokenSchema.extend({
  cycleKey: z.string().min(1).max(40),
  driverId: z.string().min(1).max(60),
  ata: z.record(z.string(), z.unknown()),
});

export const sealVictoryRecord = createServerFn({ method: "POST" })
  .inputValidator(sealSchema)
  .handler(async ({ data }) => {
    if (!isCloudReady()) {
      return { accepted: false as const, reason: "cloud_not_ready", recordId: null, contentHash: null };
    }

    const auth = await requireOrgAdmin(data.accessToken);
    if (!auth.ok) {
      return {
        accepted: false as const,
        reason: describeAuthFailure(auth.reason),
        recordId: null,
        contentHash: null,
      };
    }

    return sealVictoryRecordAsAdmin(auth.membership.orgId, data.cycleKey, data.driverId, data.ata, auth.membership.userId);
  });
