# FIB-T Production Rollback Plan

Status: `PREPARATORY_ONLY_NOT_EXECUTED`

Rollback is forward-safe and evidence-driven. A code revert does not undo a
database migration, and a database restore does not publish a matching code
artifact automatically.

## Stop rules

Stop and preserve evidence on any timeout, lock contention, unexpected policy,
unexpected catalog dependency, function/ACL drift, count mismatch,
project-ref mismatch, artifact mismatch, Auth callback mismatch, edge mismatch,
or postflight failure. Do not retry a destructive migration automatically.

## Migration transaction boundaries

| Point of failure                                    | Action                                                                                                                                                  | Reversibility                                                         |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Before the production contract transaction          | Abort; no DDL.                                                                                                                                          | Full.                                                                 |
| During preconditions or DDL before commit           | Roll back the entire transaction and retain metadata-only evidence.                                                                                     | Full by transaction rollback.                                         |
| After contract commit, before postflight acceptance | Keep pilot/collection disabled; do not re-add the legacy column ad hoc. Start incident/change review and use the approved snapshot/forward repair plan. | Schema-only recovery requires the approved snapshot or a forward fix. |
| After publication with runtime failure              | Disable the feature gate or revert the application artifact, while treating schema state separately.                                                    | Code rollback is independent of schema rollback.                      |
| After any real-data exposure concern                | Stop collection, preserve audit evidence without copying answers/tokens, notify the privacy/incident owner, and do not run a repair from this worktree. | Human incident process.                                               |

## Destructive contract recovery

The production contract removes `wave_responses.invite_token` and its legacy
foreign key. If recovery is required after commit:

1. Freeze the FIB-T gate and real collection.
2. Confirm the target project ref and incident owner again.
3. Locate the private, access-controlled backup/snapshot created before the
   migration. It must be outside every git worktree.
4. Verify snapshot integrity and restore procedure in a non-production
   rehearsal before any production write.
5. Prefer a reviewed forward-compatible repair. Recreating the legacy link
   path is not an automatic rollback and requires a new design/security review.
6. Re-run schema, ACL/RLS, RPC, privacy, and artifact postflight before any
   publication or enablement decision.

The existing restore tooling is dry-run by default and has not been authorized
or executed in this Wave 5 turn. No snapshot is stored in this repository.

## Application/Auth/edge recovery

- If the published artifact is wrong but schema is safe, revert only the
  application publication and keep the pilot disabled.
- If Auth callback/origin behavior is wrong, restore the last known-good
  configuration through the human platform owner; do not weaken redirect
  sanitization or switch HML settings into production.
- If the Cloudflare route or Worker binding is wrong, remove/restore the route
  through the human edge owner and keep the application gate disabled until the
  deployed artifact is identified.
- Never use a production secret, token, cookie, or service-role value in a
  rollback report or git commit.

## Recovery exit criteria

Recovery is complete only when the exact project, schema, RLS/RPC/ACL state,
published artifact, Auth callback, edge route, observability sink, and feature
gate are all freshly evidenced. Real collection remains a separate human
approval and is false for this release candidate.
