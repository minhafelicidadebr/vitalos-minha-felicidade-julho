// Pack SAÚDE (CuidarIA) — dados de demonstração. Prova que os motores são
// setor-agnósticos: o MESMO calculateIVO/pulse consome o ivs-framework.json
// (Vitalidade em Saúde) sem nenhuma mudança de engine.
// Agregados fictícios (k≥5). Nenhum dado real de profissional.
// Perfil realista do setor saúde: propósito de cuidar ALTO, mas vigor e
// recuperação BAIXOS (assinatura do burnout / lesão moral) — retrato honesto
// de quem cuida sob pressão de escala, dimensionamento e plantões.

import type { IVOInput } from "@/engine/index/ivo-engine";

export const HEALTH_CYCLE: IVOInput = {
  organizationId: "hospital-demo",
  cycleId: "2026-S1",
  aggregates: [
    // PROFISSIONAL — propósito alto contrastando com energia/recuperação baixas
    { pillarId: "vigor_clinico", mean: 2.4, n: 242 },
    { pillarId: "proposito_cuidar", mean: 4.0, n: 242 },
    { pillarId: "crescimento_competencia", mean: 3.1, n: 242 },
    { pillarId: "recuperacao_descanso", mean: 2.4, n: 242 },
    // EQUIPE ASSISTENCIAL
    { pillarId: "colaboracao_assistencial", mean: 3.6, n: 238 },
    { pillarId: "seguranca_psicologica_clinica", mean: 3.0, n: 238 },
    { pillarId: "reconhecimento_equipe_saude", mean: 2.9, n: 238 },
    { pillarId: "comunicacao_passagem", mean: 3.2, n: 238 },
    // GESTÃO CLÍNICA
    { pillarId: "clareza_protocolos", mean: 3.4, n: 235 },
    { pillarId: "justica_escala", mean: 3.0, n: 235 },
    { pillarId: "suporte_lideranca_clinica", mean: 3.1, n: 235 },
    { pillarId: "cuidado_com_cuidador", mean: 2.9, n: 235 },
    // INSTITUIÇÃO DE SAÚDE
    { pillarId: "condicoes_biosseguranca", mean: 2.9, n: 240 },
    { pillarId: "cultura_seguranca_paciente", mean: 3.2, n: 240 },
    { pillarId: "inclusao_equidade_saude", mean: 3.4, n: 240 },
    { pillarId: "proposito_institucional_saude", mean: 3.5, n: 240 },
  ],
};

export const HEALTH_ORG = {
  name: "Hospital Vida Plena — Demo (CuidarIA)",
  totalProfessionals: 640,
  participationRate: 71,
} as const;

// Ciclo anterior — melhora modesta e honesta (cultura de saúde muda devagar)
export const HEALTH_CYCLE_PREVIOUS: IVOInput = {
  organizationId: "hospital-demo",
  cycleId: "2025-S2",
  aggregates: [
    { pillarId: "vigor_clinico", mean: 2.2, n: 230 },
    { pillarId: "proposito_cuidar", mean: 3.9, n: 230 },
    { pillarId: "crescimento_competencia", mean: 3.0, n: 230 },
    { pillarId: "recuperacao_descanso", mean: 2.3, n: 230 },
    { pillarId: "colaboracao_assistencial", mean: 3.5, n: 226 },
    { pillarId: "seguranca_psicologica_clinica", mean: 2.8, n: 226 },
    { pillarId: "reconhecimento_equipe_saude", mean: 2.7, n: 226 },
    { pillarId: "comunicacao_passagem", mean: 3.1, n: 226 },
    { pillarId: "clareza_protocolos", mean: 3.3, n: 223 },
    { pillarId: "justica_escala", mean: 2.8, n: 223 },
    { pillarId: "suporte_lideranca_clinica", mean: 3.0, n: 223 },
    { pillarId: "cuidado_com_cuidador", mean: 2.7, n: 223 },
    { pillarId: "condicoes_biosseguranca", mean: 2.7, n: 228 },
    { pillarId: "cultura_seguranca_paciente", mean: 3.0, n: 228 },
    { pillarId: "inclusao_equidade_saude", mean: 3.3, n: 228 },
    { pillarId: "proposito_institucional_saude", mean: 3.4, n: 228 },
  ],
};

// Curva longitudinal — 4 ciclos, recuperação gradual pós-pressão assistencial
const HEALTH_CYCLE_LABELS = ["2024-S2", "2025-S1", "2025-S2", "2026-S1"];
const HEALTH_DRIFT = [0.91, 0.94, 0.97, 1.0];
export const HEALTH_TREND_CYCLES: IVOInput[] = HEALTH_CYCLE_LABELS.map((label, i) => ({
  organizationId: HEALTH_CYCLE.organizationId,
  cycleId: label,
  aggregates: HEALTH_CYCLE.aggregates.map((a) => ({
    ...a,
    mean: Math.max(1, Math.min(5, Math.round(a.mean * HEALTH_DRIFT[i]! * 100) / 100)),
  })),
}));

// Cabeçalho narrativo da home de gestão (/saude). Vocabulário clínico —
// pergunta-guia, não números nus (assinatura Fable 5 §5.7).
export const HEALTH_INTRO = {
  eyebrow: "Painel da Direção Clínica · Vitalidade em Saúde",
  title: "A vitalidade viva de quem cuida",
  lead: "O IVS em quatro lentes — profissional, equipe assistencial, gestão clínica e instituição — lido pela direção em uma página: onde o propósito sustenta, onde a exaustão e a escala pressionam, e para onde a curva aponta.",
  focusLabel: "Onde focar primeiro",
  focusNote:
    "A lente com a pergunta mais aberta hoje — agregado, k≥5, sem expor nenhum profissional.",
  momentumLead: "A trajetória da instituição, ciclo a ciclo:",
} as const;
