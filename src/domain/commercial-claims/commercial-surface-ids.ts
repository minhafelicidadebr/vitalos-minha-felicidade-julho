// Inventário mínimo de IDs semânticos de superfície (H2.1B MVP, §11). Só as
// superfícies REALMENTE usadas no binding do MVP (§10/B4) — não é um mapa de
// todos os arquivos públicos, e refatoração de arquivo/rota não pode, por si
// só, alterar autorização (o ID é estável mesmo que o componente mude de
// lugar). Regulatory scope (marketing.nr1.regulatory-scope) fica registrado
// no claim mas SEM consumidor nesta fatia — §10 do super prompt não lista
// "escopo regulatório" entre as superfícies a migrar agora.

export const COMMERCIAL_SURFACE_IDS = {
  PRESENTATION_CONTEXT: "marketing.presentation.enterprises.context",
  PRESENTATION_BUSINESS_EVIDENCE: "marketing.presentation.enterprises.business-evidence",
  NR1_JOURNEY_T1_INSTRUMENT_LABEL: "marketing.nr1.journey.t1-instrument-label",
  NR1_METHODOLOGY_INSTRUMENT_DESCRIPTION: "marketing.nr1.methodology.instrument-description",
  MODAL_METHOD_DEEP_MENSURAR_PRIVACY_SUMMARY:
    "marketing.modal.method-deep.mensurar-privacy-summary",
  NR1_HERO_GRO_PGR_ROLE: "marketing.nr1.hero.gro-pgr-role",
  NR1_REGULATORY_SCOPE: "marketing.nr1.regulatory-scope",
  MODAL_LENSES_DEEP_Q4_VIAT_WHY: "marketing.modal.lenses-deep.q4-viat-why",
  NR1_JOURNEY_T4_SUSTAINABILITY: "marketing.nr1.journey.t4-sustainability",
  HOME_ECONOMIC_BASELINE: "marketing.home.economic-baseline",
  NR1_MUDOU_SANCTIONS_BODY: "marketing.nr1.mudou.sanctions-body",
  // Proposta comercial (/proposta): conteúdo só no servidor, depois da senha. PROPOSTA_V2_FOUNDER_APPROVAL_2026-11-23.
  PROPOSAL_SCIENCE_ANCHORS: "marketing.proposal.science-anchors",
  PROPOSAL_INSTITUTE_TRACK_RECORD: "marketing.proposal.institute-track-record",
  PROPOSAL_LITERATURE_EVIDENCE: "marketing.proposal.literature-evidence",
  // Proposta para o ecossistema ISG (/proposta/ecossistema): mesma sessão da proposta, conteúdo no servidor.
  PROPOSAL_ECOSYSTEM_CONTEXT: "marketing.proposal.ecosystem.context",
} as const;

export type CommercialSurfaceId =
  (typeof COMMERCIAL_SURFACE_IDS)[keyof typeof COMMERCIAL_SURFACE_IDS];
