# FIB-T Production Readiness Evidence Registry

Status: `LOCAL_RC_PREPARED_NOT_PRODUCTION_RELEASED`

This registry is the Wave 5 evidence boundary. It records local evidence from
the isolated release-candidate worktree and does not claim that the live
production database, published Auth configuration, or production edge was
inspected.

## Immutable scope

| Field                                    | Value                                                               |
| ---------------------------------------- | ------------------------------------------------------------------- |
| Baseline commit                          | `524d1d8839d50ccbbb70fbf8f0ffa25f680b5575`                          |
| Branch                                   | `feat/fibt-production-readiness-rc`                                 |
| Worktree                                 | `C:\Users\FIB2030\claude code\vitalos-fibt-production-readiness-rc` |
| Production access                        | `false`                                                             |
| Production changed                       | `false`                                                             |
| Production deploy authorized             | `false`                                                             |
| Production migration apply authorized    | `false`                                                             |
| Real data/collection authorized          | `false`                                                             |
| Production read-only postflight required | `true`                                                              |

No database connection, Supabase CLI operation, Auth mutation, Cloudflare
operation, deployment, publish, push, PR, or merge was performed.

## Evidence classification

| Class                             | Wave 5 finding                                                                                                                                                                                                                                                                       |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Implemented                       | Canonical FIB-T engine, manager control center, RLS/RPC contracts, consent durability, cohort binding, active-link uniqueness, fail-closed pilot gate, Auth redirect boundary, server-only service-role boundary, CI gate, migration manifest, and local handoff gate.               |
| Documented                        | Production migration preconditions, disabled production draft, migration execution checklist, environment contract, HML boundary, and the four Wave 5 artifacts in this directory.                                                                                                   |
| Mocked/test-only                  | `ci.invalid` configuration, unit fixtures, synthetic HML identities, and local PostgreSQL behavior models. None is production evidence.                                                                                                                                              |
| Hardcoded by contract             | FIB-T manifest version `1.0.0`, 32 items, factor allocation `12/12/8`, item 5 in factor 3, `k_min=5`, and the three legacy-wave identities in the production-contract migration.                                                                                                     |
| Aspirational                      | Published production Auth dashboard settings, production Cloudflare route/bindings, capacity headroom, live migration lineage, and live post-deploy smoke results.                                                                                                                   |
| Unconfirmed                       | Current production schema, migration history, RLS policy inventory, RPC signatures/ACLs, production project selected by the published deployment, and whether the production contract migration has ever committed.                                                                  |
| Contradictory historical evidence | Older documents report selected production migrations as applied, while later handoff/audit documents report the production contract as not successfully applied and schema drift as unresolved. Current remote state is therefore classified as unknown, not inferred from history. |

## Environment identity

The versioned public build configuration derives the repository-declared
production Supabase ref as `shlmzzchddohaytfakol` and the public application
host as `vitalos.com.br`. This is a local configuration identity only. It is
not proof that the currently published Lovable deployment still uses that
project or host.

The HML project identity remains private-config controlled and is intentionally
not copied into this registry. HML and production are separate targets; the
HML PKCE/browser-auth evidence is not reused as production Auth evidence.

Required human evidence before a production claim is allowed:

1. Read-only confirmation of the project ref used by the published app.
2. Read-only confirmation of the live schema/migration lineage and current
   function/ACL/RLS state.
3. Read-only confirmation of the production callback, allowed origins,
   Cloudflare route, and deployed artifact identity.

## Production migration delta inventory

The repository contains 51 migrations. The table below is a release inventory,
not a claim that every file is pending in production.

