# FIB-T Release Candidate Manifest

Release candidate: `fibt-wave-5-production-readiness-rc`

This manifest describes a local, non-deployed release candidate based on the
validated Wave 4 commit. It is an index and evidence contract, not a
production deployment instruction.

## Provenance

| Field                                    | Value                                                             |
| ---------------------------------------- | ----------------------------------------------------------------- |
| Source/base commit                       | `524d1d8839d50ccbbb70fbf8f0ffa25f680b5575`                        |
| Working branch                           | `feat/fibt-production-readiness-rc`                               |
| Runtime/package manager                  | Bun `1.3.14`                                                      |
| Lockfile install                         | `bun install --frozen-lockfile` passed                            |
| Migration count                          | `51`                                                              |
| Migration rollup SHA-256                 | `a6fb90e8af01f532e1d6352954a74c8fcd6a85d055b904a479632b7923ea953` |
| Production access/change/deploy          | `false / false / false`                                           |
| Real collection                          | `false`                                                           |
| Production read-only postflight required | `true`                                                            |

## Candidate contents

The local RC change set contains:

- `scripts/fibt-handoff-integrity-gate.ts`: a narrowly scoped fix so migration
  hashes use the same CRLF-to-LF normalization as the canonical manifest on
  Windows and Linux.
- `docs/fibt-prod/FIBT_PRODUCTION_READINESS_EVIDENCE_REGISTRY.md`.
- `docs/fibt-prod/FIBT_PRODUCTION_RUNBOOK.md`.
- `docs/fibt-prod/FIBT_PRODUCTION_ROLLBACK_PLAN.md`.
- this manifest.

No migration SQL, generated Supabase type, runtime Auth behavior, feature flag,
private HML package, secret, or production configuration was changed.

## Migration artifact index

The following hashes are the normalized-text SHA-256 values recorded by the
versioned migration manifest:

| Artifact                                                                | SHA-256                                                            | Release meaning                                                   |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------- |
| `20260730150000_generic_anonymous_submissions_expand.sql`               | `5e78abec864a156e9764640272778fe4afa8fa582c75c7dd9499fb0ad260d448` | Migration A; production status unknown until postflight           |
| `20260730155000_cohort_aggregate_privacy_hardening.sql`                 | `461613bb07b8696ab9170fabdad86b683e67d27f0b9954d4e481c9876bcd8f85` | Hardening H; production status unknown until postflight           |
| `20260730160000_drop_response_invite_link_contract.sql`                 | `3f2a67501cd6a208ab3e2fc349fae3a5822aea052636d9d77dcca452e6c26731` | Staging-only; never use in production                             |
| `20260806205000_rewrite_submit_sector_response_without_invite_link.sql` | `0e561ce1f7221fa4cbf4b696d585a9ace84d47e127b8403bb187598f19e2a805` | Production-compatible response rewrite candidate                  |
| `20260806210000_drop_response_invite_link_contract_production.sql`      | `c06ef41b875238e3d9b9dd54dd49d18ff1f1fe2353820ec1605351e9212b11c3` | Destructive production contract candidate; not applied by this RC |
| `20260807120000_sector_response_consent_durability.sql`                 | `6e4cf5f34c403a9eff67d5b88998e431bda53de0693de61f26f24a1f5c883e4e` | Consent durability candidate                                      |
| `20260811120000_fail_closed_sector_response_cohort_binding.sql`         | `536e641aa4f7ccfdb6742406bedf9a23c872c3e42bd6b92adab3df0216008e`   | Cohort-binding candidate                                          |
| `20260812120000_one_active_sector_link_per_cohort.sql`                  | `a83923a5ecf22a17eccb3c454ceebdfbb2a53f9faa43ea35da320b8850dbb6c3` | Active-link uniqueness candidate                                  |

The production-specific draft at
`docs/fibt-prod/MIGRATION_B_PRODUCTION_DRAFT.sql.disabled` is intentionally
excluded from the executable migration manifest.

## Contract status

| Area                           | RC status                                                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| FIB-T scientific contract      | `PASS_LOCAL`: 32 items; factors 12/12/8; item 5 factor 3; no invented bands/index/cutoffs; no missing-as-zero |
| Privacy                        | `PASS_LOCAL`: `k_min=5`; individual responses/tokens not serialized; below-k output suppressed                |
| RLS/RPC/security               | `PASS_LOCAL_STATIC`: local migration/contract proofs pass; live state unconfirmed                             |
| Consent/cohort/link invariants | `PASS_LOCAL_STATIC`: focused contracts pass; live state unconfirmed                                           |
| Production migration readiness | `PREPARED_NOT_RELEASED`                                                                                       |
| Production Auth                | `HUMAN_READ_ONLY_DISCOVERY_REQUIRED`                                                                          |
| Production Cloudflare edge     | `HUMAN_READ_ONLY_DISCOVERY_REQUIRED`                                                                          |
| Feature gate                   | `FAIL_CLOSED; false`                                                                                          |
| Observability                  | `LOCAL_CONTRACT_ONLY; live sink unconfirmed`                                                                  |
| Performance                    | `STATIC_QUERY_REVIEW_ONLY; no capacity claim`                                                                 |

## CI and promotion semantics

The repository workflow runs build, tests, typecheck, schema parity, and secret
scan against inert CI configuration. It has no production deploy step, no
Supabase migration step, and no production secret environment. Git merge to
`main` therefore does not itself prove or execute production deployment or
migration; publication remains a separate human/platform action.

## Bundle identity

The release bundle is the four-file evidence set in `docs/fibt-prod/` plus the
single hashing-gate fix listed above. No archive or private deployment bundle
was created. The SHA-256 reported in the Wave 5 handoff is the hash of this
manifest file after the final local commit; it intentionally excludes the
digest file itself and any generated build output.

## Human gates remaining

Before any production claim or enablement, obtain fresh read-only evidence for
the published project ref, migration lineage, schema/RLS/RPC/ACL state,
backup/restore, Auth callback/origins, Cloudflare edge, deployed artifact,
observability sink, and synthetic postflight. Keep the production pilot and
real collection disabled until every gate is accepted.
