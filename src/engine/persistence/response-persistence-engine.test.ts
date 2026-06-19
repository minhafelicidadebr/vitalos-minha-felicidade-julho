import { describe, expect, test } from "bun:test";
import {
  buildResponseIdempotencyKey,
  issueCloudPersistenceReceipt,
  planResponsePersistence,
  type CommittedSubmission,
  type PersistenceEnvelope,
  type PersistenceSession,
} from "./response-persistence-engine";

const session: PersistenceSession = {
  authenticated: true,
  subjectId: "user-1",
  tenantId: "tenant-a",
  organizationId: "org-a",
};

const envelope: PersistenceEnvelope = {
  submissionId: "submission-1",
  tenantId: "tenant-a",
  organizationId: "org-a",
  waveId: "wave-1",
  surveyId: "survey-1",
  itemCount: 12,
};

function committed(overrides: Partial<CommittedSubmission> = {}): CommittedSubmission {
  return {
    idempotencyKey: buildResponseIdempotencyKey(session, envelope)!,
    tenantId: "tenant-a",
    organizationId: "org-a",
    subjectId: "user-1",
    submissionId: "submission-1",
    waveId: "wave-1",
    surveyId: "survey-1",
    itemCount: 12,
    commitId: "commit-1",
    committedAt: "2026-06-19T12:00:00.000Z",
    ...overrides,
  };
}

describe("response persistence planning", () => {
  test("first valid attempt requires one scoped insert", () => {
    expect(planResponsePersistence(session, envelope, null)).toMatchObject({
      allowed: true,
      action: "insert",
      reason: "insert_required",
    });
  });

  test("same committed submission is an idempotent replay", () => {
    expect(planResponsePersistence(session, envelope, committed())).toMatchObject({
      allowed: true,
      action: "replay",
      reason: "idempotent_replay",
    });
  });

  test("same key with changed survey metadata is a conflict", () => {
    expect(
      planResponsePersistence(session, { ...envelope, surveyId: "survey-other" }, committed()),
    ).toMatchObject({
      allowed: false,
      reason: "submission_conflict",
    });
  });

  test("client tenant and organization can never override the trusted session", () => {
    expect(
      planResponsePersistence(
        session,
        { ...envelope, tenantId: "tenant-b", organizationId: "org-b" },
        null,
      ),
    ).toMatchObject({
      allowed: false,
      reason: "tenant_mismatch",
    });
  });

  test("anonymous or incomplete sessions fail closed", () => {
    expect(
      planResponsePersistence({ ...session, authenticated: false }, envelope, null),
    ).toMatchObject({
      allowed: false,
      reason: "invalid_session",
    });
    expect(planResponsePersistence({ ...session, subjectId: null }, envelope, null)).toMatchObject({
      allowed: false,
      reason: "invalid_session",
    });
  });
});

describe("cloud receipt issuance", () => {
  test("confirmed commit issues a content-free persisted receipt", () => {
    const result = issueCloudPersistenceReceipt(session, envelope, {
      confirmed: true,
      status: "committed",
      record: committed(),
    });

    expect(result.issued).toBe(true);
    if (!result.issued) return;
    expect(result.receipt).toMatchObject({
      persisted: true,
      replayed: false,
      contentReturned: false,
    });
    expect(JSON.stringify(result.receipt)).not.toContain("answers");
  });

  test("retry reuses the committed receipt without a second write", () => {
    const result = issueCloudPersistenceReceipt(session, envelope, {
      confirmed: true,
      status: "replayed",
      record: committed(),
    });

    expect(result.issued && result.receipt.replayed).toBe(true);
  });

  test("rollback, cross-tenant commit or metadata drift never emits a receipt", () => {
    expect(
      issueCloudPersistenceReceipt(session, envelope, {
        confirmed: false,
        status: "rolled_back",
        record: null,
      }),
    ).toMatchObject({ issued: false, reason: "commit_unconfirmed" });

    expect(
      issueCloudPersistenceReceipt(session, envelope, {
        confirmed: true,
        status: "committed",
        record: committed({ tenantId: "tenant-b" }),
      }),
    ).toMatchObject({ issued: false, reason: "commit_scope_mismatch" });

    expect(
      issueCloudPersistenceReceipt(session, envelope, {
        confirmed: true,
        status: "committed",
        record: committed({ itemCount: 11 }),
      }),
    ).toMatchObject({ issued: false, reason: "commit_metadata_mismatch" });
  });
});
