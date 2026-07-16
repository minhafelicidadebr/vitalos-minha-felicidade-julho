// RawContextEnvelope — bate byte-a-byte com o contrato canônico
// (docs/ai/florencia-skills/schemas/context-envelope.schema.json), sincronizado
// em src/domain/florencia/contracts/context-envelope.schema.json via
// scripts/sync-florencia-contracts.ts. Divergência quebra florencia-contract-parity.test.ts.
//
// snake_case de propósito — é o formato que o CTA emite. A normalização para
// camelCase (uso interno) é a PRIMEIRA e ÚNICA fronteira de tradução.

export type PrivacyScope = "self_private" | "aggregate_only" | "tenant_authorized" | "public_content";
export type ProductStatus = "REAL" | "PARCIAL" | "DEMO" | "ROADMAP";

export interface RawContextEnvelope {
  cta_id: string;
  segment: string;
  role: string;
  route: string;
  section: string;
  tags?: string[];
  entity_refs?: string[];
  privacy_scope: PrivacyScope;
  product_status: ProductStatus;
}

/** Estrutura interna camelCase — nada além de uma tradução 1:1 do Raw. */
export interface NormalizedContextEnvelope {
  ctaId: string;
  segment: string;
  role: string;
  route: string;
  section: string;
  tags: string[];
  entityRefs: string[];
  privacyScope: PrivacyScope;
  productStatus: ProductStatus;
}

export function normalizeContextEnvelope(raw: RawContextEnvelope): NormalizedContextEnvelope {
  return {
    ctaId: raw.cta_id,
    segment: raw.segment,
    role: raw.role,
    route: raw.route,
    section: raw.section,
    tags: raw.tags ?? [],
    entityRefs: raw.entity_refs ?? [],
    privacyScope: raw.privacy_scope,
    productStatus: raw.product_status,
  };
}
