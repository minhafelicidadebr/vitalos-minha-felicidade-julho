// Pack CONDOMÍNIO (ConvivIA) — dados de demonstração. Prova que os motores são
// setor-agnósticos: o MESMO calculateIVO/pulse consome o ivc-framework.json
// (Vitalidade Comunitária) sem nenhuma mudança de engine.
// Agregados fictícios (k≥5). Nenhum dado real de morador.
// Perfil realista: condomínio com boa convivência entre pares mas transparência
// de gestão e participação ainda em desenvolvimento — retrato honesto do segmento.

import type { IVOInput } from "@/engine/index/ivo-engine";

export const CONDO_CYCLE: IVOInput = {
  organizationId: "condominios-demo",
  cycleId: "2026-S1",
  aggregates: [
    // MORADOR
    { pillarId: "bem_estar_habitacional", mean: 3.8, n: 95 },
    { pillarId: "pertencimento_residencial", mean: 3.5, n: 95 },
    { pillarId: "voz_participacao_cond", mean: 2.8, n: 95 },
    { pillarId: "qualidade_seguranca", mean: 3.6, n: 95 },
    // COMUNIDADE
    { pillarId: "convivencia_respeito_cond", mean: 3.4, n: 92 },
    { pillarId: "resolucao_conflitos", mean: 2.9, n: 92 },
    { pillarId: "cooperacao_comunitaria", mean: 3.3, n: 92 },
    { pillarId: "comunicacao_condominial", mean: 3.1, n: 92 },
    // SÍNDICO | CONSELHO
    { pillarId: "clareza_normas", mean: 3.4, n: 95 },
    { pillarId: "transparencia_gestao", mean: 3.0, n: 95 },
    { pillarId: "responsividade_lideranca", mean: 3.2, n: 95 },
    { pillarId: "justica_coerencia_cond", mean: 3.1, n: 95 },
    // CONDOMÍNIO
    { pillarId: "condicoes_espacos", mean: 3.7, n: 95 },
    { pillarId: "sustentabilidade_ambiental", mean: 3.2, n: 95 },
    { pillarId: "inclusao_diversidade_cond", mean: 3.5, n: 95 },
    { pillarId: "servicos_bem_viver", mean: 3.6, n: 95 },
  ],
};

export const CONDO_ORG = {
  name: "Condomínio Horizonte Verde (demo — ConvivIA)",
  totalResidents: 186,
  participationRate: 68,
} as const;

// Ciclo anterior — condomínio em progresso: gestão e participação melhoraram
export const CONDO_CYCLE_PREVIOUS: IVOInput = {
  organizationId: "condominios-demo",
  cycleId: "2025-S2",
  aggregates: [
    { pillarId: "bem_estar_habitacional", mean: 3.7, n: 88 },
    { pillarId: "pertencimento_residencial", mean: 3.3, n: 88 },
    { pillarId: "voz_participacao_cond", mean: 2.6, n: 88 },
    { pillarId: "qualidade_seguranca", mean: 3.5, n: 88 },
    { pillarId: "convivencia_respeito_cond", mean: 3.3, n: 85 },
    { pillarId: "resolucao_conflitos", mean: 2.7, n: 85 },
    { pillarId: "cooperacao_comunitaria", mean: 3.2, n: 85 },
    { pillarId: "comunicacao_condominial", mean: 2.9, n: 85 },
    { pillarId: "clareza_normas", mean: 3.2, n: 88 },
    { pillarId: "transparencia_gestao", mean: 2.8, n: 88 },
    { pillarId: "responsividade_lideranca", mean: 3.0, n: 88 },
    { pillarId: "justica_coerencia_cond", mean: 2.9, n: 88 },
    { pillarId: "condicoes_espacos", mean: 3.5, n: 88 },
    { pillarId: "sustentabilidade_ambiental", mean: 3.0, n: 88 },
    { pillarId: "inclusao_diversidade_cond", mean: 3.3, n: 88 },
    { pillarId: "servicos_bem_viver", mean: 3.4, n: 88 },
  ],
};

// Curva longitudinal — 4 ciclos, trajetória de melhora consistente
const CONDO_CYCLE_LABELS = ["2024-S2", "2025-S1", "2025-S2", "2026-S1"];
const CONDO_DRIFT = [0.92, 0.95, 0.97, 1.0];
export const CONDO_TREND_CYCLES: IVOInput[] = CONDO_CYCLE_LABELS.map((label, i) => ({
  organizationId: CONDO_CYCLE.organizationId,
  cycleId: label,
  aggregates: CONDO_CYCLE.aggregates.map((a) => ({
    ...a,
    mean: Math.max(1, Math.min(5, Math.round(a.mean * CONDO_DRIFT[i]! * 100) / 100)),
  })),
}));

// Cabeçalho narrativo da home de gestão (/condominios). Vocabulário comunitário —
// pergunta-guia, não números nus (assinatura Fable 5 §5.7).
export const CONDO_INTRO = {
  eyebrow: "Painel da Síndica · Vitalidade Comunitária",
  title: "A vitalidade viva da sua comunidade condominial",
  lead: "O IVC em quatro lentes — morador, comunidade, liderança e condomínio — lido pela gestão em uma página: onde a convivência floresce, onde participação e transparência pedem cuidado, e para onde a curva aponta.",
  focusLabel: "Onde focar primeiro",
  focusNote: "A lente com a pergunta mais aberta hoje — agregado, k≥5, sem expor nenhuma unidade.",
  momentumLead: "A trajetória do condomínio, ciclo a ciclo:",
} as const;
