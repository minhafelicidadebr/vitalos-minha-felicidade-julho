// Relatório Global ESG — copy de domínio e fatos. A montagem dos KPIs é feita ao
// vivo na rota, compondo IVO/PERMA, VIA-T, FIB-T, COPSOQ e Evidência. Aqui vivem:
// a jornada anual (4 trimestres), a metodologia (ciência por instrumento), os
// rótulos de ODS e o fato de Domínio B (COPSOQ) que ainda não tem motor próprio.

import type { QuarterSummary, MethodologyEntry } from "@/engine/esg-report/esg-report-engine";

// Prontidão COPSOQ/Domínio B (risco-invertido, 0–1000). Em produção viria do
// módulo de SST; aqui é um fato declarado, agregado (k≥5).
export const COPSOQ_READINESS = 612;

export const ODS_LABEL: Record<string, string> = {
  "ODS 3": "Saúde e Bem-Estar",
  "ODS 4": "Educação de Qualidade",
  "ODS 5": "Igualdade de Gênero",
  "ODS 8": "Trabalho Decente",
  "ODS 10": "Redução das Desigualdades",
  "ODS 12": "Consumo Responsável",
  "ODS 13": "Ação Climática",
  "ODS 16": "Paz, Justiça e Instituições",
};

// Jornada anual — ordem do programa (compliance como cunha → ecossistema →
// performance → cultura), espelhando o anexo FT Wellbeing.
export const JOURNEY_QUARTERS: QuarterSummary[] = [
  {
    quarter: "T1",
    lensName: "COPSOQ — Compliance",
    instrument: "COPSOQ II / NR-1",
    highlight: "Blindagem jurídica e mapa de risco psicossocial.",
  },
  {
    quarter: "T2",
    lensName: "FIB-T — Ecossistema",
    instrument: "FIB-T (Furtado, 2020)",
    highlight: "A felicidade que o sistema sustenta: território, saúde e bem-comum.",
  },
  {
    quarter: "T3",
    lensName: "PERMA+V — Performance",
    instrument: "PERMA+V → IVO",
    highlight: "Florescimento e capital psicológico convertidos em IVO.",
  },
  {
    quarter: "T4",
    lensName: "VIA-T — Cultura",
    instrument: "VIA-T v1",
    highlight: "Forças de caráter e cultura de potência.",
  },
];

export const METHODOLOGY: MethodologyEntry[] = [
  {
    instrument: "COPSOQ II / NR-1",
    measures: "Exposição a fatores de risco psicossocial (Domínio B).",
    science: "Copenhagen Psychosocial Questionnaire · NR-1/GRO (Guia MTE 2026).",
  },
  {
    instrument: "FIB-T",
    measures: "Ecossistema de vida em 9 domínios (padrão de vida, saúde, tempo, comunidade…).",
    science: "Escala de Felicidade Interna Bruta do Trabalhador — Furtado, C. A. (2020).",
  },
  {
    instrument: "PERMA+V → IVO",
    measures: "Florescimento (Emoções, Engajamento, Relações, Significado, Realização).",
    science: "Seligman (2011) · validação brasileira 2026 (α=0,92).",
  },
  {
    instrument: "VIA-T v1",
    measures: "Forças de caráter percebidas no trabalho + condições de uso (ICUFT).",
    science: "Inspirado na ciência VIA (Peterson & Seligman) — instrumento autoral exploratório.",
  },
  {
    instrument: "Tradução ESG",
    measures: "Conversão dos índices em prontidão para ESRS S1, ODS, GRI e FIB.",
    science: "Mapeamento auditável IVO/FIB-T → datapoints de mercado.",
  },
];

export const REPORT_INTRO = {
  eyebrow: "Relatório Global ESG · Síntese Anual",
  title: "O ano da vitalidade, provado por dado",
  lead:
    "A jornada de 12 meses pelas quatro lentes — COPSOQ, FIB-T, PERMA+V e VIA-T — consolidada " +
    "nas três dimensões ESG. Cada indicador é rastreável ao seu instrumento e a um Objetivo de " +
    "Desenvolvimento Sustentável. Não é discurso: é o sistema instalado e o efeito medido.",
  methodologyLead:
    "Quatro instrumentos científicos, uma jornada longitudinal. Cada trimestre gera o dado do " +
    "próximo, transformando diagnóstico em predição e cultura em evidência.",
  disclaimer:
    "Relatório indicativo de prontidão ESG, agregado (k≥5). Não constitui asseguração contábil " +
    "ou auditoria independente; traduz índices internos (experimentais) para a linguagem de " +
    "mercado, para apoiar — não substituir — o relatório oficial de sustentabilidade.",
};
