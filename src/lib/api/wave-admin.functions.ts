// Server functions de administração de ondas — sem créditos Lovable.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createWave, listOrgWaves, listOrgCapsules } from "../cloud/db-adapter";
import { isCloudReady } from "../cloud/supabase-client";

const orgIdSchema = z.string().uuid("org_id deve ser UUID válido");

const createWaveSchema = z.object({
  orgId: orgIdSchema,
  instrument: z.enum(["COPSOQ", "PERMA", "VIA_T"]),
  label: z.string().max(200).optional(),
  inviteCount: z.number().int().min(5).max(500),
  closesAt: z.string().datetime().optional(),
});

// Tipos de retorno simplificados para satisfazer ValidateSerializableMapped do TanStack
type AdminCreateWaveOk = {
  ok: true;
  waveId: string;
  inviteTokens: string[];
  inviteLinks: string[];
};
type AdminCreateWaveErr = { ok: false; error: string };

/** Cria uma onda + N tokens de convite. Retorna os links para envio via WhatsApp/email. */
export const adminCreateWave = createServerFn({ method: "POST" })
  .inputValidator(createWaveSchema)
  .handler(async ({ data }): Promise<AdminCreateWaveOk | AdminCreateWaveErr> => {
    if (!isCloudReady()) {
      return { ok: false, error: "Cloud não ativado — execute o Prompt 1 do ADR-003 no Lovable." };
    }
    const result = await createWave(data);
    if (!result) return { ok: false, error: "Falha ao criar onda no banco." };
    return { ok: true, ...result };
  });

type WaveItem = {
  id: string;
  instrument: string;
  label: string | null;
  status: string;
  invitedCount: number;
  closesAt: string | null;
  createdAt: string;
  sealedAt: string | null;
};

/** Lista ondas da organização (painel de gestão). */
export const adminListWaves = createServerFn({ method: "GET" })
  .inputValidator(z.object({ orgId: orgIdSchema }))
  .handler(async ({ data }): Promise<{ waves: WaveItem[]; cloudReady: boolean }> => {
    if (!isCloudReady()) return { waves: [], cloudReady: false };
    const waves = await listOrgWaves(data.orgId);
    return { waves, cloudReady: true };
  });

type CapsuleItem = {
  id: string;
  waveId: string;
  instrument: string;
  participantCount: number;
  aggregatedAt: string;
};

/** Lista capsules publicados (relatórios reais). Dimensões omitidas — pesadas para serializar aqui. */
export const adminListCapsules = createServerFn({ method: "GET" })
  .inputValidator(z.object({ orgId: orgIdSchema }))
  .handler(async ({ data }): Promise<{ capsules: CapsuleItem[]; cloudReady: boolean }> => {
    if (!isCloudReady()) return { capsules: [], cloudReady: false };
    const capsules = await listOrgCapsules(data.orgId);
    return {
      cloudReady: true,
      capsules: capsules.map((c) => ({
        id: c.id,
        waveId: c.waveId,
        instrument: c.instrument,
        participantCount: c.participantCount,
        aggregatedAt: c.aggregatedAt,
      })),
    };
  });

/** Verifica se o Cloud está pronto (usado na tela de onboarding). */
export const checkCloudStatus = createServerFn({ method: "GET" })
  .handler((): { cloudReady: boolean; message: string } => ({
    cloudReady: isCloudReady(),
    message: isCloudReady()
      ? "Lovable Cloud ativo — dados reais disponíveis."
      : "Modo demo — dados mocados. Ative o Cloud com o Prompt 1 do ADR-003.",
  }));
