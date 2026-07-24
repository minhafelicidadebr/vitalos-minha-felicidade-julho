// Fonte única dos {claimId, variant, surfaceId} realmente consumidos por
// superfícies públicas (H2.1B fechamento). Usada em DOIS lugares — e só
// nesses dois — para nunca haver duas listas divergentes:
//
//   1. scripts/generate-commercial-claims-public-projection.ts (build-time,
//      Node/Bun): resolve cada binding contra o registry COMPLETO
//      (resolveCommercialClaim — com checagem de expiração via Date()) e
//      grava só {claimId, variant, surfaceId, text} na projeção pública.
//   2. landing-copy.ts (client + servidor): lê a projeção já resolvida via
//      resolvePublicCommercialClaim() — nunca chama o resolver completo,
//      nunca importa o registry com limitations/source_refs/datas.
//
// Adicionar uma superfície nova = adicionar uma entrada aqui + rodar
// `bun run scripts/generate-commercial-claims-public-projection.ts` + commit
// do JSON regenerado. Nunca editar a projeção à mão.

import { COMMERCIAL_SURFACE_IDS } from "./commercial-surface-ids";

export interface PublicCommercialBinding {
  claimId: string;
  variant: string;
  surfaceId: string;
}

export const PUBLIC_COMMERCIAL_BINDINGS = {
  nr1InstrumentLabelT1: {
    claimId: "CLAIM-COM-INSTRUMENT-LABEL-001",
    variant: "short",
    surfaceId: COMMERCIAL_SURFACE_IDS.NR1_JOURNEY_T1_INSTRUMENT_LABEL,
  },
  privacySummary: {
    claimId: "CLAIM-COM-PRIVACY-AGGREGATION-001",
    variant: "default",
    surfaceId: COMMERCIAL_SURFACE_IDS.MODAL_METHOD_DEEP_MENSURAR_PRIVACY_SUMMARY,
  },
  groPgrRole: {
    claimId: "CLAIM-COM-GRO-PGR-ROLE-001",
    variant: "default",
    surfaceId: COMMERCIAL_SURFACE_IDS.NR1_HERO_GRO_PGR_ROLE,
  },
  viatWhy: {
    claimId: "CLAIM-COM-VIAT-EXPLORATORY-001",
    variant: "default",
    surfaceId: COMMERCIAL_SURFACE_IDS.MODAL_LENSES_DEEP_Q4_VIAT_WHY,
  },
  sustainability: {
    claimId: "CLAIM-COM-SUSTAINABILITY-REPORT-001",
    variant: "default",
    surfaceId: COMMERCIAL_SURFACE_IDS.NR1_JOURNEY_T4_SUSTAINABILITY,
  },
  economicBaseline: {
    claimId: "CLAIM-COM-ECONOMIC-BASELINE-001",
    variant: "default",
    surfaceId: COMMERCIAL_SURFACE_IDS.HOME_ECONOMIC_BASELINE,
  },
  sanctionsBody: {
    claimId: "CLAIM-COM-SANCTIONS-ENFORCEMENT-001",
    variant: "default",
    surfaceId: COMMERCIAL_SURFACE_IDS.NR1_MUDOU_SANCTIONS_BODY,
  },
} as const satisfies Record<string, PublicCommercialBinding>;

export type PublicCommercialBindingKey = keyof typeof PUBLIC_COMMERCIAL_BINDINGS;
