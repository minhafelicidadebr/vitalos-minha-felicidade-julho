// Tipos do Commercial Claims Registry (H2.1B MVP) — espelha a doutrina do
// COPSOQ Instrument Manifest (copsoq-instrument-manifest.ts): registry
// congelado, readonly, fail-closed. Governa SÓ claims comerciais de alto
// risco (identidade de instrumento, privacidade, escopo regulatório,
// ROI/causalidade, sanções...) — não toda a comunicação pública do produto.

/** Taxonomia fechada do MVP — não ampliar sem consumidor real (§4.2). */
export type CommercialClaimCategory =
  | "instrument_identity"
  | "regulatory_scope"
  | "privacy"
  | "scientific"
  | "institutional_affiliation"
  | "quantitative"
  | "performance"
  | "roi_causal"
  | "sanctions"
  | "methodological";

/** Só "approved" pode ser resolvido publicamente (§5). */
export type CommercialClaimStatus = "approved" | "expired" | "retired" | "draft";

export interface CommercialClaimEntry {
  claim_id: string;
  category: CommercialClaimCategory;
  status: CommercialClaimStatus;
  /** Ao menos uma variante nomeada (ex.: "short", "long", "default"). */
  variants: Readonly<Record<string, string>>;
  source_refs: readonly string[];
  limitations: readonly string[];
  allowed_surface_ids: readonly string[];
  owner_role: string;
  /** ISO date (YYYY-MM-DD), UTC. */
  reviewed_at: string;
  /** ISO date (YYYY-MM-DD), UTC — vencida = claim approved fica indisponível (§13). */
  review_due_at: string;
}

export interface CommercialClaimsRegistryFile {
  schema_version: string;
  registry_version: string;
  frozen: true;
  claims: readonly CommercialClaimEntry[];
}

/** Saída do resolver puro (§9) — nunca string vazia, nunca fallback. */
export type ResolvedCommercialClaim = Readonly<{
  claimId: string;
  variant: string;
  surfaceId: string;
  text: string;
  category: CommercialClaimCategory;
  limitations: readonly string[];
  sourceRefs: readonly string[];
}>;
