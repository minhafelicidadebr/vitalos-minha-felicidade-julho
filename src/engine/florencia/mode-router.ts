// Mode Router — deriva o modo M.E.T.E. a partir da intenção. Determinístico,
// puro. `intent` nunca vem acompanhado de `mode` no CTA Registry — este é o
// ÚNICO lugar que decide o modo (ajuste 4: mode nunca é confiado ao CTA).

export type MeteMode = "mensurar" | "educar" | "transformar" | "evoluir";

const INTENT_TO_MODE: Record<string, MeteMode> = {
  explain_mechanism: "educar",
  prepare_conversation: "transformar",
  create_team_mission: "transformar",
  suggest_observation: "evoluir",
  organize_evidence: "evoluir",
};

/** Retorna null para intent desconhecida — nunca inventa um modo. */
export function resolveMode(intent: string): MeteMode | null {
  return INTENT_TO_MODE[intent] ?? null;
}