| Migration                                                               | Local role                                                      | Production classification in this Wave 5 turn          |
| ----------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------ |
| `20260730150000_generic_anonymous_submissions_expand.sql`               | Migration A; additive FIB-T schema and RPC foundation           | `UNKNOWN_REQUIRES_READ_ONLY_POSTFLIGHT`                |
| `20260730155000_cohort_aggregate_privacy_hardening.sql`                 | Privacy hardening H; canonical aggregate contract and count RPC | `UNKNOWN_REQUIRES_READ_ONLY_POSTFLIGHT`                |
| `20260730160000_drop_response_invite_link_contract.sql`                 | Staging-only Migration B with synthetic fixtures                | `HML_STAGING_ONLY_NEVER_PROMOTE`                       |
| `20260806205000_rewrite_submit_sector_response_without_invite_link.sql` | Production-compatible response path rewrite                     | `UNKNOWN_REQUIRES_READ_ONLY_POSTFLIGHT`                |
| `20260806210000_drop_response_invite_link_contract_production.sql`      | Production-specific destructive contract candidate              | `PENDING_OR_UNKNOWN; DO_NOT_APPLY_FROM_THIS_TURN`      |
| `20260807120000_sector_response_consent_durability.sql`                 | Durable consent and atomic response context                     | `UNKNOWN_REQUIRES_READ_ONLY_POSTFLIGHT`                |
| `20260811120000_fail_closed_sector_response_cohort_binding.sql`         | Exact wave/org/cohort binding                                   | `UNKNOWN_REQUIRES_READ_ONLY_POSTFLIGHT`                |
| `20260812120000_one_active_sector_link_per_cohort.sql`                  | Active-link uniqueness and tenant-bound FKs                     | `UNKNOWN_REQUIRES_READ_ONLY_POSTFLIGHT`                |
| Earlier/base migrations                                                 | Existing application schema and security history                | `HISTORICAL_REPORTS_CONFLICT; DO NOT INFER LIVE STATE` |

No migration is classified as `DEFINITELY_ALREADY_APPLIED_IN_PRODUCTION`.
The staging B file is not a production fallback. The disabled SQL draft under
`docs/fibt-prod/` is an evidence/specification artifact and is not an
executable release migration.

## Contract evidence

The following local contracts passed in the RC worktree:

- Migration B production identity, minimal DDL, preconditions, postchecks, and
  absence of runtime `invite_token` references.
- Structural consent durability and atomic persistence.
- Fail-closed sector response cohort binding, exact wave/org matching, and
  rollback custody.
- One-active-sector-link invariant and tenant-bound composite relationships.
- RLS enabled on the tenant cut, no client read of individual
  `wave_responses`, explicit privilege revocation, and service-role-only
  aggregate reads.
- RLS parity proof default-deny semantics and service-role boundary.
- Auth redirect sanitization, same-origin callback, HML PKCE, and production
  implicit-flow preservation.
- FIB-T manager query scoping, k-anonymity suppression, telemetry scoping, and
  feature-gate-before-database-access.
- FIB-T scientific contract: canonical engine, 32 items, factors 12/12/8,
  item 5 in factor 3, no missing-as-zero, no invented bands/index/cutoffs,
  and `k_min=5`.

The focused contract run executed 195 tests with 0 failures. These are local
static/unit proofs; they do not substitute for PostgreSQL execution or live
production postflight.

## Runtime safety evidence

| Control       | Evidence                                                                                                                                                                            | Limit                                                                                                                    |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Feature gate  | `VITE_FIBT_PILOT_ENABLED=false` in the versioned production config; absent/other values fail closed; disabled path does not call Supabase or a mock.                                | A human must keep the published flag disabled until production schema and release gates are proven.                      |
| Auth          | Outside HML the code preserves implicit flow; callback is same-origin `/auth/callback`; return paths are sanitized. HML alone selects PKCE.                                         | Supabase Auth dashboard and published deployment settings were not inspected.                                            |
| Edge          | `wrangler.hml.jsonc` is explicitly HML-only, has no production route/ref/account id, disables preview URLs, and runs the Worker first for assets.                                   | No production Wrangler/Cloudflare configuration is present in this worktree, so production edge readiness is not proven. |
| Observability | Server-only allowlisted operational events, no response/token/email fields, fire-and-forget emission, manager wave scoping, and free-form reason stripping in the manager snapshot. | Live sink availability, retention, alert routing, and latency were not tested.                                           |
| Performance   | Manager load has one wave read, three parallel scoped reads, and one response read before in-memory aggregation; no manager N+1 response query.                                     | No production load/capacity claim is made; sector operations still use one count read per cohort.                        |
| Supply chain  | `bun install --frozen-lockfile` completed; CI pins Bun `1.3.14`; handoff gate and migration manifest pass.                                                                          | No external registry or published artifact attestation was performed.                                                    |

## Release decision boundary

This registry authorizes only a local release candidate. It does not authorize
schema apply, deployment, publishing, feature enablement, real collection, or
production claims.

`PRODUCTION_TECHNICAL_READINESS=PREPARED_NOT_RELEASED`

The exact stop condition for a production promotion is any missing or
conflicting project-ref, migration-lineage, schema, ACL/RLS, Auth, edge,
backup, artifact, or postflight evidence. In that case keep the pilot and real
collection disabled, do not retry a destructive migration, and obtain a new
read-only inventory and human authorization.
