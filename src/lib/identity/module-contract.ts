import { z } from "zod";
export const moduleSchema = z.enum(["Q1", "Q2"]);
export type EnterpriseModule = z.infer<typeof moduleSchema>;
export const moduleSchemas = {
  list: z.object({ accessToken: z.string().min(10) }).strict(),
  change: z
    .object({
      accessToken: z.string().min(10),
      organizationId: z.string().uuid(),
      module: moduleSchema,
      enabled: z.boolean(),
      expectedRevision: z.number().int().min(0),
      requestId: z.string().uuid(),
    })
    .strict(),
};
export interface ModuleState {
  module: EnterpriseModule;
  enabled: boolean;
  revision: number;
  updated_at?: string;
  updated_by?: string;
}
export const MODULE_MESSAGES = {
  disabled: "Módulo não habilitado para esta empresa. Contate a plataforma.",
  unavailable:
    "Não foi possível verificar a habilitação. Nenhum dado foi liberado. Tente novamente.",
  method_pending:
    "Q1 habilitado. Versão brasileira aprovada; falta comprovar a correspondência com o instrumento servido. Coleta e resultados bloqueados.",
  forbidden: "Esta operação exige autoridade da plataforma.",
  revision_conflict: "A habilitação mudou em outra sessão. Atualize antes de tentar novamente.",
  request_conflict: "Este pedido já foi usado com outro conteúdo.",
};
