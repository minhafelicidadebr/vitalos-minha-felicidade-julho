// Profile Router — deriva o perfil de apresentação a partir de segment+role.
// Determinístico, puro. Nunca aceito como entrada confiável do CTA (ajuste 4).

export type FlorenciaProfile =
  | "INDIVIDUAL_LEARNER"
  | "LEADERSHIP_FACILITATOR"
  | "PEOPLE_OPERATIONS"
  | "EXECUTIVE_SPONSOR"
  | "RISK_STEWARD"
  | "GOVERNANCE_REVIEWER";

const SEGMENT_ROLE_TO_PROFILE: Record<string, Record<string, FlorenciaProfile>> = {
  enterprise: {
    colaborador: "INDIVIDUAL_LEARNER",
    lider: "LEADERSHIP_FACILITATOR",
    rh: "PEOPLE_OPERATIONS",
    chro: "EXECUTIVE_SPONSOR",
    clevel: "EXECUTIVE_SPONSOR",
    sst: "RISK_STEWARD",
    dpo: "GOVERNANCE_REVIEWER",
  },
};

/** Retorna null para combinação desconhecida — nunca inventa um perfil. */
export function resolveProfile(segment: string, role: string): FlorenciaProfile | null {
  return SEGMENT_ROLE_TO_PROFILE[segment]?.[role] ?? null;
}
