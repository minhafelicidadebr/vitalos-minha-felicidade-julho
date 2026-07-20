// Registro dos instrumentos de mensuração — fonte única de verdade, mock-first.
// Cada entrada é auditável: versão do conteúdo, status de validação honesto, fonte citável,
// e a contagem servida vs. integral. O teste de reconciliação (instrument-registry.test.ts)
// amarra estas contagens aos itens REALMENTE aplicados no survey-mock — se divergirem, falha.
//
// Domínio A (florescimento/forças) e Domínio B (risco psicossocial) nunca se misturam.

import type { InstrumentRegistryEntry } from "@/engine/survey/instrument-registry";
import {
  getCopsoqManifest,
  isValidatedLanguageAllowed,
} from "@/domain/survey/copsoq-instrument-manifest";

// COPSOQ deriva do manifesto canônico (Onda T2) — identidade, versão, status,
// fontes, contagens e escala têm UMA fonte: src/domain/survey/copsoq-instrument-manifest.json.
// A paridade manifesto × bateria servida é imposta no gate (copsoq-instrument-manifest.test.ts).
const COPSOQ_MANIFEST = getCopsoqManifest();

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
  // ─── Domínio B — Risco psicossocial (DERIVADO do manifesto canônico) ──────────
  {
    id: COPSOQ_MANIFEST.instrument_id,
    instrumentShort: "COPSOQ",
    label: "COPSOQ — Riscos psicossociais (cobertura integral, demonstrativo)",
    version: COPSOQ_MANIFEST.version,
    validationStatus: COPSOQ_MANIFEST.validation_status,
    domain: "B",
    sources: COPSOQ_MANIFEST.sources.map((source) => ({ ...source })),
    servedItemCount: COPSOQ_MANIFEST.item_count,
    integralItemCount: COPSOQ_MANIFEST.item_count,
    scoreRange: {
      min: COPSOQ_MANIFEST.scoring.scale_min,
      max: COPSOQ_MANIFEST.scoring.scale_max,
    },
    isIntegralServed: true,
    // Fail-closed por construção: só vira true se o manifesto for descongelado para
    // validado COM licença registrada (gate DEMONSTRATIVO→VALIDADO da licence.note).
    isValidatedNCOPSII: isValidatedLanguageAllowed(COPSOQ_MANIFEST),
    notes:
      "DERIVADO do manifesto canônico (domain/survey/copsoq-instrument-manifest.json). " +
      "'Integral' é cobertura ESTRUTURAL (todas as dimensões), não alegação de validação: a REDAÇÃO " +
      "é demonstrativa/adaptada — não é a NCOPSII licenciada e validada. Domínio B — nunca diagnóstico " +
      "individual; cada item mapeia ao id de dimensão do NR1_CROSSWALK (alimenta rankDriversByExposure). " +
      "Conclusão de GRO/PGR exige a versão licenciada e profissional habilitado.",
  },
];

export function getInstrumentRegistry(): InstrumentRegistryEntry[] {
  return INSTRUMENT_REGISTRY;
}
