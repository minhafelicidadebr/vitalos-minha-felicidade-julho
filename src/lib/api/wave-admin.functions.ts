// Server functions de administração de ondas.
//
// Modelo de confiança (P0-04, Sprint S1): nenhuma função aqui aceita mais
// `orgId` do cliente. O chamador manda o access_token da própria sessão; o
// servidor resolve a organização e o papel REAIS via requireOrgAdmin — a
// mesma organização sempre, nunca uma escolhida pelo payload.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { listOrgWaves, listOrgCapsules, type OrgScopedReadFailure } from "../cloud/db-adapter";
import { isCloudReady } from "../cloud/supabase-client";
import { getPlanLimits, type PlanId } from "@/engine/billing/plan-engine";
import { requireOrgAdmin, resolveOrgMembership, describeAuthFailure } from "@/lib/auth/authorize.server";
import {
  FIBT_PILOT_DISABLED_REASON,
  isFibtInstrumentGateOpen,
  isFibtPilotEnabled,
} from "@/lib/fibt/fibt-pilot-flag";

/** org_mismatch nunca deveria surgir aqui (o orgId vem do mesmo requireOrgAdmin
 * que acabou de rodar) — só existe como defesa em profundidade dentro de
 * listOrgWaves/listOrgCapsules; mensagem honesta caso apareça mesmo assim. */
function describeOrgReadFailure(reason: OrgScopedReadFailure): string {
  if (reason === "org_mismatch") return "A sessão não corresponde a esta organização.";
  if (reason === "read_unavailable") return "Não foi possível consultar os registros da organização. Tente atualizar.";
  return describeAuthFailure(reason);
}

const accessTokenSchema = z.object({ accessToken: z.string().min(10) });

const createWaveSchema = accessTokenSchema
  .extend({
    instrument: z.enum(["COPSOQ", "PERMA", "VIA_T", "FIB_T"]),
    label: z.string().max(200).optional(),
    inviteCount: z.number().int().min(5).max(500),
    linkModel: z.enum(["INDIVIDUAL", "SECTOR"]).optional(),
    closesAt: z.string().datetime().optional(),
    // Opcional: um e-mail por convite, na mesma ordem. Se omitido, gera links
    // genéricos para o admin copiar manualmente (fluxo WhatsApp).
    emails: z.array(z.string().email()).max(500).optional(),
  })
  .superRefine((value, context) => {
    if (value.emails && value.emails.length !== value.inviteCount) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Número de e-mails deve ser igual ao número de convites.",
        path: ["emails"],
      });
    }
    if (value.linkModel === "SECTOR" && value.instrument !== "FIB_T") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "O modelo setorial está habilitado somente para o piloto FIB-T.",
        path: ["linkModel"],
      });
    }
    if (value.linkModel === "SECTOR" && value.emails?.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Campanhas setoriais não aceitam lista de e-mails.",
        path: ["emails"],
      });
    }
  });

type AdminCreateWaveOk = {
  ok: true;
  waveId: string;
  inviteTokens: string[];
  inviteLinks: string[];
  inviteEmails: (string | null)[];
  emailsSent: number;
  emailsAttempted: number;
};
type AdminCreateWaveErr = { ok: false; error: string };

/** Cria uma onda + N tokens (usa service role via .server.ts). */
export const adminCreateWave = createServerFn({ method: "POST" })
  .inputValidator(createWaveSchema)
  .handler(async ({ data }): Promise<AdminCreateWaveOk | AdminCreateWaveErr> => {
    // Decisão de produto (TASK 10.1): o piloto FIB-T é um gate de
    // INSTRUMENTO, não de modelo de link — isFibtInstrumentGateOpen nem
    // recebe linkModel, então o modelo de distribuição não tem como
    // influenciar esta decisão (ver comentário na função). Antes, só
    // linkModel==="SECTOR" disparava a checagem — uma onda FIB_T com
    // linkModel INDIVIDUAL (ou omitido) passava direto. instrument!==FIB_T
    // segue o caminho de sempre, sem nenhuma checagem nova
    // (COPSOQ/PERMA/VIA_T inalterados).
    if (!isFibtInstrumentGateOpen(data.instrument, isFibtPilotEnabled())) {
      return { ok: false, error: FIBT_PILOT_DISABLED_REASON };
    }
    if (!isCloudReady()) {
      return { ok: false, error: "Cloud não ativado — execute o Prompt 1 do ADR-003." };
    }
    const auth = await requireOrgAdmin(data.accessToken);
    if (!auth.ok) return { ok: false, error: describeAuthFailure(auth.reason) };

    const { createWaveAsAdmin } = await import("./wave-admin.server");
    const { accessToken: _accessToken, linkModel, ...rest } = data;
    const result = await createWaveAsAdmin({
      ...rest,
      orgId: auth.membership.orgId,
      distributionMode: linkModel === "SECTOR" ? "sector" : "individual",
    });
    if ("error" in result) return { ok: false, error: result.error };
    return { ok: true, ...result };
  });

type WaveItem = {
  id: string; instrument: string; label: string | null; status: string;
  invitedCount: number; responseCount: number; closesAt: string | null;
  createdAt: string; sealedAt: string | null;
};

