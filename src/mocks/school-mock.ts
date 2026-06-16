// Pack ESCOLA (AlegrIA) — dados de demonstração do 2º setor. Prova viva de que
// os motores são setor-agnósticos: o MESMO calculateIVO/pulse consome o
// iev-framework.json (Vitalidade Escolar) sem nenhuma mudança de engine.
// Agregados fictícios (k≥5). Nenhum dado real de estudante ou educador.

import type { IVOInput } from "@/engine/index/ivo-engine";

export const SCHOOL_CYCLE: IVOInput = {
  organizationId: "escola-demo",
  cycleId: "2026-S1",
  aggregates: [
    { pillarId: "pertencimento_escolar", mean: 3.6, n: 120 },
    { pillarId: "engajamento_aprendizagem", mean: 3.2, n: 120 },
    { pillarId: "seguranca_emocional", mean: 3.5, n: 120 },
    { pillarId: "proposito_aprender", mean: 3.4, n: 120 },
    { pillarId: "convivencia_respeito", mean: 3.5, n: 118 },
    { pillarId: "cooperacao_pares", mean: 3.6, n: 118 },
    { pillarId: "voz_participacao", mean: 3.0, n: 118 },
    { pillarId: "ambiente_seguro", mean: 3.3, n: 118 },
    { pillarId: "realizacao_docente", mean: 3.7, n: 22 },
    { pillarId: "suporte_pedagogico", mean: 3.1, n: 22 },
    { pillarId: "desenvolvimento_professor", mean: 3.2, n: 22 },
    { pillarId: "carga_sustentavel", mean: 2.8, n: 22 },
    { pillarId: "clima_escolar", mean: 3.5, n: 140 },
    { pillarId: "inclusao_equidade", mean: 3.4, n: 140 },
    { pillarId: "familia_comunidade", mean: 3.1, n: 140 },
    { pillarId: "proposito_institucional", mean: 3.6, n: 140 },
  ],
};

export const SCHOOL_ORG = {
  name: "Colégio Horizonte (demo)",
  totalStudents: 540,
  participationRate: 81,
} as const;

// Curva longitudinal escolar — mesma técnica do trend-mock (deriva sobre o ciclo
// base). O MESMO buildTrend consome estes pontos sob o pack escolar. Determinístico.
const SCHOOL_CYCLE_LABELS = ["2024-S2", "2025-S1", "2025-S2", "2026-S1"];
const SCHOOL_DRIFT = [0.9, 0.94, 0.97, 1.0];
export const SCHOOL_TREND_CYCLES: IVOInput[] = SCHOOL_CYCLE_LABELS.map((label, i) => ({
  organizationId: SCHOOL_CYCLE.organizationId,
  cycleId: label,
  aggregates: SCHOOL_CYCLE.aggregates.map((a) => ({
    ...a,
    mean: Math.max(1, Math.min(5, Math.round(a.mean * SCHOOL_DRIFT[i]! * 100) / 100)),
  })),
}));

// Ciclo anterior (2025-S2) — médias um pouco menores, para uma trajetória honesta
// de melhora (delta positivo) quando o IEV é exibido em `/ivo` sob o pack escolar.
export const SCHOOL_CYCLE_PREVIOUS: IVOInput = {
  organizationId: "escola-demo",
  cycleId: "2025-S2",
  aggregates: [
    { pillarId: "pertencimento_escolar", mean: 3.4, n: 116 },
    { pillarId: "engajamento_aprendizagem", mean: 3.0, n: 116 },
    { pillarId: "seguranca_emocional", mean: 3.3, n: 116 },
    { pillarId: "proposito_aprender", mean: 3.2, n: 116 },
    { pillarId: "convivencia_respeito", mean: 3.3, n: 114 },
    { pillarId: "cooperacao_pares", mean: 3.4, n: 114 },
    { pillarId: "voz_participacao", mean: 2.8, n: 114 },
    { pillarId: "ambiente_seguro", mean: 3.1, n: 114 },
    { pillarId: "realizacao_docente", mean: 3.5, n: 21 },
    { pillarId: "suporte_pedagogico", mean: 2.9, n: 21 },
    { pillarId: "desenvolvimento_professor", mean: 3.0, n: 21 },
    { pillarId: "carga_sustentavel", mean: 2.6, n: 21 },
    { pillarId: "clima_escolar", mean: 3.3, n: 134 },
    { pillarId: "inclusao_equidade", mean: 3.2, n: 134 },
    { pillarId: "familia_comunidade", mean: 2.9, n: 134 },
    { pillarId: "proposito_institucional", mean: 3.4, n: 134 },
  ],
};

// Roadmap multissetorial — o Engine nasce pronto para novos packs sem mudar código.
export const SECTOR_ROADMAP = [
  { id: "enterprise", label: "Empresa", product: "VitalOS · 4 Lentes VITA", status: "ativo" },
  { id: "school", label: "Escola", product: "AlegrIA · IEV", status: "demo" },
  { id: "condominium", label: "Condomínio", product: "ConvivIA · IBEC", status: "roadmap" },
  { id: "government", label: "Cidade / Governo", product: "CidadanIA · IVC", status: "roadmap" },
  { id: "healthcare", label: "Saúde", product: "CuidarIA · IVO-Saúde", status: "roadmap" },
];

export const ESCOLA_INTRO = {
  eyebrow: "Painel da Direção · Vitalidade Escolar",
  title: "A saúde viva da sua comunidade escolar",
  lead: "O IEV em quatro lentes — estudante, turma, educador e escola — lido pela Direção em uma página: onde florescer, onde proteger, e para onde a curva aponta.",
  focusLabel: "Onde focar primeiro",
  focusNote: "A lente com a pergunta mais aberta hoje — agregado, k≥5, sem expor ninguém.",
  momentumLead: "A trajetória da escola, ciclo a ciclo:",
};

export const SETORES_INTRO = {
  eyebrow: "Multissetorial · Engine ≠ Domínio",
  title: "Os mesmos motores, qualquer setor",
  lead:
    "Toda a inteligência — IVO, Pulse, Prioridades, Trajetória, ESG, Selo — é setor-agnóstica. " +
    "O que muda entre uma empresa e uma escola é apenas o Domain Pack (JSON): lentes, pilares, " +
    "vocabulário. Nenhuma linha de motor é reescrita. É a opcionalidade que sustenta a tese de categoria.",
  proof:
    "Abaixo, o MESMO calculateIVO computa a vitalidade de uma empresa e de uma escola, lado a lado — " +
    "cada uma a partir do seu próprio framework, validado pelo mesmo schema.",
};
