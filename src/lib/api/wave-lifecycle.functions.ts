import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  resolveWaveLifecycle,
  listWaveLifecycles,
  transitionWaveLifecycle,
} from "../survey/wave-lifecycle.server";

const waveIdSchema = z.string().min(3).max(120);
const packIdSchema = z.string().min(2).max(40);
const actorRoleSchema = z.string().min(2).max(40);

/** Resolve o ciclo de vida de uma onda. Chamado no loader da tela de gestão. */
export const getWaveLifecycle = createServerFn({ method: "GET" })
  .inputValidator(z.object({ waveId: waveIdSchema }))
  .handler(({ data }) => resolveWaveLifecycle(data.waveId));

/** Lista os ciclos de vida das ondas de um pack (painel do gestor). */
export const listPackWaveLifecycles = createServerFn({ method: "GET" })
  .inputValidator(z.object({ packId: packIdSchema }))
  .handler(({ data }) => listWaveLifecycles(data.packId));

const transitionSchema = z.object({
  waveId: waveIdSchema,
  action: z.enum(["publish", "open", "seal", "archive", "cancel"]),
  actorRole: actorRoleSchema,
  reason: z.string().min(1).max(200).optional(),
});

/**
 * Aplica uma transição do gestor (publish/open/seal/archive/cancel).
 * `seal` compõe o capsule da onda e o sela honestamente sob k-anon.
 */
export const transitionWave = createServerFn({ method: "POST" })
  .inputValidator(transitionSchema)
  .handler(({ data }) =>
    transitionWaveLifecycle({
      waveId: data.waveId,
      action: data.action,
      actorRole: data.actorRole,
      reason: data.reason,
    }),
  );
