// FlorescerIA shell — types and guardrails. Sector-agnostic.

export interface AIMode {
  id: string;
  label: string;
  roles: string[]; // which roles see this mode
  description: string;
}

export interface AIProposal {
  id: string;
  summary: string;
  detail: string;
  requiresApproval: true; // human-in-the-loop is an invariant, not an option
}

export interface AIResponse {
  text: string;
  proposal?: AIProposal;
}

// Guardrails enforced by the shell — every response is filtered by these.
export const AI_GUARDRAILS = {
  never: [
    "Dar diagnóstico clínico ou rótulo de saúde mental",
    "Expor dado individual de qualquer pessoa",
    "Sugerir punição ou ação disciplinar",
    "Misturar dados do Domínio A com o Domínio B",
    "Alimentar avaliação de desempenho, promoção ou remuneração",
  ],
  always: [
    "Trabalhar apenas com agregados k≥5",
    "Exigir aprovação humana para qualquer ação proposta",
    "Manter trilha de auditoria de propostas",
    "Lembrar que indicadores mostram caminhos, não culpados",
  ],
} as const;
