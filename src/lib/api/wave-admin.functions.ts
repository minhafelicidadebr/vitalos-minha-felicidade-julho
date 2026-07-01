// Server functions de administração de ondas.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { listOrgWaves, listOrgCapsules } from "../cloud/db-adapter";
import { isCloudReady } from "../cloud/supabase-client";
import { getPlanLimits, type PlanId } from "@/engine/billing/plan-engine";

const orgIdSchema = z.string().uuid("org_id deve ser UUID válido");

const createWaveSchema = z
  .object({
    orgId: orgIdSchema,
    instrument: z.enum(["COPSOQ", "PERMA", "VIA_T"]),
    label: z.string().max(200).optional(),
    inviteCount: z.number().int().min(5).max(500),
    closesAt: z.string().datetime().optional(),
    // Opcional: um e-mail por convite, na mesma ordem. Se omitido, gera links
    // genéricos para o admin copiar manualmente (fluxo WhatsApp).
    emails: z.array(z.string().email()).max(500).optional(),
  })
  .refine((v) => !v.emails || v.emails.length === v.inviteCount, {
    message: "Número de e-mails deve ser igual ao número de convites.",
    path: ["emails"],
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
    if (!isCloudReady()) {
      return { ok: false, error: "Cloud não ativado — execute o Prompt 1 do ADR-003." };
    }
    const { createWaveAsAdmin } = await import("./wave-admin.server");
    const result = await createWaveAsAdmin(data);
    if ("error" in result) return { ok: false, error: result.error };
    return { ok: true, ...result };
  });

type WaveItem = {
  id: string; instrument: string; label: string | null; status: string;
  invitedCount: number; responseCount: number; closesAt: string | null;
  createdAt: string; sealedAt: string | null;
};

export const adminListWaves = createServerFn({ method: "GET" })
  .inputValidator(z.object({ orgId: orgIdSchema }))
  .handler(async ({ data }): Promise<{ waves: WaveItem[]; cloudReady: boolean }> => {
    if (!isCloudReady()) return { waves: [], cloudReady: false };
    const waves = await listOrgWaves(data.orgId);
    // Busca contagem de respostas para cada onda via RPC SECURITY DEFINER
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const withCounts = await Promise.all(
      waves.map(async (w) => {
        const { data: cnt } = await admin.rpc("count_wave_responses", { p_wave_id: w.id });
        return { ...w, responseCount: (cnt as number | null) ?? 0 };
      }),
    );
    return { waves: withCounts, cloudReady: true };
  });

type CapsuleItem = { id: string; waveId: string; instrument: string; participantCount: number; aggregatedAt: string };

export const adminListCapsules = createServerFn({ method: "GET" })
  .inputValidator(z.object({ orgId: orgIdSchema }))
  .handler(async ({ data }): Promise<{ capsules: CapsuleItem[]; cloudReady: boolean }> => {
    if (!isCloudReady()) return { capsules: [], cloudReady: false };
    const capsules = await listOrgCapsules(data.orgId);
    return {
      cloudReady: true,
      capsules: capsules.map((c) => ({
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
  .inputValidator(z.object({ orgId: orgIdSchema }))
  .handler(async ({ data }): Promise<{ status: PlanStatus | null; cloudReady: boolean }> => {
    if (!isCloudReady()) return { status: null, cloudReady: false };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;

    const { data: org } = await admin
      .from("organizations")
      .select("plan")
      .eq("id", data.orgId)
      .single();
    const planId = (org?.plan as string | undefined) ?? "pilot";
    const limits = getPlanLimits(planId);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const { count } = await admin
      .from("waves")
      .select("id", { count: "exact", head: true })
      .eq("org_id", data.orgId)
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

export const checkCloudStatus = createServerFn({ method: "GET" })
  .handler((): { cloudReady: boolean; message: string } => ({
    cloudReady: isCloudReady(),
    message: isCloudReady()
      ? "Lovable Cloud ativo — dados reais disponíveis."
      : "Modo demo. Ative o Cloud com o Prompt 1 do ADR-003.",
  }));
