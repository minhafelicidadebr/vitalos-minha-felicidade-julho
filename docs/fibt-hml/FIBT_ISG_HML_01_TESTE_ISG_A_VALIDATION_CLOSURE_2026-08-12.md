# FIB-T ISG HML-01 - TESTE-ISG-A Validation Closure

## Custody

- Environment: HML/STAGING
- Validation date: 2026-08-12
- Batch: `FIBT-ISG-HML-01`
- Cohort: `TESTE-ISG-A`
- Link model: `SECTOR`
- Production accessed: no
- Response content read: 0
- Answers read: 0

This document records technical validation states only. It contains no link
token, token hash, answer, email, cookie, JWT, receipt identifier, response ID,
credential, or private configuration value.

## Final Matrix

| Gate | Result |
| --- | --- |
| Cloudflare Access | PASS |
| ServerFn routing | PASS |
| ServerFn HTTP | 200 |
| Browser completion | PASS |
| Consent durability | PASS |
| Cohort binding | PASS |
| Persistence | PASS |
| Analytics path | PASS |
| K-anonymity (`k_min=5`) | PASS |
| Privacy | PASS |
| `TESTE-ISG-A` | PASS |
| `TESTE-ISG-B` link | DEFERRED |

`HML_CONTROLLED_COLLECTION_TECHNICAL_READY=true`

`PRODUCTION_READY=NOT_ASSERTED`

## Evidence Summary

- The browser submission completed successfully through TanStack ServerFn with
  HTTP 200. Neither the historical ServerFn 404 nor the historical Access 302
  was reproduced.
- The new synthetic response persisted in the expected wave with instrument
  context `FIB_T / 1.0.0`.
- Consent version `2026.1` and consent acceptance timestamp persisted.
- The response received a non-null cohort binding matching `TESTE-ISG-A`.
- Cohort participation and aggregate lookup resolve the new response through
  the exact wave/cohort path.
- Aggregate publication remains suppressed below `k_min=5`; no additional
  responses were created to reach the threshold.
- Historical responses with `cohort_id=NULL` were preserved and remain excluded
  from cohort analytics.
- The `TESTE-ISG-B` cohort is valid. Its link is intentionally deferred and is
  not a blocker for the completed `TESTE-ISG-A` validation.

## Technical Change Inventory

The worktree was already dirty when this closure gate started. Git has no
intermediate commit that can prove authorship or exact chronology for those
changes. The list below therefore records entry state and functional ownership,
not author attribution. Nothing was reset or cleaned.

### A. Dirty at closure-gate entry

- `src/integrations/supabase/types.ts`
- `src/lib/api/sector-link.functions.ts`
- `src/lib/fibt-hml/hml-contract.test.ts`
- `src/lib/fibt-hml/hml-contract.ts`
- `src/lib/fibt-hml/hml-deployment-boundary.server.test.ts`
- `src/lib/fibt-hml/hml-deployment-boundary.server.ts`
- `src/lib/fibt/fibt-pilot-flag.test.ts`
- `src/lib/fibt/fibt-pilot-flag.ts`
- `src/lib/survey/sector-link.server.test.ts`
- `src/lib/survey/sector-link.server.ts`
- `src/routeTree.gen.ts`
- `src/routes/respond.s.$token.tsx`
- `src/start.ts`
- `supabase/migrations.manifest.json`
- `scripts/fibt-hml/ensure-sector-smoke-cohorts.test.ts`
- `scripts/fibt-hml/ensure-sector-smoke-cohorts.ts`
- `scripts/fibt-hml/rollback/20260811120000_fail_closed_sector_response_cohort_binding.rollback.sql`
- `scripts/fibt-hml/run-sector-smoke-cohorts-with-private-env.test.ts`
- `scripts/fibt-hml/run-sector-smoke-cohorts-with-private-env.ts`
- `src/domain/survey/sector-response-consent.ts`
- `src/lib/fibt/fibt-consent-durability-contract.test.ts`
- `src/lib/fibt/fibt-sector-cohort-binding-contract.test.ts`
- `src/tanstack-start-server-fn-resolver.d.ts`
- `supabase/migrations/20260807120000_sector_response_consent_durability.sql`
- `supabase/migrations/20260811120000_fail_closed_sector_response_cohort_binding.sql`

