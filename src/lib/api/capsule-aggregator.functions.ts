import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { AggregationTriggerResult } from "./capsule-aggregator.server";

const TriggerInput = z.object({
  waveId: z.string().uuid(),
  instrument: z.string().min(1),
  packId: z.string().default("enterprise"),
});

export const checkAndAggregateCapsule = createServerFn({ method: "POST" })
  .inputValidator(TriggerInput)
  .handler(async ({ data }): Promise<AggregationTriggerResult> => {
    const { triggerCapsuleAggregation } = await import("./capsule-aggregator.server");
    return triggerCapsuleAggregation(data.waveId, data.instrument, data.packId);
  });

// Variante por token — usada pelo /responder após submit bem-sucedido.
// Resolve token → wave_id server-side; nunca expõe waveId ao cliente.
export const checkAndAggregateByToken = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string().min(1) }))
  .handler(async ({ data }): Promise<AggregationTriggerResult> => {
    const { triggerCapsuleAggregationByToken } = await import("./capsule-aggregator.server");
    return triggerCapsuleAggregationByToken(data.token);
  });
