// Contrato canônico da FIB-T (Furtado, C. A., 2020) — tipos.
//
// Este arquivo descreve o instrumento como ELE É NO DOCUMENTO, não como
// seria conveniente. Tudo que o documento não define aparece explicitamente
// como não documentado, nunca como valor default silencioso: um campo
// ausente vira um claim inventado assim que alguém o lê como número.

/** Estado do contrato. Ampliar só com decisão metodológica humana registrada. */
export type FibtInstrumentStatus =
  /** Metodologia conferida item a item contra o documento-fonte. */
  | "METHODOLOGY_CONFIRMED"
  /** Divergência aberta contra a fonte — não pode gerar escore. */
  | "METHODOLOGY_DIVERGENT";

/**
 * Marcador de lacuna documental. Existe para tornar impossível confundir
 * "o autor definiu zero" com "o autor não definiu" — a origem de índices e
 * faixas inventados.
 */
export type FibtUndocumented = "NOT_DOCUMENTED";

export interface FibtScaleAnchor {
  value: number;
  label: string;
}

export interface FibtResponseScale {
  type: "likert";
  min: number;
  max: number;
  anchors: FibtScaleAnchor[];
  single_choice_per_item: boolean;
}

export interface FibtFactorDef {
  id: string;
  number: number;
  name: string;
  domain_ids: string[];
  item_count: number;
}

export interface FibtDomainDef {
  id: string;
  name: string;
  /** O documento nomeia este domínio de duas formas — ambas registradas, nenhuma escolhida por nós. */
  alternate_name_in_source?: string;
  factor_id: string;
}

export interface FibtItemDef {
  id: string;
  number: number;
  /** Transcrição literal do documento, incluindo erros tipográficos da fonte. */
  text: string;
  factor_id: string;
  domain_id: string;
  /** Registro de decisão quando a fonte é atípica ou contém erro — nunca uma correção silenciosa. */
  source_note?: string;
}

export interface FibtScoring {
  factor_formula: string;
  factor_range: { min: number; max: number };
  raw_score_formula: string;
  raw_score_range: { min: number; max: number };
  /** null porque o documento não define fórmula de subíndice por domínio. */
  domain_formula: null;
  domain_formula_status: FibtUndocumented;
  domain_formula_note: string;
  reverse_scored_items: number[];
  reverse_scoring_status: FibtUndocumented;
  weights: null;
  weights_status: string;
  weights_note: string;
}

export interface FibtMissingDataRules {
  status: FibtUndocumented;
  /** Sempre false enquanto não houver regra do autor. */
  imputation_allowed: false;
  policy: "FAIL_CLOSED";
  note: string;
}

export interface FibtNormalization {
  status: FibtUndocumented;
  /** Sempre false: índice 0–1000 não existe no documento. */
  authorized: false;
  note: string;
}

export interface FibtInterpretationRules {
  status: FibtUndocumented;
  /** Sempre false: faixas e rótulos não existem no documento. */
  authorized: false;
  /** Sempre vazio enquanto não autorizado. */
  bands: never[];
  note: string;
}

export interface FibtPsychometrics {
  validity_evidence: null;
  reliability: null;
  status: "NOT_PRESENT_IN_SOURCE_DOCUMENT";
  note: string;
}

export interface FibtPrivacy {
  k_anonymity_min: number;
  individual_score_allowed: false;
  individual_response_exposure_allowed: false;
  note: string;
}

export interface FibtGovernance {
  approved_at: string | null;
  approved_by: string | null;
  approval_status: string;
  open_questions: string[];
}

export interface FibtInstrumentManifest {
  instrument_id: "fib_t";
  instrument_version: string;
  status: FibtInstrumentStatus;
  name: string;
  author: string;
  citation_reference: string;
  source_document: string;
  source_document_sha256: string;
  /**
   * Ponteiro para o registro de autorizacao de uso. Deliberadamente NAO um
   * booleano aqui: direito de aplicar o instrumento e prontidao operacional
   * da plataforma sao perguntas diferentes, com decisores diferentes.
   */
  usage_authorization_ref: string;
  usage_authorization_note: string;
  population: string;
  anonymity_statement_source: string;
  response_scale: FibtResponseScale;
  factors: FibtFactorDef[];
  domains: FibtDomainDef[];
  items: FibtItemDef[];
  scoring: FibtScoring;
  missing_data_rules: FibtMissingDataRules;
  normalization: FibtNormalization;
  interpretation_rules: FibtInterpretationRules;
  psychometrics: FibtPsychometrics;
  privacy: FibtPrivacy;
  allowed_claims: string[];
  forbidden_claims: string[];
  governance: FibtGovernance;
}

/** Invariantes estruturais do documento — 32 itens em 3 Fatores (12/12/8). */
export const FIBT_TOTAL_ITEMS = 32;
export const FIBT_TOTAL_FACTORS = 3;
export const FIBT_TOTAL_DOMAINS = 9;
export const FIBT_SCALE_MIN = 0;
export const FIBT_SCALE_MAX = 4;
export const FIBT_RAW_SCORE_MAX = 12;

/**
 * Frases que não podem aparecer em claim autorizado. O índice 0–1000 e as
 * quatro faixas circularam no produto antes desta onda — ficam aqui para que
 * a reintrodução quebre o build, não a confiança do cliente.
 */
export const FIBT_FORBIDDEN_CLAIM_PHRASES = [
  "0-1000",
  "0–1000",
  "florescente",
  "em desenvolvimento",
  "fragil",
  "frágil",
  "diagnostico clinico",
  "diagnóstico clínico",
  "anonimato garantido",
  "anonimato absoluto",
  "conformidade automatica",
  "conformidade automática",
] as const;
