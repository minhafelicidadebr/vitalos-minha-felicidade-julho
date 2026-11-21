# Spec — Contrato de lente

Implementação: `src/engine/ivo/lens-contract.ts` (puro).

## Tipos

- `IvoDimensionId = "eu" | "nos" | "lideranca" | "organizacao"`
- `IvoLensId = "copsoq" | "fibt" | "perma_v" | "via_t"`
- `IvoQuarter = "Q1" | "Q2" | "Q3" | "Q4"`
- `LensAvailability = "functional" | "planned"`
- `IvoLensDescriptor { id, quarter, label, instrument, instrumentVersion|null, availability, route|null }`
- `LensPublicationState = "planned" | "prepared" | "collecting" | "protected" | "published" | "concluded"`
- `CohortLensReading { cohortKey, cohortLabel, publication, countLabel, constructs|null, protectionReason|null }`
  - `constructs` só existe quando `publication === "published"`; fora disso é `null`.
- `NormalizedLensReading { contractVersion, organizationId, cycleKey, quarter, lens, instrumentVersion, calculationVersion, cohortScope, privacyStatus, publicationStatus, cohorts, evidenceReferences, generatedAt, compositeScore?: never }`

## Critérios verificáveis

- CL1 — O módulo não importa `@/domain` (teste de fronteira).
- CL2 — `assertNormalizedLensReading` rejeita coorte protegida com `constructs` presente.
- CL3 — Rejeita `countLabel` numérico abaixo de `kMin` declarado.
- CL4 — Rejeita qualquer campo de índice composto.
- CL5 — `contractVersion` é `"ivo-lens-reading/1"`.
