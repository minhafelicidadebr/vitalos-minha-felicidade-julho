import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { buildSectorPgrDocument } from "../nr1/pgr-document.server";

const packIdSchema = z.string().min(2).max(40);
const sectorLabelSchema = z.string().min(1).max(120);

/**
 * Monta o dossiê GRO/PGR de um setor (documento + Markdown). Chamado pela tela de
 * relatórios/SST para visualizar ou exportar. Retorna só agregados (k-anon).
 */
export const getSectorPgrDocument = createServerFn({ method: "GET" })
  .inputValidator(z.object({ packId: packIdSchema, sectorLabel: sectorLabelSchema }))
  .handler(({ data }) => buildSectorPgrDocument(data.packId, data.sectorLabel));
