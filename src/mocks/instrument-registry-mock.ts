// Registro dos instrumentos de mensuração — fonte única de verdade, mock-first.
// Cada entrada é auditável: versão do conteúdo, status de validação honesto, fonte citável,
// e a contagem servida vs. integral. O teste de reconciliação (instrument-registry.test.ts)
// amarra estas contagens aos itens REALMENTE aplicados no survey-mock — se divergirem, falha.
//
// Domínio A (florescimento/forças) e Domínio B (risco psicossocial) nunca se misturam.

import type { InstrumentRegistryEntry } from "@/engine/survey/instrument-registry";

export const INSTRUMENT_REGISTRY: InstrumentRegistryEntry[] = [
  // ─── Domínio A — Florescimento ──────────────────────────────────────────────
  {
    id: "perma_v",
    instrumentShort: "PERMA+V / IVO",
    label: "PERMA+V — Florescimento no Trabalho",
    version: "2026.1-br",
    validationStatus: "validado_adaptado",
    domain: "A",
    sources: [
      { citation: "Seligman, M. (2011). Flourish." },
      {
        citation: "Validação brasileira PERMA no trabalho (2026)",
        url: "https://pepsic.bvsalud.org/scielo.php?pid=S1677-04712026000100208",
      },
    ],
    servedItemCount: 15,
    integralItemCount: 15,
    scoreRange: { min: 1, max: 5 },
    isIntegralServed: true,
    notes:
      "15 itens validados (P/E/R/M/A). Bateria nativa 0–10 (PERMA-Profiler) administrada na escala " +
      "unificada 1–5 do IVO (adaptação declarada). Invariância escalar (BR 2026). Alimenta o IVO no " +
      "nível coletivo; nunca produz score individual de desempenho.",
  },
  // ─── Domínio A — Ecossistema e Bem-Comum ─────────────────────────────────────
  {
    id: "fibt",
    instrumentShort: "FIB-T",
    label: "FIB-T — Felicidade Interna Bruta do Trabalhador",
    version: "2020.1-furtado",
    validationStatus: "validado",
    domain: "A",
    sources: [
      { citation: "Furtado, O. (2020). Escala de Felicidade Interna Bruta do Trabalhador." },
    ],
    servedItemCount: 32,
    integralItemCount: 32,
    scoreRange: { min: 0, max: 4 },
    isIntegralServed: true,
    notes: "32 itens em 3 fatores e 9 domínios FIB, escala 0–4. Leitura agregada do ecossistema.",
  },
  // ─── Domínio A — Forças ───────────────────────────────────────────────────────
  {
    id: "viat",
    instrumentShort: "VIA-T",
    label: "VIA-T v1 — Forças percebidas no trabalho (exploratório)",
    version: "1.0-exploratorio",
    validationStatus: "exploratorio",
    domain: "A",
    sources: [
      {
        citation:
          "Instrumento autoral VIA-T v1 (exploratório), inspirado em Peterson & Seligman (2004).",
      },
    ],
    servedItemCount: 48,
    integralItemCount: 48,
    scoreRange: { min: 0, max: 10 },
    isIntegralServed: true,
    notes:
      "48 itens (24 forças × 2), escala 0–10. ICUFT (10 itens) é o módulo de contexto organizacional " +
      "que acompanha a bateria. Exploratório: jamais 'VIA oficial', diagnóstico, ranking ou decisão de RH.",
  },
  // ─── Domínio B — Risco psicossocial ───────────────────────────────────────────
  {
    id: "copsoq",
    instrumentShort: "COPSOQ",
    label: "COPSOQ — Riscos psicossociais (cobertura integral, demonstrativo)",
    version: "br-medio.estrutural.1",
    validationStatus: "demonstrativo",
    domain: "B",
    sources: [
      {
        citation:
          "COPSOQ II — Kristensen et al. (NRCWE, 2005); Manual PT (Silva et al., 2013). Estrutura de 12 dimensões + 2 desfechos.",
      },
      {
        citation:
          "Guia MTE/SIT — Fatores de Risco Psicossocial (2026); NR-1 e NR-17. Categorias de risco psicossocial obrigatórias.",
      },
    ],
    servedItemCount: 41,
    integralItemCount: 41,
    scoreRange: { min: 1, max: 5 },
    isIntegralServed: true,
    isValidatedNCOPSII: false,
    notes:
      "41 itens cobrindo as 12 dimensões de exposição psicossocial da NR-1 + 2 desfechos (burnout e " +
      "comportamentos ofensivos). 'Integral' é cobertura ESTRUTURAL (todas as dimensões), não alegação " +
      "de validação: a REDAÇÃO é demonstrativa/adaptada — isValidatedNCOPSII permanece false. Não é a " +
      "NCOPSII licenciada e validada. Domínio B — nunca diagnóstico individual; cada item mapeia ao id de " +
      "dimensão do NR1_CROSSWALK (alimenta rankDriversByExposure). Conclusão de GRO/PGR exige a versão " +
      "licenciada e profissional habilitado.",
  },
];

export function getInstrumentRegistry(): InstrumentRegistryEntry[] {
  return INSTRUMENT_REGISTRY;
}
