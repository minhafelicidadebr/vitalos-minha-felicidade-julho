import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { AggregationTriggerResult } from "./capsule-aggregator.server";
import { requireOrgAdmin, describeAuthFailure } from "@/lib/auth/authorize.server";

const TriggerInput = z.object({
  accessToken: z.string().min(10),
  waveId: z.string().uuid(),
  instrument: z.string().min(1),
  // packId deliberadamente AUSENTE: o servidor resolve o pack da organização
  // dona da onda (organizations.pack_id) — nunca confia no payload (P0-04).
});

// Fechar/agregar uma onda é ação administrativa (sela dados, irreversível) —
// exige o papel admin do setor. authorizedOrgId (P0-04) garante que a onda
// pertence à organização de quem chama, verificado dentro de
// triggerCapsuleAggregation antes de qualquer leitura de resposta individual.
export const checkAndAggregateCapsule = createServerFn({ method: "POST" })
  .inputValidator(TriggerInput)
  .handler(async ({ data }): Promise<AggregationTriggerResult | { triggered: false; count: 0; reason: string }> => {
    const auth = await requireOrgAdmin(data.accessToken);
    if (!auth.ok) return { triggered: false, count: 0, reason: describeAuthFailure(auth.reason) };

    const { triggerCapsuleAggregation } = await import("./capsule-aggregator.server");
    return triggerCapsuleAggregation(data.waveId, data.instrument, auth.membership.orgId);
  });

// Variante por token — usada pelo /responder após submit bem-sucedido.
// Resolve token → wave_id server-side; nunca expõe waveId ao cliente. O
// token JÁ é a autorização (só existe se um convite válido foi consumido
// para essa onda específica) — não precisa de sessão nem de accessToken.
export const checkAndAggregateByToken = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string().min(1) }))
  .handler(async ({ data }): Promise<AggregationTriggerResult> => {
    const { triggerCapsuleAggregationByToken } = await import("./capsule-aggregator.server");
    return triggerCapsuleAggregationByToken(data.token);
  });
