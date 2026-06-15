// Forecast — config de domínio (não é engine). Alavancas de intervenção
// derivadas do Work-Wellbeing Playbook 2.0, cada uma mapeada aos pilares do IVO
// que ela movimenta. Os ganhos esperados são premissas orientativas calibráveis,
// nunca promessas (ver docs/instrumentos/PLAYBOOK.md).

import type {
  ForecastLever,
  ForecastPillar,
  MaturityBand,
} from "@/engine/forecast/forecast-engine";
import type { IVOResult } from "@/engine/index/ivo-engine";

// Faixas de maturidade (espelham ivo-framework.json — mock pode referenciar domínio).
export const MATURITY_BANDS: MaturityBand[] = [
  { min: 0, max: 199, name: "Organização Desperta" },
  { min: 200, max: 349, name: "Organização em Conexão" },
  { min: 350, max: 499, name: "Organização Colaborativa" },
  { min: 500, max: 649, name: "Organização Saudável" },
  { min: 650, max: 799, name: "Organização Sustentável" },
  { min: 800, max: 924, name: "Organização Referência" },
  { min: 925, max: 1000, name: "Empresa Viva" },
];

// Alavancas do Playbook → pilares do IVO. pointsPerSeason = ganho-base esperado
// por temporada (cenário médio) sobre os pilares-alvo, antes de retornos
// decrescentes. Valores conservadores, ancorados em tamanho de efeito modesto.
export const FORECAST_LEVERS: ForecastLever[] = [
  {
    id: "energia_carga",
    label: "Gestão de energia e carga",
    description: "Pausas reais, política de desconexão e redistribuição de carga.",
    targetPillarIds: ["energia_vitalidade", "condicoes_carga", "equilibrio_autonomia"],
    pointsPerSeason: 45,
    effort: "medio",
    evidenceLevel: "quasi-experimental",
  },
  {
    id: "seguranca_voz",
    label: "Segurança psicológica e voz",
    description: "Rituais de erro sem punição, discordância segura e escuta ativa.",
    targetPillarIds: ["seguranca_psicologica", "comunicacao_pertencimento"],
    pointsPerSeason: 50,
    effort: "alto",
    evidenceLevel: "meta-analise",
  },
  {
    id: "reconhecimento",
    label: "Ritual de reconhecimento específico",
    description: "Reconhecimento entre pares semanal, concreto e não genérico.",
    targetPillarIds: ["reconhecimento_pares", "cooperacao_confianca"],
    pointsPerSeason: 40,
    effort: "baixo",
    evidenceLevel: "rct",
  },
  {
    id: "proposito_impacto",
    label: "Conexão propósito-impacto",
    description: "Storytelling de impacto e mapa de contribuição de cada área.",
    targetPillarIds: ["proposito_significado", "cultura_bem_estar"],
    pointsPerSeason: 35,
    effort: "medio",
    evidenceLevel: "observacional",
  },
  {
    id: "lideranca_justica",
    label: "Justiça e cuidado da liderança",
    description: "Critérios transparentes de promoção e cuidado ativo com sobrecarga.",
    targetPillarIds: ["justica_coerencia", "cuidado_ativo", "clareza_direcao"],
    pointsPerSeason: 40,
    effort: "alto",
    evidenceLevel: "quasi-experimental",
  },
  {
    id: "desenvolvimento",
    label: "Trilhas de desenvolvimento e maestria",
    description: "Job crafting, feedback formativo e uso de forças (VIA-T).",
    targetPillarIds: ["crescimento_maestria", "desenvolvimento_pessoas"],
    pointsPerSeason: 38,
    effort: "medio",
    evidenceLevel: "rct",
  },
  {
    id: "inclusao",
    label: "Equidade e bem-comum",
    description: "Revisão de critérios de equidade e oportunidades de impacto social.",
    targetPillarIds: ["inclusao_equidade", "sustentabilidade_bem_comum"],
    pointsPerSeason: 30,
    effort: "medio",
    evidenceLevel: "observacional",
  },
];

/** Constrói os pilares de projeção a partir de um resultado do IVO. */
export function pillarsFromIvo(result: IVOResult): ForecastPillar[] {
  return result.lenses.flatMap((lens) =>
    lens.pillars.map((p) => ({
      pillarId: p.pillarId,
      name: p.pillarName,
      score: p.score,
      weight: p.weight,
      visible: p.visible,
    })),
  );
}

export const EFFORT_LABEL: Record<string, string> = {
  baixo: "Esforço baixo",
  medio: "Esforço médio",
  alto: "Esforço alto",
};

export const EVIDENCE_LABEL: Record<string, string> = {
  "meta-analise": "Meta-análise",
  rct: "Ensaio controlado",
  "quasi-experimental": "Quase-experimental",
  observacional: "Observacional",
};

export const SCENARIO_LABEL: Record<string, { label: string; gist: string }> = {
  conservador: { label: "Conservador", gist: "Metade do efeito esperado — premissa cautelosa." },
  medio: { label: "Médio", gist: "Efeito esperado central das intervenções." },
  otimista: { label: "Otimista", gist: "Execução exemplar — 1,5× o efeito central." },
};

export const FORECAST_INTRO = {
  eyebrow: "Simulador Estratégico · Trajetória de Vitalidade",
  title: "Para onde a vitalidade pode ir",
  lead:
    "Ligue as alavancas de intervenção e veja a trajetória projetada do IVO, o " +
    "custo evitável e o salto de prontidão ESG. Cada projeção é uma estimativa " +
    "orientativa baseada em evidência — não uma promessa de resultado.",
  disclaimer:
    "Projeção determinística com premissas explícitas (retornos decrescentes, recuo natural, " +
    "banda de confiança que alarga). Os ganhos por alavanca são estimativas calibráveis " +
    "ancoradas em tamanhos de efeito modestos da literatura. Não constitui garantia de " +
    "resultado nem aconselhamento financeiro.",
};
