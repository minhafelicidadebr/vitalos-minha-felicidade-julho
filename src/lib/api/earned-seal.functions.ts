import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { buildEarnedSeal } from "../proof/earned-seal.server";

const packIdSchema = z.string().min(2).max(40);

/**
 * Monta o Selo Empresa Viva GANHO de um pack: o Domínio B flui da Prova de Ciclo
 * real (não de constante). Chamado pela tela /selo. Retorna o selo + a proveniência.
 */
export const getEarnedSeal = createServerFn({ method: "GET" })
  .inputValidator(z.object({ packId: packIdSchema }))
  .handler(({ data }) => buildEarnedSeal(data.packId));