export const adminListWaves = createServerFn({ method: "GET" })
  .inputValidator(accessTokenSchema)
  .handler(async ({ data }): Promise<{ waves: WaveItem[]; cloudReady: boolean; error?: string }> => {
    if (!isCloudReady()) return { waves: [], cloudReady: false };

    const auth = await requireOrgAdmin(data.accessToken);
    if (!auth.ok) return { waves: [], cloudReady: true, error: describeAuthFailure(auth.reason) };

    const { createOrgReadClient } = await import("@/lib/auth/org-read-client.server");
    const client = await createOrgReadClient(data.accessToken);
    const result = await listOrgWaves(data.accessToken, auth.membership.orgId, {
      client,
      resolveMembership: resolveOrgMembership,
    });
    if (!result.ok) return { waves: [], cloudReady: true, error: describeOrgReadFailure(result.reason) };

    // Busca contagem de respostas para cada onda via RPC SECURITY DEFINER
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const { checkInstrument } = await import("@/lib/identity/module-access.server");
    const permitted = await Promise.all(result.items.map(async w => ({ w, access: await checkInstrument(auth.membership.orgId, w.instrument) })));
    const denied = permitted.find(r => !r.access.ok);
    if (denied && !denied.access.ok) return { waves: [], cloudReady: true, error: denied.access.error };
    const withCounts = await Promise.all(
      permitted.map(async ({ w }) => {
        const { data: cnt } = await admin.rpc("count_wave_responses", { p_wave_id: w.id });
        return { ...w, responseCount: (cnt as number | null) ?? 0 };
      }),
    );
    return { waves: withCounts, cloudReady: true };
  });

type CapsuleItem = { id: string; waveId: string; instrument: string; participantCount: number; aggregatedAt: string };

export const adminListCapsules = createServerFn({ method: "GET" })
  .inputValidator(accessTokenSchema)
  .handler(async ({ data }): Promise<{ capsules: CapsuleItem[]; cloudReady: boolean; error?: string }> => {
    if (!isCloudReady()) return { capsules: [], cloudReady: false };

    const auth = await requireOrgAdmin(data.accessToken);
    if (!auth.ok) return { capsules: [], cloudReady: true, error: describeAuthFailure(auth.reason) };

    const { createOrgReadClient } = await import("@/lib/auth/org-read-client.server");
    const client = await createOrgReadClient(data.accessToken);
    const result = await listOrgCapsules(data.accessToken, auth.membership.orgId, {
      client,
      resolveMembership: resolveOrgMembership,
    });
    if (!result.ok) return { capsules: [], cloudReady: true, error: describeOrgReadFailure(result.reason) };
    const { checkWave } = await import("@/lib/identity/module-access.server");
    const permitted = await Promise.all(result.items.map(c => checkWave(auth.membership.orgId, c.waveId)));
    const denied = permitted.find(r => !r.ok);
    if (denied && !denied.ok) return { capsules: [], cloudReady: true, error: denied.error };

    return {
      cloudReady: true,
      capsules: result.items.map((c) => ({
        id: c.id, waveId: c.waveId, instrument: c.instrument,
        participantCount: c.participantCount, aggregatedAt: c.aggregatedAt,
      })),
    };
  });

type PlanStatus = {
  planId: PlanId;
  planLabel: string;
  wavesThisMonth: number;
  maxWavesPerMonth: number;
  maxInvitesPerWave: number;
  maxAdminSeats: number;
  allowedInstruments: readonly string[];
};

/** Lê o plano da org + uso corrente do mês — base para o painel de billing (Sprint 3). */
export const getOrgPlanStatus = createServerFn({ method: "GET" })
  .inputValidator(accessTokenSchema)
  .handler(async ({ data }): Promise<{ status: PlanStatus | null; cloudReady: boolean; error?: string }> => {
    if (!isCloudReady()) return { status: null, cloudReady: false };

    const auth = await requireOrgAdmin(data.accessToken);
    if (!auth.ok) return { status: null, cloudReady: true, error: describeAuthFailure(auth.reason) };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;

    const { data: org } = await admin
      .from("organizations")
      .select("plan")
      .eq("id", auth.membership.orgId)
      .single();
    const planId = (org?.plan as string | undefined) ?? "pilot";
    const limits = getPlanLimits(planId);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const { count } = await admin
      .from("waves")
      .select("id", { count: "exact", head: true })
      .eq("org_id", auth.membership.orgId)
      .gte("created_at", startOfMonth.toISOString());

    return {
      cloudReady: true,
      status: {
        planId: limits.planId,
        planLabel: limits.label,
        wavesThisMonth: count ?? 0,
        maxWavesPerMonth: limits.maxWavesPerMonth,
        maxInvitesPerWave: limits.maxInvitesPerWave,
        maxAdminSeats: limits.maxAdminSeats,
        allowedInstruments: limits.allowedInstruments,
      },
    };
  });

const closeWaveSchema = accessTokenSchema.extend({ waveId: z.string().uuid() });

/** Fecha uma onda — decisão humana autorizada (P0-08), sempre a organização real do chamador. */
export const adminCloseWave = createServerFn({ method: "POST" })
  .inputValidator(closeWaveSchema)
  .handler(async ({ data }) => {
    const auth = await requireOrgAdmin(data.accessToken);
    if (!auth.ok) return { closed: false as const, error: describeAuthFailure(auth.reason) };

    const { closeWaveAsAdmin } = await import("./wave-admin.server");
    return closeWaveAsAdmin(auth.membership.orgId, data.waveId);
  });

export const checkCloudStatus = createServerFn({ method: "GET" })
  .handler((): { cloudReady: boolean; message: string } => ({
    cloudReady: isCloudReady(),
    message: isCloudReady()
      ? "Lovable Cloud ativo — dados reais disponíveis."
      : "Modo demo. Ative o Cloud com o Prompt 1 do ADR-003.",
  }));
