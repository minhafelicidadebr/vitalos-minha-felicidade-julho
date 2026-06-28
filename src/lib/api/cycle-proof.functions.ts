import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { buildCycleProof } from "../proof/cycle-proof.server";

const packIdSchema = z.string().min(2).max(40);

/**
 * Monta a Prova de Ciclo de um pack (medir → provar → custo evitado). Chamada pelo
 * Panorama Executivo / board. Retorna só leituras e números seguros (sem capsule bruto).
 */
export const getCycleProof = createServerFn({ method: "GET" })
  .inputValidator(z.object({ packId: packIdSchema }))
  .handler(({ data }) => buildCycleProof(data.packId));
