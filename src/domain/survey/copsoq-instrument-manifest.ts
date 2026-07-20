// Manifesto canônico do instrumento COPSOQ (Domínio B) — acesso tipado, readonly, fail-closed.
// Fonte única da identidade, licença, estrutura dimensional, hashes e linguagem permitida do
// instrumento servido. O Instrument Registry (mocks) e as superfícies públicas DERIVAM daqui —
// nenhuma tela ou copy digita "validado" à mão (mesma doutrina de buildPassport/deriveProductStatus).
//
// Parte derivada (item_count, dimensions, reversed_items, item_hashes) regenerada por
// `bun run scripts/sync-copsoq-manifest.ts` a partir da bateria realmente servida; a paridade
// é imposta no gate por copsoq-instrument-manifest.test.ts. Campos curados só mudam por
// descongelamento formal com bump de versão (CLAUDE.md, regra científica 8).
//
// Vive em domain/ — o engine nunca importa daqui (regra inviolável 1); quem compõe é mock/app.

import manifestJson from "./copsoq-instrument-manifest.json";

/** Espelha InstrumentValidationStatus do engine sem importá-lo (domain não depende de engine). */
export type CopsoqValidationStatus =
  | "validado"
  | "validado_adaptado"
  | "exploratorio"
  | "demonstrativo";

export interface CopsoqManifestSource {
  citation: string;
  url?: string;
}

export interface CopsoqManifestDimension {
  id: string;
  /** exposure = dimensão de exposição (vira driver via crosswalk); outcome = desfecho (nunca driver). */
  kind: "exposure" | "outcome";
  item_ids: readonly string[];
}

export interface CopsoqManifestScoring {
  scale_min: number;
  scale_max: number;
  scale_kind: string;
  scale_labels: readonly string[];
  reversed_meaning: string;
  aggregation: string;
}

export interface CopsoqInstrumentManifest {
  manifest: string;
  description: string;
  frozen: true;
  instrument_id: string;
  official_name: string;
  served_name: string;
  version: string;
  locale: string;
  form: string;
  adaptation: string;
  sources: readonly CopsoqManifestSource[];
  licence: {
    status: "sem_licenca_de_versao_validada" | "licenca_validada_registrada";
    note: string;
  };
  attribution: string;
  validation_status: CopsoqValidationStatus;
  norm_reference: string | null;
  scoring: CopsoqManifestScoring;
  hash_algorithm: string;
  outcome_dimension_ids: readonly string[];
  item_count: number;
  dimension_count: number;
  exposure_dimension_count: number;
  outcome_dimension_count: number;
  dimensions: readonly CopsoqManifestDimension[];
  reversed_items: readonly string[];
  item_hashes: Readonly<Record<string, string>>;
  allowed_claims: readonly string[];
  forbidden_claims: readonly string[];
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const key of Object.keys(value as Record<string, unknown>)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
    Object.freeze(value);
  }
  return value;
}

const MANIFEST: CopsoqInstrumentManifest = deepFreeze(
  structuredClone(manifestJson) as unknown as CopsoqInstrumentManifest,
);

/** O manifesto congelado — única porta de leitura. */
export function getCopsoqManifest(): CopsoqInstrumentManifest {
  return MANIFEST;
}

/**
 * Fail-closed: linguagem de "instrumento validado" só é permitida quando o status
 * registrado no manifesto for validado/validado_adaptado E houver licença registrada.
 * Enquanto demonstrativo, retorna false — nenhuma superfície pode dizer "validado".
 */
export function isValidatedLanguageAllowed(
  manifest: CopsoqInstrumentManifest = MANIFEST,
): boolean {
  return (
    (manifest.validation_status === "validado" ||
      manifest.validation_status === "validado_adaptado") &&
    manifest.licence.status === "licenca_validada_registrada"
  );
}

/** Normaliza para matching honesto: caixa e acentos não escondem um claim proibido. */
function normalizeForMatch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * Varre um texto público (landing, relatório, UI) e devolve os claims proibidos
 * encontrados (matching caixa/acento-insensível). Lista vazia = texto limpo.
 */
export function findForbiddenClaimMatches(
  text: string,
  manifest: CopsoqInstrumentManifest = MANIFEST,
): string[] {
  const haystack = normalizeForMatch(text);
  return manifest.forbidden_claims.filter((claim) =>
    haystack.includes(normalizeForMatch(claim)),
  );
}
