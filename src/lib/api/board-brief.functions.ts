import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { buildBoardBrief } from "../proof/board-brief.server";

const packIdSchema = z.string().min(2).max(40);

/**
 * Monta o Board Brief de um pack: o arco medir→provar→custo→selo lido pelos cinco
 * céticos, cada veredicto lastreado num número real. Chamado pelo /panorama.
 */
export const getBoardBrief = createServerFn({ method: "GET" })
  .inputValidator(z.object({ packId: packIdSchema }))
  .handler(({ data }) => buildBoardBrief(data.packId));

export type RealBoardBriefResult =
  | { available: false; reason: "cloud_not_ready" | "no_session" | "insufficient_cycles" | "module_unavailable" | "read_failed" }
  | { available: true; brief: import("../proof/board-brief.server").BoardBrief };

/**
 * Board Brief REAL (E4): o mesmo brief dos 5 céticos, sobre o Cofre de Ciclos
 * da organização da SESSÃO (nunca orgId do payload — P0-04). Exige ≥2 ciclos
 * registrados; abaixo disso devolve o motivo honesto em vez de um brief vazio.
 */
export const getRealBoardBrief = createServerFn({ method: "GET" })
  .inputValidator(z.object({ accessToken: z.string().min(10) }))
  .handler(async ({ data }): Promise<RealBoardBriefResult> => {
    const { readIdentityBoundaryStatus } = await import("@/lib/identity/identity-boundary.server");
    if (readIdentityBoundaryStatus().state !== "cloud") {
      return { available: false, reason: "cloud_not_ready" };
    }

    const { resolveOrgMembership } = await import("@/lib/auth/authorize.server");
    const auth = await resolveOrgMembership(data.accessToken);
    if (!auth.ok) return { available: false, reason: "no_session" };
    if (!(await (await import("@/lib/identity/module-access.server")).checkInstrument(auth.membership.orgId, "COPSOQ")).ok) return { available: false, reason: "module_unavailable" };

    const { loadOrgCycleHistory } = await import("@/lib/evolucao/cycle-history.server");
    // Falha de leitura nunca vira "ciclos insuficientes".
    let history: Awaited<ReturnType<typeof loadOrgCycleHistory>>;
    try {
      history = await loadOrgCycleHistory(auth.membership.orgId, "COPSOQ", { failClosed: true });
    } catch {
      return { available: false, reason: "read_failed" };
    }
    if (history.length < 2) return { available: false, reason: "insufficient_cycles" };

    const { buildBoardBriefFromHistory } = await import("../proof/board-brief.server");
    return {
      available: true,
      brief: buildBoardBriefFromHistory(history[0]!.packId, history),
    };
  });
