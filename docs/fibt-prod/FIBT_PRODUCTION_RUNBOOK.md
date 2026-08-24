# FIB-T Production Runbook

Status: `PREPARATORY_ONLY_NOT_EXECUTED`

This runbook is a human-operated gate sequence. It is not a deployment script,
does not contain credentials, and does not authorize production access or
migration application.

## Release invariants

- Start from the approved release-candidate commit and verify the migration
  manifest before any human production action.
- Confirm the project ref used by the published application from the published
  deployment configuration. Do not infer it from a local clone, HML package,
  or an old handoff.
- Keep `VITE_FIBT_PILOT_ENABLED=false` and
  `operational_real_collection_status=blocked_until_release_gate` through
  schema work, code publication, and postflight.
- Never use the staging Migration B file in production.
- Never apply a migration after a failed precondition, timeout, unexpected
  policy, unexpected dependency, or project-ref mismatch.
- Never put production snapshots, answers, tokens, emails, keys, or SQL
  output containing sensitive values in the repository.

## Gate 1 — identity and change control

Record, outside the repository where appropriate:

1. Human owner and written authorization for the specific migration set.
2. Published production project ref and application host.
3. Release commit, migration-manifest rollup, and artifact hashes.
4. Backup/snapshot completion and restore verification.
5. Maintenance window, absence of concurrent schema changes, and rollback
   owner.

If any item is missing, stop. `VITALOS_DB_TARGET=production` in a build
command describes configuration; it is not authorization to touch production.

## Gate 2 — read-only production inventory

Perform a read-only inventory against the confirmed project only. Capture
metadata, counts, function signatures, owners, ACL fingerprints, RLS state,
policy metadata, and migration lineage without exporting answers or tokens.

Reconcile the inventory against the local delta matrix in
`FIBT_PRODUCTION_READINESS_EVIDENCE_REGISTRY.md`. Historical documents are
context, not a substitute for this inventory. A mismatch creates a new
release-specific migration plan; it does not justify editing the approved SQL
while the window is open.

## Gate 3 — ordered schema promotion

The exact ordered set is selected only after Gate 2. The intended dependency
order is:

1. Migration A (`20260730150000...generic_anonymous_submissions_expand.sql`).
2. Privacy hardening H (`20260730155000...cohort_aggregate_privacy_hardening.sql`).
3. Response-path rewrite (`20260806205000...rewrite_submit_sector_response...sql`).
4. Production contract (`20260806210000...drop_response_invite_link_contract_production.sql`),
   only after all destructive preconditions and human gates pass.
5. Consent durability, cohort binding, and active-link uniqueness migrations,
   in their canonical timestamp order, only after their own preconditions and
   release review.

Each migration is a separate transaction and must be applied as the complete,
hash-verified artifact. The production contract is the only destructive step
in this FIB-T delta: it removes `wave_responses.invite_token` and its legacy
foreign key. The disabled production draft and the TypeScript precondition
model improve reviewability but do not prove PostgreSQL behavior.

## Gate 4 — postflight before publication

Re-read, without exposing sensitive values:

- migration lineage and schema objects;
- absence of `invite_token` and its legacy FK after the destructive contract;
- exact aggregate return contract and `k_min=5` behavior;
- consent durability and exact wave/org/cohort binding;
- RLS, policy count, function security, owners, search path, and ACLs;
- response/link counts and no unintended row/data mutation;
- artifact/deployment commit identity;
- production Auth callback/origin configuration;
- Cloudflare route, Worker binding, and cache/asset behavior.

Only after all postflight evidence is accepted may the code publication gate be
considered. Publication still does not enable real collection.

## Gate 5 — controlled enablement

Enablement is a separate decision. It requires fresh evidence for the exact
published artifact, production Auth/edge identity, synthetic/non-real smoke
coverage, privacy review, observability/alert ownership, and rollback owner.
Until then:

```text
VITE_FIBT_PILOT_ENABLED=false
REAL_COLLECTION_READY=false
```

No production invitation, real response, real email, or real participant
collection is part of this RC.
