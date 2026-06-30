// Server functions de administração de ondas.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { listOrgWaves, listOrgCapsules } from "../cloud/db-adapter";
import { isCloudReady } from "../cloud/supabase-client";

const orgIdSchema = z.string().uuid("org_id deve ser UUID válido");

const createWaveSchema = z.object({
  orgId: orgIdSchema,
  instrument: z.enum(["COPSOQ", "PERMA", "VIA_T"]),
  label: z.string().max(200).optional(),
  inviteCount: z.number().int().min(5).max(500),
  closesAt: z.string().datetime().optional(),
});

type AdminCreateWaveOk = { ok: true; waveId: string; inviteTokens: string[]; inviteLinks: string[] };
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

export const checkCloudStatus = createServerFn({ method: "GET" })
  .handler((): { cloudReady: boolean; message: string } => ({
    cloudReady: isCloudReady(),
    message: isCloudReady()
      ? "Lovable Cloud ativo — dados reais disponíveis."
      : "Modo demo. Ative o Cloud com o Prompt 1 do ADR-003.",
  }));