### B. ServerFn HML boundary fix

- `src/start.ts`
- `src/tanstack-start-server-fn-resolver.d.ts`
- `src/lib/fibt-hml/hml-deployment-boundary.server.ts`
- `src/lib/fibt-hml/hml-deployment-boundary.server.test.ts`
- `src/lib/fibt-hml/hml-contract.ts`
- `src/lib/fibt-hml/hml-contract.test.ts`

### C. Consent durability

- `src/domain/survey/sector-response-consent.ts`
- `src/integrations/supabase/types.ts`
- `src/lib/api/sector-link.functions.ts`
- `src/lib/survey/sector-link.server.ts`
- `src/lib/survey/sector-link.server.test.ts`
- `src/routes/respond.s.$token.tsx`
- `src/lib/fibt/fibt-consent-durability-contract.test.ts`
- `supabase/migrations/20260807120000_sector_response_consent_durability.sql`

### D. Structural cohort binding

- `supabase/migrations/20260811120000_fail_closed_sector_response_cohort_binding.sql`
- `scripts/fibt-hml/rollback/20260811120000_fail_closed_sector_response_cohort_binding.rollback.sql`
- `src/lib/fibt/fibt-sector-cohort-binding-contract.test.ts`
- `supabase/migrations.manifest.json`

### E. HML fixture

- `scripts/fibt-hml/ensure-sector-smoke-cohorts.ts`
- `scripts/fibt-hml/ensure-sector-smoke-cohorts.test.ts`

### F. Private environment runner and hardening

- `scripts/fibt-hml/run-sector-smoke-cohorts-with-private-env.ts`
- `scripts/fibt-hml/run-sector-smoke-cohorts-with-private-env.test.ts`

### G. Other tests, generated state, and closure docs

- `src/lib/fibt/fibt-pilot-flag.ts`
- `src/lib/fibt/fibt-pilot-flag.test.ts`
- `src/routeTree.gen.ts`
- `docs/fibt-hml/FIBT_ISG_HML_01_TESTE_ISG_A_VALIDATION_CLOSURE_2026-08-12.md`
- `docs/fibt-hml/FIBT_ISG_HML_01_TESTE_ISG_A_VALIDATION_CLOSURE_2026-08-12.sha256`

## Artifact Custody

| Artifact | SHA-256 |
| --- | --- |
| `supabase/migrations/20260811120000_fail_closed_sector_response_cohort_binding.sql` | `536e641aa4f7ccfdb6742406bedf9a23c872c3e42bd6b92adabfb3df0216008e` |
| `scripts/fibt-hml/ensure-sector-smoke-cohorts.ts` | `07a943ff172dca2c8a3174a8ba3b6ec8c54ebcc197b7fd474bb79b7168d75815` |
| `scripts/fibt-hml/run-sector-smoke-cohorts-with-private-env.ts` | `298873f8d02fa8388a91c4a3da2658fa8e3625a0d6784bf82abdc069bd207da7` |
| `scripts/fibt-hml/rollback/20260811120000_fail_closed_sector_response_cohort_binding.rollback.sql` | `3b21de4860e840e8a6852deb17598b1b4bfe588d51824de9e365f7c80ced7554` |
| `supabase/migrations.manifest.json` | `4ce48ee52c9c4978995a708fef17626ee2fe1123d5ca7edef27402830c1a7542` |

The companion `.sha256` file records the hash of this closure document. The
migration manifest was checked read-only and passed with 50 migrations and
rollup `e4a665dd01c7c8b19faf0f858db326bd17b9488981dbf8a4da676d4b07390091`.

## Closure

The controlled HML collection is technically ready for `TESTE-ISG-A`. This is
not a production-readiness assertion and grants no authorization for another
submission, link generation, migration, fixture run, deployment, or production
operation.
