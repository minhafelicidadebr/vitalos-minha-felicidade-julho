// FIB-T — ponte entre o contrato canônico e a experiência.
//
// ONDA FIBT-0: a metodologia NÃO vive mais aqui. Ela vive em
// src/domain/instruments/fibt/fibt-instrument.v1.json, conferida item a item
// contra Furtado (2020) e validada em runtime por um loader fail-closed.
// Este arquivo apenas ADAPTA o manifesto ao formato que o engine consome e
// carrega dados agregados FICTÍCIOS de demonstração.
//
// Antes desta onda havia duas fontes de verdade divergindo em silêncio: o item
// 5 estava no Fator 2 (deveria ser Fator 3), o que fazia o Fator 2 dividir por
// 13 e o Fator 3 por 8 — o escore bruto saía errado. Derivar do manifesto
// elimina a classe inteira do problema.

import { getFibtManifest } from "@/domain/instruments/fibt/fibt-instrument";
import {
  scoreFibt,
  type FibtInstrumentDef,
  type FibtItemResponse,
} from "@/engine/fibt/fibt-engine";

const manifest = getFibtManifest();

/** Adaptação do manifesto canônico ao contrato do engine (snake_case → camelCase). */
export const FIBT_INSTRUMENT: FibtInstrumentDef = {
  factors: manifest.factors.map((f) => ({
    id: f.id,
    name: f.name,
    domainIds: [...f.domain_ids],
  })),
  domains: manifest.domains.map((d) => ({ id: d.id, name: d.name })),
  items: manifest.items.map((i) => ({
    id: i.id,
    text: i.text,
    factorId: i.factor_id,
    domainId: i.domain_id,
  })),
};

/** Âncoras da escala (0–4) — texto normativo do documento, para a UI de resposta. */
export const FIBT_SCALE_ANCHORS = manifest.response_scale.anchors;

// Ponte FIB-T → dimensão ESG (compõe com o /esg). E = ambiental, S = social, G = governança.
export const DOMAIN_TO_ESG: Record<string, "E" | "S" | "G"> = {
  meio_ambiente: "E",
  padrao_vida: "S",
  educacao: "S",
  cultura: "S",
  bem_estar_emocional: "S",
  saude: "S",
  uso_tempo: "S",
  vitalidade_comunitaria: "S",
  governanca: "G",
};

export const ESG_DIM_COPY: Record<string, { label: string; color: string }> = {
  E: { label: "Ambiental", color: "#16A34A" },
  S: { label: "Social", color: "#2563EB" },
  G: { label: "Governança", color: "#CA8A04" },
};

// Agregado organizacional FICTÍCIO (n=312) — dado de demonstração, não pesquisa.
// Precisa cobrir os 32 itens: o engine recusa conjunto incompleto (fail-closed).
const ORG_AVG: Record<string, number> = {
  q1: 2.6,
  q2: 3.0,
  q3: 3.0,
  q4: 2.6,
  q5: 3.1,
  q6: 3.2,
  q7: 2.9,
  q8: 2.4,
  q9: 2.4,
  q10: 2.7,
  q11: 2.2,
  q12: 2.3,
  q13: 2.7,
  q14: 2.6,
  q15: 2.5,
  q16: 2.8,
  q17: 2.9,
  q18: 1.8,
  q19: 2.3,
  q20: 2.2,
  q21: 2.5,
  q22: 2.4,
  q23: 2.7,
  q24: 2.1,
  q25: 1.6,
  q26: 2.4,
  q27: 2.8,
  q28: 2.2,
  q29: 2.8,
  q30: 2.8,
  q31: 3.2,
  q32: 2.6,
};

const ORG_RESPONSES: FibtItemResponse[] = Object.entries(ORG_AVG).map(([itemId, value]) => ({
  itemId,
  value,
}));

export const FIBT_ORG_N = 312;
export const FIBT_ORG_RESULT = scoreFibt(ORG_RESPONSES, FIBT_INSTRUMENT);

export const FACTOR_COLOR: Record<string, string> = {
  padrao_de_vida: "#0EA5E9",
  bem_estar: "#10B981",
  satisfacao_empresa: "#CA8A04",
};

export const FIBT_INTRO = {
  eyebrow: "FIB-T · Lente de Ecossistema · Furtado (2020)",
  title: "A felicidade que o sistema sustenta",
  lead:
    "A Felicidade Interna Bruta do Trabalhador mede o que o IVO e o COPSOQ não alcançam: o " +
    "ecossistema de vida em volta do trabalho — padrão de vida, saúde, tempo, comunidade, " +
    "cultura, ambiente e governança. A saúde da pessoa é inseparável da saúde do sistema.",
  disclaimer:
    "FIB-T (Furtado, 2020) — instrumento anônimo de 32 itens, escala 0 a 4, em 3 Fatores " +
    "agrupando 9 Domínios FIB. Cada Fator varia de 0 a 4 e o escore bruto (soma das três " +
    "médias) varia de 0 a 12. O instrumento não define faixas interpretativas nem índice " +
    "normalizado — este painel não classifica pessoas nem organizações, não é diagnóstico " +
    "clínico e apresenta apenas resultados agregados (n≥5). Dados desta tela são fictícios, " +
    "para demonstração.",
};
