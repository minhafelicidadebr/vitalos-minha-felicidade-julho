// Pack GOVERNO (CidadanIA) — dados de demonstração. Prova que os motores são
// setor-agnósticos: o MESMO calculateIVO/pulse consome o igv-framework.json
// (Vitalidade Governamental) sem nenhuma mudança de engine.
// Agregados fictícios (k≥5). Nenhum dado real de servidor.
// Perfil realista: órgão com propósito forte mas autonomia e infraestrutura
// pressionadas — retrato honesto do serviço público brasileiro.

import type { IVOInput } from "@/engine/index/ivo-engine";

export const GOVERNMENT_CYCLE: IVOInput = {
  organizationId: "orgao-demo",
  cycleId: "2026-S1",
  aggregates: [
    // SERVIDOR
    { pillarId: "vigor_funcional", mean: 3.1, n: 280 },
    { pillarId: "proposito_publico", mean: 3.8, n: 280 },
    { pillarId: "crescimento_carreira", mean: 2.9, n: 280 },
    { pillarId: "equilibrio_srv", mean: 2.8, n: 280 },
    // SEÇÃO
    { pillarId: "cooperacao_secao", mean: 3.4, n: 275 },
    { pillarId: "seguranca_psicologica_gov", mean: 3.1, n: 275 },
    { pillarId: "reconhecimento_pares_gov", mean: 2.9, n: 275 },
    { pillarId: "comunicacao_transparencia", mean: 3.0, n: 275 },
    // GESTÃO PÚBLICA
    { pillarId: "clareza_criterios", mean: 2.8, n: 270 },
    { pillarId: "justica_imparcialidade", mean: 2.7, n: 270 },
    { pillarId: "suporte_desenvolvimento", mean: 2.9, n: 270 },
    { pillarId: "cuidado_servidor", mean: 3.0, n: 270 },
    // INSTITUIÇÃO
    { pillarId: "condicoes_infraestrutura", mean: 2.8, n: 280 },
    { pillarId: "cultura_servico_publico", mean: 3.2, n: 280 },
    { pillarId: "inclusao_equidade_gov", mean: 3.3, n: 280 },
    { pillarId: "transparencia_bem_comum", mean: 3.4, n: 280 },
  ],
};

export const GOVERNMENT_ORG = {
  name: "Secretaria de Gestão de Pessoas — Demo (CidadanIA)",
  totalServers: 520,
  participationRate: 74,
} as const;

// Ciclo anterior — deltas modestos mas honestos (serviço público evolui devagar)
export const GOVERNMENT_CYCLE_PREVIOUS: IVOInput = {
  organizationId: "orgao-demo",
  cycleId: "2025-S2",
  aggregates: [
    { pillarId: "vigor_funcional", mean: 3.0, n: 268 },
    { pillarId: "proposito_publico", mean: 3.7, n: 268 },
    { pillarId: "crescimento_carreira", mean: 2.8, n: 268 },
    { pillarId: "equilibrio_srv", mean: 2.7, n: 268 },
    { pillarId: "cooperacao_secao", mean: 3.2, n: 264 },
    { pillarId: "seguranca_psicologica_gov", mean: 3.0, n: 264 },
    { pillarId: "reconhecimento_pares_gov", mean: 2.8, n: 264 },
    { pillarId: "comunicacao_transparencia", mean: 2.9, n: 264 },
    { pillarId: "clareza_criterios", mean: 2.7, n: 260 },
    { pillarId: "justica_imparcialidade", mean: 2.6, n: 260 },
    { pillarId: "suporte_desenvolvimento", mean: 2.8, n: 260 },
    { pillarId: "cuidado_servidor", mean: 2.9, n: 260 },
    { pillarId: "condicoes_infraestrutura", mean: 2.7, n: 268 },
    { pillarId: "cultura_servico_publico", mean: 3.1, n: 268 },
    { pillarId: "inclusao_equidade_gov", mean: 3.2, n: 268 },
    { pillarId: "transparencia_bem_comum", mean: 3.3, n: 268 },
  ],
};

// Curva longitudinal — 5 ciclos, com melhora gradual típica do setor público
const GOV_CYCLE_LABELS = ["2024-S2", "2025-S1", "2025-S2", "2026-S1"];
const GOV_DRIFT = [0.91, 0.94, 0.97, 1.0];
export const GOVERNMENT_TREND_CYCLES: IVOInput[] = GOV_CYCLE_LABELS.map((label, i) => ({
  organizationId: GOVERNMENT_CYCLE.organizationId,
  cycleId: label,
  aggregates: GOVERNMENT_CYCLE.aggregates.map((a) => ({
    ...a,
    mean: Math.max(1, Math.min(5, Math.round(a.mean * GOV_DRIFT[i]! * 100) / 100)),
  })),
}));

// Cabeçalho narrativo da home de gestão (/governo). Vocabulário institucional do
// serviço público — pergunta-guia, não números nus (assinatura Fable 5 §5.7).
export const GOVERNMENT_INTRO = {
  eyebrow: "Painel da Alta Direção · Vitalidade Governamental",
  title: "A vitalidade viva do seu órgão público",
  lead: "O IGV em quatro lentes — servidor, seção, gestão pública e instituição — lido pela direção em uma página: onde o propósito sustenta, onde a carreira e a infraestrutura pressionam, e para onde a curva aponta.",
  focusLabel: "Onde focar primeiro",
  focusNote: "A lente com a pergunta mais aberta hoje — agregado, k≥5, sem expor nenhum servidor.",
  momentumLead: "A trajetória do órgão, ciclo a ciclo:",
} as const;
