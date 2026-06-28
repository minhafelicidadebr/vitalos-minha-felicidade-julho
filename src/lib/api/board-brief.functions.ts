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
